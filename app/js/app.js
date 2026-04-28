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
      await renderCompare(app, parts[0], parts[2].split('?')[0]);
    } else {
      app.innerHTML = '<p class="error">Page not found.</p>';
    }
  } catch (err) {
    const p = document.createElement('p');
    p.className = 'error';
    p.textContent = `Error: ${err.message}`;
    app.innerHTML = '';
    app.appendChild(p);
    console.error(err);
  }
}

window.addEventListener('hashchange', () => router());
window.addEventListener('DOMContentLoaded', () => router());
