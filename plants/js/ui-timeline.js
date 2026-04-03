/* ═══════════════════════════════════════════════════════
   ui-timeline.js
   Stage 6: Growth timeline
   - 4 growth stages (Sprouting → Vegetative → Flowering → Harvest)
   - P3 called per stage advance
   - P4 called for decision point events
   - "My plant looks sick" → DiagnosticUI
   ═══════════════════════════════════════════════════════ */

'use strict';

const TimelineUI = (() => {

  // Growth stages within the timeline (maps to P3 stage numbers 3-6)
  const TIMELINE_STAGES = [
    { num: 3, emoji: '🌱', label: 'Sprouting',   p3Stage: 'Stage 3 — Sprouting / Early Growth (first 2-4 weeks after planting)' },
    { num: 4, emoji: '🌿', label: 'Vegetative',  p3Stage: 'Stage 4 — Vegetative Growth (main growth phase, leaf and stem development)' },
    { num: 5, emoji: '🌸', label: 'Flowering',   p3Stage: 'Stage 5 — Flowering / Fruiting (reproductive stage)' },
    { num: 6, emoji: '✂️', label: 'Harvest',     p3Stage: 'Stage 6 — Harvest / Post-harvest (when and how to harvest)' },
  ];

  let currentTimelineStage = 0; // index into TIMELINE_STAGES
  let stageGuideData       = null;
  let pendingEvent         = null;

  // ─── Init ─────────────────────────────────────────────
  async function init() {
    const container = document.getElementById('timeline-ui');
    if (!container) return;

    // Apply passive drift from planting stage
    passiveVitalityAdjustment();

    // Set plant visual to sprouting
    if (typeof PlantVisualUI !== 'undefined') {
      PlantVisualUI.setStage('sprouting');
    }

    currentTimelineStage = 0;
    await loadTimelineStage(container, currentTimelineStage);
  }

  // ─── Load a timeline stage ─────────────────────────────
  async function loadTimelineStage(container, stageIdx) {
    const stage = TIMELINE_STAGES[stageIdx];
    container.innerHTML = buildShellHTML(stageIdx);

    const detailEl = document.getElementById('tl-stage-detail');
    if (!detailEl) return;

    detailEl.innerHTML = buildLoadingHTML();

    try {
      showLoading(`GrowBot is preparing your ${stage.label.toLowerCase()} stage guide...`);
      const guide = await GeminiAPI.callGemini('p3-stage-guide', {
        PLANT_NAME:        SimState.plant.name,
        PLANT_CATEGORY:    SimState.plant.category,
        CURRENT_STAGE:     stage.p3Stage,
        LOCATION_PROFILE:  JSON.stringify(buildLocationSummary()),
        CURRENT_SCORES:    JSON.stringify(SimState.scores),
        DECISIONS_HISTORY: getDecisionsSummary(),
      });
      hideLoading();

      stageGuideData = guide;
      SimState.stageGuide = guide;

      if (!guide) {
        detailEl.innerHTML = buildErrorHTML();
        return;
      }

      // Update plant visual
      if (typeof PlantVisualUI !== 'undefined') {
        PlantVisualUI.applyStageVisual(guide.stage?.visual_state);
        PlantVisualUI.setStageByIndex(stageIdx);
      }

      renderStageDetail(detailEl, guide, stageIdx);

      // Wire events for this stage content
      wireStageButtons(container, stageIdx, guide);

      // Check for upcoming event
      if (guide.upcoming_alert?.type !== 'none' && guide.upcoming_alert?.message) {
        showStageAlert(guide.upcoming_alert);
      }

    } catch (err) {
      hideLoading();
      detailEl.innerHTML = buildErrorHTML();
    }
  }

  // ─── Shell HTML (timeline bar + stage area) ────────────
  function buildShellHTML(activeIdx) {
    const timelineBar = `
      <div class="timeline-wrap">
        <div class="timeline-stages">
          ${TIMELINE_STAGES.map((s, i) => `
            <div class="timeline-stage-node">
              <div class="tl-dot ${i === activeIdx ? 'active' : i < activeIdx ? 'completed' : ''}">
                ${s.emoji}
              </div>
              <div class="tl-label ${i === activeIdx ? 'active' : ''}">${s.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const plantEmoji = SimState.plant.emoji || '🌿';

    const header = `
      <div class="tl-header">
        <div class="tl-plant-info">
          <span class="tl-plant-emoji">${plantEmoji}</span>
          <div>
            <div class="tl-plant-name">${escapeHtml(SimState.plant.name)}</div>
            <div class="tl-location-name">📍 ${escapeHtml(SimState.location.name)}</div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" id="btn-diagnose">
          🩺 My plant looks sick
        </button>
      </div>
    `;

    return `
      ${timelineBar}
      ${header}
      <div id="tl-event-area"></div>
      <div id="tl-stage-detail"></div>
      <div class="tl-advance-wrap" id="tl-advance-wrap"></div>
    `;
  }

  // ─── Stage detail ─────────────────────────────────────
  function renderStageDetail(el, guide, stageIdx) {
    const { stage, decisions, care_tips } = guide;
    const answeredMap = {};

    el.innerHTML = `
      <div class="tl-stage-info">
        <div class="tl-stage-title">${TIMELINE_STAGES[stageIdx].emoji} ${escapeHtml(stage.name)}</div>
        <div class="tl-stage-desc">${escapeHtml(stage.description)}</div>
        ${stage.duration_days ? `<div class="tl-duration text-muted">⏱ ~${stage.duration_days} days</div>` : ''}
      </div>

      ${decisions?.length ? `
        <div class="decision-cards" id="tl-decisions-${stageIdx}">
          ${decisions.map(d => buildDecisionCard(d)).join('')}
        </div>
      ` : ''}

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

    wireDecisionClicks(el, decisions || [], answeredMap, stageIdx);
  }

  // ─── Decision card HTML ───────────────────────────────
  function buildDecisionCard(decision) {
    return `
      <div class="decision-card" data-decision="${decision.id}">
        <div class="decision-card-title">${escapeHtml(decision.title)}</div>
        <div class="decision-card-desc">${escapeHtml(decision.description)}</div>
        <div class="decision-options">
          ${decision.options.map(opt => `
            <button class="decision-option" data-option="${opt.id}" data-decision-option>
              <span class="option-label">${escapeHtml(opt.label)}</span>
              <div class="option-effects">${buildEffectChips(opt.effects || {})}</div>
              <span class="option-why">${escapeHtml(opt.why || '')}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  function buildEffectChips(effects) {
    const map = { soil_health:'🪨', plant_vitality:'💚', water_balance:'💧', ecosystem:'🌍' };
    return Object.entries(effects).filter(([,v]) => v !== 0).map(([k,v]) => {
      const cls = v > 0 ? 'pos' : v < 0 ? 'neg' : 'neu';
      return `<span class="effect-chip ${cls}">${map[k]||''}${v>0?'+':''}${v}</span>`;
    }).join('');
  }

  function wireDecisionClicks(container, decisions, answeredMap, stageIdx) {
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

      // Reverse prior selection
      if (answeredMap[decId]) {
        const prev = decision.options.find(o => o.id === answeredMap[decId]);
        if (prev?.effects) {
          const rev = Object.fromEntries(Object.entries(prev.effects).map(([k,v]) => [k,-v]));
          updateScores(toScoreKeys(rev));
        }
      }

      applyDecision(decId, optId, option);
      answeredMap[decId] = optId;

      card.classList.add('answered');
      card.querySelectorAll('.decision-option').forEach(b => {
        b.classList.toggle('selected', b.dataset.option === optId);
      });

      // Enable advance button if all decisions answered (or no decisions)
      checkAdvanceReady(decisions, answeredMap, stageIdx);
    });

    // If no decisions, advance button is enabled immediately
    if (!decisions.length) {
      checkAdvanceReady(decisions, answeredMap, stageIdx);
    }
  }

  // ─── Advance button wiring ────────────────────────────
  function wireStageButtons(container, stageIdx, guide) {
    // Diagnose button
    document.getElementById('btn-diagnose')?.addEventListener('click', () => {
      if (typeof DiagnosticUI !== 'undefined') DiagnosticUI.open();
    });

    checkAdvanceReady(guide.decisions || [], {}, stageIdx);
  }

  function checkAdvanceReady(decisions, answeredMap, stageIdx) {
    const advanceWrap = document.getElementById('tl-advance-wrap');
    if (!advanceWrap) return;

    const allAnswered = decisions.length === 0 || decisions.every(d => answeredMap[d.id]);
    const isLastStage = stageIdx === TIMELINE_STAGES.length - 1;

    if (isLastStage) {
      advanceWrap.innerHTML = allAnswered ? `
        <button class="btn btn-primary" id="btn-finish-harvest" style="width:100%;justify-content:center">
          🎉 Complete Harvest
        </button>
      ` : '';

      document.getElementById('btn-finish-harvest')?.addEventListener('click', finishHarvest);
    } else {
      advanceWrap.innerHTML = `
        <button
          class="btn btn-primary"
          id="btn-advance-stage"
          ${allAnswered ? '' : 'disabled'}
          style="width:100%;justify-content:center"
        >
          ⏩ Advance to ${TIMELINE_STAGES[stageIdx + 1].label}
        </button>
      `;

      document.getElementById('btn-advance-stage')?.addEventListener('click', () => {
        if (!allAnswered) return;
        advanceTimelineStage();
      });
    }
  }

  // ─── Advance to next timeline stage ───────────────────
  async function advanceTimelineStage() {
    passiveVitalityAdjustment();
    currentTimelineStage++;
    SimState.currentGrowthStage = TIMELINE_STAGES[currentTimelineStage].num;

    const container = document.getElementById('timeline-ui');
    if (container) await loadTimelineStage(container, currentTimelineStage);
  }

  // ─── Decision Point (P4) ──────────────────────────────
  async function triggerDecisionPoint(eventType, eventDetail) {
    const eventArea = document.getElementById('tl-event-area');
    if (!eventArea) return;

    try {
      showLoading('GrowBot is analyzing the situation...');
      const p4 = await GeminiAPI.callGemini('p4-decision-point', {
        PLANT_NAME:      SimState.plant.name,
        CURRENT_STAGE:   TIMELINE_STAGES[currentTimelineStage]?.p3Stage || '',
        EVENT_TYPE:      eventType,
        EVENT_DETAIL:    eventDetail,
        CURRENT_SCORES:  JSON.stringify(SimState.scores),
        LOCATION_PROFILE: JSON.stringify(buildLocationSummary()),
      });
      hideLoading();

      if (!p4) return;

      renderEventPanel(eventArea, p4);

    } catch (err) {
      hideLoading();
    }
  }

  function renderEventPanel(el, p4) {
    const { event, options, do_nothing_consequence } = p4;
    const sevColors = { low:'#8bc34a', medium:'#ffc107', high:'#ff9800', critical:'#f44336' };

    el.innerHTML = `
      <div class="event-panel" style="border-color:${sevColors[event.severity]||'#ffc107'}">
        <div class="event-header">
          <span class="event-icon">⚠️</span>
          <div>
            <div class="event-title">${escapeHtml(event.title)}</div>
            <div class="event-desc">${escapeHtml(event.description)}</div>
          </div>
          <span class="event-sev-badge" style="background:${sevColors[event.severity]}">${capitalize(event.severity)}</span>
        </div>
        <div class="decision-options" id="event-options">
          ${options.map(opt => `
            <button class="decision-option" data-event-option="${opt.id}">
              <span class="option-label">${escapeHtml(opt.label)}</span>
              <div class="option-effects">${buildEffectChips(opt.effects||{})}</div>
              <span class="option-why">${escapeHtml(opt.why||'')}</span>
              ${opt.trade_off ? `<span class="option-cost text-muted">Trade-off: ${escapeHtml(opt.trade_off)}</span>` : ''}
            </button>
          `).join('')}
        </div>
        ${do_nothing_consequence ? `
          <p class="text-muted" style="font-size:0.8rem;margin-top:8px">
            ⚠️ If ignored: ${escapeHtml(do_nothing_consequence.description)}
          </p>
        ` : ''}
      </div>
    `;

    // Wire clicks
    el.querySelectorAll('[data-event-option]').forEach(btn => {
      btn.addEventListener('click', () => {
        const optId = btn.dataset.eventOption;
        const opt   = options.find(o => o.id === optId);
        if (!opt) return;
        applyDecision(`event_${event.type}`, optId, opt);
        btn.closest('.event-panel').style.opacity = '0.5';
        btn.closest('.event-panel').style.pointerEvents = 'none';
        showToast('Decision applied — check your scores!', 'success');
      });
    });
  }

  function showStageAlert(alert) {
    // Show as an info box (non-blocking)
    const eventArea = document.getElementById('tl-event-area');
    if (eventArea) {
      eventArea.innerHTML = `<div class="alert-box">📣 ${escapeHtml(alert.message)}</div>`;
    }
  }

  // ─── Harvest ──────────────────────────────────────────
  function finishHarvest() {
    if (typeof PlantVisualUI !== 'undefined') PlantVisualUI.setStage('harvest');
    App.showHarvestSummary();
    renderHarvestSummary();
  }

  function renderHarvestSummary() {
    const container = document.getElementById('harvest-ui');
    if (!container) return;

    const { avg, grade, label } = computeGrade();
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthName  = monthNames[(SimState.selectedMonth || 1) - 1];

    // Build "what you learned" from decision history
    const highlights = SimState.decisions.slice(-6).map(d => {
      const totalEffect = Object.values(d.effects || {}).reduce((a,b) => a + b, 0);
      const arrow = totalEffect > 0 ? '✅' : totalEffect < 0 ? '⚠️' : '➡️';
      return `<li>${arrow} ${d.choice.replace(/_/g,' ')}</li>`;
    }).join('');

    container.innerHTML = `
      <div class="harvest-summary">
        <div class="harvest-header">
          <div class="harvest-congrats">🎉 Harvest Complete!</div>
          <div class="harvest-subtitle">
            ${SimState.plant.emoji} <strong>${escapeHtml(SimState.plant.name)}</strong>
            &nbsp;·&nbsp; 📍 ${escapeHtml(SimState.location.name)}
            &nbsp;·&nbsp; 📅 ${monthName}
          </div>
        </div>

        <div class="harvest-grade-card" style="--grade-color:${gradeColor(avg)}">
          <div class="harvest-grade">${grade}</div>
          <div class="harvest-grade-label">${label}</div>
          <div class="harvest-score-avg">Overall: ${avg}/100</div>
        </div>

        <div class="harvest-scores">
          <div class="harvest-score-item">🪨 Soil Health <strong>${SimState.scores.soilHealth}</strong></div>
          <div class="harvest-score-item">💚 Plant Vitality <strong>${SimState.scores.plantVitality}</strong></div>
          <div class="harvest-score-item">💧 Water Balance <strong>${SimState.scores.waterBalance}</strong></div>
          <div class="harvest-score-item">🌍 Ecosystem <strong>${SimState.scores.ecosystem}</strong></div>
        </div>

        ${highlights ? `
          <div class="harvest-learned">
            <h3>📖 What happened</h3>
            <ul>${highlights}</ul>
          </div>
        ` : ''}

        <div class="harvest-actions">
          <button class="btn btn-primary" onclick="location.reload()">🔄 Grow Something New</button>
        </div>
      </div>
    `;
  }

  // ─── Helpers ──────────────────────────────────────────
  function toScoreKeys(effects) {
    const m = { soil_health:'soilHealth', plant_vitality:'plantVitality', water_balance:'waterBalance', ecosystem:'ecosystem' };
    return Object.fromEntries(Object.entries(effects).map(([k,v]) => [m[k]||k,v]));
  }

  function tipIcon(cat) {
    return { watering:'💧', nutrition:'🧪', pest:'🐛', pruning:'✂️', general:'💡' }[cat] || '💡';
  }

  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

  function gradeColor(avg) {
    if (avg >= 80) return 'var(--score-excellent)';
    if (avg >= 60) return 'var(--score-good)';
    if (avg >= 40) return 'var(--score-fair)';
    return 'var(--score-critical)';
  }

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
    return `<div class="stage-loading"><p class="text-muted">GrowBot is preparing your guide...</p></div>`;
  }

  function buildErrorHTML() {
    return `
      <div class="info-box">GrowBot unavailable. <button class="btn btn-ghost btn-sm" onclick="TimelineUI.init()">Retry</button></div>
    `;
  }

  // ─── Public API ───────────────────────────────────────
  return { init, triggerDecisionPoint };

})();
