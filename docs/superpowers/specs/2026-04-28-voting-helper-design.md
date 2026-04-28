# Voting God — Design

A local, single-user tool for researching and comparing candidates on an upcoming ballot. The user provides a sample ballot; an LLM-driven research pipeline produces structured per-candidate and per-position dossiers; a static web app renders them with drill-down, head-to-head comparison, picks tracking, and PDF export.

## Goals

- Compress the user's research burden across many races and many candidates into a single browsable artifact.
- Be **factual and thorough** — every claim cites a source URL.
- Be **unbiased and fair** — equal coverage per candidate, neutral language, both-sides news rule.
- Surface **what the office actually does** before showing candidates, so the user understands the role before evaluating people.
- Refresh per election cycle without throwing away prior cycles' records.
- Be **model-portable** — the research pipeline must run on Claude, Gemini, GPT, or any other capable LLM with web access.

## Non-goals

- No scoring, ranking, ratings, or recommendations from the system. The system tells the user what *is*, never what to think.
- No "values alignment" or partisan-labeling fields beyond the candidate's own party affiliation.
- No multi-user / shared-state features. Single-user, local-only.
- No live data fetching at view-time; research is a discrete pre-step.
- No backend, no database, no API keys.

## Architecture

Three loosely-coupled layers:

1. **Input layer** — `ballots/<election-slug>/sample.{pdf,txt,png,jpg}` is what the user drops in.
2. **Research pipeline** — plain markdown prompt files in `prompts/` that any capable LLM can run, producing structured JSON files in `data/<election-slug>/`.
3. **Viewer app** — static HTML/CSS/JS in `app/` that reads the JSON files. No server, no backend, no API keys.

### Folder layout

```
Voting_God/
├── ballots/<election-slug>/sample.{pdf,txt,png,jpg}
├── data/<election-slug>/
│   ├── races.json
│   ├── positions/<race-id>.json
│   └── candidates/<candidate-id>.json
├── prompts/
│   ├── 01-parse-ballot.md
│   ├── 02-research-position.md
│   └── 03-research-candidate.md
├── app/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .claude/commands/
│   ├── research-ballot.md
│   └── explain.md
├── docs/superpowers/specs/
└── README.md
```

## Data schemas

### `data/<slug>/races.json`

A single file per election listing every race and every candidate.

```json
{
  "election_slug": "2026-tn-primary",
  "election_date": "2026-08-04",
  "jurisdiction": "Tennessee",
  "races": [
    {
      "id": "us-house-tn-05",
      "title": "U.S. Representative, Tennessee 5th Congressional District",
      "primary_party": "Republican",
      "candidates": [
        { "id": "jane-doe-us-house-tn-05", "name": "Jane Doe", "party": "Republican", "incumbent": false }
      ]
    }
  ],
  "_warnings": []
}
```

### `data/<slug>/positions/<race-id>.json`

```json
{
  "id": "us-house-tn-05",
  "title": "U.S. Representative, Tennessee 5th Congressional District",
  "jurisdiction": "Federal",
  "term_length": "2 years",
  "salary": "$174,000/year",
  "responsibilities": "<plain-language paragraph>",
  "why_it_matters": "<plain-language paragraph>",
  "key_powers": ["..."],
  "this_cycle_context": "<neutral framing of what's at stake this cycle>",
  "sources": ["https://..."],
  "last_researched": "2026-04-28"
}
```

### `data/<slug>/candidates/<candidate-id>.json`

```json
{
  "id": "jane-doe-us-house-tn-05",
  "name": "Jane Doe",
  "race_id": "us-house-tn-05",
  "party": "Republican",
  "incumbent": false,
  "summary": "<2-3 sentence neutral overview>",
  "background": {
    "current_role": "...",
    "career": ["..."],
    "education": ["..."],
    "prior_offices": ["..."]
  },
  "track_record": [
    { "claim": "Sponsored HB-123 in 2024 expanding rural broadband.", "source": "https://..." }
  ],
  "stated_positions": [
    { "issue": "Healthcare", "position": "<their words where possible>", "source": "https://..." }
  ],
  "endorsements": [
    { "endorser": "Tennessee Education Association", "source": "https://..." }
  ],
  "campaign_finance": {
    "total_raised": "...",
    "top_donors_or_sectors": ["..."],
    "source": "https://..."
  },
  "notable_news": [
    { "headline": "...", "date": "2025-09-12", "summary": "...", "source": "https://..." }
  ],
  "official_links": { "website": "...", "social": ["..."] },
  "sources": ["..."],
  "_failed_sources": [],
  "last_researched": "2026-04-28"
}
```

### Schema rules (enforced by the research prompts)

- **Every factual claim has its own `source` URL.** Not just a sources list at the bottom.
- **No field is omitted.** If no information is found for a field, the value is the literal string `"No public information found"`. Empty arrays use `[]`. This makes information gaps visible per candidate so the viewer can flag them.
- **`stated_positions`** quotes the candidate where possible (their words, their phrasing).
- **No characterization fields.** No "is_extreme", no scoring, no "values alignment".

## Research pipeline

Each stage is a single self-contained markdown prompt. Stages are decoupled — any can be re-run independently. Output of each stage is what's checked against the schema, not the model that produced it.

### Stage 1: `prompts/01-parse-ballot.md`

- **Input:** the sample ballot file from `ballots/<slug>/`.
- **Output:** `data/<slug>/races.json`.
- **Behavior:** OCR/read the ballot, enumerate every race and every candidate. No web research at this stage.
- **Failure handling:** if parsing is incomplete, populate what was extracted and append `_warnings` describing what couldn't be parsed. The user can hand-edit `races.json` before stage 2.

### Stage 2: `prompts/02-research-position.md`

- **Input:** one race entry from `races.json`.
- **Output:** `data/<slug>/positions/<race-id>.json` matching the position schema.
- **Behavior:** explain what this office does, in plain language, with sources. Run once per race.

### Stage 3: `prompts/03-research-candidate.md`

The load-bearing prompt for fairness. Run once per candidate. Explicit constraints:

- **Source priority order:** official campaign sites → Ballotpedia → Vote Smart → FEC filings → AP/Reuters/local newspaper of record → candidate's own social media (with attribution). Partisan blogs only as last resort and clearly labeled in the source list.
- **Equal-coverage rule:** every schema field must be filled. `"No public information found"` is the literal value for genuine absences.
- **Neutral language directive:** stated positions are reported in the candidate's own words wherever possible. Characterizations like "controversial," "extreme," "moderate," or "radical" are forbidden unless they appear inside a sourced quote.
- **Both-sides news rule (strict):** if a candidate has notable positive coverage AND notable critical coverage from credible sources, both must be represented in `notable_news`. The prompt actively prompts for both.
- **Citation discipline:** every `track_record` claim, every `stated_position`, every `endorsement` carries a URL. Unsupported claims are dropped, not retained.
- **Source failure tracking:** unreachable/paywalled sources go into `_failed_sources` so the user can see what couldn't be verified.

### `/research-ballot` slash command

`.claude/commands/research-ballot.md` chains the three stages.

```
/research-ballot <election-slug>
```

- Reads `ballots/<slug>/sample.*`, writes to `data/<slug>/`.
- **Resumable:** re-running skips any race or candidate whose JSON already exists.
- **Refresh flags:** `--refresh <candidate-id>` re-researches one entity; `--refresh-all` rebuilds from scratch.
- Prints progress (`[3/27] Researching Jane Doe…`) as it goes.

### Model portability

All prompts are self-contained markdown — no Claude-Code-specific tooling baked in. The README documents how to run each stage with Gemini, GPT, or any other LLM with web access:

> "Open `prompts/01-parse-ballot.md`, paste it into your model with the ballot file, save the output to `data/<slug>/races.json`. Then for each race in that file, run `prompts/02-research-position.md` and save to `positions/<race-id>.json`. Then for each candidate, run `prompts/03-research-candidate.md` and save to `candidates/<id>.json`."

## Viewer app

Single-page static HTML/CSS/JS. No build step, no framework. Hash-based routing inside `app/index.html`.

### Five views

1. **Home / election picker.** If `data/` has multiple election folders, the user picks one. With one folder, auto-load it. Shows every race as a row with a status pill (*not started* / *reviewing* / *decided*) and a progress header (`4 of 13 races decided`).
2. **Race page.** Top of the page is the position info (`responsibilities`, `why_it_matters`, `key_powers`, `this_cycle_context`) — *always shown before candidates*. Below that is a grid of candidate cards. Each card has "View profile" and a checkbox-style "Add to compare."
3. **Candidate detail.** Full dossier in this section order: Summary → Background → Track Record → Stated Positions → Endorsements → Campaign Finance → Notable News → Official Links → Sources. Every claim has a clickable source link. Two top-level buttons: **Pick this candidate** (radio-style — picking a different one swaps it) and **Back to race**.
4. **Compare view.** Head-to-head, exactly two candidates on screen. Each side has `◀ ▶` switchers and a 📌 pin. Pinning one side locks that candidate; the other side cycles through the rest of the race. Same field order, same labels, same row alignment as candidate detail. Race title and progress (`Candidate 3 of 7`) shown at top.
5. **Picks summary / export.** Lists every race with the user's pick and an optional per-race notes field. **Print to PDF** button uses a dedicated print stylesheet to render a clean one-page-per-race summary suitable for taking into the voting booth.

### Mobile

Mobile is a first-class target, not a fallback.

- **All views use responsive layout** (CSS Grid, flexbox, media queries at ~640px and ~960px breakpoints).
- **Race list, candidate detail, picks summary** are already linear — they reflow naturally.
- **Compare view on mobile** transforms from two-column side-by-side into a **swipeable single-card view**. Swipe left/right = `◀ ▶`. The pinned candidate is accessible via a "show pinned" toggle that splits the screen vertically (top: pinned, bottom: cycling). This is intentionally a different shape than desktop because cramped two-column on a phone is unreadable.
- Touch targets ≥44px. All interactive elements work without hover.

### Picks persistence

Picks and notes live in `localStorage`, keyed by election slug so they don't bleed across cycles. Two buttons in the picks summary:

- **Export picks** — downloads a JSON file the user can save anywhere.
- **Import picks** — re-loads from a JSON file.

This covers backup, multi-device, and "I cleared my cache." `data/<slug>/picks.json` is gitignored by default — users opt in to committing their own picks.

### Serving the app

`fetch()` against `file://` URLs is blocked by browsers. The README documents two zero-dependency options:

- **Recommended:** `python -m http.server 8000` from the project root, then open `http://localhost:8000/app/`.
- **Alternative:** a tiny ~20-line `viewer.mjs` Node script that serves the project root.

## Conversational follow-up

The "ask Claude to understand better" mode is the user opening Claude Code (or any other CLI agent) in the project root while the app is open in their browser. The agent has `data/<slug>/`, the prompts, and the README in context.

Two affordances make this smooth:

- `.claude/commands/explain.md` — a slash command `/explain <candidate-or-race>` that loads the relevant JSON files and answers questions, with a strict instruction to **only use information present in those files**, and to say "not researched" otherwise. This preserves the citation discipline of the research layer in the chat layer.
- README snippet for non-Claude users: "Paste the contents of `data/<slug>/candidates/<id>.json` into your model and ask your question. Tell the model to only answer from that file."

## Multi-election / refresh handling

Each election lives in its own `data/<slug>/` and `ballots/<slug>/` folder. The viewer's home shows a picker if multiple exist; auto-loads the only one if just one exists. Old elections persist as a record — the user can revisit prior picks.

To start fresh next cycle: create a new folder, drop the new ballot in, run `/research-ballot <new-slug>`. Nothing has to be deleted.

## Failure modes

Three predictable cases handled up front:

- **Candidate with little public info.** Every required field is present, with `"No public information found"` for genuine absences. Viewer shows these in muted text. Race page badges any candidate where more than half of the top-level schema fields are missing or set to `"No public information found"` as `Limited info available`, so the user knows research quality is uneven.
- **Ballot parse fails.** Stage 1 produces a partial `races.json` with a `_warnings` array. User can hand-edit `races.json` before running stage 2.
- **Source unreachable / paywalled.** Claims that depended on it are dropped, not retained without source. The candidate's `_failed_sources` array lists what couldn't be verified.

## Bias and fairness controls (cross-cutting summary)

Fairness is enforced structurally, not by good intentions:

- **Schema enforces equal coverage** — every candidate gets every field, no omissions.
- **Source priority order** — credible primary sources first, partisan blogs last and labeled.
- **Neutral language is a prompt directive** with explicit forbidden words.
- **Citations are mandatory** for every claim — unsupported claims are dropped.
- **Both-sides news is a strict rule** — the prompt actively prompts for both positive and critical coverage when both exist.
- **No scoring, ranking, or alignment fields** — the system never tells the user what to think.
- **The chat layer (`/explain`) is constrained** to the same data files — it cannot invent facts.

## Out of scope

- Live data fetching from APIs (Ballotpedia API, etc.). Future work.
- Multi-user / shared picks.
- Cloud sync.
- A real backend. The project deliberately avoids one.
- Fancy visualizations (charts, graphs). The data is text and links by design.

## Open questions

- **OCR quality on scanned ballots.** If stage 1 struggles with low-quality images, we may need a preprocessing helper. Decide after first real run.
- **Election-slug naming convention.** Suggest `YYYY-jurisdiction-type` (e.g., `2026-tn-primary`). Locked in at first use.
