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

// ── State ─────────────────────────────────────────────────────────
const state = {
  articles: [],
  activeCategory: 'all',
  activeSource: 'all',
  searchQuery: '',
  sortBy: 'date',
  viewMode: window.innerWidth <= 600 ? 'list' : 'grid',  // grid | list | compact
  standings: [],
  activeDiv: null,
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

function extractThumbnail(article) {
  if (article.thumbnail) return article.thumbnail;
  const content = article.content || '';
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) return match[1];
  const descMatch = (article.description || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  if (descMatch) return descMatch[1];
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

  let statusHtml = '';
  if (isLive) {
    const half = g.linescore?.inningHalf === 'Top' ? '▲' : '▼';
    const inn = g.linescore?.currentInning ?? '';
    statusHtml = `<span class="chip-status live"><span class="live-dot"></span> ${half}${inn}</span>`;
  } else if (isDone) {
    statusHtml = `<span class="chip-status final">Final</span>`;
  } else {
    statusHtml = `<span class="chip-status preview">${formatGameTime(g.gameDate)}</span>`;
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

  return `<a class="score-chip ${stateClass}${hasOrioles ? ' orioles' : ''}"
      href="${gamedayUrl}"
      target="_blank" rel="noopener" title="${esc(away.team.name)} @ ${esc(home.team.name)}">
    <div class="chip-row${awayWin ? ' winner' : ''}">
      <span class="chip-team">${esc(teamAbbr(away.team))}</span>
      <span class="chip-score">${awayScore}</span>
    </div>
    <div class="chip-row${homeWin ? ' winner' : ''}">
      <span class="chip-team">${esc(teamAbbr(home.team))}</span>
      <span class="chip-score">${homeScore}</span>
    </div>
    ${statusHtml}
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

async function loadScores() {
  const track = $('scoresTrack');
  try {
    const yesterday = localDateStr(-1);
    const today = localDateStr(0);
    const tomorrow = localDateStr(1);

    const [ydData, todayData, tmData] = await Promise.all([
      fetch(`${MLB}/schedule?sportId=1&date=${yesterday}&hydrate=linescore,team`).then(r => r.json()),
      fetch(`${MLB}/schedule?sportId=1&date=${today}&hydrate=linescore,team`).then(r => r.json()),
      fetch(`${MLB}/schedule?sportId=1&date=${tomorrow}&hydrate=linescore,team`).then(r => r.json()),
    ]);

    const days = [
      { label: dayLabel(yesterday), games: sortGamesOrioles(ydData.dates?.[0]?.games ?? []) },
      { label: dayLabel(today),     games: sortGamesOrioles(todayData.dates?.[0]?.games ?? []) },
      { label: dayLabel(tomorrow),  games: sortGamesOrioles(tmData.dates?.[0]?.games ?? []) },
    ];

    let html = '';
    for (const day of days) {
      if (day.games.length) {
        const id = day.label === 'Today' ? ' id="todayLabel"' : '';
        html += `<span class="scores-day-label"${id}>${day.label}</span>`;
        html += day.games.map(renderGameChip).join('');
      }
    }
    track.innerHTML = html || '<span class="scores-msg">No games scheduled</span>';

    // Scroll today's games into view
    const todayEl = document.getElementById('todayLabel');
    if (todayEl) {
      const bar = track.parentElement;
      bar.scrollLeft = todayEl.offsetLeft - 12;
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
  const thirtyDaysAgo = Date.now() - 30 * 864e5;

  // Only show last 30 days unless searching
  if (!state.searchQuery) {
    arts = arts.filter(a => {
      const d = new Date(a.pubDate);
      return !isNaN(d) && d.getTime() > thirtyDaysAgo;
    });
  }

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

  const thumbImg = imgSrc
    ? `<img class="article-thumb" src="${esc(imgSrc)}" alt="" loading="lazy"
         onerror="this.outerHTML='<div class=\\'article-thumb-placeholder\\'><img class=\\'placeholder-logo\\' src=\\'${PLACEHOLDER_IMG}\\' alt=\\'\\'></div>'">`
    : `<div class="article-thumb-placeholder"><img class="placeholder-logo" src="${PLACEHOLDER_IMG}" alt=""></div>`;

  const source = `<span class="source-line">
    <img class="source-ico" src="${esc(favicon)}" alt="" onerror="this.style.display='none'">
    <span class="source-name">${esc(a.source.name)}</span>
    <span class="article-date">${relativeDate(a.pubDate)}</span>
    ${hasFullContent ? '<span class="full-badge">Full</span>' : ''}
  </span>`;

  if (mode === 'compact') {
    return `<div class="article-card compact" data-idx="${i}" role="button" tabindex="0">
      ${source}
      <div class="article-title">${esc(a.title)}</div>
    </div>`;
  }

  if (mode === 'list') {
    return `<div class="article-card list-view" data-idx="${i}" role="button" tabindex="0">
      ${thumbImg}
      <div class="article-body">
        ${source}
        <div class="article-title">${esc(a.title)}</div>
        ${a.description ? `<div class="article-desc">${esc(a.description)}</div>` : ''}
      </div>
    </div>`;
  }

  // Grid mode (default)
  return `<div class="article-card" data-idx="${i}" role="button" tabindex="0">
    ${thumbImg}
    <div class="article-body">
      ${source}
      <div class="article-title">${esc(a.title)}</div>
      ${a.description ? `<div class="article-desc">${esc(a.description)}</div>` : ''}
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
    : `${countText} <span class="date-hint">· Last 30 days · Search for older</span>`;

  if (!arts.length) {
    list.innerHTML = '<div class="feed-msg">No articles match your filters.</div>';
    return;
  }

  const gridClass = state.viewMode === 'list' || state.viewMode === 'compact'
    ? 'article-grid list-layout' : 'article-grid';

  let html = '';
  const useGroups = state.sortBy === 'dateGroup' || state.sortBy === 'source';

  if (useGroups) {
    const keyFn = state.sortBy === 'dateGroup'
      ? a => articleDateGroup(a.pubDate)
      : a => a.source.name;

    const groups = groupArticles(arts, keyFn);

    for (const [label, items] of groups) {
      html += `<div class="article-group-header">${esc(label)}<span class="group-count">${items.length}</span></div>`;
      html += `<div class="${gridClass}">`;
      html += items.map(({ article, idx }) => renderCard(article, idx)).join('');
      html += `</div>`;
    }
  } else {
    html += `<div class="${gridClass}">`;
    html += arts.map((a, i) => renderCard(a, i)).join('');
    html += `</div>`;
  }

  list.innerHTML = html;

  list.querySelectorAll('.article-card').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.tagName === 'A') return;
      const idx = Number(el.dataset.idx);
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
