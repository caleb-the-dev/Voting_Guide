# Voting God Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local static web app that renders LLM-researched candidate dossiers from structured JSON files, with head-to-head comparison, picks tracking, and PDF export.

**Architecture:** Three layers — (1) sample ballot input files, (2) LLM research pipeline producing JSON dossiers via model-portable markdown prompts, (3) vanilla HTML/CSS/JS viewer that reads those files with no build step or backend. Playwright E2E tests drive UI development; Node `node:test` validates JSON schemas.

**Tech Stack:** Vanilla ES modules (no framework, no bundler), CSS custom properties + scroll snap, Playwright for E2E, Node `node:test` + `node:assert` for schema validation, Node HTTP server (`viewer.mjs`) for local serving.

---

## File Structure

```
Voting_God/
├── ballots/<slug>/sample.{pdf,txt,png,jpg}    ← user drops ballot here
├── data/
│   ├── index.json                              ← election manifest (written by pipeline)
│   └── <slug>/
│       ├── races.json
│       ├── positions/<race-id>.json
│       └── candidates/<candidate-id>.json
├── prompts/
│   ├── 01-parse-ballot.md
│   ├── 02-research-position.md
│   └── 03-research-candidate.md
├── app/
│   ├── index.html
│   ├── styles.css
│   └── js/
│       ├── app.js        ← router (dynamic imports, no circular deps)
│       ├── data.js       ← fetch + in-memory cache
│       ├── state.js      ← picks/notes via localStorage, scoped per slug
│       ├── home.js       ← election picker + race list view
│       ├── race.js       ← race page (position info + candidate cards)
│       ├── candidate.js  ← full candidate dossier view
│       ├── compare.js    ← 1v1 compare with pin
│       └── picks.js      ← picks summary + PDF export
├── tests/
│   ├── fixtures/
│   │   └── test-2026/
│   │       ├── races.json
│   │       ├── positions/mayor-test.json
│   │       ├── positions/council-1-test.json
│   │       └── candidates/{alice,bob,carol,dave,eve}-*.json
│   ├── e2e/
│   │   ├── helpers.js    ← shared page.route() fixture setup
│   │   ├── home.spec.js
│   │   ├── race.spec.js
│   │   ├── candidate.spec.js
│   │   ├── compare.spec.js
│   │   └── picks.spec.js
│   └── schema/
│       └── validate.test.mjs
├── .claude/commands/
│   ├── research-ballot.md
│   └── explain.md
├── viewer.mjs
├── package.json
├── playwright.config.js
├── CLAUDE.md
└── README.md
```

**Interface contract:** `data.js` exports `loadElections()`, `loadRaces(slug)`, `loadPosition(slug, raceId)`, `loadCandidate(slug, candidateId)`. `state.js` exports `getPick`, `setPick`, `getNote`, `setNote`, `exportState`, `importState`. These are the only cross-module interfaces.

---

## Task 1: Project setup

**Files:**
- Create: `package.json`
- Create: `playwright.config.js`
- Create: `viewer.mjs`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "voting-god",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node viewer.mjs",
    "test": "npm run test:schema && npm run test:e2e",
    "test:schema": "node --test tests/schema/validate.test.mjs",
    "test:e2e": "npx playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.44.0"
  }
}
```

- [ ] **Step 2: Write `playwright.config.js`**

```javascript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'node viewer.mjs',
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: 'http://localhost:8000' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'mobile',  use: { viewport: { width: 375,  height: 812 } } },
  ],
});
```

- [ ] **Step 3: Write `viewer.mjs`**

```javascript
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = process.env.PORT || 8000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'text/javascript',
  '.json': 'application/json',
  '.pdf':  'application/pdf',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.txt':  'text/plain',
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const filePath = url.pathname === '/'
    ? join(ROOT, 'app', 'index.html')
    : join(ROOT, url.pathname.slice(1));
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'text/plain' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(PORT, () => console.log(`Voting God → http://localhost:${PORT}`));
```

- [ ] **Step 4: Install Playwright**

```bash
npm install
npx playwright install chromium
```

Expected: chromium browser downloaded, `node_modules/` created.

- [ ] **Step 5: Create required directories**

```bash
mkdir -p ballots data app/js tests/fixtures/test-2026/positions tests/fixtures/test-2026/candidates tests/e2e tests/schema prompts .claude/commands docs/superpowers/plans
```

- [ ] **Step 6: Commit**

```bash
git add package.json playwright.config.js viewer.mjs
git commit -m "feat: project setup — playwright, node server, package.json"
```

---

## Task 2: Fixture data

**Files:**
- Create: `tests/fixtures/test-2026/races.json`
- Create: `tests/fixtures/test-2026/positions/mayor-test.json`
- Create: `tests/fixtures/test-2026/positions/council-1-test.json`
- Create: `tests/fixtures/test-2026/candidates/alice-mayor-test.json`
- Create: `tests/fixtures/test-2026/candidates/bob-mayor-test.json`
- Create: `tests/fixtures/test-2026/candidates/carol-council-test.json`
- Create: `tests/fixtures/test-2026/candidates/dave-council-test.json`
- Create: `tests/fixtures/test-2026/candidates/eve-council-test.json`
- Create: `data/index.json`

These are used by E2E tests (via `page.route()`) and schema validation. They are minimal but schema-valid.

- [ ] **Step 1: Write `tests/fixtures/test-2026/races.json`**

```json
{
  "election_slug": "test-2026",
  "election_date": "2026-11-04",
  "jurisdiction": "Test County",
  "races": [
    {
      "id": "mayor-test",
      "title": "Mayor of Test City",
      "primary_party": null,
      "candidates": [
        { "id": "alice-mayor-test", "name": "Alice Johnson", "party": "Democratic", "incumbent": true },
        { "id": "bob-mayor-test",   "name": "Bob Smith",     "party": "Republican", "incumbent": false }
      ]
    },
    {
      "id": "council-1-test",
      "title": "City Council, District 1",
      "primary_party": null,
      "candidates": [
        { "id": "carol-council-test", "name": "Carol Davis",   "party": "Democratic",  "incumbent": false },
        { "id": "dave-council-test",  "name": "Dave Wilson",   "party": "Republican",  "incumbent": false },
        { "id": "eve-council-test",   "name": "Eve Martinez",  "party": "Independent", "incumbent": false }
      ]
    }
  ],
  "_warnings": []
}
```

- [ ] **Step 2: Write `tests/fixtures/test-2026/positions/mayor-test.json`**

```json
{
  "id": "mayor-test",
  "title": "Mayor of Test City",
  "jurisdiction": "Municipal",
  "term_length": "4 years",
  "salary": "$95,000/year",
  "responsibilities": "The mayor serves as the chief executive of the city, overseeing day-to-day municipal operations, presenting the annual budget, and representing the city in intergovernmental relations.",
  "why_it_matters": "The mayor directly shapes city services—roads, parks, housing policy, public safety staffing—that affect residents daily. Decisions made in this office determine how tax dollars are spent locally.",
  "key_powers": ["Proposes and signs city budget", "Appoints department heads", "Vetoes city council ordinances", "Issues emergency declarations"],
  "this_cycle_context": "The incumbent is running for a second term. A key issue is the city's proposed downtown development plan and its impact on housing affordability.",
  "sources": ["https://example.gov/mayor-office", "https://ballotpedia.org/mayor-test"],
  "last_researched": "2026-04-28"
}
```

- [ ] **Step 3: Write `tests/fixtures/test-2026/positions/council-1-test.json`**

```json
{
  "id": "council-1-test",
  "title": "City Council, District 1",
  "jurisdiction": "Municipal",
  "term_length": "4 years",
  "salary": "$24,000/year",
  "responsibilities": "City council members vote on ordinances, set the city budget alongside the mayor, and serve as the legislative branch of local government. District 1 representatives advocate for their district's residents at council meetings.",
  "why_it_matters": "The council approves or rejects spending, zoning changes, and local laws. A single council vote can affect neighborhood character, business permits, and infrastructure priorities.",
  "key_powers": ["Votes on city ordinances", "Approves annual budget", "Overrides mayoral vetoes (supermajority)", "Holds public hearings on zoning and development"],
  "this_cycle_context": "Three candidates are competing in an open-seat race following the retirement of the longtime incumbent. District 1 includes the waterfront neighborhood currently under redevelopment.",
  "sources": ["https://example.gov/city-council", "https://ballotpedia.org/council-1-test"],
  "last_researched": "2026-04-28"
}
```

- [ ] **Step 4: Write `tests/fixtures/test-2026/candidates/alice-mayor-test.json`**

```json
{
  "id": "alice-mayor-test",
  "name": "Alice Johnson",
  "race_id": "mayor-test",
  "party": "Democratic",
  "incumbent": true,
  "summary": "Alice Johnson has served as Mayor of Test City since 2022. She previously worked as a city council member and urban planner before running for mayor.",
  "background": {
    "current_role": "Mayor of Test City (since 2022)",
    "career": ["Urban planner, Test City Planning Dept (2010–2018)", "City Council Member, District 3 (2018–2022)"],
    "education": ["B.A. Urban Studies, State University, 2008", "M.S. Public Policy, Regional University, 2010"],
    "prior_offices": ["City Council Member, District 3 (2018–2022)"]
  },
  "track_record": [
    { "claim": "Passed the 2024 Affordable Housing Ordinance, setting aside 15% of new development units as affordable.", "source": "https://example.gov/ordinance-2024-afh" },
    { "claim": "Secured $12M federal grant for downtown infrastructure improvements in 2023.", "source": "https://example.gov/grants-2023" }
  ],
  "stated_positions": [
    { "issue": "Housing", "position": "We need to build more housing at every income level while protecting longtime residents from displacement.", "source": "https://alicejohnson.example.com/platform" },
    { "issue": "Public Safety", "position": "I support investing in both community policing and mental health crisis response teams.", "source": "https://alicejohnson.example.com/platform" }
  ],
  "endorsements": [
    { "endorser": "Test City Teachers Union", "source": "https://tctunion.example.org/endorsements" },
    { "endorser": "Test County Democratic Party", "source": "https://testcountydems.example.com/2026" }
  ],
  "campaign_finance": {
    "total_raised": "$285,000",
    "top_donors_or_sectors": ["Real estate developers ($42,000)", "Public employee unions ($38,000)", "Individual small donors ($125,000)"],
    "source": "https://example.gov/campaign-finance/alice-johnson-2026"
  },
  "notable_news": [
    { "headline": "Mayor Johnson wins national award for affordable housing initiative", "date": "2025-03-15", "summary": "The National League of Cities honored Johnson's 2024 ordinance as a model for mid-size cities.", "source": "https://nlc.example.org/awards-2025" },
    { "headline": "Johnson criticized over delayed downtown construction timeline", "date": "2025-09-22", "summary": "Local business owners said the federal grant project fell 8 months behind schedule, citing permitting delays under the Johnson administration.", "source": "https://testcitygazette.example.com/2025-09-22" }
  ],
  "official_links": { "website": "https://alicejohnson.example.com", "social": ["https://twitter.example.com/alicejohnson"] },
  "sources": ["https://alicejohnson.example.com", "https://ballotpedia.org/alice-johnson-test", "https://example.gov/campaign-finance/alice-johnson-2026"],
  "_failed_sources": [],
  "last_researched": "2026-04-28"
}
```

- [ ] **Step 5: Write `tests/fixtures/test-2026/candidates/bob-mayor-test.json`**

```json
{
  "id": "bob-mayor-test",
  "name": "Bob Smith",
  "race_id": "mayor-test",
  "party": "Republican",
  "incumbent": false,
  "summary": "Bob Smith is a Test City business owner and former Chamber of Commerce president running for mayor on a platform of fiscal restraint and public safety.",
  "background": {
    "current_role": "Owner, Smith Hardware (since 2005)",
    "career": ["Small business owner (2005–present)", "President, Test City Chamber of Commerce (2019–2023)"],
    "education": ["B.B.A. Business Administration, Community College, 2003"],
    "prior_offices": []
  },
  "track_record": [
    { "claim": "Led Chamber of Commerce campaign that reduced city business licensing fees by 20% in 2021.", "source": "https://testcitychamber.example.org/2021-fees" }
  ],
  "stated_positions": [
    { "issue": "Fiscal Policy", "position": "The city budget has grown 18% in four years. We need zero-based budgeting and a full audit before any new spending.", "source": "https://bobformayor.example.com/issues" },
    { "issue": "Public Safety", "position": "I will restore full funding to the police department and end the experiment of diverting patrol resources to social workers.", "source": "https://bobformayor.example.com/issues" }
  ],
  "endorsements": [
    { "endorser": "Test City Fraternal Order of Police", "source": "https://testcityfop.example.org/endorsements" },
    { "endorser": "Test County Republican Party", "source": "https://testcountygop.example.com/2026" }
  ],
  "campaign_finance": {
    "total_raised": "$178,000",
    "top_donors_or_sectors": ["Local business owners ($89,000)", "Republican PAC contributions ($45,000)", "Individual small donors ($44,000)"],
    "source": "https://example.gov/campaign-finance/bob-smith-2026"
  },
  "notable_news": [
    { "headline": "Bob Smith wins Republican primary with 61% of vote", "date": "2026-03-10", "summary": "Smith beat two opponents in the primary, running strongly in the city's southern precincts.", "source": "https://testcitygazette.example.com/2026-03-10" },
    { "headline": "Smith draws scrutiny over 2018 property dispute", "date": "2026-01-18", "summary": "A 2018 zoning dispute in which Smith appealed a neighbor's variance was surfaced by a local advocacy group, though no wrongdoing was alleged.", "source": "https://testcitygazette.example.com/2026-01-18" }
  ],
  "official_links": { "website": "https://bobformayor.example.com", "social": ["https://facebook.example.com/bobformayor"] },
  "sources": ["https://bobformayor.example.com", "https://ballotpedia.org/bob-smith-test", "https://example.gov/campaign-finance/bob-smith-2026"],
  "_failed_sources": [],
  "last_researched": "2026-04-28"
}
```

- [ ] **Step 6: Write the three council candidate fixtures**

`tests/fixtures/test-2026/candidates/carol-council-test.json`:
```json
{
  "id": "carol-council-test",
  "name": "Carol Davis",
  "race_id": "council-1-test",
  "party": "Democratic",
  "incumbent": false,
  "summary": "Carol Davis is a neighborhood association president and environmental consultant running for City Council District 1.",
  "background": { "current_role": "Environmental Consultant, Davis Group LLC", "career": ["Environmental consultant (2015–present)"], "education": ["B.S. Environmental Science, State University, 2013"], "prior_offices": [] },
  "track_record": [{ "claim": "Led successful campaign to designate the District 1 waterfront as a protected green zone in 2024.", "source": "https://testcitygazette.example.com/2024-waterfront" }],
  "stated_positions": [{ "issue": "Development", "position": "Growth is welcome when it includes community benefits agreements and environmental impact reviews.", "source": "https://caroldavis2026.example.com" }],
  "endorsements": [{ "endorser": "Sierra Club Test Chapter", "source": "https://sierraclub.example.org/test-2026" }],
  "campaign_finance": { "total_raised": "$42,000", "top_donors_or_sectors": ["Environmental PACs ($12,000)", "Individual donors ($30,000)"], "source": "https://example.gov/campaign-finance/carol-davis-2026" },
  "notable_news": [{ "headline": "Davis draws large crowd at District 1 town hall", "date": "2026-02-14", "summary": "Over 200 residents attended Davis's first town hall, focusing on waterfront development.", "source": "https://testcitygazette.example.com/2026-02-14" }],
  "official_links": { "website": "https://caroldavis2026.example.com", "social": [] },
  "sources": ["https://caroldavis2026.example.com"],
  "_failed_sources": [],
  "last_researched": "2026-04-28"
}
```

`tests/fixtures/test-2026/candidates/dave-council-test.json`:
```json
{
  "id": "dave-council-test",
  "name": "Dave Wilson",
  "race_id": "council-1-test",
  "party": "Republican",
  "incumbent": false,
  "summary": "Dave Wilson is a retired police officer and current neighborhood watch captain running for City Council District 1.",
  "background": { "current_role": "Retired; Neighborhood Watch Captain", "career": ["Test City Police Officer (1998–2022)", "Neighborhood Watch Captain (2022–present)"], "education": ["A.A. Criminal Justice, Community College, 1997"], "prior_offices": [] },
  "track_record": [{ "claim": "Organized District 1 neighborhood watch network, credited with a 12% reduction in property crime (2023 city report).", "source": "https://example.gov/crime-stats-2023" }],
  "stated_positions": [{ "issue": "Public Safety", "position": "Thirty years of experience tells me that visible, community-connected policing is the most effective deterrent.", "source": "https://davewilson2026.example.com" }],
  "endorsements": [{ "endorser": "Test City Fraternal Order of Police", "source": "https://testcityfop.example.org/endorsements" }],
  "campaign_finance": { "total_raised": "$28,000", "top_donors_or_sectors": ["Individual donors ($28,000)"], "source": "https://example.gov/campaign-finance/dave-wilson-2026" },
  "notable_news": [{ "headline": "No public information found", "date": "No public information found", "summary": "No public information found", "source": "No public information found" }],
  "official_links": { "website": "https://davewilson2026.example.com", "social": [] },
  "sources": ["https://davewilson2026.example.com"],
  "_failed_sources": [],
  "last_researched": "2026-04-28"
}
```

`tests/fixtures/test-2026/candidates/eve-council-test.json`:
```json
{
  "id": "eve-council-test",
  "name": "Eve Martinez",
  "race_id": "council-1-test",
  "party": "Independent",
  "incumbent": false,
  "summary": "Eve Martinez is a community organizer and former school board candidate running as an independent for City Council District 1.",
  "background": { "current_role": "Community Organizer, District 1 Residents Alliance", "career": ["Community organizer (2018–present)"], "education": ["B.A. Sociology, Regional University, 2016"], "prior_offices": [] },
  "track_record": [{ "claim": "Organized a 2025 petition signed by 1,400 District 1 residents opposing a proposed warehouse development on 3rd Street.", "source": "https://testcitygazette.example.com/2025-petition" }],
  "stated_positions": [{ "issue": "Representation", "position": "District 1 residents have been treated as an afterthought in development decisions. I will make sure community voices come before developer interests.", "source": "https://evemartinez2026.example.com" }],
  "endorsements": [],
  "campaign_finance": { "total_raised": "$11,000", "top_donors_or_sectors": ["Individual small donors ($11,000)"], "source": "https://example.gov/campaign-finance/eve-martinez-2026" },
  "notable_news": [{ "headline": "Martinez enters District 1 race as independent", "date": "2026-01-05", "summary": "Martinez announced her campaign, citing frustration with both party candidates' ties to development interests.", "source": "https://testcitygazette.example.com/2026-01-05" }],
  "official_links": { "website": "https://evemartinez2026.example.com", "social": [] },
  "sources": ["https://evemartinez2026.example.com"],
  "_failed_sources": [],
  "last_researched": "2026-04-28"
}
```

- [ ] **Step 7: Write `data/index.json`**

This is the election manifest read by the app on startup. The research pipeline appends to this file when creating new elections.

```json
{
  "elections": []
}
```

(Start empty — real elections are added when `/research-ballot` runs. The E2E tests mock this file via `page.route()`.)

- [ ] **Step 8: Commit**

```bash
git add tests/fixtures/ data/index.json
git commit -m "feat: fixture data for test election and empty data manifest"
```

---

## Task 3: Schema validation tests

**Files:**
- Create: `tests/schema/validate.test.mjs`

Validates any JSON files under `data/` against the expected schema shapes. Run after each research pipeline execution to catch malformed output.

- [ ] **Step 1: Write the failing test first**

Create `tests/schema/validate.test.mjs`:

```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');
const FIXTURES = join(ROOT, 'tests', 'fixtures');

function readJSON(p) {
  return JSON.parse(readFileSync(p, 'utf-8'));
}

function getElectionDirs(base) {
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => join(base, d.name));
}

// Validates a races.json file
function assertValidRaces(races, filePath) {
  assert.ok(typeof races.election_slug === 'string', `${filePath}: election_slug must be a string`);
  assert.ok(typeof races.election_date === 'string', `${filePath}: election_date must be a string`);
  assert.ok(Array.isArray(races.races), `${filePath}: races must be an array`);
  assert.ok(Array.isArray(races._warnings), `${filePath}: _warnings must be an array`);
  for (const race of races.races) {
    assert.ok(typeof race.id === 'string', `${filePath}: race.id must be a string`);
    assert.ok(typeof race.title === 'string', `${filePath}: race.title must be a string`);
    assert.ok(Array.isArray(race.candidates), `${filePath}: race.candidates must be an array`);
    for (const c of race.candidates) {
      assert.ok(typeof c.id === 'string', `${filePath}: candidate.id must be a string`);
      assert.ok(typeof c.name === 'string', `${filePath}: candidate.name must be a string`);
      assert.ok(typeof c.incumbent === 'boolean', `${filePath}: candidate.incumbent must be boolean`);
    }
  }
}

// Validates a position JSON file
function assertValidPosition(pos, filePath) {
  const required = ['id', 'title', 'jurisdiction', 'term_length', 'salary', 'responsibilities', 'why_it_matters', 'this_cycle_context'];
  for (const field of required) {
    assert.ok(typeof pos[field] === 'string' && pos[field].length > 0, `${filePath}: position.${field} must be a non-empty string`);
  }
  assert.ok(Array.isArray(pos.key_powers), `${filePath}: key_powers must be an array`);
  assert.ok(Array.isArray(pos.sources), `${filePath}: sources must be an array`);
}

// Validates a candidate JSON file
function assertValidCandidate(c, filePath) {
  const strFields = ['id', 'name', 'race_id', 'party', 'summary'];
  for (const field of strFields) {
    assert.ok(typeof c[field] === 'string' && c[field].length > 0, `${filePath}: candidate.${field} must be a non-empty string`);
  }
  assert.ok(typeof c.incumbent === 'boolean', `${filePath}: incumbent must be boolean`);
  assert.ok(typeof c.background === 'object' && c.background !== null, `${filePath}: background must be an object`);
  assert.ok(Array.isArray(c.track_record), `${filePath}: track_record must be an array`);
  assert.ok(Array.isArray(c.stated_positions), `${filePath}: stated_positions must be an array`);
  assert.ok(Array.isArray(c.endorsements), `${filePath}: endorsements must be an array`);
  assert.ok(typeof c.campaign_finance === 'object', `${filePath}: campaign_finance must be an object`);
  assert.ok(Array.isArray(c.notable_news), `${filePath}: notable_news must be an array`);
  assert.ok(typeof c.official_links === 'object', `${filePath}: official_links must be an object`);
  assert.ok(Array.isArray(c.sources), `${filePath}: sources must be an array`);
  assert.ok(Array.isArray(c._failed_sources), `${filePath}: _failed_sources must be an array`);
  // Validate each track_record item has claim + source
  for (const item of c.track_record) {
    assert.ok(typeof item.claim === 'string', `${filePath}: track_record item must have a claim string`);
    assert.ok(typeof item.source === 'string', `${filePath}: track_record item must have a source string`);
  }
  // Validate each stated_position has issue + position + source
  for (const item of c.stated_positions) {
    assert.ok(typeof item.issue === 'string', `${filePath}: stated_positions item must have issue`);
    assert.ok(typeof item.position === 'string', `${filePath}: stated_positions item must have position`);
    assert.ok(typeof item.source === 'string', `${filePath}: stated_positions item must have source`);
  }
}

describe('fixture data schema', () => {
  const electionDirs = getElectionDirs(FIXTURES);

  test('at least one fixture election exists', () => {
    assert.ok(electionDirs.length > 0, 'No fixture election directories found under tests/fixtures/');
  });

  for (const elDir of electionDirs) {
    const racesPath = join(elDir, 'races.json');

    test(`${elDir}: races.json is valid`, () => {
      assert.ok(existsSync(racesPath), `Missing: ${racesPath}`);
      assertValidRaces(readJSON(racesPath), racesPath);
    });

    const posDir = join(elDir, 'positions');
    if (existsSync(posDir)) {
      for (const file of readdirSync(posDir).filter(f => f.endsWith('.json'))) {
        const filePath = join(posDir, file);
        test(`${file}: valid position`, () => {
          assertValidPosition(readJSON(filePath), filePath);
        });
      }
    }

    const candDir = join(elDir, 'candidates');
    if (existsSync(candDir)) {
      for (const file of readdirSync(candDir).filter(f => f.endsWith('.json'))) {
        const filePath = join(candDir, file);
        test(`${file}: valid candidate`, () => {
          assertValidCandidate(readJSON(filePath), filePath);
        });
      }
    }
  }
});
```

- [ ] **Step 2: Run and verify it passes against fixtures**

```bash
npm run test:schema
```

Expected: all tests PASS. If any fail, fix the fixture JSON (not the validator).

- [ ] **Step 3: Commit**

```bash
git add tests/schema/validate.test.mjs
git commit -m "feat: schema validation tests for races, positions, and candidates"
```

---

## Task 4: App shell

**Files:**
- Create: `app/index.html`
- Create: `app/styles.css`
- Create: `app/js/data.js`
- Create: `app/js/state.js`
- Create: `app/js/app.js`
- Create: `tests/e2e/helpers.js`
- Create: `tests/e2e/home.spec.js` (first test, minimal — just checks the page loads)

- [ ] **Step 1: Write the first failing E2E test**

`tests/e2e/home.spec.js` (bare minimum — just checks no crash on load):

```javascript
import { test, expect } from '@playwright/test';
import { setupFixtures } from './helpers.js';

test('home loads without error', async ({ page }) => {
  await setupFixtures(page);
  await page.goto('http://localhost:8000/app/');
  await expect(page.locator('#app')).not.toBeEmpty();
  await expect(page.locator('.error')).toHaveCount(0);
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx playwright test tests/e2e/home.spec.js --project=desktop
```

Expected: FAIL — `app/index.html` not found.

- [ ] **Step 3: Write `tests/e2e/helpers.js`**

```javascript
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES = join(fileURLToPath(import.meta.url), '..', '..', 'fixtures');

export async function setupFixtures(page) {
  // Mock data/index.json to return test-2026 election
  await page.route('**/data/index.json', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      elections: [{ slug: 'test-2026', label: 'Test Election 2026', date: '2026-11-04' }]
    })
  }));

  // Route all /data/<slug>/** to fixtures
  await page.route('**/data/**', async route => {
    const url = new URL(route.request().url());
    // strip /data/ prefix
    const rel = url.pathname.replace(/^\/data\//, '');
    const filePath = join(FIXTURES, rel);
    try {
      const body = readFileSync(filePath);
      await route.fulfill({ contentType: 'application/json', body });
    } catch {
      await route.fulfill({ status: 404, body: 'Not found' });
    }
  });
}
```

- [ ] **Step 4: Write `app/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Voting God</title>
  <link rel="stylesheet" href="/app/styles.css" />
</head>
<body>
  <div id="app" role="main">
    <p class="loading">Loading…</p>
  </div>
  <script type="module" src="/app/js/app.js"></script>
</body>
</html>
```

- [ ] **Step 5: Write `app/styles.css`**

```css
/* ── Custom properties ─────────────────────────────────── */
:root {
  --bg:             #ffffff;
  --bg-secondary:   #f8f8f8;
  --text:           #111111;
  --text-muted:     #5a5a5a;
  --text-faint:     #999999;
  --accent:         #1a56db;
  --accent-hover:   #1341b8;
  --border:         #e0e0e0;
  --pill-ns-bg:     #e5e7eb; --pill-ns-text: #374151;
  --pill-rv-bg:     #fef3c7; --pill-rv-text: #78350f;
  --pill-dc-bg:     #d1fae5; --pill-dc-text: #065f46;
  --warn-bg:        #fff7ed;
  --warn-text:      #92400e;
  --font-sans:      system-ui, -apple-system, sans-serif;
  --font-mono:      ui-monospace, monospace;
  --radius:         6px;
  --shadow:         0 1px 3px rgba(0,0,0,.08);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg:             #111827;
    --bg-secondary:   #1f2937;
    --text:           #f9fafb;
    --text-muted:     #9ca3af;
    --text-faint:     #6b7280;
    --accent:         #60a5fa;
    --accent-hover:   #93c5fd;
    --border:         #374151;
    --pill-ns-bg:     #374151; --pill-ns-text: #d1d5db;
    --pill-rv-bg:     #451a03; --pill-rv-text: #fde68a;
    --pill-dc-bg:     #022c22; --pill-dc-text: #6ee7b7;
    --warn-bg:        #2d1b00;
    --warn-text:      #fcd34d;
  }
}

/* ── Reset ─────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; }
body {
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  min-height: 100vh;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; color: var(--accent-hover); }

/* ── Layout ─────────────────────────────────────────────── */
#app { max-width: 960px; margin: 0 auto; padding: 1rem 1rem 4rem; }

/* ── Typography ─────────────────────────────────────────── */
h1 { font-size: 2rem; font-weight: 700; }
h2 { font-size: 1.4rem; font-weight: 600; margin-bottom: .5rem; }
h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: .25rem; }
p  { margin-bottom: .75rem; }

/* ── Navigation ─────────────────────────────────────────── */
.top-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: .75rem 0 1.25rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.top-nav .nav-brand { font-weight: 700; font-size: 1.1rem; margin-right: auto; }
.top-nav a { color: var(--text-muted); font-size: .9rem; }
.top-nav a:hover { color: var(--accent); text-decoration: none; }

/* ── Buttons ─────────────────────────────────────────────── */
.btn, button.btn {
  display: inline-block;
  padding: .55rem 1.1rem;
  border-radius: var(--radius);
  font-size: .9rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  min-height: 44px;
  line-height: 1.4;
}
.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover { background: var(--accent-hover); text-decoration: none; }
.btn-secondary { background: var(--bg-secondary); color: var(--text); border: 1px solid var(--border); }
.btn-secondary:hover { background: var(--border); text-decoration: none; }
.btn-ghost { background: transparent; color: var(--accent); border: 1px solid var(--accent); }
.btn-ghost:hover { background: var(--accent); color: #fff; text-decoration: none; }

/* ── Pills ───────────────────────────────────────────────── */
.pill {
  display: inline-block;
  font-size: .75rem;
  font-weight: 600;
  padding: .2rem .55rem;
  border-radius: 999px;
  white-space: nowrap;
}
.pill--not-started { background: var(--pill-ns-bg); color: var(--pill-ns-text); }
.pill--reviewing   { background: var(--pill-rv-bg); color: var(--pill-rv-text); }
.pill--decided     { background: var(--pill-dc-bg); color: var(--pill-dc-text); }
.pill--warn        { background: var(--warn-bg);    color: var(--warn-text); }

/* ── Cards ───────────────────────────────────────────────── */
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  box-shadow: var(--shadow);
}

/* ── Race list ───────────────────────────────────────────── */
.race-list-header {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.race-list-header .progress { color: var(--text-muted); font-size: .9rem; margin-left: auto; }
.races { list-style: none; display: flex; flex-direction: column; gap: .5rem; }
.race-row {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .75rem 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-secondary);
  transition: background .15s;
}
.race-row:hover { background: var(--border); }
.race-row .race-link { flex: 1; color: var(--text); font-weight: 500; }
.race-row .race-link:hover { text-decoration: none; }
.race-meta { font-size: .82rem; color: var(--text-muted); }

/* ── Position info block ─────────────────────────────────── */
.position-info {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}
.position-info h2 { margin-bottom: .75rem; }
.position-meta { display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: .85rem; color: var(--text-muted); margin-bottom: .75rem; }
.key-powers { list-style: disc; padding-left: 1.25rem; color: var(--text-muted); font-size: .9rem; }

/* ── Candidate grid ──────────────────────────────────────── */
.candidate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}
.candidate-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.candidate-card .cand-name { font-weight: 600; font-size: 1rem; }
.candidate-card .cand-meta { font-size: .82rem; color: var(--text-muted); }
.candidate-card .cand-summary { font-size: .88rem; color: var(--text-muted); flex: 1; }
.candidate-card .card-actions { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .5rem; }
.picked-badge { color: var(--pill-dc-text); font-size: .78rem; font-weight: 600; }

/* ── Candidate detail ─────────────────────────────────────── */
.candidate-detail { max-width: 740px; }
.candidate-header { margin-bottom: 1.5rem; }
.candidate-header .cand-name { font-size: 1.6rem; font-weight: 700; }
.candidate-header .cand-meta { color: var(--text-muted); font-size: .9rem; }
.candidate-header .header-actions { display: flex; gap: .75rem; margin-top: 1rem; flex-wrap: wrap; }
.dossier-section { margin-bottom: 1.75rem; }
.dossier-section h3 { border-bottom: 1px solid var(--border); padding-bottom: .35rem; margin-bottom: .75rem; }
.claim-list, .position-list { list-style: none; display: flex; flex-direction: column; gap: .6rem; }
.claim-item, .position-item { font-size: .9rem; }
.claim-item .source-link, .position-item .source-link { font-size: .78rem; color: var(--text-faint); margin-left: .4rem; }
.no-info { color: var(--text-faint); font-style: italic; font-size: .9rem; }

/* ── Compare view ─────────────────────────────────────────── */
.compare-header { margin-bottom: 1rem; }
.compare-header .compare-title { font-size: 1rem; color: var(--text-muted); }
.compare-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.compare-col { }
.compare-col-header {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-bottom: .75rem;
  flex-wrap: wrap;
}
.compare-col-name { font-weight: 700; font-size: 1rem; flex: 1; }
.compare-nav-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  padding: .25rem .6rem;
  font-size: 1rem;
  color: var(--text);
  min-height: 44px;
  min-width: 44px;
}
.compare-nav-btn:disabled { opacity: .3; cursor: default; }
.pin-btn { font-size: .85rem; }
.pin-btn.pinned { color: var(--accent); font-weight: 600; }
.compare-field { margin-bottom: .75rem; }
.compare-field-label { font-size: .75rem; font-weight: 600; color: var(--text-faint); text-transform: uppercase; letter-spacing: .04em; margin-bottom: .2rem; }
.compare-field-value { font-size: .88rem; }
.compare-progress { font-size: .82rem; color: var(--text-muted); text-align: center; margin-top: .5rem; }

/* ── Picks summary ───────────────────────────────────────── */
.picks-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.picks-header h1 { margin-right: auto; }
.pick-row { border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem; margin-bottom: 1rem; }
.pick-row-race { font-size: .82rem; color: var(--text-muted); margin-bottom: .25rem; }
.pick-row-candidate { font-weight: 600; font-size: 1rem; }
.pick-row-unpicked { color: var(--text-faint); font-style: italic; }
.pick-note { margin-top: .5rem; }
.pick-note textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: .5rem;
  font-family: var(--font-sans);
  font-size: .88rem;
  resize: vertical;
  background: var(--bg);
  color: var(--text);
  min-height: 44px;
}

/* ── Utility ─────────────────────────────────────────────── */
.loading { color: var(--text-muted); padding: 2rem 0; }
.error   { color: #dc2626; padding: 2rem 0; }
.site-header { text-align: center; padding: 2rem 0 1.5rem; border-bottom: 1px solid var(--border); margin-bottom: 2rem; }
.tagline { color: var(--text-muted); font-size: .95rem; margin-top: .25rem; }

/* ── Mobile ──────────────────────────────────────────────── */
@media (max-width: 640px) {
  h1 { font-size: 1.5rem; }
  .compare-columns { grid-template-columns: 1fr; }
  .candidate-grid  { grid-template-columns: 1fr; }

  /* Mobile compare: scroll-snap single-card */
  .compare-columns-mobile {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    gap: 0;
  }
  .compare-columns-mobile .compare-col {
    flex: 0 0 100%;
    scroll-snap-align: start;
    padding: 0 .25rem;
  }
}

/* ── Print (PDF export) ───────────────────────────────────── */
@media print {
  body { background: #fff; color: #000; font-size: 11pt; }
  .top-nav, .btn, button, textarea, .no-print { display: none !important; }
  .pick-row { border: 1pt solid #ccc; page-break-inside: avoid; }
  a { color: #000; text-decoration: none; }
  #app { max-width: 100%; padding: 0; }
  h1 { font-size: 16pt; }
}
```

- [ ] **Step 6: Write `app/js/data.js`**

```javascript
const _cache = {};

async function _fetch(path) {
  if (_cache[path]) return _cache[path];
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`);
  _cache[path] = await res.json();
  return _cache[path];
}

export const loadElections  = ()                    => _fetch('/data/index.json');
export const loadRaces      = (slug)                => _fetch(`/data/${slug}/races.json`);
export const loadPosition   = (slug, raceId)        => _fetch(`/data/${slug}/positions/${raceId}.json`);
export const loadCandidate  = (slug, candidateId)   => _fetch(`/data/${slug}/candidates/${candidateId}.json`);
```

- [ ] **Step 7: Write `app/js/state.js`**

```javascript
const key = (slug, type) => `vg:${slug}:${type}`;
const getObj = k => JSON.parse(localStorage.getItem(k) || '{}');
const setObj = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export function getPick(slug, raceId)              { return getObj(key(slug, 'picks'))[raceId] || null; }
export function setPick(slug, raceId, candidateId) { const p = getObj(key(slug,'picks')); p[raceId] = candidateId; setObj(key(slug,'picks'), p); }
export function getNote(slug, raceId)              { return getObj(key(slug, 'notes'))[raceId] || ''; }
export function setNote(slug, raceId, text)        { const n = getObj(key(slug,'notes')); n[raceId] = text; setObj(key(slug,'notes'), n); }

export function exportState(slug) {
  return { slug, exported: new Date().toISOString(), picks: getObj(key(slug,'picks')), notes: getObj(key(slug,'notes')) };
}

export function importState(slug, data) {
  setObj(key(slug,'picks'), data.picks || {});
  setObj(key(slug,'notes'), data.notes || {});
}
```

- [ ] **Step 8: Write `app/js/app.js`**

```javascript
const el = () => document.getElementById('app');

async function router() {
  const hash  = window.location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(p => p !== '');
  const app   = el();
  app.innerHTML = '<p class="loading">Loading…</p>';

  try {
    if (parts.length === 0) {
      const { renderHome } = await import('./home.js');
      await renderHome(app, null);
    } else if (parts.length === 1) {
      const { renderHome } = await import('./home.js');
      await renderHome(app, parts[0]);
    } else if (parts.length === 2 && parts[1] === 'picks') {
      const { renderPicks } = await import('./picks.js');
      await renderPicks(app, parts[0]);
    } else if (parts.length === 3 && parts[1] === 'race') {
      const { renderRace } = await import('./race.js');
      await renderRace(app, parts[0], parts[2]);
    } else if (parts.length === 3 && parts[1] === 'candidate') {
      const { renderCandidate } = await import('./candidate.js');
      await renderCandidate(app, parts[0], parts[2]);
    } else if (parts.length === 3 && parts[1] === 'compare') {
      const { renderCompare } = await import('./compare.js');
      await renderCompare(app, parts[0], parts[2]);
    } else {
      app.innerHTML = '<p class="error">Page not found.</p>';
    }
  } catch (err) {
    app.innerHTML = `<p class="error">Error: ${err.message}</p>`;
    console.error(err);
  }
}

window.addEventListener('hashchange', () => router());
window.addEventListener('DOMContentLoaded', () => router());
```

- [ ] **Step 9: Run the E2E test — verify it passes**

```bash
npx playwright test tests/e2e/home.spec.js --project=desktop
```

Expected: PASS — page loads, `#app` has content, no `.error` element.

- [ ] **Step 10: Commit**

```bash
git add app/ tests/e2e/helpers.js tests/e2e/home.spec.js
git commit -m "feat: app shell — HTML, CSS, router, data loader, state module"
```

---

## Task 5: Home view

**Files:**
- Create: `app/js/home.js`
- Modify: `tests/e2e/home.spec.js`

- [ ] **Step 1: Expand the failing E2E test**

Replace `tests/e2e/home.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import { setupFixtures } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await setupFixtures(page);
  await page.goto('http://localhost:8000/app/');
});

test('shows race list for single election', async ({ page }) => {
  // Single election → auto-loaded, race list shown
  await expect(page.locator('.races')).toBeVisible();
  await expect(page.locator('.race-row')).toHaveCount(2);
});

test('race rows show title and pill', async ({ page }) => {
  const firstRow = page.locator('.race-row').first();
  await expect(firstRow.locator('.race-link')).toContainText('Mayor');
  await expect(firstRow.locator('.pill')).toBeVisible();
});

test('shows progress count', async ({ page }) => {
  await expect(page.locator('.progress')).toContainText('of 2 races decided');
});

test('picks link is visible', async ({ page }) => {
  await expect(page.locator('a[href*="picks"]')).toBeVisible();
});
```

- [ ] **Step 2: Run — verify tests fail**

```bash
npx playwright test tests/e2e/home.spec.js --project=desktop
```

Expected: FAIL — `.races` not found.

- [ ] **Step 3: Write `app/js/home.js`**

```javascript
import { loadElections, loadRaces } from './data.js';
import { getPick } from './state.js';

function pillClass(status) {
  return { 'not-started': 'pill--not-started', 'reviewing': 'pill--reviewing', 'decided': 'pill--decided' }[status] || 'pill--not-started';
}
function pillLabel(status) {
  return { 'not-started': 'Not started', 'reviewing': 'Reviewing', 'decided': 'Decided' }[status] || 'Not started';
}
function raceStatus(slug, race) {
  const pick = getPick(slug, race.id);
  if (!pick) return 'not-started';
  return 'decided';
}

function nav(slug) {
  return `<nav class="top-nav">
    <span class="nav-brand">🗳 Voting God</span>
    ${slug ? `<a href="#/${slug}/picks">My Picks →</a>` : ''}
  </nav>`;
}

async function renderElectionPicker(app, elections) {
  app.innerHTML = `
    ${nav(null)}
    <div class="site-header">
      <h1>🗳 Voting God</h1>
      <p class="tagline">Omniscient on all matters of the ballot.</p>
    </div>
    <h2>Choose an Election</h2>
    <ul class="races">
      ${elections.map(e => `
        <li class="race-row">
          <a class="race-link" href="#/${e.slug}">${e.label}</a>
          <span class="race-meta">${e.date}</span>
        </li>`).join('')}
    </ul>`;
}

async function renderRaceList(app, slug, racesData) {
  const decidedCount = racesData.races.filter(r => raceStatus(slug, r) === 'decided').length;
  const total = racesData.races.length;

  app.innerHTML = `
    ${nav(slug)}
    <div class="race-list-header">
      <h2>${racesData.jurisdiction} · ${racesData.election_date}</h2>
      <span class="progress">${decidedCount} of ${total} races decided</span>
    </div>
    <ul class="races">
      ${racesData.races.map(race => {
        const status = raceStatus(slug, race);
        return `<li class="race-row">
          <a class="race-link" href="#/${slug}/race/${race.id}">
            ${race.title}
            <span class="race-meta">${race.candidates.length} candidate${race.candidates.length !== 1 ? 's' : ''}</span>
          </a>
          <span class="pill ${pillClass(status)}">${pillLabel(status)}</span>
        </li>`;
      }).join('')}
    </ul>`;
}

export async function renderHome(app, slug) {
  const { elections } = await loadElections();

  if (!slug) {
    if (elections.length === 1) {
      // Auto-load single election
      window.location.replace(`#/${elections[0].slug}`);
      return;
    }
    await renderElectionPicker(app, elections);
    return;
  }

  const racesData = await loadRaces(slug);
  await renderRaceList(app, slug, racesData);
}
```

- [ ] **Step 4: Run — verify tests pass**

```bash
npx playwright test tests/e2e/home.spec.js --project=desktop
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/js/home.js tests/e2e/home.spec.js
git commit -m "feat: home view — election picker and race list with status pills"
```

---

## Task 6: Race page view

**Files:**
- Create: `app/js/race.js`
- Create: `tests/e2e/race.spec.js`

- [ ] **Step 1: Write failing E2E tests**

`tests/e2e/race.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import { setupFixtures } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await setupFixtures(page);
  await page.goto('http://localhost:8000/app/#/test-2026/race/mayor-test');
});

test('shows position info before candidates', async ({ page }) => {
  await expect(page.locator('.position-info')).toBeVisible();
  await expect(page.locator('.position-info')).toContainText('Mayor');
  await expect(page.locator('.position-info')).toContainText('responsibilities');
});

test('shows position responsibility text', async ({ page }) => {
  await expect(page.locator('.position-info')).toContainText('chief executive');
});

test('shows candidate cards', async ({ page }) => {
  await expect(page.locator('.candidate-card')).toHaveCount(2);
});

test('candidate cards show name and party', async ({ page }) => {
  const first = page.locator('.candidate-card').first();
  await expect(first.locator('.cand-name')).toContainText('Alice Johnson');
  await expect(first.locator('.cand-meta')).toContainText('Democratic');
});

test('candidate card has view profile link', async ({ page }) => {
  const first = page.locator('.candidate-card').first();
  await expect(first.locator('a[href*="candidate"]')).toBeVisible();
});

test('candidate card has compare checkbox', async ({ page }) => {
  await expect(page.locator('.candidate-card input[type="checkbox"]').first()).toBeVisible();
});

test('compare button appears when two candidates checked', async ({ page }) => {
  await page.locator('.candidate-card input[type="checkbox"]').nth(0).check();
  await page.locator('.candidate-card input[type="checkbox"]').nth(1).check();
  await expect(page.locator('.btn-compare')).toBeVisible();
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npx playwright test tests/e2e/race.spec.js --project=desktop
```

Expected: FAIL.

- [ ] **Step 3: Write `app/js/race.js`**

```javascript
import { loadRaces, loadPosition } from './data.js';
import { getPick } from './state.js';

function nav(slug) {
  return `<nav class="top-nav">
    <a href="#/${slug}">← Races</a>
    <span class="nav-brand">🗳 Voting God</span>
    <a href="#/${slug}/picks">My Picks →</a>
  </nav>`;
}

function renderPositionInfo(pos) {
  return `<div class="position-info">
    <h2>${pos.title}</h2>
    <div class="position-meta">
      <span>${pos.jurisdiction}</span>
      <span>${pos.term_length}</span>
      <span>${pos.salary}</span>
    </div>
    <p><strong>responsibilities:</strong> ${pos.responsibilities}</p>
    <p><strong>Why it matters:</strong> ${pos.why_it_matters}</p>
    ${pos.key_powers.length ? `<ul class="key-powers">${pos.key_powers.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}
    <p style="margin-top:.75rem;font-size:.85rem;color:var(--text-muted)"><strong>This cycle:</strong> ${pos.this_cycle_context}</p>
  </div>`;
}

function limitedInfoWarning(cand) {
  const fields = ['summary','track_record','stated_positions','endorsements','campaign_finance','notable_news','background'];
  const missing = fields.filter(f => {
    const v = cand[f];
    if (typeof v === 'string') return v === 'No public information found';
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === 'object') return Object.values(v).every(x => x === 'No public information found' || (Array.isArray(x) && x.length === 0));
    return false;
  });
  return missing.length > fields.length / 2;
}

export async function renderRace(app, slug, raceId) {
  const [racesData, position] = await Promise.all([
    loadRaces(slug),
    loadPosition(slug, raceId),
  ]);
  const race = racesData.races.find(r => r.id === raceId);
  if (!race) { app.innerHTML = '<p class="error">Race not found.</p>'; return; }

  const pickedId = getPick(slug, raceId);

  app.innerHTML = `
    ${nav(slug)}
    <h2>${race.title}</h2>
    ${renderPositionInfo(position)}
    <div id="compare-bar" style="margin-bottom:.75rem;min-height:44px;"></div>
    <div class="candidate-grid">
      ${race.candidates.map(c => `
        <div class="candidate-card">
          <div style="display:flex;align-items:center;gap:.5rem;">
            <input type="checkbox" data-id="${c.id}" aria-label="Add ${c.name} to compare" style="min-width:20px;min-height:20px;" />
            <span class="cand-name">${c.name}</span>
          </div>
          <span class="cand-meta">${c.party}${c.incumbent ? ' · Incumbent' : ''}</span>
          ${pickedId === c.id ? '<span class="picked-badge">✓ Your pick</span>' : ''}
          <div class="card-actions">
            <a href="#/${slug}/candidate/${c.id}" class="btn btn-secondary" style="font-size:.85rem;">View profile</a>
          </div>
        </div>`).join('')}
    </div>`;

  // Compare bar logic
  const bar = app.querySelector('#compare-bar');
  const checks = () => [...app.querySelectorAll('input[type=checkbox]:checked')].map(c => c.dataset.id);

  function updateBar() {
    const checked = checks();
    bar.innerHTML = checked.length >= 2
      ? `<a href="#/${slug}/compare/${raceId}?a=${checked[0]}&b=${checked[1]}" class="btn btn-primary btn-compare">Compare selected →</a>`
      : '';
  }

  app.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      // Max 2 selected
      if (checks().length > 2) cb.checked = false;
      updateBar();
    });
  });
}
```

- [ ] **Step 4: Run — verify pass**

```bash
npx playwright test tests/e2e/race.spec.js --project=desktop
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/js/race.js tests/e2e/race.spec.js
git commit -m "feat: race page — position info, candidate cards, compare trigger"
```

---

## Task 7: Candidate detail view

**Files:**
- Create: `app/js/candidate.js`
- Create: `tests/e2e/candidate.spec.js`

- [ ] **Step 1: Write failing E2E tests**

`tests/e2e/candidate.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import { setupFixtures } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await setupFixtures(page);
  await page.goto('http://localhost:8000/app/#/test-2026/candidate/alice-mayor-test');
});

test('shows candidate name and party', async ({ page }) => {
  await expect(page.locator('.cand-name')).toContainText('Alice Johnson');
  await expect(page.locator('.cand-meta')).toContainText('Democratic');
});

test('shows summary section', async ({ page }) => {
  await expect(page.locator('.dossier-section').filter({ hasText: 'Summary' })).toBeVisible();
});

test('shows track record with sources', async ({ page }) => {
  const section = page.locator('.dossier-section').filter({ hasText: 'Track Record' });
  await expect(section).toBeVisible();
  await expect(section.locator('.source-link')).toHaveCount({ minimum: 1 });
});

test('shows stated positions', async ({ page }) => {
  await expect(page.locator('.dossier-section').filter({ hasText: 'Stated Positions' })).toBeVisible();
});

test('shows pick button', async ({ page }) => {
  await expect(page.locator('button.btn-primary')).toContainText('Pick');
});

test('pick button updates to picked state', async ({ page }) => {
  await page.locator('button.btn-primary').click();
  await expect(page.locator('button.btn-primary')).toContainText('✓ Picked');
});

test('back button returns to race page', async ({ page }) => {
  await page.locator('a.btn-secondary').first().click();
  await expect(page).toHaveURL(/race\/mayor-test/);
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npx playwright test tests/e2e/candidate.spec.js --project=desktop
```

Expected: FAIL.

- [ ] **Step 3: Write `app/js/candidate.js`**

```javascript
import { loadRaces, loadCandidate } from './data.js';
import { getPick, setPick } from './state.js';

function val(v) {
  if (v === 'No public information found' || v === null || v === undefined) return null;
  return v;
}
function noInfo(text) { return `<span class="no-info">${text || 'No public information found'}</span>`; }

function nav(slug, raceId) {
  return `<nav class="top-nav">
    <a href="#/${slug}/race/${raceId}" class="btn-secondary btn">← Race</a>
    <span class="nav-brand">🗳 Voting God</span>
    <a href="#/${slug}/picks">My Picks →</a>
  </nav>`;
}

export async function renderCandidate(app, slug, candidateId) {
  const cand = await loadCandidate(slug, candidateId);
  const isPicked = getPick(slug, cand.race_id) === candidateId;

  function render(picked) {
    app.innerHTML = `
      ${nav(slug, cand.race_id)}
      <div class="candidate-detail">
        <div class="candidate-header">
          <div class="cand-name">${cand.name}</div>
          <div class="cand-meta">${cand.party}${cand.incumbent ? ' · Incumbent' : ''}</div>
          <div class="header-actions">
            <button class="btn btn-primary" id="pick-btn">${picked ? '✓ Picked' : `Pick ${cand.name.split(' ')[0]}`}</button>
          </div>
        </div>

        <div class="dossier-section">
          <h3>Summary</h3>
          <p>${val(cand.summary) || noInfo()}</p>
        </div>

        <div class="dossier-section">
          <h3>Background</h3>
          ${val(cand.background?.current_role) ? `<p><strong>Current role:</strong> ${cand.background.current_role}</p>` : ''}
          ${cand.background?.career?.length ? `<p><strong>Career:</strong> ${cand.background.career.join(', ')}</p>` : ''}
          ${cand.background?.education?.length ? `<p><strong>Education:</strong> ${cand.background.education.join(', ')}</p>` : ''}
          ${cand.background?.prior_offices?.length ? `<p><strong>Prior offices:</strong> ${cand.background.prior_offices.join(', ')}</p>` : ''}
        </div>

        <div class="dossier-section">
          <h3>Track Record</h3>
          ${cand.track_record.length ? `<ul class="claim-list">
            ${cand.track_record.map(item => `<li class="claim-item">
              ${item.claim}
              ${val(item.source) ? `<a href="${item.source}" target="_blank" rel="noopener" class="source-link">[source]</a>` : ''}
            </li>`).join('')}
          </ul>` : noInfo()}
        </div>

        <div class="dossier-section">
          <h3>Stated Positions</h3>
          ${cand.stated_positions.length ? `<ul class="position-list">
            ${cand.stated_positions.map(item => `<li class="position-item">
              <strong>${item.issue}:</strong> ${item.position}
              ${val(item.source) ? `<a href="${item.source}" target="_blank" rel="noopener" class="source-link">[source]</a>` : ''}
            </li>`).join('')}
          </ul>` : noInfo()}
        </div>

        <div class="dossier-section">
          <h3>Endorsements</h3>
          ${cand.endorsements.length ? `<ul class="claim-list">
            ${cand.endorsements.map(e => `<li class="claim-item">
              ${e.endorser}
              ${val(e.source) ? `<a href="${e.source}" target="_blank" rel="noopener" class="source-link">[source]</a>` : ''}
            </li>`).join('')}
          </ul>` : noInfo()}
        </div>

        <div class="dossier-section">
          <h3>Campaign Finance</h3>
          ${val(cand.campaign_finance?.total_raised) ? `
            <p><strong>Total raised:</strong> ${cand.campaign_finance.total_raised}
              ${val(cand.campaign_finance.source) ? `<a href="${cand.campaign_finance.source}" target="_blank" rel="noopener" class="source-link">[source]</a>` : ''}
            </p>
            ${cand.campaign_finance.top_donors_or_sectors?.length ? `<p><strong>Top donors/sectors:</strong> ${cand.campaign_finance.top_donors_or_sectors.join(', ')}</p>` : ''}
          ` : noInfo()}
        </div>

        <div class="dossier-section">
          <h3>Notable News</h3>
          ${cand.notable_news.filter(n => val(n.headline)).length ? `<ul class="claim-list">
            ${cand.notable_news.filter(n => val(n.headline)).map(n => `<li class="claim-item">
              <strong>${n.date}:</strong>
              ${val(n.source) ? `<a href="${n.source}" target="_blank" rel="noopener">${n.headline}</a>` : n.headline}
              — ${n.summary}
            </li>`).join('')}
          </ul>` : noInfo()}
        </div>

        <div class="dossier-section">
          <h3>Official Links</h3>
          ${val(cand.official_links?.website) ? `<p><a href="${cand.official_links.website}" target="_blank" rel="noopener">Campaign website</a></p>` : ''}
          ${cand.official_links?.social?.length ? `<p>${cand.official_links.social.map(s => `<a href="${s}" target="_blank" rel="noopener">${s}</a>`).join(', ')}</p>` : ''}
          ${!val(cand.official_links?.website) && !cand.official_links?.social?.length ? noInfo() : ''}
        </div>

        <div class="dossier-section">
          <h3>Sources</h3>
          <ul class="claim-list">
            ${cand.sources.map(s => `<li class="claim-item"><a href="${s}" target="_blank" rel="noopener">${s}</a></li>`).join('')}
          </ul>
          ${cand._failed_sources?.length ? `<p style="margin-top:.5rem;font-size:.82rem;color:var(--text-faint)">Could not verify: ${cand._failed_sources.join(', ')}</p>` : ''}
        </div>
      </div>`;

    app.querySelector('#pick-btn').addEventListener('click', () => {
      setPick(slug, cand.race_id, candidateId);
      render(true);
    });
  }

  render(isPicked);
}
```

- [ ] **Step 4: Run — verify pass**

```bash
npx playwright test tests/e2e/candidate.spec.js --project=desktop
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/js/candidate.js tests/e2e/candidate.spec.js
git commit -m "feat: candidate detail view — full dossier with sourced claims and pick button"
```

---

## Task 8: Compare view

**Files:**
- Create: `app/js/compare.js`
- Create: `tests/e2e/compare.spec.js`

The compare view reads optional `?a=<id>&b=<id>` query params from the URL hash to pre-select which two candidates to show.

- [ ] **Step 1: Write failing E2E tests**

`tests/e2e/compare.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import { setupFixtures } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await setupFixtures(page);
  await page.goto('http://localhost:8000/app/#/test-2026/compare/council-1-test?a=carol-council-test&b=dave-council-test');
});

test('shows two candidate names', async ({ page }) => {
  await expect(page.locator('.compare-col-name').nth(0)).toContainText('Carol');
  await expect(page.locator('.compare-col-name').nth(1)).toContainText('Dave');
});

test('shows field labels', async ({ page }) => {
  await expect(page.locator('.compare-field-label').first()).toBeVisible();
});

test('left prev button is disabled when at first candidate', async ({ page }) => {
  await expect(page.locator('.compare-nav-btn').nth(0)).toBeDisabled();
});

test('right next button cycles to next candidate', async ({ page }) => {
  // Right column shows Dave (index 1 of 3). Next → Eve.
  await page.locator('.compare-nav-btn').nth(3).click(); // right col's next
  await expect(page.locator('.compare-col-name').nth(1)).toContainText('Eve');
});

test('pin button locks left candidate while right cycles', async ({ page }) => {
  await page.locator('.pin-btn').first().click();
  await expect(page.locator('.pin-btn').first()).toHaveClass(/pinned/);
  // Cycle right col
  await page.locator('.compare-nav-btn').nth(3).click();
  // Left should still be Carol
  await expect(page.locator('.compare-col-name').nth(0)).toContainText('Carol');
});

test('shows compare progress', async ({ page }) => {
  await expect(page.locator('.compare-progress')).toBeVisible();
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npx playwright test tests/e2e/compare.spec.js --project=desktop
```

Expected: FAIL.

- [ ] **Step 3: Write `app/js/compare.js`**

```javascript
import { loadRaces, loadCandidate } from './data.js';
import { getPick, setPick } from './state.js';

function nav(slug, raceId) {
  return `<nav class="top-nav">
    <a href="#/${slug}/race/${raceId}">← Race</a>
    <span class="nav-brand">🗳 Voting God</span>
    <a href="#/${slug}/picks">My Picks →</a>
  </nav>`;
}

function candidateFields(cand) {
  const v = x => (x === 'No public information found' || !x) ? '<span class="no-info">—</span>' : x;
  return [
    { label: 'Party',           value: v(cand.party) },
    { label: 'Incumbent',       value: cand.incumbent ? 'Yes' : 'No' },
    { label: 'Summary',         value: v(cand.summary) },
    { label: 'Current role',    value: v(cand.background?.current_role) },
    { label: 'Education',       value: cand.background?.education?.join(', ') || '<span class="no-info">—</span>' },
    { label: 'Top issue (1)',   value: cand.stated_positions[0] ? `<strong>${cand.stated_positions[0].issue}:</strong> ${cand.stated_positions[0].position}` : '<span class="no-info">—</span>' },
    { label: 'Top issue (2)',   value: cand.stated_positions[1] ? `<strong>${cand.stated_positions[1].issue}:</strong> ${cand.stated_positions[1].position}` : '<span class="no-info">—</span>' },
    { label: 'Campaign raised', value: v(cand.campaign_finance?.total_raised) },
    { label: 'Endorsements',    value: cand.endorsements.length ? cand.endorsements.map(e => e.endorser).join(', ') : '<span class="no-info">—</span>' },
  ];
}

function renderCol(side, cand, allCandidates, idx, isPinned, slug) {
  const fields = candidateFields(cand);
  const isFirst = idx === 0;
  const isLast  = idx === allCandidates.length - 1;
  return `
    <div class="compare-col" data-side="${side}">
      <div class="compare-col-header">
        <button class="compare-nav-btn" data-side="${side}" data-dir="prev" ${isFirst ? 'disabled' : ''} aria-label="Previous candidate">◀</button>
        <span class="compare-col-name">${cand.name}</span>
        <button class="compare-nav-btn" data-side="${side}" data-dir="next" ${isLast ? 'disabled' : ''} aria-label="Next candidate">▶</button>
        <button class="pin-btn ${isPinned ? 'pinned' : ''}" data-side="${side}" aria-label="Pin ${cand.name}">📌 ${isPinned ? 'Pinned' : 'Pin'}</button>
      </div>
      ${fields.map(f => `
        <div class="compare-field">
          <div class="compare-field-label">${f.label}</div>
          <div class="compare-field-value">${f.value}</div>
        </div>`).join('')}
      <button class="btn btn-primary" data-pick-side="${side}" style="margin-top:.5rem;width:100%;">
        ${getPick(slug, cand.race_id) === cand.id ? '✓ Picked' : `Pick ${cand.name.split(' ')[0]}`}
      </button>
      <p style="margin-top:.35rem;text-align:center;"><a href="#/${slug}/candidate/${cand.id}" style="font-size:.82rem;">Full profile →</a></p>
    </div>`;
}

export async function renderCompare(app, slug, raceId) {
  const racesData = await loadRaces(slug);
  const race = racesData.races.find(r => r.id === raceId);
  if (!race) { app.innerHTML = '<p class="error">Race not found.</p>'; return; }

  // Parse ?a=id&b=id from hash query string
  const hashParts = window.location.hash.split('?');
  const params = new URLSearchParams(hashParts[1] || '');
  const initialA = params.get('a') || race.candidates[0].id;
  const initialB = params.get('b') || race.candidates[1]?.id || race.candidates[0].id;

  const allIds = race.candidates.map(c => c.id);
  let idxA = Math.max(0, allIds.indexOf(initialA));
  let idxB = Math.max(0, allIds.indexOf(initialB));
  let pinnedSide = null;

  const candCache = {};
  async function getCand(id) {
    if (!candCache[id]) candCache[id] = await loadCandidate(slug, id);
    return candCache[id];
  }

  async function renderView() {
    const [candA, candB] = await Promise.all([getCand(allIds[idxA]), getCand(allIds[idxB])]);

    const isMobile = window.innerWidth <= 640;
    const columnsClass = isMobile ? 'compare-columns-mobile' : 'compare-columns';

    app.innerHTML = `
      ${nav(slug, raceId)}
      <div class="compare-header">
        <span class="compare-title">${race.title}</span>
      </div>
      <div class="${columnsClass}">
        ${renderCol('left',  candA, race.candidates, idxA, pinnedSide === 'left',  slug)}
        ${renderCol('right', candB, race.candidates, idxB, pinnedSide === 'right', slug)}
      </div>
      <p class="compare-progress">${Math.max(idxA, idxB) + 1} of ${allIds.length} candidates</p>`;

    // Nav buttons
    app.querySelectorAll('.compare-nav-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const side = btn.dataset.side;
        const dir  = btn.dataset.dir;
        if (side === 'left'  && pinnedSide !== 'left')  idxA = dir === 'next' ? idxA + 1 : idxA - 1;
        if (side === 'right' && pinnedSide !== 'right') idxB = dir === 'next' ? idxB + 1 : idxB - 1;
        idxA = Math.max(0, Math.min(allIds.length - 1, idxA));
        idxB = Math.max(0, Math.min(allIds.length - 1, idxB));
        await renderView();
      });
    });

    // Pin buttons
    app.querySelectorAll('.pin-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const side = btn.dataset.side;
        pinnedSide = pinnedSide === side ? null : side;
        await renderView();
      });
    });

    // Pick buttons
    app.querySelectorAll('[data-pick-side]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cand = btn.dataset.pickSide === 'left' ? candA : candB;
        setPick(slug, raceId, cand.id);
        await renderView();
      });
    });
  }

  await renderView();
}
```

- [ ] **Step 4: Run — verify pass**

```bash
npx playwright test tests/e2e/compare.spec.js --project=desktop
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/js/compare.js tests/e2e/compare.spec.js
git commit -m "feat: compare view — 1v1 head-to-head with pin, cycle, and pick"
```

---

## Task 9: Picks summary and PDF export

**Files:**
- Create: `app/js/picks.js`
- Create: `tests/e2e/picks.spec.js`

- [ ] **Step 1: Write failing E2E tests**

`tests/e2e/picks.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import { setupFixtures } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await setupFixtures(page);
  // Set a pick in localStorage before navigating
  await page.addInitScript(() => {
    localStorage.setItem('vg:test-2026:picks', JSON.stringify({ 'mayor-test': 'alice-mayor-test' }));
    localStorage.setItem('vg:test-2026:notes', JSON.stringify({}));
  });
  await page.goto('http://localhost:8000/app/#/test-2026/picks');
});

test('shows all races', async ({ page }) => {
  await expect(page.locator('.pick-row')).toHaveCount(2);
});

test('shows picked candidate name for decided race', async ({ page }) => {
  const mayorRow = page.locator('.pick-row').filter({ hasText: 'Mayor' });
  await expect(mayorRow.locator('.pick-row-candidate')).toContainText('Alice Johnson');
});

test('shows unpicked label for undecided race', async ({ page }) => {
  const councilRow = page.locator('.pick-row').filter({ hasText: 'Council' });
  await expect(councilRow.locator('.pick-row-unpicked')).toBeVisible();
});

test('notes textarea is visible', async ({ page }) => {
  await expect(page.locator('textarea').first()).toBeVisible();
});

test('export button is present', async ({ page }) => {
  await expect(page.locator('button', { hasText: 'Export' })).toBeVisible();
});

test('import button is present', async ({ page }) => {
  await expect(page.locator('button', { hasText: 'Import' })).toBeVisible();
});

test('print button is present', async ({ page }) => {
  await expect(page.locator('button', { hasText: 'Print' })).toBeVisible();
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npx playwright test tests/e2e/picks.spec.js --project=desktop
```

Expected: FAIL.

- [ ] **Step 3: Write `app/js/picks.js`**

```javascript
import { loadRaces, loadCandidate } from './data.js';
import { getPick, getNote, setNote, exportState, importState } from './state.js';

function nav(slug) {
  return `<nav class="top-nav">
    <a href="#/${slug}">← Races</a>
    <span class="nav-brand">🗳 Voting God</span>
  </nav>`;
}

export async function renderPicks(app, slug) {
  const racesData = await loadRaces(slug);

  // Resolve picked candidate names
  const picks = {};
  for (const race of racesData.races) {
    const pickedId = getPick(slug, race.id);
    if (pickedId) {
      try {
        const cand = await loadCandidate(slug, pickedId);
        picks[race.id] = cand;
      } catch { /* candidate file may not exist */ }
    }
  }

  function render() {
    app.innerHTML = `
      ${nav(slug)}
      <div class="picks-header">
        <h1>My Picks</h1>
        <button class="btn btn-secondary" id="btn-export">Export picks</button>
        <button class="btn btn-secondary" id="btn-import">Import picks</button>
        <button class="btn btn-primary no-print" id="btn-print">Print / Save PDF</button>
      </div>
      <p style="color:var(--text-muted);font-size:.88rem;margin-bottom:1.5rem;">
        ${racesData.election_date} · ${racesData.jurisdiction}
      </p>
      ${racesData.races.map(race => {
        const picked = picks[race.id];
        const note = getNote(slug, race.id);
        return `<div class="pick-row" data-race-id="${race.id}">
          <div class="pick-row-race">${race.title}</div>
          ${picked
            ? `<div class="pick-row-candidate">✓ ${picked.name} <span style="font-weight:400;color:var(--text-muted)">(${picked.party})</span></div>`
            : `<div class="pick-row-unpicked">— Not decided yet</div>`}
          <div class="pick-note">
            <textarea rows="2" placeholder="Notes for this race (optional)" data-race-id="${race.id}">${note}</textarea>
          </div>
        </div>`;
      }).join('')}`;

    // Save notes on blur
    app.querySelectorAll('textarea[data-race-id]').forEach(ta => {
      ta.addEventListener('blur', () => setNote(slug, ta.dataset.raceId, ta.value));
    });

    // Export
    app.querySelector('#btn-export').addEventListener('click', () => {
      const data = exportState(slug);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `voting-god-picks-${slug}.json`;
      a.click();
    });

    // Import
    app.querySelector('#btn-import').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async e => {
        const text = await e.target.files[0].text();
        importState(slug, JSON.parse(text));
        window.location.reload();
      };
      input.click();
    });

    // Print
    app.querySelector('#btn-print').addEventListener('click', () => window.print());
  }

  render();
}
```

- [ ] **Step 4: Run — verify pass**

```bash
npx playwright test tests/e2e/picks.spec.js --project=desktop
```

Expected: all tests PASS.

- [ ] **Step 5: Run all E2E tests**

```bash
npm run test:e2e
```

Expected: all tests PASS across both desktop and mobile projects. Mobile compare tests will run the same specs; the swipe UX is CSS-only and does not require JS test interaction.

- [ ] **Step 6: Commit**

```bash
git add app/js/picks.js tests/e2e/picks.spec.js
git commit -m "feat: picks summary — all races, notes, export/import JSON, print to PDF"
```

---

## Task 10: Research prompts

**Files:**
- Create: `prompts/01-parse-ballot.md`
- Create: `prompts/02-research-position.md`
- Create: `prompts/03-research-candidate.md`

No automated tests for prompt content. Schema validation (Task 3) validates their output. The `/research-ballot` command (Task 11) chains them.

- [ ] **Step 1: Write `prompts/01-parse-ballot.md`**

````markdown
# Ballot Parser — Stage 1

You are Voting God's ballot parser. Read the provided ballot and produce a structured JSON file.

## Instructions

1. Read the ballot carefully. Identify every race (elected position) and every candidate listed.
2. Output ONLY valid JSON — no markdown fences, no explanation, no commentary. Just the JSON object.
3. If you cannot parse part of the ballot, add a description of the problem to `_warnings`. Do not guess or invent candidates.

## Output schema

```json
{
  "election_slug": "<YYYY-jurisdiction-type supplied by user>",
  "election_date": "<date from ballot, YYYY-MM-DD format>",
  "jurisdiction": "<e.g. Tennessee, Knox County, City of Memphis>",
  "races": [
    {
      "id": "<kebab-case unique identifier, e.g. us-senate-tn>",
      "title": "<full title as it appears on the ballot>",
      "primary_party": "<party name if this is a party primary, else null>",
      "candidates": [
        {
          "id": "<kebab-case: firstname-lastname-race-id, e.g. jane-doe-us-senate-tn>",
          "name": "<Full Name as on ballot>",
          "party": "<Party affiliation or 'Independent' or 'Nonpartisan'>",
          "incumbent": <true if labeled as incumbent on ballot, else false>
        }
      ]
    }
  ],
  "_warnings": ["<describe anything you could not parse or were uncertain about>"]
}
```

## Provided ballot

[The user will paste or attach the ballot content here.]
````

- [ ] **Step 2: Write `prompts/02-research-position.md`**

````markdown
# Position Researcher — Stage 2

You are Voting God's position researcher. Research the government position described below and explain it in plain language.

## Rules

- Use only factual, verifiable information. Cite every source.
- Write in plain language. Avoid jargon.
- Be neutral. Do not editorialize.
- Output ONLY valid JSON — no markdown fences, no commentary.

## Output schema

```json
{
  "id": "<race id from races.json>",
  "title": "<full title of the position>",
  "jurisdiction": "<Federal | State | County | Municipal | Judicial District | School District | etc.>",
  "term_length": "<e.g. '4 years'>",
  "salary": "<annual salary if public, else 'Not publicly listed'>",
  "responsibilities": "<One clear paragraph explaining the day-to-day job in plain English. What does this person actually do?>",
  "why_it_matters": "<One clear paragraph explaining how this office affects ordinary residents' daily lives.>",
  "key_powers": ["<concise bullet: specific power this office holds>", "..."],
  "this_cycle_context": "<One paragraph: what's at stake in THIS specific election cycle for this seat. Neutral framing only.>",
  "sources": ["<URL>", "..."],
  "last_researched": "<today's date YYYY-MM-DD>"
}
```

## Position to research

**Race ID:** [paste the race `id` field from races.json]
**Title:** [paste the race `title` field from races.json]
**Jurisdiction:** [paste from races.json or infer from ballot]
````

- [ ] **Step 3: Write `prompts/03-research-candidate.md`**

````markdown
# Candidate Researcher — Stage 3

You are Voting God. You are building a thorough, factual, sourced, unbiased dossier on a political candidate. This dossier will be used by voters to make informed decisions. Your integrity is on the line.

## Core rules — non-negotiable

**1. Every claim needs its own source URL.** If you cannot find a URL for a claim, drop the claim. Do not retain unsourced facts.

**2. Source priority order:**
   - Official campaign website
   - Ballotpedia, Vote Smart
   - FEC filings (for federal candidates), state campaign finance databases
   - AP, Reuters, local newspaper of record
   - Candidate's own official social media (clearly attributed)
   - Other credible news outlets
   - Partisan blogs / advocacy sites — only as last resort, labeled in `_failed_sources` comment

**3. Neutral language.** The words "controversial," "extreme," "moderate," "radical," "progressive," "establishment," and similar characterizations are FORBIDDEN unless they appear inside a direct sourced quote. Report what the candidate said and did, not your characterization of it.

**4. Both-sides news rule (strict).** Actively search for BOTH positive coverage AND critical coverage. If both exist in credible sources, both MUST appear in `notable_news`. Skewing in either direction is a failure.

**5. Equal coverage.** Every field in the schema must be present. If you genuinely cannot find information for a field, use the exact string `"No public information found"` for string fields or `[]` for array fields. Never omit a field.

**6. Stated positions in the candidate's own words.** Quote or closely paraphrase the candidate's own stated language. Do not summarize their positions through your own framing.

**7. Citation failures.** If a source was unreachable or paywalled, add its URL to `_failed_sources`. Do not drop the source silently.

## Output schema

Output ONLY valid JSON — no markdown fences, no explanation.

```json
{
  "id": "<candidate id from races.json>",
  "name": "<Full Name>",
  "race_id": "<race id>",
  "party": "<party>",
  "incumbent": <true|false>,
  "summary": "<2-3 sentence neutral overview of who this person is and why they are running>",
  "background": {
    "current_role": "<their role as of today, or 'No public information found'>",
    "career": ["<job title, employer, years>", "..."],
    "education": ["<degree, institution, year>", "..."],
    "prior_offices": ["<office, years>", "..."]
  },
  "track_record": [
    { "claim": "<specific, verifiable thing they did — bill sponsored, vote taken, accomplishment, etc.>", "source": "<URL>" }
  ],
  "stated_positions": [
    { "issue": "<issue area>", "position": "<their stated position, in their words where possible>", "source": "<URL>" }
  ],
  "endorsements": [
    { "endorser": "<organization or individual name>", "source": "<URL>" }
  ],
  "campaign_finance": {
    "total_raised": "<dollar amount or 'No public information found'>",
    "top_donors_or_sectors": ["<donor or sector name>", "..."],
    "source": "<URL to filing or database>"
  },
  "notable_news": [
    { "headline": "<exact headline>", "date": "<YYYY-MM-DD>", "summary": "<one sentence>", "source": "<URL>" }
  ],
  "official_links": {
    "website": "<URL or 'No public information found'>",
    "social": ["<URL>", "..."]
  },
  "sources": ["<all URLs consulted>"],
  "_failed_sources": ["<URLs that were unreachable or paywalled>"],
  "last_researched": "<today's date YYYY-MM-DD>"
}
```

## Candidate to research

**Name:** [paste candidate name]
**Race:** [paste race title and jurisdiction]
**Party:** [paste party]
**Incumbent:** [yes/no]
**Election date:** [date]
````

- [ ] **Step 4: Validate prompt output with schema tests**

After running the prompts manually for the first time, validate the output:

```bash
# Copy output JSON to data/<slug>/candidates/<id>.json, then:
npm run test:schema
```

Expected: PASS if the LLM respected the schema.

- [ ] **Step 5: Commit**

```bash
git add prompts/
git commit -m "feat: model-portable research prompts for ballot parsing, positions, and candidates"
```

---

## Task 11: Slash commands

**Files:**
- Create: `.claude/commands/research-ballot.md`
- Create: `.claude/commands/explain.md`

- [ ] **Step 1: Write `.claude/commands/research-ballot.md`**

````markdown
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
````

- [ ] **Step 2: Write `.claude/commands/explain.md`**

````markdown
You are the Voting God. You are omniscient on all matters of the ballot — but ONLY what has been researched and placed before you in the data files. Speak with calm authority. Be concise. Never speculate beyond the scrolls.

The user wants to know: **$ARGUMENTS**

## Your task

1. Parse the user's question to identify whether they are asking about a candidate, a race/position, or an election generally.
2. Find the relevant JSON file(s) in `data/`:
   - For a candidate: `data/<slug>/candidates/<id>.json`
   - For a position: `data/<slug>/positions/<id>.json`
   - For a race list: `data/<slug>/races.json`
3. Answer the question using ONLY information present in those files. Do not add facts from your training data, do not search the web.
4. If the answer is not in the files, say exactly: "The scrolls are silent on this matter — that information was not found during research."
5. Cite the source URL for every factual claim you make, exactly as it appears in the JSON.

## Tone

You are an ancient, authoritative civic oracle. Factual. Direct. Never partisan. The voter makes their own decisions — you only illuminate what was found.
````

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/
git commit -m "feat: slash commands — /research-ballot pipeline and /explain oracle"
```

---

## Task 12: CLAUDE.md and README

**Files:**
- Create: `CLAUDE.md`
- Create: `README.md`

- [ ] **Step 1: Write `CLAUDE.md`**

```markdown
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
```

- [ ] **Step 2: Write `README.md`**

```markdown
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
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all schema and E2E tests PASS.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "feat: CLAUDE.md and README — setup, commands, architecture guide"
```

- [ ] **Step 5: Push to GitHub**

```bash
git push
```

---

## Self-Review Notes

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Sample ballot input | Task 11 (command), Task 10 (prompts) |
| 3-stage research pipeline | Task 10, Task 11 |
| `races.json`, `positions/`, `candidates/` schemas | Task 2 (fixtures), Task 3 (validation) |
| Schema rules (citations, equal coverage, neutral language) | Task 10 (prompt 03) |
| Static viewer, no build step | Task 4 |
| Hash-based routing | Task 4 |
| Home view with status pills | Task 5 |
| Race page: position info first | Task 6 |
| Candidate detail: all sections, sourced claims | Task 7 |
| Compare: 1v1 with pin and cycle | Task 8 |
| Mobile responsive + mobile compare (scroll snap) | CSS in Task 4, tested via `mobile` Playwright project |
| Picks persistence in localStorage | Task 4 (state.js), Task 9 |
| Export/import picks JSON | Task 9 |
| PDF export via print stylesheet | Task 4 (CSS), Task 9 (print button) |
| Multi-election manifest + picker | Task 2 (index.json), Task 5 (home.js) |
| `Limited info available` badge | Task 6 (race.js via `limitedInfoWarning`) |
| `_failed_sources` display | Task 7 (candidate.js) |
| `/explain` conversational command | Task 11 |
| Model-portable prompts + README | Task 10, Task 12 |
| CLAUDE.md | Task 12 |

**All spec requirements are covered.**
