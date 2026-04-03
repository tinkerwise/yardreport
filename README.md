# Yard Report

Yard Report is a personal Orioles- and MLB-focused news aggregator built as a static Astro site. It combines baseball news, score bugs, sidebar widgets, and a few hidden seasonal/site-specific Easter eggs into a single-page dashboard.

## What The Site Does

- Aggregates Orioles and MLB news from multiple RSS sources
- Supports grid, list, and compact article views
- Includes category, source, search, sort, and date-range filtering
- Bundles major cross-source stories into "Around the Horn" groups
- Shows score bugs for yesterday, today, and tomorrow, including live state, delays/postponements, weather, and box score hover details
- Surfaces Orioles-focused sidebar widgets for On Deck, standings, Yard Leaders, roster, injury report, transactions, and video
- Persists theme, default view, and read/unread state in localStorage

## Current Highlights

- News feed with full-reader modal, thumbnails, share actions, read tracking, and mobile swipe mark/unmark
- On Deck widget with schedule strip, weather, and game-day lineup popover
- Standings widget with division tabs
- Yard Leaders widget with Baseball Savant player/stat links
- Injury Report with IL type, projected return date, and injury note
- Transactions widget covering the last 14 days
- Easter eggs including `magic`, `heritage`, Konami Code, and the hidden OPACY theme

## Stack

- Astro 4
- Static deployment
- MLB Stats API for baseball data
- Open-Meteo for ballpark forecasts
- Google Favicon API for source icons
- PHP RSS proxy for production feed/text fetching
- Dev-only Astro middleware proxy for local development

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
