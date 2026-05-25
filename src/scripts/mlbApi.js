// ── MLB Stats API abstraction layer ───────────────────────────────
// All direct MLB API fetch() calls go here. Each function owns URL
// construction and returns parsed JSON (or a relevant sub-object).
// Throws on non-OK responses so callers can catch network errors.

import { MLB, ORIOLES_ID, SEASON } from './config.js';

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MLB API ${res.status}: ${url}`);
  return res.json();
}

// ── Schedule ──────────────────────────────────────────────────────
// hydrate: comma-separated hydration string, e.g. 'linescore,team,venue,decisions,probablePitcher'
export async function fetchScheduleByDate(date, { hydrate = 'linescore,team,venue,decisions,probablePitcher' } = {}) {
  return getJson(`${MLB}/schedule?sportId=1&date=${date}&hydrate=${encodeURIComponent(hydrate)}`);
}

// Fetch Orioles schedule over a date range (used by On Deck sidebar)
export async function fetchTeamSchedule(teamId = ORIOLES_ID, startDate, endDate, { hydrate = 'probablePitcher,venue' } = {}) {
  return getJson(`${MLB}/schedule?sportId=1&teamId=${teamId}&startDate=${startDate}&endDate=${endDate}&hydrate=${encodeURIComponent(hydrate)}`);
}

// Fetch Orioles schedule with media content hydration (used by recap video)
export async function fetchTeamScheduleWithMedia(teamId = ORIOLES_ID, startDate, endDate) {
  return getJson(`${MLB}/schedule?sportId=1&teamId=${teamId}&startDate=${startDate}&endDate=${endDate}&hydrate=${encodeURIComponent('game(content(media(epg)))')}`);
}

// ── Box score ─────────────────────────────────────────────────────
export async function fetchBoxscore(gamePk) {
  return getJson(`${MLB}/game/${gamePk}/boxscore`);
}

// ── Pitch arsenal ─────────────────────────────────────────────────
export async function fetchArsenal(playerId) {
  return getJson(`${MLB}/people/${playerId}/stats?stats=pitchArsenal&season=${SEASON}&group=pitching`);
}

// ── Team stats (season hitting) ───────────────────────────────────
export async function fetchTeamStats(teamId) {
  const data = await getJson(`${MLB}/teams/${teamId}/stats?stats=season&season=${SEASON}&group=hitting`);
  return data.stats?.[0]?.splits?.[0]?.stat ?? null;
}

// ── Pitcher vs opposing team (career) ─────────────────────────────
export async function fetchPitcherVsTeam(pitcherId, opposingTeamId) {
  const data = await getJson(
    `${MLB}/people/${pitcherId}/stats?stats=vsTeamTotal&group=pitching&opposingTeamId=${opposingTeamId}`
  );
  return data.stats?.[0]?.splits?.[0]?.stat ?? null;
}

// ── Standings ─────────────────────────────────────────────────────
export async function fetchStandings() {
  return getJson(`${MLB}/standings?leagueId=103,104&season=${SEASON}&standingsTypes=regularSeason`);
}

// ── Roster ────────────────────────────────────────────────────────
export async function fetchRoster(teamId = ORIOLES_ID, { rosterType = '40Man', season = SEASON } = {}) {
  return getJson(`${MLB}/teams/${teamId}/roster?rosterType=${rosterType}&season=${season}`);
}

// Roster without season param (used by loadInjuryReport)
export async function fetchRosterCurrent(teamId = ORIOLES_ID, { rosterType = '40Man' } = {}) {
  return getJson(`${MLB}/teams/${teamId}/roster?rosterType=${rosterType}`);
}

// ── Transactions ──────────────────────────────────────────────────
export async function fetchTransactions(teamId = ORIOLES_ID, startDate, endDate) {
  return getJson(`${MLB}/transactions?teamId=${teamId}&startDate=${startDate}&endDate=${endDate}`);
}

// ── Stat leaders ──────────────────────────────────────────────────
// Team leaders (e.g. Orioles)
export async function fetchTeamLeaders(teamId = ORIOLES_ID, { leaderCategories, season = SEASON, leaderGameTypes = 'R', playerPool = 'Qualified' } = {}) {
  return getJson(`${MLB}/teams/${teamId}/leaders?leaderCategories=${leaderCategories}&season=${season}&leaderGameTypes=${leaderGameTypes}&playerPool=${playerPool}`);
}

// League leaders (AL, NL, or MLB)
export async function fetchLeagueLeaders({ leaderCategories, season = SEASON, leaderGameTypes = 'R', leagueId = '', playerPool = 'Qualified', limit = 1 } = {}) {
  const leagueParam = leagueId ? `&leagueId=${leagueId}` : '';
  return getJson(`${MLB}/stats/leaders?leaderCategories=${leaderCategories}&season=${season}&leaderGameTypes=${leaderGameTypes}${leagueParam}&playerPool=${playerPool}&limit=${limit}`);
}
