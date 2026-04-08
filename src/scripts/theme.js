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
applyTheme(loadPrefs().theme || 'dark');
