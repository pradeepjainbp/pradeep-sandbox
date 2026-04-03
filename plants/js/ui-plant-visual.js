/* ═══════════════════════════════════════════════════════
   ui-plant-visual.js
   Maps SimState.scores.plantVitality + growth stage
   to CSS custom properties on .plant-container
   All changes animate via CSS transitions (0.8s)
   ═══════════════════════════════════════════════════════ */

'use strict';

const PlantVisualUI = (() => {

  // ─── Vitality → visual property map ─────────────────
  const VITALITY_MAP = [
    // score range   leaf-color    droop  leaf-size  spot-opacity
    { min: 90, max: 100, color: '#2d8a4e', droop: 0,  size: 1.0, spots: 0.0 },
    { min: 70, max:  89, color: '#4caf50', droop: 5,  size: 0.95, spots: 0.0 },
    { min: 50, max:  69, color: '#8bc34a', droop: 15, size: 0.85, spots: 0.1 },
    { min: 30, max:  49, color: '#ffc107', droop: 25, size: 0.70, spots: 0.35 },
    { min: 10, max:  29, color: '#ff9800', droop: 40, size: 0.55, spots: 0.60 },
    { min:  0, max:   9, color: '#795548', droop: 60, size: 0.40, spots: 0.85 },
  ];

  // ─── Growth stage → plant state ──────────────────────
  const STAGE_MAP = {
    'none':        { stemH: '0%',   leafVis: 0,   flowers: false, fruits: false, thickness: '3px' },
    'planting':    { stemH: '5%',   leafVis: 0,   flowers: false, fruits: false, thickness: '3px' },
    'sprouting':   { stemH: '18%',  leafVis: 0.4, flowers: false, fruits: false, thickness: '3px' },
    'vegetative':  { stemH: '55%',  leafVis: 1,   flowers: false, fruits: false, thickness: '5px' },
    'flowering':   { stemH: '75%',  leafVis: 1,   flowers: true,  fruits: false, thickness: '6px' },
    'fruiting':    { stemH: '90%',  leafVis: 1,   flowers: true,  fruits: true,  thickness: '7px' },
    'harvest':     { stemH: '90%',  leafVis: 0.8, flowers: false, fruits: true,  thickness: '7px' },
  };

  const STAGE_INDEX_MAP = ['none', 'sprouting', 'vegetative', 'flowering', 'harvest'];

  let currentStageName = 'none';

  // ─── Get container ────────────────────────────────────
  function getContainer() {
    return document.getElementById('plant-visual');
  }

  // ─── Set CSS custom property ──────────────────────────
  function setProp(container, key, value) {
    container.style.setProperty(key, value);
  }

  // ─── Update visual from current vitality score ────────
  function update() {
    const container = getContainer();
    if (!container) return;

    const vitality = SimState.scores.plantVitality ?? 50;
    const waterBalance = SimState.scores.waterBalance ?? 70;

    // Find vitality tier
    const tier = VITALITY_MAP.find(t => vitality >= t.min && vitality <= t.max)
      || VITALITY_MAP[VITALITY_MAP.length - 1];

    setProp(container, '--leaf-color', tier.color);
    setProp(container, '--leaf-droop', `${tier.droop}deg`);
    setProp(container, '--leaf-size',  tier.size);
    setProp(container, '--spot-opacity', tier.spots);
    setProp(container, '--leaf-opacity', Math.max(0.2, tier.size));

    // Stem color darkens with poor health
    const stemColor = vitality >= 50 ? '#4a7c59' : vitality >= 30 ? '#7a6040' : '#8d6e63';
    setProp(container, '--stem-color', stemColor);

    // Water → soil moisture indicator
    const moisture = clamp(waterBalance, 0, 100) / 100;
    setProp(container, '--soil-moisture', moisture);

    // Vitality class for animations
    container.classList.toggle('vitality-high',     vitality >= 80);
    container.classList.toggle('vitality-critical',  vitality <= 15);

    // Stage label
    const labelEl = container.querySelector('.plant-stage-label');
    if (labelEl) labelEl.textContent = capitalize(currentStageName);
  }

  // ─── Set growth stage by name ─────────────────────────
  function setStage(stageName) {
    const container = getContainer();
    if (!container) return;

    currentStageName = stageName;
    const state = STAGE_MAP[stageName] || STAGE_MAP['none'];

    setProp(container, '--stem-height',     state.stemH);
    setProp(container, '--stem-width',      state.thickness);
    setProp(container, '--leaf-visible',    state.leafVis);
    setProp(container, '--flower-visible',  state.flowers ? 1 : 0);
    setProp(container, '--flower-opacity',  state.flowers ? 1 : 0);
    setProp(container, '--fruit-visible',   state.fruits  ? 1 : 0);
    setProp(container, '--fruit-size',      state.fruits  ? 1 : 0);

    // Stage CSS class
    container.className = container.className
      .replace(/\bstage-\S+/g, '')
      .trim();
    container.classList.add(`stage-${stageName}`);

    update();
  }

  // ─── Set stage by timeline index (0-based) ────────────
  function setStageByIndex(idx) {
    const name = STAGE_INDEX_MAP[idx] || 'sprouting';
    setStage(name);
  }

  // ─── Apply Gemini P3 visual_state to plant ────────────
  function applyStageVisual(visualState) {
    if (!visualState) return;
    const container = getContainer();
    if (!container) return;

    // Map Gemini fields to CSS properties
    if (visualState.leaf_color) {
      setProp(container, '--leaf-color', visualState.leaf_color);
    }
    if (visualState.plant_height_pct != null) {
      setProp(container, '--stem-height', `${visualState.plant_height_pct}%`);
    }
    if (visualState.has_flowers != null) {
      setProp(container, '--flower-opacity', visualState.has_flowers ? 1 : 0);
      setProp(container, '--flower-visible', visualState.has_flowers ? 1 : 0);
    }
    if (visualState.has_fruit != null) {
      setProp(container, '--fruit-visible', visualState.has_fruit ? 1 : 0);
      setProp(container, '--fruit-size',    visualState.has_fruit ? 1 : 0);
    }

    // Soil condition → moisture
    const moistureMap = { dry: 0.1, moist: 0.55, wet: 0.8, waterlogged: 1.0 };
    if (visualState.soil_condition && moistureMap[visualState.soil_condition] != null) {
      setProp(container, '--soil-moisture', moistureMap[visualState.soil_condition]);
    }

    // Stem thickness from Gemini
    const thicknessMap = { seedling: '3px', thin: '4px', moderate: '5px', thick: '7px' };
    if (visualState.stem_thickness && thicknessMap[visualState.stem_thickness]) {
      setProp(container, '--stem-width', thicknessMap[visualState.stem_thickness]);
    }
  }

  // ─── Initialize with default state ───────────────────
  function init() {
    setStage('none');
  }

  // ─── Helpers ──────────────────────────────────────────
  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

  // ─── Public API ───────────────────────────────────────
  return { init, update, setStage, setStageByIndex, applyStageVisual };

})();

// Initialize on load
document.addEventListener('DOMContentLoaded', () => PlantVisualUI.init());
