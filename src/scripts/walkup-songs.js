// ── Orioles player walkup songs ───────────────────────────────────
// Dynamic source: official Orioles walk-up page.
// Fallback map below is used when the live page cannot be fetched.

const ORIOLES_WALKUP_MUSIC_URL = 'https://www.mlb.com/orioles/ballpark/music';
const WALKUP_SONG_TTL_MS = 1000 * 60 * 60 * 6;

export const FALLBACK_WALKUP_SONGS = {
  // ── Active roster (sourced from mlb.com/orioles/ballpark/music, April 2026) ──
  677942: ['https://open.spotify.com/track/1E6bzmruhqnQDzq78o7Qq1'], // Blaze Alexander – Pump It Up (Joe Budden)
  624413: ['https://open.spotify.com/track/0k9JIBszlCqCa4SpXI353F'], // Pete Alonso – BIRDS (Turnstile)
  694212: ['https://open.spotify.com/track/45kBRk3OOKJNKJJFO0h1OJ'], // Samuel Basallo – Misericordia (Onell Diaz & Farruko)
  605135: ['https://open.spotify.com/track/0uNnfawpud9YTcn7WCRBgM'], // Chris Bassitt – God's Country (Blake Shelton)
  669358: ['https://open.spotify.com/track/0HY4qXIQLJ4E95I1LuPnU8'], // Shane Baz – Rooster (Alice in Chains)
  687637: ['https://open.spotify.com/track/6LyAwkJsHlW7RQ8S1cYAtM'], // Dylan Beavers – Overdue (Metro Boomin ft. Travis Scott)
  680694: ['https://open.spotify.com/track/7lrVfHGjUfWtlSKbDn141u'], // Kyle Bradish – Memories feat. Kid Cudi (David Guetta)
  666974: ['https://open.spotify.com/track/4lkbBBumrQF1SDhQkqs0Y3'], // Yennier Cano – Como Te Pago (Lenier)
  670329: ['https://open.spotify.com/track/228BxWXUYQPJrJYHDLOHkj'], // Rico Garcia – Gasolina (Daddy Yankee)
  668974: ['https://open.spotify.com/track/3hMHG6lx9QHVcfYSUr5PoM'], // Maverick Handley – Danger Zone (Kenny Loggins)
  664854: ['https://open.spotify.com/track/69QHm3pustz01CJRwdo20z'], // Ryan Helsley – Hells Bells (AC/DC)
  683002: ['https://open.spotify.com/track/66ZcOcouenzZEnzTJvoFmH', 'https://open.spotify.com/track/2Wgg8XEn4DBfbQy0tEIkPi'], // Gunnar Henderson – The Sweet Escape (Gwen Stefani) + I've Been Down (Hank Williams Jr.)
  669236: ['https://open.spotify.com/track/4xm2HjtDAdCobewPoaImT7'], // Jeremiah Jackson – Revolution (Kirk Franklin)
  691723: ['https://open.spotify.com/track/28DySuOwKC5m8We3yRPS04'], // Coby Mayo – End of Beginning (Djo)
  689296: ['https://open.spotify.com/track/2yxMDNWlGtsTes4Jbrddoi'], // Anthony Nunez – WALK (Hulvey & Lecrae)
  671286: ['https://open.spotify.com/track/2eFuynnDYd7UGN3piHjoMO'], // Johnathan Rodríguez – Volver A Empezar (Obyone)
  669432: ['https://open.spotify.com/track/1UBQ5GK8JaQjm5VbkBZY66'], // Trevor Rogers – Sharp Dressed Man (ZZ Top)
  544150: ['https://open.spotify.com/track/13OjJ7UaagsmVTaVN4yFrL'], // Albert Suárez – Danza Kuduro (Don Omar)
  665750: ['https://open.spotify.com/track/0K1XXuhaJBPWMcgjj3ug3u'], // Leody Taveras – Las Avispas (Juan Luis Guerra 4.40)
  621493: ['https://open.spotify.com/track/7wmi32Wz3IXXyCl60QZkTb'], // Taylor Ward – Superhero (Heroes & Villains) Instrumental (Metro Boomin)
  669330: ['https://open.spotify.com/track/2WVHl9NBV7qqkocj6Bsgqo'], // Tyler Wells – Waiting for the Thunder (Blackberry Smoke)
  642215: ['https://open.spotify.com/track/63SevszngYpZOwf63o61K4'], // Weston Wilson – Nevermind (Dennis Lloyd)
  664991: ['https://open.spotify.com/track/505lCWNDROW6OMK02H8SPw'], // Grant Wolfram – Lonely Is The Night (Billy Squier)
  // ── IL / inactive (preserved for when players return) ──────────────────────
  668939: ['https://open.spotify.com/track/2ueM6ZRm1HJZo5FBatt7Qm'], // Adley Rutschman – Alive (nightmare) (Kid Cudi)
  683734: ['https://open.spotify.com/track/2CGNAOSuO1MEFCbBRgUzjd'], // Jackson Holliday – luther (Kendrick Lamar & SZA)
  663624: ['https://open.spotify.com/track/0JJP0IS4w0fJx01EcrfkDe'], // Ryan Mountcastle – Dear Maria, Count Me In (All Time Low)
  641933: ['https://open.spotify.com/track/2tUL6dZf1mywCj5WvCPZw6'], // Tyler O'Neill – No Friends In The Industry (Drake)
  676059: ['https://open.spotify.com/track/1OLkuTadZZSdfzgUeemRsU'], // Jordan Westburg – The Name (KB ft. Koryn Hawthorne)
  681297: ['https://open.spotify.com/track/1EiLrPd8JMTcQUr1aLEUKi'], // Colton Cowser – Work (Gang Starr)
};

const walkupSongsCache = {
  loadedAt: 0,
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

function extractPlayerIdFromHref(href) {
  const match = String(href ?? '').match(/\/player\/[^/?#]*-(\d{5,8})(?:[/?#]|$)/i);
  return match ? match[1] : '';
}

// Normalise any Spotify URL (including embed variants) to the canonical
// open.spotify.com/track/ID form stored in the cache.
function normalizeSpotifyUrl(rawUrl) {
  try {
    const url = new URL(String(rawUrl));
    if (!/open\.spotify\.com/i.test(url.hostname)) return null;
    const m = url.pathname.match(/^\/(?:embed\/)?(track|playlist|album)\/([A-Za-z0-9]+)/i);
    if (!m) return null;
    return `https://open.spotify.com/${m[1].toLowerCase()}/${m[2]}`;
  } catch {
    return null;
  }
}

function addSongToMaps(url, playerId, playerName, byPlayerId, byPlayerName) {
  const key = normalizePlayerKey(playerName);
  if (playerId) {
    byPlayerId[playerId] ??= [];
    if (!byPlayerId[playerId].includes(url)) byPlayerId[playerId].push(url);
  }
  if (key) {
    byPlayerName[key] ??= [];
    if (!byPlayerName[key].includes(url)) byPlayerName[key].push(url);
  }
}

// Recursively walk a Next.js __NEXT_DATA__ object looking for objects that
// contain both a player identity (id + name) and one or more Spotify track URLs.
function walkObjectForSongs(obj, byPlayerId, byPlayerName, depth) {
  if (!obj || typeof obj !== 'object' || depth > 25) return;
  if (Array.isArray(obj)) {
    for (const item of obj) walkObjectForSongs(item, byPlayerId, byPlayerName, depth + 1);
    return;
  }

  let playerId = '';
  let playerName = '';
  const spotifyUrls = [];

  for (const [key, val] of Object.entries(obj)) {
    if (val == null) continue;
    if (typeof val === 'string') {
      if (/open\.spotify\.com\/(embed\/)?track\//i.test(val)) {
        const norm = normalizeSpotifyUrl(val);
        if (norm) spotifyUrls.push(norm);
      } else if (/^\d{5,8}$/.test(val) && /\bid\b|player|person/i.test(key)) {
        playerId = val;
      } else if (val.length > 1 && val.length < 60 && /^(?:full)?name$/i.test(key)) {
        playerName = val;
      }
    } else if (typeof val === 'number') {
      const s = String(val);
      if (/^\d{5,8}$/.test(s) && /\bid\b|player|person/i.test(key)) {
        playerId = s;
      }
    }
  }

  if ((playerId || playerName) && spotifyUrls.length > 0) {
    for (const url of spotifyUrls) {
      addSongToMaps(url, playerId, playerName, byPlayerId, byPlayerName);
    }
  }

  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') {
      walkObjectForSongs(val, byPlayerId, byPlayerName, depth + 1);
    }
  }
}

function parseWalkupSongs(htmlText) {
  const byPlayerId = {};
  const byPlayerName = {};
  if (!htmlText) return { byPlayerId, byPlayerName };

  const doc = new DOMParser().parseFromString(String(htmlText), 'text/html');

  // ── 1. Next.js __NEXT_DATA__ JSON (most reliable when present) ────
  const nextDataEl = doc.querySelector('script#__NEXT_DATA__');
  if (nextDataEl?.textContent) {
    try {
      walkObjectForSongs(JSON.parse(nextDataEl.textContent), byPlayerId, byPlayerName, 0);
    } catch {}
  }
  if (Object.keys(byPlayerId).length + Object.keys(byPlayerName).length > 0) {
    return { byPlayerId, byPlayerName };
  }

  // ── 2. DOM scan: anchors + Spotify iframes in document order ──────
  // querySelectorAll guarantees document order for compound selectors.
  let currentPlayerId = '';
  let currentPlayerName = '';

  for (const el of doc.querySelectorAll('a[href], iframe[src]')) {
    if (el.tagName === 'A') {
      const rawHref = el.getAttribute('href') || '';
      let href = rawHref;
      try { href = new URL(rawHref, ORIOLES_WALKUP_MUSIC_URL).href; } catch {}

      const playerId = extractPlayerIdFromHref(href);
      if (playerId) {
        // This is a player profile link — establish current context.
        currentPlayerId = playerId;
        currentPlayerName = String(el.textContent ?? '').replace(/\s+/g, ' ').trim();
        continue;
      }
      if (!currentPlayerName) continue;
      if (/open\.spotify\.com\//i.test(href)) {
        const url = normalizeSpotifyUrl(href);
        if (url) addSongToMaps(url, currentPlayerId, currentPlayerName, byPlayerId, byPlayerName);
      }
    } else if (el.tagName === 'IFRAME') {
      // Spotify embeds use <iframe src="https://open.spotify.com/embed/track/...">
      if (!currentPlayerName) continue;
      const src = el.getAttribute('src') || '';
      if (/open\.spotify\.com\//i.test(src)) {
        const url = normalizeSpotifyUrl(src);
        if (url) addSongToMaps(url, currentPlayerId, currentPlayerName, byPlayerId, byPlayerName);
      }
    }
  }

  return { byPlayerId, byPlayerName };
}

function hasFreshWalkupSongs() {
  return (Date.now() - walkupSongsCache.loadedAt) < WALKUP_SONG_TTL_MS;
}

export async function ensureWalkupSongsLoaded(proxyBaseUrl) {
  if (hasFreshWalkupSongs()) return walkupSongsCache;
  if (walkupSongsPromise) return walkupSongsPromise;
  if (!proxyBaseUrl) return walkupSongsCache;

  const targetUrl = `${proxyBaseUrl}?url=${encodeURIComponent(ORIOLES_WALKUP_MUSIC_URL)}&format=text`;
  walkupSongsPromise = fetch(targetUrl)
    .then(r => r.json())
    .then(payload => {
      const parsed = parseWalkupSongs(payload?.text ?? '');
      const mergedById = {};
      for (const [id, urls] of Object.entries(FALLBACK_WALKUP_SONGS)) {
        mergedById[id] = [...urls];
      }
      for (const [id, urls] of Object.entries(parsed.byPlayerId)) {
        mergedById[id] ??= [];
        for (const url of urls) {
          if (!mergedById[id].includes(url)) mergedById[id].push(url);
        }
      }
      walkupSongsCache.byPlayerId = {
        ...mergedById,
      };
      walkupSongsCache.byPlayerName = parsed.byPlayerName;
      walkupSongsCache.loadedAt = Date.now();
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
