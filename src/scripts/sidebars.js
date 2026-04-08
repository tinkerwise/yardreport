// ── Sidebars ──────────────────────────────────────────────────────
import {
  DIVISION_NAMES,
  MLB,
  ORIOLES_ID,
  PROXY,
  SEASON,
  TEAM_ABBREV,
  TEAM_PAGE,
  TEAM_SLUG,
} from './config.js';
import { state } from './state.js';
import {
  $,
  esc,
  normalizeText,
  localDateStr,
  fetchVenueDetails,
  cleanFeedText,
  relativeDate,
} from './utils.js';
import { fetchWeatherForGames, getGameWeather } from './weather.js';

// ── Standings ─────────────────────────────────────────────────────
export async function loadStandings() {
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
          <td class="team-abbrev"><a href="${teamUrl}" target="_blank" rel="noopener"><img class="standings-team-logo" src="https://www.mlbstatic.com/team-logos/${t.id}.svg" alt="" width="14" height="14" loading="lazy" decoding="async">${esc(t.abbrev)}</a></td>
          <td>${t.wins}</td><td>${t.losses}</td>
          <td>${esc(t.gb)}</td><td>${esc(t.streak)}</td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>`;
}

// ── On Deck ───────────────────────────────────────────────────────
export async function loadOnDeck() {
  const wrap = $('onDeckWrap');
  try {
    const today = localDateStr(0);
    const tomorrowStr = localDateStr(1);
    const endDate = localDateStr(14);
    const data = await fetch(
      `${MLB}/schedule?sportId=1&teamId=${ORIOLES_ID}&startDate=${today}&endDate=${endDate}&hydrate=probablePitcher,venue`
    ).then(r => r.json());

    const games = (data.dates ?? []).flatMap(d => d.games);
    const todayStr = today;
    const todayGame = games.find(g => g.gameDate.startsWith(todayStr));
    const todayIsLive = todayGame?.status?.abstractGameState === 'Live';

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

    const nextIsToday = next.gameDate.startsWith(todayStr);
    const nextIsTomorrow = next.gameDate.startsWith(tomorrowStr);
    let wxHtml = '';
    if (nextIsToday || nextIsTomorrow) {
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

    const todayIsNotFinal = todayGame && todayGame.status?.abstractGameState !== 'Final';
    let gamedayMediaHtml = '';
    if (todayIsNotFinal) {
      const tAway = todayGame.teams.away;
      const tHome = todayGame.teams.home;
      const tAwaySlug = TEAM_SLUG[tAway.team.id] ?? '';
      const tHomeSlug = TEAM_SLUG[tHome.team.id] ?? '';
      const tGdDate = todayGame.gameDate.slice(0, 10).replace(/-/g, '/');
      const tIsLive = todayGame.status?.abstractGameState === 'Live';
      const tSuffix = tIsLive ? 'live' : 'preview';
      const todayGamedayUrl = `https://www.mlb.com/gameday/${tAwaySlug}-vs-${tHomeSlug}/${tGdDate}/${todayGame.gamePk}/${tSuffix}`;
      gamedayMediaHtml = `
      <div class="gameday-media-strip">
        <a class="gameday-media-link" href="${todayGamedayUrl}" target="_blank" rel="noopener" aria-label="Watch on MLB.com">
          <svg class="gameday-media-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          <span class="gameday-media-label">Watch</span>
          <span class="gameday-media-network">MLB.tv</span>
        </a>
        <a class="gameday-media-link" href="${todayGamedayUrl}" target="_blank" rel="noopener" aria-label="Listen on MLB.com">
          <svg class="gameday-media-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          <span class="gameday-media-label">Listen</span>
          <span class="gameday-media-network">MLB Audio</span>
        </a>
      </div>`;
    }

    wrap.innerHTML = `
      <div class="on-deck-card-wrap">
        <a class="on-deck-card" href="${gdUrl}" target="_blank" rel="noopener">
          ${wxHtml}
          <div class="on-deck-matchup">
            <img class="on-deck-logo" src="https://www.mlbstatic.com/team-logos/${opponent.team.id}.svg" alt="" width="28" height="28">
            <span class="on-deck-opp">${esc(onDeckOpponentLabel)}</span>
          </div>
          <div class="on-deck-details">
            <span class="on-deck-date">${esc(dateStr)} · ${esc(timeStr)}</span>
            <span class="on-deck-venue">${esc(venue)}</span>
          </div>
        </a>
        ${gamedayMediaHtml}
      </div>
      ${scheduleHtml}`;
  } catch {
    wrap.innerHTML = '<span class="sidebar-msg">Unavailable</span>';
  }
}

// ── Roster ────────────────────────────────────────────────────────
function savantUrl(playerId) {
  return `https://baseballsavant.mlb.com/savant-player/${playerId}`;
}

export async function loadRoster() {
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

// ── Transactions ──────────────────────────────────────────────────
export async function loadTransactions() {
  const wrap = $('transactionsWrap');
  try {
    const end = localDateStr(0);
    const startD = new Date();
    startD.setDate(startD.getDate() - 14);
    const start = startD.toISOString().slice(0, 10);

    const data = await fetch(
      `${MLB}/transactions?teamId=${ORIOLES_ID}&startDate=${start}&endDate=${end}`
    ).then(r => r.json());

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

// ── Injury Report ─────────────────────────────────────────────────
export async function loadInjuryReport() {
  const wrap = $('ilWrap');
  try {
    const [data, txData] = await Promise.all([
      fetch(`${MLB}/teams/${ORIOLES_ID}/roster?rosterType=40Man`).then(r => r.json()),
      fetch(`${MLB}/transactions?teamId=${ORIOLES_ID}&startDate=${SEASON}-01-01&endDate=${localDateStr(0)}`).then(r => r.json()).catch(() => ({ transactions: [] })),
    ]);

    const injured = (data.roster ?? []).filter(p =>
      p.status?.description?.toLowerCase().includes('injured')
    );

    if (!injured.length) {
      wrap.innerHTML = '<span class="sidebar-msg">No players on IL</span>';
      return;
    }

    const getILDays = p => {
      const m = p.status.description.match(/(\d+)-day/i);
      return m ? parseInt(m[1]) : 99;
    };
    const transactions = txData.transactions ?? [];
    const parseDate = value => {
      if (!value) return null;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const prettyDate = value => {
      const d = parseDate(value);
      return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    };
    const findIlTimeline = player => {
      const playerId = player.person?.id;
      const statusDays = getILDays(player);
      const related = transactions
        .filter(tx => tx.person?.id === playerId)
        .filter(tx => /injured list/i.test(tx.description || '') || /status change/i.test(tx.typeDesc || ''))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      const placements = related.filter(tx => /placed .*injured list/i.test(tx.description || ''));
      const currentPlacement = placements.length ? placements[placements.length - 1] : null;
      const earliestPlacement = placements.length ? placements[0] : null;
      const sourceTx = currentPlacement || earliestPlacement || related[related.length - 1] || null;
      if (!sourceTx) return { startedLabel: '', expectedLabel: '', sortTime: Number.MAX_SAFE_INTEGER };

      const desc = sourceTx.description || '';
      const retroMatch = desc.match(/retroactive to ([A-Za-z]+ \d{1,2}, \d{4})/i);
      const startDate = parseDate(retroMatch?.[1] || sourceTx.date);
      const isRetro = Boolean(retroMatch);
      const startedLabel = startDate
        ? `Started ${prettyDate(startDate)}${isRetro ? ' (retro)' : ''}`
        : '';

      let expectedLabel = '';
      let sortTime = Number.MAX_SAFE_INTEGER;
      if (startDate && Number.isFinite(statusDays) && statusDays < 60) {
        const eligible = new Date(startDate);
        eligible.setDate(eligible.getDate() + statusDays);
        expectedLabel = `Earliest ${prettyDate(eligible)}`;
        sortTime = eligible.getTime();
      } else if (startDate) {
        sortTime = startDate.getTime() + statusDays * 864e5;
      }

      return { startedLabel, expectedLabel, sortTime };
    };

    const enriched = injured.map(player => ({ player, timeline: findIlTimeline(player) }));
    enriched.sort((a, b) =>
      a.timeline.sortTime - b.timeline.sortTime ||
      getILDays(a.player) - getILDays(b.player) ||
      a.player.person.fullName.localeCompare(b.player.person.fullName)
    );

    const groups = {};
    for (const item of enriched) {
      const days = getILDays(item.player);
      const key = [10, 15, 60].includes(days) ? `${days}-Day IL` : 'IL';
      (groups[key] ??= []).push(item);
    }
    const groupOrder = ['10-Day IL', '15-Day IL', '60-Day IL', 'IL'];
    wrap.innerHTML = `<div class="il-list">${groupOrder.filter(k => groups[k]?.length).map(groupName => {
      const rows = groups[groupName].map(({ player: p, timeline }) => {
        const playerUrl = `https://www.mlb.com/player/${p.person.id}`;
        const note = normalizeText(p.note || '');
        const pos = p.position?.abbreviation ?? '';
        const eta = timeline.expectedLabel.replace('Earliest ', '') || timeline.startedLabel || '';
        return `<div class="il-item">
          <div class="il-topline">
            <a class="il-name" href="${playerUrl}" target="_blank" rel="noopener">${esc(p.person.fullName)}</a>
            ${pos ? `<span class="il-pos">${esc(pos)}</span>` : ''}
            ${eta ? `<span class="il-eta">${esc(eta)}</span>` : ''}
          </div>
          ${note ? `<div class="il-note">${esc(note)}</div>` : ''}
        </div>`;
      }).join('');
      return `<div class="il-group"><div class="il-group-label">${esc(groupName)}</div>${rows}</div>`;
    }).join('')}</div>`;
  } catch {
    wrap.innerHTML = '<span class="sidebar-msg">Unavailable</span>';
  }
}

// ── Video widget ──────────────────────────────────────────────────
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

function shortGameDateForVideo(dateStr) {
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
  const targetDate = latestGame?.officialDate ? shortGameDateForVideo(latestGame.officialDate) : '';

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

export async function loadVideos() {
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

// ── Podcast ───────────────────────────────────────────────────────
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
  const show = () => { active = true; place(); panel.classList.add('is-visible'); };
  const hide = () => { active = false; panel.classList.remove('is-visible'); };
  const refresh = () => { if (active) place(); };

  card.addEventListener('mouseenter', show);
  card.addEventListener('mouseleave', hide);
  card.addEventListener('focusin', show);
  card.addEventListener('focusout', hide);
  window.addEventListener('scroll', refresh, { passive: true });
  window.addEventListener('resize', refresh);
}

export async function loadPodcast() {
  const wrap = $('podcastWrap');
  try {
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
        <source src="${audioUrl}" type="${audioType}">
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

// ── Video Theater Overlay ─────────────────────────────────────────
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

// ── Yard Leaders ──────────────────────────────────────────────────
const leadersCache = {};
let leadersScope = 'orioles';

const BATTING_ORDER = ['onBasePlusSlugging', 'sluggingPercentage', 'onBasePercentage', 'battingAverage', 'homeRuns', 'runsBattedIn', 'hits', 'baseOnBalls', 'walks'];
const PITCHING_ORDER = ['earnedRunAverage', 'walksAndHitsPerInningPitched', 'strikeoutsPer9Inn', 'strikeouts', 'walksPer9Inn', 'qualityStarts', 'wins', 'gamesStarted'];
const TEAM_LEADERS_CATS = 'onBasePlusSlugging,sluggingPercentage,onBasePercentage,battingAverage,homeRuns,runsBattedIn,hits,baseOnBalls,earnedRunAverage,walksAndHitsPerInningPitched,strikeoutsPer9Inn,strikeouts,walksPer9Inn,qualityStarts,wins,gamesStarted';
const LEAGUE_LEADERS_CATS = 'onBasePlusSlugging,sluggingPercentage,onBasePercentage,battingAverage,homeRuns,runsBattedIn,hits,walks,earnedRunAverage,walksAndHitsPerInningPitched,strikeoutsPer9Inn,strikeouts,walksPer9Inn,wins,gamesStarted';
const BATTING_LABELS = { battingAverage: 'AVG', onBasePercentage: 'OBP', onBasePlusSlugging: 'OPS', homeRuns: 'HR', hits: 'H', baseOnBalls: 'BB', walks: 'BB', sluggingPercentage: 'SLG', runsBattedIn: 'RBI' };
const PITCHING_LABELS = { earnedRunAverage: 'ERA', strikeouts: 'SO', gamesStarted: 'GS', qualityStarts: 'QS', walksAndHitsPerInningPitched: 'WHIP', wins: 'W', strikeoutsPer9Inn: 'K/9', walksPer9Inn: 'BB/9' };
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
  walksAndHitsPerInningPitched: { type: 'pitcher', sort: 'p_walk', sortDir: 'asc', selections: ['p_walk', 'p_total_hits', 'p_formatted_ip'], x: 'p_walk', y: 'p_walk' },
  strikeoutsPer9Inn: { type: 'pitcher', sort: 'p_strikeout', sortDir: 'desc', selections: ['p_strikeout', 'p_formatted_ip'], x: 'p_strikeout', y: 'p_strikeout' },
  strikeouts: { stat: 'p_strikeout', type: 'pitcher', sortDir: 'desc' },
  walksPer9Inn: { type: 'pitcher', sort: 'p_walk', sortDir: 'asc', selections: ['p_walk', 'p_formatted_ip'], x: 'p_walk', y: 'p_walk' },
  qualityStarts: { stat: 'p_quality_start', type: 'pitcher', sortDir: 'desc' },
  wins: { stat: 'p_win', type: 'pitcher', sortDir: 'desc' },
  gamesStarted: { stat: 'p_starting_p', type: 'pitcher', sortDir: 'desc' },
};

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

export async function loadLeaders() {
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
        <button class="leaders-scope-btn${leadersScope === 'orioles' ? ' active' : ''}" data-scope="orioles"><img class="leaders-scope-logo" src="https://www.mlbstatic.com/team-logos/110.svg" alt="" width="12" height="12" loading="eager" decoding="async">O's</button>
        <button class="leaders-scope-btn${leadersScope === 'al' ? ' active' : ''}" data-scope="al"><img class="leaders-scope-logo leaders-scope-logo--league" src="https://midfield.mlbstatic.com/v1/team/american-league/logo" alt="" width="12" height="12" loading="eager" decoding="async">AL</button>
        <button class="leaders-scope-btn${leadersScope === 'nl' ? ' active' : ''}" data-scope="nl"><img class="leaders-scope-logo leaders-scope-logo--league" src="https://midfield.mlbstatic.com/v1/team/national-league/logo" alt="" width="12" height="12" loading="eager" decoding="async">NL</button>
        <button class="leaders-scope-btn${leadersScope === 'mlb' ? ' active' : ''}" data-scope="mlb"><img class="leaders-scope-logo leaders-scope-logo--league" src="https://www.mlbstatic.com/team-logos/apple-touch-icons-180x180/mlb.png" alt="" width="12" height="12" loading="eager" decoding="async">MLB</button>
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
