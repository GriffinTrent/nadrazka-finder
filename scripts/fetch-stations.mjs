#!/usr/bin/env node
/**
 * Fetch Czech railway station nodes from OSM Overpass API.
 * Run once: node scripts/fetch-stations.mjs
 * Outputs: scripts/stations.json
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, 'stations.json');

const query = `
[out:json][timeout:60];
area["ISO3166-1"="CZ"]->.cz;
(
  node["railway"="station"](area.cz);
  node["railway"="halt"](area.cz);
);
out body;
`;

const OVERPASS_BASES = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function tryFetch(base) {
  // Use GET to avoid 406 from POST Content-Type mismatch
  const url = `${base}?data=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'nadrazka-finder/1.0 (educational project)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${base}`);
  return res.json();
}

async function main() {
  console.log('Fetching Czech railway stations from OSM Overpass...');

  let data;
  for (const base of OVERPASS_BASES) {
    try {
      console.log(`Trying ${base}...`);
      data = await tryFetch(base);
      console.log(`Success from ${base}`);
      break;
    } catch (e) {
      console.warn(`Failed: ${e.message}`);
    }
  }

  if (!data) {
    console.error('All Overpass endpoints failed. Try again later.');
    process.exit(1);
  }

  console.log(`Found ${data.elements?.length || 0} station nodes`);
  writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
  console.log(`Written to ${OUTPUT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
