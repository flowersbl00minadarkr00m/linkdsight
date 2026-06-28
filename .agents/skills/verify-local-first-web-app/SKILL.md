---
name: verify-local-first-web-app
description: Verify a local-first browser application before release or deployment. Use for release checks, privacy audits, deployment readiness, local-data handling changes, optional AI integrations, ZIP/CSV import changes, or claims that user data remains local.
---

# Verify Local-First Web App

Run deterministic checks first:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/verify-local-first-web-app/scripts/verify.ps1
```

Stop the release if any deterministic check fails. Fix the cause and rerun the complete script.

Then verify the application in a real browser:

1. Open a fresh session and confirm the import workspace appears without an open modal or console error.
2. Load synthetic sample data and confirm meaningful values render in every supported view.
3. Confirm Local Insights is the default and returns a deterministic response that identifies its supporting data.
4. Configure the optional AI Advisor without entering a real secret. Confirm secrets use session storage only.
5. Ask an AI-routed question and confirm the exact minimized JSON packet appears before transmission.
6. Choose the local fallback and confirm no external request is required.
7. Inspect desktop and mobile layouts for clipping, overlap, blank charts, and unusable controls.
8. Recheck browser console errors after all interactions.

For privacy-sensitive releases, also confirm:

- Raw imports remain in memory unless the user explicitly opts into derived-data storage.
- Reset deletes locally persisted derived data.
- No personal sample data, provider credentials, analytics, trackers, remote fonts, or runtime CDN dependencies ship.
- Product copy distinguishes observed, derived, inferred, and unavailable metrics.
- AI disclosures name what leaves the device and require an explicit send action.

Report:

- deterministic test/build/scan results;
- browser flows exercised;
- privacy boundary verified;
- unresolved limitations or skipped checks;
- release decision: `PASS` or `FAIL`.

Never call a release verified solely because an implementation agent reported success.
