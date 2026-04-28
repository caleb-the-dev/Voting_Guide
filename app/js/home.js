import { loadElections, loadRaces } from './data.js';
import { getPick } from './state.js';

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

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
          <a class="race-link" href="#/${e.slug}">${esc(e.label)}</a>
          <span class="race-meta">${esc(e.date)}</span>
        </li>`).join('')}
    </ul>`;
}

async function renderRaceList(app, slug, racesData) {
  const decidedCount = racesData.races.filter(r => raceStatus(slug, r) === 'decided').length;
  const total = racesData.races.length;

  app.innerHTML = `
    ${nav(slug)}
    <div class="race-list-header">
      <h2>${esc(racesData.jurisdiction)} · ${esc(racesData.election_date)}</h2>
      <span class="progress">${decidedCount} of ${total} races decided</span>
    </div>
    <ul class="races">
      ${racesData.races.map(race => {
        const status = raceStatus(slug, race);
        return `<li class="race-row">
          <a class="race-link" href="#/${slug}/race/${race.id}">
            ${esc(race.title)}
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
      window.location.replace(`#/${elections[0].slug}`);
      return;
    }
    await renderElectionPicker(app, elections);
    return;
  }

  const racesData = await loadRaces(slug);
  await renderRaceList(app, slug, racesData);
}
