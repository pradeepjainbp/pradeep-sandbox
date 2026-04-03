/* ═══════════════════════════════════════════════════════
   PLANT GROWTH SIMULATOR — app.js
   App entry point: stage routing, progress bar, init
   ═══════════════════════════════════════════════════════ */

'use strict';

const App = (() => {

  // ─── State ────────────────────────────────────────────
  let currentStage = 1;
  const TOTAL_STAGES = 6;

  // Sidebar visible from stage 4 onwards
  const SIDEBAR_FROM_STAGE = 4;

  // ─── Stage Navigation ─────────────────────────────────
  function goToStage(n) {
    if (n < 1 || n > TOTAL_STAGES) return;

    // Guard: if advancing, validate current stage is complete
    if (n > currentStage && !isStageComplete(currentStage)) return;

    // Hide current stage
    const current = document.getElementById(`stage-${currentStage}`);
    if (current) current.classList.remove('active');

    // If harvest summary was active, hide it
    const harvestEl = document.getElementById('stage-harvest');
    if (harvestEl) harvestEl.classList.remove('active');

    // Show new stage
    currentStage = n;
    const next = document.getElementById(`stage-${currentStage}`);
    if (next) next.classList.add('active');

    // Update progress bar
    updateProgress();

    // Toggle sidebar
    toggleSidebar();

    // Run stage-specific initialization
    onStageEnter(currentStage);

    // Scroll to top of main area
    const main = document.querySelector('.sim-main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showHarvestSummary() {
    // Hide stage 6 content, show harvest
    const stage6 = document.getElementById('stage-6');
    if (stage6) stage6.classList.remove('active');
    const harvest = document.getElementById('stage-harvest');
    if (harvest) harvest.classList.add('active');
  }

  // ─── Stage Validation ─────────────────────────────────
  function isStageComplete(stageNum) {
    switch (stageNum) {
      case 1: return !!SimState.location.lat;
      case 2: return !!SimState.selectedMonth;
      case 3: return !!SimState.plant.id;
      case 4: return SimState.stageDecisionsComplete[1] === true;
      case 5: return SimState.stageDecisionsComplete[2] === true;
      default: return true;
    }
  }

  // ─── Progress Bar ─────────────────────────────────────
  function updateProgress() {
    // Fill bar
    const pct = ((currentStage - 1) / (TOTAL_STAGES - 1)) * 100;
    const fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = `${pct}%`;

    // Step indicators
    document.querySelectorAll('.progress-steps .step').forEach(el => {
      const s = parseInt(el.dataset.stage, 10);
      el.classList.toggle('active', s === currentStage);
      el.classList.toggle('completed', s < currentStage);
    });
  }

  // ─── Sidebar Toggle ───────────────────────────────────
  function toggleSidebar() {
    const sidebar = document.getElementById('sim-sidebar');
    if (!sidebar) return;
    if (currentStage >= SIDEBAR_FROM_STAGE) {
      sidebar.classList.add('visible');
    } else {
      sidebar.classList.remove('visible');
    }
  }

  // ─── Stage Entry Hooks ────────────────────────────────
  async function onStageEnter(stageNum) {
    switch (stageNum) {
      case 1:
        if (typeof LocationUI !== 'undefined') LocationUI.init();
        break;
      case 2:
        if (typeof SeasonUI !== 'undefined') SeasonUI.init();
        break;
      case 3:
        if (typeof PlantPickerUI !== 'undefined') PlantPickerUI.init();
        break;
      case 4:
        if (typeof PrePlantingUI !== 'undefined') await PrePlantingUI.init();
        break;
      case 5:
        if (typeof PlantingUI !== 'undefined') await PlantingUI.init();
        break;
      case 6:
        if (typeof TimelineUI !== 'undefined') await TimelineUI.init();
        break;
    }
  }

  // ─── Next/Back Button Wiring ──────────────────────────
  function wireNavButtons() {
    // "Next" buttons on stages 1–5 are wired per-stage via their UI modules
    // "Back" buttons are generic — any [data-to] button
    document.addEventListener('click', (e) => {
      const backBtn = e.target.closest('[data-to]');
      if (backBtn) {
        const target = parseInt(backBtn.dataset.to, 10);
        goToStage(target);
      }
    });

    // Stage 1 next — needs climate fetch first
    const btn1Next = document.getElementById('btn-1-next');
    if (btn1Next) {
      btn1Next.addEventListener('click', async () => {
        if (!SimState.location.lat) return;
        try {
          showLoading('Fetching climate data for your location...');
          SimState.location.climateData = await WeatherAPI.getClimateData(
            SimState.location.lat, SimState.location.lon
          );
          hideLoading();
          goToStage(2);
        } catch (err) {
          hideLoading();
          showToast('Could not fetch climate data — please try again', 'error');
        }
      });
    }

    // Stage 2 next — triggers P1 Gemini call
    const btn2Next = document.getElementById('btn-2-next');
    if (btn2Next) {
      btn2Next.addEventListener('click', async () => {
        try {
          showLoading('GrowBot is studying your location\'s climate and soil...');
          const p1Result = await GeminiAPI.callGemini('p1-location-season', {
            LAT:           SimState.location.lat,
            LON:           SimState.location.lon,
            LOCATION_NAME: SimState.location.name,
            COUNTRY:       SimState.location.country,
            MONTH:         SimState.selectedMonth,
            CLIMATE_DATA:  JSON.stringify(SimState.location.climateData)
          });
          if (p1Result) {
            SimState.location.locationProfile = p1Result;
            // Set initial scores from P1
            const s = p1Result.initial_scores;
            SimState.scores.soilHealth   = s?.soil_health    ?? 50;
            SimState.scores.waterBalance = s?.water_balance  ?? 70;
            SimState.scores.ecosystem    = s?.ecosystem      ?? 50;
          }
          hideLoading();
          goToStage(3);
        } catch (err) {
          hideLoading();
          showToast('GrowBot had trouble — please try again', 'error');
        }
      });
    }

    // Stage 3 next — P2 already fired by PlantPickerUI; just advance
    const btn3Next = document.getElementById('btn-3-next');
    if (btn3Next) {
      btn3Next.addEventListener('click', () => goToStage(4));
    }

    // Stages 4 and 5 — enabled by their UI modules when all decisions made
    const btn4Next = document.getElementById('btn-4-next');
    if (btn4Next) btn4Next.addEventListener('click', () => goToStage(5));

    const btn5Next = document.getElementById('btn-5-next');
    if (btn5Next) btn5Next.addEventListener('click', () => goToStage(6));
  }

  // ─── Enable/Disable Next Button ───────────────────────
  function enableNextBtn(stageNum, enabled = true) {
    const btn = document.getElementById(`btn-${stageNum}-next`);
    if (btn) btn.disabled = !enabled;
  }

  // ─── Clickable progress steps (completed = go back) ──
  function wireProgressSteps() {
    document.querySelectorAll('.progress-steps .step').forEach(el => {
      el.addEventListener('click', () => {
        const target = parseInt(el.dataset.stage, 10);
        if (target < currentStage) goToStage(target);
      });
    });
  }

  // ─── Init ─────────────────────────────────────────────
  function init() {
    updateProgress();
    wireNavButtons();
    wireProgressSteps();
    onStageEnter(1);
  }

  // ─── Public API ───────────────────────────────────────
  return {
    init,
    goToStage,
    showHarvestSummary,
    enableNextBtn,
    isStageComplete,
    getCurrentStage: () => currentStage,
  };

})();

// ─── Boot ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
