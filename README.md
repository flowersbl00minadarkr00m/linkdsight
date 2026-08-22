# LinkdSight

Import your LinkedIn data export and explore your professional network entirely in the browser. No accounts, no uploads, no trackers.

[**Live demo**](https://linkdsight.vercel.app) — click *Try sample data* to explore without an export

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Series context

LinkdSight is the proof object for [*The Link Between What You Build and What You Know*](https://henryflowers45.substack.com/p/the-link-between-what-you-build-and) ([LinkedIn post](https://www.linkedin.com/posts/henry-flowers_deepseek-pi-codex-activity-7477367632715833344-2kT6)), part of the *Looping in the Human* series.

![LinkdSight overview](docs/assets/hero.png)

## Features

- Network map with organizational and domain clusters, drill-down included
- Relationship ledger scored by reciprocity, recency, and staleness
- Content ledger, identity-shift timeline, and authority-signal gap analysis
- Opportunity paths: a job-search decision system with bridge routes and an action queue
- Deterministic offline advisor by default; every recommendation names its data and confidence

## Quick start

```bash
npm ci
npm run dev      # http://localhost:5173
npm test
```

Drop your LinkedIn export ZIP on the import screen. `Connections.csv` and `messages.csv` drive the core views; ten more optional files (shares, positions, skills, …) enrich them — the app reports exactly which files it found, missed, or couldn't parse.

## Privacy

- The ZIP is parsed locally and kept in memory; derived data reaches IndexedDB only after explicit opt-in, and can be deleted anytime from Settings.
- Imports are capped at a 50 MB ZIP, 200 entries, 25 MB per expanded CSV, and 500,000 total rows so malformed archives cannot exhaust the page unchecked.
- No analytics, trackers, remote fonts, or CDN calls — all dependencies are bundled.
- The optional AI advisor is off by default, keeps your key only in JavaScript memory, and clears it on reload. It shows the exact minimized payload—no raw messages, names, or emails—before every send.

## License

[MIT](LICENSE)
