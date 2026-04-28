# 🗳 Voting God

Omniscient on all matters of the ballot.

A local tool for researching candidates and making informed ballot decisions. Drop in a sample ballot, run one command, browse every candidate and position with full sourced dossiers, compare head-to-head, pick your candidates, and export a clean PDF.

## Quick start

**Requirements:** Node.js 18+, Python 3 (optional, for alt server), an LLM with web access (Claude, Gemini, GPT, etc.)

```bash
npm install
npx playwright install chromium
```

### 1. Add your ballot

```
mkdir -p ballots/2026-mystate-primary
# Copy your sample ballot PDF or paste text into:
# ballots/2026-mystate-primary/sample.pdf  (or .txt)
```

### 2. Research (with Claude Code)

```
/research-ballot 2026-mystate-primary
```

**Without Claude Code** (Gemini, ChatGPT, etc.):
1. Open `prompts/01-parse-ballot.md`, paste into your LLM with the ballot → save output to `data/2026-mystate-primary/races.json`
2. For each race, open `prompts/02-research-position.md` → save to `data/2026-mystate-primary/positions/<race-id>.json`
3. For each candidate, open `prompts/03-research-candidate.md` → save to `data/2026-mystate-primary/candidates/<id>.json`
4. Update `data/index.json` to add the new election entry.

### 3. Open the app

```bash
node viewer.mjs
# → open http://localhost:8000/app/
```

Or: `python -m http.server 8000` then open `http://localhost:8000/app/`

### 4. Ask follow-up questions (Claude Code)

```
/explain What is Alice Johnson's position on housing?
```

## Development

```bash
npm run test:schema   # validate data JSON
npm run test:e2e      # E2E browser tests
```

## Election slug convention

Use `YYYY-jurisdiction-type`, e.g. `2026-tn-primary`, `2026-knox-county-general`.
