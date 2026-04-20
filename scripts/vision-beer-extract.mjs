#!/usr/bin/env node
/**
 * Use Claude Vision to extract beer menus from pub photos stored in nadrazky.json.
 *
 * For each pub that has images but no beerMenu (and hasn't been checked before),
 * send the image to Claude Haiku and ask it to extract beer names + prices.
 * Results are written back to nadrazky.json incrementally.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/vision-beer-extract.mjs
 *
 * Optional flags:
 *   --dry-run         Print what would be processed without calling the API
 *   --recheck         Re-check pubs that were already checked (menuExtractedAt set)
 *   --limit=N         Stop after processing N pubs
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '../public/data/nadrazky.json');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const RECHECK = args.includes('--recheck');
const LIMIT = (() => {
  const flag = args.find(a => a.startsWith('--limit='));
  return flag ? parseInt(flag.split('=')[1], 10) : Infinity;
})();

const SAVE_EVERY = 10; // write progress every N pubs
const DELAY_MS = 600;  // gentle rate limit between API calls

const EXTRACTION_PROMPT = `Does this image show a beer menu, drinks price list, or chalkboard with beer/drink prices?

If YES: extract the beer names and prices as JSON.
If NO menu is visible: respond with exactly: null

Respond ONLY with valid JSON — no prose, no markdown, no explanation.

Format when a menu IS visible:
[{"name": "Pilsner Urquell", "price": 45, "volume": "0.5l"}, {"name": "Kozel", "price": 38}]

Rules:
- price must be a number in Czech Koruna (Kč) — integers only
- volume is optional; include only if clearly visible (e.g. "0.5l", "0.3l", "1l")
- only include beers/drafts with a legible price; skip anything unclear
- 20 ≤ price ≤ 200 (outside this range is likely a food price or OCR error)
- maximum 6 entries; list the most prominent beers first
- if you see prices but no beer names, skip entirely and return null`;

async function fetchImageAsBase64(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NadrazkaFinder/1.0)' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const base64 = Buffer.from(buf).toString('base64');
  const contentType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  return { base64, mediaType: contentType };
}

async function extractFromImage(client, imageUrl) {
  let src;
  try {
    src = await fetchImageAsBase64(imageUrl);
  } catch (e) {
    return { result: null, error: `fetch failed: ${e.message}` };
  }

  let text;
  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: src.mediaType, data: src.base64 },
          },
          { type: 'text', text: EXTRACTION_PROMPT },
        ],
      }],
    });
    text = resp.content[0]?.text?.trim() ?? 'null';
  } catch (e) {
    return { result: null, error: `API error: ${e.message}` };
  }

  try {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed)) return { result: null };
    const valid = parsed.filter(b =>
      b.name && typeof b.name === 'string' &&
      typeof b.price === 'number' && b.price >= 20 && b.price <= 200
    );
    if (valid.length === 0) return { result: null };
    valid[0].isPrimary = true;
    return { result: valid };
  } catch {
    return { result: null, error: `JSON parse failed: ${text.slice(0, 60)}` };
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY is not set.');
    console.error('Add it to your shell: export ANTHROPIC_API_KEY=sk-ant-...');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const nadrazky = JSON.parse(readFileSync(DATA_PATH, 'utf8'));

  const toProcess = nadrazky.filter(p =>
    p.images?.length > 0 &&
    !p.beerMenu &&
    (RECHECK || !p.menuExtractedAt)
  ).slice(0, LIMIT);

  const alreadyHaveMenu = nadrazky.filter(p => p.beerMenu?.length > 0).length;
  console.log(`Pubs with existing beer menu : ${alreadyHaveMenu}`);
  console.log(`Pubs to check               : ${toProcess.length}`);
  if (DRY_RUN) { console.log('\n--dry-run: exiting without API calls.'); return; }
  console.log('');

  let found = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const pub = toProcess[i];
    const imageUrl = pub.images[0].imageUrl;
    process.stdout.write(`[${i + 1}/${toProcess.length}] ${pub.name.padEnd(40, ' ')} `);

    const { result, error } = await extractFromImage(client, imageUrl);

    const idx = nadrazky.findIndex(p => p.id === pub.id);
    nadrazky[idx].menuExtractedAt = new Date().toISOString();
    if (result) {
      nadrazky[idx].beerMenu = result;
      found++;
      console.log(`✓  ${result.map(b => `${b.name} ${b.price}Kč`).join(' | ')}`);
    } else {
      if (error) console.log(`—  (${error})`);
      else       console.log(`—  no menu visible`);
    }

    if ((i + 1) % SAVE_EVERY === 0) {
      writeFileSync(DATA_PATH, JSON.stringify(nadrazky, null, 2));
      console.log(`   ↳ saved progress (${found} menus found so far)`);
    }

    if (i < toProcess.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  writeFileSync(DATA_PATH, JSON.stringify(nadrazky, null, 2));
  console.log(`\nDone. Found beer menus for ${found} / ${toProcess.length} pubs checked.`);
  console.log(`Total pubs with beer menu: ${nadrazky.filter(p => p.beerMenu?.length > 0).length} / ${nadrazky.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
