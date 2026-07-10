// ── Shared utilities ──────────────────────────────────────────────
import { MLB, PROXY } from './config.js';

export function $(id) { return document.getElementById(id); }

export const PLACEHOLDER_IMG = `${import.meta.env.BASE_URL}favicon.jpg`;

export function faviconUrl(link) {
  try {
    const { hostname } = new URL(link);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch { return ''; }
}

// Filler / default images to replace with placeholder
const FILLER_PATTERNS = [
  /s\.yimg\.com/,
  /spacer/i,
  /blank\.(gif|png|jpg)/i,
  /pixel\.(gif|png|jpg)/i,
  /1x1/,
  /transparent\.(gif|png)/i,
  /default[-_]?(thumb|image|logo)/i,
  /placeholder/i,
  /no[-_]?image/i,
  /web-app-manifest/i,   // MASN / WP manifest icons used as feed images
];

// Non-baseball / gambling content filter
const OFF_TOPIC = /\b(NHL|hockey|NBA|basketball|NFL|football|soccer|MLS|tennis|golf|NASCAR|F1|UFC|MMA|boxing|betting|bet|bets|better|odds|wager|wagers|wagering|sportsbook|sportsbooks|parlay|parlays|prop bet|prop bets|gambling|gamble|picks against the spread|best bets)\b/i;
export function isOffTopic(article) {
  const text = `${article.title || ''} ${article.description || ''}`;
  return OFF_TOPIC.test(text);
}

// Minor league / prospect content detector
const MILB_RE = /\b(MiLB|minor.?league|minor.?leaguer|Triple[- ]?A|Double[- ]?A|High[- ]?A|Single[- ]?A|AAA|prospect|prospects|farm.?system|call[- ]?up|Norfolk Tides|Bowie Baysox|Aberdeen IronBirds|Delmarva Shorebirds|draft pick|top.?prospect|pipeline|rookie.?ball)\b/i;
export function isMiLB(article) {
  const text = `${article.title || ''} ${article.description || ''}`;
  return MILB_RE.test(text);
}

export function isFillerImage(url) {
  if (!url) return true;
  return FILLER_PATTERNS.some(p => p.test(url));
}

export function extractThumbnail(article) {
  if (article.thumbnail && !isFillerImage(article.thumbnail)) return article.thumbnail;
  const content = article.content || '';
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match && !isFillerImage(match[1])) return match[1];
  const descMatch = (article.description || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  if (descMatch && !isFillerImage(descMatch[1])) return descMatch[1];
  return null;
}

export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function relativeDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatGameTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
}

export function sanitizeHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}

export function buildReaderDoc(article, htmlContent) {
  const base = article.link ? `<base href="${esc(article.link)}" target="_blank">` : '';
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    ${base}
    <style>
      body{font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.8;
        max-width:700px;margin:0 auto;padding:24px 20px 80px;color:#1a1a1a;background:#fff}
      img{max-width:100%;height:auto;border-radius:4px}
      a{color:#df4601}
      p{margin:0 0 1.2em}
      h1,h2,h3,h4{line-height:1.3;margin:1.6em 0 0.5em}
      blockquote{border-left:3px solid #df4601;margin:1.5em 0;padding:.5em 1.2em;color:#444;font-style:italic}
      figure{margin:1.5em 0}figcaption{font-size:.82em;color:#666;margin-top:6px;font-style:italic}
      pre,code{background:#f5f5f5;padding:2px 6px;border-radius:3px;font-size:.9em}
      table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left}
    </style>
  </head><body>${htmlContent}</body></html>`;
}

const CC_LOGO_32 = `${import.meta.env.BASE_URL}img/cc_B_32px.png`;
const CC_LOGO_48 = `${import.meta.env.BASE_URL}img/cc_B_48px.png`;
const CC_LOGO_64 = `${import.meta.env.BASE_URL}img/cc_B_64px.png`;
const STD_TEAM_LOGO = id => `https://www.mlbstatic.com/team-logos/${id}.svg`;

function ccLogoForSize(displaySize) {
  if (displaySize <= 32) return CC_LOGO_32;
  if (displaySize <= 48) return CC_LOGO_48;
  return CC_LOGO_64;
}

/** Returns the correct team logo URL, using the appropriately-sized CC B mark for the Orioles. */
export function teamLogoSrc(teamId, displaySize = 20) {
  const isCC = document.documentElement.getAttribute('data-theme') === 'city-connect';
  if (isCC && Number(teamId) === 110) return ccLogoForSize(displaySize);
  return STD_TEAM_LOGO(teamId);
}

/** Swap any rendered Orioles logo imgs already in the DOM to match current theme. */
export function syncOriolesLogos() {
  const isCC = document.documentElement.getAttribute('data-theme') === 'city-connect';
  if (isCC) {
    document.querySelectorAll('img[src*="team-logos/110"]').forEach(img => {
      const w = Number(img.getAttribute('width') || img.offsetWidth || 20);
      img.src = ccLogoForSize(w);
    });
  } else {
    document.querySelectorAll('img[src*="cc_B_"]').forEach(img => {
      img.src = STD_TEAM_LOGO(110);
    });
  }
}

export function normalizeText(str) {
  return String(str ?? '').replace(/\s+/g, ' ').trim();
}

// og:image fallback for articles whose RSS feed supplies no thumbnail —
// shared by the main feed (lazy, on scroll) and the bounded sidebar news
// lists (ASG, Draft), so both benefit from one cache.
const ogCache = new Map();
export async function fetchOgImage(articleUrl) {
  if (ogCache.has(articleUrl)) return ogCache.get(articleUrl);
  try {
    const key = 'yr_og:' + articleUrl;
    const stored = sessionStorage.getItem(key);
    if (stored !== null) { const v = stored || null; ogCache.set(articleUrl, v); return v; }
  } catch {}
  try {
    const data = await fetch(`${PROXY}?url=${encodeURIComponent(articleUrl)}&format=og`)
      .then(r => r.ok ? r.json() : { image: null });
    const img = typeof data.image === 'string' && data.image ? data.image : null;
    ogCache.set(articleUrl, img);
    try { sessionStorage.setItem('yr_og:' + articleUrl, img ?? ''); } catch {}
    return img;
  } catch { return null; }
}

// Compact thumbnail + headline card for narrow sidebar news lists (ASG,
// Draft) — same visual language as the homepage's video-item cards.
export function renderNewsThumbCard(article) {
  const thumb = article.thumbnail || PLACEHOLDER_IMG;
  const favicon = faviconUrl(article.link);
  return `<a class="news-thumb-card" href="${esc(article.link)}" target="_blank" rel="noopener">
    <img class="news-thumb-img" src="${esc(thumb)}" alt="" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'">
    <div class="news-thumb-info">
      <span class="news-thumb-source">
        <img class="news-thumb-favicon" src="${esc(favicon)}" alt="" onerror="this.style.display='none'">
        ${esc(article.sourceName)} · ${relativeDate(article.pubDate)}
      </span>
      <span class="news-thumb-title">${esc(article.title)}</span>
    </div>
  </a>`;
}

export function stripAccents(str) {
  return String(str ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function savantUrl(playerId) {
  return `https://baseballsavant.mlb.com/savant-player/${playerId}`;
}

export function mlbPlayerUrl(playerId) {
  return `https://www.mlb.com/player/${playerId}`;
}

// Full active-player list, fetched once and cached — backs both
// fetchPlayerIdMap (name → id lookups) and fetchPlayerIndex (name-mention
// scanning, e.g. trade-rumor headlines) so pages needing either only pay for
// one request between them.
let playerListPromise = null;
function fetchPlayerList() {
  if (!playerListPromise) {
    playerListPromise = fetch(`${MLB}/sports/1/players?season=${new Date().getFullYear()}`)
      .then(r => r.json())
      .then(data => data.people ?? [])
      .catch(() => []);
  }
  return playerListPromise;
}

// Resolves player full names to MLB person ids for pages that only have a
// name (e.g. hand-curated roster/draft JSON with no id on file).
let playerIdMapPromise = null;
export function fetchPlayerIdMap() {
  if (!playerIdMapPromise) {
    playerIdMapPromise = fetchPlayerList().then(people => {
      const map = new Map();
      for (const p of people) {
        if (p.fullName && p.id) map.set(stripAccents(p.fullName).toLowerCase(), p.id);
      }
      return map;
    });
  }
  return playerIdMapPromise;
}

// Fallback for names fetchPlayerIdMap won't have: /sports/1/players only
// covers active MLB players, so minor leaguers, very recent draftees, and
// retired players all miss it. people/search covers all of those. Used as
// a per-name lookup (not bulk), so callers should try the map first and
// only fall back to this for names that come back empty.
const searchIdCache = new Map();
export function searchPlayerId(name) {
  const key = stripAccents(name ?? '').toLowerCase();
  if (searchIdCache.has(key)) return searchIdCache.get(key);
  const promise = fetch(`${MLB}/people/search?names=${encodeURIComponent(name)}`)
    .then(r => r.json())
    .then(data => data.people?.[0]?.id ?? null)
    .catch(() => null);
  searchIdCache.set(key, promise);
  return promise;
}

// ── Cot's Contracts (Baseball Prospectus) — AL East page covers the Orioles ──
export const COTS_URL = 'https://legacy.baseballprospectus.com/compensation/cots/al_east.php';
export const COTS_PAGE_URL = 'https://legacy.baseballprospectus.com/compensation/cots/';

function parseCotsSalary(text) {
  const t = (text ?? '').trim();
  if (!t || t === '-' || t === ' ') return '';
  return t;
}

export function parseCotsContracts(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Find heading that contains "Baltimore" or "Orioles"
  const headings = [...doc.querySelectorAll('h1,h2,h3,h4,h5,td.team-name,div.team-name,span.team-name,b,strong')];
  const oriHeading = headings.find(el => /baltimore|orioles/i.test(el.textContent));
  if (!oriHeading) return null;

  // Walk siblings/parents to find the next table
  function findNextTable(startEl) {
    let el = startEl;
    for (let i = 0; i < 10; i++) {
      el = el.nextElementSibling;
      if (!el) break;
      if (el.tagName === 'TABLE') return el;
      const t = el.querySelector('table');
      if (t) return t;
    }
    // Try parent's next siblings
    const parent = startEl.parentElement;
    if (parent) {
      let pel = parent.nextElementSibling;
      for (let i = 0; i < 5; i++) {
        if (!pel) break;
        if (pel.tagName === 'TABLE') return pel;
        const t = pel.querySelector('table');
        if (t) return t;
        pel = pel.nextElementSibling;
      }
    }
    return null;
  }

  const table = findNextTable(oriHeading);
  if (!table) return null;

  const rows = [...table.querySelectorAll('tr')];
  if (!rows.length) return null;

  // Detect header row and column indices
  const headerCells = [...rows[0].querySelectorAll('td,th')].map(c => c.textContent.trim());
  const currentYear = new Date().getFullYear();
  const nameIdx = headerCells.findIndex(c => /name|player/i.test(c) || c === '');
  const posIdx  = headerCells.findIndex(c => /pos/i.test(c));

  // Find current year salary column
  const salIdx = headerCells.findIndex(c => parseInt(c) === currentYear);
  // Next year column
  const sal2Idx = headerCells.findIndex(c => parseInt(c) === currentYear + 1);

  const players = [];
  let totalPayroll = '';

  for (const row of rows.slice(1)) {
    const cells = [...row.querySelectorAll('td,th')];
    if (cells.length < 2) continue;

    const rawName = cells[nameIdx >= 0 ? nameIdx : 0]?.textContent.trim() ?? '';
    if (!rawName || /^-+$/.test(rawName)) continue;

    // Skip totals / summary rows
    if (/total|payroll|avg\s*sal|luxury/i.test(rawName)) {
      const sal = salIdx >= 0 ? parseCotsSalary(cells[salIdx]?.textContent) : '';
      if (sal && /total/i.test(rawName)) totalPayroll = sal;
      continue;
    }

    const pos = posIdx >= 0 ? (cells[posIdx]?.textContent.trim() ?? '') : '';
    const sal  = salIdx  >= 0 ? parseCotsSalary(cells[salIdx]?.textContent)  : '';
    const sal2 = sal2Idx >= 0 ? parseCotsSalary(cells[sal2Idx]?.textContent) : '';

    const link = cells[nameIdx >= 0 ? nameIdx : 0]?.querySelector('a')?.href ?? COTS_URL;

    if (!sal) continue;
    players.push({ name: rawName, pos, sal, sal2, link });
  }

  return players.length ? { players, totalPayroll, currentYear } : null;
}

// Fetches + parses the Orioles' section of Cot's Contracts once, cached for
// reuse across pages (homepage Contracts widget, Trade Deadline player cards).
let oriolesContractsPromise = null;
export function fetchOriolesContracts() {
  if (!oriolesContractsPromise) {
    oriolesContractsPromise = fetch(`${PROXY}?url=${encodeURIComponent(COTS_URL)}&format=text`)
      .then(r => r.json())
      .then(res => res.text ? parseCotsContracts(res.text) : null)
      .catch(() => null);
  }
  return oriolesContractsPromise;
}

// Full {id, fullName, teamId} rows for scanning free text (e.g. trade-rumor
// headlines) for player mentions and knowing which team they're currently on.
export function fetchPlayerIndex() {
  return fetchPlayerList().then(people =>
    people
      .filter(p => p.fullName && p.id)
      .map(p => ({ id: p.id, fullName: p.fullName, teamId: p.currentTeam?.id ?? null }))
  );
}

// Renders a player name as a Savant link when the (fast, bulk) id map has
// it, or a lookup-pending span otherwise — pair with resolveNameLookups()
// to patch those spans once the slower per-name search resolves, so minor
// leaguers and retired players end up linked too, not just active MLB roster.
export function playerNameOrLookup(name, idMap, className = 'roster-name') {
  const id = lookupPlayerId(idMap, name);
  if (id) return `<a class="${className}" href="${savantUrl(id)}" target="_blank" rel="noopener">${esc(name)}</a>`;
  return `<span class="${className}" data-name-lookup="${esc(name)}">${esc(name)}</span>`;
}

export function resolveNameLookups(containerEl) {
  const spans = containerEl.querySelectorAll('[data-name-lookup]');
  spans.forEach(async span => {
    const name = span.dataset.nameLookup;
    const id = await searchPlayerId(name);
    if (!id || !span.isConnected) return;
    const link = document.createElement('a');
    link.className = span.className;
    link.href = savantUrl(id);
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = name;
    span.replaceWith(link);
  });
}

export function lookupPlayerId(map, name) {
  return map.get(stripAccents(name ?? '').toLowerCase()) ?? null;
}

export function decodeHtmlEntities(str) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = str;
  return textarea.value;
}

export function cleanFeedText(str) {
  let text = String(str ?? '');

  for (let i = 0; i < 2; i += 1) {
    if (!/%[0-9A-Fa-f]{2}/.test(text)) break;
    try {
      const decoded = decodeURIComponent(text);
      if (decoded === text) break;
      text = decoded;
    } catch {
      break;
    }
  }

  text = text
    .replace(/%&(?:#0*39|apos);?/gi, '\'')
    .replace(/%&#0*39;?/gi, '\'')
    .replace(/&(?:#0*39|apos);?/gi, '\'')
    .replace(/&(?:#0*34|quot);?/gi, '"')
    .replace(/&(?:#0*8211|ndash);?/gi, '-')
    .replace(/&(?:#0*8212|mdash);?/gi, '--')
    .replace(/&(?:#0*8230|hellip);?/gi, '...')
    .replace(/&amp;/gi, '&');

  for (let i = 0; i < 2; i += 1) {
    const decoded = decodeHtmlEntities(text);
    if (decoded === text) break;
    text = decoded;
  }

  return normalizeText(text);
}

export function localDateStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

export function dayLabel(dateStr) {
  const today = localDateStr(0);
  const yesterday = localDateStr(-1);
  const tomorrow = localDateStr(1);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  if (dateStr === tomorrow) return 'Tomorrow';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function shortGameDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}

// Venue detail cache (shared by scores + sidebars)
const venueCache = {};
// ── Toast notifications ───────────────────────────────────────────
export function showToast(message, { duration = 6000, icon = '🔔' } = {}) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon" aria-hidden="true">${icon}</span><span class="toast-msg">${esc(message)}</span><button class="toast-close" aria-label="Dismiss">✕</button>`;

  const dismiss = () => {
    toast.classList.add('toast--out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  toast.querySelector('.toast-close').addEventListener('click', dismiss);
  container.appendChild(toast);
  setTimeout(dismiss, duration);
}

export async function fetchVenueDetails(venueId) {
  if (!venueId) return null;
  if (venueCache[venueId]) return venueCache[venueId];
  try {
    const data = await fetch(`${MLB}/venues/${venueId}?hydrate=fieldInfo`).then(r => r.json());
    const venue = data.venues?.[0] ?? null;
    venueCache[venueId] = venue;
    return venue;
  } catch {
    return null;
  }
}
