// ── MLB Draft page ─────────────────────────────────────────────────
import './theme.js';
import { PROXY, ORIOLES_ID, TEAM_ABBREV } from './config.js';
import { $, esc, relativeDate, cleanFeedText, savantUrl, fetchPlayerIdMap, lookupPlayerId, teamLogoSrc, extractThumbnail, renderNewsThumbCard, fetchOgImage } from './utils.js';

let draftData = null;

// Undrafted prospects have no MLB person id until they sign — resolveName
// falls back to plain text for anyone not found (freshly-drafted amateurs,
// mainly), and links to Savant once the API knows them.
function playerNameHtml(name, idMap) {
  const id = lookupPlayerId(idMap, name);
  return id
    ? `<a class="roster-name" href="${savantUrl(id)}" target="_blank" rel="noopener">${esc(name)}</a>`
    : `<span class="roster-name">${esc(name)}</span>`;
}

// ── Picks ─────────────────────────────────────────────────────────
function renderPicks(data, idMap) {
  const el = $('draftPicks');
  const made = data.picks ?? [];
  const order = data.oriolesPickOrder ?? [];

  if (!order.length) {
    el.innerHTML = '<span class="sidebar-msg">Pick order unavailable</span>';
    return;
  }

  el.innerHTML = order.map(slot => {
    const pick = made.find(p => p.round === slot.round && p.pick === slot.pick);
    if (!pick) {
      return `<div class="roster-item">
        <span class="roster-pos">R${slot.round}</span>
        <span class="roster-name roster-name--pending">Pick #${slot.pick} — on the clock</span>
      </div>`;
    }
    return `<div class="roster-item">
      <span class="roster-pos">R${slot.round}</span>
      ${playerNameHtml(pick.name, idMap)}
      <span class="roster-pos">${esc(pick.position ?? '')}</span>
      <span class="roster-badge roster-badge--info">${esc(pick.school ?? '')}</span>
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
    renderPicks(draftData, idMap);
    renderOrder(draftData);
    const updatedEl = $('draftUpdated');
    if (updatedEl && draftData.lastUpdated) {
      updatedEl.textContent = `Updated ${relativeDate(draftData.lastUpdated)}`;
    }
    loadDraftInfo(draftData);
    loadHistory(draftData, idMap);
  } catch {
    $('draftPicks').innerHTML = '<span class="sidebar-msg">Draft data unavailable</span>';
  }
}

// ── Round 1 order (full order, Orioles pick highlighted) ────────────
function renderOrder(data) {
  const el = $('draftOrder');
  if (!el) return;
  const order = data.round1Order ?? [];
  if (!order.length) {
    el.innerHTML = '<span class="sidebar-msg">Draft order unavailable</span>';
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
function loadHistory(data, idMap) {
  const el = $('draftHistory');
  if (!el) return;
  const history = [...(data.history ?? [])].sort((a, b) => b.year - a.year);
  if (!history.length) {
    el.innerHTML = '<span class="sidebar-msg">No history available</span>';
    return;
  }
  el.innerHTML = history.map(h => `
    <div class="asg-history-item">
      <span class="asg-history-year">${h.year}</span>
      <div class="asg-history-body">
        <div class="asg-history-result">${playerNameHtml(h.name, idMap)} · ${esc(h.position)}</div>
        <div class="asg-history-meta">Round ${h.round}, Pick ${h.pick} · ${esc(h.school)}</div>
      </div>
    </div>
  `).join('');
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
    const top = matches.slice(0, 8);

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
