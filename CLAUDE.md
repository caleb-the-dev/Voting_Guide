# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `node viewer.mjs` — start local server at http://localhost:8000
- `npm run test:schema` — validate all JSON data files under `data/` and `tests/fixtures/` against schema
- `npm run test:e2e` — run Playwright E2E tests (starts viewer.mjs automatically)
- `npm test` — both of the above
- `/research-ballot <slug>` — run full research pipeline for an election
- `/explain <question>` — ask Voting God a question about a researched candidate or position

## Architecture

Three decoupled layers:

1. **Research pipeline** (`prompts/`, `.claude/commands/research-ballot.md`) — model-portable markdown prompts that any LLM runs to produce JSON from a sample ballot. Output goes to `data/<slug>/`.
2. **Data layer** (`data/`) — plain JSON files. Schema defined in `docs/superpowers/specs/`. `data/index.json` is the election manifest. Never hand-edit candidate files; re-run the pipeline instead.
3. **Viewer app** (`app/`) — vanilla ES modules, no build step, hash-based routing. `app/js/data.js` handles fetch + cache. `app/js/state.js` handles picks/notes in localStorage. Each view is its own module (`home.js`, `race.js`, `candidate.js`, `compare.js`, `picks.js`).

## Key invariants

- `data.js` is the only module that calls `fetch()`. View modules only call `data.js` functions.
- `state.js` is the only module that reads/writes `localStorage`.
- Every factual claim in candidate JSON has a `source` URL; never display a claim without its source.
- The app never tells the user what to think — no scoring, no recommendations, no characterizations.
