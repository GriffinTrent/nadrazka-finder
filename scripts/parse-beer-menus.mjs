#!/usr/bin/env node
/**
 * Parse beer menu data from Apify scrape results → nadrazky.json beerMenu field.
 * Sources: beer-gmaps-raw.json, beer-websites-raw.json, beer-search-raw.json
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '../public/data/nadrazky.json');

const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));

// ── Beer brand recognition (longest match first) ─────────────────────────────
const BEER_BRANDS = [
  'Pilsner Urquell', 'Plzeňský Prazdroj',
  'Budějovický Budvar', 'Budweiser Budvar', 'Budvar',
  'Kozel Premium', 'Kozel Černý', 'Kozel',
  'Gambrinus Originál', 'Gambrinus Světlý', 'Gambrinus',
  'Staropramen Granát', 'Staropramen Cool', 'Staropramen',
  'Bernard Světlý', 'Bernard Tmavý', 'Bernard',
  'Svijanský Máz', 'Svijanský Rytíř', 'Svijany',
  'Radegast Birell', 'Radegast',
  'Březňák', 'Zlatopramen', 'Rohozec', 'Liberecký Rohozec',
  'Rebel', 'Regent', 'Lobkowicz', 'Litovel',
  'Ferdinand', 'Hubertus', 'Holba', 'Zubr',
  'Braník', 'Krušovice', 'Korunní', 'Herold',
  'Primátor', 'Matuška', 'Únětické', 'Kocour',
  'Pilsner', 'Urquell', 'Birell',
];

const SOCIAL = ['facebook', 'instagram', 'tripadvisor', 'google.com', 'booking.com', 'restaurantguru', 'zomato'];

// Match a beer brand in lowercased text — returns canonical name or null
function matchBrand(text) {
  const lower = text.toLowerCase();
  for (const b of BEER_BRANDS) {
    if (lower.includes(b.toLowerCase())) return b;
  }
  return null;
}

// Extract beer+price pairs from a block of text (multi-line)
function extractBeers(text) {
  if (!text) return [];
  const results = [];

  const allLines = text.split(/\r?\n/);
  // Compact lines: remove empty lines for multi-line pass
  const compactLines = allLines.map(l => l.trim()).filter(l => l.length > 0);

  // Multi-line pass: beer name on line N, price on line N+1 (or N+2)
  for (let i = 0; i < compactLines.length - 2; i++) {
    const nameLine = compactLines[i];
    const priceLine = (compactLines[i+1] + ' ' + compactLines[i+2]).trim();
    if (!nameLine || nameLine.length > 120) continue;
    const brand = matchBrand(nameLine);
    if (!brand) continue;
    const prices = [...priceLine.matchAll(/(\d{2,3})\s*(?:kč|,-|korun)/gi)]
      .map(m => parseInt(m[1])).filter(p => p >= 20 && p <= 99);
    if (!prices.length) continue;
    const price = prices.length >= 2 ? prices[1] : prices[0];
    const degMatch = nameLine.match(/(\d{1,2})\s*°/);
    let name = brand;
    if (degMatch && !name.includes('°')) name = `${name} ${degMatch[1]}°`;
    results.push({ name, price, volume: '0.5l' });
  }

  // Single-line pass using original lines
  for (const rawLine of allLines) {
    const line = rawLine.trim();
    if (!line || line.length > 200) continue;

    const lower = line.toLowerCase();

    // Must have a price in Czech format: 20–150 followed by Kč / ,- / korun
    // Also handle "30 Kč  45 Kč" (two prices = 0.3l and 0.5l) — we take the second (larger)
    const allPrices = [...line.matchAll(/(\d{2,3})\s*(?:kč|,-|korun)/gi)]
      .map(m => parseInt(m[1]))
      .filter(p => p >= 20 && p <= 99);
    if (!allPrices.length) continue;

    // Must have a beer signal
    const hasBeerWord = /piv|ležák|světl|tmav|točen|řezák|speciál|nealko|nealkohol/i.test(lower);
    const brand = matchBrand(line);
    if (!hasBeerWord && !brand) continue;

    // Pick price: if two prices (e.g. small+large), take the second (0.5l)
    const price = allPrices.length >= 2 ? allPrices[1] : allPrices[0];

    // Build name
    let name = brand;
    if (!name) {
      // Guess type from line
      if (/tmav/i.test(line)) name = 'Tmavé pivo';
      else if (/světl/i.test(line) || /svetl/i.test(line)) name = 'Světlé pivo';
      else if (/řezák/i.test(line)) name = 'Řezané pivo';
      else if (/nealko/i.test(line)) name = 'Nealko pivo';
      else if (/točen/i.test(line)) name = 'Točené pivo';
      else name = 'Pivo';
    }

    // Append degree if found and not already in name
    const degMatch = line.match(/(\d{1,2})\s*°/);
    if (degMatch && !name.includes('°')) name = `${name} ${degMatch[1]}°`;

    // Volume hint
    const volMatch = line.match(/0[,.]?\s*([34])\s*l/i);
    const volume = volMatch ? `0.${volMatch[1]}l` : '0.5l';

    results.push({ name, price, volume });
  }

  // Deduplicate by name
  const seen = new Set();
  return results.filter(e => {
    const key = e.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

const beerByPubId = {};

// ── Source 0: Direct menu page fetches ───────────────────────────────────────
const DIRECT_PATH = join(__dirname, 'beer-direct-raw.json');
if (existsSync(DIRECT_PATH)) {
  const directData = JSON.parse(readFileSync(DIRECT_PATH, 'utf8'));
  const directIds = Object.keys(directData);
  console.log(`Direct fetches: ${directIds.length} pubs`);
  for (const [pubId, entry] of Object.entries(directData)) {
    const beers = extractBeers(entry.text || '');
    if (beers.length) beerByPubId[pubId] = { beers, source: 'direct_fetch' };
  }
  console.log(`  Direct hits: ${Object.values(beerByPubId).filter(e=>e.source==='direct_fetch').length}`);
}

// ── Build pub → website domain map ───────────────────────────────────────────
const domainToPub = {};
for (const pub of data) {
  if (!pub.website || SOCIAL.some(s => pub.website.includes(s))) continue;
  try {
    const host = new URL(pub.website).hostname;
    domainToPub[host] = pub.id;
  } catch {}
}

// ── Source 1: Website crawler pages ──────────────────────────────────────────
const WEBSITES_PATH = join(__dirname, 'beer-websites-raw.json');
if (existsSync(WEBSITES_PATH)) {
  const pages = JSON.parse(readFileSync(WEBSITES_PATH, 'utf8'));
  console.log(`Website pages: ${pages.length}`);

  // Group by hostname
  const byHost = {};
  for (const page of pages) {
    try {
      const host = new URL(page.url || page.loadedUrl || '').hostname;
      if (!byHost[host]) byHost[host] = [];
      byHost[host].push(page);
    } catch {}
  }

  for (const [host, hostPages] of Object.entries(byHost)) {
    const pubId = domainToPub[host];
    if (!pubId) continue;

    // Score pages by menu relevance
    const scored = hostPages.map(p => {
      const url = (p.url || '').toLowerCase();
      const title = (p.title || '').toLowerCase();
      let score = 0;
      for (const kw of ['napoj', 'pivo', 'drink', 'listek', 'cenik', 'nabidka', 'menu']) {
        if (url.includes(kw) || title.includes(kw)) score += 3;
      }
      const txt = p.text || p.markdown || '';
      if (/piv|ležák/i.test(txt)) score += 1;
      score += Math.min((txt.match(/\d{2,3}\s*(?:kč|,-)/gi) || []).length, 5);
      return { ...p, _score: score };
    });

    // Take top 3 pages, combine text
    const top3 = scored.sort((a, b) => b._score - a._score).slice(0, 3);
    const combinedText = top3.map(p => p.text || p.markdown || '').join('\n');
    const beers = extractBeers(combinedText);

    if (beers.length && !beerByPubId[pubId]) {
      beerByPubId[pubId] = { beers, source: 'website' };
    }
  }
  console.log(`  Website matches: ${Object.keys(beerByPubId).length}`);
}

// ── Source 2: Google Maps reviews + additionalInfo + menu URLs ────────────────
const GMAPS_PATH = join(__dirname, 'beer-gmaps-raw.json');
if (existsSync(GMAPS_PATH)) {
  const places = JSON.parse(readFileSync(GMAPS_PATH, 'utf8'));
  console.log(`Google Maps places: ${places.length}`);
  let gmapsHits = 0;

  for (const place of places) {
    const pubId = place.placeId;
    if (!pubId || beerByPubId[pubId]) continue; // already have website data

    // Combine all text sources
    const reviewText = (place.reviews || []).map(r => r.text || '').join('\n');
    const aiText = JSON.stringify(place.additionalInfo || {});
    const rdText = JSON.stringify(place.restaurantData || {});
    const beers = extractBeers([reviewText, aiText, rdText].join('\n'));

    if (beers.length) {
      beerByPubId[pubId] = { beers, source: 'gmaps_reviews' };
      gmapsHits++;
    }
  }
  console.log(`  Google Maps hits: ${gmapsHits}`);
}

// ── Source 3: Google Search result snippets ───────────────────────────────────
const SEARCH_PATH = join(__dirname, 'beer-search-raw.json');
if (existsSync(SEARCH_PATH)) {
  const results = JSON.parse(readFileSync(SEARCH_PATH, 'utf8'));
  console.log(`Search result pages: ${results.length}`);
  let searchHits = 0;

  for (const page of results) {
    const queryTerm = page.searchQuery?.term || '';
    const organicText = (page.organicResults || [])
      .map(r => (r.description || r.snippet || '') + '\n' + (r.title || ''))
      .join('\n');
    const beers = extractBeers(organicText);
    if (!beers.length) continue;

    // Match pub by name in search query
    const pub = data.find(p => queryTerm.includes(p.name));
    if (pub && !beerByPubId[pub.id]) {
      beerByPubId[pub.id] = { beers, source: 'search' };
      searchHits++;
    }
  }
  console.log(`  Search hits: ${searchHits}`);
}

// ── Merge into dataset ────────────────────────────────────────────────────────
const updated = data.map(pub => {
  const entry = beerByPubId[pub.id];
  if (!entry) return pub;

  const beers = entry.beers;

  // Sort: named brands first, then generics
  beers.sort((a, b) => {
    const aIsBrand = matchBrand(a.name) !== null;
    const bIsBrand = matchBrand(b.name) !== null;
    if (aIsBrand && !bIsBrand) return -1;
    if (!aIsBrand && bIsBrand) return 1;
    return 0;
  });

  return {
    ...pub,
    beerMenu: beers.slice(0, 4).map((b, i) => ({
      name: b.name,
      price: b.price,
      volume: b.volume || '0.5l',
      isPrimary: i === 0,
    })),
  };
});

const enriched = updated.filter(p => p.beerMenu).length;
writeFileSync(DATA_PATH, JSON.stringify(updated, null, 2));

console.log(`\nEnriched ${enriched}/${data.length} pubs with beer menu data`);
console.log('Coverage by source:');
const bySource = {};
Object.values(beerByPubId).forEach(e => { bySource[e.source] = (bySource[e.source]||0) + 1; });
Object.entries(bySource).forEach(([s, n]) => console.log(`  ${s}: ${n}`));

// Show sample results
console.log('\nSample beer menus:');
updated.filter(p => p.beerMenu).slice(0, 8).forEach(p => {
  console.log(` ${p.name}:`);
  p.beerMenu.forEach(b => console.log(`   ${b.isPrimary ? '★' : ' '} ${b.name} — ${b.price} Kč/${b.volume}`));
});
