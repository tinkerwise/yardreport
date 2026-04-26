// ── Schedule ──────────────────────────────────────────────────────
import './theme.js';
import { MLB, ORIOLES_ID, SEASON, TEAM_ABBREV } from './config.js';
import { esc } from './utils.js';
import { fetchWeatherForGames, getGameWeather } from './weather.js';

// ── Constants ─────────────────────────────────────────��───────
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const NATIONAL_TV = ['ESPN','ESPN2','FOX','FS1','FS2','TBS','Apple TV+','Peacock','MLBN','MLB Network'];

// ── State ─────────────────────────────────────────────────────
let allGames = [];
let seriesMap = new Map();
let viewMode = 'month';
let viewDate = new Date();

// ── Date helpers ──────────────────────────────────────────────
function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function todayStr() { return dateStr(new Date()); }
function gameOfficialDate(g) { return g.officialDate || g.gameDate.slice(0, 10); }

// ── Game helpers ──────────────────────────────────────────────
function oriIsHome(g)  { return g.teams.home.team.id === ORIOLES_ID; }
function oriSide(g)    { return oriIsHome(g) ? g.teams.home : g.teams.away; }
function oppSide(g)    { return oriIsHome(g) ? g.teams.away : g.teams.home; }
function getOpponent(g) { return oppSide(g).team; }

function getResult(g) {
  if (g.status?.abstractGameState !== 'Final') return null;
  const ori = oriSide(g);
  const opp = oppSide(g);
  return {
    result: g.isTie ? 'T' : (ori.isWinner ? 'W' : 'L'),
    oriScore: ori.score ?? 0,
    oppScore: opp.score ?? 0,
  };
}

function oriProbable(g) {
  const p = oriSide(g).probablePitcher;
  if (!p?.fullName) return null;
  const parts = p.fullName.trim().split(/\s+/);
  return parts.at(-1);
}

function getBroadcast(g) {
  const tv = (g.broadcasts ?? []).filter(b => b.type === 'TV' && b.language !== 'es');
  const national = tv.find(b => NATIONAL_TV.some(n => b.name?.includes(n)));
  if (national) return national.name;
  const local = tv.find(b => b.name?.includes('MASN'));
  return local?.name ?? null;
}

// ── Series detection ──────────────────────────────────────────
function buildSeries(games) {
  const sorted = [...games].sort((a, b) => new Date(a.gameDate) - new Date(b.gameDate));
  seriesMap = new Map();
  let group = [];
  let lastOppId = null;

  const finalize = grp => grp.forEach((g, i) => {
    seriesMap.set(g.gamePk, {
      gameNum: i + 1,
      total: grp.length,
      isFirst: i === 0,
      isLast: i === grp.length - 1,
    });
  });

  for (const g of sorted) {
    const oppId = getOpponent(g).id;
    if (group.length > 0) {
      const lastDay = new Date(gameOfficialDate(group.at(-1)));
      const thisDay = new Date(gameOfficialDate(g));
      const diff = (thisDay - lastDay) / (1000 * 60 * 60 * 24);
      if (oppId === lastOppId && diff <= 2) {
        group.push(g);
        continue;
      }
      finalize(group);
    }
    group = [g];
    lastOppId = oppId;
  }
  if (group.length > 0) finalize(group);
}

// ── Chip rendering ────────────────────────────────────────────
function renderChip(g, compact = false) {
  const opp     = getOpponent(g);
  const home    = oriIsHome(g);
  const result  = getResult(g);
  const state   = g.status?.abstractGameState;
  const sd      = seriesMap.get(g.gamePk);
  const weather = getGameWeather(g);
  const probable  = oriProbable(g);
  const broadcast = getBroadcast(g);
  const abbr    = TEAM_ABBREV[opp.id] ?? (opp.abbreviation ?? opp.name.slice(0, 3).toUpperCase());
  const haStr   = home ? 'vs' : '@';
  const logoSrc = `https://www.mlbstatic.com/team-logos/${opp.id}.svg`;
  const gameUrl = `https://www.mlb.com/gameday/${g.gamePk}`;

  let chipClass = `sch-chip${home ? ' chip--home' : ''}`;
  let statusHtml = '';

  if (result) {
    statusHtml = `<span class="chip-result">${result.result} ${result.oriScore}–${result.oppScore}</span>`;
  } else if (state === 'Live') {
    chipClass += ' chip--live';
    const half = g.linescore?.inningHalf === 'Top' ? '▲' : '▼';
    const inn  = g.linescore?.currentInning ?? '';
    statusHtml = `<span class="chip-live">${half}${inn}</span>`;
  } else {
    const t = new Date(g.gameDate).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit',
    });
    statusHtml = `<span class="chip-time">${esc(t)}</span>`;
  }

  const seriesBadge = sd && sd.total > 1
    ? `<span class="chip-series-badge" title="Game ${sd.gameNum} of ${sd.total}">G${sd.gameNum}/${sd.total}</span>`
    : '';
  const wxHtml = weather && !result
    ? `<span class="chip-wx">${weather.emoji} ${weather.temp}°</span>`
    : '';

  if (compact) {
    return `<a class="${chipClass}" href="${esc(gameUrl)}" target="_blank" rel="noopener noreferrer">
      <div class="chip-row1">
        <img class="chip-logo" src="${esc(logoSrc)}" alt="${esc(abbr)}" width="18" height="18" loading="lazy" decoding="async">
        <span class="chip-ha">${haStr}</span>
        <span class="chip-abbr">${esc(abbr)}</span>
        ${seriesBadge}
      </div>
      <div class="chip-row2">${statusHtml}${wxHtml}</div>
    </a>`;
  }

  const seriesInfo  = sd && sd.total > 1 ? `<span class="chip-series-info">Game ${sd.gameNum} of ${sd.total}</span>` : '';
  const probHtml    = probable && !result ? `<span class="chip-probable">${esc(probable)}</span>` : '';
  const bcastHtml   = broadcast ? `<span class="chip-broadcast">${esc(broadcast)}</span>` : '';
  const oppName     = opp.name ?? abbr;

  return `<a class="${chipClass} sch-chip--full" href="${esc(gameUrl)}" target="_blank" rel="noopener noreferrer">
    <div class="chip-full-header">
      <img class="chip-logo" src="${esc(logoSrc)}" alt="${esc(abbr)}" width="24" height="24" loading="lazy" decoding="async">
      <div class="chip-full-matchup">
        <span class="chip-full-ha">${haStr} ${esc(oppName)}</span>
        ${seriesInfo}
      </div>
    </div>
    <div class="chip-full-status">${statusHtml}${wxHtml}</div>
    ${probHtml || bcastHtml ? `<div class="chip-full-meta">${probHtml}${bcastHtml}</div>` : ''}
  </a>`;
}

// ── Month view ────────────────────────────────────────────────
function renderMonth() {
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  document.getElementById('schTitle').textContent = `${MONTHS[month]} ${year}`;

  const monthGames = allGames.filter(g => {
    const d = new Date(g.gameDate);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const byDate = {};
  for (const g of monthGames) {
    const key = gameOfficialDate(g);
    (byDate[key] = byDate[key] ?? []).push(g);
  }

  const today      = todayStr();
  const firstDow   = new Date(year, month, 1).getDay();
  const daysInMo   = new Date(year, month + 1, 0).getDate();

  const seriesFirstByDate = {};
  for (const g of monthGames) {
    const sd = seriesMap.get(g.gamePk);
    if (sd?.isFirst && sd.total > 1) {
      const key = gameOfficialDate(g);
      const opp = getOpponent(g);
      const abbr = TEAM_ABBREV[opp.id] ?? opp.abbreviation ?? opp.name.slice(0,3).toUpperCase();
      const haStr = oriIsHome(g) ? 'vs' : '@';
      seriesFirstByDate[key] = `${haStr} ${abbr} (${sd.total}-game series)`;
    }
  }

  let html = '<div class="cal-grid">';
  for (const d of DAYS_SHORT) html += `<div class="cal-hdr">${d}</div>`;
  for (let i = 0; i < firstDow; i++) html += '<div class="cal-cell cal-cell--empty"></div>';

  for (let day = 1; day <= daysInMo; day++) {
    const key   = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const games = byDate[key] ?? [];
    const isToday = key === today;
    const seriesLabel = seriesFirstByDate[key]
      ? `<span class="cal-series-label">${esc(seriesFirstByDate[key])}</span>`
      : '';

    html += `<div class="cal-cell${isToday ? ' cal-cell--today' : ''}${games.length ? ' cal-cell--game' : ''}">
      <span class="cal-day">${day}</span>
      ${seriesLabel}
      ${games.map(g => renderChip(g, true)).join('')}
    </div>`;
  }

  html += '</div>';
  document.getElementById('scheduleGrid').innerHTML = html;
}

// ── Week view ─────────────────────────────────────────────────
function getWeekStart(ref) {
  const d = new Date(ref);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function renderWeek() {
  const weekStart = getWeekStart(viewDate);
  const weekDays  = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const s = weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const e = weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  document.getElementById('schTitle').textContent = `${s} – ${e}`;

  const today = todayStr();
  let html = '<div class="week-grid">';

  for (const d of weekDays) {
    const key      = dateStr(d);
    const isToday  = key === today;
    const dayGames = allGames.filter(g => gameOfficialDate(g) === key);
    const dayName  = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum   = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    let stretchLabel = '';
    if (dayGames.length) {
      const isHome = oriIsHome(dayGames[0]);
      stretchLabel = isHome ? '🏟 Home' : '✈ Away';
    }

    html += `<div class="week-col${isToday ? ' week-col--today' : ''}">
      <div class="week-col-hdr">
        <span class="week-day-name">${dayName}</span>
        <span class="week-day-num">${dayNum}</span>
        ${stretchLabel ? `<span class="week-stretch-label">${stretchLabel}</span>` : ''}
      </div>
      <div class="week-col-body">
        ${dayGames.length
          ? dayGames.map(g => renderChip(g, false)).join('')
          : '<span class="week-empty">—</span>'
        }
      </div>
    </div>`;
  }

  html += '</div>';
  document.getElementById('scheduleGrid').innerHTML = html;
}

// ── Render + Navigation ───────────────────────────────────────
function render() {
  if (viewMode === 'month') renderMonth();
  else renderWeek();
}

document.getElementById('prevBtn').addEventListener('click', () => {
  if (viewMode === 'month') viewDate.setMonth(viewDate.getMonth() - 1);
  else viewDate.setDate(viewDate.getDate() - 7);
  render();
});

document.getElementById('nextBtn').addEventListener('click', () => {
  if (viewMode === 'month') viewDate.setMonth(viewDate.getMonth() + 1);
  else viewDate.setDate(viewDate.getDate() + 7);
  render();
});

document.getElementById('todayBtn').addEventListener('click', () => {
  viewDate = new Date();
  render();
});

document.querySelectorAll('.sch-view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sch-view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    viewMode = btn.dataset.view;
    render();
  });
});

// ── Load ──────────────────────────────────────────────���───────
async function loadSchedule() {
  const grid = document.getElementById('scheduleGrid');
  try {
    const url = `${MLB}/schedule?sportId=1&teamId=${ORIOLES_ID}&season=${SEASON}`
      + `&gameType=R,F,D,L,W`
      + `&hydrate=team,linescore,decisions,probablePitcher(note),broadcasts(all),venue`
      + `&startDate=${SEASON}-01-01&endDate=${SEASON}-12-31`;
    const data = await fetch(url).then(r => r.json());
    allGames = (data.dates ?? []).flatMap(d => d.games ?? []);
    buildSeries(allGames);

    const now     = Date.now();
    const tenDays = 10 * 24 * 60 * 60 * 1000;
    const upcoming = allGames.filter(g => {
      const t = new Date(g.gameDate).getTime();
      return t > now - 86400000 && t < now + tenDays && g.status?.abstractGameState !== 'Final';
    });
    if (upcoming.length) await fetchWeatherForGames(upcoming);

    render();
  } catch {
    grid.innerHTML = '<div class="sch-msg">Schedule unavailable — please try again later.</div>';
  }
}

loadSchedule();
