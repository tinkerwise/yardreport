// ── MLB Draft page ─────────────────────────────────────────────────
import './theme.js';
import { PROXY, MLB, SEASON, ORIOLES_ID, TEAM_ABBREV } from './config.js';
import { $, esc, relativeDate, cleanFeedText, savantUrl, fetchPlayerIdMap, lookupPlayerId, teamLogoSrc, extractThumbnail, renderNewsThumbCard, fetchOgImage, playerNameOrLookup, resolveNameLookups } from './utils.js';

let draftData = null;
let playerIdMap = null;
let activeRound = 1;

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
  const nameHtml = playerNameOrLookup(pick.name, idMap, 'draft-ticker-name');
  const posSuffix = pick.position ? esc(` (${pick.position})`) : '';
  return `<span class="draft-ticker-item">${esc(prefix)}${nameHtml}${posSuffix}</span>`;
}

function renderTicker(data, idMap) {
  const track = $('draftTickerTrack');
  if (!track) return;
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
    return `<div class="draft-order-row${isOrioles ? ' draft-order-row--orioles' : ''}">
      <span class="draft-order-pick">${slot.pick}</span>
      <img class="draft-order-logo" src="${teamLogoSrc(slot.teamId, 18)}" alt="" width="18" height="18" loading="lazy">
      <span class="draft-order-team">${esc(abbr)}</span>
      ${slot.note ? `<span class="draft-order-note">${esc(slot.note)}</span>` : ''}
    </div>`;
  }).join('');
}

async function loadPicks() {
  try {
    const [data, idMap] = await Promise.all([
      fetch(`${import.meta.env.BASE_URL}draft-picks.json`).then(r => r.json()),
      fetchPlayerIdMap(),
    ]);
    draftData = data;
    playerIdMap = idMap;
    renderTicker(draftData, idMap);
    renderRoundTabs(draftData);
    renderOrder(draftData, idMap);
    const updatedEl = $('draftUpdated');
    if (updatedEl && draftData.lastUpdated) {
      updatedEl.textContent = `Updated ${relativeDate(draftData.lastUpdated)}`;
    }
    loadDraftInfo(draftData);
    loadHistory(draftData, idMap);
  } catch {
    $('draftTickerTrack').innerHTML = '<span class="draft-ticker-item">Draft data unavailable</span>';
    $('draftOrder').innerHTML = '<span class="sidebar-msg">Draft data unavailable</span>';
  }
}

// ── Draft info (dates, location, countdown) ─────────────────────────
function loadDraftInfo(data) {
  const el = $('draftInfo');
  if (!el) return;

  const startDate = new Date('2026-07-11T19:00:00-04:00');
  let countdownHtml = '';
  const diffMs = startDate.getTime() - Date.now();
  if (diffMs > 0) {
    const days = Math.floor(diffMs / 864e5);
    const hours = Math.floor((diffMs % 864e5) / 36e5);
    countdownHtml = `<div class="asg-countdown">${days}d ${hours}h until Round 1</div>`;
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

function renderHistoryRow(h, idMap, statLine) {
  return `
    <div class="asg-history-item" data-history-key="${historyKey(h)}">
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

  // Paint immediately without stat lines, then fill each in as it resolves —
  // one slow /people/{id}/stats call shouldn't block the list. Rows are
  // matched back up by key rather than position since there are two groups.
  el.innerHTML = `
    ${recentPicks.length ? `<div class="roster-group-label">Recent Top Picks</div>${recentPicks.map(h => renderHistoryRow(h, idMap, null)).join('')}` : ''}
    ${notables.length ? `<div class="roster-group-label">Franchise Notables</div>${notables.map(h => renderHistoryRow(h, idMap, null)).join('')}` : ''}
  `;
  resolveNameLookups(el);

  all.forEach(async h => {
    const id = lookupPlayerId(idMap, h.name);
    const statLine = await fetchCurrentStatLine(id, h.position);
    if (!statLine) return;
    const row = el.querySelector(`[data-history-key="${historyKey(h)}"]`);
    if (row) row.outerHTML = renderHistoryRow(h, idMap, statLine);
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
