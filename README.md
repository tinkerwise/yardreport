# Yard Report

Yard Report is a personal Orioles- and MLB-focused news dashboard built with Astro. It combines a filtered baseball news feed with live score bugs and Orioles-first sidebar widgets in a single-page experience.

## Features

- Orioles- and MLB-focused news aggregation
- Grid, list, and compact article views
- Category, source, search, sort, and date-range filtering
- Score bugs for yesterday, today, and tomorrow with live game details
- Orioles-focused sidebar widgets for On Deck, standings, leaders, roster, injuries, transactions, podcast, and video
- Reader modal with share actions and read/unread tracking
- Theme and default-view preferences saved in localStorage

## Stack

- Astro 4
- Static deployment
- MLB Stats API
- Open-Meteo
- PHP RSS proxy for production feed fetching

## Development

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

Run the built-in smoke test:

```bash
npm run smoke
```

Preview the production build locally:

```bash
npm run preview
```

## Deployment

Push to `main` to trigger the GitHub Actions deployment workflow. The workflow runs the smoke test, builds the site, and deploys `dist/` to the live server over FTP.

A scheduled GitHub Actions health workflow also runs daily checks for:
- smoke test + live homepage check
- production proxy/feed check

For maintainer operations guidance, including recommended cron/health-check cadence, see [brief.txt](/Users/briancsmith/Documents/GitHub/yardreport/brief.txt).

## Notes

- This repository is maintained as a personal project with an Orioles-first editorial bias.
- Maintainer-specific workflow notes, source inventories, and implementation details live in [brief.txt](/Users/briancsmith/Documents/GitHub/yardreport/brief.txt).
