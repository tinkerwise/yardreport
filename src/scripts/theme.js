// ── Theme ─────────────────────────────────────────────────────────
import { loadPrefs, savePrefs } from './storage.js';

export function applyTheme(theme) {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : theme;
  document.documentElement.setAttribute('data-theme', resolved);
  savePrefs({ theme });
}

// Apply saved theme immediately on import. A page load with no stored
// preference yet shouldn't itself count as "the user chose dark" — that
// would make the Friday check below think every first-time visitor has an
// explicit preference after their very first visit.
const _storedTheme = loadPrefs().theme;
if (_storedTheme) {
  applyTheme(_storedTheme);
} else {
  document.documentElement.setAttribute('data-theme', 'dark');
}

// Auto City Connect on Fridays — only for users who've never explicitly
// chosen a theme, so a deliberate Dark/Light/System/City Connect pick isn't
// silently overridden every week. Visual only; never written to storage.
if (new Date().getDay() === 5 && !_storedTheme) {
  document.documentElement.setAttribute('data-theme', 'city-connect');
}
