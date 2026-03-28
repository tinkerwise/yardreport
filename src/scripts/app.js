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
const MLB = 'https://statsapi.mlb.com/api/v1';
const ORIOLES_ID = 110;
const SEASON = new Date().getFullYear();

// ── State ─────────────────────────────────────────────────────────
const state = {
  articles: [],
  activeCategory: 'all',
  activeSource: 'all',
  searchQuery: '',
  sortBy: 'date',
  standings: [],
  activeDiv: null,
};

// ── Utilities ─────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

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

  let statusHtml = '';
  if (isLive) {
    const half = g.linescore?.inningHalf === 'Top' ? '▲' : '▼';
    const inn = g.linescore?.currentInning ?? '';
    statusHtml = `<span class="live-dot"></span><span class="score-status">${half}${inn}</span>`;
  } else if (isDone) {
    statusHtml = `<span class="score-status">F</span>`;
  } else {
    statusHtml = `<span class="score-status">${formatGameTime(g.gameDate)}</span>`;
  }

  const awayScore = (!isPre && away.score != null) ? `<span class="score-val">${away.score}</span>` : '';
  const homeScore = (!isPre && home.score != null) ? `<span class="score-val">${home.score}</span>` : '';

  return `<a class="score-chip${hasOrioles ? ' orioles' : ''}"
      href="https://www.mlb.com/gameday/${g.gamePk}/final/box-score"
      target="_blank" rel="noopener" title="${esc(away.team.name)} @ ${esc(home.team.name)}">
    <span class="score-team">${esc(teamAbbr(away.team))}</span>
    ${awayScore}
    <span class="score-sep">@</span>
    <span class="score-team">${esc(teamAbbr(home.team))}</span>
    ${homeScore}
    ${statusHtml}
  </a>`;
}

async function loadScores() {
  const track = $('scoresTrack');
  try {
    const today = new Date().toISOString().slice(0, 10);
    const yd = new Date(Date.now() - 864e5).toISOString().slice(0, 10);

    const [todayData, ydData] = await Promise.all([
      fetch(`${MLB}/schedule?sportId=1&date=${today}&hydrate=linescore,team`).then(r => r.json()),
      fetch(`${MLB}/schedule?sportId=1&date=${yd}&hydrate=linescore,team`).then(r => r.json()),
    ]);

    const todayGames = sortGamesOrioles(todayData.dates?.[0]?.games ?? []);
    const ydGames    = sortGamesOrioles(ydData.dates?.[0]?.games ?? []);

    let html = '';
    if (ydGames.length) {
      html += '<span class="scores-day-label">Yesterday</span>';
      html += ydGames.map(renderGameChip).join('');
    }
    if (todayGames.length) {
      html += '<span class="scores-day-label">Today</span>';
      html += todayGames.map(renderGameChip).join('');
    }
    track.innerHTML = html || '<span class="scores-msg">No games scheduled</span>';

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
      <tbody>${div.teams.map(t => `
        <tr class="${t.isOrioles ? 'orioles-row' : ''}">
          <td class="team-abbrev">${esc(t.abbrev)}</td>
          <td>${t.wins}</td><td>${t.losses}</td>
          <td>${esc(t.gb)}</td><td>${esc(t.streak)}</td>
        </tr>`).join('')}
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
      state.articles.push({ ...article, source });
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

  if (state.activeCategory !== 'all') {
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

function renderArticles() {
  const list = $('articleList');
  const arts = getFilteredArticles();

  $('resultCount').textContent = `${arts.length} article${arts.length !== 1 ? 's' : ''}`;

  if (!arts.length) {
    list.innerHTML = '<div class="feed-msg">No articles match your filters.</div>';
    return;
  }

  list.innerHTML = arts.map((a, i) => {
    const thumb = a.thumbnail
      ? `<img class="article-thumb" src="${esc(a.thumbnail)}" alt="" loading="lazy"
           onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'article-thumb-placeholder',textContent:'⚾'}))">`
      : `<div class="article-thumb-placeholder">⚾</div>`;

    return `<div class="article-card" data-idx="${i}" role="button" tabindex="0">
      ${thumb}
      <div class="article-body">
        <div class="article-meta">
          <span class="source-badge" style="background:${esc(a.source.color)}">${esc(a.source.name)}</span>
          <span class="article-date">${relativeDate(a.pubDate)}</span>
        </div>
        <div class="article-title">${esc(a.title)}</div>
        ${a.description ? `<div class="article-desc">${esc(a.description)}</div>` : ''}
        <div class="article-actions">
          <button class="btn-read" data-idx="${i}">Read</button>
          <a class="btn-original" href="${esc(a.link)}" target="_blank" rel="noopener"
             onclick="event.stopPropagation()">↗ Original</a>
        </div>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('[data-idx]').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.tagName === 'A') return;
      const idx = Number(el.dataset.idx ?? el.closest('[data-idx]')?.dataset.idx);
      openReader(arts[idx]);
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') el.click();
    });
  });
}

// ── Reader View ───────────────────────────────────────────────────
function openReader(article) {
  $('readerTitle').textContent = article.title;
  $('readerDate').textContent = relativeDate(article.pubDate);
  $('readerLink').href = article.link;

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

// ── Refresh ───────────────────────────────────────────────────────
async function refresh() {
  const btn = $('refreshBtn');
  btn.disabled = true;
  btn.classList.add('spinning');
  await Promise.allSettled([loadFeeds(), loadScores(), loadStandings()]);
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

  // Category filters
  $('categoryFilters').addEventListener('click', e => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    state.activeCategory = pill.dataset.category;
    $('categoryFilters').querySelectorAll('.pill').forEach(p =>
      p.classList.toggle('active', p.dataset.category === state.activeCategory));
    renderArticles();
  });

  // Reader close
  $('readerClose').addEventListener('click', closeReader);
  $('readerOverlay').addEventListener('click', e => {
    if (e.target === $('readerOverlay')) closeReader();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeReader();
  });

  // Auto-refresh scores every 5 minutes
  setInterval(loadScores, 5 * 60 * 1000);
}

async function init() {
  setupEvents();

  // Load all data in parallel
  const [, , sources] = await Promise.allSettled([
    loadScores(),
    loadStandings(),
    loadFeeds(),
  ]);

  const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  $('cacheLabel').textContent = `Updated ${now}`;
}

document.addEventListener('DOMContentLoaded', init);
