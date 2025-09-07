# Repository Guidelines

## Project Structure & Module Organization
- Single‑page PWA in `index.html` with JS modules under `js/`.
- `js/agent.js` fetches and normalizes Google Sheets CSV to a deck.
- `js/app.js` handles UI, SRS logic, quiz/flashcards; `js/csv.js` parses CSV.
- `manifest.webmanifest` and `service-worker.js` enable install/offline.

## Build, Test, and Development Commands
- Serve locally for PWA scope: `python -m http.server 8000` and open `http://localhost:8000/`.
- Alternative Node server: `npx serve .`.
- Clear app state: DevTools → Console `localStorage.removeItem('thai-srs')`.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; lines ~100–120 chars.
- JavaScript: lowerCamelCase; constants UPPER_SNAKE_CASE.
- HTML ids/classes: kebab-case. Prefer Tailwind utilities over custom CSS.
- Keep functions focused; DOM lookups at top of modules.

## Testing Guidelines
- Browser (Chrome/Edge/Firefox + mobile):
  - Auto-sync loads deck from published CSV URL.
  - Flashcards flip and persist SRS; Quiz updates stats.
  - Romanization toggle and Reset work.
- Encoding: save UTF‑8 to preserve Thai text.

## Commit & Pull Request Guidelines
- Commits: imperative, scoped (e.g., "Add quiz view", "Fix SRS scheduling").
- PRs: summary, local test steps, screenshots/GIFs for UI, linked issue.
- Keep diffs minimal; call out user‑visible or storage changes.

## Security & Configuration Tips
- Do not commit secrets. Use published, public CSV links.
- Limit third‑party scripts to trusted CDNs (Tailwind already included).

## Agent‑Specific Instructions
- Entry is `index.html`. New assets: lowercase, hyphenated (e.g., `assets/example-image.png`).
- Configure sheet via URL param `?sheet=<published-csv-url>` or save in Settings.
