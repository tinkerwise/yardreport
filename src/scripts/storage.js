const PREFS_KEY = 'yr_prefs';
const READ_KEY = 'yr_read';
const READ_ATH_KEY = 'yr_read_ath';

export function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
  } catch {
    return {};
  }
}

export function savePrefs(updates) {
  const prefs = { ...loadPrefs(), ...updates };
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  return prefs;
}

export function getReadArticles() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY)) || []);
  } catch {
    return new Set();
  }
}

export function markRead(url) {
  const read = getReadArticles();
  read.add(url);
  const arr = [...read].slice(-200);
  localStorage.setItem(READ_KEY, JSON.stringify(arr));
}

export function unmarkRead(url) {
  const read = getReadArticles();
  read.delete(url);
  localStorage.setItem(READ_KEY, JSON.stringify([...read]));
}

export function getReadAthBundles() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_ATH_KEY)) || []);
  } catch {
    return new Set();
  }
}

export function markReadAthBundle(slug) {
  const read = getReadAthBundles();
  read.add(slug);
  const arr = [...read].slice(-100);
  localStorage.setItem(READ_ATH_KEY, JSON.stringify(arr));
}
