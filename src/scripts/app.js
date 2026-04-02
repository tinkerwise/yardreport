// ── Config ────────────────────────────────────────────────────────
const PROXY = `${import.meta.env.BASE_URL}rss-proxy.php`;

const DIVISION_NAMES = {
  200: 'AL West', 201: 'AL East', 202: 'AL Central',
  203: 'NL West', 204: 'NL East', 205: 'NL Central',
};

const TEAM_ABBREV = {
  108: 'LAA', 109: 'ARI', 110: 'BAL', 111: 'BOS', 112: 'CHC',
  113: 'CIN', 114: 'CLE', 115: 'COL', 116: 'DET', 117: 'HOU',
  118: 'KC',  119: 'LAD', 120: 'WSH', 121: 'NYM', 133: 'OAK',
  134: 'PIT', 135: 'SD',  136: 'SEA', 137: 'SF',  138: 'STL',
  139: 'TB',  140: 'TEX', 141: 'TOR', 142: 'MIN', 143: 'PHI',
  144: 'ATL', 145: 'CWS', 146: 'MIA', 147: 'NYY', 158: 'MIL',
};
const TEAM_SLUG = {
  108: 'angels',    109: 'd-backs',      110: 'orioles',   111: 'red-sox',
  112: 'cubs',      113: 'reds',         114: 'guardians', 115: 'rockies',
  116: 'tigers',    117: 'astros',       118: 'royals',    119: 'dodgers',
  120: 'nationals', 121: 'mets',         133: 'athletics', 134: 'pirates',
  135: 'padres',    136: 'mariners',     137: 'giants',    138: 'cardinals',
  139: 'rays',      140: 'rangers',      141: 'blue-jays', 142: 'twins',
  143: 'phillies',  144: 'braves',       145: 'white-sox', 146: 'marlins',
  147: 'yankees',   158: 'brewers',
};
const TEAM_PAGE = {
  108: 'angels',     109: 'dbacks',      110: 'orioles',    111: 'redsox',
  112: 'cubs',       113: 'reds',        114: 'guardians',  115: 'rockies',
  116: 'tigers',     117: 'astros',      118: 'royals',     119: 'dodgers',
  120: 'nationals',  121: 'mets',        133: 'athletics',  134: 'pirates',
  135: 'padres',     136: 'mariners',    137: 'giants',     138: 'cardinals',
  139: 'rays',       140: 'rangers',     141: 'bluejays',   142: 'twins',
  143: 'phillies',   144: 'braves',      145: 'whitesox',   146: 'marlins',
  147: 'yankees',    158: 'brewers',
};
const MLB = 'https://statsapi.mlb.com/api/v1';
const ORIOLES_ID = 110;
const SEASON = new Date().getFullYear();

// MLB venue coordinates for Open-Meteo weather lookups
const VENUE_COORDS = {
  1:    { lat: 33.800, lon: -117.882 },  // Angel Stadium (LAA)
  2:    { lat: 39.284, lon: -76.622 },   // Camden Yards (BAL)
  3:    { lat: 42.346, lon: -71.097 },   // Fenway Park (BOS)
  4:    { lat: 41.830, lon: -87.634 },   // Rate Field (CWS)
  5:    { lat: 41.496, lon: -81.685 },   // Progressive Field (CLE)
  7:    { lat: 39.052, lon: -94.480 },   // Kauffman Stadium (KC)
  12:   { lat: 27.768, lon: -82.653 },   // Tropicana Field (TB)
  14:   { lat: 43.642, lon: -79.389 },   // Rogers Centre (TOR)
  15:   { lat: 33.445, lon: -112.067 },  // Chase Field (ARI)
  17:   { lat: 41.948, lon: -87.656 },   // Wrigley Field (CHC)
  19:   { lat: 39.756, lon: -104.994 },  // Coors Field (COL)
  22:   { lat: 34.074, lon: -118.241 },  // Dodger Stadium (LAD)
  31:   { lat: 40.447, lon: -80.006 },   // PNC Park (PIT)
  32:   { lat: 43.028, lon: -87.971 },   // American Family Field (MIL)
  680:  { lat: 47.591, lon: -122.333 },  // T-Mobile Park (SEA)
  2392: { lat: 29.757, lon: -95.356 },   // Daikin Park (HOU)
  2394: { lat: 42.339, lon: -83.049 },   // Comerica Park (DET)
  2395: { lat: 37.778, lon: -122.389 },  // Oracle Park (SF)
  2529: { lat: 38.580, lon: -121.512 },  // Sutter Health Park (OAK)
  2602: { lat: 39.097, lon: -84.507 },   // Great American (CIN)
  2680: { lat: 32.708, lon: -117.157 },  // Petco Park (SD)
  2681: { lat: 39.905, lon: -75.167 },   // Citizens Bank Park (PHI)
  2889: { lat: 38.623, lon: -90.193 },   // Busch Stadium (STL)
  3289: { lat: 40.758, lon: -73.846 },   // Citi Field (NYM)
  3309: { lat: 38.873, lon: -77.008 },   // Nationals Park (WSH)
  3312: { lat: 44.982, lon: -93.278 },   // Target Field (MIN)
  3313: { lat: 40.829, lon: -73.927 },   // Yankee Stadium (NYY)
  4169: { lat: 25.778, lon: -80.220 },   // loanDepot park (MIA)
  4705: { lat: 33.891, lon: -84.468 },   // Truist Park (ATL)
  5325: { lat: 32.747, lon: -97.082 },   // Globe Life Field (TEX)
};

// ── Settings (persisted to localStorage) ─────────────────────────
const PREFS_KEY = 'yr_prefs';
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; }
}
function savePrefs(updates) {
  const prefs = { ...loadPrefs(), ...updates };
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  return prefs;
}
const prefs = loadPrefs();

// ── Theme ────────────────────────────────────────────────────────
function applyTheme(theme) {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : theme;
  document.documentElement.setAttribute('data-theme', resolved);
  savePrefs({ theme });
}
applyTheme(prefs.theme || 'dark');

// ── Read/unread tracking ─────────────────────────────────────────
const READ_KEY = 'yr_read';
function getReadArticles() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY)) || []); } catch { return new Set(); }
}
function markRead(url) {
  const read = getReadArticles();
  read.add(url);
  const arr = [...read].slice(-200);
  localStorage.setItem(READ_KEY, JSON.stringify(arr));
}
function unmarkRead(url) {
  const read = getReadArticles();
  read.delete(url);
  localStorage.setItem(READ_KEY, JSON.stringify([...read]));
}

// ── State ─────────────────────────────────────────────────────────
const defaultView = prefs.defaultView || 'list';
const state = {
  articles: [],
  activeCategory: 'all',
  activeSource: 'all',
  searchQuery: '',
  sortBy: 'date',
  dateRange: 3,
  viewMode: window.innerWidth <= 600 ? 'list' : defaultView,
  standings: [],
  activeDiv: null,
  gamesMap: {},
};

// ── Utilities ─────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

const PLACEHOLDER_IMG = `${import.meta.env.BASE_URL}favicon.jpg`;

function faviconUrl(link) {
  try {
    const { hostname } = new URL(link);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch { return ''; }
}

// Filler / default images from sources that should be replaced with our placeholder
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

// Filter out non-baseball articles that leak in from general sports feeds
const OFF_TOPIC = /\b(NHL|hockey|NBA|basketball|NFL|football|soccer|MLS|tennis|golf|NASCAR|F1|UFC|MMA|boxing)\b/i;
function isOffTopic(article) {
  const text = `${article.title || ''} ${article.description || ''}`;
  return OFF_TOPIC.test(text);
}

// Detect minor league / prospect content
const MILB_RE = /\b(MiLB|minor.?league|minor.?leaguer|Triple[- ]?A|Double[- ]?A|High[- ]?A|Single[- ]?A|AAA|prospect|prospects|farm.?system|call[- ]?up|Norfolk Tides|Bowie Baysox|Aberdeen IronBirds|Delmarva Shorebirds|draft pick|top.?prospect|pipeline|rookie.?ball)\b/i;
function isMiLB(article) {
  const text = `${article.title || ''} ${article.description || ''}`;
  return MILB_RE.test(text);
}

function isFillerImage(url) {
  if (!url) return true;
  return FILLER_PATTERNS.some(p => p.test(url));
}

function extractThumbnail(article) {
  if (article.thumbnail && !isFillerImage(article.thumbnail)) return article.thumbnail;
  const content = article.content || '';
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match && !isFillerImage(match[1])) return match[1];
  const descMatch = (article.description || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  if (descMatch && !isFillerImage(descMatch[1])) return descMatch[1];
  return null;
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function relativeDate(dateStr) {
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

function formatGameTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
}

function sanitizeHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}

function buildReaderDoc(article, htmlContent) {
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

// ── Weather condition → emoji mapping ─────────────────────────────
function weatherEmoji(condition) {
  if (!condition) return '';
  const c = condition.toLowerCase();
  if (c.includes('clear') || c.includes('sunny')) return '☀️';
  if (c.includes('partly cloudy')) return '⛅';
  if (c.includes('cloud') || c.includes('overcast')) return '☁️';
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return '🌧️';
  if (c.includes('snow')) return '❄️';
  if (c.includes('thunder') || c.includes('storm')) return '⛈️';
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return '🌫️';
  if (c.includes('wind')) return '💨';
  if (c.includes('dome') || c.includes('roof closed')) return '🏟️';
  return '🌤️';
}

// Open-Meteo WMO weather code → condition + emoji
const WMO_WEATHER = {
  0: 'Clear', 1: 'Mostly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle',
  61: 'Rain', 63: 'Rain', 65: 'Heavy Rain',
  71: 'Snow', 73: 'Snow', 75: 'Heavy Snow',
  80: 'Showers', 81: 'Showers', 82: 'Heavy Showers',
  95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
};

// Fetch weather for a set of venue IDs + dates, returns Map of "venueId-date" → { condition, temp, emoji }
const weatherCache = new Map();
async function fetchWeatherForGames(games) {
  // Collect unique venue+date combos
  const requests = new Map();
  for (const g of games) {
    const venueId = g.venue?.id;
    const coords = VENUE_COORDS[venueId];
    if (!coords) continue;
    const date = g.officialDate || g.gameDate?.slice(0, 10);
    const hour = new Date(g.gameDate).getHours();
    const key = `${venueId}-${date}`;
    if (!weatherCache.has(key) && !requests.has(key)) {
      requests.set(key, { coords, date, hour, venueId });
    }
  }

  // Fetch from Open-Meteo (batch by unique lat/lon to minimize calls)
  const coordGroups = new Map();
  for (const [key, req] of requests) {
    const coordKey = `${req.coords.lat},${req.coords.lon}`;
    if (!coordGroups.has(coordKey)) coordGroups.set(coordKey, { coords: req.coords, items: [] });
    coordGroups.get(coordKey).items.push({ key, date: req.date, hour: req.hour, venueId: req.venueId });
  }

  const fetches = [...coordGroups.values()].map(async ({ coords, items }) => {
    try {
      const dates = [...new Set(items.map(i => i.date))].sort();
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=temperature_2m,weather_code&temperature_unit=fahrenheit&start_date=${dates[0]}&end_date=${dates[dates.length - 1]}&timezone=America%2FNew_York`;
      const data = await fetch(url).then(r => r.json());
      if (!data.hourly) return;

      for (const item of items) {
        // Find the closest hour in the forecast
        const targetHour = item.hour || 19; // default to 7 PM for games
        const targetIdx = data.hourly.time.findIndex(t => t.startsWith(item.date) && parseInt(t.slice(11, 13)) >= targetHour);
        const idx = targetIdx >= 0 ? targetIdx : data.hourly.time.findIndex(t => t.startsWith(item.date));
        if (idx >= 0) {
          const code = data.hourly.weather_code[idx];
          const temp = Math.round(data.hourly.temperature_2m[idx]);
          const condition = WMO_WEATHER[code] ?? 'Unknown';
          weatherCache.set(item.key, { condition, temp, emoji: weatherEmoji(condition) });
        }
      }
    } catch { /* ignore weather errors */ }
  });

  await Promise.allSettled(fetches);
}

function getGameWeather(g) {
  const venueId = g.venue?.id;
  const date = g.officialDate || g.gameDate?.slice(0, 10);
  return weatherCache.get(`${venueId}-${date}`) ?? null;
}

// ── Scores ────────────────────────────────────────────────────────
function teamAbbr(team) {
  return TEAM_ABBREV[team.id] ?? team.abbreviation ?? team.name.slice(0, 3).toUpperCase();
}

function sortGamesOrioles(games) {
  return [...games].sort((a, b) => {
    const aO = a.teams.away.team.id === ORIOLES_ID || a.teams.home.team.id === ORIOLES_ID;
    const bO = b.teams.away.team.id === ORIOLES_ID || b.teams.home.team.id === ORIOLES_ID;
    if (aO && !bO) return -1;
    if (!aO && bO) return 1;
    return new Date(a.gameDate) - new Date(b.gameDate);
  });
}

function renderGameChip(g) {
  const away = g.teams.away;
  const home = g.teams.home;
  const hasOrioles = away.team.id === ORIOLES_ID || home.team.id === ORIOLES_ID;
  const gameState = g.status.abstractGameState; // Preview | Live | Final
  const isLive = gameState === 'Live';
  const isDone = gameState === 'Final';
  const isPre  = gameState === 'Preview';

  let stateClass = isDone ? 'final' : isLive ? 'live' : 'preview';

  let statusInner = '';
  if (isLive) {
    const half = g.linescore?.inningHalf === 'Top' ? '▲' : '▼';
    const inn = g.linescore?.currentInning ?? '';
    const offense = g.linescore?.offense ?? {};
    const b1 = offense.first ? ' on' : '';
    const b2 = offense.second ? ' on' : '';
    const b3 = offense.third ? ' on' : '';
    const bases = `<span class="bases-diamond"><span class="base b2${b2}"></span><span class="base b3${b3}"></span><span class="base b1${b1}"></span></span>`;
    statusInner = `<span class="live-dot"></span> ${half}${inn} ${bases}`;
  } else if (isDone) {
    statusInner = 'Final';
  } else {
    statusInner = formatGameTime(g.gameDate);
  }

  const awayScore = (!isPre && away.score != null) ? away.score : '';
  const homeScore = (!isPre && home.score != null) ? home.score : '';
  const awayWin = isDone && Number(awayScore) > Number(homeScore);
  const homeWin = isDone && Number(homeScore) > Number(awayScore);

  const awaySlug = TEAM_SLUG[away.team.id] ?? away.team.name.split(' ').pop().toLowerCase();
  const homeSlug = TEAM_SLUG[home.team.id] ?? home.team.name.split(' ').pop().toLowerCase();
  const gameDate = g.gameDate.slice(0, 10).replace(/-/g, '/');
  const gamedaySuffix = isPre ? 'preview' : 'final';
  const gamedayUrl = `https://www.mlb.com/gameday/${awaySlug}-vs-${homeSlug}/${gameDate}/${g.gamePk}/${gamedaySuffix}`;

  const wx = getGameWeather(g);
  const wxInline = (isPre && wx) ? ` ${wx.emoji}${wx.temp}°` : '';
  const storyRow = isDone
    ? `<span class="chip-story" data-story="https://www.mlb.com/stories/game/${g.gamePk}?storylocal=gameday-postgame-wrap-game-embed">Story</span>`
    : '';

  return `<a class="score-chip ${stateClass}${hasOrioles ? ' orioles' : ''}"
      data-gamepk="${g.gamePk}"
      href="${gamedayUrl}"
      target="_blank" rel="noopener">
    <div class="chip-row${awayWin ? ' winner' : ''}">
      <span class="chip-team">${esc(teamAbbr(away.team))}</span>
      <span class="chip-score">${awayScore}</span>
    </div>
    <div class="chip-row${homeWin ? ' winner' : ''}">
      <span class="chip-team">${esc(teamAbbr(home.team))}</span>
      <span class="chip-score">${homeScore}</span>
    </div>
    <span class="chip-status ${stateClass}">${statusInner}${wxInline}</span>
    ${storyRow}
  </a>`;
}

function localDateStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function dayLabel(dateStr) {
  const today = localDateStr(0);
  const yesterday = localDateStr(-1);
  const tomorrow = localDateStr(1);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  if (dateStr === tomorrow) return 'Tomorrow';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Cache for boxscore API responses
const boxscoreCache = {};

async function fetchBoxscore(gamePk) {
  if (boxscoreCache[gamePk]) return boxscoreCache[gamePk];
  try {
    const data = await fetch(`${MLB}/game/${gamePk}/boxscore`).then(r => r.json());
    boxscoreCache[gamePk] = data;
    return data;
  } catch { return null; }
}

function topPerformers(boxData) {
  if (!boxData) return '';
  const sides = ['away', 'home'];
  const allBatters = [];
  const allPitchers = [];

  for (const side of sides) {
    const team = boxData.teams?.[side];
    if (!team) continue;
    const abbr = TEAM_ABBREV[team.team?.id] ?? team.team?.abbreviation ?? '';
    const players = team.players ?? {};
    for (const [, p] of Object.entries(players)) {
      const bs = p.stats?.batting;
      const ps = p.stats?.pitching;
      if (bs && (bs.atBats > 0 || bs.baseOnBalls > 0)) {
        const hits = bs.hits ?? 0;
        const ab = bs.atBats ?? 0;
        const hr = bs.homeRuns ?? 0;
        const rbi = bs.rbi ?? 0;
        const bb = bs.baseOnBalls ?? 0;
        // Score: weight HRs and multi-hit games
        const score = hits * 2 + hr * 5 + rbi * 2 + bb;
        allBatters.push({ name: p.person?.fullName ?? '', abbr, hits, ab, hr, rbi, bb, score });
      }
      if (ps && (ps.inningsPitched != null)) {
        const ip = parseFloat(ps.inningsPitched) || 0;
        const k = ps.strikeOuts ?? 0;
        const er = ps.earnedRuns ?? 0;
        const h = ps.hits ?? 0;
        allPitchers.push({ name: p.person?.fullName ?? '', abbr, ip, k, er, h });
      }
    }
  }

  // Top 3 hitters by score
  allBatters.sort((a, b) => b.score - a.score);
  const topHit = allBatters.slice(0, 3);

  // Top pitchers: sort by IP desc (starters first), then show up to 3
  allPitchers.sort((a, b) => b.ip - a.ip || a.er - b.er);
  const topPitch = allPitchers.slice(0, 3);

  let html = '';
  if (topHit.length) {
    html += '<div class="box-performers"><span class="box-perf-label">Top Hitters</span>';
    html += topHit.map(b => {
      const line = `${b.hits}-${b.ab}`;
      const extras = [];
      if (b.hr) extras.push(`${b.hr} HR`);
      if (b.rbi) extras.push(`${b.rbi} RBI`);
      if (b.bb) extras.push(`${b.bb} BB`);
      return `<span class="box-perf-row"><span class="box-perf-name">${esc(b.name)}</span> <span class="box-perf-team">${esc(b.abbr)}</span> <span class="box-perf-stat">${line}${extras.length ? ', ' + extras.join(', ') : ''}</span></span>`;
    }).join('');
    html += '</div>';
  }
  if (topPitch.length) {
    html += '<div class="box-performers"><span class="box-perf-label">Top Pitchers</span>';
    html += topPitch.map(p => {
      return `<span class="box-perf-row"><span class="box-perf-name">${esc(p.name)}</span> <span class="box-perf-team">${esc(p.abbr)}</span> <span class="box-perf-stat">${p.ip} IP, ${p.k} K, ${p.er} ER</span></span>`;
    }).join('');
    html += '</div>';
  }
  return html;
}

function renderBoxScore(g, boxData) {
  const ls = g.linescore;
  const away = g.teams.away;
  const home = g.teams.home;
  const awayAbbr = teamAbbr(away.team);
  const homeAbbr = teamAbbr(home.team);
  const innings = ls?.innings ?? [];
  const numInnings = Math.max(innings.length, 9);

  // Header row: inning numbers
  let hdr = '<th class="box-team-col"></th>';
  for (let i = 1; i <= numInnings; i++) hdr += `<th>${i}</th>`;
  hdr += '<th class="box-total">R</th><th class="box-total">H</th><th class="box-total">E</th>';

  // Away row
  let awayRow = `<td class="box-team-col">${esc(awayAbbr)}</td>`;
  for (let i = 0; i < numInnings; i++) {
    const inn = innings[i];
    awayRow += `<td>${inn?.away?.runs ?? (i < innings.length ? '0' : '')}</td>`;
  }
  const at = ls?.teams?.away ?? {};
  awayRow += `<td class="box-total">${at.runs ?? away.score ?? ''}</td>`;
  awayRow += `<td class="box-total">${at.hits ?? ''}</td>`;
  awayRow += `<td class="box-total">${at.errors ?? ''}</td>`;

  // Home row
  let homeRow = `<td class="box-team-col">${esc(homeAbbr)}</td>`;
  for (let i = 0; i < numInnings; i++) {
    const inn = innings[i];
    homeRow += `<td>${inn?.home?.runs ?? (i < innings.length ? '0' : '')}</td>`;
  }
  const ht = ls?.teams?.home ?? {};
  homeRow += `<td class="box-total">${ht.runs ?? home.score ?? ''}</td>`;
  homeRow += `<td class="box-total">${ht.hits ?? ''}</td>`;
  homeRow += `<td class="box-total">${ht.errors ?? ''}</td>`;

  // Winning / losing pitcher if available
  let decisions = '';
  const wp = g.decisions?.winner;
  const lp = g.decisions?.loser;
  const sv = g.decisions?.save;
  if (wp || lp) {
    const parts = [];
    if (wp) parts.push(`<span class="box-wp">W: ${esc(wp.fullName)}</span>`);
    if (lp) parts.push(`<span class="box-lp">L: ${esc(lp.fullName)}</span>`);
    if (sv) parts.push(`<span class="box-sv">SV: ${esc(sv.fullName)}</span>`);
    decisions = `<div class="box-decisions">${parts.join(' ')}</div>`;
  }

  const performers = topPerformers(boxData);

  return `<table class="box-score-table">
    <thead><tr>${hdr}</tr></thead>
    <tbody>
      <tr>${awayRow}</tr>
      <tr>${homeRow}</tr>
    </tbody>
  </table>${decisions}${performers}`;
}

async function loadScores() {
  const track = $('scoresTrack');
  try {
    const yesterday = localDateStr(-1);
    const today = localDateStr(0);
    const tomorrow = localDateStr(1);

    const [ydData, todayData, tmData] = await Promise.all([
      fetch(`${MLB}/schedule?sportId=1&date=${yesterday}&hydrate=linescore,team,venue,decisions`).then(r => r.json()),
      fetch(`${MLB}/schedule?sportId=1&date=${today}&hydrate=linescore,team,venue,decisions`).then(r => r.json()),
      fetch(`${MLB}/schedule?sportId=1&date=${tomorrow}&hydrate=linescore,team,venue,decisions`).then(r => r.json()),
    ]);

    const allGames = [
      ...(ydData.dates?.[0]?.games ?? []),
      ...(todayData.dates?.[0]?.games ?? []),
      ...(tmData.dates?.[0]?.games ?? []),
    ];
    // Store games for box score popover
    for (const g of allGames) state.gamesMap[g.gamePk] = g;
    await fetchWeatherForGames(allGames);

    const days = [
      { label: dayLabel(yesterday), games: sortGamesOrioles(ydData.dates?.[0]?.games ?? []) },
      { label: dayLabel(today),     games: sortGamesOrioles(todayData.dates?.[0]?.games ?? []) },
      { label: dayLabel(tomorrow),  games: sortGamesOrioles(tmData.dates?.[0]?.games ?? []) },
    ];

    let html = '';
    for (const day of days) {
      if (day.games.length) {
        const id = day.label === 'Today' ? ' id="todayLabel"'
          : day.label === 'Yesterday' ? ' id="yesterdayLabel"' : '';
        html += `<span class="scores-day-label"${id}>${day.label}</span>`;
        html += day.games.map(renderGameChip).join('');
      }
    }
    track.innerHTML = html || '<span class="scores-msg">No games scheduled</span>';

    // Story link click handler — redirect to story URL instead of Gameday
    track.querySelectorAll('.chip-story').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        window.open(el.dataset.story, '_blank');
      });
    });

    // Box score popover on hover
    let boxPopover = document.getElementById('boxScorePopover');
    if (!boxPopover) {
      boxPopover = document.createElement('div');
      boxPopover.id = 'boxScorePopover';
      boxPopover.className = 'box-score-popover hidden';
      document.body.appendChild(boxPopover);
    }
    let boxTimer = null;
    function positionPopover(chip) {
      const r = chip.getBoundingClientRect();
      const pw = boxPopover.offsetWidth;
      const ph = boxPopover.offsetHeight;
      let left = r.left + r.width / 2 - pw / 2;
      if (left < 4) left = 4;
      if (left + pw > window.innerWidth - 4) left = window.innerWidth - pw - 4;
      let top = r.bottom + 6;
      if (top + ph > window.innerHeight - 4) top = r.top - ph - 6;
      boxPopover.style.left = left + 'px';
      boxPopover.style.top = top + 'px';
    }
    function showBoxScore(chip) {
      const pk = chip.dataset.gamepk;
      const g = state.gamesMap[pk];
      if (!g || g.status.abstractGameState === 'Preview') return;
      clearTimeout(boxTimer);
      // Show linescore immediately
      boxPopover.innerHTML = renderBoxScore(g, boxscoreCache[pk] || null);
      boxPopover.style.left = '-9999px';
      boxPopover.style.top = '0';
      boxPopover.classList.remove('hidden');
      positionPopover(chip);
      // Fetch full boxscore for performers (async, cached)
      if (!boxscoreCache[pk] && g.status.abstractGameState !== 'Preview') {
        fetchBoxscore(pk).then(data => {
          if (data && !boxPopover.classList.contains('hidden')) {
            boxPopover.innerHTML = renderBoxScore(g, data);
            positionPopover(chip);
          }
        });
      }
    }
    function hideBoxScore() {
      boxTimer = setTimeout(() => boxPopover.classList.add('hidden'), 250);
    }
    track.querySelectorAll('.score-chip').forEach(chip => {
      chip.addEventListener('mouseenter', () => showBoxScore(chip));
      chip.addEventListener('mouseleave', hideBoxScore);
    });
    boxPopover.addEventListener('mouseenter', () => clearTimeout(boxTimer));
    boxPopover.addEventListener('mouseleave', hideBoxScore);

    // Before noon EDT, keep yesterday's scores front-and-center
    const nowUTC = new Date();
    const edtHour = (nowUTC.getUTCHours() - 4 + 24) % 24;
    const beforeNoonEDT = edtHour < 12;
    const scrollTarget = beforeNoonEDT
      ? document.getElementById('yesterdayLabel') || document.getElementById('todayLabel')
      : document.getElementById('todayLabel');
    if (scrollTarget) {
      const bar = track.parentElement;
      bar.scrollLeft = scrollTarget.offsetLeft - 12;
    }

  } catch {
    track.innerHTML = '<span class="scores-msg">Scores unavailable</span>';
  }
}

// ── Standings ─────────────────────────────────────────────────────
async function loadStandings() {
  try {
    const data = await fetch(
      `${MLB}/standings?leagueId=103,104&season=${SEASON}&standingsTypes=regularSeason`
    ).then(r => r.json());

    state.standings = data.records.map(div => ({
      divisionId: div.division.id,
      division: DIVISION_NAMES[div.division.id] ?? div.division.name ?? String(div.division.id),
      teams: div.teamRecords.map(t => ({
        id: t.team.id,
        abbrev: TEAM_ABBREV[t.team.id] ?? t.team.abbreviation ?? t.team.name.slice(0, 3).toUpperCase(),
        wins: t.wins,
        losses: t.losses,
        gb: t.gamesBack === '0' ? '-' : t.gamesBack,
        streak: t.streak?.streakCode ?? '-',
        isOrioles: t.team.id === ORIOLES_ID,
      })),
    }));

    // Default to AL East (id 201)
    const alEast = state.standings.find(d => d.divisionId === 201);
    state.activeDiv = alEast?.divisionId ?? state.standings[0]?.divisionId ?? null;

    renderDivTabs();
    renderStandings();
  } catch {
    $('standingsWrap').innerHTML = '<span class="sidebar-msg">Standings unavailable</span>';
  }
}

function renderDivTabs() {
  const container = $('divTabs');
  container.innerHTML = state.standings.map(d => {
    const short = d.division.replace('American League ', 'AL ').replace('National League ', 'NL ');
    return `<button class="div-tab${d.divisionId === state.activeDiv ? ' active' : ''}"
      data-div="${d.divisionId}">${esc(short)}</button>`;
  }).join('');

  container.querySelectorAll('.div-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeDiv = Number(btn.dataset.div);
      renderDivTabs();
      renderStandings();
    });
  });
}

function renderStandings() {
  const div = state.standings.find(d => d.divisionId === state.activeDiv);
  if (!div) return;
  $('standingsWrap').innerHTML = `
    <table class="standings-table">
      <thead><tr>
        <th>Team</th><th>W</th><th>L</th><th>GB</th><th>Str</th>
      </tr></thead>
      <tbody>${div.teams.map(t => {
        const teamUrl = TEAM_PAGE[t.id] ? `https://www.mlb.com/${TEAM_PAGE[t.id]}` : '#';
        return `<tr class="${t.isOrioles ? 'orioles-row' : ''}">
          <td class="team-abbrev"><a href="${teamUrl}" target="_blank" rel="noopener">${esc(t.abbrev)}</a></td>
          <td>${t.wins}</td><td>${t.losses}</td>
          <td>${esc(t.gb)}</td><td>${esc(t.streak)}</td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>`;
}

// ── Feeds ─────────────────────────────────────────────────────────
async function fetchFeed(source) {
  try {
    const url = `${PROXY}?url=${encodeURIComponent(source.url)}`;
    const data = await fetch(url).then(r => r.json());
    return {
      source,
      articles: (data.items ?? []).map(item => ({
        title: item.title ?? '',
        link: item.link ?? '',
        pubDate: item.pubDate ?? '',
        description: item.description ?? '',
        content: item.content ?? '',
        thumbnail: item.thumbnail ?? null,
      })),
    };
  } catch {
    return { source, articles: [] };
  }
}

async function loadFeeds() {
  $('articleList').innerHTML = '<div class="feed-msg">Loading news…</div>';
  let FEEDS;
  try {
    FEEDS = await fetch(`${import.meta.env.BASE_URL}feeds.json`).then(r => r.json());
  } catch {
    $('articleList').innerHTML = '<div class="feed-msg">Could not load feeds.json</div>';
    return [];
  }
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));

  state.articles = [];
  const successfulSources = [];

  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const { source, articles } = r.value;
    successfulSources.push(source);
    for (const article of articles) {
      if (isOffTopic(article)) continue;
      const effectiveSource = isMiLB(article)
        ? { ...source, category: 'milb' }
        : source;
      state.articles.push({ ...article, source: effectiveSource });
    }
  }

  renderSourceFilters(successfulSources);
  renderArticles();

  return successfulSources;
}

function renderSourceFilters(sources) {
  const container = $('sourceFilters');
  container.innerHTML =
    `<button class="pill${state.activeSource === 'all' ? ' active' : ''}" data-source="all">All</button>` +
    sources.map(s =>
      `<button class="pill${state.activeSource === s.id ? ' active' : ''}" data-source="${esc(s.id)}">${esc(s.name)}</button>`
    ).join('');

  container.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeSource = btn.dataset.source;
      container.querySelectorAll('.pill').forEach(p =>
        p.classList.toggle('active', p.dataset.source === state.activeSource));
      renderArticles();
    });
  });
}

function getFilteredArticles() {
  let arts = state.articles;
  const rangeDays = state.dateRange || 3;
  const cutoff = Date.now() - rangeDays * 864e5;

  // Filter by selected date range unless searching
  if (!state.searchQuery) {
    arts = arts.filter(a => {
      const d = new Date(a.pubDate);
      return !isNaN(d) && d.getTime() > cutoff;
    });
  }

  if (state.activeCategory === 'all') {
    // Hide MiLB articles from "All" — they only show under the MiLB filter
    arts = arts.filter(a => a.source.category !== 'milb');
  } else {
    arts = arts.filter(a => a.source.category === state.activeCategory);
  }
  if (state.activeSource !== 'all') {
    arts = arts.filter(a => a.source.id === state.activeSource);
  }
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    arts = arts.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.source.name.toLowerCase().includes(q)
    );
  }

  if (state.sortBy === 'date') {
    arts = [...arts].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  } else {
    arts = [...arts].sort((a, b) =>
      a.source.name.localeCompare(b.source.name) || new Date(b.pubDate) - new Date(a.pubDate)
    );
  }

  return arts;
}

function articleDateGroup(dateStr) {
  if (!dateStr) return 'Older';
  const d = new Date(dateStr);
  if (isNaN(d)) return 'Older';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const articleDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today - articleDay) / 864e5);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'This Week';
  if (diffDays <= 30) return 'This Month';
  return 'Older';
}

function renderCard(a, i) {
  const imgSrc = extractThumbnail(a);
  const hasFullContent = (a.content || '').length > 400;
  const mode = state.viewMode;
  const favicon = faviconUrl(a.link);
  const isRead = getReadArticles().has(a.link);
  const readClass = isRead ? ' read' : '';
  const readTick = isRead ? '<span class="read-tick" title="Read">✓</span>' : '';

  const fallback = `<div class=\\'article-thumb-placeholder\\'><img class=\\'placeholder-logo\\' src=\\'${PLACEHOLDER_IMG}\\' alt=\\'\\'></div>`;
  const thumbImg = imgSrc
    ? `<img class="article-thumb" src="${esc(imgSrc)}" alt="" loading="lazy"
         onerror="this.outerHTML='${fallback}'"
         onload="var w=this.naturalWidth,h=this.naturalHeight,r=w/h;if(w<20||h<20||r>4||r<0.3)this.outerHTML='${fallback}'">`
    : `<div class="article-thumb-placeholder"><img class="placeholder-logo" src="${PLACEHOLDER_IMG}" alt=""></div>`;

  const source = `<span class="source-line">
    <img class="source-ico" src="${esc(favicon)}" alt="" onerror="this.style.display='none'">
    <span class="source-name">${esc(a.source.name)}</span>
    <span class="article-date">${relativeDate(a.pubDate)}</span>
    ${hasFullContent ? '<span class="full-badge">Full</span>' : ''}
    <button class="share-btn" data-url="${esc(a.link)}" data-title="${esc(a.title)}" title="Share" onclick="event.stopPropagation();if(navigator.share)navigator.share({title:this.dataset.title,url:this.dataset.url});else{navigator.clipboard.writeText(this.dataset.url);this.textContent='Copied!';setTimeout(()=>this.innerHTML='<svg width=\\'12\\' height=\\'12\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><path d=\\'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8\\'/><polyline points=\\'16 6 12 2 8 6\\'/><line x1=\\'12\\' y1=\\'2\\' x2=\\'12\\' y2=\\'15\\'/></svg>',1500)}">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
    </button>
    ${readTick}
  </span>`;

  if (mode === 'compact') {
    return `<div class="article-card compact${readClass}" data-idx="${i}" role="button" tabindex="0">
      ${source}
      <div class="article-title">${esc(a.title)}</div>
    </div>`;
  }

  if (mode === 'list') {
    return `<div class="article-card list-view${readClass}" data-idx="${i}" role="button" tabindex="0">
      ${thumbImg}
      <div class="article-body">
        ${source}
        <div class="article-title">${esc(a.title)}</div>
        ${a.description ? `<div class="article-desc">${esc(a.description)}</div>` : ''}
      </div>
    </div>`;
  }

  // Grid mode (default)
  return `<div class="article-card${readClass}" data-idx="${i}" role="button" tabindex="0">
    ${thumbImg}
    <div class="article-body">
      ${source}
      <div class="article-title">${esc(a.title)}</div>
      ${a.description ? `<div class="article-desc">${esc(a.description)}</div>` : ''}
    </div>
  </div>`;
}

// ── "Around the Horn" story bundling ──────────────────────────
// Groups articles about the same story across sources.
// Extracts key proper nouns / phrases from titles and clusters by overlap.

function tokenize(title) {
  // Remove common filler words, keep meaningful terms
  const stop = new Set(['a','an','the','of','in','on','to','for','and','is','are','was','at','by','with','from','vs','after','how','what','why','who','this','that','it','its','has','have','had','be','do','does','not','but','or','can','will','may','about','into','over','up','out','no','so','all','just','than','then','also','new','more','first','last','one','two','three','game','games','mlb','baseball','season','team','teams','series']);
  return title.toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stop.has(w));
}

function buildTopicLabel(sharedTokens, articles) {
  if (!sharedTokens.length) {
    return articles.slice().sort((a, b) => a.title.length - b.title.length)[0].title;
  }

  // Try to extract a person name from the shared tokens
  // Check if any article title starts with a proper name that contains shared tokens
  const nameRe = /^([A-Z][a-z]+ [A-Z][a-z]+)/;
  let playerName = '';
  for (const a of articles) {
    const m = a.title.match(nameRe);
    if (m) {
      const nameParts = m[1].toLowerCase().split(' ');
      if (nameParts.some(p => sharedTokens.includes(p))) {
        playerName = m[1];
        break;
      }
    }
  }

  // Build a descriptive phrase from shared tokens
  const phrase = sharedTokens
    .map(t => t.charAt(0).toUpperCase() + t.slice(1))
    .join(' ');

  // If we found a player name, lead with "Name: topic"
  let label;
  if (playerName) {
    const remaining = sharedTokens
      .filter(t => !playerName.toLowerCase().includes(t))
      .map(t => t.charAt(0).toUpperCase() + t.slice(1))
      .join(' ');
    label = remaining ? `${playerName}: ${remaining}` : playerName;
  } else {
    label = phrase;
  }

  return label.length > 70 ? label.slice(0, 67) + '…' : label;
}

function findStoryBundles(articles, minArticles = 3) {
  if (articles.length < minArticles) return [];

  // Build token index
  const artTokens = articles.map((a, i) => ({ idx: i, tokens: new Set(tokenize(a.title)) }));

  // Find pairs with significant overlap
  const clusters = []; // each cluster = Set of article indices + shared tokens
  const assigned = new Set();

  for (let i = 0; i < artTokens.length; i++) {
    if (assigned.has(i)) continue;
    const cluster = new Set([i]);
    const sharedTokens = new Set(artTokens[i].tokens);

    for (let j = i + 1; j < artTokens.length; j++) {
      if (assigned.has(j)) continue;
      const overlap = [...artTokens[j].tokens].filter(t => sharedTokens.has(t));
      // Need at least 2 meaningful words in common
      if (overlap.length >= 2) {
        cluster.add(j);
        // Narrow shared tokens to the intersection
        for (const t of sharedTokens) {
          if (!artTokens[j].tokens.has(t)) sharedTokens.delete(t);
        }
      }
    }

    if (cluster.size >= minArticles) {
      // Also check articles against the refined shared tokens
      const refined = new Set();
      for (const idx of cluster) refined.add(idx);
      for (let j = 0; j < artTokens.length; j++) {
        if (refined.has(j)) continue;
        const overlap = [...artTokens[j].tokens].filter(t => sharedTokens.has(t));
        if (overlap.length >= 2) refined.add(j);
      }

      const clusterArticles = [...refined].map(idx => articles[idx]);
      // Build a generalized topic label from the shared tokens
      const label = buildTopicLabel([...sharedTokens], clusterArticles);

      clusters.push({
        label,
        tokens: [...sharedTokens],
        articles: clusterArticles,
        sourceCount: new Set(clusterArticles.map(a => a.source.id)).size,
      });
      for (const idx of refined) assigned.add(idx);
    }
  }

  // Sort bundles by number of sources covering it (most coverage first)
  clusters.sort((a, b) => b.sourceCount - a.sourceCount || b.articles.length - a.articles.length);
  return clusters;
}

function renderBundle(bundle, allArticles) {
  const thumb = bundle.articles.map(a => extractThumbnail(a)).find(Boolean);
  const thumbHtml = thumb
    ? `<img class="bundle-thumb" src="${esc(thumb)}" alt="" loading="lazy">`
    : `<div class="bundle-thumb-placeholder"><img class="placeholder-logo" src="${PLACEHOLDER_IMG}" alt=""></div>`;

  const sourceIcons = [...new Set(bundle.articles.map(a => a.source.name))].slice(0, 5)
    .map(name => {
      const a = bundle.articles.find(x => x.source.name === name);
      return `<img class="source-ico" src="${esc(faviconUrl(a.link))}" alt="" title="${esc(name)}" onerror="this.style.display='none'">`;
    }).join('');

  const cards = bundle.articles
    .map(a => {
      const idx = allArticles.indexOf(a);
      return renderCard(a, idx);
    }).join('');

  return `<div class="ath-bundle">
    <div class="bundle-header" role="button" tabindex="0">
      ${thumbHtml}
      <div class="bundle-info">
        <span class="bundle-tag">🔥 Around the Horn</span>
        <div class="bundle-title">${esc(bundle.label)}</div>
        <div class="bundle-meta">
          <span class="bundle-sources">${sourceIcons} <span class="bundle-count">${bundle.sourceCount} source${bundle.sourceCount !== 1 ? 's' : ''} · ${bundle.articles.length} articles</span></span>
        </div>
      </div>
      <svg class="bundle-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
    </div>
    <div class="bundle-articles hidden">
      <div class="article-grid list-layout">${cards}</div>
    </div>
  </div>`;
}

function groupArticles(arts, keyFn) {
  const groups = new Map();
  arts.forEach((a, i) => {
    const key = keyFn(a);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ article: a, idx: i });
  });
  return groups;
}

function renderArticles() {
  const list = $('articleList');
  const arts = getFilteredArticles();

  const countText = `${arts.length} article${arts.length !== 1 ? 's' : ''}`;
  $('resultCount').innerHTML = state.searchQuery
    ? countText
    : `${countText} <span class="date-hint">· Last ${state.dateRange} days</span>`;

  if (!arts.length) {
    list.innerHTML = '<div class="feed-msg">No articles match your filters.</div>';
    return;
  }

  const gridClass = state.viewMode === 'list' || state.viewMode === 'compact'
    ? 'article-grid list-layout' : 'article-grid';

  let html = '';

  // Hot Stove bundles (only in default date sort, no search)
  const bundles = (!state.searchQuery && state.sortBy === 'date')
    ? findStoryBundles(arts, 3).slice(0, 3) : [];
  const bundledSet = new Set(bundles.flatMap(b => b.articles));
  const unbundled = arts.filter(a => !bundledSet.has(a));

  if (bundles.length) {
    html += bundles.map(b => renderBundle(b, arts)).join('');
  }

  const displayArts = bundles.length ? unbundled : arts;

  const useGroups = state.sortBy === 'dateGroup' || state.sortBy === 'source';

  if (useGroups) {
    const keyFn = state.sortBy === 'dateGroup'
      ? a => articleDateGroup(a.pubDate)
      : a => a.source.name;

    const groups = groupArticles(displayArts, keyFn);

    for (const [label, items] of groups) {
      html += `<div class="article-group-header">${esc(label)}<span class="group-count">${items.length}</span></div>`;
      html += `<div class="${gridClass}">`;
      html += items.map(({ article, idx }) => renderCard(article, idx)).join('');
      html += `</div>`;
    }
  } else {
    html += `<div class="${gridClass}">`;
    html += displayArts.map((a, i) => renderCard(a, arts.indexOf(a))).join('');
    html += `</div>`;
  }

  list.innerHTML = html;

  // Bundle expand/collapse
  list.querySelectorAll('.bundle-header').forEach(header => {
    header.addEventListener('click', () => {
      const bundle = header.closest('.ath-bundle');
      const articles = bundle.querySelector('.bundle-articles');
      const chevron = header.querySelector('.bundle-chevron');
      articles.classList.toggle('hidden');
      chevron.classList.toggle('expanded');
    });
  });

  list.querySelectorAll('.article-card').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.tagName === 'A') return;
      const idx = Number(el.dataset.idx);
      openReader(arts[idx]);
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') el.click();
    });

    // Swipe left to mark read, right to unmark
    let touchStartX = 0;
    el.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const idx = Number(el.dataset.idx);
      const a = arts[idx];
      if (!a) return;
      if (dx < -60) {
        // Swipe left → mark read
        markRead(a.link);
        el.classList.add('read');
        el.style.transition = 'opacity 0.3s, transform 0.3s';
        el.style.transform = 'translateX(-30px)';
        setTimeout(() => { el.style.transform = ''; }, 300);
        // Auto-hide after 5 seconds
        setTimeout(() => {
          el.style.opacity = '0';
          el.style.maxHeight = '0';
          el.style.overflow = 'hidden';
          el.style.margin = '0';
          el.style.padding = '0';
          el.style.border = 'none';
          el.style.transition = 'all 0.4s ease-out';
        }, 5000);
      } else if (dx > 60) {
        // Swipe right → unmark read
        unmarkRead(a.link);
        el.classList.remove('read');
        el.style.transition = 'transform 0.3s';
        el.style.transform = 'translateX(30px)';
        setTimeout(() => { el.style.transform = ''; }, 300);
      }
    }, { passive: true });

    // Auto-hide already-read articles after 5 seconds
    if (el.classList.contains('read')) {
      setTimeout(() => {
        if (!el.matches(':hover')) {
          el.style.opacity = '0';
          el.style.maxHeight = '0';
          el.style.overflow = 'hidden';
          el.style.margin = '0';
          el.style.padding = '0';
          el.style.border = 'none';
          el.style.transition = 'all 0.4s ease-out';
        }
      }, 5000);
    }
  });
}

// ── Reader View ───────────────────────────────────────────────────
function openReader(article) {
  markRead(article.link);
  // Update the card visually
  document.querySelectorAll('.article-card').forEach(el => {
    const idx = Number(el.dataset.idx);
    const a = getFilteredArticles()[idx];
    if (a && a.link === article.link) el.classList.add('read');
  });

  $('readerTitle').textContent = article.title;
  $('readerDate').textContent = relativeDate(article.pubDate);

  const readerLink = $('readerLink');
  readerLink.href = article.link;
  const favicon = faviconUrl(article.link);
  readerLink.innerHTML = favicon
    ? `<img class="source-favicon" src="${esc(favicon)}" alt="" width="16" height="16" onerror="this.style.display='none'"> Open original ↗`
    : 'Open original ↗';

  const badge = $('readerBadge');
  badge.textContent = article.source.name;
  badge.style.background = article.source.color;

  const frame = $('readerFrame');
  const fallback = $('readerFallback');

  // Use full RSS content if substantial, otherwise show excerpt + link
  const content = article.content || '';
  if (content.length > 400) {
    const clean = sanitizeHtml(content);
    frame.srcdoc = buildReaderDoc(article, clean);
    frame.classList.remove('hidden');
    fallback.classList.add('hidden');
  } else {
    frame.classList.add('hidden');
    fallback.classList.remove('hidden');
    $('readerExcerpt').textContent = article.description || '';
    $('readerFullLink').href = article.link;
  }

  $('readerOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeReader() {
  $('readerOverlay').classList.add('hidden');
  document.body.style.overflow = '';
  // Clear srcdoc to stop any loading
  $('readerFrame').srcdoc = '';
}

// ── On Deck (next Orioles game) ──────────────────────────────────
async function loadOnDeck() {
  const wrap = $('onDeckWrap');
  try {
    const today = localDateStr(0);
    const endDate = localDateStr(14);
    const data = await fetch(
      `${MLB}/schedule?sportId=1&teamId=${ORIOLES_ID}&startDate=${today}&endDate=${endDate}&hydrate=probablePitcher,venue`
    ).then(r => r.json());

    const games = (data.dates ?? []).flatMap(d => d.games);
    // Find next game that hasn't finished
    const next = games.find(g => g.status.abstractGameState !== 'Final');
    if (!next) {
      wrap.innerHTML = '<span class="sidebar-msg">No upcoming games</span>';
      return;
    }

    const away = next.teams.away;
    const home = next.teams.home;
    const isHome = home.team.id === ORIOLES_ID;
    const opponent = isHome ? away : home;
    const oppAbbr = TEAM_ABBREV[opponent.team.id] ?? opponent.team.name.slice(0, 3);

    const gameDate = new Date(next.gameDate);
    const dateStr = gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const venue = next.venue?.name ?? '';

    // Fetch weather for the game venue
    await fetchWeatherForGames([next]);
    const wx = getGameWeather(next);
    const wxHtml = wx
      ? `<div class="on-deck-weather"><span>${wx.emoji} ${wx.temp}°F</span><span class="on-deck-wx-desc">${esc(wx.condition)}</span></div>`
      : '';

    const awaySlug = TEAM_SLUG[away.team.id] ?? '';
    const homeSlug = TEAM_SLUG[home.team.id] ?? '';
    const gdDate = next.gameDate.slice(0, 10).replace(/-/g, '/');
    const gdUrl = `https://www.mlb.com/gameday/${awaySlug}-vs-${homeSlug}/${gdDate}/${next.gamePk}/preview`;

    // Build upcoming game boxes (skip the "next" game)
    const upcoming = games.filter(g => g.gamePk !== next.gamePk && g.status.abstractGameState !== 'Final');
    const scheduleBoxes = upcoming.slice(0, 5).map(g => {
      const gAway = g.teams.away;
      const gHome = g.teams.home;
      const gIsHome = gHome.team.id === ORIOLES_ID;
      const gOpp = gIsHome ? gAway : gHome;
      const gOppAbbr = TEAM_ABBREV[gOpp.team.id] ?? gOpp.team.name.slice(0, 3);
      const gDate = new Date(g.gameDate);
      const gDay = gDate.toLocaleDateString('en-US', { weekday: 'short' });
      const gAwaySlug = TEAM_SLUG[gAway.team.id] ?? '';
      const gHomeSlug = TEAM_SLUG[gHome.team.id] ?? '';
      const gGdDate = g.gameDate.slice(0, 10).replace(/-/g, '/');
      const gUrl = `https://www.mlb.com/gameday/${gAwaySlug}-vs-${gHomeSlug}/${gGdDate}/${g.gamePk}/preview`;
      return `<a class="sched-box" href="${gUrl}" target="_blank" rel="noopener">
        <span class="sched-box-day">${esc(gDay)}</span>
        <img class="sched-box-logo" src="https://www.mlbstatic.com/team-logos/${gOpp.team.id}.svg" alt="${esc(gOppAbbr)}" width="22" height="22">
        ${gIsHome ? '' : '<span class="sched-box-at">@</span>'}
      </a>`;
    }).join('');

    const scheduleHtml = scheduleBoxes
      ? `<div class="sched-row-wrap">${scheduleBoxes}</div>`
      : '';

    // Show lineup on hover if game is today
    const isToday = next.gameDate.slice(0, 10) === today;

    wrap.innerHTML = `
      <div class="on-deck-card-wrap">
        <a class="on-deck-card" href="${gdUrl}" target="_blank" rel="noopener">
          <div class="on-deck-matchup">
            <span class="on-deck-vs">${isHome ? 'vs' : '@'} ${esc(oppAbbr)}</span>
            <img class="on-deck-logo" src="https://www.mlbstatic.com/team-logos/${opponent.team.id}.svg" alt="" width="28" height="28">
            ${wxHtml}
          </div>
          <div class="on-deck-details">
            <span class="on-deck-date">${esc(dateStr)} · ${esc(timeStr)}</span>
            <span class="on-deck-venue">${esc(venue)}</span>
          </div>
        </a>
        ${isToday ? '<div class="lineup-popover hidden" id="lineupPopover"><span class="sidebar-msg">Loading lineup…</span></div>' : ''}
      </div>
      ${scheduleHtml}`;

    // Fetch and show lineup on hover for today's game
    if (isToday) {
      const cardWrap = wrap.querySelector('.on-deck-card-wrap');
      const popover = wrap.querySelector('#lineupPopover');
      let lineupLoaded = false;
      cardWrap.addEventListener('mouseenter', async () => {
        popover.classList.remove('hidden');
        if (lineupLoaded) return;
        lineupLoaded = true;
        try {
          const box = await fetch(`${MLB}/game/${next.gamePk}/boxscore`).then(r => r.json());
          const renderSide = (side, label) => {
            const players = box.teams?.[side]?.battingOrder ?? [];
            const roster = box.teams?.[side]?.players ?? {};
            if (!players.length) return '';
            const rows = players.map(id => {
              const p = roster[`ID${id}`] ?? {};
              const name = p.person?.fullName ?? 'TBD';
              const pos = p.position?.abbreviation ?? '';
              return `<div class="lineup-row"><span class="lineup-pos">${esc(pos)}</span><span class="lineup-name">${esc(name)}</span></div>`;
            }).join('');
            return `<div class="lineup-side"><div class="lineup-label">${esc(label)}</div>${rows}</div>`;
          };
          const awayLabel = TEAM_ABBREV[away.team.id] ?? 'Away';
          const homeLabel = TEAM_ABBREV[home.team.id] ?? 'Home';
          const html = renderSide('away', awayLabel) + renderSide('home', homeLabel);
          popover.innerHTML = html || '<span class="sidebar-msg">Lineups not yet available</span>';
        } catch {
          popover.innerHTML = '<span class="sidebar-msg">Lineups unavailable</span>';
        }
      });
      cardWrap.addEventListener('mouseleave', () => {
        popover.classList.add('hidden');
      });
    }
  } catch {
    wrap.innerHTML = '<span class="sidebar-msg">Unavailable</span>';
  }
}

// ── Roster ───────────────────────────────────────────────────────
async function loadRoster() {
  const wrap = $('rosterWrap');
  try {
    const data = await fetch(
      `${MLB}/teams/${ORIOLES_ID}/roster?rosterType=active`
    ).then(r => r.json());

    const players = (data.roster ?? []).sort((a, b) => {
      const posOrder = { P: 3, C: 0, '1B': 0, '2B': 0, '3B': 0, SS: 0, LF: 1, CF: 1, RF: 1, OF: 1, DH: 1 };
      const aGroup = posOrder[a.position?.abbreviation] ?? 2;
      const bGroup = posOrder[b.position?.abbreviation] ?? 2;
      return aGroup - bGroup || a.person.fullName.localeCompare(b.person.fullName);
    });

    if (!players.length) {
      wrap.innerHTML = '<span class="sidebar-msg">Roster unavailable</span>';
      return;
    }

    const groups = { 'Position Players': [], 'Outfielders': [], 'Pitchers': [] };
    for (const p of players) {
      const pos = p.position?.abbreviation ?? '';
      if (['SP', 'RP', 'P'].includes(pos)) groups['Pitchers'].push(p);
      else if (['LF', 'CF', 'RF', 'OF', 'DH'].includes(pos)) groups['Outfielders'].push(p);
      else groups['Position Players'].push(p);
    }

    let html = '';
    for (const [label, list] of Object.entries(groups)) {
      if (!list.length) continue;
      html += `<div class="roster-group-label">${esc(label)}</div>`;
      html += list.map(p => {
        const url = savantUrl(p.person.id);
        return `<div class="roster-item">
          <span class="roster-num">${esc(p.jerseyNumber ?? '')}</span>
          <a class="roster-name" href="${url}" target="_blank" rel="noopener">${esc(p.person.fullName)}</a>
          <span class="roster-pos">${esc(p.position?.abbreviation ?? '')}</span>
        </div>`;
      }).join('');
    }

    wrap.innerHTML = `<div class="roster-list">${html}</div>
      <a class="widget-link" href="https://www.mlb.com/orioles/roster" target="_blank" rel="noopener">Full roster ↗</a>`;
  } catch {
    wrap.innerHTML = '<span class="sidebar-msg">Unavailable</span>';
  }
}

// ── Transactions ─────────────────────────────────────────────────
async function loadTransactions() {
  const wrap = $('transactionsWrap');
  try {
    const end = localDateStr(0);
    const startD = new Date();
    startD.setDate(startD.getDate() - 14);
    const start = startD.toISOString().slice(0, 10);

    const data = await fetch(
      `${MLB}/transactions?teamId=${ORIOLES_ID}&startDate=${start}&endDate=${end}`
    ).then(r => r.json());

    // Sort newest first and take top 12
    const txns = (data.transactions ?? [])
      .sort((a, b) => new Date(b.date || b.effectiveDate) - new Date(a.date || a.effectiveDate))
      .slice(0, 12);
    if (!txns.length) {
      wrap.innerHTML = '<span class="sidebar-msg">No recent transactions</span>';
      return;
    }

    const txnHtml = txns.map(t => {
      const date = new Date(t.date || t.effectiveDate);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const pid = t.person?.id;
      const playerLink = pid ? `https://www.mlb.com/player/${pid}` : '';
      const playerName = t.person?.fullName ?? 'Unknown';
      const desc = t.description || `${playerName} - ${t.typeDesc ?? t.typeCode}`;
      const descHtml = playerLink
        ? desc.replace(playerName, `<a class="txn-player" href="${playerLink}" target="_blank" rel="noopener">${esc(playerName)}</a>`)
        : esc(desc);
      return `<div class="txn-item">
        <span class="txn-date">${esc(dateStr)}</span>
        <span class="txn-desc">${descHtml}</span>
      </div>`;
    }).join('');

    wrap.innerHTML = `<div class="txn-list">${txnHtml}</div>
      <a class="widget-link" href="https://www.mlb.com/orioles/roster/transactions" target="_blank" rel="noopener">View all transactions ↗</a>`;
  } catch {
    wrap.innerHTML = '<span class="sidebar-msg">Unavailable</span>';
  }
}

// ── Injury Report ────────────────────────────────────────────────
async function loadInjuryReport() {
  const wrap = $('ilWrap');
  try {
    const data = await fetch(
      `${MLB}/teams/${ORIOLES_ID}/roster?rosterType=40Man`
    ).then(r => r.json());

    const injured = (data.roster ?? []).filter(p =>
      p.status?.description?.toLowerCase().includes('injured')
    );

    if (!injured.length) {
      wrap.innerHTML = '<span class="sidebar-msg">No players on IL</span>';
      return;
    }

    // Sort by IL type ascending (10-day first, then 15-day, then 60-day)
    const ilOrder = { '10': 0, '15': 1, '60': 2 };
    const getILDays = p => {
      const m = p.status.description.match(/(\d+)-day/i);
      return m ? m[1] : '99';
    };
    injured.sort((a, b) => (ilOrder[getILDays(a)] ?? 3) - (ilOrder[getILDays(b)] ?? 3));

    // Group by IL type
    const groups = {};
    injured.forEach(p => {
      const days = getILDays(p);
      const label = days !== '99' ? `${days}-Day IL` : 'IL';
      if (!groups[label]) groups[label] = [];
      groups[label].push(p);
    });

    wrap.innerHTML = `<div class="il-list">${Object.entries(groups).map(([label, players]) =>
      `<div class="il-group">
        <div class="il-group-label">${esc(label)}</div>
        ${players.map(p => {
          const playerUrl = `https://www.mlb.com/player/${p.person.id}`;
          return `<div class="il-item">
            <a class="il-name" href="${playerUrl}" target="_blank" rel="noopener">${esc(p.person.fullName)}</a>
            <span class="il-pos">${esc(p.position?.abbreviation ?? '')}</span>
          </div>`;
        }).join('')}
      </div>`
    ).join('')}</div>`;
  } catch {
    wrap.innerHTML = '<span class="sidebar-msg">Unavailable</span>';
  }
}

// ── Video Widget ─────────────────────────────────────────────────
const YT_PLAYLISTS = [
  { id: 'PLL-lmlkrmJakABrOT6FmV0mU-5oIF8nGu', label: 'MLB Fastcast' },
  { id: 'PLL-lmlkrmJalPg-EgiZ92Eyg9YodLbQsE', label: 'MLB Top Plays' },
  { id: 'PLCvqKltYUg-L4bKc-F_y-2idxHrARegPY', label: 'Jomboy Breakdowns' },
];

async function loadVideos() {
  const wrap = $('videoWrap');
  try {
    const results = await Promise.allSettled(
      YT_PLAYLISTS.map(async pl => {
        const url = `${PROXY}?url=${encodeURIComponent(`https://www.youtube.com/feeds/videos.xml?playlist_id=${pl.id}`)}`;
        const data = await fetch(url).then(r => r.json());
        const item = (data.items ?? [])[0];
        if (!item) return null;
        const link = item.link || '';
        const videoId = link.match(/v=([^&]+)/)?.[1] || link.match(/youtu\.be\/([^?&]+)/)?.[1] || '';
        return {
          title: item.title ?? '',
          label: pl.label,
          thumb: item.thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : ''),
          url: link,
          videoId,
        };
      })
    );

    const videos = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);

    if (!videos.length) {
      wrap.innerHTML = '<span class="sidebar-msg">No videos available</span>';
      return;
    }

    wrap.innerHTML = `<div class="video-list">${videos.map(v => {
      return `<div class="video-item" data-video-id="${esc(v.videoId)}" data-video-url="${esc(v.url)}">
        <div class="video-thumb-wrap">
          <img class="video-thumb" src="${esc(v.thumb)}" alt="" loading="lazy">
          <svg class="video-play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <div class="video-info">
          <span class="video-channel">${esc(v.label)}</span>
          <span class="video-title">${esc(v.title)}</span>
        </div>
      </div>`;
    }).join('')}</div>`;

    wrap.querySelectorAll('.video-item').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        const id = el.dataset.videoId;
        if (id) openVideoTheater(id);
        else window.open(el.dataset.videoUrl, '_blank');
      });
    });
  } catch {
    wrap.innerHTML = '<span class="sidebar-msg">Unavailable</span>';
  }
}

// ── Video Theater Overlay ────────────────────────────────────────
function openVideoTheater(videoId) {
  let overlay = document.getElementById('videoTheater');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'videoTheater';
    overlay.className = 'video-theater';
    overlay.innerHTML = `
      <div class="video-theater-backdrop"></div>
      <div class="video-theater-content">
        <button class="video-theater-close" aria-label="Close">&times;</button>
        <div class="video-theater-player"></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.video-theater-backdrop').addEventListener('click', closeVideoTheater);
    overlay.querySelector('.video-theater-close').addEventListener('click', closeVideoTheater);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeVideoTheater(); });
  }
  const player = overlay.querySelector('.video-theater-player');
  player.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0"
    frameborder="0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeVideoTheater() {
  const overlay = document.getElementById('videoTheater');
  if (!overlay) return;
  overlay.classList.remove('active');
  overlay.querySelector('.video-theater-player').innerHTML = '';
  document.body.style.overflow = '';
}

// ── Yard Leaders ─────────────────────────────────────────────────
let leadersData = { batting: [], pitching: [] };
let leadersMode = 'batting';

function savantUrl(playerId) {
  return `https://baseballsavant.mlb.com/savant-player/${playerId}`;
}

async function loadLeaders() {
  const wrap = $('leadersWrap');
  try {
    const data = await fetch(
      `${MLB}/teams/${ORIOLES_ID}/leaders?leaderCategories=battingAverage,onBasePercentage,onBasePlusSlugging,homeRuns,hits,baseOnBalls,sluggingPercentage,runsBattedIn,earnedRunAverage,strikeouts,gamesStarted,walksAndHitsPerInningPitched,wins,strikeoutsPer9Inn,walksPer9Inn,qualityStarts&season=${SEASON}&leaderGameTypes=R`
    ).then(r => r.json());

    const categories = data.teamLeaders ?? [];
    if (!categories.length) {
      wrap.innerHTML = '<span class="sidebar-msg">No stats available yet</span>';
      return;
    }

    const battingLabels = { battingAverage: 'AVG', onBasePercentage: 'OBP', onBasePlusSlugging: 'OPS', homeRuns: 'HR', hits: 'H', baseOnBalls: 'BB', sluggingPercentage: 'SLG', runsBattedIn: 'RBI' };
    const pitchingLabels = { earnedRunAverage: 'ERA', strikeouts: 'K', gamesStarted: 'GS', qualityStarts: 'QS', walksAndHitsPerInningPitched: 'WHIP', wins: 'W', strikeoutsPer9Inn: 'K/9', walksPer9Inn: 'BB/9' };

    leadersData.batting = categories
      .filter(c => battingLabels[c.leaderCategory] && c.statGroup === 'hitting')
      .map(c => ({ label: battingLabels[c.leaderCategory], leaders: c.leaders }));
    leadersData.pitching = categories
      .filter(c => pitchingLabels[c.leaderCategory] && c.statGroup === 'pitching')
      .map(c => ({ label: pitchingLabels[c.leaderCategory], leaders: c.leaders }));

    renderLeaders();
  } catch {
    wrap.innerHTML = '<span class="sidebar-msg">Unavailable</span>';
  }
}

function renderLeaders() {
  const wrap = $('leadersWrap');
  const cats = leadersMode === 'batting' ? leadersData.batting : leadersData.pitching;

  wrap.innerHTML = `
    <div class="leaders-toggle">
      <button class="leaders-tab${leadersMode === 'batting' ? ' active' : ''}" data-lmode="batting">Batting</button>
      <button class="leaders-tab${leadersMode === 'pitching' ? ' active' : ''}" data-lmode="pitching">Pitching</button>
    </div>
    <div class="leaders-list">${cats.map(cat => {
      const top = cat.leaders?.[0];
      if (!top) return '';
      const name = top.person?.fullName?.split(' ').pop() ?? '';
      const pid = top.person?.id;
      const link = pid ? savantUrl(pid) : '#';
      return `<div class="leader-item">
        <span class="leader-cat">${esc(cat.label)}</span>
        <a class="leader-name" href="${link}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${esc(name)}</a>
        <span class="leader-val">${esc(top.value)}</span>
      </div>`;
    }).join('')}</div>`;

  wrap.querySelectorAll('.leaders-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      leadersMode = btn.dataset.lmode;
      renderLeaders();
    });
  });
}

// ── Refresh ───────────────────────────────────────────────────────
async function refresh() {
  const btn = $('refreshBtn');
  btn.disabled = true;
  btn.classList.add('spinning');
  await Promise.allSettled([loadFeeds(), loadScores(), loadStandings(), loadOnDeck(), loadRoster(), loadTransactions(), loadInjuryReport(), loadLeaders()]);
  btn.disabled = false;
  btn.classList.remove('spinning');
  const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  $('cacheLabel').textContent = `Updated ${now}`;
}

// ── Init ──────────────────────────────────────────────────────────
function setupEvents() {
  // Refresh
  $('refreshBtn').addEventListener('click', refresh);

  // Search
  let searchTimer;
  $('searchInput').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.searchQuery = e.target.value.trim();
      renderArticles();
    }, 220);
  });

  // Sort
  $('sortSelect').addEventListener('change', e => {
    state.sortBy = e.target.value;
    renderArticles();
  });

  // Date range filter
  $('dateRangeSelect').addEventListener('change', e => {
    state.dateRange = Number(e.target.value);
    renderArticles();
  });

  // Set initial active view button
  $('viewToggle').querySelectorAll('.view-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.view === state.viewMode));

  // View toggle
  $('viewToggle').addEventListener('click', e => {
    const btn = e.target.closest('[data-view]');
    if (!btn) return;
    state.viewMode = btn.dataset.view;
    $('viewToggle').querySelectorAll('.view-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.view === state.viewMode));
    renderArticles();
  });

  // Category filters
  $('categoryFilters').addEventListener('click', e => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    state.activeCategory = pill.dataset.category;
    $('categoryFilters').querySelectorAll('.pill').forEach(p =>
      p.classList.toggle('active', p.dataset.category === state.activeCategory));
    renderArticles();
  });

  // Settings
  $('settingsBtn').addEventListener('click', () => {
    $('settingsOverlay').classList.toggle('hidden');
    // Set active states
    const p = loadPrefs();
    $('themeToggle').querySelectorAll('.theme-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.theme === (p.theme || 'dark')));
    $('defaultViewToggle').querySelectorAll('.theme-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.defview === (p.defaultView || 'list')));
  });
  $('settingsClose').addEventListener('click', () => $('settingsOverlay').classList.add('hidden'));
  $('settingsOverlay').addEventListener('click', e => {
    if (e.target === $('settingsOverlay')) $('settingsOverlay').classList.add('hidden');
  });
  $('themeToggle').addEventListener('click', e => {
    const btn = e.target.closest('[data-theme]');
    if (!btn) return;
    applyTheme(btn.dataset.theme);
    $('themeToggle').querySelectorAll('.theme-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.theme === btn.dataset.theme));
  });
  $('defaultViewToggle').addEventListener('click', e => {
    const btn = e.target.closest('[data-defview]');
    if (!btn) return;
    savePrefs({ defaultView: btn.dataset.defview });
    state.viewMode = btn.dataset.defview;
    $('viewToggle').querySelectorAll('.view-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.view === state.viewMode));
    $('defaultViewToggle').querySelectorAll('.theme-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.defview === btn.dataset.defview));
    renderArticles();
  });
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    const p = loadPrefs();
    if (p.theme === 'system') applyTheme('system');
  });

  // Collapsible sidebar sections
  document.querySelectorAll('.section-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const section = toggle.closest('.sidebar-section');
      section.classList.toggle('collapsed');
    });
  });

  // On mobile, collapse all sidebar sections except search and On Deck
  if (window.innerWidth <= 600) {
    document.querySelectorAll('.sidebar-section').forEach(section => {
      const key = section.dataset.section;
      if (key !== 'ondeck') section.classList.add('collapsed');
    });
  }

  // Source filter popover
  $('sourceFilterBtn').addEventListener('click', () => {
    $('sourcePopover').classList.toggle('hidden');
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.source-filter-wrap')) {
      $('sourcePopover').classList.add('hidden');
    }
  });

  // Reader close
  $('readerClose').addEventListener('click', closeReader);
  $('readerOverlay').addEventListener('click', e => {
    if (e.target === $('readerOverlay')) closeReader();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeReader();
  });

  // Auto-refresh scores and transactions every 5 minutes
  setInterval(() => {
    loadScores();
    loadTransactions();
  }, 5 * 60 * 1000);

  // ── Easter Eggs ──────────────────────────────────────────────────

  // 1. "magic" in search → Orioles Magic confetti (Enter key = trusted gesture for audio)
  $('searchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.value.trim().toLowerCase() === 'magic') {
      e.preventDefault();
      triggerOriolesMagic();
    }
  });

  // 2. Konami Code → Seven Nation Army chant
  const konamiSeq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let konamiIdx = 0;
  document.addEventListener('keydown', e => {
    if (e.key === konamiSeq[konamiIdx] || e.key.toLowerCase() === konamiSeq[konamiIdx]) {
      konamiIdx++;
      if (konamiIdx === konamiSeq.length) {
        konamiIdx = 0;
        triggerSevenNationArmy();
      }
    } else {
      konamiIdx = 0;
    }
  });

  // 3. Secret OPACY theme — triple-click any theme button
  let themeClickCount = 0;
  let themeClickTimer = null;
  $('themeToggle').addEventListener('click', () => {
    themeClickCount++;
    clearTimeout(themeClickTimer);
    themeClickTimer = setTimeout(() => { themeClickCount = 0; }, 500);
    if (themeClickCount >= 3) {
      themeClickCount = 0;
      toggleOpacyTheme();
    }
  });
}

// ── Easter Egg Functions ───────────────────────────────────────────

function triggerOriolesMagic() {
  // Create confetti container
  const container = document.createElement('div');
  container.className = 'magic-confetti';
  const birdNum = Math.floor(Math.random() * 10) + 1;
  container.innerHTML = `<div class="magic-banner"><img src="/yardreport/img/randBird${birdNum}.png" alt="Oriole Bird" class="magic-bird"></div>`;
  document.body.appendChild(container);

  // Play Orioles Magic audio — display lasts for audio duration
  const audio = new Audio('/yardreport/audio/orioles_magic_short.mp3');
  audio.volume = 0.7;
  const removeDisplay = () => {
    container.classList.add('magic-fade-out');
    setTimeout(() => container.remove(), 600);
  };
  audio.addEventListener('ended', removeDisplay);
  audio.play().catch(() => {
    // Audio blocked — fall back to timed display
    setTimeout(removeDisplay, 5000);
  });

  // Spawn confetti pieces
  const colors = ['#df4601', '#000', '#fff', '#f59e0b', '#ff6b1a'];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.animationDelay = Math.random() * 2 + 's';
    piece.style.animationDuration = (2 + Math.random() * 2) + 's';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.width = (4 + Math.random() * 6) + 'px';
    piece.style.height = (4 + Math.random() * 6) + 'px';
    container.appendChild(piece);
  }
}

function triggerSevenNationArmy() {
  // Visual chant animation on the logo
  const logo = document.querySelector('.logo');
  if (!logo) return;
  logo.classList.add('sna-chant');

  // Create the chant overlay
  const overlay = document.createElement('div');
  overlay.className = 'sna-overlay';
  overlay.innerHTML = `
    <div class="sna-text">
      <span>OH</span><span>OH</span><span>OH</span>
      <span>OH</span><span>OH</span>
      <span class="sna-big">OH-OH</span>
    </div>`;
  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.remove();
    logo.classList.remove('sna-chant');
  }, 4000);
}

function toggleOpacyTheme() {
  const html = document.documentElement;
  if (html.getAttribute('data-theme') === 'opacy') {
    applyTheme(loadPrefs().theme || 'dark');
  } else {
    html.setAttribute('data-theme', 'opacy');
  }
}

async function init() {
  setupEvents();

  // Load critical data first
  await Promise.allSettled([
    loadScores(),
    loadStandings(),
    loadFeeds(),
    loadOnDeck(),
  ]);

  const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  $('cacheLabel').textContent = `Updated ${now}`;

  // Load secondary widgets (non-blocking)
  Promise.allSettled([
    loadRoster(),
    loadTransactions(),
    loadInjuryReport(),
    loadLeaders(),
    loadVideos(),
  ]);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
