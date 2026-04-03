/* ═══════════════════════════════════════════════════════
   ui-diagnostic.js
   "My plant looks sick" modal
   - Symptom checkboxes
   - Calls P5 Gemini prompt
   - Shows diagnosis + treatment
   - "Apply Treatment" updates scores
   ═══════════════════════════════════════════════════════ */

'use strict';

const DiagnosticUI = (() => {

  const SYMPTOMS = [
    'Yellowing leaves',
    'Brown spots on leaves',
    'Wilting despite watering',
    'Stunted growth',
    'White powdery coating',
    'Holes in leaves',
    'Stem rotting at base',
    'Leaves curling',
    'Fruit dropping early',
    'Sticky residue on leaves',
  ];

  let diagnosisResult = null;

  // ─── Open modal ───────────────────────────────────────
  function open() {
    diagnosisResult = null;
    const container = document.getElementById('diagnostic-ui');
    if (container) container.innerHTML = buildSymptomForm();

    const modal = document.getElementById('diagnostic-modal');
    if (modal) {
      modal.classList.add('visible');
      modal.setAttribute('aria-hidden', 'false');
    }

    wireModalEvents();
  }

  // ─── Close modal ──────────────────────────────────────
  function close() {
    const modal = document.getElementById('diagnostic-modal');
    if (modal) {
      modal.classList.remove('visible');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  // ─── Symptom form HTML ────────────────────────────────
  function buildSymptomForm() {
    return `
      <div class="modal-header">
        <h2 class="modal-title">🩺 What symptoms do you see?</h2>
        <p class="modal-subtitle text-muted">Select all that apply — GrowBot will diagnose your plant.</p>
      </div>

      <div class="diagnostic-symptoms">
        ${SYMPTOMS.map((s, i) => `
          <label class="symptom-item">
            <input type="checkbox" value="${s}" id="symptom-${i}" />
            <span>${escapeHtml(s)}</span>
          </label>
        `).join('')}
      </div>

      <div class="modal-actions">
        <button class="btn btn-ghost" id="btn-diag-cancel">Cancel</button>
        <button class="btn btn-primary" id="btn-diag-diagnose">
          🔍 Diagnose
        </button>
      </div>
    `;
  }

  // ─── Wire events ──────────────────────────────────────
  function wireModalEvents() {
    document.getElementById('btn-diag-cancel')?.addEventListener('click', close);
    document.getElementById('btn-diag-diagnose')?.addEventListener('click', diagnose);

    // Close on overlay click
    document.getElementById('diagnostic-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) close();
    });
  }

  // ─── Run diagnosis ────────────────────────────────────
  async function diagnose() {
    const checked = Array.from(
      document.querySelectorAll('.diagnostic-symptoms input:checked')
    ).map(el => el.value);

    if (!checked.length) {
      showToast('Please select at least one symptom', 'error');
      return;
    }

    const container = document.getElementById('diagnostic-ui');
    if (container) container.innerHTML = buildRunningHTML();

    try {
      showLoading('GrowBot is diagnosing your plant...');
      const result = await GeminiAPI.callGemini('p5-diagnostician', {
        PLANT_NAME:       SimState.plant.name,
        SYMPTOMS:         JSON.stringify(checked),
        CURRENT_STAGE:    `Growth stage ${SimState.currentGrowthStage}`,
        CURRENT_SCORES:   JSON.stringify(SimState.scores),
        RECENT_DECISIONS: getDecisionsSummary(5),
      });
      hideLoading();

      if (!result) {
        if (container) container.innerHTML = buildErrorHTML();
        return;
      }

      diagnosisResult = result;
      if (container) container.innerHTML = buildResultHTML(result, checked);
      wireResultEvents();

    } catch (err) {
      hideLoading();
      if (container) container.innerHTML = buildErrorHTML();
    }
  }

  // ─── Diagnosis result HTML ────────────────────────────
  function buildResultHTML(result, symptoms) {
    const { diagnosis, treatment, prevention } = result;
    const primary    = diagnosis.primary;
    const confidence = Math.round((primary.confidence || 0) * 100);

    const catColors = {
      nutrient: '#8bc34a', pest: '#ff9800', disease: '#f44336',
      environmental: '#2196f3', care_error: '#9c27b0'
    };
    const catColor = catColors[primary.category] || '#757575';

    const adjustments = treatment.score_adjustments || {};
    const chips = Object.entries(adjustments).filter(([,v]) => v !== 0).map(([k,v]) => {
      const labels = { soil_health:'🪨 Soil', plant_vitality:'💚 Vitality', ecosystem:'🌍 Ecosystem' };
      const cls = v > 0 ? 'pos' : 'neg';
      return `<span class="effect-chip ${cls}">${labels[k] || k} ${v>0?'+':''}${v}</span>`;
    }).join('');

    return `
      <div class="modal-header">
        <h2 class="modal-title">🔬 Diagnosis</h2>
        <div class="diag-confidence" style="color:${catColor}">
          ${escapeHtml(primary.category)} · ${confidence}% confidence
        </div>
      </div>

      <div class="diagnosis-result">
        <div class="diagnosis-title">
          ${escapeHtml(primary.condition)}
          ${primary.caused_by_user_decision ? '<span class="tag tag-amber">Caused by a decision you made</span>' : ''}
        </div>
        <div class="diagnosis-why">${escapeHtml(primary.description)}</div>
        <div class="diagnosis-why text-muted">${escapeHtml(primary.why)}</div>
      </div>

      ${diagnosis.alternatives?.length ? `
        <div class="diag-alternatives">
          <div class="suit-alt-title">Other possibilities</div>
          ${diagnosis.alternatives.map(a => `
            <div class="suit-alt-item">
              <span>${escapeHtml(a.condition)}</span>
              <span class="text-muted">${Math.round(a.confidence*100)}%</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="diag-treatment">
        <h3 class="section-label">💊 Treatment</h3>
        <div class="diagnosis-treatment">
          <strong>Now:</strong> ${escapeHtml(treatment.immediate_action)}
        </div>
        <div class="diagnosis-treatment text-muted">
          <strong>Long term:</strong> ${escapeHtml(treatment.long_term_fix)}
        </div>
        <div class="text-muted" style="font-size:0.8rem">
          ⏱ Recovery: ~${treatment.recovery_time_days} days
        </div>
        ${chips ? `<div class="option-effects" style="margin-top:8px">${chips}</div>` : ''}
      </div>

      ${prevention ? `
        <div class="info-box" style="margin-top:12px">
          🛡 <strong>Prevent recurrence:</strong> ${escapeHtml(prevention.tip)}
        </div>
      ` : ''}

      <div class="modal-actions">
        <button class="btn btn-ghost" id="btn-diag-dismiss">Dismiss</button>
        ${chips ? `<button class="btn btn-primary" id="btn-diag-apply">Apply Treatment</button>` : ''}
      </div>
    `;
  }

  function wireResultEvents() {
    document.getElementById('btn-diag-dismiss')?.addEventListener('click', close);
    document.getElementById('btn-diag-apply')?.addEventListener('click', () => {
      if (!diagnosisResult?.treatment?.score_adjustments) { close(); return; }
      const adj = diagnosisResult.treatment.score_adjustments;
      updateScores({
        soilHealth:    adj.soil_health    || 0,
        plantVitality: adj.plant_vitality || 0,
        ecosystem:     adj.ecosystem      || 0,
      });
      showToast('Treatment applied — watch your scores recover!', 'success');
      close();
    });
  }

  function buildRunningHTML() {
    return `
      <div class="loading-spinner" style="padding:40px">
        <div class="loading-icon">🌿</div>
        <p>GrowBot is diagnosing...</p>
      </div>
    `;
  }

  function buildErrorHTML() {
    return `
      <div class="info-box">GrowBot couldn't diagnose right now.</div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="btn-diag-cancel-2">Close</button>
      </div>
    `;
  }

  // Close on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  // ─── Public API ───────────────────────────────────────
  return { open, close };

})();
