import { loadCandidate } from './data.js';
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
