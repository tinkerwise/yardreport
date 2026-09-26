#!/usr/bin/env node
// ── Orioles walk-up song snapshot ────────────────────────────────────
// Scrapes the official Orioles walk-up music page and writes
// public/walkup-songs.json, which the site serves to the browser. This runs
// locally (it's part of `npm run deploy`) because the web host's IP is
// blocked by mlb.com, so rss-proxy.php can't fetch the page live.
//
// On any failure the existing JSON is left untouched, so a flaky fetch
// never wipes the songs or blocks a deploy.
//
// Usage: npm run update:walkup-songs

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_PATH = `${ROOT}public/walkup-songs.json`;
const SOURCE_URL = 'https://www.mlb.com/orioles/ballpark/music';

// Fewer rows than this almost certainly means the page layout changed.
const MIN_PLAYERS = 10;

const decode = s => String(s ?? '')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#x27;|&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ')
  .trim();

function parse(html) {
  const start = html.indexOf('data-testid="player-walkup-music"');
  if (start < 0) throw new Error('walk-up music table not found');
  const table = html.slice(start, html.indexOf('</table>', start));
  const players = {};

  for (const [row] of table.matchAll(/<tr\b[\s\S]*?<\/tr>/g)) {
    const id = row.match(/href="\/player\/(?:[^"/]*-)?(\d{5,8})"/)?.[1];
    if (!id) continue; // header row
    const first = decode(row.match(/spot-tag__super-name"[^>]*>([^<]*)/)?.[1]);
    const last = decode(row.match(/spot-tag__name"[^>]*>([^<]*)/)?.[1]);
    const urls = [...row.matchAll(/href="https:\/\/open\.spotify\.com\/(?:embed\/)?track\/([A-Za-z0-9]+)[^"]*"/g)]
      .map(m => `https://open.spotify.com/track/${m[1]}`);
    const titles = [...row.matchAll(/--songname"[^>]*>([^<]*)</g)].map(m => decode(m[1]));
    const artists = [...row.matchAll(/--artistname"[^>]*>([^<]*)</g)].map(m => decode(m[1]));
    if (!urls.length) continue;
    players[id] = {
      name: [first, last].filter(Boolean).join(' '),
      songs: [...new Set(urls)].map((url, i) => ({ url, title: titles[i] ?? '', artist: artists[i] ?? '' })),
    };
  }
  return players;
}

async function main() {
  const res = await fetch(SOURCE_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OriolesNews/1.0)' } });
  if (!res.ok) throw new Error(`${SOURCE_URL} -> HTTP ${res.status}`);
  const players = parse(await res.text());
  const count = Object.keys(players).length;
  if (count < MIN_PLAYERS) throw new Error(`only ${count} players parsed; page layout may have changed`);

  const previous = await readFile(OUT_PATH, 'utf8').then(JSON.parse).catch(() => null);
  if (JSON.stringify(previous?.players) === JSON.stringify(players)) {
    console.log(`Walk-up songs unchanged (${count} players).`);
    return;
  }
  const out = { source: SOURCE_URL, updatedAt: new Date().toISOString(), players };
  await writeFile(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${count} players to public/walkup-songs.json.`);
}

main().catch(err => {
  console.warn(`Walk-up songs not updated: ${err.message}`);
});
