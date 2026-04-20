#!/usr/bin/env node
/**
 * Scrape beer menus for nadražky.
 * Phase 1: Google Maps Scraper — fresh data + 15 reviews + any menu URLs
 * Phase 2: Website Content Crawler — pub websites + discovered menu links
 * Phase 3: Google Search — find menu pages for pubs with no website
 *
 * Run: APIFY_TOKEN=xxx node scripts/scrape-beer-menus.mjs
 */

import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '../public/data/nadrazky.json');

const APIFY_TOKEN = process.env.APIFY_TOKEN;
if (!APIFY_TOKEN) { console.error('APIFY_TOKEN required'); process.exit(1); }

const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));

async function startRun(actorId, input) {
  const res = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }
  );
  if (!res.ok) throw new Error(`Start failed: ${res.status} — ${await res.text()}`);
  const { data: run } = await res.json();
  console.log(`  [${actorId}] run ${run.id} started`);
  return run.id;
}

async function waitForRun(actorId, runId) {
  while (true) {
    await new Promise(r => setTimeout(r, 8000));
    const res = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs/${runId}?token=${APIFY_TOKEN}`);
    const { data: s } = await res.json();
    console.log(`  [${actorId}] ${s.status}`);
    if (['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(s.status)) {
      if (s.status !== 'SUCCEEDED') throw new Error(`Run ${s.status}: ${actorId}`);
      return s.defaultDatasetId;
    }
  }
}

async function fetchDataset(datasetId) {
  const res = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=9999&format=json`);
  if (!res.ok) throw new Error(`Dataset fetch failed: ${res.status}`);
  return res.json();
}

// Real websites (non-social media)
const SOCIAL = ['facebook', 'instagram', 'tripadvisor', 'google.com', 'booking.com', 'foursquare'];
const realWebsites = data.filter(p => p.website && !SOCIAL.some(s => p.website.includes(s)));
const withoutWebsite = data.filter(p => !p.website || SOCIAL.some(s => p.website.includes(s)));

console.log(`Pubs with real website: ${realWebsites.length}`);
console.log(`Pubs without real website (will use Google search): ${withoutWebsite.length}`);

// ── PHASE 1: Google Maps re-scrape ──────────────────────────────────────────
console.log(`\n[Phase 1] Google Maps Scraper — ${data.length} pubs, 15 reviews each`);
const gmapsRunId = await startRun('compass~crawler-google-places', {
  startUrls: data.map(p => ({ url: `https://www.google.com/maps/place/?q=place_id:${p.id}` })),
  maxReviews: 15,
  reviewsSort: 'newest',
  language: 'cs',
  maxImages: 0,
  exportPlaceUrls: false,
});

// ── PHASE 2: Website Content Crawler ────────────────────────────────────────
console.log(`\n[Phase 2] Website Content Crawler — ${realWebsites.length} websites`);
const websiteRunId = await startRun('apify~website-content-crawler', {
  startUrls: realWebsites.map(p => ({ url: p.website })),
  maxCrawlPagesPerCrawl: 400,
  maxCrawlDepth: 3,
  crawlerType: 'cheerio',
  outputFormats: ['markdown'],
  proxyConfiguration: { useApifyProxy: false },
  // Filter to pages likely containing menu content
  includeUrlGlobs: [
    '**/napoj*', '**/pivo*', '**/menu*', '**/drinky*', '**/listek*',
    '**/jidelni-listek*', '**/nabidka*', '**/cenik*', '**/drink*', '**/',
  ],
  maxRequestRetries: 2,
});

// ── PHASE 3: Google Search for pubs without websites ────────────────────────
console.log(`\n[Phase 3] Google Search — ${withoutWebsite.length} pubs (finding menu pages)`);
const searchQueries = withoutWebsite.slice(0, 100).map(p => ({
  query: `"${p.name}" ${p.city || ''} pivo cena nápojový lístek`,
}));

const searchRunId = await startRun('apify~google-search-scraper', {
  queries: searchQueries.map(q => q.query).join('\n'),
  maxPagesPerQuery: 1,
  resultsPerPage: 5,
  languageCode: 'cs',
  countryCode: 'cz',
});

// ── Wait for all three in parallel ──────────────────────────────────────────
console.log('\nWaiting for all 3 runs to complete...');
const [gmapsDatasetId, websiteDatasetId, searchDatasetId] = await Promise.all([
  waitForRun('compass~crawler-google-places', gmapsRunId),
  waitForRun('apify/website-content-crawler', websiteRunId),
  waitForRun('apify/google-search-scraper', searchRunId),
]);

const [gmapsItems, websiteItems, searchItems] = await Promise.all([
  fetchDataset(gmapsDatasetId),
  fetchDataset(websiteDatasetId),
  fetchDataset(searchDatasetId),
]);

console.log(`\nResults: gmaps=${gmapsItems.length}, websites=${websiteItems.length}, search=${searchItems.length}`);

writeFileSync(join(__dirname, 'beer-gmaps-raw.json'), JSON.stringify(gmapsItems, null, 2));
writeFileSync(join(__dirname, 'beer-websites-raw.json'), JSON.stringify(websiteItems, null, 2));
writeFileSync(join(__dirname, 'beer-search-raw.json'), JSON.stringify(searchItems, null, 2));

console.log('\nSaved raw data. Run parse-beer-menus.mjs next.');
