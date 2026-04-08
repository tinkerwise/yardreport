// ── Shared utilities ──────────────────────────────────────────────
import { MLB } from './config.js';

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

export function normalizeText(str) {
  return String(str ?? '').replace(/\s+/g, ' ').trim();
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
