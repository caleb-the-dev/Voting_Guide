const key = (slug, type) => `vg:${slug}:${type}`;
const getObj = k => { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch { return {}; } };
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
