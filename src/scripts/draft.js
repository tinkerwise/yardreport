// ── MLB Draft page ─────────────────────────────────────────────────
import './theme.js';
import { PROXY, MLB, SEASON, ORIOLES_ID, TEAM_ABBREV } from './config.js';
import { $, esc, relativeDate, cleanFeedText, savantUrl, mlbPlayerUrl, fetchPlayerIdMap, lookupPlayerId, searchPlayerId, teamLogoSrc, extractThumbnail, renderNewsThumbCard, fetchOgImage, playerNameOrLookup, resolveNameLookups } from './utils.js';

let draftData = null;
let playerIdMap = null;
let activeRound = 1;
let draftStatus = 'upcoming';

function headshotUrl(id) {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${id}/headshot/67/current`;
}

const HIGHLIGHT_ICONS = [
  // player (Holliday headshot is swapped in for this card once resolved)
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/></svg>',
  // bat + ball
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20 15 9"/><path d="M13 7a2.5 2.5 0 1 1 3.5 3.5L15 12l-3.5-3.5Z"/><circle cx="19" cy="5" r="2"/></svg>',
  // star (top of the class)
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.1 6.1-.6L12 3Z"/></svg>',
  // megaphone (mock draft buzz)
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11v2a2 2 0 0 0 2 2h1l4 4v-4h1l7 4V5l-7 4h-1L6 9H5a2 2 0 0 0-2 2Z"/></svg>',
];

// ── Live draft results (MLB Stats API) ───────────────────────────────
// The static JSON only pins down the Orioles' pick numbers for rounds 1-5
// (those are fixed by comp-pick math well ahead of time); the actual teams
// on the clock and the players they select come from the live draft feed,
// which reports the full order as soon as it's set and fills in each pick
// the moment it happens.
async function fetchLiveDraft(season) {
  try {
    const data = await fetch(`${MLB}/draft/${season}`).then(r => r.json());
    return data.drafts?.rounds ?? null;
  } catch {
    return null;
  }
}

function buildLiveState(rounds) {
  if (!rounds) return null;
  const oriolesPickOrder = [];
  const picks = [];
  const roundOrders = {};

  for (const r of rounds) {
    if (!/^\d+$/.test(r.round)) continue; // skip comp-round labels (PPI, CB-A, ...)
    const roundNum = Number(r.round);
    if (roundNum > 5) continue; // matches the rounds we track in the sidebar

    roundOrders[r.round] = r.picks.map(p => ({
      pick: p.pickNumber,
      teamId: p.team?.id,
      note: p.isDrafted && p.person ? `${p.person.fullName} · ${p.person.primaryPosition?.abbreviation ?? ''}` : undefined,
      personId: p.isDrafted ? p.person?.id : undefined,
    }));

    for (const p of r.picks) {
      if (p.team?.id !== ORIOLES_ID) continue;
      oriolesPickOrder.push({ round: roundNum, pick: p.pickNumber });
      if (p.isDrafted && p.person) {
        picks.push({
          round: roundNum,
          pick: p.pickNumber,
          name: p.person.fullName,
          position: p.person.primaryPosition?.abbreviation ?? '',
          personId: p.person.id,
        });
      }
    }
  }

  if (!oriolesPickOrder.length) return null;
  oriolesPickOrder.sort((a, b) => a.pick - b.pick);
  return { oriolesPickOrder, picks, roundOrders };
}

function computeStatus(data) {
  const start = data.startTime ? new Date(data.startTime) : null;
  const end = data.endTime ? new Date(data.endTime) : null;
  const now = Date.now();
  if (start && now < start.getTime()) return 'upcoming';
  const total = (data.oriolesPickOrder ?? []).length;
  const made = (data.picks ?? []).length;
  if (total && made >= total) return 'complete';
  if (end && now > end.getTime()) return 'complete';
  return 'live';
}

// Undrafted amateurs and very recent draftees have no MLB person id until
// the active-player list picks them up — playerNameOrLookup falls back to
// a per-name search (resolveNameLookups patches it in once that resolves),
// which also covers minor leaguers and retired players the bulk id map misses.
function playerNameHtml(name, idMap) {
  return playerNameOrLookup(name, idMap);
}

// ── Ticker tape — Orioles picks, all rounds ──────────────────────
function tickerEntry(slot, pick, idMap) {
  const prefix = `R${slot.round} · #${slot.pick} — `;
  if (!pick) return `<span class="draft-ticker-item">${esc(prefix)}on the clock</span>`;
  const nameHtml = pick.personId
    ? `<a class="draft-ticker-name" href="${mlbPlayerUrl(pick.personId)}" target="_blank" rel="noopener">${esc(pick.name)}</a>`
    : playerNameOrLookup(pick.name, idMap, 'draft-ticker-name');
  const posSuffix = pick.position ? esc(` (${pick.position})`) : '';
  return `<span class="draft-ticker-item">${esc(prefix)}${nameHtml}${posSuffix}</span>`;
}

function infoTickerEntries(data) {
  const order = data.oriolesPickOrder ?? [];
  const chips = order.map(s => `R${s.round} #${s.pick}`).join(', ');
  const items = [
    `2026 MLB Draft begins ${esc(data.dates ?? '')} at the ${esc(data.location ?? '')}`,
  ];
  if (chips) items.push(`Orioles pick order: ${esc(chips)}`);
  items.push('Round 1 airs on NBC & Peacock starting 1:00 PM ET Saturday');
  return items.map(t => `<span class="draft-ticker-item">${t}</span>`);
}

function renderTicker(data, idMap) {
  const track = $('draftTickerTrack');
  const label = $('draftTickerLabel');
  if (!track) return;

  if (label) {
    label.innerHTML = draftStatus === 'live'
      ? '<span class="live-dot" aria-hidden="true"></span> Live Picks'
      : draftStatus === 'complete'
        ? 'Final Picks'
        : "O's Picks";
  }

  if (draftStatus === 'upcoming') {
    const entries = infoTickerEntries(data);
    track.innerHTML = entries.join('') + entries.join('');
    return;
  }

  const order = data.oriolesPickOrder ?? [];
  const made = data.picks ?? [];
  if (!order.length) {
    track.innerHTML = '<span class="draft-ticker-item">Orioles pick order unavailable</span>';
    return;
  }
  const entries = order.map(slot => tickerEntry(slot, made.find(p => p.round === slot.round && p.pick === slot.pick), idMap));
  // Duplicate the run so the CSS scroll loop is seamless.
  track.innerHTML = entries.join('') + entries.join('');
  resolveNameLookups(track);
}

// ── Round order (tabbed — full order where we have it, Orioles pick otherwise) ──
function renderRoundTabs(data) {
  const wrap = $('draftRoundTabs');
  if (!wrap) return;
  const rounds = (data.oriolesPickOrder ?? []).map(s => s.round);
  wrap.innerHTML = rounds.map(r =>
    `<button class="pill${r === activeRound ? ' active' : ''}" data-round="${r}">Round ${r}</button>`
  ).join('');
  wrap.querySelectorAll('button[data-round]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeRound = Number(btn.dataset.round);
      wrap.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
      renderOrder(draftData, playerIdMap);
    });
  });
}

function renderOrder(data, idMap) {
  const el = $('draftOrder');
  if (!el) return;
  const order = data.roundOrders?.[String(activeRound)];
  const oriolesSlot = (data.oriolesPickOrder ?? []).find(s => s.round === activeRound);

  if (!order?.length) {
    const pick = (data.picks ?? []).find(p => p.round === activeRound);
    el.innerHTML = `<div class="draft-order-empty">
      <p>Full Round ${activeRound} order isn't published yet.</p>
      ${oriolesSlot ? `<div class="roster-item">
        <span class="roster-pos">R${oriolesSlot.round}</span>
        ${pick ? playerNameHtml(pick.name, idMap) : '<span class="roster-name roster-name--pending">Orioles on the clock</span>'}
        <span class="roster-badge roster-badge--info">Pick #${oriolesSlot.pick}</span>
      </div>` : ''}
      <a class="widget-link" href="https://www.mlb.com/draft/${draftData?.season ?? ''}/order" target="_blank" rel="noopener">Check MLB.com for the latest order ↗</a>
    </div>`;
    resolveNameLookups(el);
    return;
  }

  el.innerHTML = order.map(slot => {
    const isOrioles = slot.teamId === ORIOLES_ID;
    const abbr = TEAM_ABBREV[slot.teamId] ?? '';
    const noteHtml = slot.note
      ? (slot.personId
          ? `<a class="draft-order-note draft-order-note--pick" href="${mlbPlayerUrl(slot.personId)}" target="_blank" rel="noopener">${esc(slot.note)}</a>`
          : `<span class="draft-order-note">${esc(slot.note)}</span>`)
      : '';
    return `<div class="draft-order-row${isOrioles ? ' draft-order-row--orioles' : ''}">
      <span class="draft-order-pick">${slot.pick}</span>
      <img class="draft-order-logo" src="${teamLogoSrc(slot.teamId, 18)}" alt="" width="18" height="18" loading="lazy">
      <span class="draft-order-team">${esc(abbr)}</span>
      ${noteHtml}
    </div>`;
  }).join('');
}

async function loadPicks() {
  try {
    const [data, idMap, liveRounds] = await Promise.all([
      fetch(`${import.meta.env.BASE_URL}draft-picks.json`).then(r => r.json()),
      fetchPlayerIdMap(),
      fetchLiveDraft(2026),
    ]);
    const live = buildLiveState(liveRounds);
    draftData = live ? { ...data, ...live } : data;
    playerIdMap = idMap;
    draftStatus = computeStatus(draftData);

    renderHero(draftData);
    renderTicker(draftData, idMap);
    renderRoundTabs(draftData);
    renderOrder(draftData, idMap);
    const updatedEl = $('draftUpdated');
    if (updatedEl && draftData.lastUpdated) {
      updatedEl.textContent = `Updated ${relativeDate(draftData.lastUpdated)}`;
    }
    loadDraftInfo(draftData);
    loadHistory(draftData, idMap);

    // Live picks land within minutes of each other on draft day — refresh
    // the whole picture instead of just polling one widget.
    if (draftStatus === 'live') {
      setTimeout(loadPicks, 90 * 1000);
    }
  } catch {
    $('draftTickerTrack').innerHTML = '<span class="draft-ticker-item">Draft data unavailable</span>';
    $('draftOrder').innerHTML = '<span class="sidebar-msg">Draft data unavailable</span>';
  }
}

// ── Hero + highlights (key info above the news feed) ────────────────
function renderHero(data) {
  const badge = $('draftHeroBadge');
  const facts = $('draftHeroFacts');
  const highlights = $('draftHighlights');
  const logo = $('draftHeroLogo');

  if (logo) logo.src = teamLogoSrc(ORIOLES_ID, 56);

  if (badge) {
    if (draftStatus === 'live') {
      badge.innerHTML = '<span class="live-dot" aria-hidden="true"></span> Draft is live';
    } else if (draftStatus === 'complete') {
      badge.textContent = 'Draft complete';
    } else {
      const start = data.startTime ? new Date(data.startTime) : null;
      const diffMs = start ? start.getTime() - Date.now() : 0;
      if (diffMs > 0) {
        const days = Math.floor(diffMs / 864e5);
        const hours = Math.floor((diffMs % 864e5) / 36e5);
        const mins = Math.floor((diffMs % 36e5) / 6e4);
        badge.textContent = days > 0 ? `${days}d ${hours}h until Round 1` : `${hours}h ${mins}m until Round 1`;
      } else {
        badge.textContent = 'Draft is underway';
      }
    }
  }

  if (facts) {
    const order = data.oriolesPickOrder ?? [];
    facts.innerHTML = `
      <div class="draft-hero-fact">
        <span class="draft-hero-fact-label">When</span>
        <span class="draft-hero-fact-value">${esc(data.dates ?? '')}</span>
      </div>
      <div class="draft-hero-fact">
        <span class="draft-hero-fact-label">Where</span>
        <span class="draft-hero-fact-value">${esc(data.location ?? '')}</span>
      </div>
      <div class="draft-hero-fact">
        <span class="draft-hero-fact-label">Orioles picks</span>
        <span class="draft-hero-fact-value">${order.length} in the first ${order.length ? order[order.length - 1].round : 5} rounds</span>
      </div>
    `;
  }

  if (highlights) {
    const items = data.highlights ?? [];
    const hollidayId = lookupPlayerId(playerIdMap, 'Jackson Holliday');
    highlights.innerHTML = items.map((h, i) => {
      const media = (i === 0 && hollidayId)
        ? `<img class="draft-highlight-photo" src="${headshotUrl(hollidayId)}" alt="" loading="lazy">`
        : `<span class="draft-highlight-icon">${HIGHLIGHT_ICONS[i % HIGHLIGHT_ICONS.length]}</span>`;
      return `
      <div class="draft-highlight-card">
        ${media}
        <div class="draft-highlight-title">${esc(h.title)}</div>
        <div class="draft-highlight-body">${esc(h.body)}</div>
      </div>
    `;
    }).join('');
  }

  const bcast = $('draftBroadcast');
  if (bcast) {
    bcast.innerHTML = (data.broadcast ?? []).map(day => `
      <div class="draft-broadcast-day">
        <div class="draft-broadcast-day-label">${esc(day.day)}</div>
        ${day.blocks.map(b => `
          <div class="draft-broadcast-row">
            <span class="draft-broadcast-time">${esc(b.time)}</span>
            <span class="draft-broadcast-desc">${esc(b.desc)}</span>
            <span class="draft-broadcast-network">${esc(b.network)}</span>
          </div>
        `).join('')}
      </div>
    `).join('');
  }
}

// ── Draft info (dates, location, countdown) ─────────────────────────
function loadDraftInfo(data) {
  const el = $('draftInfo');
  if (!el) return;

  const start = data.startTime ? new Date(data.startTime) : null;
  let countdownHtml = '';
  const diffMs = start ? start.getTime() - Date.now() : 0;
  if (draftStatus === 'upcoming' && diffMs > 0) {
    const days = Math.floor(diffMs / 864e5);
    const hours = Math.floor((diffMs % 864e5) / 36e5);
    countdownHtml = `<div class="asg-countdown">${days}d ${hours}h until Round 1</div>`;
  } else if (draftStatus === 'complete') {
    countdownHtml = '<div class="asg-countdown">Draft complete</div>';
  } else {
    countdownHtml = '<div class="asg-countdown">Draft is underway</div>';
  }

  el.innerHTML = `
    <div class="asg-game-card">
      <div class="asg-game-date">${esc(data.dates ?? '')}</div>
      ${countdownHtml}
      <div class="asg-game-venue">${esc(data.location ?? '')}</div>
    </div>
    <div class="draft-order-summary">
      ${(data.oriolesPickOrder ?? []).map(s => `<span class="draft-order-chip">R${s.round} · #${s.pick}</span>`).join('')}
    </div>
    <a class="widget-link" href="https://www.mlb.com/draft" target="_blank" rel="noopener">MLB Draft hub ↗</a>
  `;
}

// ── History ───────────────────────────────────────────────────────
const PITCHER_POSITIONS = new Set(['P', 'SP', 'RP', 'LHP', 'RHP']);

async function fetchCurrentStatLine(playerId, position) {
  if (!playerId) return null;
  const group = PITCHER_POSITIONS.has(position) ? 'pitching' : 'hitting';
  try {
    const data = await fetch(`${MLB}/people/${playerId}/stats?stats=season&season=${SEASON}&group=${group}`).then(r => r.json());
    const stat = data.stats?.[0]?.splits?.[0]?.stat;
    if (!stat) return null;
    return group === 'hitting'
      ? `${SEASON}: ${stat.avg ?? '.---'}/${stat.obp ?? '.---'}/${stat.slg ?? '.---'}, ${stat.homeRuns ?? 0} HR`
      : `${SEASON}: ${stat.era ?? '-.--'} ERA, ${stat.strikeOuts ?? 0} K`;
  } catch { return null; }
}

function historyKey(h) {
  return `${h.year}-${h.pick}-${h.name}`.replace(/\W+/g, '');
}

function renderHistoryRow(h, idMap, statLine, avatarId) {
  const avatarHtml = avatarId
    ? `<img class="asg-history-avatar" src="${headshotUrl(avatarId)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'asg-history-avatar asg-history-avatar--placeholder'}))">`
    : `<span class="asg-history-avatar asg-history-avatar--placeholder"></span>`;
  return `
    <div class="asg-history-item" data-history-key="${historyKey(h)}">
      ${avatarHtml}
      <span class="asg-history-year">${h.year}</span>
      <div class="asg-history-body">
        <div class="asg-history-result">${playerNameHtml(h.name, idMap)} · ${esc(h.position)}</div>
        <div class="asg-history-meta">Round ${h.round}, Pick ${h.pick} · ${esc(h.school)}</div>
        ${statLine ? `<div class="asg-history-stat">${esc(statLine)}</div>` : ''}
      </div>
    </div>
  `;
}

function loadHistory(data, idMap) {
  const el = $('draftHistory');
  if (!el) return;
  const recentPicks = [...(data.recentPicks ?? [])].sort((a, b) => b.year - a.year);
  const notables = [...(data.notables ?? [])].sort((a, b) => b.year - a.year);
  const all = [...recentPicks, ...notables];

  if (!all.length) {
    el.innerHTML = '<span class="sidebar-msg">No history available</span>';
    return;
  }

  // Paint immediately without stat lines or avatars, then fill each in as it
  // resolves — one slow /people/{id}/stats or /people/search call shouldn't
  // block the list. Rows are matched back up by key since there are two groups.
  el.innerHTML = `
    ${recentPicks.length ? `<div class="roster-group-label">Recent Top Picks</div>${recentPicks.map(h => renderHistoryRow(h, idMap, null, lookupPlayerId(idMap, h.name))).join('')}` : ''}
    ${notables.length ? `<div class="roster-group-label">Franchise Notables</div>${notables.map(h => renderHistoryRow(h, idMap, null, lookupPlayerId(idMap, h.name))).join('')}` : ''}
  `;
  resolveNameLookups(el);

  all.forEach(async h => {
    let id = lookupPlayerId(idMap, h.name);
    if (!id) id = await searchPlayerId(h.name); // retired/pre-active players (Ripken, Murray, ...)
    const statLine = await fetchCurrentStatLine(id, h.position);
    const row = el.querySelector(`[data-history-key="${historyKey(h)}"]`);
    if (row) row.outerHTML = renderHistoryRow(h, idMap, statLine, id);
  });
}

// ── Draft news (reuses the site's existing RSS sources, filtered) ──
async function loadDraftNews() {
  const wrap = $('draftNews');
  if (!wrap) return;
  try {
    const feeds = await fetch(`${import.meta.env.BASE_URL}feeds.json`).then(r => r.json());
    const results = await Promise.allSettled(feeds.map(source =>
      fetch(`${PROXY}?url=${encodeURIComponent(source.url)}`).then(r => r.json())
        .then(data => ({ source, articles: data.items ?? [] }))
    ));

    const cutoff = Date.now() - 14 * 864e5;
    const draftRe = /draft/i;
    const matches = [];
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const { source, articles } = r.value;
      for (const a of articles) {
        const title = cleanFeedText(a.title || '');
        if (!draftRe.test(title) && !draftRe.test(a.description || '')) continue;
        const d = new Date(a.pubDate);
        if (isNaN(d) || d.getTime() < cutoff) continue;
        matches.push({ title, link: a.link, pubDate: a.pubDate, sourceName: source.name, thumbnail: extractThumbnail(a) });
      }
    }

    matches.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    const top = matches.slice(0, 12);

    if (!top.length) {
      wrap.innerHTML = '<span class="sidebar-msg">No recent Draft news</span>';
      return;
    }

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
loadPicks();
loadDraftNews();
