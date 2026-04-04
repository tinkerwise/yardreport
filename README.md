# Yard Report

Yard Report is a personal Orioles- and MLB-focused news aggregator built as a static Astro site. It combines baseball news, score bugs, sidebar widgets, and a few hidden seasonal/site-specific Easter eggs into a single-page dashboard.

## What The Site Does

- Aggregates Orioles and MLB news from multiple RSS sources
- Supports grid, list, and compact article views
- Includes category, source, search, sort, and date-range filtering
- Bundles major cross-source stories into "Around the Horn" groups
- Shows score bugs for yesterday, today, and tomorrow, including live state, delays/postponements, weather, and box score hover details
- Surfaces Orioles-focused sidebar widgets for On Deck, standings, Yard Leaders, roster, injury report, transactions, a compact podcast player, and video
- Persists theme, default view, and read/unread state in localStorage

## Current Highlights

- News feed with full-reader modal, thumbnails, share actions, read tracking, and mobile swipe mark/unmark
- Feed toolbar with left-aligned category pills and right-aligned source/view controls
- On Deck widget with schedule strip, weather, and game-day lineup popover
- Standings widget with division tabs
- Yard Leaders widget with Baseball Savant player/stat links
- Injury Report with IL type and injury note
- Transactions widget covering the last 14 days
- Podcast widget with a small native audio player for the latest `Baseball Tonight with Buster Olney` episode plus episode/archive links
- Video widget with MLB Fastcast, MLB Top Plays, Orioles Game Recaps, The Chill, and a random Orioles Moments video on each page load
- Easter eggs including `magic`, `heritage`, Konami Code, and the hidden OPACY theme

## Stack

- Astro 4
- Static deployment
- MLB Stats API for baseball data
- Open-Meteo for ballpark forecasts
- Google Favicon API for source icons
- PHP RSS proxy for production feed/text fetching
- Megaphone RSS feed for the podcast widget
- ESPN podcast archive page for podcast detail/archive links
- Dev-only Astro middleware proxy for local development

## External Sources And Feeds

### News RSS Sources

- Baltimore Orioles: `https://www.mlb.com/orioles/feeds/news/rss.xml`
- Baltimore Baseball: `https://www.baltimorebaseball.com/feed/`
- Camden Chat: `https://www.camdenchat.com/rss/index.xml`
- Birds Watcher: `https://birdswatcher.com/feed/`
- Eutaw Street Report: `https://www.eutawstreetreport.com/feed/`
- MASN Sports: `https://www.masnsports.com/feed`
- Orioles Hangout: `https://www.orioleshangout.com/feed/`
- MLB.com: `https://www.mlb.com/feeds/news/rss.xml`
- MLB Trade Rumors: `https://www.mlbtraderumors.com/baltimore-orioles/feed`
- ESPN MLB: `https://www.espn.com/espn/rss/mlb/news`
- FanGraphs: `https://blogs.fangraphs.com/feed/`
- Baseball Prospectus: `https://www.baseballprospectus.com/tag/baltimore-orioles/feed/`
- CBS Sports MLB: `https://www.cbssports.com/rss/headlines/mlb/`
- Yahoo Sports MLB: `https://sports.yahoo.com/mlb/rss.xml`
- Baseball America: `https://www.baseballamerica.com/feed/`
- New York Times Baseball: `https://rss.nytimes.com/services/xml/rss/nyt/Baseball.xml`
- The Long Game: `https://mollyknight.substack.com/feed`

### Podcast Sources

- Baseball Tonight with Buster Olney RSS: `https://feeds.megaphone.fm/ESP1723897648`
- ESPN archive/details page: `https://www.espn.com/espnradio/podcast/archive?id=2386164`

### Video Sources

- YouTube playlist feed: `https://www.youtube.com/feeds/videos.xml?playlist_id=<PLAYLIST_ID>`
- MLB Fastcast playlist ID: `PLL-lmlkrmJakABrOT6FmV0mU-5oIF8nGu`
- MLB Top Plays playlist ID: `PLL-lmlkrmJalPg-EgiZ92Eyg9YodLbQsE`
- Orioles Game Recaps playlist ID: `PLoeYQM_iUEVyoMu-AIZFXs9ja6GMzF1Ce`
- The Chill playlist ID: `PLoeYQM_iUEVy440XCy6hNLnQf8OBBsdSl`
- Orioles Moments playlist ID: `PLoeYQM_iUEVwNa9HwsFfS0aWvshxoYnhy`

### Data And Asset Services

- MLB Stats API: `https://statsapi.mlb.com/api/v1`
- Open-Meteo forecast API: `https://api.open-meteo.com/v1/forecast`
- Google Favicon API: `https://www.google.com/s2/favicons`
- MLB Gameday and story links: `https://www.mlb.com/gameday/...` and `https://www.mlb.com/stories/game/...`
- MLB team/player/transactions pages: `https://www.mlb.com/...`
- MLB team logo assets: `https://www.mlbstatic.com/team-logos/...`
- Baseball Savant player and leaderboard links: `https://baseballsavant.mlb.com/...`

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Build the site:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Project Structure

- [src/pages/index.astro](/Users/briancsmith/Documents/GitHub/yardreport/src/pages/index.astro): page shell and widget layout
- [src/scripts/app.js](/Users/briancsmith/Documents/GitHub/yardreport/src/scripts/app.js): main client-side app logic
- [public/style.css](/Users/briancsmith/Documents/GitHub/yardreport/public/style.css): global styling
- [public/feeds.json](/Users/briancsmith/Documents/GitHub/yardreport/public/feeds.json): news/video source definitions
- [public/rss-proxy.php](/Users/briancsmith/Documents/GitHub/yardreport/public/rss-proxy.php): production proxy for trusted feeds/pages
- [updates.txt](/Users/briancsmith/Documents/GitHub/yardreport/updates.txt): running feature/spec file
- [changelog.txt](/Users/briancsmith/Documents/GitHub/yardreport/changelog.txt): recent project change log

## Workflow Notes

`updates.txt` is the main running spec for feature work. New ideas, shipped features, and implementation prompts should stay aligned with that file.

The main implementation surface is `src/scripts/app.js`, so even small changes can have broad UI impact. When making updates, preserve readability, avoid content overload, and be careful with shared render/state logic.

The canonical inventory of third-party feeds and services now lives in the `External Sources And Feeds` section above and should be kept in sync with [public/feeds.json](/Users/briancsmith/Documents/GitHub/yardreport/public/feeds.json) and [src/scripts/app.js](/Users/briancsmith/Documents/GitHub/yardreport/src/scripts/app.js).
