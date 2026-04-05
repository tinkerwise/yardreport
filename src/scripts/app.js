import {
  DIVISION_NAMES,
  MLB,
  ORIOLES_ID,
  PITCH_NAMES,
  PROXY,
  SEASON,
  TEAM_ABBREV,
  TEAM_PAGE,
  TEAM_SLUG,
  VENUE_COORDS,
} from './config.js';
import {
  getReadArticles,
  loadPrefs,
  markRead,
  savePrefs,
  unmarkRead,
} from './storage.js';

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

let heritageTimer = null;
let heritagePreviousView = null;
const venueCache = {};

// ── Utilities ─────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function setViewMode(view, { render = true } = {}) {
  state.viewMode = view;
  const toggle = $('viewToggle');
  if (toggle) {
    toggle.querySelectorAll('.view-btn').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.view === state.viewMode));
  }
  if (render) renderArticles();
}

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

// Filter out non-baseball articles and gambling content that leak in from general sports feeds
const OFF_TOPIC = /\b(NHL|hockey|NBA|basketball|NFL|football|soccer|MLS|tennis|golf|NASCAR|F1|UFC|MMA|boxing|betting|bet|bets|better|odds|wager|wagers|wagering|sportsbook|sportsbooks|parlay|parlays|prop bet|prop bets|gambling|gamble|picks against the spread|best bets)\b/i;
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

function normalizeText(str) {
  return String(str ?? '').replace(/\s+/g, ' ').trim();
}

async function fetchVenueDetails(venueId) {
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

function decodeHtmlEntities(str) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = str;
  return textarea.value;
}

function cleanFeedText(str) {
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

function getScoreChipStatus(g) {
  const abstractState = g.status?.abstractGameState ?? '';
  const detailedState = g.status?.detailedState ?? '';
  const reason = g.status?.reason ?? '';
  const statusText = `${detailedState} ${reason}`.toLowerCase();
  const isPostponed = /postponed/.test(statusText);
  const isDelayed = /delay|delayed/.test(statusText);
  const isWeatherRelated = /rain|weather/.test(statusText);

  if (isPostponed) {
    return {
      stateClass: 'postponed',
      statusInner: 'Postponed',
      isPreviewLike: true,
      isFinal: false,
    };
  }

  if (isDelayed) {
    return {
      stateClass: 'delay',
      statusInner: isWeatherRelated ? '<span class="delay-emoji" aria-hidden="true">🌧️</span> Rain Delay' : detailedState || 'Delayed',
      isPreviewLike: abstractState === 'Preview',
      isFinal: false,
    };
  }

  if (abstractState === 'Live') {
    const half = g.linescore?.inningHalf === 'Top' ? '▲' : '▼';
    const inn = g.linescore?.currentInning ?? '';
    const outs = Math.min(g.linescore?.outs ?? 0, 2);
    const offense = g.linescore?.offense ?? {};
    const b1 = offense.first ? ' on' : '';
    const b2 = offense.second ? ' on' : '';
    const b3 = offense.third ? ' on' : '';
    const bases = `<span class="bases-diamond"><span class="base b2${b2}"></span><span class="base b3${b3}"></span><span class="base b1${b1}"></span></span>`;
    const outsHtml = `<span class="outs-indicator" aria-label="${outs} out${outs === 1 ? '' : 's'}"><span class="out-dot${outs >= 1 ? ' on' : ''}"></span><span class="out-dot${outs >= 2 ? ' on' : ''}"></span></span>`;
    return {
      stateClass: 'live',
      statusInner: `${half}${inn} ${outsHtml} ${bases}`,
      isPreviewLike: false,
      isFinal: false,
    };
  }

  if (abstractState === 'Final') {
    return {
      stateClass: 'final',
      statusInner: 'Final',
      isPreviewLike: false,
      isFinal: true,
    };
  }

  return {
    stateClass: 'preview',
    statusInner: formatGameTime(g.gameDate),
    isPreviewLike: true,
    isFinal: false,
  };
}

function renderGameChip(g) {
  const away = g.teams.away;
  const home = g.teams.home;
  const hasOrioles = away.team.id === ORIOLES_ID || home.team.id === ORIOLES_ID;
  const { stateClass, statusInner, isPreviewLike, isFinal } = getScoreChipStatus(g);

  const awayScore = (!isPreviewLike && away.score != null) ? away.score : '';
  const homeScore = (!isPreviewLike && home.score != null) ? home.score : '';
  const awayWin = isFinal && Number(awayScore) > Number(homeScore);
  const homeWin = isFinal && Number(homeScore) > Number(awayScore);

  const awaySlug = TEAM_SLUG[away.team.id] ?? away.team.name.split(' ').pop().toLowerCase();
  const homeSlug = TEAM_SLUG[home.team.id] ?? home.team.name.split(' ').pop().toLowerCase();
  const gameDate = g.gameDate.slice(0, 10).replace(/-/g, '/');
  const gamedaySuffix = isPreviewLike ? 'preview' : 'final';
  const gamedayUrl = `https://www.mlb.com/gameday/${awaySlug}-vs-${homeSlug}/${gameDate}/${g.gamePk}/${gamedaySuffix}`;

  const wx = getGameWeather(g);
  const wxInline = (stateClass === 'preview' && wx) ? ` ${wx.emoji}${wx.temp}°` : '';

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

// Cache for pitcher pitch arsenal API responses (keyed by playerId)
const arsenalCache = {};

async function fetchArsenal(playerId) {
  if (!playerId) return null;
  if (arsenalCache[playerId]) return arsenalCache[playerId];
  try {
    const data = await fetch(
      `${MLB}/people/${playerId}/stats?stats=pitchArsenal&season=${SEASON}&group=pitching`
    ).then(r => r.json());
    arsenalCache[playerId] = data;
    return data;
  } catch { return null; }
}

// Cache for team season batting stats (keyed by teamId)
const teamStatsCache = {};
async function fetchTeamStats(teamId) {
  if (!teamId) return null;
  if (teamStatsCache[teamId]) return teamStatsCache[teamId];
  try {
    const data = await fetch(
      `${MLB}/teams/${teamId}/stats?stats=season&season=${SEASON}&group=hitting`
    ).then(r => r.json());
    const result = data.stats?.[0]?.splits?.[0]?.stat ?? null;
    teamStatsCache[teamId] = result;
    return result;
  } catch { return null; }
}

// Cache for pitcher career stats vs a specific opponent (keyed by "pitcherId_vs_teamId")
const pitcherVsCache = {};
async function fetchPitcherVsTeam(pitcherId, oppTeamId) {
  if (!pitcherId || !oppTeamId) return null;
  const key = `${pitcherId}_vs_${oppTeamId}`;
  if (pitcherVsCache[key] !== undefined) return pitcherVsCache[key];
  try {
    const data = await fetch(
      `${MLB}/people/${pitcherId}/stats?stats=vsTeamTotal&group=pitching&opposingTeamId=${oppTeamId}`
    ).then(r => r.json());
    const result = data.stats?.[0]?.splits?.[0]?.stat ?? null;
    pitcherVsCache[key] = result;
    return result;
  } catch { return null; }
}

function topPerformers(boxData) {
  if (!boxData) return '';
  const sides = ['away', 'home'];
  const allBatters = [];

  for (const side of sides) {
    const team = boxData.teams?.[side];
    if (!team) continue;
    const teamId = team.team?.id;
    const abbr = TEAM_ABBREV[teamId] ?? team.team?.abbreviation ?? '';
    const players = team.players ?? {};
    for (const [, p] of Object.entries(players)) {
      const bs = p.stats?.batting;
      if (bs && (bs.atBats > 0 || bs.baseOnBalls > 0)) {
        const hits = bs.hits ?? 0;
        const ab = bs.atBats ?? 0;
        const hr = bs.homeRuns ?? 0;
        const rbi = bs.rbi ?? 0;
        const bb = bs.baseOnBalls ?? 0;
        // Score: weight HRs and multi-hit games
        const score = hits * 2 + hr * 5 + rbi * 2 + bb;
        const batSide = p.person?.batSide?.code ?? '';
        allBatters.push({ name: p.person?.fullName ?? '', abbr, teamId, hits, ab, hr, rbi, bb, score, batSide });
      }
    }
  }

  // Top 3 hitters by score
  allBatters.sort((a, b) => b.score - a.score);
  const topHit = allBatters.slice(0, 3);

  let html = '';
  if (topHit.length) {
    html += '<div class="box-section box-performers"><span class="box-perf-label">Key Hitters</span>';
    html += topHit.map(b => {
      const extras = [];
      if (b.hits > 0 && b.ab > 0) extras.push(`${b.hits}-${b.ab}`);
      else if (b.ab > 0) extras.push(`${b.ab} AB`);
      if (b.hr) extras.push(`${b.hr} HR`);
      if (b.rbi) extras.push(`${b.rbi} RBI`);
      if (b.bb) extras.push(`${b.bb} BB`);
        const statLine = extras.join(', ') || 'No notable line';
      const logoHtml = b.teamId ? `<img class="box-perf-logo" src="https://www.mlbstatic.com/team-logos/${b.teamId}.svg" alt="${esc(b.abbr)}" width="18" height="18">` : '';
      const batSideDisplay = b.batSide ? `<span class="box-perf-hand">${b.batSide}</span>` : '';
      return `<span class="box-perf-row">${logoHtml}<span class="box-perf-name">${esc(compactBoxName(b.name))}${batSideDisplay}</span> <span class="box-perf-stat">${statLine}</span></span>`;
    }).join('');
    html += '</div>';
  }
  return html;
}

function formatSlashStat(value) {
  if (value == null || value === '') return '.---';
  const str = String(value).trim();
  if (!str) return '.---';
  return str.startsWith('.') ? str : `.${str.replace(/^0?\./, '')}`;
}

function getLineupBattingStats(player) {
  return player?.seasonStats?.batting ?? player?.stats?.batting ?? {};
}

function getBattingRate(stats, ...keys) {
  for (const key of keys) {
    const value = stats?.[key];
    if (value != null && value !== '') return value;
  }
  return null;
}

function lineupRateValues(player) {
  const stats = getLineupBattingStats(player);
  return {
    avg: getBattingRate(stats, 'battingAverage', 'avg'),
    obp: getBattingRate(stats, 'onBasePercentage', 'obp'),
    ops: getBattingRate(stats, 'ops', 'onBasePlusSlugging'),
  };
}

function lineupLeaders(players, roster) {
  const leaders = { avg: 0, obp: 0, ops: 0 };

  for (const id of players) {
    const rates = lineupRateValues(roster[`ID${id}`] ?? {});
    leaders.avg = Math.max(leaders.avg, Number.parseFloat(rates.avg ?? 0) || 0);
    leaders.obp = Math.max(leaders.obp, Number.parseFloat(rates.obp ?? 0) || 0);
    leaders.ops = Math.max(leaders.ops, Number.parseFloat(rates.ops ?? 0) || 0);
  }

  return leaders;
}

function renderSlashSegment(value, isLeader) {
  const classes = ['score-lineup-rate'];
  if (isLeader) classes.push('score-lineup-rate--leader');
  return `<span class="${classes.join(' ')}">${esc(formatSlashStat(value))}</span>`;
}

function renderLineupRows(team) {
  const players = team?.battingOrder ?? [];
  const roster = team?.players ?? {};
  if (!players.length) {
    return '<div class="score-lineups-empty">Lineup not yet posted</div>';
  }

  const leaders = lineupLeaders(players, roster);

  return players.map(id => {
    const p = roster[`ID${id}`] ?? {};
    const name = compactBoxName(p.person?.fullName ?? 'TBD');
    const pos = p.position?.abbreviation ?? '';
    const batSide = p.person?.batSide?.code ?? '';
    const batSideDisplay = batSide ? `<span class="score-lineup-hand">${batSide}</span>` : '';
    const rates = lineupRateValues(p);
    const avgValue = Number.parseFloat(rates.avg ?? 0) || 0;
    const obpValue = Number.parseFloat(rates.obp ?? 0) || 0;
    const opsValue = Number.parseFloat(rates.ops ?? 0) || 0;
    const slashLine = [
      renderSlashSegment(rates.avg, avgValue > 0 && avgValue === leaders.avg),
      renderSlashSegment(rates.obp, obpValue > 0 && obpValue === leaders.obp),
      renderSlashSegment(rates.ops, opsValue > 0 && opsValue === leaders.ops),
    ].join('<span class="score-lineup-rate-sep">/</span>');
    return `<div class="score-lineup-row">
      <span class="score-lineup-pos">${esc(pos)}</span>
      <span class="score-lineup-name">${esc(name)}${batSideDisplay}</span>
      <span class="score-lineup-slash">${slashLine}</span>
    </div>`;
  }).join('');
}

function renderLineupPopover(boxData) {
  if (!boxData?.teams) {
    return '<div class="score-lineups-empty">Lineup not yet posted</div>';
  }

  const renderSide = side => {
    const team = boxData.teams?.[side];
    if (!team) return '';
    return `<div class="score-lineup-side">${renderLineupRows(team)}</div>`;
  };

  const awayHtml = renderSide('away');
  const homeHtml = renderSide('home');
  return `<div class="score-lineups">
    <div class="score-lineups-grid">${awayHtml}${homeHtml}</div>
  </div>`;
}

function resolvePitchName(pitchType = {}) {
  const raw = [
    pitchType.description,
    pitchType.code,
    pitchType.abbreviation,
  ].find(value => typeof value === 'string' && value.trim()) || '';

  const pitchMap = {
    ...PITCH_NAMES,
    FF: '4-Seam',
    FA: '4-Seam',
    FT: '2-Seam',
    SI: 'Sinker',
    FC: 'Cutter',
    SL: 'Slider',
    CU: 'Curve',
    KC: 'K. Curve',
    CH: 'Changeup',
    FS: 'Splitter',
    FO: 'Forkball',
    ST: 'Sweeper',
    KN: 'Knuckle',
    EP: 'Eephus',
  };

  return pitchMap[raw] || raw || 'Pitch';
}

function pitchStyleToken(pitchName) {
  const normalized = String(pitchName || '').toLowerCase();
  if (normalized.includes('4-seam')) return 'four-seam';
  if (normalized.includes('2-seam')) return 'two-seam';
  if (normalized.includes('sinker')) return 'sinker';
  if (normalized.includes('slider')) return 'slider';
  if (normalized.includes('curve')) return 'curve';
  if (normalized.includes('change')) return 'change';
  if (normalized.includes('cutter')) return 'cutter';
  if (normalized.includes('split')) return 'splitter';
  if (normalized.includes('sweeper')) return 'sweeper';
  if (normalized.includes('knuckle')) return 'knuckle';
  if (normalized.includes('fork')) return 'forkball';
  return 'default';
}

function renderPitcherArsenal(arsenalData, { limit = 5, showVelo = true } = {}) {
  if (!arsenalData) {
    return `<div class="pitcher-arsenal pitcher-arsenal--loading">
      <span class="arsenal-loading">Loading…</span>
    </div>`;
  }

  const items = arsenalData?.stats?.[0]?.splits ?? [];
  if (!items.length) {
    return `<div class="pitcher-arsenal pitcher-arsenal--empty">
      <span class="arsenal-empty">No arsenal data</span>
    </div>`;
  }

  // Sort by usage % descending, take up to the requested number of pitches
  const sorted = [...items]
    .sort((a, b) => (b.stat?.percentage ?? 0) - (a.stat?.percentage ?? 0))
    .slice(0, limit);

  const pills = sorted.map(item => {
    const pitchType = item.stat?.type ?? item.type ?? {};
    const desc = pitchType.description ?? pitchType.code ?? '';
    const pitchName = resolvePitchName(pitchType);
    const pct  = item.stat?.percentage != null
      ? Math.round(item.stat.percentage * 100) + '%'
      : '';
    const velo = showVelo && item.stat?.averageSpeed != null
      ? Math.round(item.stat.averageSpeed) + ''
      : '';
    const label = [pitchName, pct, velo].filter(Boolean).join(' ');
    const tone = pitchStyleToken(pitchName);
    return `<span class="arsenal-pill arsenal-pill--${tone}" title="${esc(desc)}">
      <span class="arsenal-pill-label">${esc(label)}</span>
    </span>`;
  }).join('');

  return `<div class="pitcher-arsenal">${pills}</div>`;
}

function renderPreviewTeamCard(game, boxData, side, arsenalData) {
  const matchupTeam = game.teams?.[side]?.team ?? {};
  const boxTeam = boxData?.teams?.[side] ?? null;
  const teamId = matchupTeam.id ?? boxTeam?.team?.id;
  const teamName = matchupTeam.teamName ?? boxTeam?.team?.teamName ?? matchupTeam.name ?? (side === 'away' ? 'Away Team' : 'Home Team');
  const probablePitcher = game.teams?.[side]?.probablePitcher?.fullName ?? 'TBD';
  const lineupRows = boxTeam ? renderLineupRows(boxTeam) : '<div class="score-lineups-empty">Loading lineup status…</div>';
  const arsenal = renderPitcherArsenal(arsenalData ?? null, { limit: 7, showVelo: false });
  const logoHtml = teamId ? `<img class="score-lineup-logo" src="https://www.mlbstatic.com/team-logos/${teamId}.svg" alt="${esc(teamName)}" width="20" height="20">` : '';

  return `<div class="preview-team-card">
    <div class="score-lineup-head">
      ${logoHtml}<span class="score-lineup-label">${esc(teamName)}</span>
    </div>
    <div class="preview-team-section">
      <div class="preview-team-subhead">Probable Pitcher</div>
      <div class="probable-pitcher-row"><span class="probable-pitcher-name">${esc(probablePitcher)}</span></div>
      ${arsenal}
    </div>
    <div class="preview-team-section">
      <div class="preview-team-subhead">Lineup</div>
      <div class="score-lineup-side">${lineupRows}</div>
    </div>
  </div>`;
}

function renderPreviewMatchup(game, boxData, arsenals, matchupCtx = null) {
  const scoutNotes = renderScoutNotes(game, arsenals, matchupCtx);
  return `<div class="probable-pitchers probable-pitchers--preview">
    ${scoutNotes}
    <div class="score-lineups-grid">
      ${renderPreviewTeamCard(game, boxData, 'away', arsenals?.away ?? null)}
      ${renderPreviewTeamCard(game, boxData, 'home', arsenals?.home ?? null)}
    </div>
  </div>`;
}

function renderPitchingLines(boxData) {
  if (!boxData?.teams) return '';

  const renderSide = side => {
    const team = boxData.teams?.[side];
    if (!team) return '';

    const label = TEAM_ABBREV[team.team?.id] ?? team.team?.abbreviation ?? (side === 'away' ? 'Away' : 'Home');
    const pitchers = Object.values(team.players ?? {})
      .filter(player => player.stats?.pitching?.inningsPitched != null)
      .map(player => {
        const stats = player.stats.pitching;
        return {
          name: player.person?.fullName ?? 'TBD',
          ip: stats.inningsPitched ?? '0.0',
          h: stats.hits ?? 0,
          er: stats.earnedRuns ?? 0,
          bb: stats.baseOnBalls ?? 0,
          k: stats.strikeOuts ?? 0,
          pitches: stats.numberOfPitches ?? null,
          ipNum: parseFloat(stats.inningsPitched ?? 0),
          pitchHand: player.person?.pitchHand?.code ?? '',
        };
      })
      .sort((a, b) => b.ipNum - a.ipNum);

    if (!pitchers.length) {
      return `<div class="box-section box-performers">
        <span class="box-perf-label">${esc(label)} Pitching</span>
        <span class="box-perf-row"><span class="box-perf-stat">Pitching lines unavailable</span></span>
      </div>`;
    }

    return `<div class="box-section box-performers">
      <span class="box-perf-label">${esc(label)} Pitching</span>
      ${pitchers.map(p => {
        const extras = [];
        if (parseFloat(p.ip) > 0) extras.push(`${p.ip} IP`);
        if (p.h > 0) extras.push(`${p.h} H`);
        if (p.er > 0) extras.push(`${p.er} ER`);
        if (p.bb > 0) extras.push(`${p.bb} BB`);
        if (p.k > 0) extras.push(`${p.k} K`);
        if ((p.pitches ?? 0) > 0) extras.push(`${p.pitches} P`);
        const pitchHandDisplay = p.pitchHand ? `<span class="box-perf-hand">${p.pitchHand}</span>` : '';
        return `<span class="box-perf-row"><span class="box-perf-name">${esc(compactBoxName(p.name))}${pitchHandDisplay}</span><span class="box-perf-stat">${extras.join(', ') || 'No notable line'}</span></span>`;
      }).join('')}
    </div>`;
  };

  return renderSide('away') + renderSide('home');
}

function playerLabel(person) {
  return person?.fullName ? person.fullName.split(' ').slice(-1)[0] : 'Baltimore';
}

function compactBoxName(name) {
  if (!name) return 'TBD';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length <= 1) return parts[0];
  const suffixes = new Set(['Jr.', 'Sr.', 'II', 'III', 'IV', 'V']);
  const last = parts.at(-1);
  if (suffixes.has(last) && parts.length >= 2) return `${parts.at(-2)} ${last}`;
  return last;
}

function renderScoutPitchMix(arsenalData, pitcherName) {
  const items = arsenalData?.stats?.[0]?.splits ?? [];
  if (!items.length) return '';

  const pills = [...items]
    .sort((a, b) => (b.stat?.percentage ?? 0) - (a.stat?.percentage ?? 0))
    .slice(0, 3)
    .map(item => {
      const pitchType = item.stat?.type ?? item.type ?? {};
      const desc = pitchType.description ?? pitchType.code ?? '';
      const pitchName = resolvePitchName(pitchType);
      const pct = item.stat?.percentage != null ? `${Math.round(item.stat.percentage * 100)}%` : '';
      const velo = item.stat?.averageSpeed != null ? `${Math.round(item.stat.averageSpeed)} mph` : '';
      return `<span class="scout-pitch-pill" title="${esc(desc)}">
        <span class="scout-pitch-type">${esc(pitchName)}</span>
        <span class="scout-pitch-meta">${esc([pct, velo].filter(Boolean).join(' | '))}</span>
      </span>`;
    }).join('');

  return `<div class="scout-pitch-mix">
    <div class="scout-pitch-head">${esc(compactBoxName(pitcherName))}'s mix</div>
    <div class="scout-pitch-list">${pills}</div>
  </div>`;
}

function renderScoutNotes(game, arsenals, matchupCtx = null) {
  const isLive = game.status?.abstractGameState === 'Live';
  const isPreview = game.status?.abstractGameState === 'Preview';
  const isFinal = game.status?.abstractGameState === 'Final';
  const awayId = game.teams?.away?.team?.id;
  const homeId = game.teams?.home?.team?.id;
  const isOriolesGame = awayId === ORIOLES_ID || homeId === ORIOLES_ID;
  if (!isOriolesGame) return '';

  const notes = [];
  let badge = 'Scout';
  let context = '';
  let pitchMix = '';

  if (isLive) {
    const ls = game.linescore ?? {};
    const offense = ls.offense ?? {};
    const defense = ls.defense ?? {};
    const inning = ls.currentInning ?? '';
    const half = ls.inningHalf === 'Top' ? 'top' : 'bottom';
    const outs = ls.outs ?? 0;
    const balls = ls.balls ?? null;
    const strikes = ls.strikes ?? null;
    const runnersOn = [offense.first, offense.second, offense.third].filter(Boolean).length;
    const risp = [offense.second, offense.third].filter(Boolean).length;
    const basesLoaded = Boolean(offense.first && offense.second && offense.third);
    const oriolesBatting = offense.team?.id === ORIOLES_ID;
    const oriolesPitching = defense.team?.id === ORIOLES_ID;
    const oriolesScore = awayId === ORIOLES_ID ? (game.teams?.away?.score ?? 0) : (game.teams?.home?.score ?? 0);
    const oppScore = awayId === ORIOLES_ID ? (game.teams?.home?.score ?? 0) : (game.teams?.away?.score ?? 0);
    const diff = oriolesScore - oppScore;
    const batter = offense.batter;    // always on offensive side
    const onDeck = offense.onDeck;
    const inHole = offense.inHole;
    const pitcher = defense.pitcher;  // always on defensive side
    const opposingBatter = offense.batter;
    pitchMix = renderScoutPitchMix(arsenals?.current ?? null, pitcher?.fullName ?? pitcher?.lastInitName ?? '');

    if (oriolesBatting) {
      if (basesLoaded) {
        notes.push(`${playerLabel(batter)} steps in with the bases loaded in the ${half} of the ${inning}${ordinalSuffix(inning)}.`);
      } else if (risp > 0) {
        notes.push(`${playerLabel(batter)} is up with ${risp} in scoring position and ${outs} out${outs === 1 ? '' : 's'}.`);
      } else if (offense.first && outs === 0) {
        notes.push(`${playerLabel(batter)} comes up with early traffic and nobody out.`);
      }

      if (diff < 0) {
        if (diff === -1) notes.push(`${playerLabel(batter)} is the tying run at the plate.`);
        else if (diff === -2 && runnersOn >= 1) notes.push(`The tying run is aboard with ${playerLabel(batter)} up.`);
        else if (diff === -3 && runnersOn >= 2) notes.push(`${playerLabel(batter)} hits with a real tying rally brewing.`);
      } else if (diff >= 0 && inning >= 7 && runnersOn > 0) {
        notes.push(`${playerLabel(batter)} has a late chance to add breathing room with traffic aboard.`);
      }

      if (balls === 3 && strikes !== 2) {
        notes.push(`Count leans ${playerLabel(batter)} at ${balls}-${strikes} against ${playerLabel(pitcher)}.`);
      } else if (strikes === 2 && balls != null && balls <= 1) {
        notes.push(`${playerLabel(pitcher)} has ${playerLabel(batter)} in a two-strike spot.`);
      }

      if (onDeck?.fullName && inHole?.fullName) {
        notes.push(`Next up: ${playerLabel(onDeck)}, then ${playerLabel(inHole)}.`);
      }
    }

    if (oriolesPitching) {
      if (diff > 0 && inning >= 8 && diff <= 3) {
        notes.push(`${playerLabel(defense.pitcher)} is in a save-pressure spot.`);
      }
      if (offense.first && outs < 2) {
        notes.push(`${playerLabel(defense.pitcher)} has a double-play chance with ${playerLabel(opposingBatter)} up.`);
      }
      if (risp > 0) {
        notes.push(`${playerLabel(defense.pitcher)} is working through traffic with ${risp} in scoring position.`);
      }
      if (strikes === 2 && balls != null && balls <= 1) {
        notes.push(`${playerLabel(defense.pitcher)} is ahead ${balls}-${strikes} to ${playerLabel(opposingBatter)}.`);
      } else if (balls === 3 && strikes !== 2) {
        notes.push(`${playerLabel(opposingBatter)} has the count edge at ${balls}-${strikes} against ${playerLabel(defense.pitcher)}.`);
      }
    }

    if (Math.abs(oriolesScore - oppScore) <= 2 && inning >= 7) {
      notes.push(`Late leverage: a ${Math.abs(oriolesScore - oppScore)}-run game in the ${inning}${ordinalSuffix(inning)}.`);
    }

    context = `${ls.inningHalf || ''} ${String(inning || '')}`;
  } else if (isPreview) {
    badge = 'Matchup';
    const awayPitcher = game.teams?.away?.probablePitcher?.fullName;
    const homePitcher = game.teams?.home?.probablePitcher?.fullName;
    if (awayPitcher || homePitcher) {
      notes.push(`${awayPitcher || 'TBD'} vs ${homePitcher || 'TBD'}`);
    }

    const mc = matchupCtx;
    if (mc) {
      // Orioles pitcher career stats vs today's opponent
      const oriolesPitcherVs = awayId === ORIOLES_ID ? mc.awayPitcherVs : mc.homePitcherVs;
      const oppAbbr = TEAM_ABBREV[awayId === ORIOLES_ID ? game.teams?.home?.team?.id : game.teams?.away?.team?.id] ?? '';
      if (oriolesPitcherVs?.gamesPlayed >= 1) {
        const gp = oriolesPitcherVs.gamesPlayed;
        const oppBA = oriolesPitcherVs.avg ?? '';
        const k = oriolesPitcherVs.strikeOuts ?? '';
        const oriolesPitcherName = compactBoxName(awayId === ORIOLES_ID ? awayPitcher : homePitcher);
        const parts = [`${gp} G`];
        if (oppBA) parts.push(`opp. BA ${oppBA}`);
        if (k !== '') parts.push(`${k} K`);
        notes.push(`${oriolesPitcherName} vs ${oppAbbr} (career): ${parts.join(', ')}`);
      }

      // Orioles season batting line
      const oriolesStats = awayId === ORIOLES_ID ? mc.awayTeamStats : mc.homeTeamStats;
      if (oriolesStats?.avg) {
        const avg = oriolesStats.avg;
        const obp = oriolesStats.obp ?? '';
        const gp = oriolesStats.gamesPlayed ?? 0;
        const rpg = gp > 0 && oriolesStats.runs != null
          ? (oriolesStats.runs / gp).toFixed(1)
          : null;
        const parts = [`${avg}/${obp}`];
        if (rpg) parts.push(`${rpg} R/G`);
        notes.push(`BAL offense: ${parts.join(', ')}`);
      }
    }
  } else if (isFinal) {
    badge = 'Final';
    const oriolesScore = awayId === ORIOLES_ID ? (game.teams?.away?.score ?? 0) : (game.teams?.home?.score ?? 0);
    const oppScore = awayId === ORIOLES_ID ? (game.teams?.home?.score ?? 0) : (game.teams?.away?.score ?? 0);
    const oppName = awayId === ORIOLES_ID ? game.teams?.home?.team?.name : game.teams?.away?.team?.name;
    const oppAbbr = TEAM_ABBREV[awayId === ORIOLES_ID ? (game.teams?.home?.team?.id) : (game.teams?.away?.team?.id)] ?? '';
    if (oriolesScore > oppScore) {
      notes.push(`Orioles won ${oriolesScore}-${oppScore} vs ${oppAbbr}.`);
    } else if (oriolesScore < oppScore) {
      notes.push(`Orioles lost ${oriolesScore}-${oppScore} vs ${oppAbbr}.`);
    } else {
      notes.push(`Orioles tied ${oriolesScore}-${oppScore} vs ${oppAbbr}.`);
    }
  }

  const uniqueNotes = [...new Set(notes)].slice(0, 4);
  if (!uniqueNotes.length) return '';

  return `<div class="box-section scout-notes">
    <div class="scout-notes-head">
      <span class="scout-badge">${badge}</span>
      ${context ? `<span class="scout-context">${esc(context)}</span>` : ''}
    </div>
    ${pitchMix}
    <div class="scout-notes-list">
      ${uniqueNotes.map(note => `<div class="scout-note-row">${esc(note)}</div>`).join('')}
    </div>
  </div>`;
}

function ordinalSuffix(num) {
  const n = Number(num);
  if (!Number.isFinite(n)) return '';
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function renderDecisionStrip(g) {
  const parts = [];
  const wp = g.decisions?.winner;
  const lp = g.decisions?.loser;
  const sv = g.decisions?.save;
  if (wp) parts.push(`<span class="decision-pill win">W: ${esc(compactBoxName(wp.fullName || wp.lastInitName || playerLabel(wp)))}</span>`);
  if (lp) parts.push(`<span class="decision-pill loss">L: ${esc(compactBoxName(lp.fullName || lp.lastInitName || playerLabel(lp)))}</span>`);
  if (sv) parts.push(`<span class="decision-pill save">SV: ${esc(compactBoxName(sv.fullName || sv.lastInitName || playerLabel(sv)))}</span>`);
  if (!parts.length) return '';
  return `<div class="box-decisions">${parts.join('')}</div>`;
}

function renderBoxScore(g, boxData, arsenals, matchupCtx = null) {
  const isPreview = g.status.abstractGameState === 'Preview';
  if (isPreview) {
    return renderPreviewMatchup(g, boxData, arsenals, matchupCtx);
  }

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
  const decisions = renderDecisionStrip(g);
  const performers = topPerformers(boxData);
  const pitchingLines = renderPitchingLines(boxData);
  const scoutNotes = renderScoutNotes(g, arsenals, null);

  return `<div class="box-popover-stack">
    ${scoutNotes}
    <div class="box-section box-linescore">
      <table class="box-score-table">
        <thead><tr>${hdr}</tr></thead>
        <tbody>
          <tr>${awayRow}</tr>
          <tr>${homeRow}</tr>
        </tbody>
      </table>
      ${decisions}
    </div>
    ${performers}
    ${pitchingLines}
    ${renderLineupPopover(boxData)}
  </div>`;
}

async function loadScores() {
  const track = $('scoresTrack');
  try {
    const yesterday = localDateStr(-1);
    const today = localDateStr(0);
    const tomorrow = localDateStr(1);

    const [ydData, todayData, tmData] = await Promise.all([
      fetch(`${MLB}/schedule?sportId=1&date=${yesterday}&hydrate=linescore,team,venue,decisions,probablePitcher`).then(r => r.json()),
      fetch(`${MLB}/schedule?sportId=1&date=${today}&hydrate=linescore,team,venue,decisions,probablePitcher`).then(r => r.json()),
      fetch(`${MLB}/schedule?sportId=1&date=${tomorrow}&hydrate=linescore,team,venue,decisions,probablePitcher`).then(r => r.json()),
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
      if (top + ph > window.innerHeight - 4) top = Math.max(r.bottom + 6, window.innerHeight - ph - 4);
      boxPopover.style.left = left + 'px';
      boxPopover.style.top = top + 'px';
    }
    function showBoxScore(chip) {
      const pk = chip.dataset.gamepk;
      const g = state.gamesMap[pk];
      if (!g) return;
      clearTimeout(boxTimer);

      const isPreview = g.status?.abstractGameState === 'Preview';
      const isLive = g.status?.abstractGameState === 'Live';
      const isOriolesGame = g.teams?.away?.team?.id === ORIOLES_ID || g.teams?.home?.team?.id === ORIOLES_ID;
      const awayPitcherId = g.teams?.away?.probablePitcher?.id;
      const homePitcherId = g.teams?.home?.probablePitcher?.id;
      const awayTeamId = g.teams?.away?.team?.id;
      const homeTeamId = g.teams?.home?.team?.id;
      const livePitcherId = isLive && isOriolesGame
        ? (g.linescore?.offense?.team?.id === ORIOLES_ID
            ? g.linescore?.offense?.pitcher?.id
            : g.linescore?.defense?.pitcher?.id)
        : null;

      // Keys for pitcher-vs-team cache
      const awayVsKey = `${awayPitcherId}_vs_${homeTeamId}`;
      const homeVsKey = `${homePitcherId}_vs_${awayTeamId}`;

      function buildArsenals() {
        return isPreview
          ? { away: arsenalCache[awayPitcherId] ?? null, home: arsenalCache[homePitcherId] ?? null }
          : isLive
            ? { current: arsenalCache[livePitcherId] ?? null }
            : null;
      }

      function buildMatchupCtx() {
        if (!isPreview || !isOriolesGame) return null;
        return {
          awayPitcherVs: pitcherVsCache[awayVsKey] ?? null,
          homePitcherVs: pitcherVsCache[homeVsKey] ?? null,
          awayTeamStats:  teamStatsCache[awayTeamId]  ?? null,
          homeTeamStats:  teamStatsCache[homeTeamId]  ?? null,
        };
      }

      // Phase 1: render immediately with whatever is cached
      boxPopover.innerHTML = renderBoxScore(g, boxscoreCache[pk] || null, buildArsenals(), buildMatchupCtx());
      boxPopover.style.left = '-9999px';
      boxPopover.style.top = '0';
      boxPopover.classList.remove('hidden');
      positionPopover(chip);

      // Phase 2: fetch whatever is missing, then re-render once
      const missing = [
        !boxscoreCache[pk]                                          && fetchBoxscore(pk),
        isPreview && !arsenalCache[awayPitcherId]                  && fetchArsenal(awayPitcherId),
        isPreview && !arsenalCache[homePitcherId]                  && fetchArsenal(homePitcherId),
        isLive && livePitcherId && !arsenalCache[livePitcherId]    && fetchArsenal(livePitcherId),
        isPreview && isOriolesGame && pitcherVsCache[awayVsKey] === undefined
          && fetchPitcherVsTeam(awayPitcherId, homeTeamId),
        isPreview && isOriolesGame && pitcherVsCache[homeVsKey] === undefined
          && fetchPitcherVsTeam(homePitcherId, awayTeamId),
        isPreview && isOriolesGame && !teamStatsCache[awayTeamId]  && fetchTeamStats(awayTeamId),
        isPreview && isOriolesGame && !teamStatsCache[homeTeamId]  && fetchTeamStats(homeTeamId),
      ].filter(Boolean);

      if (missing.length) {
        Promise.all(missing).then(() => {
          if (boxPopover.classList.contains('hidden')) return;
          boxPopover.innerHTML = renderBoxScore(g, boxscoreCache[pk] || null, buildArsenals(), buildMatchupCtx());
          positionPopover(chip);
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

    // Before 09:00 EDT, keep yesterday's scores front-and-center
    const nowUTC = new Date();
    const edtHour = (nowUTC.getUTCHours() - 4 + 24) % 24;
    const beforeNoonEDT = edtHour < 9;
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
        title: cleanFeedText(item.title),
        link: item.link ?? '',
        pubDate: item.pubDate ?? '',
        description: cleanFeedText(item.description),
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

function getAthArticles(articles, windowDays = 3) {
  const cutoff = Date.now() - windowDays * 864e5;
  return articles.filter(article => {
    const d = new Date(article.pubDate);
    return !isNaN(d) && d.getTime() > cutoff;
  });
}

function getAthCandidateArticles() {
  let arts = state.articles;

  if (state.activeCategory !== 'milb') {
    arts = arts.filter(a => a.source.category !== 'milb');
  }

  if (state.activeCategory !== 'all') {
    arts = arts.filter(a => a.source.category === state.activeCategory);
  }
  if (state.activeSource !== 'all') {
    arts = arts.filter(a => a.source.id === state.activeSource);
  }

  return [...arts].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
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

function cardDescriptionClamp(article, mode) {
  if (!article.description || mode === 'compact') return 0;

  const titleLen = (article.title || '').length;
  const descLen = (article.description || '').length;
  const loadScore =
    (titleLen > 110 ? 2 : titleLen > 72 ? 1 : 0) +
    (descLen > 180 ? 2 : descLen > 96 ? 1 : 0) +
    (extractThumbnail(article) ? 1 : 0) +
    ((article.content || '').length > 500 ? 1 : 0);

  if (loadScore >= 5) return 0;
  if (loadScore >= 3) return 1;
  return 2;
}

function renderCardDescription(article, mode) {
  const clamp = cardDescriptionClamp(article, mode);
  if (!clamp) return '';
  return `<div class="article-desc article-desc--clamp-${clamp}">${esc(article.description)}</div>`;
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
        ${renderCardDescription(a, mode)}
      </div>
    </div>`;
  }

  // Grid mode (default)
  return `<div class="article-card${readClass}" data-idx="${i}" role="button" tabindex="0">
    ${thumbImg}
    <div class="article-body">
      ${source}
      <div class="article-title">${esc(a.title)}</div>
      ${renderCardDescription(a, mode)}
    </div>
  </div>`;
}

// ── "Around the Horn" story bundling ──────────────────────────
// Groups articles about the same story across sources.
// Extracts key proper nouns / phrases from titles and clusters by overlap.

function tokenize(title) {
  // Remove common filler words, keep meaningful terms
  const stop = new Set(['a','an','the','of','in','on','to','for','and','is','are','was','at','by','with','from','vs','after','how','what','why','who','this','that','it','its','has','have','had','be','do','does','not','but','or','can','will','may','about','into','over','up','out','no','so','all','just','than','then','also','new','more','first','last','one','two','three','game','games','mlb','baseball','season','team','teams','series','win','wins','loss','losses','says','said','gets','get','makes','make','takes','take','latest','report','reports','notes','preview','recap','update','updates','story']);
  return title.toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stop.has(w));
}

function bundleSlug(label) {
  return String(label || 'around-the-horn')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'around-the-horn';
}

function bundleAnchorTokens(tokens) {
  return tokens.filter(token =>
    token.length >= 5 ||
    ['orioles', 'yankees', 'redsox', 'bluejays', 'rays', 'astros', 'dodgers', 'mets', 'braves', 'cubs', 'padres'].includes(token)
  );
}

function bundleCardSummary(bundle) {
  const topSources = [...new Set(bundle.articles.map(a => a.source.name))].slice(0, 3);
  return topSources.join(' • ');
}

function cleanBundleHeadline(title) {
  return String(title || '')
    .replace(/^[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3}:\s+/, '')
    .replace(/\s+\|\s+[^|]+$/, '')
    .replace(/\s+[—-]\s+(ESPN|MLB\.com|The Athletic|CBS Sports|Yahoo Sports|FOX Sports|Sports Illustrated|Baltimore Banner|PressBox|MASN|Camden Chat)$/i, '')
    .replace(/\s+[—|-]\s+by\s+[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3}$/i, '')
    .replace(/\s+\|\s+by\s+[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3}$/i, '')
    .replace(/\s+\bby\s+[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3}$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fitBundleHeadline(title, maxLength = 54) {
  const clean = cleanBundleHeadline(title);
  if (clean.length <= maxLength) return clean;
  const words = clean.split(' ');
  let fitted = '';

  for (const word of words) {
    const next = fitted ? `${fitted} ${word}` : word;
    if (next.length > maxLength - 1) break;
    fitted = next;
  }

  if (!fitted) return `${clean.slice(0, maxLength - 1).trim()}...`;
  return `${fitted}...`;
}

function bundlePhoto(bundle) {
  return bundle.articles.map(article => extractThumbnail(article)).find(Boolean) || null;
}

function isOriolesArticle(article) {
  return article.source?.category === 'orioles' ||
    /\b(orioles|baltimore|camden|adley|henderson|mullins|o'hearn|westburg|rutschman|mountcastle|holliday|cowser|kjerstad|urias|mateo|bautista|cano|eflin|grayson|kremer|povich)\b/i
      .test(`${article.title || ''} ${article.description || ''}`);
}

function bundleVariant(bundle) {
  const oriolesHits = bundle.articles.filter(isOriolesArticle).length;
  return oriolesHits >= Math.max(1, Math.ceil(bundle.articles.length / 2)) ? 'orioles' : 'mlb';
}

function bundleLogoMarkup(bundle, variant) {
  if (variant === 'orioles') {
    return `<img class="bundle-logo-mark" src="https://www.mlbstatic.com/team-logos/110.svg" alt="Orioles logo" loading="lazy">`;
  }
  const mlbFavicon = faviconUrl('https://www.mlb.com');
  return mlbFavicon
    ? `<img class="bundle-logo-mark bundle-logo-mark--mlb" src="${esc(mlbFavicon)}" alt="MLB logo" loading="lazy">`
    : `<span class="bundle-logo-mark bundle-logo-mark--fallback" aria-hidden="true">MLB</span>`;
}

function storeAthBundle(bundle) {
  try {
    const key = 'yr_ath_bundles';
    const existing = JSON.parse(sessionStorage.getItem(key) || '{}');
    existing[bundle.slug] = {
      label: bundle.label,
      slug: bundle.slug,
      sourceCount: bundle.sourceCount,
      tokens: bundle.tokens,
      articles: bundle.articles.map(article => ({
        title: article.title,
        link: article.link,
        source: article.source,
        pubDate: article.pubDate,
        description: article.description,
        content: article.content,
      })),
      savedAt: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(existing));
  } catch {
    // Ignore storage failures and let the page show its fallback state.
  }
}

function buildTopicLabel(sharedTokens, articles) {
  const rankedHeadlines = articles
    .map(article => cleanBundleHeadline(article.title))
    .filter(Boolean)
    .map(title => {
      const titleTokens = new Set(tokenize(title));
      const overlap = sharedTokens.filter(token => titleTokens.has(token)).length;
      const hasColon = title.includes(':') ? 1 : 0;
      return { title, overlap, hasColon, length: title.length };
    })
    .sort((a, b) =>
      b.overlap - a.overlap ||
      b.hasColon - a.hasColon ||
      a.length - b.length
    );

  if (rankedHeadlines.length) {
    const preferred = rankedHeadlines.find(item => item.length <= 54) ||
      rankedHeadlines.find(item => item.length <= 64) ||
      rankedHeadlines[0];
    return fitBundleHeadline(preferred.title, 54);
  }

  if (!sharedTokens.length) return 'Around the Horn';

  const phrase = sharedTokens
    .slice(0, 5)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
  return fitBundleHeadline(phrase || 'Around the Horn', 54);
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
      const anchorOverlap = bundleAnchorTokens(overlap);
      if (overlap.length >= 2 && anchorOverlap.length >= 1) {
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
        if (overlap.length >= 2 && bundleAnchorTokens(overlap).length >= 1) refined.add(j);
      }

      const clusterArticles = [...refined].map(idx => articles[idx]);
      // Build a generalized topic label from the shared tokens
      const label = buildTopicLabel([...sharedTokens], clusterArticles);
      const selectedArticles = clusterArticles
        .slice()
        .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
        .slice(0, 3);

      const sourceCount = new Set(selectedArticles.map(a => a.source.id)).size;
      if (sourceCount < 2) continue;
      if (selectedArticles.length < 3) continue;

      clusters.push({
        label,
        slug: bundleSlug(label),
        tokens: [...sharedTokens],
        articles: selectedArticles,
        sourceCount,
      });
      for (const idx of refined) assigned.add(idx);
    }
  }

  // Sort bundles by number of sources covering it (most coverage first)
  clusters.sort((a, b) => b.sourceCount - a.sourceCount || b.articles.length - a.articles.length);
  return clusters;
}

function renderBundle(bundle, allArticles) {
  const thumb = bundlePhoto(bundle);
  if (!thumb) return '';
  const variant = bundleVariant(bundle);
  const thumbHtml = `<img class="bundle-thumb" src="${esc(thumb)}" alt="" loading="lazy">`;

  const sourceIcons = [...new Set(bundle.articles.map(a => a.source.name))].slice(0, 5)
    .map(name => {
      const a = bundle.articles.find(x => x.source.name === name);
      return `<img class="source-ico" src="${esc(faviconUrl(a.link))}" alt="" title="${esc(name)}" onerror="this.style.display='none'">`;
    }).join('');

  const href = `${import.meta.env.BASE_URL}around-the-horn/?topic=${encodeURIComponent(bundle.slug)}`;

  return `<a class="ath-bundle ath-card-link ath-card-link--${variant}" href="${href}" data-bundle-slug="${esc(bundle.slug)}" role="button">
    <div class="bundle-card-media bundle-card-media--${variant}">
      ${thumbHtml}
      <div class="bundle-card-overlay"></div>
      ${bundleLogoMarkup(bundle, variant)}
      <div class="bundle-card-copy">
        <div class="bundle-title">${esc(bundle.label)}</div>
      </div>
    </div>
    <div class="bundle-card-footer">
      <div class="bundle-meta">
        <span class="bundle-sources">${sourceIcons}</span>
      </div>
    </div>
  </a>`;
}

function selectAthBundles(articles) {
  const primaryBundles = findStoryBundles(articles, 3)
    .map(bundle => ({ ...bundle, photo: bundlePhoto(bundle) }))
    .filter(bundle => bundle.photo);
  const oriolesBundle = primaryBundles.find(bundle => bundleVariant(bundle) === 'orioles') || null;
  const nonOriolesPrimary = primaryBundles.filter(bundle => bundleVariant(bundle) !== 'orioles');
  const oriolesPrimary = primaryBundles.filter(bundle => bundleVariant(bundle) === 'orioles');
  const picks = [];
  const usedLinks = new Set();

  function addBundle(bundle) {
    if (!bundle) return;
    if (picks.some(item => item.slug === bundle.slug)) return;
    picks.push(bundle);
    bundle.articles.forEach(article => {
      if (article?.link) usedLinks.add(article.link);
    });
  }

  addBundle(oriolesBundle);

  for (const bundle of nonOriolesPrimary) {
    if (bundle.articles.every(article => article?.link && usedLinks.has(article.link))) continue;
    addBundle(bundle);
    if (picks.length === 3) break;
  }

  if (picks.length < 3) {
    for (const bundle of oriolesPrimary) {
      if (bundle.articles.every(article => article?.link && usedLinks.has(article.link))) continue;
      addBundle(bundle);
      if (picks.length === 3) break;
    }
  }

  return picks.slice(0, 3);
}

function selectTopStoryBundles(articles, limit = 3, excludeLinks = new Set()) {
  const picks = [];
  const seenLinks = new Set(excludeLinks);
  const seenTitles = new Set();

  for (const article of articles.slice().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))) {
    const photo = extractThumbnail(article);
    const normalizedTitle = cleanBundleHeadline(article.title).toLowerCase();
    if (!photo) continue;
    if (article.link && seenLinks.has(article.link)) continue;
    if (normalizedTitle && seenTitles.has(normalizedTitle)) continue;

    picks.push({
      label: fitBundleHeadline(article.title, 54),
      slug: bundleSlug(article.link || article.title),
      tokens: tokenize(article.title),
      articles: [article],
      sourceCount: 1,
    });

    if (article.link) seenLinks.add(article.link);
    if (normalizedTitle) seenTitles.add(normalizedTitle);
    if (picks.length === limit) break;
  }

  return picks;
}

function selectAdaptiveAthBundles(articles) {
  if (state.activeCategory === 'milb') {
    const recent = getAthArticles(articles, 7);
    return selectTopStoryBundles(recent.length ? recent : articles, 3);
  }

  const windows = [3, 7, 14, 30];
  let best = [];

  for (const days of windows) {
    const bundles = selectAthBundles(getAthArticles(articles, days));
    if (bundles.length > best.length) best = bundles;
    if (bundles.length >= 3) return bundles;
  }

   if (state.activeCategory === 'mlb' && best.length < 3) {
    const usedLinks = new Set(best.flatMap(bundle => bundle.articles.map(article => article?.link).filter(Boolean)));
    const fallbackArticles = articles.filter(article => !usedLinks.has(article.link));
    const fallbackBundles = selectTopStoryBundles(fallbackArticles, 3 - best.length, usedLinks);
    return [...best, ...fallbackBundles].slice(0, 3);
  }

  return best;
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

  if (!arts.length) {
    list.innerHTML = '<div class="feed-msg">No articles match your filters.</div>';
    return;
  }

  const gridClass = state.viewMode === 'list' || state.viewMode === 'compact'
    ? 'article-grid list-layout' : 'article-grid';

  let html = '';

  // Hot Stove bundles (only in default date sort, no search)
  const bundles = (!state.searchQuery && state.sortBy === 'date')
    ? selectAdaptiveAthBundles(getAthCandidateArticles()) : [];
  const bundledSet = new Set(bundles.flatMap(b => b.articles));
  const unbundled = arts.filter(a => !bundledSet.has(a));

  if (bundles.length) {
    html += `<section class="ath-section">
      <div class="ath-section-head">
        <span class="ath-section-kicker">Featured Stories</span>
        <h2 class="ath-section-title">Around the Horn</h2>
      </div>
      <div class="ath-bundle-grid">${bundles.map(b => renderBundle(b, arts)).join('')}</div>
    </section>`;
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

  list.querySelectorAll('.ath-card-link').forEach(link => {
    link.addEventListener('click', () => {
      const slug = link.dataset.bundleSlug;
      const bundle = bundles.find(item => item.slug === slug);
      if (bundle) storeAthBundle(bundle);
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
    // Find today's game to check if it's live
    const todayStr = today;
    const todayGame = games.find(g => g.gameDate.startsWith(todayStr));
    const todayIsLive = todayGame?.status?.abstractGameState === 'Live';

    // If today's game is live, show next upcoming game (not today's); otherwise show next upcoming game overall
    const next = todayIsLive
      ? games.find(g => !g.gameDate.startsWith(todayStr) && g.status.abstractGameState !== 'Final')
      : games.find(g => g.status.abstractGameState !== 'Final');

    if (!next) {
      wrap.innerHTML = '<span class="sidebar-msg">No upcoming games</span>';
      return;
    }

    const away = next.teams.away;
    const home = next.teams.home;
    const isHome = home.team.id === ORIOLES_ID;
    const opponent = isHome ? away : home;
    const oppAbbr = TEAM_ABBREV[opponent.team.id] ?? opponent.team.name.slice(0, 3);
    const onDeckOpponentLabel = isHome ? oppAbbr : opponent.team.name;

    const gameDate = new Date(next.gameDate);
    const dateStr = gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const venue = next.venue?.name ?? '';
    const venueDetails = await fetchVenueDetails(next.venue?.id);
    const fieldInfo = venueDetails?.fieldInfo ?? null;

    // Fetch weather for the game venue only if it's today's game
    const nextIsToday = next.gameDate.startsWith(todayStr);
    let wxHtml = '';
    if (nextIsToday) {
      await fetchWeatherForGames([next]);
      const wx = getGameWeather(next);
      wxHtml = wx
        ? `<div class="on-deck-weather" aria-label="${esc(wx.condition)} ${wx.temp} degrees">
            <span class="on-deck-weather-icon">${wx.emoji}</span>
            <span class="on-deck-weather-temp">${wx.temp}°F</span>
          </div>`
        : '';
    }

    const awaySlug = TEAM_SLUG[away.team.id] ?? '';
    const homeSlug = TEAM_SLUG[home.team.id] ?? '';
    const gdDate = next.gameDate.slice(0, 10).replace(/-/g, '/');
    const gdUrl = `https://www.mlb.com/gameday/${awaySlug}-vs-${homeSlug}/${gdDate}/${next.gamePk}/preview`;

    // Build upcoming game boxes (include all non-final games including the featured one)
    const upcoming = games.filter(g => g.status.abstractGameState !== 'Final');
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
      const isLive = g.status?.abstractGameState === 'Live';
      return `<a class="sched-box${isLive ? ' sched-box--live' : ''}" href="${gUrl}" target="_blank" rel="noopener">
        <span class="sched-box-day">${esc(gDay)}</span>
        <div class="sched-box-logo-wrap">
          <span class="sched-box-at">${gIsHome ? 'vs' : '@'}</span>
          <img class="sched-box-logo" src="https://www.mlbstatic.com/team-logos/${gOpp.team.id}.svg" alt="${esc(gOppAbbr)}" width="22" height="22">
        </div>
      </a>`;
    }).join('');

    const scheduleHtml = scheduleBoxes
      ? `<div class="sched-row-wrap">${scheduleBoxes}</div>`
      : '';

    wrap.innerHTML = `
      <div class="on-deck-card-wrap">
        <a class="on-deck-card" href="${gdUrl}" target="_blank" rel="noopener">
          ${wxHtml}
          <div class="on-deck-matchup">
            <span class="on-deck-at">${isHome ? 'vs' : '@'}</span>
            <img class="on-deck-logo" src="https://www.mlbstatic.com/team-logos/${opponent.team.id}.svg" alt="" width="28" height="28">
            <span class="on-deck-opp">${esc(onDeckOpponentLabel)}</span>
          </div>
          <div class="on-deck-details">
            <span class="on-deck-date">${esc(dateStr)} · ${esc(timeStr)}</span>
            <span class="on-deck-venue">${esc(venue)}</span>
          </div>
        </a>
      </div>
      ${scheduleHtml}`;
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

    // Sort by IL type ascending (10-day, 15-day, 60-day)
    const getILDays = p => {
      const m = p.status.description.match(/(\d+)-day/i);
      return m ? parseInt(m[1]) : 99;
    };
    injured.sort((a, b) => getILDays(a) - getILDays(b));

    wrap.innerHTML = `<div class="il-list">${injured.map(p => {
      const status = p.status.description.replace('Injured ', '');
      const playerUrl = `https://www.mlb.com/player/${p.person.id}`;
      const note = normalizeText(p.note || '');
      return `<div class="il-item">
        <div class="il-topline">
          <a class="il-name" href="${playerUrl}" target="_blank" rel="noopener">${esc(p.person.fullName)}</a>
          <span class="il-pos">${esc(p.position?.abbreviation ?? '')}</span>
          <span class="il-status">${esc(status)}</span>
        </div>
        ${note ? `<div class="il-note">${esc(note)}</div>` : ''}
      </div>`;
    }).join('')}</div>`;
  } catch {
    wrap.innerHTML = '<span class="sidebar-msg">Unavailable</span>';
  }
}

// ── Video Widget ─────────────────────────────────────────────────
const YT_PLAYLISTS = [
  { id: 'PLL-lmlkrmJakABrOT6FmV0mU-5oIF8nGu', label: 'MLB Fastcast' },
  { id: 'PLL-lmlkrmJalPg-EgiZ92Eyg9YodLbQsE', label: 'MLB Top Plays' },
  { id: 'PLoeYQM_iUEVwNa9HwsFfS0aWvshxoYnhy', label: 'Orioles Moments', random: true },
];
const ORIOLES_RECAP_PLAYLIST = 'PLoeYQM_iUEVyoMu-AIZFXs9ja6GMzF1Ce';

function extractVideoId(link) {
  return link.match(/v=([^&]+)/)?.[1] || link.match(/youtu\.be\/([^?&]+)/)?.[1] || '';
}

async function fetchPlaylistVideo(pl) {
  const url = `${PROXY}?url=${encodeURIComponent(`https://www.youtube.com/feeds/videos.xml?playlist_id=${pl.id}`)}`;
  const data = await fetch(url).then(r => r.json());
  const items = data.items ?? [];
  if (!items.length) return null;
  const item = pl.random
    ? items[Math.floor(Math.random() * items.length)]
    : items[0];
  if (!item) return null;
  const link = item.link || '';
  const videoId = extractVideoId(link);
  return {
    title: cleanFeedText(item.title),
    label: pl.label,
    thumb: item.thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : ''),
    url: link,
    videoId,
  };
}

function shortGameDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d)) return '';
  const yy = String(d.getFullYear()).slice(-2);
  return `${d.getMonth() + 1}/${d.getDate()}/${yy}`;
}

function pickMlbRecapItem(game) {
  const groups = game?.content?.media?.epgAlternate ?? [];
  const items = groups.flatMap(group => group.items ?? []);
  const preferred = items.find(item =>
    item.keywordsAll?.some(keyword => keyword.value === 'mlb_recap' || keyword.value === 'game-recap')
  );
  return preferred || items.find(item =>
    item.keywordsAll?.some(keyword => keyword.value === 'condensed_game' || keyword.value === 'condensed-game')
  ) || null;
}

function thumbnailForMlbItem(item) {
  const cuts = item?.image?.cuts ?? [];
  return cuts.find(cut => cut.width === 640)?.src
    || cuts.find(cut => cut.aspectRatio === '16:9')?.src
    || '';
}

async function fetchOriolesRecapVideo() {
  const endDate = localDateStr(0);
  const startDate = localDateStr(-4);

  const [playlistData, gameData] = await Promise.all([
    fetch(`${PROXY}?url=${encodeURIComponent(`https://www.youtube.com/feeds/videos.xml?playlist_id=${ORIOLES_RECAP_PLAYLIST}`)}`).then(r => r.json()),
    fetch(`${MLB}/schedule?sportId=1&teamId=${ORIOLES_ID}&startDate=${startDate}&endDate=${endDate}&hydrate=game(content(media(epg)))`).then(r => r.json()),
  ]);

  const recapItems = playlistData.items ?? [];
  const completedGames = (gameData.dates ?? [])
    .flatMap(date => date.games ?? [])
    .filter(game => game.status?.abstractGameState === 'Final')
    .sort((a, b) => new Date(b.gameDate) - new Date(a.gameDate));
  const latestGame = completedGames[0] ?? null;
  const targetDate = latestGame?.officialDate ? shortGameDate(latestGame.officialDate) : '';

  const matchingPlaylistItem = targetDate
    ? recapItems.find(item => (item.title || '').includes(`(${targetDate})`))
    : recapItems[0];

  if (matchingPlaylistItem) {
    const link = matchingPlaylistItem.link || '';
    const videoId = extractVideoId(link);
    return {
      title: cleanFeedText(matchingPlaylistItem.title),
      label: 'Orioles Game Recaps',
      thumb: matchingPlaylistItem.thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : ''),
      url: link,
      videoId,
    };
  }

  const mlbItem = latestGame ? pickMlbRecapItem(latestGame) : null;
  if (!mlbItem) return null;

  return {
    title: cleanFeedText(mlbItem.headline || mlbItem.title || mlbItem.blurb || 'Orioles Recap'),
    label: 'Orioles Recap',
    thumb: thumbnailForMlbItem(mlbItem),
    url: `https://www.mlb.com/video/${mlbItem.slug || mlbItem.id}`,
    videoId: '',
  };
}

async function loadVideos() {
  const wrap = $('videoWrap');
  try {
    const results = await Promise.allSettled(
      [fetchOriolesRecapVideo(), ...YT_PLAYLISTS.map(fetchPlaylistVideo)]
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

// ── Podcast Widget ───────────────────────────────────────────────
const PODCAST_FEED = 'https://feeds.megaphone.fm/ESP1723897648';
const PODCAST_SHOW_URL = 'https://www.espn.com/espnradio/podcast/archive?id=2386164';


function setupPodcastHover(card) {
  if (!card) return;
  const panel = card.querySelector('.podcast-hover-panel');
  if (!panel) return;

  document.querySelectorAll('.podcast-hover-panel--floating').forEach(node => node.remove());
  panel.classList.add('podcast-hover-panel--floating');
  document.body.appendChild(panel);

  let active = false;
  const place = () => {
    const rect = card.getBoundingClientRect();
    panel.style.left = `${Math.min(rect.right + 12, window.innerWidth - panel.offsetWidth - 12)}px`;
    panel.style.top = `${Math.max(12, rect.top)}px`;
  };
  const show = () => {
    active = true;
    place();
    panel.classList.add('is-visible');
  };
  const hide = () => {
    active = false;
    panel.classList.remove('is-visible');
  };
  const refresh = () => {
    if (active) place();
  };

  card.addEventListener('mouseenter', show);
  card.addEventListener('mouseleave', hide);
  card.addEventListener('focusin', show);
  card.addEventListener('focusout', hide);
  window.addEventListener('scroll', refresh, { passive: true });
  window.addEventListener('resize', refresh);
}

async function loadPodcast() {
  const wrap = $('podcastWrap');
  try {
    // Fetch the RSS feed directly — feeds.megaphone.fm allows CORS, so no proxy needed.
    // This avoids PHP SimpleXML's enclosure-parsing quirk that yields audioUrl: null.
    const xmlText = await fetch(PODCAST_FEED).then(r => r.text());
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const allItems = Array.from(doc.querySelectorAll('channel > item'));

    const episodeIndex = allItems.findIndex(item => {
      const enc = item.querySelector('enclosure');
      return enc && enc.getAttribute('type')?.startsWith('audio/');
    });
    const rawEpisode = episodeIndex >= 0 ? allItems[episodeIndex] : null;

    if (!rawEpisode) {
      wrap.innerHTML = `<div class="podcast-card">
        <span class="podcast-kicker">Baseball Tonight</span>
        <div class="podcast-title">Podcast feed is temporarily unavailable.</div>
        <div class="podcast-links">
          <a class="podcast-link" href="${PODCAST_SHOW_URL}" target="_blank" rel="noopener">Open show page ↗</a>
        </div>
      </div>`;
      return;
    }

    const enc = rawEpisode.querySelector('enclosure');
    const audioUrl = enc?.getAttribute('url') || '';
    const audioType = enc?.getAttribute('type') || 'audio/mpeg';
    const rawTitle = rawEpisode.querySelector('title')?.textContent || 'Latest episode';
    const rawDesc = rawEpisode.querySelector('description')?.textContent || '';
    const rawDate = rawEpisode.querySelector('pubDate')?.textContent || '';
    const rawLink = rawEpisode.querySelector('link')?.textContent || PODCAST_SHOW_URL;

    const title = cleanFeedText(rawTitle);
    const description = cleanFeedText(rawDesc);
    const dateLabel = relativeDate(rawDate);
    const fallbackLabel = episodeIndex > 0
      ? '<span class="podcast-fallback-note">Showing a recent playable episode</span>'
      : '';
    const playableUrl = audioUrl;
    const titleClass = title.length > 62 ? 'podcast-title podcast-title--scroll' : 'podcast-title';
    const hoverPanel = description
      ? `<div class="podcast-hover-panel" aria-hidden="true">
          <div class="podcast-hover-title">${esc(title)}</div>
          <div class="podcast-hover-desc">${esc(description)}</div>
        </div>`
      : '';

    wrap.innerHTML = `<div class="podcast-card podcast-card--hoverable">
      <span class="podcast-kicker">Baseball Tonight</span>
      ${fallbackLabel}
      <div class="${titleClass}"><span class="podcast-title-track">${esc(title)}</span></div>
      <div class="podcast-meta">
        <span>${esc(dateLabel || 'Latest episode')}</span>
        <span>Buster Olney</span>
      </div>
      <audio class="podcast-player" controls preload="metadata">
        <source src="${playableUrl}" type="${audioType}">
        Your browser does not support the audio element.
      </audio>
      <div class="podcast-links">
        <a class="podcast-link" href="${esc(rawLink || PODCAST_SHOW_URL)}" target="_blank" rel="noopener">Episode details ↗</a>
        <a class="podcast-link" href="${PODCAST_SHOW_URL}" target="_blank" rel="noopener">Show archive ↗</a>
      </div>
      ${hoverPanel}
    </div>`;
    setupPodcastHover(wrap.querySelector('.podcast-card--hoverable'));
  } catch {
    wrap.innerHTML = `<div class="podcast-card">
      <span class="podcast-kicker">Baseball Tonight</span>
      <div class="podcast-title">Podcast feed is temporarily unavailable.</div>
      <div class="podcast-links">
        <a class="podcast-link" href="${PODCAST_SHOW_URL}" target="_blank" rel="noopener">Open show page ↗</a>
      </div>
    </div>`;
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
const leadersCache = {};
let leadersMode = 'batting';
let leadersScope = 'orioles'; // orioles | al | nl | mlb

// Ordered by scouting priority
const BATTING_ORDER = ['onBasePlusSlugging', 'sluggingPercentage', 'onBasePercentage', 'battingAverage', 'homeRuns', 'runsBattedIn', 'hits', 'baseOnBalls', 'walks'];
const PITCHING_ORDER = ['earnedRunAverage', 'walksAndHitsPerInningPitched', 'strikeoutsPer9Inn', 'strikeouts', 'walksPer9Inn', 'qualityStarts', 'wins', 'gamesStarted'];
const TEAM_LEADERS_CATS = 'onBasePlusSlugging,sluggingPercentage,onBasePercentage,battingAverage,homeRuns,runsBattedIn,hits,baseOnBalls,earnedRunAverage,walksAndHitsPerInningPitched,strikeoutsPer9Inn,strikeouts,walksPer9Inn,qualityStarts,wins,gamesStarted';
const LEAGUE_LEADERS_CATS = 'onBasePlusSlugging,sluggingPercentage,onBasePercentage,battingAverage,homeRuns,runsBattedIn,hits,walks,earnedRunAverage,walksAndHitsPerInningPitched,strikeoutsPer9Inn,strikeouts,walksPer9Inn,wins,gamesStarted';
const BATTING_LABELS = { battingAverage: 'AVG', onBasePercentage: 'OBP', onBasePlusSlugging: 'OPS', homeRuns: 'HR', hits: 'H', baseOnBalls: 'BB', walks: 'BB', sluggingPercentage: 'SLG', runsBattedIn: 'RBI' };
const PITCHING_LABELS = { earnedRunAverage: 'ERA', strikeouts: 'SO', gamesStarted: 'GS', qualityStarts: 'QS', walksAndHitsPerInningPitched: 'WHIP', wins: 'W', strikeoutsPer9Inn: 'K/9', walksPer9Inn: 'BB/9' };
// Baseball Savant custom leaderboard columns keyed to our widget stats.
// The sort direction matches leaderboard convention: higher-is-better for most
// stats, lower-is-better for run prevention stats like ERA / WHIP / BB/9.
const SAVANT_STAT_CONFIG = {
  onBasePlusSlugging: { stat: 'on_base_plus_slg', type: 'batter', sortDir: 'desc' },
  sluggingPercentage: { stat: 'slg_percent', type: 'batter', sortDir: 'desc' },
  onBasePercentage: { stat: 'on_base_percent', type: 'batter', sortDir: 'desc' },
  battingAverage: { stat: 'batting_avg', type: 'batter', sortDir: 'desc' },
  homeRuns: { stat: 'home_run', type: 'batter', sortDir: 'desc' },
  runsBattedIn: { stat: 'rbi', type: 'batter', sortDir: 'desc' },
  hits: { stat: 'h', type: 'batter', sortDir: 'desc' },
  baseOnBalls: { stat: 'bb', type: 'batter', sortDir: 'desc' },
  walks: { stat: 'bb', type: 'batter', sortDir: 'desc' },
  earnedRunAverage: { stat: 'p_era', type: 'pitcher', sortDir: 'asc' },
  walksAndHitsPerInningPitched: {
    type: 'pitcher',
    sort: 'p_walk',
    sortDir: 'asc',
    selections: ['p_walk', 'p_total_hits', 'p_formatted_ip'],
    x: 'p_walk',
    y: 'p_walk',
  },
  strikeoutsPer9Inn: {
    type: 'pitcher',
    sort: 'p_strikeout',
    sortDir: 'desc',
    selections: ['p_strikeout', 'p_formatted_ip'],
    x: 'p_strikeout',
    y: 'p_strikeout',
  },
  strikeouts: { stat: 'p_strikeout', type: 'pitcher', sortDir: 'desc' },
  walksPer9Inn: {
    type: 'pitcher',
    sort: 'p_walk',
    sortDir: 'asc',
    selections: ['p_walk', 'p_formatted_ip'],
    x: 'p_walk',
    y: 'p_walk',
  },
  qualityStarts: { stat: 'p_quality_start', type: 'pitcher', sortDir: 'desc' },
  wins: { stat: 'p_win', type: 'pitcher', sortDir: 'desc' },
  gamesStarted: { stat: 'p_starting_p', type: 'pitcher', sortDir: 'desc' },
};

function savantUrl(playerId) {
  return `https://baseballsavant.mlb.com/savant-player/${playerId}`;
}

function savantStatUrl(statKey) {
  const config = SAVANT_STAT_CONFIG[statKey];
  if (!config) return '#';
  const selections = config.selections ?? [config.stat];
  const sort = config.sort ?? config.stat;
  const x = config.x ?? sort;
  const y = config.y ?? sort;

  const url = new URL('https://baseballsavant.mlb.com/leaderboard/custom');
  url.searchParams.set('year', String(SEASON));
  url.searchParams.set('type', config.type);
  url.searchParams.set('min', 'q');
  url.searchParams.set('selections', selections.join(','));
  url.searchParams.set('sort', sort);
  url.searchParams.set('sortDir', config.sortDir);
  url.searchParams.set('chart', 'false');
  url.searchParams.set('chartType', 'beeswarm');
  url.searchParams.set('filter', '');
  url.searchParams.set('r', 'no');
  url.searchParams.set('x', x);
  url.searchParams.set('y', y);
  return url.toString();
}

function leadersFetchUrl(scope) {
  if (scope === 'orioles') {
    return `${MLB}/teams/${ORIOLES_ID}/leaders?leaderCategories=${TEAM_LEADERS_CATS}&season=${SEASON}&leaderGameTypes=R`;
  }
  // MLB Stats API league IDs: AL=103, NL=104
  const leagueParam = scope === 'al' ? '&leagueId=103' : scope === 'nl' ? '&leagueId=104' : '';
  return `${MLB}/stats/leaders?leaderCategories=${LEAGUE_LEADERS_CATS}&season=${SEASON}&leaderGameTypes=R${leagueParam}&limit=1`;
}

function parseLeadersData(categories) {
  const sortBy = (items, order) => items.sort((a, b) =>
    (order.indexOf(a.key) === -1 ? 99 : order.indexOf(a.key)) - (order.indexOf(b.key) === -1 ? 99 : order.indexOf(b.key)));
  const batting = sortBy(
    categories.filter(c => BATTING_LABELS[c.leaderCategory] && c.statGroup === 'hitting')
      .map(c => ({ key: c.leaderCategory, label: BATTING_LABELS[c.leaderCategory], leaders: c.leaders })),
    BATTING_ORDER);
  const pitching = sortBy(
    categories.filter(c => PITCHING_LABELS[c.leaderCategory] && c.statGroup === 'pitching')
      .map(c => ({ key: c.leaderCategory, label: PITCHING_LABELS[c.leaderCategory], leaders: c.leaders })),
    PITCHING_ORDER);
  return { batting, pitching };
}

async function loadLeaders() {
  const wrap = $('leadersWrap');
  try {
    const url = leadersFetchUrl(leadersScope);
    if (!leadersCache[leadersScope]) {
      const data = await fetch(url).then(r => r.json());
      const categories = leadersScope === 'orioles' ? (data.teamLeaders ?? []) : (data.leagueLeaders ?? []);
      leadersCache[leadersScope] = parseLeadersData(categories);
    }
    renderLeaders();
  } catch {
    wrap.innerHTML = '<span class="sidebar-msg">Unavailable</span>';
  }
}

function renderLeaders() {
  const wrap = $('leadersWrap');
  const cached = leadersCache[leadersScope];
  if (!cached) { wrap.innerHTML = '<span class="sidebar-msg">Loading…</span>'; return; }

  wrap.innerHTML = `
    <div class="leaders-controls">
      <div class="leaders-scope">
        <button class="leaders-scope-btn${leadersScope === 'orioles' ? ' active' : ''}" data-scope="orioles">O's</button>
        <button class="leaders-scope-btn${leadersScope === 'al' ? ' active' : ''}" data-scope="al">AL</button>
        <button class="leaders-scope-btn${leadersScope === 'nl' ? ' active' : ''}" data-scope="nl">NL</button>
        <button class="leaders-scope-btn${leadersScope === 'mlb' ? ' active' : ''}" data-scope="mlb">MLB</button>
      </div>
    </div>
    <div class="leaders-stack">
      <div class="leaders-group">
        <div class="leaders-group-title">Batting</div>
        <div class="leaders-list">${cached.batting.map(cat => {
          const top = cat.leaders?.[0];
          if (!top) return '';
          const fullName = top.person?.fullName ?? '';
          const name = fullName.split(' ').pop() ?? '';
          const pid = top.person?.id;
          const playerLink = pid ? savantUrl(pid) : '#';
          const statLink = savantStatUrl(cat.key);
          return `<div class="leader-item">
            <a class="leader-cat" href="${statLink}" target="_blank" rel="noopener">${esc(cat.label)}</a>
            <a class="leader-name" href="${playerLink}" target="_blank" rel="noopener">${esc(name)}</a>
            <span class="leader-val">${esc(top.value)}</span>
          </div>`;
        }).join('')}</div>
      </div>
      <div class="leaders-group">
        <div class="leaders-group-title">Pitching</div>
        <div class="leaders-list">${cached.pitching.map(cat => {
          const top = cat.leaders?.[0];
          if (!top) return '';
          const fullName = top.person?.fullName ?? '';
          const name = fullName.split(' ').pop() ?? '';
          const pid = top.person?.id;
          const playerLink = pid ? savantUrl(pid) : '#';
          const statLink = savantStatUrl(cat.key);
          return `<div class="leader-item">
            <a class="leader-cat" href="${statLink}" target="_blank" rel="noopener">${esc(cat.label)}</a>
            <a class="leader-name" href="${playerLink}" target="_blank" rel="noopener">${esc(name)}</a>
            <span class="leader-val">${esc(top.value)}</span>
          </div>`;
        }).join('')}</div>
      </div>
    </div>`;

  wrap.querySelectorAll('.leaders-scope-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      leadersScope = btn.dataset.scope;
      loadLeaders();
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
    setViewMode(btn.dataset.view);
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
    setViewMode(btn.dataset.defview, { render: false });
    $('defaultViewToggle').querySelectorAll('.theme-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.defview === btn.dataset.defview));
    renderArticles();
  });
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    const p = loadPrefs();
    if (p.theme === 'system') applyTheme('system');
  });

  // Right sidebar accordion: one open widget at a time
  document.querySelectorAll('.section-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const section = toggle.closest('.sidebar-section');
      const sidebar = section.closest('.sidebar');
      const isRightSidebar = sidebar?.classList.contains('sidebar-right');

      if (!isRightSidebar) {
        section.classList.toggle('collapsed');
        return;
      }

      const isCollapsed = section.classList.contains('collapsed');

      sidebar.querySelectorAll('.sidebar-section').forEach(peer => {
        if (peer !== section) peer.classList.add('collapsed');
      });

      section.classList.toggle('collapsed', !isCollapsed);
    });
  });

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
    if (e.key !== 'Enter') return;
    const trigger = e.target.value.trim().toLowerCase();
    if (trigger === 'magic') {
      e.preventDefault();
      triggerOriolesMagic();
    } else if (trigger === 'heritage') {
      e.preventDefault();
      triggerHeritageMode();
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
  const container = document.createElement('div');
  container.className = 'magic-confetti';
  const birdNum = Math.floor(Math.random() * 10) + 1;
  container.innerHTML = `<div class="magic-banner"><img src="/yardreport/img/randBird${birdNum}.png" alt="Oriole Bird" class="magic-bird"></div>`;
  document.body.appendChild(container);

  const audio = new Audio('/yardreport/audio/orioles_magic_short.mp3');
  audio.volume = 0.7;
  let confettiInterval = null;
  let confettiKickoff = null;
  let fallbackDismissTimer = null;
  let isDismissing = false;

  function emitConfettiBurst() {
    if (!container.isConnected) return;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const colors = ['#df4601', '#000', '#fff', '#f59e0b', '#ff6b1a'];

    for (let i = 0; i < 48; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-burst';
      const angle = Math.random() * Math.PI * 2;
      const dist = 160 + Math.random() * 420;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      piece.style.left = cx + 'px';
      piece.style.top = cy + 'px';
      piece.style.setProperty('--dx', dx + 'px');
      piece.style.setProperty('--dy', dy + 'px');
      piece.style.animationDelay = Math.random() * 0.18 + 's';
      piece.style.animationDuration = (0.9 + Math.random() * 1.2) + 's';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.width = (4 + Math.random() * 8) + 'px';
      piece.style.height = (4 + Math.random() * 8) + 'px';
      piece.addEventListener('animationend', () => piece.remove(), { once: true });
      container.appendChild(piece);
    }
  }

  const dismiss = () => {
    if (isDismissing) return;
    isDismissing = true;
    clearTimeout(confettiKickoff);
    clearInterval(confettiInterval);
    clearTimeout(fallbackDismissTimer);
    audio.pause();
    audio.currentTime = 0;
    container.classList.add('magic-fade-out');
    setTimeout(() => container.remove(), 600);
    document.removeEventListener('keydown', onKey);
  };
  const onKey = e => { if (e.key === 'Escape') dismiss(); };
  document.addEventListener('keydown', onKey);
  container.addEventListener('click', dismiss);

  audio.addEventListener('ended', dismiss);
  audio.play().catch(() => {
    fallbackDismissTimer = setTimeout(dismiss, 5000);
  });

  // Keep the confetti active for the entire time the magic banner is visible.
  confettiKickoff = setTimeout(() => {
    emitConfettiBurst();
    confettiInterval = setInterval(emitConfettiBurst, 650);
  }, 600);
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

function dismissHeritageMode() {
  clearTimeout(heritageTimer);
  heritageTimer = null;

  const html = document.documentElement;
  html.classList.remove('heritage-mode');

  const badge = document.getElementById('heritageBadge');
  if (badge) {
    badge.classList.add('heritage-badge-exit');
    setTimeout(() => badge.remove(), 350);
  }

  if (heritagePreviousView) {
    setViewMode(heritagePreviousView);
    heritagePreviousView = null;
  }
}

function triggerHeritageMode() {
  const html = document.documentElement;
  const alreadyActive = html.classList.contains('heritage-mode');

  if (!alreadyActive) {
    heritagePreviousView = state.viewMode;
  }

  html.classList.add('heritage-mode');
  setViewMode('grid');

  let badge = document.getElementById('heritageBadge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'heritageBadge';
    badge.className = 'heritage-badge';
    badge.innerHTML = `
      <span class="heritage-badge-top">Yard Report</span>
      <span class="heritage-badge-main">Heritage Edition</span>
      <span class="heritage-badge-sub">Baseball card mode</span>`;
    document.body.appendChild(badge);
  } else {
    badge.classList.remove('heritage-badge-exit');
  }

  clearTimeout(heritageTimer);
  heritageTimer = setTimeout(dismissHeritageMode, 15000);
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
    loadPodcast(),
    loadVideos(),
  ]);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
