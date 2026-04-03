/* ═══════════════════════════════════════════════════════
   ui-location.js
   Stage 1: Location search UI
   - Autocomplete dropdown (Nominatim)
   - Location card after selection
   - Enables Stage 1 "Next" button
   ═══════════════════════════════════════════════════════ */

'use strict';

const LocationUI = (() => {

  let initialized = false;

  // ─── Init ─────────────────────────────────────────────
  function init() {
    if (initialized) return;
    initialized = true;

    const container = document.getElementById('location-ui');
    if (!container) return;

    container.innerHTML = buildHTML();
    wireEvents();
  }

  // ─── Build HTML ───────────────────────────────────────
  function buildHTML() {
    return `
      <div class="location-search-wrap">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            id="location-input"
            class="search-input"
            placeholder="Search for a city, town, or village..."
            autocomplete="off"
            spellcheck="false"
            aria-label="Search location"
            aria-autocomplete="list"
            aria-controls="location-dropdown"
          />
          <div class="search-spinner" id="loc-spinner" aria-hidden="true"></div>
        </div>
        <ul class="autocomplete-dropdown" id="location-dropdown" role="listbox" aria-label="Location suggestions"></ul>
      </div>

      <div id="location-card" class="location-card" style="display:none"></div>

      <div class="info-box" style="margin-top:16px">
        <strong>Why location matters:</strong> Your climate zone, annual rainfall, and soil type
        are all inferred from where you are. GrowBot uses this to score every plant's chances.
      </div>
    `;
  }

  // ─── Wire Events ──────────────────────────────────────
  function wireEvents() {
    const input    = document.getElementById('location-input');
    const dropdown = document.getElementById('location-dropdown');
    const spinner  = document.getElementById('loc-spinner');

    if (!input || !dropdown) return;

    // Input → debounced search
    input.addEventListener('input', () => {
      const q = input.value.trim();
      clearDropdown();

      if (q.length < 2) {
        spinner.style.display = 'none';
        return;
      }

      spinner.style.display = 'block';

      NominatimAPI.searchDebounced(q, (err, results) => {
        spinner.style.display = 'none';
        if (err || !results.length) {
          if (q.length >= 3) showNoResults();
          return;
        }
        renderDropdown(results);
      });
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.location-search-wrap')) {
        clearDropdown();
      }
    });

    // Keyboard navigation in dropdown
    input.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('[role="option"]');
      const active = dropdown.querySelector('[aria-selected="true"]');
      let idx = Array.from(items).indexOf(active);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        idx = Math.min(idx + 1, items.length - 1);
        items.forEach(i => i.setAttribute('aria-selected', 'false'));
        if (items[idx]) items[idx].setAttribute('aria-selected', 'true');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        idx = Math.max(idx - 1, 0);
        items.forEach(i => i.setAttribute('aria-selected', 'false'));
        if (items[idx]) items[idx].setAttribute('aria-selected', 'true');
      } else if (e.key === 'Enter') {
        const sel = dropdown.querySelector('[aria-selected="true"]');
        if (sel) sel.click();
      } else if (e.key === 'Escape') {
        clearDropdown();
      }
    });
  }

  // ─── Render Dropdown ──────────────────────────────────
  function renderDropdown(results) {
    const dropdown = document.getElementById('location-dropdown');
    if (!dropdown) return;

    dropdown.innerHTML = results.map((r, i) => `
      <li
        role="option"
        aria-selected="${i === 0 ? 'true' : 'false'}"
        class="dropdown-item"
        data-idx="${i}"
      >
        <span class="dropdown-item-icon">📍</span>
        <span class="dropdown-item-text">${escapeHtml(r.name)}</span>
        ${r.countryCode ? `<span class="dropdown-item-country">${escapeHtml(r.countryCode)}</span>` : ''}
      </li>
    `).join('');

    dropdown.style.display = 'block';

    // Wire item clicks
    dropdown.querySelectorAll('.dropdown-item').forEach((el, i) => {
      el.addEventListener('click', () => selectLocation(results[i]));
    });
  }

  function showNoResults() {
    const dropdown = document.getElementById('location-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = `<li class="dropdown-item dropdown-item--empty">No results found</li>`;
    dropdown.style.display = 'block';
  }

  function clearDropdown() {
    const dropdown = document.getElementById('location-dropdown');
    if (dropdown) {
      dropdown.innerHTML = '';
      dropdown.style.display = 'none';
    }
  }

  // ─── Select a Location ────────────────────────────────
  function selectLocation(loc) {
    // Save to SimState
    SimState.location.name    = loc.name;
    SimState.location.lat     = loc.lat;
    SimState.location.lon     = loc.lon;
    SimState.location.country = loc.country;

    // Update input
    const input = document.getElementById('location-input');
    if (input) input.value = loc.name;

    clearDropdown();

    // Show location card
    renderLocationCard(loc);

    // Enable Next button
    App.enableNextBtn(1, true);
  }

  // ─── Location Card ────────────────────────────────────
  function renderLocationCard(loc) {
    const card = document.getElementById('location-card');
    if (!card) return;

    const isIndia = loc.country?.toLowerCase().includes('india') ||
                    loc.countryCode === 'IN';

    card.innerHTML = `
      <div class="location-card-inner">
        <div class="location-card-main">
          <div class="location-card-name">📍 ${escapeHtml(loc.name)}</div>
          <div class="location-card-coords">
            <span class="text-mono">Lat: ${loc.lat.toFixed(4)}</span>
            <span class="text-mono">Lon: ${loc.lon.toFixed(4)}</span>
          </div>
          ${isIndia ? `<div class="location-card-tag">🇮🇳 India — Kharif/Rabi/Zaid growing seasons</div>` : ''}
        </div>
        <button class="btn btn-ghost btn-sm" id="loc-change-btn">Change</button>
      </div>
    `;

    card.style.display = 'block';

    document.getElementById('loc-change-btn')?.addEventListener('click', resetLocation);
  }

  // ─── Reset ────────────────────────────────────────────
  function resetLocation() {
    SimState.location = { name: '', lat: 0, lon: 0, country: '', climateData: null, locationProfile: null };

    const card = document.getElementById('location-card');
    if (card) card.style.display = 'none';

    const input = document.getElementById('location-input');
    if (input) { input.value = ''; input.focus(); }

    App.enableNextBtn(1, false);
  }

  // ─── Public API ───────────────────────────────────────
  return { init };

})();
