// ── Player stat card modal ─────────────────────────────────────────
import { MLB, SEASON } from './config.js';
import { esc } from './utils.js';
import { getWalkupSongUrls } from './walkup-songs.js';

const statsCache = new Map();
let overlayEl = null;

function overlay() {
  if (!overlayEl) {
    overlayEl = document.createElement('div');
    overlayEl.id = 'playerCardOverlay';
    overlayEl.className = 'player-card-overlay hidden';
    document.body.appendChild(overlayEl);
    overlayEl.addEventListener('click', e => {
      if (e.target === overlayEl) closePlayerCard();
    });
  }
  return overlayEl;
}

export function closePlayerCard() {
  overlay().classList.add('hidden');
}

function statCell(val, lbl) {
  return `<div class="pc-stat"><span class="pc-stat-val">${esc(String(val ?? '--'))}</span><span class="pc-stat-lbl">${esc(lbl)}</span></div>`;
}

function renderStats(stats, isPitcher) {
  if (!stats) return '';
  if (isPitcher) {
    const wl = `${stats.wins ?? 0}-${stats.losses ?? 0}`;
    const k9 = stats.strikeoutsPer9Inn ? parseFloat(stats.strikeoutsPer9Inn).toFixed(1) : '--';
    return [
      statCell(stats.era ?? '--', 'ERA'),
      statCell(wl, 'W-L'),
      statCell(stats.inningsPitched ?? '--', 'IP'),
      statCell(stats.whip ?? '--', 'WHIP'),
      statCell(k9, 'K/9'),
    ].join('');
  }
  return [
    statCell(stats.avg ?? '--', 'AVG'),
    statCell(stats.obp ?? '--', 'OBP'),
    statCell(stats.slg ?? '--', 'SLG'),
    statCell(stats.ops ?? '--', 'OPS'),
    statCell(stats.homeRuns ?? '--', 'HR'),
    statCell(stats.rbi ?? '--', 'RBI'),
  ].join('');
}

export async function showPlayerCard(pid, fullName = '') {
  const el = overlay();
  el.innerHTML = `<div class="player-card"><button class="pc-close" aria-label="Close">✕</button><div class="pc-loading">Loading…</div></div>`;
  el.classList.remove('hidden');
  el.querySelector('.pc-close').addEventListener('click', closePlayerCard);

  try {
    let person = statsCache.get(String(pid));
    if (!person) {
      const data = await fetch(
        `${MLB}/people/${pid}?hydrate=stats(group=[hitting,pitching],type=season,season=${SEASON})`
      ).then(r => r.json());
      person = data.people?.[0] ?? null;
      if (person) statsCache.set(String(pid), person);
    }
    if (!person) throw new Error('not found');

    const pos = person.primaryPosition?.abbreviation ?? '';
    const num = person.primaryNumber ? `#${person.primaryNumber}` : '';
    const isPitcher = ['SP', 'RP', 'P'].includes(pos);

    const hittingStat = person.stats?.find(s => s.group?.displayName === 'hitting')?.splits?.[0]?.stat ?? null;
    const pitchStat   = person.stats?.find(s => s.group?.displayName === 'pitching')?.splits?.[0]?.stat ?? null;
    const activeStat  = isPitcher ? pitchStat : hittingStat;
    const statsHtml   = renderStats(activeStat, isPitcher);

    const photoUrl = `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${pid}/headshot/67/current`;
    const savantHref = `https://baseballsavant.mlb.com/savant-player/${pid}`;

    const songUrls = getWalkupSongUrls(Number(pid), person.fullName);
    const songHtml = songUrls.length
      ? `<div class="pc-song-head">🎵 Walk-Up Song</div>` +
        songUrls.map(url => {
          const trackId = url.match(/\/track\/([A-Za-z0-9]+)/)?.[1];
          return trackId
            ? `<iframe src="https://open.spotify.com/embed/track/${trackId}?utm_source=generator" width="100%" height="80" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`
            : '';
        }).filter(Boolean).join('')
      : '';

    el.innerHTML = `
      <div class="player-card">
        <button class="pc-close" aria-label="Close">✕</button>
        <div class="pc-header">
          <img class="pc-photo" src="${photoUrl}" alt="" loading="lazy" onerror="this.style.display='none'">
          <div class="pc-info">
            <div class="pc-name">${esc(person.fullName)}</div>
            <div class="pc-meta">${[num, esc(pos)].filter(Boolean).join(' · ')}</div>
            <a class="pc-savant-link" href="${savantHref}" target="_blank" rel="noopener">Statcast ↗</a>
          </div>
        </div>
        ${statsHtml ? `<div class="pc-stats">${statsHtml}</div>` : ''}
        ${songHtml ? `<div class="pc-song">${songHtml}</div>` : ''}
      </div>`;
    el.querySelector('.pc-close').addEventListener('click', closePlayerCard);
  } catch {
    el.innerHTML = `<div class="player-card"><button class="pc-close" aria-label="Close">✕</button><div class="pc-loading">Could not load player data.</div></div>`;
    el.querySelector('.pc-close').addEventListener('click', closePlayerCard);
  }
}
