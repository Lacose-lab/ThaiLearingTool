# YT-Research — Thai Learning Tool

A personal Thai vocabulary SPA with spaced repetition and an AI tutor, built from a Google Sheets vocab list.

**Live app:** https://lacose-lab.github.io/ThaiLearingTool/

---

## Features

| Tab | What it does |
|-----|-------------|
| **Home** | Daily streak, due-review count, quick navigation |
| **Flashcards** | SM-2 spaced repetition — tap to reveal, rate Again / Hard / Good |
| **Quiz** | 20-word multiple-choice, alternates Thai→English and English→Thai |
| **Typing** | Type the Thai script from memory; fuzzy matching gives partial credit |
| **Kru Noi** | Full chat with an AI Thai tutor powered by Claude Haiku |
| **Settings** | Save your Anthropic API key, export progress CSV, clear progress |

---

## Stack

- **Vanilla JS ES modules** — no build step, no framework
- **SM-2 spaced repetition** — same algorithm as Anki
- **Claude Haiku** (`claude-haiku-4-5-20251001`) — AI tutor and typing feedback
- **localStorage** — all progress and API key stored locally in the browser
- **GitHub Pages** — deployed via GitHub Actions on every push to `main`

---

## Vocabulary Data

The vocab comes from a personal Google Sheet with these sections:

- **Wordrecap** — ~536 words across 14 categories (verbs, nouns, adjectives, question words, numbers, days, months, body parts, food, drinks, colours, places, transport, general)
- **Sentence** — 59 sentence patterns
- **RECALL** — 92 real-world recall entries with keywords and translations

The sheet is processed by `src/data/build_vocab.py` into `src/data/vocab.json`.

---

## Setup

### 1. Get an Anthropic API key

Sign up at [console.anthropic.com](https://console.anthropic.com), create an API key, and paste it into the **Settings** tab of the app. The key is stored only in your browser's localStorage and sent only to `api.anthropic.com`.

### 2. Open the app

Visit **https://lacose-lab.github.io/ThaiLearingTool/** — no installation required.

### 3. Run locally (optional)

```bash
# Any static file server works
npx serve .
# or
python -m http.server 8080
```

Then open `http://localhost:8080`.

---

## Updating Vocab

If you update the Google Sheet, re-run the build script:

```bash
cd src/data
python build_vocab.py
```

Then commit and push — the deploy workflow publishes automatically.

---

## How Spaced Repetition Works

Cards follow the SM-2 algorithm:

| Rating | Quality | Effect |
|--------|---------|--------|
| Again | 0 | Reset — card comes back tomorrow |
| Hard | 1 | Small interval, ease factor drops |
| Good | 3 | Interval multiplies by ease factor |

New cards start at a 1-day interval. Ease factor begins at 2.5 and adjusts based on your ratings.

---

## AI Tutor (Kru Noi / ครูน้อย)

Kru Noi knows your full vocabulary list. She:
- Explains words and grammar
- Creates example sentences using words you've studied
- Gives encouraging feedback when you miss a typing drill
- Practices conversation in Thai

She always uses the male speech register (ครับ, ผม) appropriate for the student.

---

## Project Structure

```
thai_learning_app/
├── index.html              # App shell + bottom nav
├── src/
│   ├── css/styles.css      # Dark theme, design tokens
│   ├── data/
│   │   ├── vocab.json      # Generated vocabulary data
│   │   └── build_vocab.py  # Sheet → vocab.json processor
│   └── js/
│       ├── app.js          # Tab router
│       ├── storage.js      # localStorage wrapper
│       ├── srs.js          # SM-2 algorithm
│       ├── home.js         # Home tab
│       ├── flashcards.js   # Flashcard tab
│       ├── quiz.js         # Quiz tab
│       ├── typing.js       # Typing practice tab
│       ├── tutor.js        # AI tutor chat tab
│       └── settings.js     # Settings tab
└── .github/workflows/
    └── deploy.yml          # GitHub Pages auto-deploy
```

---

## License

Personal project — not intended for redistribution.
