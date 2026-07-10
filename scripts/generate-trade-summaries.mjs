#!/usr/bin/env node
// ── Trade rumor recap generator ──────────────────────────────────────
// Build-time only: scans the site's RSS sources for Orioles trade-rumor
// coverage, groups it by mentioned Orioles player, and asks Gemini for a
// short neutral recap of each. Writes the result into public/trade-deadline
// .json under "rumorRecaps" so the client never needs an API key — this
// script is the only thing that talks to Gemini, and it only runs when
// you invoke it by hand (`npm run generate:trade-summaries`).
//
// Requires GEMINI_API_KEY in the environment. Nothing else in the site
// calls this API; the recap page reads the static JSON this script writes.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FEEDS_PATH = `${ROOT}public/feeds.json`;
const TRADE_JSON_PATH = `${ROOT}public/trade-deadline.json`;

const PROD_PROXY = 'https://www.briancsmith.org/yardreport/rss-proxy.php';
const MLB = 'https://statsapi.mlb.com/api/v1';
const ORIOLES_ID = 110;
const SEASON = new Date().getFullYear();

const TRADE_RE = /trade deadline|trade rumor|traded to|traded for|trade target|acquire[sd]?|dealt to|deadline deal/i;
const ORIOLES_TEAM_RE = /\borioles\b|\bbaltimore\b/i;
const CUTOFF_DAYS = 30; // wider than the live page's 14-day window — this is a periodic recap, not a real-time feed
const MAX_ARTICLES_PER_PLAYER = 10;
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

function decodeHtmlEntities(str) {
  return String(str ?? '')
    .replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

async function fetchFeedItems(source) {
  try {
    const res = await fetch(`${PROD_PROXY}?url=${encodeURIComponent(source.url)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? [];
  } catch {
    return [];
  }
}

async function fetchPlayerIndex() {
  const res = await fetch(`${MLB}/sports/1/players?season=${SEASON}`);
  const data = await res.json();
  return (data.people ?? [])
    .filter(p => p.fullName && p.id)
    .map(p => ({ id: p.id, fullName: p.fullName, teamId: p.currentTeam?.id ?? null }));
}

function findMentionedPlayers(text, playerIndex) {
  const lower = text.toLowerCase();
  return playerIndex.filter(p => lower.includes(p.fullName.toLowerCase()));
}

async function callGemini(apiKey, prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 220 },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.map(p => p.text ?? '').join('').trim();
}

function buildPrompt(playerName, articles) {
  const list = articles
    .slice(0, MAX_ARTICLES_PER_PLAYER)
    .map(a => `- [${a.sourceName}, ${new Date(a.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}] ${a.title}${a.description ? ` — ${a.description}` : ''}`)
    .join('\n');

  return `You write short, neutral trade-deadline recaps for an Orioles news site. Summarize what's being reported about ${playerName} in these trade-rumor headlines. Rules:
- 2-4 sentences, plain prose, no headers or bullet points.
- Frame everything as reporting/speculation, never as confirmed fact — use words like "reported," "linked," "speculated."
- Don't invent details not present in the headlines below.
- If the headlines are vague or contradictory, say so plainly rather than papering over it.

Headlines:
${list}

Write only the recap paragraph, nothing else.`;
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set. Add it to .env and re-run:\n  export $(cat .env | xargs) && npm run generate:trade-summaries');
    process.exit(1);
  }

  console.log('Fetching feeds + player index...');
  const feeds = JSON.parse(await readFile(FEEDS_PATH, 'utf8'));
  const [feedResults, playerIndex] = await Promise.all([
    Promise.all(feeds.map(async source => ({ source, items: await fetchFeedItems(source) }))),
    fetchPlayerIndex(),
  ]);

  const cutoff = Date.now() - CUTOFF_DAYS * 864e5;
  const matches = [];
  for (const { source, items } of feedResults) {
    for (const item of items) {
      const title = decodeHtmlEntities(item.title || '');
      const description = decodeHtmlEntities(item.description || '');
      if (!TRADE_RE.test(title) && !TRADE_RE.test(description)) continue;
      const d = new Date(item.pubDate);
      if (Number.isNaN(d.getTime()) || d.getTime() < cutoff) continue;
      matches.push({ title, description, link: item.link, pubDate: item.pubDate, sourceName: source.name });
    }
  }
  console.log(`${matches.length} trade-rumor articles in the last ${CUTOFF_DAYS} days.`);

  const byPlayer = new Map();
  for (const a of matches) {
    const text = `${a.title} ${a.description}`;
    if (!ORIOLES_TEAM_RE.test(text)) continue;
    const mentioned = findMentionedPlayers(text, playerIndex).filter(p => p.teamId === ORIOLES_ID);
    for (const p of mentioned) {
      if (!byPlayer.has(p.id)) byPlayer.set(p.id, { player: p, articles: [] });
      byPlayer.get(p.id).articles.push(a);
    }
  }

  console.log(`${byPlayer.size} Orioles players mentioned in rumor coverage.`);
  if (!byPlayer.size) {
    console.log('Nothing to summarize — leaving existing rumorRecaps untouched.');
    return;
  }

  const tdData = JSON.parse(await readFile(TRADE_JSON_PATH, 'utf8'));
  tdData.rumorRecaps = tdData.rumorRecaps ?? {};

  for (const { player, articles } of byPlayer.values()) {
    const sorted = [...articles].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    console.log(`Summarizing ${player.fullName} (${sorted.length} articles)...`);
    let summary;
    try {
      summary = await callGemini(apiKey, buildPrompt(player.fullName, sorted));
    } catch (err) {
      console.error(`  Failed: ${err.message}`);
      continue;
    }
    tdData.rumorRecaps[player.id] = {
      name: player.fullName,
      summary,
      generatedAt: new Date().toISOString(),
      articles: sorted.slice(0, MAX_ARTICLES_PER_PLAYER).map(a => ({
        title: a.title, link: a.link, pubDate: a.pubDate, sourceName: a.sourceName,
      })),
    };
  }

  await writeFile(TRADE_JSON_PATH, JSON.stringify(tdData, null, 2) + '\n');
  console.log(`Wrote ${byPlayer.size} recap(s) to ${TRADE_JSON_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
