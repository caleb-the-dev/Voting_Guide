import { loadRaces, loadCandidate } from './data.js';
import { getPick, getNote, setNote, exportState, importState } from './state.js';

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function nav(slug) {
  return `<nav class="top-nav">
    <a href="#/${slug}">← Races</a>
    <span class="nav-brand">🗳 Voting God</span>
  </nav>`;
}

export async function renderPicks(app, slug) {
  const racesData = await loadRaces(slug);

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
        ${esc(racesData.election_date)} · ${esc(racesData.jurisdiction)}
      </p>
      ${racesData.races.map(race => {
        const picked = picks[race.id];
        const note = getNote(slug, race.id);
        return `<div class="pick-row" data-race-id="${esc(race.id)}">
          <div class="pick-row-race">${esc(race.title)}</div>
          ${picked
            ? `<div class="pick-row-candidate">✓ ${esc(picked.name)} <span style="font-weight:400;color:var(--text-muted)">(${esc(picked.party)})</span></div>`
            : `<div class="pick-row-unpicked">— Not decided yet</div>`}
          <div class="pick-note">
            <textarea rows="2" placeholder="Notes for this race (optional)" data-race-id="${esc(race.id)}">${esc(note)}</textarea>
          </div>
        </div>`;
      }).join('')}`;

    app.querySelectorAll('textarea[data-race-id]').forEach(ta => {
      ta.addEventListener('blur', () => setNote(slug, ta.dataset.raceId, ta.value));
    });

    app.querySelector('#btn-export').addEventListener('click', () => {
      const data = exportState(slug);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `voting-god-picks-${slug}.json`;
      a.click();
    });

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

    app.querySelector('#btn-print').addEventListener('click', () => window.print());
  }

  render();
}
