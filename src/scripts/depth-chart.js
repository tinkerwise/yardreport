// ── Depth Chart page ──────────────────────────────────────────────
import './theme.js';
import { MLB, ORIOLES_ID, SEASON } from './config.js';
import { esc } from './utils.js';

function savantUrl(id) {
  return `https://baseballsavant.mlb.com/savant-player/${id}`;
}

const IL_LABEL = { D10: '10-Day IL', D15: '15-Day IL', D60: '60-Day IL' };
const IL_ORDER  = { D10: 0, D15: 1, D60: 2 };

function lastName(fullName) {
  return fullName.trim().split(/\s+/).at(-1);
}

function ilPill(p) {
  const code = p.status?.code;
  const label = IL_LABEL[code];
  return label ? `<span class="dc-il-pill">${label}</span>` : '';
}

function renderFieldChip(posId, pos, players) {
  const el = document.getElementById(posId);
  if (!el) return;

  if (!players?.length) {
    el.innerHTML = `<span class="dc-chip-pos">${esc(pos)}</span><span class="dc-chip-empty">—</span>`;
    return;
  }

  const [starter, ...rest] = players;
  const backups = rest.slice(0, 2);

  const backupHtml = backups.map(p => {
    const pill = ilPill(p);
    return `<a class="dc-chip-backup${pill ? ' dc-chip-backup--il' : ''}" href="${esc(savantUrl(p.person.id))}" target="_blank" rel="noopener" data-pid="${p.person.id}" data-pname="${esc(p.person.fullName)}">${esc(lastName(p.person.fullName))}${pill}</a>`;
  }).join('');

  el.innerHTML = `
    <span class="dc-chip-pos">${esc(pos)}</span>
    <a class="dc-chip-starter" href="${esc(savantUrl(starter.person.id))}" target="_blank" rel="noopener" data-pid="${starter.person.id}" data-pname="${esc(starter.person.fullName)}">${esc(lastName(starter.person.fullName))}</a>
    ${ilPill(starter)}
    ${backupHtml ? `<div class="dc-chip-backups">${backupHtml}</div>` : ''}
  `;
}

function renderPitchCol(elId, label, players) {
  const el = document.getElementById(elId);
  if (!el) return;

  const rows = players.slice(0, 10).map((p, i) => {
    const cls = i === 0 ? ' dc-pit-row--starter' : '';
    const pill = ilPill(p);
    return `<div class="dc-pit-row${cls}">
      <span class="dc-pit-rank">${i + 1}</span>
      <a class="dc-pit-name" href="${esc(savantUrl(p.person.id))}" target="_blank" rel="noopener" data-pid="${p.person.id}" data-pname="${esc(p.person.fullName)}">${esc(p.person.fullName)}</a>
      ${pill}
    </div>`;
  }).join('');

  el.innerHTML = `<div class="dc-pit-label">${esc(label)}</div>${rows}`;
}

function renderIlSection(players) {
  const el = document.getElementById('dcIlSection');
  if (!el) return;

  const seen = new Set();
  const ilPlayers = players
    .filter(p => p.status?.code in IL_ORDER && !seen.has(p.person.id) && seen.add(p.person.id))
    .sort((a, b) => {
      const ao = IL_ORDER[a.status?.code] ?? 9;
      const bo = IL_ORDER[b.status?.code] ?? 9;
      return ao !== bo ? ao - bo : a.person.fullName.localeCompare(b.person.fullName);
    });

  if (!ilPlayers.length) {
    el.style.display = 'none';
    return;
  }

  const rows = ilPlayers.map(p => {
    const label = IL_LABEL[p.status?.code] ?? '';
    const pos   = p.position?.abbreviation ?? '';
    return `<div class="dc-il-row">
      <span class="dc-il-row-pos">${esc(pos)}</span>
      <a class="dc-il-row-name" href="${esc(savantUrl(p.person.id))}" target="_blank" rel="noopener">${esc(p.person.fullName)}</a>
      <span class="dc-il-pill">${esc(label)}</span>
    </div>`;
  }).join('');

  el.innerHTML = `<div class="dc-il-section-label">Injured List</div>${rows}`;
}

async function loadDepthChart() {
  const overlay = document.getElementById('dcOverlay');
  try {
    const data = await fetch(
      `${MLB}/teams/${ORIOLES_ID}/roster?rosterType=depthChart&season=${SEASON}`
    ).then(r => r.json());

    const players = data.roster ?? [];
    if (!players.length) {
      overlay.innerHTML = '<span class="dc-unavail">Depth chart unavailable</span>';
      return;
    }

    // Group by position abbreviation; API order = depth order
    const byPos = {};
    for (const p of players) {
      const pos = p.position?.abbreviation ?? 'UTIL';
      (byPos[pos] ??= []).push(p);
    }

    // Field positions
    renderFieldChip('dc-C',  'C',  byPos['C']);
    renderFieldChip('dc-1B', '1B', byPos['1B']);
    renderFieldChip('dc-2B', '2B', byPos['2B']);
    renderFieldChip('dc-3B', '3B', byPos['3B']);
    renderFieldChip('dc-SS', 'SS', byPos['SS']);
    renderFieldChip('dc-LF', 'LF', byPos['LF'] ?? byPos['OF']);
    renderFieldChip('dc-CF', 'CF', byPos['CF'] ?? byPos['OF']);
    renderFieldChip('dc-RF', 'RF', byPos['RF'] ?? byPos['OF']);
    renderFieldChip('dc-DH', 'DH', byPos['DH']);

    // IL section (all positions, deduplicated, sorted by IL length)
    renderIlSection(players);

    // Pitching
    renderPitchCol('dcRotation', 'Rotation', byPos['SP'] ?? []);
    renderPitchCol('dcBullpen',  'Bullpen',  [...(byPos['RP'] ?? []), ...(byPos['P'] ?? [])]);

  } catch {
    overlay.innerHTML = '<span class="dc-unavail">Unavailable</span>';
  }
}

loadDepthChart();
