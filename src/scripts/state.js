// ── Shared application state ──────────────────────────────────────
import { loadPrefs } from './storage.js';

const prefs = loadPrefs();
const defaultView = prefs.defaultView || 'list';

export const state = {
  articles: [],
  activeCategory: 'all',
  activeSource: 'all',
  searchQuery: '',
  sortBy: 'date',
  dateRange: 7,
  showRead: Boolean(prefs.showRead),
  viewMode: window.innerWidth <= 600 ? 'list' : defaultView,
  standings: [],
  activeDiv: null,
  gamesMap: {},
};
