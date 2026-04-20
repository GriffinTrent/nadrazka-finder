#!/usr/bin/env node
/**
 * Download all pub images to public/images/ for permanent local hosting.
 * Google Places "gps-cs-s" signed URLs expire within hours — run this
 * immediately after build-dataset.mjs, before URLs go stale.
 *
 * Usage: node scripts/download-images.mjs
 *
 * What it does:
 *  1. Reads public/data/nadrazky.json
 *  2. Downloads each image to public/images/{placeId}/{n}.jpg
 *  3. Updates imageUrl fields to local /images/... paths
 *  4. Writes updated nadrazky.json
 *  5. Skips already-downloaded images (safe to re-run)
 */

import { createWriteStream, existsSync, mkdirSync, writeFileSync, readFileSync, statSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH  = join(__dirname, '../public/data/nadrazky.json');
const IMAGES_DIR = join(__dirname, '../public/images');
const CONCURRENCY = 12;

function download(url, dest, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error('Missing redirect URL'));
    if (redirectsLeft <= 0) return reject(new Error('Too many redirects'));
    const protocol = url.startsWith('https') ? https : http;
    const file = createWriteStream(dest);
    const req = protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(true); });
        file.on('error', reject);
      } else if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        download(res.headers.location, dest, redirectsLeft - 1).then(resolve).catch(reject);
      } else {
        file.close();
        try { unlinkSync(dest); } catch {}
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    });
    req.on('error', (err) => { file.close(); reject(err); });
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function processInBatches(tasks, concurrency) {
  const results = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    results.push(...await Promise.all(batch.map(t => t())));
  }
  return results;
}

async function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  mkdirSync(IMAGES_DIR, { recursive: true });

  let tasks = [];
  let alreadyLocal = 0;
  let toDownload = 0;

  for (const pub of data) {
    if (!pub.images || pub.images.length === 0) continue;
    const dirId = pub.placeId ?? pub.id;
    const pubDir = join(IMAGES_DIR, dirId);

    for (let i = 0; i < pub.images.length; i++) {
      const img = pub.images[i];

      // Already a local path
      if (img.imageUrl.startsWith('/')) { alreadyLocal++; continue; }

      const localPath = join(pubDir, `${i}.jpg`);
      const publicPath = `/images/${dirId}/${i}.jpg`;

      // Already downloaded on disk
      if (existsSync(localPath) && statSync(localPath).size > 0) {
        img.imageUrl = publicPath;
        alreadyLocal++;
        continue;
      }

      toDownload++;
      const imgRef = img;
      const capturedUrl = img.imageUrl;
      tasks.push(async () => {
        mkdirSync(pubDir, { recursive: true });
        try {
          await download(capturedUrl, localPath);
          imgRef.imageUrl = publicPath;
          return 'ok';
        } catch (err) {
          // Keep original URL if download fails — will be retried next run
          return `fail:${err.message.slice(0, 40)}`;
        }
      });
    }
  }

  console.log(`Already local: ${alreadyLocal} | To download: ${toDownload}`);
  if (toDownload === 0) {
    console.log('Nothing to download — JSON already uses local paths.');
    return;
  }

  let done = 0, failed = 0;
  const results = await processInBatches(tasks, CONCURRENCY);
  for (const r of results) {
    if (r === 'ok') done++;
    else { failed++; }
    if ((done + failed) % 50 === 0) {
      process.stdout.write(`\r  ${done + failed}/${toDownload} (${done} ok, ${failed} failed)...`);
    }
  }
  console.log(`\nDone. Downloaded: ${done} | Failed: ${failed} (URLs may be expired)`);
  if (failed > 0) console.log('  Re-run after a fresh build-dataset.mjs to retry failed images.');

  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  console.log('Updated nadrazky.json with local image paths.');
}

main().catch(e => { console.error(e); process.exit(1); });
