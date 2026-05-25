// ── Theme ─────────────────────────────────────────────────────────
import { loadPrefs, savePrefs } from './storage.js';

export function applyTheme(theme) {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : theme;
  document.documentElement.setAttribute('data-theme', resolved);
  savePrefs({ theme });
}

// Apply saved theme immediately on import
const _prefs = loadPrefs();
const _savedTheme = _prefs.theme || 'dark';
applyTheme(_savedTheme);

// Auto City Connect on Fridays — only if the user has NOT set an explicit preference
// (i.e. loadPrefs().theme is undefined/null, meaning they are on the default)
if (new Date().getDay() === 5 && !_prefs.theme) {
  document.documentElement.setAttribute('data-theme', 'city-connect');
}
