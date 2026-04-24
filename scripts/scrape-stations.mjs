#!/usr/bin/env node
/**
 * Scrape Google Maps for pubs near Czech train stations.
 *
 * Usage:
 *   node scripts/scrape-stations.mjs                    # all 2819 stations
 *   node scripts/scrape-stations.mjs --bbox 49.5,13.2,50.2,14.5  # Praha-Plzeň corridor
 *   node scripts/scrape-stations.mjs --station Mýto     # single station by name
 *
 * Outputs:
 *   scripts/scraped-raw.json    raw Apify results
 *   public/data/nadrazky.json   rebuilt + merged with existing pubs
 *
 * Requires: APIFY_TOKEN env var
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execFileSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIONS_PATH = join(__dirname, 'stations.json');
const OUTPUT_RAW    = join(__dirname, 'scraped-raw.json');
const NADRAZKY_PATH = join(__dirname, '../public/data/nadrazky.json');

const APIFY_TOKEN = process.env.APIFY_TOKEN;
if (!APIFY_TOKEN) { console.error('APIFY_TOKEN env var required'); process.exit(1); }

// Parse CLI args
const args = process.argv.slice(2);
let bboxFilter = null;   // [minLat, minLon, maxLat, maxLon]
let nameFilter = null;   // station name substring

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--bbox' && args[i + 1]) {
    bboxFilter = args[++i].split(',').map(Number);
  }
  if (args[i] === '--station' && args[i + 1]) {
    nameFilter = args[++i].toLowerCase();
  }
}

// Load stations
const stationsData = JSON.parse(readFileSync(STATIONS_PATH, 'utf8'));
let stations = stationsData.elements.filter(e => e.lat && e.lon);

if (bboxFilter) {
  const [minLat, minLon, maxLat, maxLon] = bboxFilter;
  stations = stations.filter(s => s.lat >= minLat && s.lat <= maxLat && s.lon >= minLon && s.lon <= maxLon);
}
if (nameFilter) {
  stations = stations.filter(s => (s.tags?.name || '').toLowerCase().includes(nameFilter));
}

console.log(`Targeting ${stations.length} stations`);

// Build startUrls — two search terms per station: hospoda + restaurace
const startUrls = [];
for (const s of stations) {
  const lat = s.lat.toFixed(6);
  const lon = s.lon.toFixed(6);
  // hospoda (pub) search at zoom 15 covers ~1.5km radius
  startUrls.push({ url: `https://www.google.com/maps/search/hospoda/@${lat},${lon},15z` });
  startUrls.push({ url: `https://www.google.com/maps/search/restaurace+nádraží/@${lat},${lon},15z` });
}

console.log(`Generated ${startUrls.length} search URLs`);

const actorInput = {
  startUrls,
  maxCrawledPlacesPerSearch: 5,
  language: 'cs',
  countryCode: 'cz',
  maxReviews: 5,
  scrapeReviewsPersonalData: false,
  scrapeImageUrls: true,
  maxImages: 4,
  exportPlaceUrls: false,
};

async function apifyPost(path, body) {
  const res = await fetch(`https://api.apify.com/v2${path}?token=${APIFY_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function apifyGet(path) {
  const res = await fetch(`https://api.apify.com/v2${path}?token=${APIFY_TOKEN}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  // Start actor run
  console.log('Starting Apify Google Maps Scraper...');
  const { data: runData } = await apifyPost('/acts/compass~crawler-google-places/runs', actorInput);
  const runId = runData.id;
  const datasetId = runData.defaultDatasetId;
  console.log(`Run ID:     ${runId}`);
  console.log(`Dataset ID: ${datasetId}`);
  console.log(`Monitor at: https://console.apify.com/actors/runs/${runId}`);

  // Poll for completion
  let lastCount = 0;
  while (true) {
    await sleep(30_000);
    const { data: status } = await apifyGet(`/actor-runs/${runId}`);
    const count = status.stats?.crawledCount ?? 0;
    if (count !== lastCount) { console.log(`  Places found: ${count}`); lastCount = count; }
    console.log(`  Status: ${status.status}`);

    if (['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status.status)) {
      if (status.status !== 'SUCCEEDED') {
        throw new Error(`Run ended with status: ${status.status}`);
      }
      break;
    }
  }

  // Download results in pages (API limit: 10000 items per request)
  console.log('Downloading results...');
  let allItems = [];
  let offset = 0;
  const limit = 10000;
  while (true) {
    const res = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&format=json&limit=${limit}&offset=${offset}`
    );
    const page = await res.json();
    if (!page.length) break;
    allItems = allItems.concat(page);
    offset += page.length;
    if (page.length < limit) break;
  }
  console.log(`Downloaded ${allItems.length} raw results`);

  // Merge with existing nadrazky that were found by previous scrapes
  // (keep them as part of the raw pool so they survive the rebuild)
  let existing = [];
  if (existsSync(NADRAZKY_PATH)) {
    existing = JSON.parse(readFileSync(NADRAZKY_PATH, 'utf8'));
    console.log(`Merging with ${existing.length} existing pubs`);
  }

  // Convert existing pubs back to a "raw" shape that build-dataset.mjs can process
  const existingAsRaw = existing.map(p => ({
    placeId: p.placeId,
    title: p.name,
    location: { lat: p.lat, lng: p.lng },
    address: p.address,
    city: p.city,
    phone: p.phone,
    website: p.website,
    totalScore: p.rating,
    reviewsCount: p.reviewCount,
    categories: p.categories,
    openingHours: p.openingHours,
    imageUrls: (p.images || []).map(i => ({ url: i.imageUrl })),
    url: p.googleMapsUrl,
    permanentlyClosed: p.permanentlyClosed,
    reviews: p.reviews,
    locatedIn: '',
    searchString: p.source || '',
  }));

  const combined = [...allItems, ...existingAsRaw];
  writeFileSync(OUTPUT_RAW, JSON.stringify(combined, null, 2));
  console.log(`Saved ${combined.length} combined records → ${OUTPUT_RAW}`);

  // Rebuild dataset
  console.log('\nRebuilding nadrazky.json...');
  execFileSync(process.execPath, [join(__dirname, 'build-dataset.mjs')], {
    stdio: 'inherit',
    env: { ...process.env, LOCAL_FILE: OUTPUT_RAW },
  });

  console.log('\nDone! Rebuild complete.');
}

run().catch(e => { console.error(e); process.exit(1); });
