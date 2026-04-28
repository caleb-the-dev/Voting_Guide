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
