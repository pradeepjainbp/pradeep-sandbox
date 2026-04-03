/* ═══════════════════════════════════════════════════════
   ui-plant-picker.js
   Stage 3: Plant search + suitability display
   - Loads plants.json locally (no API call for search)
   - Multilingual search: EN, HI, KN, TA, TE, MR
   - Category tabs
   - Gemini P2 call on plant selection
   - Suitability card with score + alternatives
   ═══════════════════════════════════════════════════════ */

'use strict';

const PlantPickerUI = (() => {

  let allPlants    = [];
  let filteredPlants = [];
  let activeCategory = 'All';
  let initialized  = false;

  const CATEGORIES = ['All','Vegetable','Fruit','Flower','Tree','Indoor Plant','Herb','Spice','Cash Crop','Grain','Pulse'];

  // Score color thresholds
  const SCORE_COLOR = (s) =>
    s >= 80 ? '#22c55e' :
    s >= 60 ? '#84cc16' :
    s >= 40 ? '#eab308' :
    s >= 20 ? '#f97316' : '#ef4444';

  const SCORE_GRADE = (s) =>
    s >= 80 ? 'Excellent' :
    s >= 60 ? 'Good' :
    s >= 40 ? 'Fair' :
    s >= 20 ? 'Poor' : 'Not Recommended';

  // ─── Init ─────────────────────────────────────────────
  async function init() {
    if (!initialized) {
      await loadPlants();
      initialized = true;
    }

    const container = document.getElementById('plant-picker-ui');
    if (!container) return;

    filteredPlants = allPlants;
    container.innerHTML = buildHTML();
    wireEvents();
  }

  // ─── Load plants.json ─────────────────────────────────
  async function loadPlants() {
    if (allPlants.length) return;
    const res  = await fetch('data/plants.json');
    allPlants  = await res.json();
  }

  // ─── Build HTML ───────────────────────────────────────
  function buildHTML() {
    return `
      <div class="category-tabs" role="tablist" aria-label="Plant categories">
        ${CATEGORIES.map(c => `
          <button
            class="cat-tab ${c === activeCategory ? 'active' : ''}"
            role="tab"
            aria-selected="${c === activeCategory}"
            data-cat="${c}"
          >${c}</button>
        `).join('')}
      </div>

      <div class="search-input-wrap" style="margin: 16px 0">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          id="plant-input"
          class="search-input"
          placeholder="Search plants in English, हिंदी, ಕನ್ನಡ..."
          autocomplete="off"
          spellcheck="false"
        />
      </div>

      <div id="plant-results" class="plant-results"></div>

      <div class="suggest-row">
        <button class="btn btn-ghost" id="btn-suggest-plants">
          🤔 Suggest plants for my location
        </button>
      </div>

      <div id="suitability-card" class="suitability-card" style="display:none"></div>
    `;
  }

  // ─── Wire Events ──────────────────────────────────────
  function wireEvents() {
    // Category tabs
    document.querySelectorAll('.cat-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.cat;
        document.querySelectorAll('.cat-tab').forEach(b => {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-selected', b === btn);
        });
        applyFilters();
      });
    });

    // Search input
    const input = document.getElementById('plant-input');
    if (input) {
      input.addEventListener('input', debounce(() => applyFilters(), 200));
    }

    // Suggest button
    document.getElementById('btn-suggest-plants')?.addEventListener('click', suggestPlants);

    // Initial render
    renderResults(filteredPlants.slice(0, 20));
  }

  // ─── Filter logic ─────────────────────────────────────
  function applyFilters() {
    const query = document.getElementById('plant-input')?.value.trim().toLowerCase() || '';

    let list = allPlants;

    // Category filter
    if (activeCategory !== 'All') {
      list = list.filter(p => p.category === activeCategory);
    }

    // Search filter — match across all language fields
    if (query.length >= 1) {
      list = list.filter(p => {
        const haystack = [
          p.name_en, p.name_hi, p.name_kn, p.name_ta, p.name_te, p.name_mr,
          p.scientific, p.category, ...(p.tags || [])
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(query);
      });
    }

    filteredPlants = list;
    renderResults(list.slice(0, 20));
  }

  // ─── Render search results ────────────────────────────
  function renderResults(plants) {
    const container = document.getElementById('plant-results');
    if (!container) return;

    if (!plants.length) {
      container.innerHTML = `<p class="no-results">No plants found. Try a different search or category.</p>`;
      return;
    }

    container.innerHTML = plants.map(p => {
      const suit = p._suitabilityScore; // set after P2 call
      const scoreHtml = suit != null ? `
        <div class="plant-score-badge" style="background:${SCORE_COLOR(suit)}">
          ${suit}
        </div>
      ` : '';

      const localName = p.name_hi || p.name_kn || '';

      return `
        <div class="plant-result-item" data-id="${p.id}" tabindex="0" role="button" aria-label="Select ${p.name_en}">
          <div class="plant-result-emoji">${p.emoji || '🌿'}</div>
          <div class="plant-result-info">
            <div class="plant-result-name">${escapeHtml(p.name_en)}</div>
            ${localName ? `<div class="plant-result-local">${escapeHtml(localName)}</div>` : ''}
            <div class="plant-result-sci">${escapeHtml(p.scientific || '')}</div>
          </div>
          <div class="plant-result-right">
            ${scoreHtml}
            <div class="plant-cat-tag">${p.category}</div>
          </div>
        </div>
      `;
    }).join('');

    // Wire click + keyboard selection
    container.querySelectorAll('.plant-result-item').forEach(el => {
      const handler = () => selectPlant(el.dataset.id);
      el.addEventListener('click', handler);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(); });
    });
  }

  // ─── Select a plant ───────────────────────────────────
  async function selectPlant(id) {
    const plant = allPlants.find(p => p.id === id || p.id === parseInt(id, 10));
    if (!plant) return;

    // Highlight selected row
    document.querySelectorAll('.plant-result-item').forEach(el => {
      el.classList.toggle('selected', el.dataset.id == id);
    });

    // Save to SimState
    SimState.plant.id         = plant.id;
    SimState.plant.name       = plant.name_en;
    SimState.plant.scientific = plant.scientific || '';
    SimState.plant.category   = plant.category;
    SimState.plant.emoji      = plant.emoji || '🌿';

    // Call P2 via Gemini
    try {
      showLoading(`GrowBot is checking if ${plant.name_en} will thrive here...`);
      const p2 = await GeminiAPI.callGemini('p2-plant-match-score', {
        LOCATION_PROFILE: JSON.stringify(SimState.location.locationProfile),
        PLANT_NAME:       plant.name_en,
        PLANT_SCIENTIFIC: plant.scientific || plant.name_en,
        PLANT_CATEGORY:   plant.category,
      });

      if (p2) {
        SimState.plant.suitability = p2;
        // Initialize plant vitality from P2
        SimState.scores.plantVitality = p2.initial_plant_vitality ?? 50;
        // Refresh scores display
        if (typeof ScoresUI !== 'undefined') ScoresUI.render();
        renderSuitabilityCard(p2, plant);
      }
      hideLoading();
      App.enableNextBtn(3, true);

    } catch (err) {
      hideLoading();
      showToast('GrowBot had trouble scoring this plant — you can still proceed', 'error');
      App.enableNextBtn(3, true);
    }
  }

  // ─── Suitability Card ─────────────────────────────────
  function renderSuitabilityCard(p2, plant) {
    const card = document.getElementById('suitability-card');
    if (!card) return;

    const s   = p2.suitability;
    const req = p2.growing_requirements;
    const kf  = p2.key_factors;

    card.innerHTML = `
      <div class="suit-card-header">
        <span class="suit-emoji">${plant.emoji || '🌿'}</span>
        <div>
          <div class="suit-plant-name">${escapeHtml(plant.name_en)}</div>
          <div class="suit-plant-sci">${escapeHtml(plant.scientific || '')}</div>
        </div>
        <div class="suit-grade-badge" style="background:${s.color || SCORE_COLOR(s.score)}">
          ${SCORE_GRADE(s.score)} · ${s.score}/100
        </div>
      </div>

      <div class="suit-score-bar-wrap">
        <div class="suit-score-bar">
          <div class="suit-score-fill" style="width:${s.score}%;background:${s.color || SCORE_COLOR(s.score)}"></div>
        </div>
      </div>

      <p class="suit-why">"${escapeHtml(s.why || '')}"</p>

      ${kf ? `
        <div class="suit-factors">
          ${buildFactor('🌡️', 'Temp', kf.temperature_match)}
          ${buildFactor('💧', 'Water', kf.water_needs_match)}
          ${buildFactor('🪨', 'Soil', kf.soil_match)}
          ${buildFactor('📅', 'Season', kf.season_match)}
        </div>
      ` : ''}

      ${req ? `
        <div class="suit-requirements">
          <span>☀️ ${req.sunlight_hours}h sun/day</span>
          <span>⏱ ${req.days_to_harvest} days to harvest</span>
          <span>↔️ ${req.spacing_cm}cm spacing</span>
          <span>💧 ${req.water_needs} water</span>
        </div>
      ` : ''}

      ${p2.alternatives?.length ? `
        <div class="suit-alternatives">
          <div class="suit-alt-title">Better alternatives:</div>
          ${p2.alternatives.map(a => `
            <div class="suit-alt-item" data-name="${escapeHtml(a.name)}">
              <span>${escapeHtml(a.name)}</span>
              <span class="suit-alt-score" style="color:${SCORE_COLOR(a.score)}">${a.score}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;

    card.style.display = 'block';

    // Wire alternative clicks
    card.querySelectorAll('.suit-alt-item').forEach(el => {
      el.addEventListener('click', () => {
        const name = el.dataset.name;
        const match = allPlants.find(p => p.name_en.toLowerCase() === name.toLowerCase());
        if (match) {
          const input = document.getElementById('plant-input');
          if (input) { input.value = name; applyFilters(); }
          selectPlant(String(match.id));
        }
      });
    });
  }

  function buildFactor(icon, label, factor) {
    if (!factor) return '';
    return `
      <div class="suit-factor">
        <span>${icon} ${label}</span>
        <div class="factor-bar">
          <div class="factor-fill" style="width:${factor.score}%;background:${SCORE_COLOR(factor.score)}"></div>
        </div>
        <span class="factor-score">${factor.score}</span>
      </div>
    `;
  }

  // ─── Suggest plants mode ──────────────────────────────
  async function suggestPlants() {
    try {
      showLoading('GrowBot is finding the best plants for your location...');
      const p2 = await GeminiAPI.callGemini('p2-plant-match-suggest', {
        LOCATION_PROFILE: JSON.stringify(SimState.location.locationProfile),
      });

      hideLoading();

      if (!p2?.suggestions?.length) {
        showToast('GrowBot couldn\'t suggest plants right now', 'error');
        return;
      }

      // Annotate plants with suitability scores
      p2.suggestions.forEach(sug => {
        const match = allPlants.find(p =>
          p.name_en && p.name_en.toLowerCase() === sug.name.toLowerCase()
        );
        if (match) match._suitabilityScore = sug.score;
      });

      // Pre-fill search with nothing, show suggested plants
      const input = document.getElementById('plant-input');
      if (input) input.value = '';

      const suggested = p2.suggestions
        .map(sug => allPlants.find(p => p.name_en && p.name_en.toLowerCase() === sug.name.toLowerCase()))
        .filter(Boolean);

      renderResults(suggested.length ? suggested : filteredPlants.slice(0, 20));

    } catch (err) {
      hideLoading();
      console.error('suggestPlants error:', err);
      showToast('GrowBot had trouble — please try again', 'error');
    }
  }

  // ─── Public API ───────────────────────────────────────
  return { init };

})();
