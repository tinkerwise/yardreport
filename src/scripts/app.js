import { loadPrefs, savePrefs } from './storage.js';
import { state } from './state.js';
import { applyTheme } from './theme.js';
import { $ } from './utils.js';
import { loadScores } from './scores.js';
import {
  loadFeeds,
  renderArticles,
  setViewMode,
  syncShowReadButton,
  closeReader,
} from './feeds.js';
import {
  loadStandings,
  loadOnDeck,
  loadRoster,
  loadTransactions,
  loadInjuryReport,
  loadLeaders,
  loadPodcast,
  loadVideos,
} from './sidebars.js';
import {
  triggerOriolesMagic,
  triggerSevenNationArmy,
  toggleOpacyTheme,
  toggleCityConnectTheme,
} from './easter-eggs.js';

// ── Refresh ───────────────────────────────────────────────────────
async function refresh() {
  const btn = $('refreshBtn');
  btn.disabled = true;
  btn.classList.add('spinning');
  await Promise.allSettled([loadFeeds(), loadScores(), loadStandings(), loadOnDeck(), loadRoster(), loadTransactions(), loadInjuryReport(), loadLeaders()]);
  btn.disabled = false;
  btn.classList.remove('spinning');
  const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  $('cacheLabel').textContent = `Updated ${now}`;
}

// ── Event setup ───────────────────────────────────────────────────
function setupEvents() {
  $('refreshBtn').addEventListener('click', refresh);

  // Search
  let searchTimer;
  $('searchInput').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.searchQuery = e.target.value.trim();
      renderArticles();
    }, 220);
  });

  // Sort
  $('sortSelect').addEventListener('change', e => {
    state.sortBy = e.target.value;
    renderArticles();
  });

  $('showReadBtn').addEventListener('click', () => {
    state.showRead = !state.showRead;
    savePrefs({ showRead: state.showRead });
    syncShowReadButton();
    renderArticles();
  });

  // Date range filter
  $('dateRangeSelect').addEventListener('change', e => {
    state.dateRange = Number(e.target.value);
    renderArticles();
  });

  // Initial UI state
  $('viewToggle').querySelectorAll('.view-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.view === state.viewMode));
  $('dateRangeSelect').value = String(state.dateRange);
  syncShowReadButton();

  // View toggle
  $('viewToggle').addEventListener('click', e => {
    const btn = e.target.closest('[data-view]');
    if (!btn) return;
    setViewMode(btn.dataset.view);
  });

  // Category filters
  $('categoryFilters').addEventListener('click', e => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    state.activeCategory = pill.dataset.category;
    $('categoryFilters').querySelectorAll('.pill').forEach(p =>
      p.classList.toggle('active', p.dataset.category === state.activeCategory));
    renderArticles();
  });

  // Settings
  $('settingsBtn').addEventListener('click', () => {
    $('settingsOverlay').classList.toggle('hidden');
    const p = loadPrefs();
    $('themeToggle').querySelectorAll('.theme-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.theme === (p.theme || 'dark')));
    $('defaultViewToggle').querySelectorAll('.theme-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.defview === (p.defaultView || 'list')));
  });
  $('settingsClose').addEventListener('click', () => $('settingsOverlay').classList.add('hidden'));
  $('settingsOverlay').addEventListener('click', e => {
    if (e.target === $('settingsOverlay')) $('settingsOverlay').classList.add('hidden');
  });
  $('themeToggle').addEventListener('click', e => {
    const btn = e.target.closest('[data-theme]');
    if (!btn) return;
    applyTheme(btn.dataset.theme);
    $('themeToggle').querySelectorAll('.theme-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.theme === btn.dataset.theme));
  });
  $('defaultViewToggle').addEventListener('click', e => {
    const btn = e.target.closest('[data-defview]');
    if (!btn) return;
    savePrefs({ defaultView: btn.dataset.defview });
    setViewMode(btn.dataset.defview, { render: false });
    $('defaultViewToggle').querySelectorAll('.theme-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.defview === btn.dataset.defview));
    renderArticles();
  });
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    const p = loadPrefs();
    if (p.theme === 'system') applyTheme('system');
  });

  // Right sidebar accordion
  document.querySelectorAll('.section-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const section = toggle.closest('.sidebar-section');
      const sidebar = section.closest('.sidebar');
      const isRightSidebar = sidebar?.classList.contains('sidebar-right');

      if (!isRightSidebar) {
        section.classList.toggle('collapsed');
        return;
      }

      const isCollapsed = section.classList.contains('collapsed');
      sidebar.querySelectorAll('.sidebar-section').forEach(peer => {
        if (peer !== section) peer.classList.add('collapsed');
      });
      section.classList.toggle('collapsed', !isCollapsed);
    });
  });

  // Source filter popover
  $('sourceFilterBtn').addEventListener('click', () => {
    $('sourcePopover').classList.toggle('hidden');
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.source-filter-wrap')) {
      $('sourcePopover').classList.add('hidden');
    }
  });

  // Reader close
  $('readerClose').addEventListener('click', closeReader);
  $('readerOverlay').addEventListener('click', e => {
    if (e.target === $('readerOverlay')) closeReader();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeReader();
  });

  // Auto-refresh scores and transactions every 5 minutes
  setInterval(() => {
    loadScores();
    loadTransactions();
  }, 5 * 60 * 1000);

  // ── Easter Eggs ──────────────────────────────────────────────────
  $('searchInput').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const trigger = e.target.value.trim().toLowerCase();
    if (trigger === 'magic') {
      e.preventDefault();
      triggerOriolesMagic();
    } else if (trigger === 'bmore' || trigger === '410') {
      e.preventDefault();
      toggleCityConnectTheme();
    }
  });

  const konamiSeq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let konamiIdx = 0;
  document.addEventListener('keydown', e => {
    if (e.key === konamiSeq[konamiIdx] || e.key.toLowerCase() === konamiSeq[konamiIdx]) {
      konamiIdx++;
      if (konamiIdx === konamiSeq.length) {
        konamiIdx = 0;
        triggerSevenNationArmy();
      }
    } else {
      konamiIdx = 0;
    }
  });

  let themeClickCount = 0;
  let themeClickTimer = null;
  $('themeToggle').addEventListener('click', () => {
    themeClickCount++;
    clearTimeout(themeClickTimer);
    themeClickTimer = setTimeout(() => { themeClickCount = 0; }, 500);
    if (themeClickCount >= 3) {
      themeClickCount = 0;
      toggleOpacyTheme();
    }
  });
}

// ── Init ──────────────────────────────────────────────────────────
async function init() {
  setupEvents();

  await Promise.allSettled([
    loadScores(),
    loadStandings(),
    loadFeeds(),
    loadOnDeck(),
  ]);

  const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  $('cacheLabel').textContent = `Updated ${now}`;

  Promise.allSettled([
    loadRoster(),
    loadTransactions(),
    loadInjuryReport(),
    loadLeaders(),
    loadPodcast(),
    loadVideos(),
  ]);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
