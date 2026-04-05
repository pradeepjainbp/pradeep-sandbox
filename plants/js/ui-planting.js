/* ═══════════════════════════════════════════════════════
   ui-planting.js
   Stage 5: Planting decisions
   Calls P3 (Stage 2), renders decision cards,
   enables "Start Growing" button when all answered
   ═══════════════════════════════════════════════════════ */

'use strict';

const PlantingUI = (() => {

  const GROWTH_STAGE = 2; // P3 stage number

  // ─── Init ─────────────────────────────────────────────
  async function init() {
    const container = document.getElementById('planting-ui');
    if (!container) return;

    // Apply passive vitality drift from pre-planting stage
    passiveVitalityAdjustment();

    container.innerHTML = buildLoadingHTML();

    try {
      showLoading('GrowBot is preparing your planting guide...');
      const guide = await GeminiAPI.callGemini('p3-stage-guide', {
        PLANT_NAME:        SimState.plant.name,
        PLANT_CATEGORY:    SimState.plant.category,
        CURRENT_STAGE:     `${GROWTH_STAGE} — Planting (seed/seedling, spacing, depth, initial care)`,
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

      // Update plant visual to "planting" state
      if (typeof PlantVisualUI !== 'undefined') {
        PlantVisualUI.setStage('planting');
      }

      renderDecisionCards(container, guide);

    } catch (err) {
      hideLoading();
      container.innerHTML = buildErrorHTML();
    }
  }

  // ─── Render (reuses same pattern as PrePlantingUI) ────
  function renderDecisionCards(container, guide) {
    const { decisions, care_tips, upcoming_alert } = guide;
    const answeredMap = {};

    container.innerHTML = `
      ${upcoming_alert?.type !== 'none' && upcoming_alert?.message ? `
        <div class="alert-box">⚠️ ${escapeHtml(upcoming_alert.message)}</div>
      ` : ''}

      <div class="decision-cards" id="decision-cards-${GROWTH_STAGE}">
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

    wireDecisionCards(container, decisions, answeredMap);
  }

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
    const chips   = buildEffectChips(opt.effects || {});
    const rupees  = opt.cost_rupees ?? 0;
    const costText = rupees > 0
      ? `─₹${rupees.toLocaleString('en-IN')}`
      : 'Free';
    const costCls = rupees > 0 ? 'cost-spend' : 'cost-free';
    return `
      <button
        class="decision-option"
        data-option="${opt.id}"
        data-cost-rupees="${rupees}"
        data-cost-label="${escapeHtml(opt.cost_label || opt.label)}"
        data-decision-option
      >
        <div class="option-top">
          <span class="option-label">${escapeHtml(opt.label)}</span>
          <span class="option-cost-pill ${costCls}">${costText}</span>
        </div>
        <div class="option-effects">${chips}</div>
        <span class="option-why">${escapeHtml(opt.why || '')}</span>
      </button>
    `;
  }

  function buildEffectChips(effects) {
    const map = { soil_health:'🪨', plant_vitality:'💚', water_balance:'💧', ecosystem:'🌍' };
    return Object.entries(effects).filter(([,v]) => v !== 0).map(([key, val]) => {
      const cls = val > 0 ? 'pos' : val < 0 ? 'neg' : 'neu';
      return `<span class="effect-chip ${cls}">${map[key]||''}${val > 0 ? '+' : ''}${val}</span>`;
    }).join('');
  }

  function wireDecisionCards(container, decisions, answeredMap) {
    container.addEventListener('click', (e) => {
      const optBtn = e.target.closest('[data-decision-option]');
      if (!optBtn) return;

      const optId  = optBtn.dataset.option;
      const card   = optBtn.closest('.decision-card');
      const decId  = card?.dataset.decision;
      if (!decId) return;

      const decision = decisions.find(d => d.id === decId);
      const option   = decision?.options.find(o => o.id === optId);
      if (!decision || !option) return;

      // Reverse previous if re-selecting (scores + wallet)
      if (answeredMap[decId]) {
        const prev = decision.options.find(o => o.id === answeredMap[decId]);
        if (prev?.effects) {
          const rev = {};
          for (const [k,v] of Object.entries(prev.effects)) rev[k] = -v;
          updateScores(toScoreKeys(rev));
        }
        const prevCost = parseInt(
          card.querySelector('.decision-option.selected')?.dataset.costRupees || '0', 10
        );
        if (prevCost > 0) {
          SimState.wallet.balance    += prevCost;
          SimState.wallet.totalSpent -= prevCost;
          SimState.wallet.transactions.pop();
          if (typeof WalletUI !== 'undefined') WalletUI.render(0);
        }
      }

      const rupees  = parseInt(optBtn.dataset.costRupees || '0', 10);
      const costLbl = optBtn.dataset.costLabel || option.label;
      spendMoney(rupees, costLbl, GROWTH_STAGE);
      if (rupees > 0 && typeof WalletUI !== 'undefined') {
        WalletUI.showFloatingCost(rupees, optBtn);
      }

      applyDecision(decId, optId, option);
      answeredMap[decId] = optId;

      card.classList.add('answered');
      card.querySelectorAll('.decision-option').forEach(b => {
        b.classList.toggle('selected', b.dataset.option === optId);
      });

      const allAnswered = decisions.every(d => answeredMap[d.id]);
      if (allAnswered) {
        SimState.stageDecisionsComplete[GROWTH_STAGE] = true;
        App.enableNextBtn(5, true);
      }
    });
  }

  // ─── Helpers ──────────────────────────────────────────
  function toScoreKeys(effects) {
    const map = { soil_health:'soilHealth', plant_vitality:'plantVitality', water_balance:'waterBalance', ecosystem:'ecosystem' };
    return Object.fromEntries(Object.entries(effects).map(([k,v]) => [map[k]||k, v]));
  }

  function tipIcon(cat) {
    return { watering:'💧', nutrition:'🧪', pest:'🐛', pruning:'✂️', general:'💡' }[cat] || '💡';
  }

  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

  function buildLocationSummary() {
    const p = SimState.location.locationProfile;
    if (!p) return { name: SimState.location.name };
    return {
      name:           p.location_profile?.name,
      climate_zone:   p.location_profile?.climate_zone,
      soil_type:      p.soil_profile?.type,
      current_season: p.location_profile?.growing_season?.current_season,
    };
  }

  function buildLoadingHTML() {
    return `<div class="stage-loading"><p class="text-muted">Loading planting guide...</p></div>`;
  }

  function buildErrorHTML() {
    return `
      <div class="info-box">
        <strong>GrowBot is unavailable.</strong> Proceed when it comes back.
      </div>
      <div style="margin-top:16px">
        <button class="btn btn-ghost" onclick="PlantingUI.init()">Try again</button>
      </div>
    `;
  }

  // ─── Public API ───────────────────────────────────────
  return { init };

})();
