# Yard Report — Evaluation & Roadmap
**June 2026**

---

## Where Things Stand

The site is in strong shape. Four polished pages, 15 RSS sources, live MLB Stats API integration, walk-up songs, weather, depth chart with OPACY field geometry, rich score popovers with batting/pitching summaries, and a smart "Around the Horn" topic bundler. The recent run of commits shows a healthy cadence of UX polish — standings switcher, sidebar font consistency, score popover iterations — which signals the core is mature enough to start layering in bigger ideas.

---

## Optimizations

### ~~1. Instant Load with Stale-While-Revalidate Caching~~ ✅ Done
**Problem:** Every page load waits on 15 RSS fetches before content appears.  
**Fix:** Cached up to 300 articles (content field stripped) in `localStorage` under `yr_feed_cache`. On revisit, articles render instantly from cache while a fresh fetch runs in the background. Toolbar shows `Cached X:XX` during the refresh window, then `Updated X:XX` when fresh data arrives.  
**Files:** `storage.js` (`saveFeedCache`, `loadFeedCache`), `feeds.js` (`loadFeeds`), `app.js` (`init`)

### ~~2. Smart Feed Polling (ETag / Last-Modified)~~ ✅ Done
**Problem:** After the 15-minute browser cache window expires, every feed is fully re-downloaded and re-parsed even when content hasn't changed.  
**Fix:** PHP proxy now (a) forwards client `If-None-Match`/`If-Modified-Since` headers to the upstream RSS source, (b) relays any upstream `304 Not Modified` directly back to the browser, (c) emits upstream `ETag`/`Last-Modified` on every response, and (d) falls back to an `md5` hash of the raw response body as a self-generated ETag for feeds that don't provide cache validators — so the proxy can still return 304 when content is byte-for-byte identical. No JS changes needed; `fetch()`'s default `cache: 'default'` mode handles conditional requests transparently via the browser's HTTP cache.  
**Files:** `rss-proxy.php`

### ~~3. Progressive Article Rendering~~ ✅ Done
**Problem:** The feed waits for all sources to resolve before rendering anything.  
**Fix:** On first visit (no cache), each feed renders as it resolves via individual `.then()` callbacks, with a `requestAnimationFrame` debounce to collapse rapid arrivals into a single DOM update per frame. First articles appear in ~300ms. On subsequent visits the cache is already showing, so a single final swap is used instead — avoids disrupting articles the user may already be reading.  
**Files:** `feeds.js` (`loadFeeds`)

### ~~4. Infinite Scroll for Long Article Lists~~ ✅ Done
**Problem:** The article list was capped hard at 10 items with no way to see more.  
**Fix:** `renderArticles()` (exported, resets count) wraps `_renderArticles()` (internal). After each render, if there are more articles beyond the current `visibleCount`, a `div.load-more-sentinel` is appended and observed with `IntersectionObserver (rootMargin: 200px)`. When it enters the viewport, `loadMoreArticles()` increments `visibleCount` by 10 and re-renders. Swipe-to-mark-read handlers call `_renderArticles()` directly so the current visible count is preserved while scrolling deep.  
**Files:** `feeds.js` (`renderArticles`, `_renderArticles`, `loadMoreArticles`), `style.css` (`.load-more-sentinel`)

### 5. CSS Architecture
**Problem:** `style.css` is 4,095 lines — one file, no scope. Every theme variable, animation, and page layout is mixed together.  
**Fix:** Split into logical layers: `base.css`, `layout.css`, `components/sidebar.css`, `components/scores.css`, `pages/schedule.css`, `themes.css`. Astro supports CSS modules natively. Won't change a pixel — just makes future changes much safer.  
**Effort:** Medium-high (refactor only, no behavior change).

### 6. PWA / Installable App
**Problem:** Baseball fans check scores constantly. An installed home screen app is far stickier than a browser bookmark.  
**Fix:** Add a Web App Manifest and a minimal Service Worker that caches the shell and last-known feed data. Users can "install" Yard Report on iOS/Android and get a native-feeling app with offline fallback.  
**Effort:** Low-medium. Astro has a PWA integration (`@vite-pwa/astro`).

---

## Exciting New Features

### ~~7. Live Play-by-Play Ticker~~ ✅ Done
**What:** A thin orange-tinted strip below the scores bar appears when an Orioles game goes live. Shows current inning/half, outs, batter vs pitcher matchup, count, and the last play description. Polls `feed/live` every 30 seconds via a dedicated `setInterval`; stops and hides itself when the game ends or no Orioles game is live.  
**Files:** `scores.js` (`startLiveTicker`, `updateTicker`, `stopLiveTicker`), `index.astro` (`#playTicker`), `style.css` (`.play-ticker`, `.ticker-*`)

### ~~8. Pitching Matchup Preview Card~~ ✅ Done
**What:** For today's and tomorrow's games, a "Probable Starters" section appears below the On Deck card showing both probable pitchers side-by-side with ERA, W-L, K/9, and WHIP. Pitcher season stats are fetched in parallel from the MLB People API. Falls back to "TBD" if no probable pitcher is announced.  
**Files:** `sidebars.js` (`loadOnDeck`), `style.css` (`.matchup-pitchers`, `.matchup-sp-*`)

### 9. Player Stat Cards (Click-to-Expand)
**What:** Clicking any player chip — in the roster widget, depth chart, or score popover — opens a compact card showing: current season slash line or ERA, last 7 days stats, Statcast percentile bars (exit velo, sprint speed, etc. from Baseball Savant), and the walk-up song Spotify embed.  
**Why it's great:** Every player name in the app becomes a discovery surface. Ties together the walk-up song work with actual stats.  
**Effort:** Medium-high. Baseball Savant has a public Statcast API.

### 10. Prospect Pipeline Page
**What:** A fifth page: `/pipeline/`. Shows the top 10 Orioles prospects with their current minor league team, level, stats, and ETA to the majors. Pulls from MiLB data and Baseball America/FanGraphs rankings (RSS/API). A "Watch List" toggle lets users star prospects.  
**Why it's great:** Orioles fans are deeply invested in the farm system. This gives the site a unique angle no other aggregator covers.  
**Effort:** High. MiLB API is less documented; may require scraping or a third-party source.

### ~~11. Transaction Alerts (Toast Notifications)~~ ✅ Done
**What:** When a new transaction appears (DFA, trade, call-up, IL move) that wasn't in the previous poll, a toast slides in from the bottom-right with a type icon (🏥 IL, ⬆️ call-up, ⬇️ DFA, 🔄 trade, ✍️ signing) and the transaction description. Auto-dismisses after 6 seconds; has a manual ✕ button. First page load populates the known-ID set silently — toasts only fire on subsequent polls.  
**Files:** `utils.js` (`showToast`), `sidebars.js` (`knownTxnIds`, `txnKey`, `txnIcon`, `loadTransactions`), `style.css` (`.toast-*`, `@keyframes toast-in/out`)

### 12. Historical Standings Comparison
**What:** In the Standings widget, add a small sparkline or "+/– vs last year at this date" delta next to each team's record. Shows whether the Orioles are ahead of or behind last season's pace.  
**Why it's great:** Raw record doesn't tell you if 34-40 is good or bad relative to expectations. Historical context makes the number meaningful.  
**Effort:** Medium. MLB Stats API has historical season data; requires storing/fetching last-year's standings at the same game number.

### ~~13. Walk-Up Song Spotify Player (In-App)~~ ✅ Done
**What:** The walkup song icon in the 40-Man Roster is now a toggle button. Clicking it lazily injects a compact Spotify embed (`height=80`) directly below that player's row; clicking again removes it. Multi-song players (e.g., Gunnar Henderson) get stacked embeds. The handler is attached once via event delegation on the roster container so it survives the post-song-load innerHTML re-render.  
**Files:** `sidebars.js` (`loadRoster`, delegated click handler), `style.css` (`.walkup-song-btn`, `.spotify-embed-row`)

### 14. Game Countdown Timer
**What:** When no game is live, the scores bar or On Deck widget shows a live countdown: "Next game in 4h 23m." Flips to live mode when the game starts.  
**Why it's great:** Tiny feature, surprisingly satisfying. Fans know exactly when to be back.  
**Effort:** Very low. `Date.now()` vs game start time from existing schedule data; `setInterval` every second.

### 15. "This Week in O's History" Feed Card
**What:** One special card injected into the article feed each day that shows a notable moment from Orioles history on this date — Cal Ripken's 2,131st consecutive game, a World Series clincher, a no-hitter. Pull from a curated static JSON or the Baseball Reference "this day in baseball" page.  
**Why it's great:** Breaks up the news feed with nostalgia. Very on-brand for a fansite.  
**Effort:** Low-medium. Could start with a curated static JSON of ~50 key dates; scrape the rest over time.

---

## Priority Order

| # | Feature / Fix | Impact | Effort | Do First? |
|---|---|---|---|---|
| 1 | Stale-while-revalidate feed cache | ⭐⭐⭐ | Medium | ✅ Done |
| 2 | ETag-based smart polling | ⭐⭐ | Medium | ✅ Done |
| 11 | Transaction alerts (toasts) | ⭐⭐⭐ | Low | ✅ Done |
| 14 | Game countdown timer | ⭐⭐ | Very low | ✅ Yes |
| 8 | Pitching matchup preview | ⭐⭐⭐ | Low-med | ✅ Done |
| 13 | Walk-up song in-app player | ⭐⭐ | Low | ✅ Done |
| 7 | Live play-by-play ticker | ⭐⭐⭐⭐ | Medium | ✅ Done |
| 9 | Player stat cards | ⭐⭐⭐⭐ | Med-high | Next |
| 3 | Progressive article rendering | ⭐⭐⭐ | Medium | ✅ Done |
| 12 | Historical standings comparison | ⭐⭐ | Medium | Later |
| 15 | This Week in O's History | ⭐⭐ | Low-med | Later |
| 10 | Prospect pipeline page | ⭐⭐⭐⭐ | High | Later |
| 6 | PWA / installable app | ⭐⭐⭐ | Low-med | Later |
| 4 | Infinite scroll | ⭐ | Low-med | ✅ Done |
| 5 | CSS architecture refactor | ⭐ | Med-high | Later |

---

*Generated June 2026 based on codebase review and git history.*
