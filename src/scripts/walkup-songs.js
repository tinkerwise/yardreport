// ── Orioles player walkup songs ───────────────────────────────────
// Source: public/walkup-songs.json, a snapshot of the official Orioles
// walk-up page (mlb.com/orioles/ballpark/music) written by
// scripts/update-walkup-songs.mjs on each deploy. The host can't fetch
// mlb.com live (its IP is blocked), so the browser reads the snapshot.

const WALKUP_SONGS_JSON = `${import.meta.env.BASE_URL}walkup-songs.json`;

// Players missing from the official page (IL, optioned, or departed) keep
// their last-known song here. Anyone on the official page uses that instead.
export const FALLBACK_WALKUP_SONGS = {
  677942: ['https://open.spotify.com/track/1E6bzmruhqnQDzq78o7Qq1'], // Blaze Alexander – Pump It Up (Joe Budden)
  694212: ['https://open.spotify.com/track/45kBRk3OOKJNKJJFO0h1OJ'], // Samuel Basallo – Misericordia (Onell Diaz & Farruko)
  680694: ['https://open.spotify.com/track/7lrVfHGjUfWtlSKbDn141u'], // Kyle Bradish – Memories feat. Kid Cudi (David Guetta)
  681297: ['https://open.spotify.com/track/1EiLrPd8JMTcQUr1aLEUKi'], // Colton Cowser – Work (Gang Starr)
  664854: ['https://open.spotify.com/track/69QHm3pustz01CJRwdo20z'], // Ryan Helsley – Hells Bells (AC/DC)
  702616: ['https://open.spotify.com/track/2CGNAOSuO1MEFCbBRgUzjd'], // Jackson Holliday – luther (Kendrick Lamar & SZA)
  641933: ['https://open.spotify.com/track/2tUL6dZf1mywCj5WvCPZw6'], // Tyler O'Neill – No Friends In The Industry (Drake)
  668939: ['https://open.spotify.com/track/2ueM6ZRm1HJZo5FBatt7Qm'], // Adley Rutschman – Alive (nightmare) (Kid Cudi)
  621493: ['https://open.spotify.com/track/7wmi32Wz3IXXyCl60QZkTb'], // Taylor Ward – Superhero (Heroes & Villains) Instrumental (Metro Boomin)
  669330: ['https://open.spotify.com/track/2WVHl9NBV7qqkocj6Bsgqo'], // Tyler Wells – Waiting for the Thunder (Blackberry Smoke)
  668974: ['https://open.spotify.com/track/3hMHG6lx9QHVcfYSUr5PoM'], // Maverick Handley – Danger Zone (Kenny Loggins)
  663624: ['https://open.spotify.com/track/0JJP0IS4w0fJx01EcrfkDe'], // Ryan Mountcastle – Dear Maria, Count Me In (All Time Low)
  671286: ['https://open.spotify.com/track/2eFuynnDYd7UGN3piHjoMO'], // Johnathan Rodríguez – Volver A Empezar (Obyone)
  676059: ['https://open.spotify.com/track/1OLkuTadZZSdfzgUeemRsU'], // Jordan Westburg – The Name (KB ft. Koryn Hawthorne)
  642215: ['https://open.spotify.com/track/63SevszngYpZOwf63o61K4'], // Weston Wilson – Nevermind (Dennis Lloyd)
};

const walkupSongsCache = {
  loaded: false,
  byPlayerId: { ...FALLBACK_WALKUP_SONGS },
  byPlayerName: {},
};
let walkupSongsPromise = null;

function normalizePlayerKey(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

// Official songs replace a player's fallback entry rather than adding to it,
// so a changed walk-up song doesn't leave the old one behind.
function applySnapshot(snapshot) {
  const byPlayerId = { ...FALLBACK_WALKUP_SONGS };
  const byPlayerName = {};
  for (const [id, player] of Object.entries(snapshot?.players ?? {})) {
    const urls = (player.songs ?? []).map(song => song.url).filter(Boolean);
    if (!urls.length) continue;
    byPlayerId[id] = urls;
    const key = normalizePlayerKey(player.name);
    if (key) byPlayerName[key] = urls;
  }
  walkupSongsCache.byPlayerId = byPlayerId;
  walkupSongsCache.byPlayerName = byPlayerName;
  walkupSongsCache.loaded = true;
}

export async function ensureWalkupSongsLoaded() {
  if (walkupSongsCache.loaded) return walkupSongsCache;
  walkupSongsPromise ??= fetch(WALKUP_SONGS_JSON)
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then(snapshot => {
      applySnapshot(snapshot);
      return walkupSongsCache;
    })
    .catch(() => walkupSongsCache)
    .finally(() => {
      walkupSongsPromise = null;
    });
  return walkupSongsPromise;
}

export function getWalkupSongUrls(playerId, fullName = '') {
  if (playerId != null) {
    const byId = walkupSongsCache.byPlayerId[String(playerId)];
    if (Array.isArray(byId) && byId.length) return byId;
  }
  const key = normalizePlayerKey(fullName);
  const byName = key ? (walkupSongsCache.byPlayerName[key] ?? []) : [];
  return Array.isArray(byName) ? byName : [];
}
