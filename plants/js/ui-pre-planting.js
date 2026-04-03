/* ═══════════════════════════════════════════════════════
   ui-pre-planting.js
   Stage 4: Pre-planting decisions
   Calls P3 (Stage 1), renders decision cards,
   tracks completion, enables "Next Stage" button
   ═══════════════════════════════════════════════════════ */

'use strict';

const PrePlantingUI = (() => {

  const GROWTH_STAGE = 1; // P3 stage number

  // ─── Init ─────────────────────────────────────────────
  async function init() {
    const container = document.getElementById('pre-planting-ui');
    if (!container) return;

    container.innerHTML = buildLoadingHTML();

    try {
      showLoading('GrowBot is preparing your pre-planting guide...');
      const guide = await GeminiAPI.callGemini('p3-stage-guide', {
        PLANT_NAME:        SimState.plant.name,
        PLANT_CATEGORY:    SimState.plant.category,
        CURRENT_STAGE:     `${GROWTH_STAGE} — Pre-Planting (soil preparation, bed setup)`,
        LOCATION_PROFILE:  JSON.stringify(buildLocationSummary()),
        CURRENT_SCORES:    JSON.stringify(SimState.scores),
        DECISIONS_HISTORY: getDecisionsSummary(),
      });
      hideLoading();

      if (!guide) {
        container.innerHTML = buildErrorHTML();
        return;
      }

      SimState.stageGuide = guide;
      renderDecisionCards(container, guide, GROWTH_STAGE);

    } catch (err) {
      hideLoading();
      container.innerHTML = buildErrorHTML();
    }
  }

  // ─── Render decision cards ─────────────────────────────
  function renderDecisionCards(container, guide, growthStage) {
    const { decisions, care_tips, upcoming_alert } = guide;
    const answeredMap = {}; // decisionId → chosen optionId

    container.innerHTML = `
      ${upcoming_alert?.type !== 'none' && upcoming_alert?.message ? `
        <div class="alert-box">⚠️ ${escapeHtml(upcoming_alert.message)}</div>
      ` : ''}

      <div class="decision-cards" id="decision-cards-${growthStage}">
        ${decisions.map(d => buildDecisionCard(d)).join('')}
      </div>

      ${care_tips?.length ? `
        <div class="care-tips-section">
          <h3 class="section-label">💡 Care Tips</h3>
          <div class="care-tips">
            ${care_tips.map(t => `
              <div class="care-tip">
                <span class="care-tip-icon">${tipIcon(t.category)}</span>
                <span>${escapeHtml(t.tip)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;

    // Wire option clicks
    wireDecisionCards(container, decisions, answeredMap, growthStage);
  }

  // ─── Build single decision card HTML ─────────────────
  function buildDecisionCard(decision) {
    return `
      <div class="decision-card" id="dc-${decision.id}" data-decision="${decision.id}">
        <div class="decision-card-title">${escapeHtml(decision.title)}</div>
        <div class="decision-card-desc">${escapeHtml(decision.description)}</div>
        <div class="decision-options" data-decision="${decision.id}">
          ${decision.options.map(opt => buildOptionTile(opt)).join('')}
        </div>
      </div>
    `;
  }

  function buildOptionTile(opt) {
    const effects  = opt.effects || {};
    const chips    = buildEffectChips(effects);
    const costLabel = opt.cost_indicator ? `💰 ${capitalize(opt.cost_indicator)}` : '';

    return `
      <button
        class="decision-option"
        data-option="${opt.id}"
        data-decision-option
      >
        <span class="option-label">${escapeHtml(opt.label)}</span>
        <div class="option-effects">${chips}</div>
        ${costLabel ? `<span class="option-cost">${costLabel}</span>` : ''}
        <span class="option-why">${escapeHtml(opt.why || '')}</span>
      </button>
    `;
  }

  function buildEffectChips(effects) {
    const map = {
      soil_health:    '🪨',
      plant_vitality: '💚',
      water_balance:  '💧',
      ecosystem:      '🌍',
    };
    return Object.entries(effects).filter(([,v]) => v !== 0).map(([key, val]) => {
      const cls = val > 0 ? 'pos' : val < 0 ? 'neg' : 'neu';
      const sign = val > 0 ? '+' : '';
      return `<span class="effect-chip ${cls}">${map[key] || ''}${sign}${val}</span>`;
    }).join('');
  }

  // ─── Wire decision card interactions ─────────────────
  function wireDecisionCards(container, decisions, answeredMap, growthStage) {
    container.addEventListener('click', (e) => {
      const optBtn = e.target.closest('[data-decision-option]');
      if (!optBtn) return;

      const optId    = optBtn.dataset.option;
      const card     = optBtn.closest('.decision-card');
      const decId    = card?.dataset.decision;
      if (!decId) return;

      const decision = decisions.find(d => d.id === decId);
      const option   = decision?.options.find(o => o.id === optId);
      if (!decision || !option) return;

      // If this decision was already answered, reverse previous effects
      if (answeredMap[decId]) {
        const prev = decision.options.find(o => o.id === answeredMap[decId]);
        if (prev?.effects) {
          const reversed = Object.fromEntries(
            Object.entries(prev.effects).map(([k,v]) => [k, -v])
          );
          updateScores(reversedToScoreKeys(reversed));
        }
      }

      // Apply new effects
      const effects = option.effects || {};
      applyDecision(decId, optId, option);

      // Track answer
      answeredMap[decId] = optId;

      // Update UI
      card.classList.add('answered');
      card.querySelectorAll('.decision-option').forEach(b => {
        b.classList.toggle('selected', b.dataset.option === optId);
      });

      // Check if all decisions answered
      const allAnswered = decisions.every(d => answeredMap[d.id]);
      if (allAnswered) {
        SimState.stageDecisionsComplete[growthStage] = true;
        App.enableNextBtn(4, true);
      }
    });
  }

  // ─── Helpers ──────────────────────────────────────────
  function reversedToScoreKeys(effects) {
    const keyMap = {
      soil_health: 'soilHealth', plant_vitality: 'plantVitality',
      water_balance: 'waterBalance', ecosystem: 'ecosystem'
    };
    return Object.fromEntries(
      Object.entries(effects).map(([k,v]) => [keyMap[k] || k, v])
    );
  }

  function tipIcon(category) {
    const icons = { watering: '💧', nutrition: '🧪', pest: '🐛', pruning: '✂️', general: '💡' };
    return icons[category] || '💡';
  }

  function capitalize(str) {
    return str ? str[0].toUpperCase() + str.slice(1) : '';
  }

  function buildLocationSummary() {
    const p = SimState.location.locationProfile;
    if (!p) return { name: SimState.location.name, country: SimState.location.country };
    return {
      name:         p.location_profile?.name,
      climate_zone: p.location_profile?.climate_zone,
      soil_type:    p.soil_profile?.type,
      current_season: p.location_profile?.growing_season?.current_season,
    };
  }

  function buildLoadingHTML() {
    return `<div class="stage-loading"><p class="text-muted">Loading growing guide...</p></div>`;
  }

  function buildErrorHTML() {
    return `
      <div class="info-box">
        <strong>GrowBot is unavailable.</strong>
        You can still proceed — make your decisions when GrowBot comes back online.
      </div>
      <div style="margin-top:16px">
        <button class="btn btn-ghost" onclick="PrePlantingUI.init()">Try again</button>
      </div>
    `;
  }

  // ─── Public API ───────────────────────────────────────
  return { init };

})();
