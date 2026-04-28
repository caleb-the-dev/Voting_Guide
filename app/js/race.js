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

  const bar = app.querySelector('#compare-bar');
  const checks = () => [...app.querySelectorAll('input[type=checkbox]:checked')].map(c => c.dataset.id);

  function updateBar() {
    const checked = checks();
    if (checked.length >= 2) {
      const a = document.createElement('a');
      a.href = `#/${slug}/compare/${raceId}?a=${checked[0]}&b=${checked[1]}`;
      a.className = 'btn btn-primary btn-compare';
      a.textContent = 'Compare selected →';
      bar.innerHTML = '';
      bar.appendChild(a);
    } else {
      bar.innerHTML = '';
    }
  }

  app.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (checks().length > 2) cb.checked = false;
      updateBar();
    });
  });
}
