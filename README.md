# LinkdSight Local-First

Import your LinkedIn data export and explore your professional network entirely in the browser. No accounts, no uploads, no trackers.

## Quick Start

```bash
npm install
npm run dev       # Development server at http://localhost:5173
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm test          # Run tests
```

## Deployment

Deploy the `dist/` directory to any static host:

- **Netlify**: Drag `dist/` to the dashboard, or connect the repo and set publish directory to `dist`
- **Vercel**: Connect the repo; it auto-detects Vite
- **GitHub Pages**: Use `vite build --base=/repo-name/` and deploy `dist/`

No server-side processing, no environment variables, no database.

## Supported Export Files

The following CSV files from a LinkedIn data export are recognized:

| File | Required? | Used for |
|------|-----------|----------|
| `Connections.csv` | Core | Network graph, domains, companies, growth |
| `messages.csv` | Core | Relationships, scoring, conversation topics |
| `Shares.csv` | Optional | Content ledger, identity shifts |
| `Comments.csv` | Optional | Engagement posture |
| `Reactions.csv` | Optional | Engagement posture |
| `Invitations.csv` | Optional | Totals |
| `Positions.csv` | Optional | Identity, career timeline |
| `Skills.csv` | Optional | Authority signals |
| `Certifications.csv` | Optional | Authority signals |
| `Endorsement_Received_Info.csv` | Optional | Authority signals |
| `Learning.csv` | Optional | Authority signals |
| `Profile.csv` | Optional | Profile display |

The app reports which files were found, missing, or could not be parsed.

## Views

- **Overview**: Network metrics, growth chart, domain concentration, stale relationships
- **Network Map**: Organizational and domain clusters with interactive drill-down
- **Relationships**: Prioritized relationship ledger with reciprocity, recency, and scoring
- **Intelligence (Lab)**: Conversation topic graph, next-best-conversation recommendations, authority signal gap analysis
- **Content Ledger**: Publishing and engagement breakdown
- **Identity Shift**: Role progression and publishing theme evolution
- **Opportunity Paths**: Job-search decision system with archetype analysis, bridge routes, advocate readiness, and action queue
- **Snapshots**: Placeholder for longitudinal comparison (import multiple exports to enable)

## Privacy Model

1. **Everything stays in the browser.** The ZIP is parsed locally; no data is uploaded to any server.
2. **Raw archive in memory only.** CSV contents are not persisted to disk.
3. **Derived data to IndexedDB** only after explicit opt-in (Save to browser button).
4. **No analytics, trackers, remote fonts, or CDN calls.** All dependencies are bundled.
5. **Delete local data** anytime via Settings → Delete all local data.

## Local Insights Advisor

The default advisor is deterministic and works offline. Each recommendation identifies:

- The data used (e.g., `relationships.staleScore`, `domains`)
- The confidence level: `observed`, `derived`, or `inferred`

No external API calls are made.

## AI Advisor (Optional)

Disabled by default. To enable:

1. Open Settings (gear icon in top bar)
2. Check "Enabled" under AI Advisor
3. Enter an OpenAI-compatible endpoint URL, model, and optional API key
4. Use the **Ollama localhost** preset for local models (`http://localhost:11434/v1/chat/completions`)
5. Test the connection before saving

**Privacy considerations:**

- Secrets (API key) are stored in `sessionStorage` only – cleared when the tab closes
- An explicit **Clear secrets** button is available
- Before each request, a **minimized context packet** is built from derived aggregates only
- The context packet excludes raw ZIP content, raw message bodies, contact names, email addresses, and profile URLs; organization and topic labels may still appear
- You must review the exact JSON payload before each request and explicitly choose **Send to AI**
- Direct browser calls require the endpoint to support CORS
- Data sent to a non-local endpoint leaves your device

## Sample Data

Click **Try sample data** on the import screen to explore all views with a fully synthetic dataset. No real LinkedIn data is used.

## Architecture

- **Vite** + vanilla JavaScript (no framework)
- **JSZip** (bundled) for ZIP parsing
- **PapaParse** (bundled) for CSV parsing
- **IndexedDB** for optional persistence
- **sessionStorage** for AI secrets

### Key Modules

| Module | Purpose |
|--------|---------|
| `src/utils.js` | Shared helpers, date parsing, domain/seniority classification |
| `src/transform.js` | Core transformation engine (ported from generate-data.ps1) |
| `src/import.js` | ZIP parsing, CSV extraction, validation |
| `src/context-packet.js` | Privacy-sensitive context packet for AI advisor |
| `src/advisor.js` | Local insights + AI advisor integration |
| `src/storage.js` | IndexedDB persistence |
| `src/sample-data.js` | Synthetic sample dataset generator |
| `src/main.js` | Application shell and all view rendering |

## Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

Tests cover:

- `tests/transform.test.js` – CSV normalization (name, seniority, domain), topic matching, full transformation pipeline, partial data handling
- `tests/context-packet.test.js` – Packet construction, token budget enforcement, privacy audit (detecting raw data leaks)

## Known Limitations

1. **No connection-to-connection edges.** The export does not contain who-knows-whom edges. Bridge routes are inferred from organization and domain proximity.
2. **No inbound engagement data.** The export records your reactions/ comments but not who reacted to your posts. Inbound post analytics require a separate creator export.
3. **Message encoding variability.** Some LinkedIn exports use unusual CSV encodings. PapaParse handles most cases but edge cases may require re-export.
4. **No LinkedIn Premium metrics.** Search appearances, profile views, and other Premium-only data are not present in exports.
5. **Snapshot comparison** is a placeholder and requires multiple exports to be useful.
6. **No SSO or accounts.** This is by design – the app is fully local-first.

## License

[MIT](LICENSE)
