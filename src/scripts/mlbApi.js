// ── MLB Stats API wrappers ───────────────────────────────────────────
// Centralizes URL construction for every distinct endpoint scores.js and
// sidebars.js call, so an API shape change only needs a fix in one place.
// Pure fetch-and-parse only — no caching here, callers that need caching
// (scores.js's boxscore/arsenal/team-stats/pitcher-vs-team wrappers) keep
// their own cache Maps and call through to these.
import { MLB } from './config.js';

function getJson(url) {
  return fetch(url).then(r => r.json());
}

export function fetchScheduleByDate(date, hydrate) {
  return getJson(`${MLB}/schedule?sportId=1&date=${date}&hydrate=${hydrate}`);
}

export function fetchTeamSchedule(teamId, startDate, endDate, hydrate) {
  return getJson(`${MLB}/schedule?sportId=1&teamId=${teamId}&startDate=${startDate}&endDate=${endDate}&hydrate=${hydrate}`);
}

export function fetchBoxscoreRaw(gamePk) {
  return getJson(`${MLB}/game/${gamePk}/boxscore`);
}

export function fetchLiveFeed(gamePk) {
  return getJson(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`);
}

export function fetchPitchArsenalRaw(playerId, season) {
  return getJson(`${MLB}/people/${playerId}/stats?stats=pitchArsenal&season=${season}&group=pitching`);
}

export function fetchPlayerSeasonStats(playerId, group, season) {
  return getJson(`${MLB}/people/${playerId}/stats?stats=season&group=${group}&season=${season}`);
}

export function fetchTeamHittingStatsRaw(teamId, season) {
  return getJson(`${MLB}/teams/${teamId}/stats?stats=season&season=${season}&group=hitting`);
}

export function fetchPitcherVsTeamRaw(pitcherId, oppTeamId) {
  return getJson(`${MLB}/people/${pitcherId}/stats?stats=vsTeamTotal&group=pitching&opposingTeamId=${oppTeamId}`);
}

export function fetchStandings(season, standingsType) {
  return getJson(`${MLB}/standings?leagueId=103,104&season=${season}&standingsTypes=${standingsType}`);
}

export function fetchTeamRoster(teamId, rosterType, season) {
  const seasonParam = season ? `&season=${season}` : '';
  return getJson(`${MLB}/teams/${teamId}/roster?rosterType=${rosterType}${seasonParam}`);
}

export function fetchTransactions(teamId, startDate, endDate) {
  return getJson(`${MLB}/transactions?teamId=${teamId}&startDate=${startDate}&endDate=${endDate}`);
}

export function fetchTeamLeaders(teamId, leaderCategories, season, { leaderGameTypes = 'R', playerPool = 'Qualified' } = {}) {
  return getJson(`${MLB}/teams/${teamId}/leaders?leaderCategories=${leaderCategories}&season=${season}&leaderGameTypes=${leaderGameTypes}&playerPool=${playerPool}`);
}

export function fetchLeagueLeaders(leaderCategories, season, { leaderGameTypes = 'R', leagueId, playerPool = 'Qualified', limit } = {}) {
  const leagueParam = leagueId ? `&leagueId=${leagueId}` : '';
  const limitParam = limit ? `&limit=${limit}` : '';
  return getJson(`${MLB}/stats/leaders?leaderCategories=${leaderCategories}&season=${season}&leaderGameTypes=${leaderGameTypes}${leagueParam}&playerPool=${playerPool}${limitParam}`);
}
