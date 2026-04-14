// ── Orioles player walkup songs ───────────────────────────────────
// Keyed by MLB Stats API player ID → Spotify track URL.
// Only includes players currently on the 40-man roster with a
// verified walkup song and Spotify track.
//
// MLB player IDs: https://statsapi.mlb.com/api/v1/teams/110/roster?rosterType=40Man
// Spotify track URLs: https://open.spotify.com/track/{trackId}

export const WALKUP_SONGS = {
  // Gunnar Henderson — "The Sweet Escape" by Gwen Stefani ft. Akon
  683002: 'https://open.spotify.com/track/66ZcOcouenzZEnzTJvoFmH',

  // Adley Rutschman — "Gorgeous" by Kanye West ft. Kid Cudi & Raekwon
  668939: 'https://open.spotify.com/track/23SZWX2IaDnxmhFsSLvkG2',

  // Jackson Holliday — "luther" by Kendrick Lamar & SZA
  683734: 'https://open.spotify.com/track/2CGNAOSuO1MEFCbBRgUzjd',

  // Ryan Mountcastle — "Dear Maria, Count Me In" by All Time Low
  663624: 'https://open.spotify.com/track/0JJP0IS4w0fJx01EcrfkDe',

  // Pete Alonso — "Layla" by Derek & The Dominos
  624413: 'https://open.spotify.com/track/5jrt3BfxnJ0jMfhGwTVvn3',
};
