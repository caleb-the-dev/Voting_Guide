import { loadRaces, loadCandidate } from './data.js';
import { getPick, setPick } from './state.js';

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function nav(slug, raceId) {
  return `<nav class="top-nav">
    <a href="#/${slug}/race/${raceId}">← Race</a>
    <span class="nav-brand">🗳 Voting God</span>
    <a href="#/${slug}/picks">My Picks →</a>
  </nav>`;
}

function candidateFields(cand) {
  const v = x => (x === 'No public information found' || !x) ? '<span class="no-info">—</span>' : esc(x);
  return [
    { label: 'Party',           value: v(cand.party) },
    { label: 'Incumbent',       value: cand.incumbent ? 'Yes' : 'No' },
    { label: 'Summary',         value: v(cand.summary) },
    { label: 'Current role',    value: v(cand.background?.current_role) },
    { label: 'Education',       value: cand.background?.education?.length ? esc(cand.background.education.join(', ')) : '<span class="no-info">—</span>' },
    { label: 'Top issue (1)',   value: cand.stated_positions[0] ? `<strong>${esc(cand.stated_positions[0].issue)}:</strong> ${esc(cand.stated_positions[0].position)}` : '<span class="no-info">—</span>' },
    { label: 'Top issue (2)',   value: cand.stated_positions[1] ? `<strong>${esc(cand.stated_positions[1].issue)}:</strong> ${esc(cand.stated_positions[1].position)}` : '<span class="no-info">—</span>' },
    { label: 'Campaign raised', value: v(cand.campaign_finance?.total_raised) },
    { label: 'Endorsements',    value: cand.endorsements.length ? esc(cand.endorsements.map(e => e.endorser).join(', ')) : '<span class="no-info">—</span>' },
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
        <span class="compare-col-name">${esc(cand.name)}</span>
        <button class="compare-nav-btn" data-side="${side}" data-dir="next" ${isLast ? 'disabled' : ''} aria-label="Next candidate">▶</button>
        <button class="pin-btn ${isPinned ? 'pinned' : ''}" data-side="${side}" aria-label="Pin ${esc(cand.name)}">📌 ${isPinned ? 'Pinned' : 'Pin'}</button>
      </div>
      ${fields.map(f => `
        <div class="compare-field">
          <div class="compare-field-label">${f.label}</div>
          <div class="compare-field-value">${f.value}</div>
        </div>`).join('')}
      <button class="btn btn-primary" data-pick-side="${side}" style="margin-top:.5rem;width:100%;">
        ${getPick(slug, cand.race_id) === cand.id ? '✓ Picked' : `Pick ${esc(cand.name.split(' ')[0])}`}
      </button>
      <p style="margin-top:.35rem;text-align:center;"><a href="#/${slug}/candidate/${cand.id}" style="font-size:.82rem;">Full profile →</a></p>
    </div>`;
}

export async function renderCompare(app, slug, raceId) {
  const racesData = await loadRaces(slug);
  const race = racesData.races.find(r => r.id === raceId);
  if (!race) { app.innerHTML = '<p class="error">Race not found.</p>'; return; }

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
        <span class="compare-title">${esc(race.title)}</span>
      </div>
      <div class="${columnsClass}">
        ${renderCol('left',  candA, race.candidates, idxA, pinnedSide === 'left',  slug)}
        ${renderCol('right', candB, race.candidates, idxB, pinnedSide === 'right', slug)}
      </div>
      <p class="compare-progress">${Math.max(idxA, idxB) + 1} of ${allIds.length} candidates</p>`;

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

    app.querySelectorAll('.pin-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const side = btn.dataset.side;
        pinnedSide = pinnedSide === side ? null : side;
        await renderView();
      });
    });

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
