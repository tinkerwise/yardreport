// ── Postseason page ──────────────────────────────────────────────
// Everything here is derived live from the MLB Stats API: the bracket is
// seeded from final regular-season standings, then each slot is filled
// with whatever postseason series the schedule shows for those teams.
// public/postseason.json only carries optional manual overrides.
import './theme.js';
import { MLB, ORIOLES_ID, PROXY, SEASON, TEAM_ABBREV, TEAM_SLUG } from './config.js';
import { $, esc, teamLogoSrc, cleanFeedText, extractThumbnail, renderNewsThumbCard, fetchOgImage, decodeHtmlEntities, formatGameTime, localDateStr, savantUrl } from './utils.js';
import { getScoreChipStatus } from './scores.js';
import { fetchStandings, fetchLeagueLeaders } from './mlbApi.js';

const ROUNDS = {
  F: { key: 'wc', label: 'Wild Card Series', short: 'Wild Card', bestOf: 3 },
  D: { key: 'ds', label: 'Division Series', short: 'Division Series', bestOf: 5 },
  L: { key: 'cs', label: 'Championship Series', short: 'LCS', bestOf: 7 },
  W: { key: 'ws', label: 'World Series', short: 'World Series', bestOf: 7 },
};
const ROUND_ORDER = ['F', 'D', 'L', 'W'];

// League membership is stable, and knowing it locally means the bracket
// doesn't depend on a hydrated team object to split AL from NL.
const AL_TEAMS = new Set([108, 110, 111, 114, 116, 117, 118, 133, 136, 139, 140, 141, 142, 145, 147]);
const leagueOf = id => (AL_TEAMS.has(id) ? 'AL' : 'NL');
const isRealTeam = id => id in TEAM_ABBREV;
const abbr = id => TEAM_ABBREV[id] ?? 'TBD';

const state = {
  games: [],          // every postseason game, placeholders included
  series: new Map(),  // key → series
  seeds: null,        // { AL: [id x6], NL: [id x6] } (index 0 = seed 1)
  standings: null,    // regular-season teamRecords keyed by team id
  teamNames: {},      // id → { name, teamName }
  config: {},
  selectedSeries: null,
  loadFailed: false,  // true when MLB's schedule couldn't be fetched at all
  newsFilter: 'all',
  news: [],
};

// ── Data: postseason schedule ─────────────────────────────────────
const SCHEDULE_HYDRATE = 'team,linescore,probablePitcher,broadcasts(all),seriesStatus';

async function fetchPostseasonGames() {
  const urls = [
    `${MLB}/schedule/postseason?season=${SEASON}&hydrate=${SCHEDULE_HYDRATE}`,
    `${MLB}/schedule?sportId=1&season=${SEASON}&gameTypes=F,D,L,W&hydrate=${SCHEDULE_HYDRATE}`,
  ];
  // Returns [] when MLB answered but has no postseason games yet, and
  // null when every request failed, so the page can say which it was.
  let answered = false;
  for (const url of urls) {
    try {
      const data = await fetch(url).then(r => r.json());
      answered = true;
      const games = (data.dates ?? []).flatMap(d => d.games ?? []).filter(g => ROUNDS[g.gameType]);
      if (games.length) return dedupeGames(games);
    } catch { /* fall through to next source */ }
  }
  return answered ? [] : null;
}

// A postponed game shows up on both its original and rescheduled dates
// under the same gamePk — keep only the latest listing.
function dedupeGames(games) {
  const byPk = new Map();
  for (const g of games) {
    const prev = byPk.get(g.gamePk);
    if (!prev || new Date(g.gameDate) >= new Date(prev.gameDate)) byPk.set(g.gamePk, g);
  }
  return [...byPk.values()].sort((a, b) => new Date(a.gameDate) - new Date(b.gameDate));
}

function seriesKey(type, a, b) {
  return `${type}:${Math.min(a, b)}-${Math.max(a, b)}`;
}

function buildSeries(games) {
  const map = new Map();
  for (const g of games) {
    const away = g.teams?.away?.team?.id;
    const home = g.teams?.home?.team?.id;
    for (const t of [g.teams?.away?.team, g.teams?.home?.team]) {
      if (t?.id && isRealTeam(t.id)) state.teamNames[t.id] = { name: t.name, teamName: t.teamName ?? t.name?.split(' ').pop() };
    }
    if (!isRealTeam(away) || !isRealTeam(home)) continue;
    const key = seriesKey(g.gameType, away, home);
    if (!map.has(key)) {
      map.set(key, {
        key, type: g.gameType, round: ROUNDS[g.gameType],
        league: g.gameType === 'W' ? 'WS' : leagueOf(home),
        // Game 1 is always at the higher seed's park.
        top: home, bottom: away,
        games: [], wins: { [away]: 0, [home]: 0 },
      });
    }
    map.get(key).games.push(g);
  }
  for (const s of map.values()) {
    s.games.sort((a, b) => (a.seriesGameNumber ?? 0) - (b.seriesGameNumber ?? 0) || new Date(a.gameDate) - new Date(b.gameDate));
    const g1 = s.games.find(g => g.seriesGameNumber === 1) ?? s.games[0];
    s.top = g1.teams.home.team.id;
    s.bottom = g1.teams.away.team.id;
    for (const g of s.games) {
      if (g.status?.abstractGameState !== 'Final') continue;
      const a = g.teams.away, h = g.teams.home;
      if (a.score == null || h.score == null || a.score === h.score) continue;
      s.wins[a.score > h.score ? a.team.id : h.team.id]++;
    }
    const need = Math.ceil(s.round.bestOf / 2);
    s.winner = s.wins[s.top] >= need ? s.top : s.wins[s.bottom] >= need ? s.bottom : null;
    s.loser = s.winner ? (s.winner === s.top ? s.bottom : s.top) : null;
    s.isLive = s.games.some(g => g.status?.abstractGameState === 'Live');
    s.nextGame = s.winner ? null : s.games.find(g => g.status?.abstractGameState !== 'Final' && !/postponed|cancel/i.test(g.status?.detailedState ?? ''));
  }
  return map;
}

// ── Data: seeds from final regular-season standings ───────────────
async function loadSeeds() {
  const override = state.config.seeds;
  try {
    const data = await fetchStandings(SEASON, 'regularSeason');
    const records = (data.records ?? []).flatMap(r => r.teamRecords ?? []);
    state.standings = Object.fromEntries(records.map(r => [r.team.id, r]));
    const seeds = {};
    for (const lg of ['AL', 'NL']) {
      if (override?.[lg]?.length === 6) { seeds[lg] = override[lg]; continue; }
      const inLeague = records.filter(r => leagueOf(r.team.id) === lg);
      const pct = r => Number(r.winningPercentage ?? r.leagueRecord?.pct ?? 0);
      const divWinners = inLeague.filter(r => String(r.divisionRank) === '1')
        .sort((a, b) => pct(b) - pct(a) || Number(a.leagueRank) - Number(b.leagueRank));
      const wildCards = inLeague.filter(r => ['1', '2', '3'].includes(String(r.wildCardRank)))
        .sort((a, b) => Number(a.wildCardRank) - Number(b.wildCardRank));
      if (divWinners.length !== 3 || wildCards.length !== 3) return null;
      seeds[lg] = [...divWinners, ...wildCards].map(r => r.team.id);
    }
    return seeds;
  } catch {
    return override?.AL && override?.NL ? override : null;
  }
}

function seedOf(id) {
  if (!state.seeds || !id) return null;
  for (const lg of ['AL', 'NL']) {
    const i = state.seeds[lg]?.indexOf(id) ?? -1;
    if (i !== -1) return i + 1;
  }
  return null;
}

// ── Bracket structure ─────────────────────────────────────────────
// Slots are the fixed MLB format: 3v6 and 4v5 in the Wild Card round,
// 1 hosts the 4/5 winner and 2 hosts the 3/6 winner in the Division
// Series. Each slot then looks up the real series for its known teams.
function findSeries(type, ids) {
  const known = ids.filter(Boolean);
  if (!known.length) return null;
  for (const s of state.series.values()) {
    if (s.type !== type) continue;
    if (known.every(id => id === s.top || id === s.bottom)) return s;
  }
  return null;
}

function slot(type, ids) {
  const series = findSeries(type, ids);
  if (series) return { type, series, teams: [series.top, series.bottom] };
  return { type, series: null, teams: ids };
}

function buildBracket() {
  const out = {};
  for (const lg of ['AL', 'NL']) {
    const s = state.seeds?.[lg];
    if (s) {
      const wcA = slot('F', [s[2], s[5]]);
      const wcB = slot('F', [s[3], s[4]]);
      const dsA = slot('D', [s[0], wcB.series?.winner ?? null]);
      const dsB = slot('D', [s[1], wcA.series?.winner ?? null]);
      const cs = slot('L', [dsA.series?.winner ?? null, dsB.series?.winner ?? null]);
      out[lg] = { F: [wcA, wcB], D: [dsA, dsB], L: [cs], byes: [s[0], s[1]] };
    } else {
      // No standings — fall back to whatever series exist, padded with TBD.
      const pick = (type, n) => {
        const found = [...state.series.values()].filter(x => x.type === type && x.league === lg)
          .map(x => ({ type, series: x, teams: [x.top, x.bottom] }));
        while (found.length < n) found.push({ type, series: null, teams: [null, null] });
        return found.slice(0, n);
      };
      out[lg] = { F: pick('F', 2), D: pick('D', 2), L: pick('L', 1), byes: [] };
    }
  }
  out.WS = slot('W', [out.AL.L[0].series?.winner ?? null, out.NL.L[0].series?.winner ?? null]);
  return out;
}

// ── Series status text ────────────────────────────────────────────
function seriesStatusText(s) {
  if (!s) return '';
  const wt = s.wins[s.top], wb = s.wins[s.bottom];
  if (s.winner) {
    const w = s.wins[s.winner], l = s.wins[s.loser];
    return `${abbr(s.winner)} wins ${w}–${l}`;
  }
  if (wt === 0 && wb === 0) return `Best of ${s.round.bestOf}`;
  if (wt === wb) return `Tied ${wt}–${wb}`;
  const leader = wt > wb ? s.top : s.bottom;
  return `${abbr(leader)} leads ${Math.max(wt, wb)}–${Math.min(wt, wb)}`;
}

function roundLabel(s) {
  if (!s) return '';
  if (s.type === 'W') return 'World Series';
  if (s.type === 'F') return `${s.league} Wild Card`;
  return `${s.league}${s.type === 'D' ? 'DS' : 'CS'}`;
}

function gameNumberLabel(g) {
  return g.seriesGameNumber ? `Game ${g.seriesGameNumber}` : '';
}

// One Gameday link per game for its whole life: with no /preview or /final
// suffix, MLB opens whichever view fits — the live Gameday while it's on,
// the wrap-up afterwards — so a link opened mid-game still works post-game.
function gamedayUrl(g) {
  const slug = t => TEAM_SLUG[t.id] ?? t.name.split(' ').pop().toLowerCase();
  // officialDate is the ballpark's local date; gameDate is UTC and can
  // roll over to tomorrow for a night game.
  const date = (g.officialDate ?? g.gameDate.slice(0, 10)).replace(/-/g, '/');
  return `https://www.mlb.com/gameday/${slug(g.teams.away.team)}-vs-${slug(g.teams.home.team)}/${date}/${g.gamePk}`;
}

function broadcastText(g) {
  const national = (g.broadcasts ?? []).filter(b => b.type === 'TV' && (b.isNational || !b.homeAway || b.homeAway === 'national'));
  const list = (national.length ? national : (g.broadcasts ?? []).filter(b => b.type === 'TV'))
    .map(b => b.callSign || b.name).filter(Boolean);
  return [...new Set(list)].slice(0, 2).join(' / ');
}

// ── Render: bracket ───────────────────────────────────────────────
// Boxes carry no numbers at all — just the two teams' logos and
// abbreviations (seed and full name on hover), with the series standing
// in the footer — so nothing in the bracket reads like a game score.
// Game-by-game scores live in the detail panel a tap away.
function teamShort(id) {
  return NICKNAMES[id] ?? state.teamNames[id]?.teamName ?? state.standings?.[id]?.team?.name?.split(' ').pop() ?? abbr(id);
}

// Seeds live in the hover text rather than beside the logo, where a
// number reads like a score or series tally.
function teamTitle(id) {
  const seed = seedOf(id);
  const name = state.teamNames[id]?.name ?? teamShort(id);
  return seed ? `No. ${seed} seed · ${name}` : name;
}

function renderTeamRow(id, s) {
  if (!id) {
    return `<div class="ps-row ps-row--tbd"><span class="ps-logo-blank"></span><span class="ps-name">TBD</span></div>`;
  }
  const cls = [];
  if (s?.winner === id) cls.push('ps-row--adv');
  if (s?.loser === id) cls.push('ps-row--out');
  if (id === ORIOLES_ID) cls.push('ps-row--orioles');
  return `<div class="ps-row ${cls.join(' ')}" title="${esc(teamTitle(id))}">
    <img class="ps-logo" src="${esc(teamLogoSrc(id, 18))}" alt="" width="18" height="18" loading="lazy">
    <span class="ps-name">${esc(abbr(id))}</span>
  </div>`;
}

function seriesFootText(s) {
  const wt = s.wins[s.top], wb = s.wins[s.bottom];
  if (s.winner) return `${abbr(s.winner)} wins series ${s.wins[s.winner]}–${s.wins[s.loser]}`;
  if (wt === 0 && wb === 0) return `Best of ${s.round.bestOf}`;
  if (wt === wb) return `Series tied ${wt}–${wb}`;
  const leader = wt > wb ? s.top : s.bottom;
  return `${abbr(leader)} leads series ${Math.max(wt, wb)}–${Math.min(wt, wb)}`;
}

// Start of a series that hasn't begun: its own Game 1 once the matchup is
// set, otherwise the round's first scheduled game (MLB posts round dates
// with placeholder teams before the matchups are known).
function startText(sl) {
  const s = sl.series;
  let first = s?.games.find(g => g.status?.abstractGameState === 'Preview');
  if (!first) first = state.games.find(g => g.gameType === sl.type && g.status?.abstractGameState === 'Preview');
  if (!first) return '';
  const when = new Date(first.gameDate);
  if (localIso(when) === localDateStr(0)) return `Today ${formatGameTime(first.gameDate)}`;
  return `Starts ${when.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
}

function renderMatchup(sl) {
  const s = sl.series;
  const hasO = sl.teams.includes(ORIOLES_ID);
  const cls = ['ps-matchup'];
  if (s) cls.push('ps-matchup--active');
  if (s?.isLive) cls.push('ps-matchup--live');
  if (hasO) cls.push('ps-matchup--orioles');
  if (s && state.selectedSeries === s.key) cls.push('ps-matchup--selected');
  const notStarted = !s || !s.games.some(g => g.status?.abstractGameState !== 'Preview');
  const start = notStarted ? startText(sl) : '';
  const text = [s ? seriesFootText(s) : `Best of ${ROUNDS[sl.type].bestOf}`, start].filter(Boolean).join(' · ');
  const foot = s?.isLive
    ? `<span class="live-dot" aria-hidden="true"></span><span class="ps-foot-live">Live</span> · ${esc(text)}`
    : esc(text);
  const tag = s ? 'button' : 'div';
  const label = s ? `${roundLabel(s)}: ${teamShort(s.top)} vs ${teamShort(s.bottom)}, ${text}${s.isLive ? ', game in progress' : ''}` : '';
  return `<${tag} class="${cls.join(' ')}"${s ? ` type="button" data-series="${esc(s.key)}" aria-label="${esc(label)}"` : ''}>
    ${renderTeamRow(sl.teams[0], s)}
    ${renderTeamRow(sl.teams[1], s)}
    <div class="ps-foot">${foot}</div>
  </${tag}>`;
}

function renderByes(ids) {
  if (!ids.length) return '';
  return `<div class="ps-byes"><div class="ps-byes-head">Byes to Division Series</div>${ids.map(id => `
    <div class="ps-bye${id === ORIOLES_ID ? ' ps-row--orioles' : ''}" title="${esc(teamTitle(id))}">
      <img class="ps-logo" src="${esc(teamLogoSrc(id, 18))}" alt="" width="18" height="18" loading="lazy">
      <span class="ps-name">${esc(abbr(id))}</span>
    </div>`).join('')}</div>`;
}

function renderRound(type, slots, extra = '') {
  return `<div class="ps-round ps-round--${ROUNDS[type].key}">
    <div class="ps-round-head">${esc(ROUNDS[type].short)}</div>
    <div class="ps-round-body">${slots.map(renderMatchup).join('')}${extra}</div>
  </div>`;
}

function renderLeague(lg, b) {
  return `<div class="ps-league ps-league--${lg.toLowerCase()}">
    <div class="ps-league-head">${lg === 'AL' ? 'American League' : 'National League'}</div>
    <div class="ps-rounds">
      ${renderRound('F', b.F, renderByes(b.byes))}
      ${renderRound('D', b.D)}
      ${renderRound('L', b.L)}
    </div>
  </div>`;
}

function renderBracket() {
  const el = $('psBracket');
  if (!el) return;
  if (!state.seeds && !state.series.size) {
    el.innerHTML = state.loadFailed
      ? '<span class="sidebar-msg">Couldn\'t load MLB\'s postseason data — retrying shortly.</span>'
      : '<span class="sidebar-msg">The bracket appears once the postseason field is set.</span>';
    return;
  }
  const b = buildBracket();
  const ws = b.WS.series;
  const champ = ws?.winner;
  el.innerHTML = `
    ${renderLeague('AL', b.AL)}
    <div class="ps-final">
      <div class="ps-round-head">World Series</div>
      ${renderMatchup(b.WS)}
      ${champ ? `<div class="ps-champ">
        <img src="${esc(teamLogoSrc(champ, 48))}" alt="" width="48" height="48">
        <span class="ps-champ-kicker">${SEASON} Champions</span>
        <span class="ps-champ-name">${esc(state.teamNames[champ]?.name ?? abbr(champ))}</span>
      </div>` : '<div class="ps-trophy" aria-hidden="true">🏆</div>'}
    </div>
    ${renderLeague('NL', b.NL)}
  `;
  el.querySelectorAll('[data-series]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedSeries = state.selectedSeries === btn.dataset.series ? null : btn.dataset.series;
      renderBracket();
      renderSeriesDetail(true);
    });
  });
}

// ── Render: series detail ─────────────────────────────────────────
// Inning-by-inning line score from the schedule's hydrated linescore,
// using the same box-score-table styles as the homepage popover.
function renderLineScore(g) {
  const ls = g.linescore ?? {};
  const innings = ls.innings ?? [];
  if (!innings.length) return '';
  const n = Math.max(innings.length, 9);
  let hdr = '<th class="box-team-col"></th>';
  for (let i = 1; i <= n; i++) hdr += `<th>${i}</th>`;
  hdr += '<th class="box-total">R</th><th class="box-total">H</th><th class="box-total">E</th>';
  const row = side => {
    const id = g.teams[side].team.id;
    let r = `<td class="box-team-col">${esc(abbr(id))}</td>`;
    for (let i = 0; i < n; i++) r += `<td>${innings[i]?.[side]?.runs ?? ''}</td>`;
    const t = ls.teams?.[side] ?? {};
    r += `<td class="box-total">${t.runs ?? g.teams[side].score ?? ''}</td><td class="box-total">${t.hits ?? ''}</td><td class="box-total">${t.errors ?? ''}</td>`;
    return `<tr class="box-score-row${id === ORIOLES_ID ? ' ps-box-orioles' : ''}">${r}</tr>`;
  };
  return `<div class="ps-box-wrap"><table class="box-score-table ps-box">
    <thead><tr>${hdr}</tr></thead>
    <tbody>${row('away')}${row('home')}</tbody>
  </table></div>`;
}

function renderGameLine(g) {
  const { stateClass, statusInner, isPreviewLike } = getScoreChipStatus(g);
  const a = g.teams.away, h = g.teams.home;
  const score = isPreviewLike ? '' : `${abbr(a.team.id)} ${a.score ?? 0}, ${abbr(h.team.id)} ${h.score ?? 0}`;
  const date = new Date(g.gameDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const ifNec = g.ifNecessary === 'Y' && isPreviewLike ? ' <span class="ps-ifnec">if necessary</span>' : '';
  const tv = broadcastText(g);
  const live = stateClass === 'live' ? '<span class="live-dot" aria-hidden="true"></span>' : '';
  return `<div class="ps-detail-block">
    <a class="ps-detail-game" href="${esc(gamedayUrl(g))}" target="_blank" rel="noopener">
      <span class="ps-detail-num">${esc(gameNumberLabel(g) || '—')}</span>
      <span class="ps-detail-date">${esc(date)} · ${esc(abbr(a.team.id))} @ ${esc(abbr(h.team.id))}${ifNec}</span>
      <span class="ps-detail-score ps-status--${stateClass}">${live}${score ? esc(score) : statusInner}</span>
      ${tv ? `<span class="ps-detail-tv">${esc(tv)}</span>` : ''}
    </a>
    ${isPreviewLike ? '' : renderLineScore(g)}
  </div>`;
}

function renderSeriesDetail(scroll = false) {
  const el = $('psSeriesDetail');
  if (!el) return;
  const s = state.selectedSeries ? state.series.get(state.selectedSeries) : null;
  if (!s) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="ps-detail">
    <div class="ps-detail-head">
      <span>${esc(roundLabel(s))}: ${esc(state.teamNames[s.top]?.teamName ?? abbr(s.top))} vs ${esc(state.teamNames[s.bottom]?.teamName ?? abbr(s.bottom))}</span>
      <span class="ps-detail-status">${esc(seriesStatusText(s))}</span>
      <button class="ps-detail-close" type="button" aria-label="Close series detail">&times;</button>
    </div>
    ${s.games.map(renderGameLine).join('')}
  </div>`;
  el.querySelector('.ps-detail-close').addEventListener('click', () => {
    state.selectedSeries = null;
    renderBracket();
    renderSeriesDetail();
  });
  if (scroll) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Render: today's games ─────────────────────────────────────────
function localIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function renderGameCard(g) {
  const s = state.series.get(seriesKey(g.gameType, g.teams.away.team.id, g.teams.home.team.id));
  const { stateClass, statusInner, isPreviewLike, isFinal } = getScoreChipStatus(g);
  const hasO = [g.teams.away.team.id, g.teams.home.team.id].includes(ORIOLES_ID);
  const row = side => {
    const t = g.teams[side];
    const other = g.teams[side === 'away' ? 'home' : 'away'];
    const win = isFinal && t.score > other.score;
    const lose = isFinal && t.score < other.score;
    const pp = t.probablePitcher;
    const sub = isPreviewLike && pp
      ? `<span class="ps-game-sub">${esc(pp.fullName)}</span>`
      : '';
    return `<div class="ps-game-team${win ? ' ps-game-team--win' : ''}${lose ? ' ps-game-team--lose' : ''}">
      <span class="ps-seed">${seedOf(t.team.id) ?? ''}</span>
      <img class="ps-logo" src="${esc(teamLogoSrc(t.team.id, 22))}" alt="" width="22" height="22" loading="lazy">
      <span class="ps-game-name">${esc(state.teamNames[t.team.id]?.teamName ?? abbr(t.team.id))}${sub}</span>
      <span class="ps-game-score">${isPreviewLike ? '' : (t.score ?? 0)}</span>
    </div>`;
  };
  const tv = broadcastText(g);
  return `<a class="ps-game${hasO ? ' ps-game--orioles' : ''} ps-game--${stateClass}" href="${esc(gamedayUrl(g))}" target="_blank" rel="noopener">
    <div class="ps-game-kicker">
      <span>${esc([roundLabel(s) || ROUNDS[g.gameType].label, gameNumberLabel(g)].filter(Boolean).join(' · '))}</span>
      <span>${s ? esc(seriesStatusText(s)) : ''}</span>
    </div>
    ${row('away')}
    ${row('home')}
    <div class="ps-game-foot">
      <span class="ps-status--${stateClass}">${stateClass === 'live' ? '<span class="live-dot" aria-hidden="true"></span>' : ''}${statusInner}</span>
      ${tv ? `<span class="ps-game-tv">${esc(tv)}</span>` : ''}
    </div>
  </a>`;
}

function renderToday() {
  const el = $('psToday');
  if (!el) return;
  const playable = state.games.filter(g => isRealTeam(g.teams?.away?.team?.id) && isRealTeam(g.teams?.home?.team?.id));
  const today = localDateStr(0);
  let games = playable.filter(g => localIso(new Date(g.gameDate)) === today);
  let label = "Today's Games";
  if (!games.length) {
    const next = playable.find(g => g.status?.abstractGameState === 'Preview' && new Date(g.gameDate) > Date.now());
    if (next) {
      const day = localIso(new Date(next.gameDate));
      games = playable.filter(g => localIso(new Date(g.gameDate)) === day);
      label = `Next Up · ${new Date(next.gameDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;
    } else {
      const last = [...playable].reverse().find(g => g.status?.abstractGameState === 'Final');
      if (last) {
        const day = localIso(new Date(last.gameDate));
        games = playable.filter(g => localIso(new Date(g.gameDate)) === day);
        label = `Latest Results · ${new Date(last.gameDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;
      }
    }
  }
  $('psTodayLabel').textContent = label;
  const liveCount = games.filter(g => g.status?.abstractGameState === 'Live').length;
  $('psTodayMeta').textContent = liveCount ? `${liveCount} live · auto-updating` : '';
  if (!games.length) {
    el.innerHTML = state.loadFailed
      ? '<span class="sidebar-msg">Couldn\'t load MLB\'s schedule — retrying shortly.</span>'
      : '<span class="sidebar-msg">No postseason games scheduled yet</span>';
    return;
  }
  games.sort((a, b) => {
    const ao = [a.teams.away.team.id, a.teams.home.team.id].includes(ORIOLES_ID);
    const bo = [b.teams.away.team.id, b.teams.home.team.id].includes(ORIOLES_ID);
    return (bo - ao) || new Date(a.gameDate) - new Date(b.gameDate);
  });
  el.innerHTML = games.map(renderGameCard).join('');
}

// ── Render: Orioles spotlight ─────────────────────────────────────
function renderSpotlight() {
  const el = $('psSpotlight');
  if (!el) return;
  const inField = state.seeds && ['AL', 'NL'].some(lg => state.seeds[lg]?.includes(ORIOLES_ID));
  const oSeries = [...state.series.values()].filter(s => s.top === ORIOLES_ID || s.bottom === ORIOLES_ID)
    .sort((a, b) => ROUND_ORDER.indexOf(b.type) - ROUND_ORDER.indexOf(a.type));
  const rec = state.standings?.[ORIOLES_ID];
  const logo = `<img class="ps-spot-logo" src="${esc(teamLogoSrc(ORIOLES_ID, 64))}" alt="" width="56" height="56">`;

  if (inField || oSeries.length) {
    const cur = oSeries[0];
    let line = 'Waiting on the Wild Card round';
    let sub = '';
    const oSeed = seedOf(ORIOLES_ID);
    if (!cur && oSeed && oSeed <= 2) line = 'First-round bye — straight to the Division Series';
    if (cur) {
      const opp = cur.top === ORIOLES_ID ? cur.bottom : cur.top;
      const oppName = state.teamNames[opp]?.teamName ?? abbr(opp);
      if (cur.winner === ORIOLES_ID) {
        line = cur.type === 'W' ? `World Series champions! Beat the ${oppName} ${cur.wins[ORIOLES_ID]}–${cur.wins[opp]}` : `Won the ${roundLabel(cur)} over the ${oppName}, ${cur.wins[ORIOLES_ID]}–${cur.wins[opp]}`;
      } else if (cur.winner) {
        line = `Eliminated by the ${oppName} in the ${roundLabel(cur)}, ${cur.wins[opp]}–${cur.wins[ORIOLES_ID]}`;
      } else {
        line = `${roundLabel(cur)} vs. ${oppName} · ${seriesStatusText(cur)}`;
      }
      const g = cur.nextGame;
      if (g) {
        const tv = broadcastText(g);
        const live = g.status?.abstractGameState === 'Live';
        sub = live
          ? `${gameNumberLabel(g)} is live now`
          : `${gameNumberLabel(g)}: ${new Date(g.gameDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ${formatGameTime(g.gameDate)}${tv ? ` on ${tv}` : ''}`;
      }
    }
    el.innerHTML = `<div class="ps-spot">
      ${logo}
      <div class="ps-spot-body">
        <div class="asg-spotlight-kicker">Orioles in October${oSeed ? ` · No. ${oSeed} seed` : ''}</div>
        <div class="ps-spot-line">${esc(line)}</div>
        ${sub ? `<div class="ps-spot-sub">${esc(sub)}</div>` : ''}
        ${rec ? `<div class="ps-spot-sub">${rec.wins}–${rec.losses} in the regular season</div>` : ''}
      </div>
    </div>`;
    return;
  }

  if (!rec) { el.innerHTML = ''; return; }
  const gb = rec.wildCardGamesBack && rec.wildCardGamesBack !== '-' ? ` · ${rec.wildCardGamesBack} GB of the last Wild Card` : '';
  el.innerHTML = `<div class="ps-spot ps-spot--out">
    ${logo}
    <div class="ps-spot-body">
      <div class="asg-spotlight-kicker">Orioles</div>
      <div class="ps-spot-line">Watching from home this October</div>
      <div class="ps-spot-sub">Finished ${rec.wins}–${rec.losses}${gb}</div>
      <a class="ps-spot-link" href="${import.meta.env.BASE_URL}schedule/">Season results →</a>
    </div>
  </div>`;
}

// ── Render: schedule / info sidebar ───────────────────────────────
function renderInfo() {
  const el = $('psInfo');
  if (!el) return;
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const rows = ROUND_ORDER.map(type => {
    const games = state.games.filter(g => g.gameType === type);
    if (!games.length) return '';
    const first = new Date(games[0].gameDate);
    const last = new Date(games[games.length - 1].gameDate);
    const series = [...state.series.values()].filter(s => s.type === type);
    const done = series.length && series.every(s => s.winner) && series.length === { F: 4, D: 4, L: 2, W: 1 }[type];
    const started = games.some(g => g.status?.abstractGameState !== 'Preview');
    const status = done ? 'Complete' : started ? 'In progress' : 'Upcoming';
    const tv = [...new Set(games.map(broadcastText).filter(Boolean))].slice(0, 3).join(', ');
    return `<div class="ps-info-row ps-info-row--${status.toLowerCase().replace(' ', '-')}">
      <div class="ps-info-main">
        <span class="ps-info-round">${esc(ROUNDS[type].label)}</span>
        <span class="ps-info-dates">${esc(fmt(first))}${+first !== +last ? `–${esc(fmt(last))}` : ''}</span>
      </div>
      <div class="ps-info-meta">${esc(status)} · Best of ${ROUNDS[type].bestOf}${tv ? ` · ${esc(tv)}` : ''}</div>
    </div>`;
  }).join('');

  const live = state.games.find(g => g.status?.abstractGameState === 'Live');
  const next = state.games.find(g => g.status?.abstractGameState === 'Preview' && new Date(g.gameDate) > Date.now());
  let countdown = '';
  if (live) countdown = '<div class="asg-countdown"><span class="live-dot" aria-hidden="true"></span> Games are live now</div>';
  else if (next) {
    const ms = new Date(next.gameDate) - Date.now();
    const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
    countdown = `<div class="asg-countdown">${d ? `${d}d ` : ''}${h}h ${m}m until the next first pitch</div>`;
  } else if (state.games.length && [...state.series.values()].some(s => s.type === 'W' && s.winner)) {
    countdown = '<div class="asg-countdown">That\'s a wrap on 2026</div>';
  }

  el.innerHTML = `
    ${countdown}
    ${rows || `<span class="sidebar-msg">${state.loadFailed ? 'Couldn\'t load MLB\'s schedule — retrying shortly.' : 'Schedule not posted yet'}</span>`}
    <a class="widget-link" href="https://www.mlb.com/postseason" target="_blank" rel="noopener">MLB Postseason hub ↗</a>
  `;
}

// ── Postseason leaders ────────────────────────────────────────────
const LEADER_CATS = [
  { key: 'homeRuns', label: 'Home Runs' },
  { key: 'runsBattedIn', label: 'RBI' },
  { key: 'hits', label: 'Hits' },
];

async function loadLeaders() {
  const el = $('psLeaders');
  if (!el) return;
  try {
    const data = await fetchLeagueLeaders(LEADER_CATS.map(c => c.key).join(','), SEASON, { leaderGameTypes: 'P', playerPool: 'All', limit: 5 });
    const cats = data.leagueLeaders ?? [];
    const html = LEADER_CATS.map(c => {
      const cat = cats.find(x => x.leaderCategory === c.key && (x.statGroup ?? 'hitting') === 'hitting');
      const leaders = (cat?.leaders ?? []).filter(l => Number(l.value) > 0);
      if (!leaders.length) return '';
      return `<div class="roster-group-label">${esc(c.label)}</div>
        ${leaders.map(l => `<div class="roster-item${l.team?.id === ORIOLES_ID ? ' ps-row--orioles' : ''}">
          <img class="asg-team-logo" src="${esc(teamLogoSrc(l.team?.id, 16))}" alt="" width="16" height="16" loading="lazy">
          <a class="roster-name" href="${esc(savantUrl(l.person?.id))}" target="_blank" rel="noopener">${esc(l.person?.fullName ?? '')}</a>
          <span class="roster-pos">${esc(String(l.value))}</span>
        </div>`).join('')}`;
    }).join('');
    el.innerHTML = html || '<span class="sidebar-msg">Leaders show up once games are played</span>';
  } catch {
    el.innerHTML = '<span class="sidebar-msg">Unavailable</span>';
  }
}

// ── News ──────────────────────────────────────────────────────────
const PS_RE = /postseason|post-season|playoff|wild[- ]card|\bgame [1-7]\b|\bALDS\b|\bNLDS\b|\bALCS\b|\bNLCS\b|division series|championship series|world series|fall classic|october baseball|pennant|clinch|eliminat/i;

async function loadNews() {
  const el = $('psNews');
  if (!el) return;
  try {
    const feeds = await fetch(`${import.meta.env.BASE_URL}feeds.json`).then(r => r.json());
    const results = await Promise.allSettled(feeds.map(source =>
      fetch(`${PROXY}?url=${encodeURIComponent(source.url)}`).then(r => r.json())
        .then(data => ({ source, articles: data.items ?? [] }))
    ));
    const cutoff = Date.now() - 7 * 864e5;
    const seen = new Set();
    const matches = [];
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const { source, articles } = r.value;
      for (const a of articles) {
        const title = cleanFeedText(a.title || '');
        const text = decodeHtmlEntities(`${title} ${a.description || ''}`);
        if (!PS_RE.test(text)) continue;
        const d = new Date(a.pubDate);
        if (isNaN(d) || d.getTime() < cutoff) continue;
        const dedupe = title.toLowerCase();
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);
        matches.push({ title, text, link: a.link, pubDate: a.pubDate, sourceName: source.name, thumbnail: extractThumbnail(a) });
      }
    }
    matches.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    state.news = matches;
    renderNewsFilters();
    await renderNews();
  } catch {
    el.innerHTML = '<span class="sidebar-msg">Unavailable</span>';
  }
}

// Team filter pills cover every club in the field (or every club the
// schedule knows about if seeds aren't available).
function fieldTeams() {
  const ids = state.seeds ? [...state.seeds.AL, ...state.seeds.NL] : [...new Set([...state.series.values()].flatMap(s => [s.top, s.bottom]))];
  return ids.filter(isRealTeam);
}

// Two-word nicknames that a last-word split would get wrong ("Sox").
const NICKNAMES = { 109: 'D-backs', 111: 'Red Sox', 145: 'White Sox', 141: 'Blue Jays' };

function teamMatcher(id) {
  const name = NICKNAMES[id] ?? state.teamNames[id]?.teamName ?? state.standings?.[id]?.team?.name?.split(' ').pop();
  if (!name) return null;
  return new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
}

function renderNewsFilters() {
  const el = $('psNewsFilters');
  if (!el) return;
  const teams = fieldTeams();
  const out = new Set([...state.series.values()].map(s => s.loser).filter(Boolean));
  const pills = [`<button class="pill${state.newsFilter === 'all' ? ' active' : ''}" data-filter="all">All</button>`];
  if (!teams.includes(ORIOLES_ID)) teams.unshift(ORIOLES_ID);
  for (const id of teams) {
    const re = teamMatcher(id);
    if (!re) continue;
    const count = state.news.filter(a => re.test(a.text)).length;
    if (!count && id !== ORIOLES_ID) continue;
    pills.push(`<button class="pill ps-news-pill${state.newsFilter === String(id) ? ' active' : ''}${out.has(id) ? ' ps-news-pill--out' : ''}" data-filter="${id}" title="${esc(state.teamNames[id]?.name ?? abbr(id))}">
      <img class="pill-logo" src="${esc(teamLogoSrc(id, 16))}" alt="" width="16" height="16">${esc(abbr(id))}<span class="ps-pill-count">${count}</span>
    </button>`);
  }
  el.innerHTML = pills.join('');
  el.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
    state.newsFilter = btn.dataset.filter;
    renderNewsFilters();
    renderNews();
  }));
}

let newsShown = 12;
async function renderNews() {
  const el = $('psNews');
  if (!el) return;
  const re = state.newsFilter === 'all' ? null : teamMatcher(Number(state.newsFilter));
  const list = re ? state.news.filter(a => re.test(a.text)) : state.news;
  const countEl = $('psNewsCount');
  if (countEl) countEl.textContent = list.length ? `${list.length} stories · last 7 days` : '';
  if (!list.length) {
    el.innerHTML = `<span class="sidebar-msg">${state.newsFilter === 'all' ? 'No postseason stories in the last week' : 'No postseason stories mentioning this team yet'}</span>`;
    return;
  }
  const top = list.slice(0, newsShown);
  // Bounded list, so og:image fallbacks are fetched eagerly (same approach
  // as the All-Star and Draft pages).
  await Promise.all(top.map(async a => {
    if (!a.thumbnail) a.thumbnail = await fetchOgImage(a.link);
  }));
  el.innerHTML = `<div class="news-thumb-list ps-news-list">${top.map(renderNewsThumbCard).join('')}</div>
    ${list.length > newsShown ? `<button class="pill ps-news-more" type="button">Show more (${list.length - newsShown})</button>` : ''}`;
  el.querySelector('.ps-news-more')?.addEventListener('click', () => {
    newsShown += 12;
    renderNews();
  });
}

// ── Video ─────────────────────────────────────────────────────────
const YT_PLAYLISTS = [
  { id: 'PLL-lmlkrmJakABrOT6FmV0mU-5oIF8nGu', label: 'MLB Fastcast' },
  { id: 'PLL-lmlkrmJalPg-EgiZ92Eyg9YodLbQsE', label: 'MLB Top Plays' },
];
const PS_VIDEO_RE = /postseason|playoff|wild card|ALDS|NLDS|ALCS|NLCS|world series|october|clinch/i;

function extractVideoId(link) {
  return link.match(/v=([^&]+)/)?.[1] || link.match(/youtu\.be\/([^?&]+)/)?.[1] || '';
}

async function fetchPlaylistVideos(pl) {
  try {
    const url = `${PROXY}?url=${encodeURIComponent(`https://www.youtube.com/feeds/videos.xml?playlist_id=${pl.id}`)}`;
    const data = await fetch(url).then(r => r.json());
    const items = data.items ?? [];
    const hits = items.filter(i => PS_VIDEO_RE.test(i.title || ''));
    return (hits.length ? hits : items).slice(0, 3).map(match => {
      const videoId = extractVideoId(match.link || '');
      return {
        title: cleanFeedText(match.title),
        label: pl.label,
        thumb: match.thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : ''),
        url: match.link,
        videoId,
      };
    });
  } catch { return []; }
}

function renderVideoItem(item) {
  return `<div class="media-item media-item--video" data-video-id="${esc(item.videoId ?? '')}" data-video-url="${esc(item.url)}">
    <div class="video-thumb-wrap">
      <img class="video-thumb" src="${esc(item.thumb ?? `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`)}" alt="" loading="lazy">
      <svg class="video-play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
    </div>
    <div class="video-info">
      <span class="video-channel">${esc(item.label ?? 'MLB')}</span>
      <span class="video-title">${esc(item.title)}</span>
    </div>
  </div>`;
}

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
  overlay.querySelector('.video-theater-player').innerHTML =
    `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0" frameborder="0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
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

async function loadMedia() {
  const wrap = $('psMedia');
  if (!wrap) return;
  const pinned = (state.config.videos ?? []).map(v => ({ ...v, label: v.label ?? 'Pinned', videoId: v.videoId ?? extractVideoId(v.url ?? '') }));
  const fetched = (await Promise.all(YT_PLAYLISTS.map(fetchPlaylistVideos))).flat();
  const items = [...pinned, ...fetched];
  if (!items.length) {
    wrap.innerHTML = '<span class="sidebar-msg">Unavailable</span>';
    return;
  }
  wrap.innerHTML = `<div class="media-list">${items.map(renderVideoItem).join('')}</div>
    <a class="widget-link" href="https://www.mlb.com/postseason" target="_blank" rel="noopener">More postseason video ↗</a>`;
  wrap.querySelectorAll('.media-item--video').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      const id = el.dataset.videoId;
      if (id) openVideoTheater(id);
      else window.open(el.dataset.videoUrl, '_blank');
    });
  });
}

// ── History ───────────────────────────────────────────────────────
const WS_HISTORY = [
  { year: 2025, result: 'Dodgers def. Blue Jays 4–3', mvp: 'Yoshinobu Yamamoto' },
  { year: 2024, result: 'Dodgers def. Yankees 4–1', mvp: 'Freddie Freeman' },
  { year: 2023, result: 'Rangers def. Diamondbacks 4–1', mvp: 'Corey Seager' },
  { year: 2022, result: 'Astros def. Phillies 4–2', mvp: 'Jeremy Peña' },
  { year: 2021, result: 'Braves def. Astros 4–2', mvp: 'Jorge Soler' },
  { year: 2020, result: 'Dodgers def. Rays 4–2', mvp: 'Corey Seager' },
];
const ORIOLES_OCTOBER = [
  { year: 2024, result: 'Lost AL Wild Card Series to Royals 0–2' },
  { year: 2023, result: 'Lost ALDS to Rangers 0–3 (101-win AL East champs)' },
  { year: 2016, result: 'Lost AL Wild Card Game at Toronto' },
  { year: 2014, result: 'Swept Tigers in ALDS; lost ALCS to Royals 0–4' },
  { year: 1983, result: 'World Series champions over the Phillies 4–1' },
  { year: 1970, result: 'World Series champions over the Reds 4–1' },
  { year: 1966, result: 'World Series champions, swept the Dodgers 4–0' },
];

function loadHistory() {
  const el = $('psHistory');
  if (!el) return;
  const item = h => `<div class="asg-history-item">
    <span class="asg-history-year">${h.year}</span>
    <div class="asg-history-body">
      <div class="asg-history-result">${esc(h.result)}</div>
      ${h.mvp ? `<div class="asg-history-meta">WS MVP: ${esc(h.mvp)}</div>` : ''}
    </div>
  </div>`;
  el.innerHTML = `
    <div class="roster-group-label">Recent World Series</div>
    ${WS_HISTORY.map(item).join('')}
    <div class="roster-group-label">Orioles in October</div>
    ${ORIOLES_OCTOBER.map(item).join('')}
  `;
}

// ── Sidebar accordion (same behavior as the other event pages) ────
function setupAccordion() {
  document.querySelectorAll('.section-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const section = toggle.closest('.sidebar-section');
      const sidebar = section.closest('.sidebar');
      const isCollapsed = section.classList.contains('collapsed');
      sidebar?.querySelectorAll('.sidebar-section.collapsible').forEach(peer => {
        if (peer !== section) peer.classList.add('collapsed');
      });
      section.classList.toggle('collapsed', !isCollapsed);
    });
  });
}

// ── Live refresh ──────────────────────────────────────────────────
// Poll every minute while any game is live, every ten minutes otherwise,
// and refresh straight away when the tab comes back into view.
let refreshTimer = null;
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  const live = state.games.some(g => g.status?.abstractGameState === 'Live');
  refreshTimer = setTimeout(refresh, live || state.loadFailed ? 60e3 : 600e3);
}

// A failed fetch keeps whatever was already on screen rather than
// blanking the page mid-game; the next poll tries again.
function applyGames(games) {
  state.loadFailed = games === null;
  if (games !== null) {
    state.games = games;
    state.series = buildSeries(games);
  }
}

async function refresh() {
  const [games, seeds] = await Promise.all([
    fetchPostseasonGames(),
    state.seeds ? state.seeds : loadSeeds(),
  ]);
  applyGames(games);
  state.seeds = seeds;
  renderAll();
  scheduleRefresh();
}

function renderAll() {
  renderSpotlight();
  renderToday();
  renderBracket();
  renderSeriesDetail();
  renderInfo();
  const upd = $('psUpdated');
  if (upd && !state.loadFailed) upd.textContent = `Updated ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

async function init() {
  setupAccordion();
  loadHistory();
  try {
    state.config = await fetch(`${import.meta.env.BASE_URL}postseason.json`).then(r => r.json());
  } catch { state.config = {}; }

  const [games, seeds] = await Promise.all([fetchPostseasonGames(), loadSeeds()]);
  applyGames(games);
  state.seeds = seeds;
  renderAll();
  scheduleRefresh();

  loadNews();
  loadLeaders();
  loadMedia();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });
}

init();
