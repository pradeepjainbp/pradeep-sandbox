/* ═══════════════════════════════════════════════════════
   ui-scores.js
   4 circular score gauges (SVG arc)
   - Animates stroke-dashoffset on score change
   - Floating +/- delta indicators
   - Color follows score level
   ═══════════════════════════════════════════════════════ */

'use strict';

const ScoresUI = (() => {

  const CIRCUMFERENCE = 2 * Math.PI * 32; // r=32 → ≈201

  const SCORE_KEYS = ['soilHealth', 'plantVitality', 'waterBalance', 'ecosystem'];

  const GAUGE_IDS = {
    soilHealth:    'gauge-soil',
    plantVitality: 'gauge-vitality',
    waterBalance:  'gauge-water',
    ecosystem:     'gauge-ecosystem',
  };

  const VALUE_IDS = {
    soilHealth:    'val-soilHealth',
    plantVitality: 'val-plantVitality',
    waterBalance:  'val-waterBalance',
    ecosystem:     'val-ecosystem',
  };

  // ─── Score → color ────────────────────────────────────
  function scoreColor(score) {
    if (score >= 80) return 'var(--score-excellent)';
    if (score >= 60) return 'var(--score-good)';
    if (score >= 40) return 'var(--score-fair)';
    if (score >= 20) return 'var(--score-poor)';
    return 'var(--score-critical)';
  }

  // ─── Score → dashoffset (0 = full circle, CIRCUMFERENCE = empty) ─
  function scoreToDashoffset(score) {
    const ratio = clamp(score, 0, 100) / 100;
    return CIRCUMFERENCE * (1 - ratio);
  }

  // ─── Render all gauges ────────────────────────────────
  function render() {
    SCORE_KEYS.forEach(key => {
      const score    = SimState.scores[key] ?? 50;
      const gaugeEl  = document.getElementById(GAUGE_IDS[key]);
      const valueEl  = document.getElementById(VALUE_IDS[key]);

      if (gaugeEl) {
        gaugeEl.style.strokeDashoffset = scoreToDashoffset(score);
        gaugeEl.style.stroke           = scoreColor(score);
        // Ensure dasharray is set
        gaugeEl.style.strokeDasharray  = CIRCUMFERENCE;
      }

      if (valueEl) {
        valueEl.textContent = score;
      }
    });
  }

  // ─── Show floating delta indicators ───────────────────
  function showDeltas(effects) {
    const keyMap = {
      soil_health:    'soilHealth',
      plant_vitality: 'plantVitality',
      water_balance:  'waterBalance',
      ecosystem:      'ecosystem',
    };

    for (const [effectKey, delta] of Object.entries(effects)) {
      if (!delta || delta === 0) continue;
      const scoreKey = keyMap[effectKey];
      if (!scoreKey) continue;

      const gaugeWrap = document.querySelector(
        `.score-gauge[data-score="${scoreKey}"] .gauge-arc-wrap`
      );
      if (!gaugeWrap) continue;

      const deltaEl = document.createElement('div');
      deltaEl.className = `score-delta ${delta > 0 ? 'positive' : 'negative'}`;
      deltaEl.textContent = `${delta > 0 ? '+' : ''}${delta}`;
      gaugeWrap.appendChild(deltaEl);

      // Remove after animation
      setTimeout(() => deltaEl.remove(), 1600);
    }
  }

  // ─── Initialize dasharray on all gauges ───────────────
  function initGauges() {
    document.querySelectorAll('.gauge-fill').forEach(el => {
      el.style.strokeDasharray  = CIRCUMFERENCE;
      el.style.strokeDashoffset = CIRCUMFERENCE; // start empty
    });
    render();
  }

  // ─── Public API ───────────────────────────────────────
  return { render, showDeltas, initGauges };

})();

// Init gauges once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  ScoresUI.initGauges();
});
