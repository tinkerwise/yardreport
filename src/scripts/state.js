// ── Shared application state ──────────────────────────────────────
import { loadPrefs } from './storage.js';

const prefs = loadPrefs();
const defaultView = prefs.defaultView || 'list';

export const state = {
  articles: [],
  activeCategory: 'all',
  // Source kinds shown in the feed (feeds.json "kind"): reporting vs. opinion/blogs
  feedKinds: { news: prefs.feedKinds?.news ?? true, opinion: prefs.feedKinds?.opinion ?? true },
  activeSource: 'all',
  searchQuery: '',
  sortBy: 'date',
  dateRange: 7,
  showRead: Boolean(prefs.showRead),
  viewMode: window.innerWidth <= 600 ? 'list' : defaultView,
  standings: [],
  wildCard: { AL: [], NL: [] },
  activeDiv: null,
  activeLeague: 'AL',
  gamesMap: {},
};
