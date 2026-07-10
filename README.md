# Yard Report

A personal Orioles-first baseball dashboard built with [Astro](https://astro.build). Combines a filtered news feed, live score bugs, walk-up song context, and compact Orioles-focused widgets on the homepage, plus dedicated pages for schedule, depth chart, and mid-season events (All-Star Game, MLB Draft, Trade Deadline).

## Features

**News feed**
- Aggregates Orioles, MLB, and MiLB reporting from 14 RSS sources
- Grid, list, and compact article views with category, source, search, sort, and date-range filtering — all consolidated into a single settings panel
- Around the Horn featured story cards (equal-sized, right-aligned pill filters) with a dedicated story page
- Reader overlay for opening articles without leaving the dashboard
- Read/unread tracking with swipe gestures on mobile
- Every player name is a clickable link (active roster, minor leaguers, and retired players alike) that opens a stat card modal or links out to Baseball Savant / MLB.com

**Scores**
- Yesterday, today, and tomorrow score bugs with preview, live, and final states
- Popovers with lineup, pitching, scout notes, pitch arsenal, and box score context
- Orioles lineup and pitching rows include walk-up song icons, Spotify player/search overlay, and live-game walk-up queue context
- Rain delay and postponed states

**Schedule**
- Full-season Orioles schedule page at `/schedule/`
- Month and week calendar views with game results, series grouping, homestand/road trip context, probable pitchers, broadcast info, and weather for upcoming games

**Depth Chart**
- OPACY-shaped depth chart at `/depth-chart/` showing starters, backups, and injured list by position

**All-Star Game**
- All-Star hub at `/all-star/` with rosters, Home Run Derby bracket, and a live game tracker during the event

**MLB Draft**
- Draft hub at `/draft/` pulling live pick order and results directly from MLB's draft feed, with an Orioles picks ticker, round-by-round order tabs, draft history, and a highlights section

**Trade Deadline**
- Trade Deadline hub at `/trade-deadline/` tracking confirmed Orioles moves, players named in rumor coverage ("On the Block"), a full organization-wide rumor watch, and a per-player recap page summarizing the rumor coverage for anyone showing up in the headlines

**Sidebar widgets**
- On Deck: next Orioles game with weather forecast and schedule strip
- Standings, Yard Leaders, Roster with walk-up song links, Injury Report, Transactions, Contracts
- Podcast: latest Baseball Tonight with Buster Olney episode
- Video: MLB Fastcast, Top Plays, Orioles Game Recaps, Orioles Moments

**Other**
- Dark, light, system, and City Connect themes (auto-applied on Fridays)
- PWA-ready with apple-touch-icon support
- Easter eggs

## Stack

- [Astro](https://astro.build) — static site framework
- Vanilla JS — client-side rendering, state, and data fetching
- [MLB Stats API](https://statsapi.mlb.com/api/v1) — scores, schedule, roster, leaders, pitching, and live draft data
- [Open-Meteo](https://open-meteo.com) — weather forecasts
- Official Orioles walk-up music page + Spotify embeds — player walk-up song metadata and playback
- PHP RSS proxy — feed aggregation for production
- Optional offline build step using the Gemini API to generate trade-rumor recap summaries — runs by hand, never at request time, and never in the browser

## Notes

This is a personal project maintained with an Orioles-first editorial bias. Maintainer workflow, deployment, source inventory, and development guidance are in `brief.txt`.
