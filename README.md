# Thai Vocab Trainer (PWA)

A lightweight, mobile-friendly flashcard + quiz app that auto-loads your Thai ↔ English vocabulary from a published Google Sheet. Built as a static Progressive Web App (PWA) — perfect for GitHub Pages hosting and offline use on your phone.

## Quick Start
- Serve locally: `python -m http.server 8000` → open `http://localhost:8000/`.
- GitHub Pages: push to a repo with these files at root, then enable Pages (Settings → Pages → Deploy from branch → `main` → `/`).
- Configure your sheet:
  - Recommended: File → Share → Publish to the web → CSV. Copy the published link.
  - In the app, open Settings and paste your URL, or pass it via URL: `/?sheet=<published-csv-url>`.

## How It Works
- `js/agent.js` converts your Google “pubhtml” link to CSV and fetches it through a CORS proxy (needed on GitHub Pages).
- `js/csv.js` parses CSV. The agent infers headers like `thai`, `english`, and optional `romanization`.
- If no romanization column exists, a built-in `romanizeThai()` (approximate RTGS) generates a fallback.
- SRS progress is saved in `localStorage` (`thai-srs`).

## Known Limits
- Romanization is heuristic (vowel placement in Thai is complex); prefer supplying a `romanization` column for accuracy.
- Public sheets work out-of-the-box. Private sheets need a proxy (Apps Script / Cloudflare Worker / Vercel function).

## UI Improvements (Research + Plan)
- Mobile ergonomics: larger tap targets, swipe gestures (left/right to mark hard/easy), and haptic feedback on supported devices.
- Card design: higher contrast font for Thai, dynamic font sizing, and centered vertical rhythm; show tone marks clearly.
- Study modes: “Learn” (new words only), “Review” (due only), and “Drill” (timed multiple-choice with streaks).
- Dark mode: auto-detect `prefers-color-scheme` with a manual toggle.
- Audio: integrate Web Speech API for TTS fallback; later, add server-generated audio and cache in IndexedDB.
- Analytics: simple progress charts (daily reviews, accuracy) with local, privacy-friendly storage.
- Offline deck caching: store the last successful deck fetch in `localStorage` and use it when offline; add a manual “Sync now”.

## Contributing
- Code lives in `js/` modules; keep functions small, use 2-space indents.
- Test in Chrome/Edge/Firefox + mobile. Reset progress with `localStorage.removeItem('thai-srs')`.
- PRs: include a short description, screenshots/GIFs for UI changes, and clear test steps.

