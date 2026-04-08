// ── Scores, box score popover, lineup, scout notes, arsenal ───────
import {
  MLB,
  ORIOLES_ID,
  PITCH_NAMES,
  SEASON,
  TEAM_ABBREV,
  TEAM_SLUG,
} from './config.js';
import { $, esc, localDateStr, dayLabel, formatGameTime, normalizeText } from './utils.js';
import { getGameWeather, fetchWeatherForGames } from './weather.js';
import { state } from './state.js';

// ── Name helpers ──────────────────────────────────────────────────
export function playerLabel(person) {
  return person?.fullName ? person.fullName.split(' ').slice(-1)[0] : 'Baltimore';
}

export function compactBoxName(name) {
  if (!name) return 'TBD';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length <= 1) return parts[0];
  const suffixes = new Set(['Jr.', 'Sr.', 'II', 'III', 'IV', 'V']);
  const last = parts.at(-1);
  if (suffixes.has(last) && parts.length >= 2) return `${parts.at(-2)} ${last}`;
  return last;
}

// ── Sort / status ─────────────────────────────────────────────────
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

export function getScoreChipStatus(g) {
  const abstractState = g.status?.abstractGameState ?? '';
  const detailedState = g.status?.detailedState ?? '';
  const reason = g.status?.reason ?? '';
  const statusText = `${detailedState} ${reason}`.toLowerCase();
  const isPostponed = /postponed/.test(statusText);
  const isDelayed = /delay|delayed/.test(statusText);
  const isWeatherRelated = /rain|weather/.test(statusText);

  if (isPostponed) {
    return { stateClass: 'postponed', statusInner: 'Postponed', isPreviewLike: true, isFinal: false };
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
    return { stateClass: 'live', statusInner: `${half}${inn} ${outsHtml} ${bases}`, isPreviewLike: false, isFinal: false };
  }
  if (abstractState === 'Final') {
    return { stateClass: 'final', statusInner: 'Final', isPreviewLike: false, isFinal: true };
  }
  return { stateClass: 'preview', statusInner: formatGameTime(g.gameDate), isPreviewLike: true, isFinal: false };
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
  const wx = getGameWeather(g);
  const wxInline = (stateClass === 'preview' && wx) ? ` ${wx.emoji}${wx.temp}°` : '';

  return `<button class="score-chip ${stateClass}${hasOrioles ? ' orioles' : ''}"
      data-gamepk="${g.gamePk}" type="button" aria-haspopup="dialog" aria-expanded="false">
    <div class="chip-row${awayWin ? ' winner' : ''}">
      <span class="chip-team">${esc(teamAbbr(away.team))}</span>
      <span class="chip-score">${awayScore}</span>
    </div>
    <div class="chip-row${homeWin ? ' winner' : ''}">
      <span class="chip-team">${esc(teamAbbr(home.team))}</span>
      <span class="chip-score">${homeScore}</span>
    </div>
    <span class="chip-status ${stateClass}">${statusInner}${wxInline}</span>
  </button>`;
}

// ── API fetch caches ──────────────────────────────────────────────
export const boxscoreCache = {};
export const arsenalCache = {};
export const teamStatsCache = {};
export const pitcherVsCache = {};

export async function fetchBoxscore(gamePk) {
  if (boxscoreCache[gamePk]) return boxscoreCache[gamePk];
  try {
    const data = await fetch(`${MLB}/game/${gamePk}/boxscore`).then(r => r.json());
    boxscoreCache[gamePk] = data;
    return data;
  } catch { return null; }
}

export async function fetchArsenal(playerId) {
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

export async function fetchTeamStats(teamId) {
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

export async function fetchPitcherVsTeam(pitcherId, oppTeamId) {
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

// ── Slash line helpers ────────────────────────────────────────────
const MLB_TOP_TEN_PROXY_RATES = { avg: 0.295, obp: 0.38, ops: 0.9 };

function formatSlashStat(value) {
  if (value == null || value === '') return '.---';
  const str = String(value).trim();
  if (!str) return '.---';
  if (/^\d+\.\d+$/.test(str)) return str;
  return str.startsWith('.') ? str : `.${str.replace(/^0?\./, '')}`;
}

function mlbPlayerUrl(playerId) {
  return playerId ? `https://www.mlb.com/player/${playerId}` : '';
}

export function renderPlayerNameLink(name, playerId, className = 'popover-player-link') {
  const label = esc(name || 'TBD');
  const href = mlbPlayerUrl(playerId);
  if (!href) return `<span class="${className}">${label}</span>`;
  return `<a class="${className}" href="${href}" target="_blank" rel="noopener">${label}</a>`;
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

function renderSlashSegment(value, isLeader, isTopTenProxy = false) {
  const classes = ['score-lineup-rate'];
  if (isLeader) classes.push('score-lineup-rate--leader');
  if (isTopTenProxy) classes.push('score-lineup-rate--top-ten');
  return `<span class="${classes.join(' ')}">${esc(formatSlashStat(value))}</span>`;
}

function renderPreviewSlashHeader() {
  return `<div class="score-lineup-row score-lineup-row--header score-lineup-row--preview-header">
    <span class="score-lineup-pos"></span>
    <span class="score-lineup-name"></span>
    <span class="score-lineup-box-cols score-lineup-box-cols--preview">
      <span>AVG</span><span>OBP</span><span>OPS</span>
    </span>
  </div>`;
}

function getInGameLineupEntries(team) {
  const order = team?.battingOrder ?? [];
  const batters = team?.batters ?? [];
  const roster = team?.players ?? {};
  const seen = new Set();
  const entries = [];

  const pushEntry = (id, fallbackOrder = null) => {
    if (seen.has(id)) return;
    const player = roster[`ID${id}`];
    if (!player || player.position?.type === 'Pitcher') return;
    seen.add(id);
    const rawOrder = String(player.battingOrder ?? fallbackOrder ?? '');
    const orderNum = Number.parseInt(rawOrder, 10);
    const slot = Number.isFinite(orderNum) && orderNum > 0 ? Math.floor(orderNum / 100) : null;
    const isSubstitution = Boolean(
      player.gameStatus?.isSubstitute ||
      (Number.isFinite(orderNum) && orderNum % 100 !== 0)
    );
    entries.push({ id, player, rawOrder, orderNum, slot, isSubstitution });
  };

  order.forEach((id, index) => pushEntry(id, `${index + 1}00`));
  batters.forEach(id => pushEntry(id));

  return entries.sort((a, b) => {
    const aOrder = Number.isFinite(a.orderNum) ? a.orderNum : Number.MAX_SAFE_INTEGER;
    const bOrder = Number.isFinite(b.orderNum) ? b.orderNum : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.id - b.id;
  });
}

function renderLineupRows(team, gameState = 'preview') {
  const players = team?.battingOrder ?? [];
  const roster = team?.players ?? {};
  if (!players.length) return '<div class="score-lineups-empty">Lineup not yet posted</div>';

  if (gameState === 'final') {
    const entries = getInGameLineupEntries(team);
    const header = `<div class="score-lineup-row score-lineup-row--header">
      <span class="score-lineup-pos"></span>
      <span class="score-lineup-name"></span>
      <span class="score-lineup-box-cols"><span>AB</span><span>R</span><span>H</span><span>HR</span><span>RBI</span><span>SB</span></span>
    </div>`;
    const rows = entries.map(({ player: p, isSubstitution }) => {
      const name = compactBoxName(p.person?.fullName ?? 'TBD');
      const pos = isSubstitution ? 'ph' : (p.position?.abbreviation ?? '');
      const bs = p.stats?.batting ?? {};
      const cols = [bs.atBats ?? 0, bs.runs ?? 0, bs.hits ?? 0, bs.homeRuns ?? 0, bs.rbi ?? 0, bs.stolenBases ?? 0]
        .map(v => `<span>${v}</span>`).join('');
      const hasActivity = (bs.atBats ?? 0) > 0 || (bs.baseOnBalls ?? 0) > 0;
      return `<div class="score-lineup-row${hasActivity ? '' : ' score-lineup-row--dnp'}${isSubstitution ? ' score-lineup-row--sub' : ''}">
        <span class="score-lineup-pos">${esc(pos)}</span>
        <span class="score-lineup-name">${renderPlayerNameLink(name, p.person?.id ?? null)}</span>
        <span class="score-lineup-box-cols">${cols}</span>
      </div>`;
    }).join('');
    return header + rows;
  }

  if (gameState === 'live') {
    const entries = getInGameLineupEntries(team);
    return entries.map(({ player: p, isSubstitution }) => {
      const name = compactBoxName(p.person?.fullName ?? 'TBD');
      const pos = isSubstitution ? 'ph' : (p.position?.abbreviation ?? '');
      const bs = p.stats?.batting ?? {};
      const cols = [bs.atBats ?? 0, bs.runs ?? 0, bs.hits ?? 0, bs.homeRuns ?? 0, bs.rbi ?? 0, bs.stolenBases ?? 0]
        .map(v => `<span>${v}</span>`).join('');
      const isCurrentBatter = p.gameStatus?.isCurrentBatter;
      return `<div class="score-lineup-row${isCurrentBatter ? ' score-lineup-row--current' : ''}${isSubstitution ? ' score-lineup-row--sub' : ''}">
        <span class="score-lineup-pos">${esc(pos)}</span>
        <span class="score-lineup-name">${renderPlayerNameLink(name, p.person?.id ?? null)}</span>
        <span class="score-lineup-box-cols">${cols}</span>
      </div>`;
    }).join('');
  }

  // Preview: season slashlines
  const leaders = lineupLeaders(players, roster);
  const rows = players.map(id => {
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
      renderSlashSegment(rates.avg, avgValue > 0 && avgValue === leaders.avg, avgValue >= MLB_TOP_TEN_PROXY_RATES.avg),
      renderSlashSegment(rates.obp, obpValue > 0 && obpValue === leaders.obp, obpValue >= MLB_TOP_TEN_PROXY_RATES.obp),
      renderSlashSegment(rates.ops, opsValue > 0 && opsValue === leaders.ops, opsValue >= MLB_TOP_TEN_PROXY_RATES.ops),
    ].map((segment, idx) => `<span class="score-lineup-preview-stat score-lineup-preview-stat--${idx}">${segment}</span>`).join('');
    return `<div class="score-lineup-row">
      <span class="score-lineup-pos">${esc(pos)}</span>
      <span class="score-lineup-name">${renderPlayerNameLink(name, p.person?.id ?? null)}${batSideDisplay}</span>
      <span class="score-lineup-box-cols score-lineup-box-cols--preview">${slashLine}</span>
    </div>`;
  }).join('');
  return renderPreviewSlashHeader() + rows;
}

// ── Pitch arsenal ─────────────────────────────────────────────────
const PITCH_NAME_MAP = {
  ...PITCH_NAMES,
  FF: '4-Seam', FA: '4-Seam', FT: '2-Seam', SI: 'Sinker', FC: 'Cutter',
  SL: 'Slider', CU: 'Curve', KC: 'K. Curve', CH: 'Changeup', FS: 'Splitter',
  FO: 'Forkball', ST: 'Sweeper', KN: 'Knuckle', EP: 'Eephus',
};

function resolvePitchName(pitchType = {}) {
  const raw = [pitchType.description, pitchType.code, pitchType.abbreviation]
    .find(value => typeof value === 'string' && value.trim()) || '';
  return PITCH_NAME_MAP[raw] || raw || 'Pitch';
}

function pitchStyleToken(pitchName) {
  const n = String(pitchName || '').toLowerCase();
  if (n.includes('4-seam')) return 'four-seam';
  if (n.includes('2-seam')) return 'two-seam';
  if (n.includes('sinker')) return 'sinker';
  if (n.includes('slider')) return 'slider';
  if (n.includes('curve')) return 'curve';
  if (n.includes('change')) return 'change';
  if (n.includes('cutter')) return 'cutter';
  if (n.includes('split')) return 'splitter';
  if (n.includes('sweeper')) return 'sweeper';
  if (n.includes('knuckle')) return 'knuckle';
  if (n.includes('fork')) return 'forkball';
  return 'default';
}

function renderPitcherArsenal(arsenalData, { limit = 5, showVelo = true } = {}) {
  if (!arsenalData) {
    return `<div class="pitcher-arsenal pitcher-arsenal--loading"><span class="arsenal-loading">Loading…</span></div>`;
  }
  const items = arsenalData?.stats?.[0]?.splits ?? [];
  if (!items.length) return '';

  const pills = [...items]
    .sort((a, b) => (b.stat?.percentage ?? 0) - (a.stat?.percentage ?? 0))
    .slice(0, limit)
    .map(item => {
      const pitchType = item.stat?.type ?? item.type ?? {};
      const pitchName = resolvePitchName(pitchType);
      const token = pitchStyleToken(pitchName);
      const pct = item.stat?.percentage != null ? `${Math.round(item.stat.percentage * 100)}%` : '';
      const velo = showVelo && item.stat?.averageSpeed != null ? `${Math.round(item.stat.averageSpeed)} mph` : '';
      const meta = [pct, velo].filter(Boolean).join(' | ');
      return `<span class="scout-pitch-pill scout-pitch-pill--${token}" title="${esc(pitchType.description ?? '')}">
        <span class="scout-pitch-type">${esc(pitchName)}</span>
        ${meta ? `<span class="scout-pitch-meta">${esc(meta)}</span>` : ''}
      </span>`;
    }).join('');

  return `<div class="pitcher-arsenal">${pills}</div>`;
}

// ── Scout notes ───────────────────────────────────────────────────
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

function ordinalSuffix(num) {
  const n = Number(num);
  if (!Number.isFinite(n)) return '';
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th';
  }
}

function renderScoutNotes(game, arsenals, matchupCtx = null) {
  const isLive = game.status?.abstractGameState === 'Live';
  const isPreview = game.status?.abstractGameState === 'Preview';
  const isFinal = game.status?.abstractGameState === 'Final';
  const awayId = game.teams?.away?.team?.id;
  const homeId = game.teams?.home?.team?.id;
  const isOriolesGame = awayId === ORIOLES_ID || homeId === ORIOLES_ID;

  const notes = [];
  let badge = 'Scouting Report';
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
    const batter = offense.batter;
    const onDeck = offense.onDeck;
    const inHole = offense.inHole;
    const pitcher = defense.pitcher;
    const offTeamId = offense.team?.id;
    const offScore = awayId === offTeamId ? (game.teams?.away?.score ?? 0) : (game.teams?.home?.score ?? 0);
    const defScore = awayId === offTeamId ? (game.teams?.home?.score ?? 0) : (game.teams?.away?.score ?? 0);
    const diff = offScore - defScore;
    const absLead = Math.abs(diff);
    const lateGame = Number.isFinite(Number(inning)) && Number(inning) >= 7;
    const oriolesBatting = offense.team?.id === ORIOLES_ID;
    const oriolesPitching = defense.team?.id === ORIOLES_ID;
    pitchMix = renderScoutPitchMix(arsenals?.current ?? null, pitcher?.fullName ?? pitcher?.lastInitName ?? '');

    let situationNote = null;
    if (basesLoaded) {
      situationNote = `${playerLabel(batter)} up with the bases loaded — ${outs} out${outs === 1 ? '' : 's'}.`;
    } else if (risp > 0) {
      const rPos = risp === 2 ? 'runners in scoring position' : 'a runner in scoring position';
      situationNote = `${playerLabel(batter)} up with ${rPos}, ${outs} out${outs === 1 ? '' : 's'}.`;
    } else if (offense.first && outs === 0) {
      situationNote = `${playerLabel(batter)} up, runner on first, nobody out.`;
    } else if (offense.first && !offense.second && !offense.third && outs < 2) {
      situationNote = `${playerLabel(pitcher)} with a double-play chance — ${playerLabel(batter)} at the plate.`;
    }

    let leverageNote = null;
    if (diff === 0 && lateGame && runnersOn >= 1) {
      leverageNote = `Tied game, ${half} of the ${inning}${ordinalSuffix(inning)} — ${playerLabel(batter)} with a chance to take the lead.`;
    } else if (diff === -1) {
      if (runnersOn >= 1) {
        leverageNote = basesLoaded
          ? `Down one with the bases loaded — a sac fly ties it.`
          : `Tying run is on base with ${playerLabel(batter)} up.`;
      } else {
        leverageNote = `${playerLabel(batter)} is the tying run at the plate.`;
      }
    } else if (diff === -2) {
      if (runnersOn >= 2) {
        leverageNote = `Tying run is on base with ${playerLabel(batter)} up.`;
      } else if (runnersOn === 1) {
        leverageNote = `${playerLabel(batter)} is the tying run at the plate.`;
      }
    } else if (diff === -3 && runnersOn >= 2) {
      leverageNote = `${playerLabel(batter)} at the plate with the tying run in scoring position.`;
    } else if (diff > 0 && diff <= 3 && lateGame) {
      if (isOriolesGame && oriolesPitching) {
        leverageNote = `${playerLabel(pitcher)} protecting a ${diff}-run Orioles lead in the ${inning}${ordinalSuffix(inning)}.`;
      } else if (isOriolesGame && oriolesBatting) {
        leverageNote = `Orioles up ${diff} in the ${inning}${ordinalSuffix(inning)} — ${playerLabel(batter)} can extend the lead.`;
      } else {
        leverageNote = `${playerLabel(pitcher)} protecting a ${diff}-run lead, ${inning}${ordinalSuffix(inning)}.`;
      }
    } else if (diff >= 1 && diff <= 2 && lateGame && runnersOn >= 1) {
      leverageNote = `${playerLabel(batter)} can add insurance in a ${diff}-run game.`;
    }

    let countNote = null;
    if (balls != null && strikes != null) {
      if (balls === 3 && strikes === 0) {
        countNote = `${playerLabel(pitcher)} in a 3-0 hole to ${playerLabel(batter)}.`;
      } else if (balls === 3 && strikes === 1) {
        countNote = `Hitter's count, 3-1 — ${playerLabel(pitcher)} needs a strike.`;
      } else if (strikes === 2 && balls === 0) {
        countNote = `${playerLabel(pitcher)} sitting 0-2 on ${playerLabel(batter)}.`;
      } else if (strikes === 2 && balls === 1) {
        countNote = `${playerLabel(pitcher)} ahead 1-2 — looking for the strikeout.`;
      }
    }

    let nextNote = null;
    if (onDeck?.fullName) {
      nextNote = inHole?.fullName
        ? `Next: ${playerLabel(onDeck)}, then ${playerLabel(inHole)}.`
        : `On deck: ${playerLabel(onDeck)}.`;
    }

    let summaryNote = null;
    if (lateGame && !leverageNote) {
      if (diff === 0) {
        summaryNote = `Tied ballgame in the ${inning}${ordinalSuffix(inning)}.`;
      } else if (absLead <= 2) {
        summaryNote = `A ${absLead}-run game in the ${inning}${ordinalSuffix(inning)}.`;
      }
    }

    notes.push(...[situationNote, leverageNote, countNote, nextNote, summaryNote].filter(Boolean));
    context = `${ls.inningHalf || ''} ${String(inning || '')}`;
  } else if (isPreview) {
    const awayPitcher = game.teams?.away?.probablePitcher?.fullName;
    const homePitcher = game.teams?.home?.probablePitcher?.fullName;
    const mc = matchupCtx;
    if (mc && isOriolesGame) {
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
      const oriolesStats = awayId === ORIOLES_ID ? mc.awayTeamStats : mc.homeTeamStats;
      if (oriolesStats?.avg) {
        const avg = oriolesStats.avg;
        const obp = oriolesStats.obp ?? '';
        const gp = oriolesStats.gamesPlayed ?? 0;
        const rpg = gp > 0 && oriolesStats.runs != null ? (oriolesStats.runs / gp).toFixed(1) : null;
        const parts = [`${avg}/${obp}`];
        if (rpg) parts.push(`${rpg} R/G`);
        notes.push(`BAL offense: ${parts.join(', ')}`);
      }
    } else if (!isOriolesGame) {
      const awayAbbr = TEAM_ABBREV[awayId] ?? 'Away';
      const homeAbbr = TEAM_ABBREV[homeId] ?? 'Home';
      if (awayPitcher) notes.push(`${awayAbbr}: ${compactBoxName(awayPitcher)}`);
      if (homePitcher) notes.push(`${homeAbbr}: ${compactBoxName(homePitcher)}`);
    }
  } else if (isFinal) {
    return '';
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

// ── Popover rendering ─────────────────────────────────────────────
function renderPreviewTeamCard(game, boxData, side, arsenalData) {
  const matchupTeam = game.teams?.[side]?.team ?? {};
  const boxTeam = boxData?.teams?.[side] ?? null;
  const teamId = matchupTeam.id ?? boxTeam?.team?.id;
  const teamName = matchupTeam.teamName ?? boxTeam?.team?.teamName ?? matchupTeam.name ?? (side === 'away' ? 'Away Team' : 'Home Team');
  const probablePitcher = game.teams?.[side]?.probablePitcher?.fullName ?? 'TBD';
  const probablePitcherId = game.teams?.[side]?.probablePitcher?.id ?? null;
  const lineupRows = boxTeam ? renderLineupRows(boxTeam, 'preview') : '<div class="score-lineups-empty">Loading lineup status…</div>';
  const arsenal = renderPitcherArsenal(arsenalData ?? null, { limit: 7, showVelo: false });
  const logoHtml = teamId ? `<img class="score-lineup-logo" src="https://www.mlbstatic.com/team-logos/${teamId}.svg" alt="${esc(teamName)}" width="20" height="20">` : '';
  return `<div class="preview-team-card">
    <div class="score-lineup-head">${logoHtml}<span class="score-lineup-label">${esc(teamName)}</span></div>
    <div class="preview-team-section">
      <div class="preview-team-subhead">Probable Pitcher</div>
      <div class="probable-pitcher-row"><span class="probable-pitcher-name">${renderPlayerNameLink(probablePitcher, probablePitcherId)}</span></div>
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
    <div class="score-lineups-grid">
      ${renderPreviewTeamCard(game, boxData, 'away', arsenals?.away ?? null)}
      ${renderPreviewTeamCard(game, boxData, 'home', arsenals?.home ?? null)}
    </div>
    ${scoutNotes}
  </div>`;
}

function renderPitchingLines(boxData, gameState = 'final') {
  if (!boxData?.teams) return '';

  const renderPitchingRows = side => {
    const team = boxData.teams?.[side];
    if (!team) return '<div class="score-lineups-empty">Pitching lines unavailable</div>';
    const pitchers = Object.values(team.players ?? {})
      .filter(player => player.stats?.pitching?.inningsPitched != null)
      .map(player => {
        const stats = player.stats.pitching;
        return {
          name: player.person?.fullName ?? 'TBD',
          playerId: player.person?.id ?? null,
          ip: stats.inningsPitched ?? '0.0',
          h: stats.hits ?? 0,
          er: stats.earnedRuns ?? 0,
          k: stats.strikeOuts ?? 0,
          ipNum: parseFloat(stats.inningsPitched ?? 0),
          pitchHand: player.person?.pitchHand?.code ?? '',
        };
      })
      .sort((a, b) => b.ipNum - a.ipNum);

    if (!pitchers.length) return '<div class="score-lineups-empty">Pitching lines unavailable</div>';
    const spIndex = pitchers[0].ipNum >= 2 ? 0 : -1;
    const header = `<div class="score-lineup-row score-lineup-row--header">
      <span class="score-lineup-pos"></span><span class="score-lineup-name"></span>
      <span class="score-lineup-box-cols score-lineup-box-cols--pitch"><span>IP</span><span>H</span><span>ER</span><span>K</span></span>
    </div>`;
    const rows = pitchers.map((p, i) => {
      const role = i === spIndex ? 'SP' : 'RP';
      const handDisplay = p.pitchHand ? `<span class="score-lineup-hand">(${p.pitchHand})</span>` : '';
      const cols = [p.ip, p.h, p.er, p.k].map(v => `<span>${v}</span>`).join('');
      return `<div class="score-lineup-row">
        <span class="score-lineup-pos">${role}</span>
        <span class="score-lineup-name">${renderPlayerNameLink(compactBoxName(p.name), p.playerId)}${handDisplay}</span>
        <span class="score-lineup-box-cols score-lineup-box-cols--pitch">${cols}</span>
      </div>`;
    }).join('');
    const content = header + rows;
    return pitchers.length > 4 ? `<div class="pitching-scroll">${content}</div>` : content;
  };

  const renderSide = side => {
    const team = boxData.teams?.[side];
    if (!team) return '';
    const teamName = team.team?.teamName ?? team.team?.name ?? (side === 'away' ? 'Away' : 'Home');
    const teamId = team.team?.id;
    const logoHtml = teamId ? `<img class="score-lineup-logo" src="https://www.mlbstatic.com/team-logos/${teamId}.svg" alt="${esc(teamName)}" width="20" height="20">` : '';
    return `<div class="team-detail-card">
      <div class="score-lineup-head">${logoHtml}<span class="score-lineup-label">${esc(teamName)}</span></div>
      <div class="preview-team-section team-detail-pitching">
        <div class="preview-team-subhead">Pitching</div>
        <div class="score-lineup-side">${renderPitchingRows(side)}</div>
      </div>
      <div class="preview-team-section">
        <div class="preview-team-subhead">Lineup</div>
        <div class="score-lineup-side">${renderLineupRows(team, gameState)}</div>
      </div>
    </div>`;
  };

  return `<div class="score-lineups"><div class="score-lineups-grid score-lineups-grid--details">${renderSide('away')}${renderSide('home')}</div></div>`;
}

function syncPopoverTeamDetailHeights(popover) {
  if (!popover) return;
  const sections = [...popover.querySelectorAll('.team-detail-pitching')];
  if (!sections.length) return;
  sections.forEach(s => { s.style.minHeight = ''; });
  const maxH = Math.max(...sections.map(s => s.offsetHeight || 0));
  if (!maxH) return;
  sections.forEach(s => { s.style.minHeight = `${maxH}px`; });
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

function renderPopoverLegend() {
  return `<div class="box-legend" aria-label="Popover legend">
    <span class="box-legend-label">Legend</span>
    <span class="box-legend-item"><span class="box-legend-chip box-legend-chip--leader">Team Leader</span></span>
    <span class="box-legend-item"><span class="box-legend-text box-legend-text--top-ten">MLB Top 10</span></span>
  </div>`;
}

export function getGamedayUrl(g) {
  const away = g.teams.away;
  const home = g.teams.home;
  const { isPreviewLike } = getScoreChipStatus(g);
  const awaySlug = TEAM_SLUG[away.team.id] ?? away.team.name.split(' ').pop().toLowerCase();
  const homeSlug = TEAM_SLUG[home.team.id] ?? home.team.name.split(' ').pop().toLowerCase();
  const gameDate = g.gameDate.slice(0, 10).replace(/-/g, '/');
  const gamedaySuffix = isPreviewLike ? 'preview' : 'final';
  return `https://www.mlb.com/gameday/${awaySlug}-vs-${homeSlug}/${gameDate}/${g.gamePk}/${gamedaySuffix}`;
}

function renderPopoverGameLink(g) {
  const isPreview = g.status?.abstractGameState === 'Preview';
  const label = isPreview ? 'Open Game Preview' : 'Open Game Results';
  return `<div class="box-popover-actions">
    <a class="box-popover-link" href="${getGamedayUrl(g)}" target="_blank" rel="noopener">
      <img class="box-popover-link-logo" src="${import.meta.env.BASE_URL}mlb-logo.png" alt="" width="14" height="14" loading="eager" decoding="async">
      <span>${label}</span>
    </a>
  </div>`;
}

function renderBoxScore(g, boxData, arsenals, matchupCtx = null) {
  const isPreview = g.status.abstractGameState === 'Preview';
  if (isPreview) {
    return `${renderPreviewMatchup(g, boxData, arsenals, matchupCtx)}${renderPopoverLegend()}${renderPopoverGameLink(g)}`;
  }

  const ls = g.linescore;
  const away = g.teams.away;
  const home = g.teams.home;
  const awayAbbr = teamAbbr(away.team);
  const homeAbbr = teamAbbr(home.team);
  const innings = ls?.innings ?? [];
  const numInnings = Math.max(innings.length, 9);

  let hdr = '<th class="box-team-col"></th>';
  for (let i = 1; i <= numInnings; i++) hdr += `<th>${i}</th>`;
  hdr += '<th class="box-total">R</th><th class="box-total">H</th><th class="box-total">E</th>';

  let awayRow = `<td class="box-team-col">${esc(awayAbbr)}</td>`;
  for (let i = 0; i < numInnings; i++) {
    awayRow += `<td>${innings[i]?.away?.runs ?? (i < innings.length ? '0' : '')}</td>`;
  }
  const at = ls?.teams?.away ?? {};
  const awayRuns = Number(at.runs ?? away.score ?? 0);
  awayRow += `<td class="box-total">${at.runs ?? away.score ?? ''}</td><td class="box-total">${at.hits ?? ''}</td><td class="box-total">${at.errors ?? ''}</td>`;

  let homeRow = `<td class="box-team-col">${esc(homeAbbr)}</td>`;
  for (let i = 0; i < numInnings; i++) {
    homeRow += `<td>${innings[i]?.home?.runs ?? (i < innings.length ? '0' : '')}</td>`;
  }
  const ht = ls?.teams?.home ?? {};
  const homeRuns = Number(ht.runs ?? home.score ?? 0);
  homeRow += `<td class="box-total">${ht.runs ?? home.score ?? ''}</td><td class="box-total">${ht.hits ?? ''}</td><td class="box-total">${ht.errors ?? ''}</td>`;
  const awayWinnerClass = awayRuns > homeRuns ? ' class="box-score-row box-score-row--winner"' : ' class="box-score-row"';
  const homeWinnerClass = homeRuns > awayRuns ? ' class="box-score-row box-score-row--winner"' : ' class="box-score-row"';

  const gameState = g.status.abstractGameState === 'Live' ? 'live' : 'final';
  const decisions = renderDecisionStrip(g);
  const pitchingLines = renderPitchingLines(boxData, gameState);
  const scoutNotes = renderScoutNotes(g, arsenals, null);

  return `<div class="box-popover-stack">
    ${scoutNotes}
    <div class="box-section box-linescore">
      <table class="box-score-table">
        <thead><tr>${hdr}</tr></thead>
        <tbody>
          <tr${awayWinnerClass}>${awayRow}</tr>
          <tr${homeWinnerClass}>${homeRow}</tr>
        </tbody>
      </table>
      ${decisions}
    </div>
    ${pitchingLines}
    ${renderPopoverGameLink(g)}
  </div>`;
}

// ── loadScores ────────────────────────────────────────────────────
export async function loadScores() {
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
        const id = day.label === 'Today' ? ' id="todayLabel"' : day.label === 'Yesterday' ? ' id="yesterdayLabel"' : '';
        html += `<span class="scores-day-label"${id}>${day.label}</span>`;
        html += day.games.map(renderGameChip).join('');
      }
    }
    track.innerHTML = html || '<span class="scores-msg">No games scheduled</span>';

    // Box score popover
    let boxPopover = document.getElementById('boxScorePopover');
    if (!boxPopover) {
      boxPopover = document.createElement('div');
      boxPopover.id = 'boxScorePopover';
      boxPopover.className = 'box-score-popover hidden';
      document.body.appendChild(boxPopover);
    }
    let boxShowTimer = null;
    let boxHideTimer = null;
    let pinnedChip = null;
    const BOX_POPOVER_SHOW_DELAY = 1000;
    const BOX_POPOVER_HIDE_DELAY = 250;

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
    function setChipExpandedState(activeChip = null) {
      track.querySelectorAll('.score-chip').forEach(ch => {
        ch.setAttribute('aria-expanded', ch === activeChip ? 'true' : 'false');
      });
    }
    function hideBoxScoreImmediate() {
      clearTimeout(boxShowTimer); clearTimeout(boxHideTimer);
      pinnedChip = null; setChipExpandedState(null);
      boxPopover.classList.add('hidden');
    }
    function showBoxScore(chip) {
      const pk = chip.dataset.gamepk;
      const g = state.gamesMap[pk];
      if (!g) return;
      clearTimeout(boxShowTimer); clearTimeout(boxHideTimer);
      setChipExpandedState(chip);

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
      const awayVsKey = `${awayPitcherId}_vs_${homeTeamId}`;
      const homeVsKey = `${homePitcherId}_vs_${awayTeamId}`;

      function buildArsenals() {
        return isPreview
          ? { away: arsenalCache[awayPitcherId] ?? null, home: arsenalCache[homePitcherId] ?? null }
          : isLive ? { current: arsenalCache[livePitcherId] ?? null } : null;
      }
      function buildMatchupCtx() {
        if (!isPreview || !isOriolesGame) return null;
        return {
          awayPitcherVs: pitcherVsCache[awayVsKey] ?? null,
          homePitcherVs: pitcherVsCache[homeVsKey] ?? null,
          awayTeamStats: teamStatsCache[awayTeamId] ?? null,
          homeTeamStats: teamStatsCache[homeTeamId] ?? null,
        };
      }

      boxPopover.innerHTML = renderBoxScore(g, boxscoreCache[pk] || null, buildArsenals(), buildMatchupCtx());
      boxPopover.style.left = '-9999px'; boxPopover.style.top = '0';
      boxPopover.classList.remove('hidden');
      syncPopoverTeamDetailHeights(boxPopover);
      positionPopover(chip);

      const missing = [
        !boxscoreCache[pk]                                         && fetchBoxscore(pk),
        isPreview && !arsenalCache[awayPitcherId]                 && fetchArsenal(awayPitcherId),
        isPreview && !arsenalCache[homePitcherId]                 && fetchArsenal(homePitcherId),
        isLive && livePitcherId && !arsenalCache[livePitcherId]   && fetchArsenal(livePitcherId),
        isPreview && isOriolesGame && pitcherVsCache[awayVsKey] === undefined && fetchPitcherVsTeam(awayPitcherId, homeTeamId),
        isPreview && isOriolesGame && pitcherVsCache[homeVsKey] === undefined && fetchPitcherVsTeam(homePitcherId, awayTeamId),
        isPreview && isOriolesGame && !teamStatsCache[awayTeamId] && fetchTeamStats(awayTeamId),
        isPreview && isOriolesGame && !teamStatsCache[homeTeamId] && fetchTeamStats(homeTeamId),
      ].filter(Boolean);

      if (missing.length) {
        Promise.all(missing).then(() => {
          if (boxPopover.classList.contains('hidden')) return;
          boxPopover.innerHTML = renderBoxScore(g, boxscoreCache[pk] || null, buildArsenals(), buildMatchupCtx());
          syncPopoverTeamDetailHeights(boxPopover);
          positionPopover(chip);
        });
      }
    }
    function scheduleShowBoxScore(chip) {
      if (pinnedChip) return;
      clearTimeout(boxShowTimer); clearTimeout(boxHideTimer);
      boxShowTimer = setTimeout(() => showBoxScore(chip), BOX_POPOVER_SHOW_DELAY);
    }
    function hideBoxScore() {
      if (pinnedChip) return;
      clearTimeout(boxShowTimer); clearTimeout(boxHideTimer);
      boxHideTimer = setTimeout(() => boxPopover.classList.add('hidden'), BOX_POPOVER_HIDE_DELAY);
    }
    track.querySelectorAll('.score-chip').forEach(chip => {
      chip.addEventListener('mouseenter', () => scheduleShowBoxScore(chip));
      chip.addEventListener('mouseleave', hideBoxScore);
      chip.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        if (pinnedChip === chip && !boxPopover.classList.contains('hidden')) { hideBoxScoreImmediate(); return; }
        pinnedChip = chip;
        showBoxScore(chip);
      });
    });
    boxPopover.addEventListener('mouseenter', () => { clearTimeout(boxShowTimer); clearTimeout(boxHideTimer); });
    boxPopover.addEventListener('mouseleave', hideBoxScore);
    if (!boxPopover.dataset.globalBound) {
      document.addEventListener('click', e => {
        if (boxPopover.classList.contains('hidden')) return;
        if (boxPopover.contains(e.target)) return;
        if (e.target.closest('.score-chip')) return;
        hideBoxScoreImmediate();
      });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') hideBoxScoreImmediate(); });
      boxPopover.dataset.globalBound = 'true';
    }

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
