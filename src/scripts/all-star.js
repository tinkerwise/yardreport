// ── All-Star Game page ────────────────────────────────────────────
import './theme.js';
import { MLB, ORIOLES_ID, PROXY, SEASON } from './config.js';
import { $, esc, teamLogoSrc, relativeDate, cleanFeedText, savantUrl, fetchPlayerIdMap, lookupPlayerId, extractThumbnail, renderNewsThumbCard, fetchOgImage, playerNameOrLookup, resolveNameLookups } from './utils.js';
import { fetchWeatherForGames, getGameWeather } from './weather.js';
import { fetchScoringPlays } from './scores.js';

// ── Roster ────────────────────────────────────────────────────────
// Roster/stat-list context — Savant, matching the site's other roster
// widgets (depth chart, 40-man roster).
function renderPlayerRow(p, idMap) {
  const badge = p.note
    ? `<span class="roster-badge roster-badge--replacement" title="${esc(p.note)}">Replacement</span>`
    : '';
  const playerId = p.playerId ?? lookupPlayerId(idMap, p.name);
  const nameHtml = playerId
    ? `<a class="roster-name" href="${savantUrl(playerId)}" target="_blank" rel="noopener">${esc(p.name)}</a>`
    : `<span class="roster-name" data-name-lookup="${esc(p.name)}">${esc(p.name)}</span>`;
  return `<div class="roster-item">
    <img class="asg-team-logo" src="${teamLogoSrc(p.teamId, 16)}" alt="" width="16" height="16" loading="lazy">
    ${nameHtml}
    ${p.pos ? `<span class="roster-pos">${esc(p.pos)}</span>` : ''}
    ${badge}
  </div>`;
}

function renderLeagueRoster(elId, league, idMap) {
  const el = $(elId);
  if (!el) return;
  if (!league) {
    el.innerHTML = '<span class="sidebar-msg">Roster unavailable</span>';
    return;
  }
  el.innerHTML = `
    <div class="roster-group-label">Starters</div>
    ${league.starters.map(p => renderPlayerRow(p, idMap)).join('')}
    <div class="roster-group-label">Reserves</div>
    ${league.reserves.map(p => renderPlayerRow(p, idMap)).join('')}
    <div class="roster-group-label">Pitchers</div>
    ${league.pitchers.map(p => renderPlayerRow(p, idMap)).join('')}
  `;
  resolveNameLookups(el);
}

async function loadRoster() {
  try {
    const [data, idMap] = await Promise.all([
      fetch(`${import.meta.env.BASE_URL}all-star-roster.json`).then(r => r.json()),
      fetchPlayerIdMap(),
    ]);
    renderLeagueRoster('asgAL', data.al, idMap);
    renderLeagueRoster('asgNL', data.nl, idMap);
    const updatedEl = $('asgUpdated');
    if (updatedEl && data.lastUpdated) {
      updatedEl.textContent = `Rosters updated ${relativeDate(data.lastUpdated)}`;
    }
    loadOriolesSpotlight(data);
    renderHomeRunDerby(data.homeRunDerby, idMap);
  } catch {
    $('asgAL').innerHTML = '<span class="sidebar-msg">Roster unavailable</span>';
    $('asgNL').innerHTML = '<span class="sidebar-msg">Roster unavailable</span>';
  }
}

// ── Home Run Derby ────────────────────────────────────────────────
function renderHomeRunDerby(derby, idMap) {
  const el = $('asgDerby');
  if (!el) return;
  if (!derby) {
    el.innerHTML = '<span class="sidebar-msg">Unavailable</span>';
    return;
  }

  const fieldHtml = (derby.participants ?? []).map(p => `
    <div class="roster-item">
      <img class="asg-team-logo" src="${teamLogoSrc(p.teamId, 16)}" alt="" width="16" height="16" loading="lazy">
      ${playerNameOrLookup(p.name, idMap)}
    </div>
  `).join('');

  const openSlots = derby.spotsOpen
    ? `<div class="roster-item"><span class="roster-name roster-name--pending">${derby.spotsOpen} spot${derby.spotsOpen === 1 ? '' : 's'} still open</span></div>`
    : '';

  el.innerHTML = `
    <div class="asg-game-card">
      <div class="asg-game-date">${esc(derby.date ?? '')}</div>
      <div class="asg-game-venue">${esc(derby.venue ?? '')}</div>
    </div>
    <div class="roster-group-label">Field</div>
    ${fieldHtml}
    ${openSlots}
    <a class="widget-link" href="https://www.mlb.com/all-star/home-run-derby" target="_blank" rel="noopener">Home Run Derby hub ↗</a>
  `;
  resolveNameLookups(el);
}

// ── Orioles spotlight ─────────────────────────────────────────────
function findOriolesSelections(data) {
  const out = [];
  for (const [leagueKey, leagueLabel] of [['al', 'AL'], ['nl', 'NL']]) {
    for (const [groupKey, groupLabel] of [['starters', 'Starter'], ['reserves', 'Reserve'], ['pitchers', 'Pitcher']]) {
      for (const p of data[leagueKey]?.[groupKey] ?? []) {
        if (p.teamId === ORIOLES_ID && p.playerId) {
          out.push({ ...p, league: leagueLabel, selectionType: groupLabel });
        }
      }
    }
  }
  return out;
}

// MLB Stats API award ids for actual All-Star Game selections (not MiLB/
// Futures Game/other "all-star" named honors, which share loose naming).
const MLB_ASG_AWARD_IDS = new Set(['ALAS', 'NLAS']);

async function fetchAsgSeasons(playerId) {
  try {
    const data = await fetch(`${MLB}/people/${playerId}/awards`).then(r => r.json());
    const seasons = (data.awards ?? [])
      .filter(a => MLB_ASG_AWARD_IDS.has(a.id))
      .map(a => a.season)
      .filter(Boolean);
    return [...new Set(seasons)].sort();
  } catch { return []; }
}

function renderSpotlightCard(player, seasons) {
  const photoUrl = `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${player.playerId}/headshot/67/current`;
  const priorSeasons = seasons.filter(s => String(s) !== String(SEASON));
  const historyLine = priorSeasons.length
    ? `${priorSeasons.length + 1} selections: ${seasons.join(', ')}`
    : 'First career selection';
  return `
    <a class="asg-spotlight-card" href="https://www.mlb.com/player/${player.playerId}" target="_blank" rel="noopener">
      <img class="asg-spotlight-photo" src="${photoUrl}" alt="" width="64" height="64" loading="lazy">
      <div class="asg-spotlight-body">
        <div class="asg-spotlight-kicker">Orioles All-Star</div>
        <div class="asg-spotlight-name">${esc(player.name)}</div>
        <div class="asg-spotlight-meta">${esc(player.pos ?? '')} · ${esc(player.league)} ${esc(player.selectionType)}${player.note ? ` · ${esc(player.note)}` : ''}</div>
        <div class="asg-spotlight-history">${esc(historyLine)}</div>
      </div>
    </a>`;
}

async function loadOriolesSpotlight(data) {
  const el = $('asgOriolesSpotlight');
  if (!el) return;
  const orioles = findOriolesSelections(data);
  if (!orioles.length) {
    el.innerHTML = '';
    return;
  }

  const cards = await Promise.all(orioles.map(async p => {
    const seasons = await fetchAsgSeasons(p.playerId);
    return renderSpotlightCard(p, seasons);
  }));

  el.innerHTML = `<div class="asg-spotlight">${cards.join('')}</div>`;
}

// ── Game info ─────────────────────────────────────────────────────
async function fetchVenueLocation(venueId) {
  if (!venueId) return null;
  try {
    return await fetch(`${MLB}/venues/${venueId}?hydrate=location`).then(r => r.json())
      .then(d => d.venues?.[0]?.location ?? null);
  } catch { return null; }
}

// ── Live tracker — in-page linescore + scoring plays once the game starts ──
// (reuses fetchScoringPlays + the box-score-table/scr-play styles already
// built for the homepage box score popover, so this needed no new CSS system.)
async function renderLiveTracker(game) {
  const el = $('asgLiveTracker');
  if (!el) return;
  const isLive = game.status?.abstractGameState === 'Live';
  const ls = game.linescore ?? {};
  const innings = ls.innings ?? [];
  const numInnings = Math.max(innings.length, 9);

  let hdr = '<th class="box-team-col"></th>';
  for (let i = 1; i <= numInnings; i++) hdr += `<th>${i}</th>`;
  hdr += '<th class="box-total">R</th><th class="box-total">H</th><th class="box-total">E</th>';

  const buildRow = (label, side) => {
    let row = `<td class="box-team-col">${label}</td>`;
    for (let i = 0; i < numInnings; i++) {
      row += `<td>${innings[i]?.[side]?.runs ?? (i < innings.length ? '0' : '')}</td>`;
    }
    const t = ls.teams?.[side] ?? {};
    const score = t.runs ?? game.teams?.[side]?.score ?? '';
    row += `<td class="box-total">${score}</td><td class="box-total">${t.hits ?? ''}</td><td class="box-total">${t.errors ?? ''}</td>`;
    return row;
  };

  const plays = await fetchScoringPlays(game.gamePk);
  const scoringHtml = plays.length
    ? plays.map(p => {
      const { about, result } = p;
      const inn = `${about.halfInning === 'top' ? 'T' : 'B'}${about.inning}`;
      return `<div class="scr-play">
        <span class="scr-inn">${esc(inn)}</span>
        <span></span>
        <span class="scr-desc">${esc(result.description ?? '')}</span>
        <span class="scr-score">${esc(`AL ${result.awayScore ?? '?'}, NL ${result.homeScore ?? '?'}`)}</span>
      </div>`;
    }).join('')
    : '<div class="scr-empty">Scoreless so far</div>';

  el.innerHTML = `
    <div class="asg-team-col asg-live-tracker">
      <div class="asg-team-head asg-live-tracker-head">
        ${isLive ? '<span class="live-dot" aria-hidden="true"></span> Live Tracker' : 'Final Box Score'}
      </div>
      <div style="overflow-x:auto;">
        <table class="box-score-table">
          <thead><tr>${hdr}</tr></thead>
          <tbody>
            <tr class="box-score-row">${buildRow('AL', 'away')}</tr>
            <tr class="box-score-row">${buildRow('NL', 'home')}</tr>
          </tbody>
        </table>
      </div>
      <div class="box-sum-hdr">Scoring Plays</div>
      ${scoringHtml}
    </div>
  `;
}

async function loadGameInfo() {
  const wrap = $('asgGameInfo');
  if (!wrap) return;
  try {
    const data = await fetch(`${MLB}/schedule?sportId=1&gameType=A&season=${SEASON}&hydrate=linescore`).then(r => r.json());
    const game = data.dates?.[0]?.games?.[0];
    if (!game) {
      wrap.innerHTML = '<span class="sidebar-msg">Schedule unavailable</span>';
      return;
    }

    const [location] = await Promise.all([
      fetchVenueLocation(game.venue?.id),
      fetchWeatherForGames([game]),
    ]);
    const wx = getGameWeather(game);

    const gameDate = new Date(game.gameDate);
    const dateStr = gameDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const timeStr = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

    const status = game.status?.abstractGameState ?? 'Preview';
    let scoreHtml = '';
    if (status === 'Live' || status === 'Final') {
      const away = game.teams?.away ?? {};
      const home = game.teams?.home ?? {};
      scoreHtml = `<div class="asg-score">
        <span class="asg-score-team">AL ${away.score ?? 0}</span>
        <span class="asg-score-sep">–</span>
        <span class="asg-score-team">NL ${home.score ?? 0}</span>
      </div>
      <div class="asg-status">${esc(status === 'Live' ? 'Live' : (game.status?.detailedState ?? 'Final'))}</div>`;
    }

    let countdownHtml = '';
    if (status === 'Preview') {
      const diffMs = gameDate.getTime() - Date.now();
      if (diffMs > 0) {
        const days = Math.floor(diffMs / 864e5);
        const hours = Math.floor((diffMs % 864e5) / 36e5);
        countdownHtml = `<div class="asg-countdown">${days}d ${hours}h until first pitch</div>`;
      }
    }

    const locLabel = location ? [location.city, location.stateAbbrev].filter(Boolean).join(', ') : '';

    wrap.innerHTML = `
      <div class="asg-game-card">
        <div class="asg-game-date">${esc(dateStr)}</div>
        <div class="asg-game-time">${esc(timeStr)}</div>
        ${countdownHtml}
        ${scoreHtml}
        <div class="asg-game-venue">${esc(game.venue?.name ?? '')}</div>
        ${locLabel ? `<div class="asg-game-loc">${esc(locLabel)}</div>` : ''}
        ${wx ? `<div class="asg-game-wx">${wx.emoji} ${wx.temp}°F, ${esc(wx.condition)}</div>` : ''}
      </div>
      <a class="widget-link" href="https://www.mlb.com/all-star" target="_blank" rel="noopener">All-Star Game hub on MLB.com ↗</a>
    `;

    if (status === 'Live' || status === 'Final') {
      renderLiveTracker(game);
    }
  } catch {
    wrap.innerHTML = '<span class="sidebar-msg">Unavailable</span>';
  }
}

// ── History ───────────────────────────────────────────────────────
const ASG_HISTORY = [
  { year: 2025, result: 'NL won 4–3 in first-ever swing-off tiebreaker', venue: 'Truist Park, Atlanta' },
  { year: 2024, result: 'AL won 5–3', mvp: 'Jarren Duran (BOS)', venue: 'Globe Life Field, Arlington' },
  { year: 2023, result: 'NL won 3–2', mvp: 'Elias Díaz (COL)', venue: 'T-Mobile Park, Seattle' },
  { year: 2021, result: 'AL won 5–2', mvp: 'Shohei Ohtani (LAA)', venue: 'Coors Field, Denver' },
  { year: 2019, result: 'AL won 4–3', mvp: 'Shane Bieber (CLE)', venue: 'Progressive Field, Cleveland' },
  { year: 2018, result: 'AL won 8–6 (10 innings)', mvp: 'Alex Bregman (HOU)', venue: 'Nationals Park, Washington' },
];

function loadHistory() {
  const el = $('asgHistory');
  if (!el) return;
  el.innerHTML = ASG_HISTORY.map(h => `
    <div class="asg-history-item">
      <span class="asg-history-year">${h.year}</span>
      <div class="asg-history-body">
        <div class="asg-history-result">${esc(h.result)}</div>
        <div class="asg-history-meta">${h.mvp ? `MVP: ${esc(h.mvp)} · ` : ''}${esc(h.venue)}</div>
      </div>
    </div>
  `).join('');
}

// ── Media ─────────────────────────────────────────────────────────
const ASG_VIDEOS = [
  { title: '2026 All-Star Game Selection Show', url: 'https://www.youtube.com/watch?v=ldRZCQQHQAs', videoId: 'ldRZCQQHQAs' },
  { title: '2026 All-Star Game starters announced', url: 'https://www.youtube.com/watch?v=YqMsXm2XUd0', videoId: 'YqMsXm2XUd0' },
];
const YT_PLAYLISTS = [
  { id: 'PLL-lmlkrmJakABrOT6FmV0mU-5oIF8nGu', label: 'MLB Fastcast' },
  { id: 'PLL-lmlkrmJalPg-EgiZ92Eyg9YodLbQsE', label: 'MLB Top Plays' },
];

function extractVideoId(link) {
  return link.match(/v=([^&]+)/)?.[1] || link.match(/youtu\.be\/([^?&]+)/)?.[1] || '';
}

async function fetchLatestFromPlaylist(pl) {
  try {
    const url = `${PROXY}?url=${encodeURIComponent(`https://www.youtube.com/feeds/videos.xml?playlist_id=${pl.id}`)}`;
    const data = await fetch(url).then(r => r.json());
    const items = data.items ?? [];
    const match = items.find(i => /all.?star/i.test(i.title || '')) || items[0];
    if (!match) return null;
    const videoId = extractVideoId(match.link || '');
    return {
      title: cleanFeedText(match.title),
      label: pl.label,
      thumb: match.thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : ''),
      url: match.link,
      videoId,
    };
  } catch { return null; }
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
  const wrap = $('asgMedia');
  if (!wrap) return;
  const playlistResults = await Promise.allSettled(YT_PLAYLISTS.map(fetchLatestFromPlaylist));
  const items = [
    ...ASG_VIDEOS,
    ...playlistResults.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value),
  ];

  wrap.innerHTML = `<div class="media-list">${items.map(renderVideoItem).join('')}</div>
    <a class="widget-link" href="https://www.mlb.com/all-star" target="_blank" rel="noopener">More All-Star coverage ↗</a>`;

  wrap.querySelectorAll('.media-item--video').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      const id = el.dataset.videoId;
      if (id) openVideoTheater(id);
      else window.open(el.dataset.videoUrl, '_blank');
    });
  });
}

// ── ASG news (reuses site's existing RSS sources, filtered) ───────
async function loadAsgNews() {
  const wrap = $('asgNews');
  if (!wrap) return;
  try {
    const feeds = await fetch(`${import.meta.env.BASE_URL}feeds.json`).then(r => r.json());
    const results = await Promise.allSettled(feeds.map(source =>
      fetch(`${PROXY}?url=${encodeURIComponent(source.url)}`).then(r => r.json())
        .then(data => ({ source, articles: data.items ?? [] }))
    ));

    const cutoff = Date.now() - 14 * 864e5;
    const asgRe = /all-star|all star|midsummer classic|home run derby/i;
    const matches = [];
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const { source, articles } = r.value;
      for (const a of articles) {
        const title = cleanFeedText(a.title || '');
        if (!asgRe.test(title) && !asgRe.test(a.description || '')) continue;
        const d = new Date(a.pubDate);
        if (isNaN(d) || d.getTime() < cutoff) continue;
        matches.push({ title, link: a.link, pubDate: a.pubDate, sourceName: source.name, thumbnail: extractThumbnail(a) });
      }
    }

    matches.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    const top = matches.slice(0, 8);

    if (!top.length) {
      wrap.innerHTML = '<span class="sidebar-msg">No recent All-Star news</span>';
      return;
    }

    // Most RSS feeds don't supply a thumbnail — fall back to each
    // article's own og:image. Bounded to 8 items, so fetch eagerly
    // rather than the lazy IntersectionObserver used on the unbounded
    // main feed.
    await Promise.all(top.map(async a => {
      if (!a.thumbnail) a.thumbnail = await fetchOgImage(a.link);
    }));

    wrap.innerHTML = `<div class="news-thumb-list">${top.map(renderNewsThumbCard).join('')}</div>`;
  } catch {
    wrap.innerHTML = '<span class="sidebar-msg">Unavailable</span>';
  }
}

// ── Sidebar accordion (mirrors app.js behavior for the right sidebar) ──
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

setupAccordion();
loadRoster();
loadGameInfo();
loadHistory();
loadMedia();
loadAsgNews();
