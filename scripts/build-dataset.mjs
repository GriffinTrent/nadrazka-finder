#!/usr/bin/env node
/**
 * Build nadrazky.json from Apify Google Maps Scraper dataset.
 * Run: APIFY_TOKEN=xxx APIFY_DATASET_ID=xxx node scripts/build-dataset.mjs
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execFileSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '../public/data/nadrazky.json');
const STATIONS_PATH = join(__dirname, 'stations.json');

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const DATASET_ID = process.env.APIFY_DATASET_ID;
const LOCAL_FILE = process.env.LOCAL_FILE; // optional: path to local JSON

if (!LOCAL_FILE && (!APIFY_TOKEN || !DATASET_ID)) {
  console.error('Required: LOCAL_FILE=path or (APIFY_TOKEN + APIFY_DATASET_ID) env vars');
  process.exit(1);
}

// Normalize Czech text (strip diacritics, lowercase)
function normalize(str) {
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

// Haversine distance in meters
function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const dPhi = (lat2 - lat1) * Math.PI / 180;
  const dLambda = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dPhi/2)**2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Load OSM stations (run fetch-stations.mjs first if missing)
function loadStations() {
  if (!existsSync(STATIONS_PATH)) {
    console.warn('stations.json not found — skipping proximity check. Run fetch-stations.mjs first.');
    return [];
  }
  const raw = JSON.parse(readFileSync(STATIONS_PATH, 'utf8'));
  return raw.elements?.filter(e => e.lat && e.lon).map(e => ({
    id: e.id,
    name: e.tags?.name || e.tags?.['name:cs'] || 'Unknown',
    lat: e.lat,
    lng: e.lon,
  })) || [];
}

// Find nearest station and distance
function findNearestStation(lat, lng, stations) {
  let nearest = null;
  let minDist = Infinity;
  for (const s of stations) {
    const d = haversineM(lat, lng, s.lat, s.lng);
    if (d < minDist) { minDist = d; nearest = s; }
  }
  return { station: nearest, distanceM: nearest ? Math.round(minDist) : null };
}

// Station-related keywords in Czech + English
const STATION_KEYWORDS = [
  'nádraží', 'nádražní', 'nádražka', 'nadrazi', 'nadrazni', 'nadrazka',
  'train station', 'railway station', 'station pub', 'station bar',
  'bahnhof', // Czech border regions
];

// Non-pub/food categories to exclude (normalized substring matches).
// A place is excluded when it has one of these AND no food/drink category.
// Czech categories from Google Maps CZ are in Czech — English-only list was a bug.
const EXCLUDE_CATEGORIES = [
  // English (original API values)
  'hotel', 'lodging', 'atm', 'bank', 'travel_agency', 'gas_station',
  'train_station', 'transit_station', 'bus_station', 'subway_station', 'light_rail_station',
  // Czech transport infrastructure (normalized: no diacritics, lowercase)
  'zeleznicni',           // Železniční stanice / dopravce / infrastruktura / pokladna / služby
  'vlakove depo',         // Vlakové depo
  'autobusova zastavka',  // Autobusová zastávka
  'tramvajova zastavka',  // Tramvajová zastávka
  'trolejbusova zastavka',
  'zastavka',             // bare "Zastávka" (generic stop)
  'stanice metra',        // metro
  'doprava osob',         // Doprava osob (passenger transport company)
  'dopravni uzel',        // Dopravní uzel (transport hub)
  'prepravni sluzba',     // Přepravní služba
  'jizdenek',             // Prodejce/Prodej jízdenek (ticket sales)
  'uzkokolejne',          // Stanice úzkokolejné dráhy
  'doprava na letiste',   // airport shuttle
  // Czech facilities (never a pub)
  'parkoviste',           // Parkoviště (parking)
  'toalety',              // Veřejné toalety / Bezbariérové veřejné toalety
  'cerpaci stanice',      // Čerpací stanice (gas station)
  // Czech accommodation (exclude unless also has food category)
  'penzion',
  'hostel',
  'ubytovani pod strechou',    // B&B / accommodation-only
  'ubytovani s pokojovou',     // hotel room service type
  'dum pro hosty',             // guest house
  // Czech non-food attractions & services
  'muzeum',
  'galerie umeni',
  'historicka pamatka',
  'turisticka atrakce',
  'turisticke informacni stredisko',
  'divadelni spolecnost',
  'sportovni komplex',
  'squashovy kurt',
  'tenisovy kurt',
  'cyklisticky park',
  'golfove odpaliste',
  'strelnice',
  'wellness centrum',
  'lyzarske stredisko',
  'hudebni producent',
  'videoprodukce',
  'cateringove sluzby',
  'kongresove centrum',
  'organizace svateb',
  'statni sprava',
  'skola vareni',
  'supermarket',
  'tabak',
  'prodejna pohlednic',
  'prodejna map',
  'uschovna zavazadel',   // luggage storage
];

// Fast food chains and non-pub establishments to exclude by name
const CHAIN_BLACKLIST = ['kfc', 'mcdonald', 'subway', 'burger king', 'bageterie boulevard',
  'natoo', 'costa coffee', 'starbucks', 'mcdonalds', 'banh-mi', 'dm drogerie'];

// Keywords indicating the result IS a station building (not a pub at a station)
const STATION_BUILDING_INDICATORS = [
  'autobusové nádraží', 'autobusove nadrazi',
  'stanice metra', 'metro stanice', 'žst.',
  'zeleznicni stanice', 'železniční stanice',
  // Catch plain station-name patterns: "Praha hlavní nádraží", "Nádraží Kyje", etc.
  // matched against name+addr; only fires when nádraží is the name of the place, not a pub
  'hlavni nadrazi', 'dolni nadrazi', 'horni nadrazi', 'mistni nadrazi',
  'nadrazi kyje', 'nadrazi branik', 'nadrazi vysocany', 'nadrazi liboc',
  'nadrazi libusin', 'nadrazi velesl', 'nadrazi podbaba', 'nadrazi klan',
  'nadrazi hluboc', 'nadrazi mechol', 'vlakove nadrazi', 'autobusove nadrazi',
];

function getLat(place) { return place.location?.lat ?? place.lat ?? null; }
function getLng(place) { return place.location?.lng ?? place.lng ?? null; }

function classifyResult(place, stations) {
  const nameLow = normalize(place.title || place.name || '');
  const addrLow = normalize(place.address || place.street || '');
  const locatedIn = normalize(place.locatedIn || '');
  const cats = (place.categories || []).map(c => normalize(c));

  if (place.permanentlyClosed || place.temporarilyClosed) return null;

  // Exclude station buildings, bus terminals, metro stations by name
  const nameAndAddr = nameLow + ' ' + addrLow;
  if (STATION_BUILDING_INDICATORS.some(k => nameAndAddr.includes(normalize(k)))) return null;

  // Exclude known fast food chains
  if (CHAIN_BLACKLIST.some(chain => nameLow.includes(chain))) return null;

  // Auto-exclude non-food businesses
  const hasExcludeCategory = EXCLUDE_CATEGORIES.some(ec => cats.some(c => c.includes(ec)));
  const hasFoodCategory = cats.some(c =>
    ['restaur', 'bar', 'pub', 'cafe', 'kavarn', 'pivo', 'pizeri', 'jidelna', 'hospoda', 'pivnice', 'bufet', 'bistro', 'buffet', 'hostinec'].some(fc => c.includes(fc))
  );
  if (hasExcludeCategory && !hasFoodCategory) return null;

  // Tier 1: station keyword in name OR locatedIn field mentions station
  const nameHasStation = STATION_KEYWORDS.some(k => nameLow.includes(normalize(k)));
  const locatedInStation = STATION_KEYWORDS.some(k => locatedIn.includes(normalize(k)));
  if (nameHasStation || locatedInStation) {
    return { tier: 1, verified: true, note: nameHasStation ? 'station keyword in name' : 'located in station building' };
  }

  const lat = getLat(place);
  const lng = getLng(place);
  if (!lat || !lng) return null;

  // Get nearest station distance
  const { station, distanceM } = findNearestStation(lat, lng, stations);

  // Tier 2: "nádraží" (not just "Nádražní" street) in address + within 200m
  // "nadrazi" matches both nádraží AND nádražní, so check for street-number pattern to exclude Nádražní street
  const addrHasNadrazi = addrLow.includes('nadrazi'); // catches nádraží, nádražní, nadrazi, nadrazni
  const addrIsJustStreet = /nadrazni\s+\d/.test(addrLow) && !addrLow.includes(' nadrazi ') && !addrLow.includes('u nadrazi');
  if (addrHasNadrazi && !addrIsJustStreet && distanceM !== null && distanceM <= 200) {
    return { tier: 2, verified: false, note: `station in address (${Math.round(distanceM)}m from ${station?.name})` };
  }

  // Tier 3: within 80m of a station (physical proximity, needs manual review)
  if (distanceM !== null && distanceM <= 80 && hasFoodCategory) {
    return { tier: 3, verified: false, note: `${Math.round(distanceM)}m from ${station?.name} — manual review needed` };
  }

  return null; // Not a nadrazka candidate
}

async function fetchDataset() {
  if (LOCAL_FILE) {
    console.log(`Reading local file: ${LOCAL_FILE}`);
    return JSON.parse(readFileSync(LOCAL_FILE, 'utf8'));
  }
  console.log(`Fetching dataset ${DATASET_ID}...`);
  const url = `https://api.apify.com/v2/datasets/${DATASET_ID}/items?token=${APIFY_TOKEN}&limit=5000&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Dataset fetch failed: ${res.status}`);
  return res.json();
}

function dedup(places) {
  const seen = new Map();
  const out = [];
  for (const p of places) {
    const lat = getLat(p);
    const lng = getLng(p);
    const key = p.placeId || `${p.title}_${Math.round((lat||0) * 1000)}_${Math.round((lng||0) * 1000)}`;
    if (!seen.has(key)) { seen.set(key, true); out.push(p); }
  }
  return out;
}

async function main() {
  const stations = loadStations();
  console.log(`Loaded ${stations.length} OSM stations`);

  const raw = await fetchDataset();
  console.log(`Fetched ${raw.length} raw results`);

  const unique = dedup(raw);
  console.log(`After dedup: ${unique.length} unique places`);

  const nadrazky = [];
  let excluded = 0;

  for (const place of unique) {
    const classification = classifyResult(place, stations);
    if (!classification) { excluded++; continue; }

    const lat = getLat(place);
    const lng = getLng(place);
    const { station, distanceM } = findNearestStation(lat || 0, lng || 0, stations);
    const id = place.placeId || createHash('md5').update(`${place.title}${lat}${lng}`).digest('hex').slice(0, 12);

    nadrazky.push({
      id,
      placeId: place.placeId || null,
      name: place.title || place.name || 'Unknown',
      lat,
      lng,
      address: place.address || place.street || '',
      city: place.city || place.municipality || null,
      stationName: station?.name || null,
      distanceToStationM: distanceM,
      tier: classification.tier,
      verified: classification.verified,
      googleMapsUrl: place.url || place.googleMapsUrl || null,
      phone: place.phone || null,
      website: place.website || null,
      rating: place.totalScore ?? null,
      reviewCount: place.reviewsCount ?? 0,
      openingHours: place.openingHours || null,
      images: (() => {
        const urls = (place.imageUrls || place.images || []).slice(0, 4);
        const mapped = urls.map(img => ({ imageUrl: img.imageUrl || img.url || img })).filter(i => typeof i.imageUrl === 'string' && i.imageUrl.startsWith('http'));
        return mapped.length ? mapped : null;
      })(),
      priceLevel: (() => {
        if (place.priceLevel != null) return place.priceLevel;
        if (place.price) return place.price.replace(/[^$]/g, '').length || null;
        return null;
      })(),
      categories: place.categories || [],
      permanentlyClosed: place.permanentlyClosed || false,
      source: place.searchString || '',
      scrapedAt: new Date().toISOString(),
      reviews: (place.reviews || []).slice(0, 5).map(r => ({
        author: r.name || r.author || null,
        stars: r.stars ?? null,
        publishAt: r.publishAt || r.publishedAtDate || null,
        text: r.text || null,
      })),
    });
  }

  console.log(`Excluded: ${excluded} (not nadrazky candidates)`);
  console.log(`Tier 1 (auto-verified): ${nadrazky.filter(n => n.tier === 1).length}`);
  console.log(`Tier 2 (address+proximity): ${nadrazky.filter(n => n.tier === 2).length}`);
  console.log(`Tier 3 (proximity only, needs review): ${nadrazky.filter(n => n.tier === 3).length}`);
  console.log(`TOTAL: ${nadrazky.length} nádražky candidates`);

  writeFileSync(OUTPUT_PATH, JSON.stringify(nadrazky, null, 2));
  console.log(`Written to ${OUTPUT_PATH}`);

  // Download images — only needed when there are new Google-signed URLs to cache
  const hasNewUrls = nadrazky.some(n => n.images?.some(i => i.imageUrl.startsWith('http')));
  if (hasNewUrls) {
    console.log('\nDownloading images to public/images/ ...');
    const downloadScript = join(__dirname, 'download-images.mjs');
    execFileSync(process.execPath, [downloadScript], { stdio: 'inherit' });
  } else {
    console.log('\nAll images already local — skipping download step.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
