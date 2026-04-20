#!/usr/bin/env node
/**
 * Build nadrazky.json from Apify Google Maps Scraper dataset.
 * Run: APIFY_TOKEN=xxx APIFY_DATASET_ID=xxx node scripts/build-dataset.mjs
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '../public/data/nadrazky.json');
const STATIONS_PATH = join(__dirname, 'stations.json');

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const DATASET_ID = process.env.APIFY_DATASET_ID;

if (!APIFY_TOKEN || !DATASET_ID) {
  console.error('Required: APIFY_TOKEN and APIFY_DATASET_ID env vars');
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

// Non-pub/food categories to exclude
const EXCLUDE_CATEGORIES = ['hotel', 'lodging', 'atm', 'bank', 'travel_agency', 'gas_station'];

function classifyResult(place, stations) {
  const nameLow = normalize(place.title || place.name || '');
  const addrLow = normalize(place.address || place.street || '');
  const cats = (place.categories || []).map(c => c.toLowerCase());

  // Auto-exclude
  const hasExcludeCategory = EXCLUDE_CATEGORIES.some(ec => cats.includes(ec));
  const hasFoodCategory = cats.some(c =>
    ['restaurant', 'bar', 'pub', 'food', 'cafe', 'meal', 'drink', 'brewery', 'tavern'].some(fc => c.includes(fc))
  );
  if (hasExcludeCategory && !hasFoodCategory) return null;
  if (place.permanentlyClosed) return null;

  // Tier 1: station keyword in name
  const nameHasStation = STATION_KEYWORDS.some(k => nameLow.includes(normalize(k)));
  if (nameHasStation) {
    return { tier: 1, verified: true, note: 'station keyword in name' };
  }

  // Get nearest station distance
  const { station, distanceM } = findNearestStation(place.lat, place.lng, stations);

  // Tier 2: "nádraží" (not just "Nádražní" street) in address + within 150m
  const addrHasStation = addrLow.includes('nádraží') || addrLow.includes('nadrazi');
  const addrHasStreetOnly = /nadrazni\s+\d/.test(addrLow); // e.g. "Nadrazni 42"
  if (addrHasStation && !addrHasStreetOnly && distanceM !== null && distanceM <= 150) {
    return { tier: 2, verified: false, note: `nádraží in address + ${distanceM}m from ${station?.name}` };
  }

  // Tier 3: within 100m of a station (physical proximity only)
  if (distanceM !== null && distanceM <= 100) {
    return { tier: 3, verified: false, note: `${distanceM}m from ${station?.name} — needs review` };
  }

  return null; // Not a nadrazka candidate
}

async function fetchDataset() {
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
    const key = p.placeId || `${p.title}_${Math.round(p.lat * 1000)}_${Math.round(p.lng * 1000)}`;
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

    const { station, distanceM } = findNearestStation(place.lat || 0, place.lng || 0, stations);
    const id = place.placeId || createHash('md5').update(`${place.title}${place.lat}${place.lng}`).digest('hex').slice(0, 12);

    nadrazky.push({
      id,
      placeId: place.placeId || null,
      name: place.title || place.name || 'Unknown',
      lat: place.lat,
      lng: place.lng,
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
      categories: place.categories || [],
      permanentlyClosed: place.permanentlyClosed || false,
      source: place.searchString || '',
      scrapedAt: new Date().toISOString(),
    });
  }

  console.log(`Excluded: ${excluded} (not nadrazky candidates)`);
  console.log(`Tier 1 (auto-verified): ${nadrazky.filter(n => n.tier === 1).length}`);
  console.log(`Tier 2 (address+proximity): ${nadrazky.filter(n => n.tier === 2).length}`);
  console.log(`Tier 3 (proximity only, needs review): ${nadrazky.filter(n => n.tier === 3).length}`);
  console.log(`TOTAL: ${nadrazky.length} nádražky candidates`);

  writeFileSync(OUTPUT_PATH, JSON.stringify(nadrazky, null, 2));
  console.log(`Written to ${OUTPUT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
