Research all candidates for the election slug provided: $ARGUMENTS

Parse the argument. If it contains `--refresh-all`, set REFRESH_ALL=true. If it contains `--refresh <id>`, note the ID to refresh. The election slug is the first non-flag token.

## Your task

You are running Voting God's research pipeline for the election: **$ARGUMENTS**

### Step 1 — Locate ballot

Look in `ballots/<slug>/` for a file named `sample.pdf`, `sample.txt`, `sample.png`, or `sample.jpg`. If not found, stop and tell the user: "No ballot file found at ballots/<slug>/sample.*. Please add one."

### Step 2 — Parse ballot (Stage 1)

Read `prompts/01-parse-ballot.md`. Apply it to the ballot file. Write the output JSON to `data/<slug>/races.json`.

If `data/<slug>/races.json` already exists and REFRESH_ALL is not set, skip this step and say "[Stage 1] Skipped — races.json already exists."

Update `data/index.json`: if an entry for this slug does not already exist, add `{ "slug": "<slug>", "label": "<jurisdiction> · <election_date>", "date": "<election_date>" }` to the `elections` array.

### Step 3 — Research positions (Stage 2)

For each race in `data/<slug>/races.json`:
- Check if `data/<slug>/positions/<race-id>.json` already exists. If it does and REFRESH_ALL is not set, print `[Stage 2] Skipping <race-id> — already researched.` and continue.
- Otherwise, read `prompts/02-research-position.md`. Apply it to this race. Write output to `data/<slug>/positions/<race-id>.json`.
- Print `[Stage 2] ✓ Researched position: <race title>`

### Step 4 — Research candidates (Stage 3)

For each candidate in each race:
- Check if `data/<slug>/candidates/<candidate-id>.json` exists. If it does and REFRESH_ALL is not set and the candidate id is not the --refresh target, print `[Stage 3] Skipping <name> — already researched.` and continue.
- Otherwise, read `prompts/03-research-candidate.md`. Apply it to this candidate. Write output to `data/<slug>/candidates/<candidate-id>.json`.
- Print `[Stage 3] [N/TOTAL] ✓ Researched: <name>`

### Step 5 — Validate

Run `npm run test:schema` to validate all produced JSON files.

### Step 6 — Done

Tell the user: "Research complete for <slug>. Open the app at http://localhost:8000/app/ (run `node viewer.mjs` first)."
