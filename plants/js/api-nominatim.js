/* ═══════════════════════════════════════════════════════
   api-nominatim.js
   Nominatim (OpenStreetMap) geocoding + autocomplete
   - 500ms debounce
   - Custom User-Agent header (required by Nominatim policy)
   - sessionStorage caching
   ═══════════════════════════════════════════════════════ */

'use strict';

const NominatimAPI = (() => {

  const BASE_URL    = 'https://nominatim.openstreetmap.org/search';
  const USER_AGENT  = 'PradeepSandbox-PlantSim/1.0';
  const CACHE_KEY   = 'nominatim_cache';
  const DEBOUNCE_MS = 500;

  let debounceTimer = null;

  // ─── Load/Save cache from sessionStorage ──────────────
  function getCache() {
    try {
      return JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function setCache(query, results) {
    try {
      const cache = getCache();
      cache[query.toLowerCase()] = results;
      // Keep cache lean — max 50 entries
      const keys = Object.keys(cache);
      if (keys.length > 50) delete cache[keys[0]];
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      // sessionStorage full or unavailable — silently fail
    }
  }

  // ─── Core search function ─────────────────────────────
  async function searchLocation(query) {
    query = query.trim();
    if (query.length < 2) return [];

    const cacheKey = query.toLowerCase();
    const cached = getCache()[cacheKey];
    if (cached) return cached;

    const params = new URLSearchParams({
      q:              query,
      format:         'json',
      limit:          '5',
      addressdetails: '1',
      'accept-language': 'en',
    });

    const res = await fetch(`${BASE_URL}?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en',
      }
    });

    if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);

    const data = await res.json();

    const results = data.map(item => {
      const addr = item.address || {};
      // Build clean display name
      const parts = [
        addr.city || addr.town || addr.village || addr.county || addr.state_district,
        addr.state,
        addr.country
      ].filter(Boolean);

      return {
        name:      parts.join(', ') || item.display_name,
        fullName:  item.display_name,
        lat:       parseFloat(item.lat),
        lon:       parseFloat(item.lon),
        country:   addr.country || '',
        countryCode: (addr.country_code || '').toUpperCase(),
        type:      item.type,
      };
    });

    setCache(cacheKey, results);
    return results;
  }

  // ─── Debounced version for input handlers ─────────────
  function searchDebounced(query, callback) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        const results = await searchLocation(query);
        callback(null, results);
      } catch (err) {
        callback(err, []);
      }
    }, DEBOUNCE_MS);
  }

  // ─── Public API ───────────────────────────────────────
  return {
    searchLocation,
    searchDebounced,
  };

})();
