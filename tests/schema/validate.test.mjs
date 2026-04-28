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

function assertValidRaces(races, filePath) {
  assert.ok(typeof races.election_slug === 'string', `${filePath}: election_slug must be a string`);
  assert.ok(typeof races.election_date === 'string', `${filePath}: election_date must be a string`);
  assert.ok(typeof races.jurisdiction === 'string' && races.jurisdiction.length > 0, `${filePath}: jurisdiction must be a non-empty string`);
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

function assertValidPosition(pos, filePath) {
  const required = ['id', 'title', 'jurisdiction', 'term_length', 'salary', 'responsibilities', 'why_it_matters', 'this_cycle_context'];
  for (const field of required) {
    assert.ok(typeof pos[field] === 'string' && pos[field].length > 0, `${filePath}: position.${field} must be a non-empty string`);
  }
  assert.ok(Array.isArray(pos.key_powers), `${filePath}: key_powers must be an array`);
  assert.ok(Array.isArray(pos.sources), `${filePath}: sources must be an array`);
}

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
  for (const item of c.track_record) {
    assert.ok(typeof item.claim === 'string', `${filePath}: track_record item must have a claim string`);
    assert.ok(typeof item.source === 'string', `${filePath}: track_record item must have a source string`);
  }
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
