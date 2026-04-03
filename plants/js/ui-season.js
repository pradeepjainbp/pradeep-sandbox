/* ═══════════════════════════════════════════════════════
   ui-season.js
   Stage 2: Month / season picker
   - 12-month grid, current month pre-selected
   - Kharif/Rabi/Zaid labels for Indian locations
   - Stage 2 Next button always enabled (month already selected)
   ═══════════════════════════════════════════════════════ */

'use strict';

const SeasonUI = (() => {

  const MONTHS = [
    'Jan','Feb','Mar','Apr','May','Jun',
    'Jul','Aug','Sep','Oct','Nov','Dec'
  ];

  const MONTH_FULL = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  // Indian growing seasons (month indices, 1-based)
  const SEASONS_INDIA = [
    { name: 'Zaid',   label: 'Zaid (Summer)',    months: [3,4,5],     color: '#ff9800', desc: 'Mar–May' },
    { name: 'Kharif', label: 'Kharif (Monsoon)', months: [6,7,8,9,10], color: '#2d8a4e', desc: 'Jun–Oct' },
    { name: 'Rabi',   label: 'Rabi (Winter)',    months: [11,12,1,2], color: '#2563eb', desc: 'Nov–Feb' },
  ];

  // ─── Init ─────────────────────────────────────────────
  function init() {
    const container = document.getElementById('season-ui');
    if (!container) return;

    // Pre-select current month if not already set
    if (!SimState.selectedMonth) {
      SimState.selectedMonth = new Date().getMonth() + 1;
    }

    const isIndia = isIndianLocation();
    container.innerHTML = buildHTML(isIndia);
    wireEvents();
  }

  // ─── Detect Indian location ───────────────────────────
  function isIndianLocation() {
    const country = SimState.location.country?.toLowerCase() || '';
    return country.includes('india');
  }

  // ─── Build HTML ───────────────────────────────────────
  function buildHTML(isIndia) {
    const seasonBar = isIndia ? buildIndiaSeasonBar() : '';

    const monthGrid = `
      <div class="month-grid">
        ${MONTHS.map((m, i) => {
          const monthNum = i + 1;
          const isSelected = monthNum === SimState.selectedMonth;
          const seasonColor = isIndia ? getIndiaSeasonColor(monthNum) : null;
          return `
            <button
              class="month-card ${isSelected ? 'selected' : ''}"
              data-month="${monthNum}"
              aria-pressed="${isSelected}"
              ${seasonColor ? `style="--month-accent:${seasonColor}"` : ''}
            >
              <span class="month-short">${m}</span>
              ${isCurrentMonth(monthNum) ? '<span class="month-now">Now</span>' : ''}
            </button>
          `;
        }).join('')}
      </div>
    `;

    const selectedInfo = buildSelectedInfo(SimState.selectedMonth, isIndia);

    return `
      ${seasonBar}
      ${monthGrid}
      <div id="season-selected-info">${selectedInfo}</div>
    `;
  }

  // ─── India season bar ─────────────────────────────────
  function buildIndiaSeasonBar() {
    return `
      <div class="india-seasons">
        ${SEASONS_INDIA.map(s => `
          <div class="india-season-chip" style="--chip-color:${s.color}">
            <span class="chip-dot" style="background:${s.color}"></span>
            <span>${s.label}</span>
            <span class="chip-months">${s.desc}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ─── Selected month info ──────────────────────────────
  function buildSelectedInfo(month, isIndia) {
    const name = MONTH_FULL[month - 1];
    const season = isIndia ? getIndiaSeason(month) : null;

    return `
      <div class="season-info-card">
        <div class="season-info-month">
          📅 <strong>${name}</strong>
          ${isCurrentMonth(month) ? '<span class="tag tag-green">Current month</span>' : ''}
        </div>
        ${season ? `
          <div class="season-info-season" style="color:${season.color}">
            ${season.label} growing season
          </div>
        ` : ''}
        <div class="season-info-note">
          GrowBot will tailor plant recommendations to conditions in ${name} at your location.
        </div>
      </div>
    `;
  }

  // ─── Wire Events ──────────────────────────────────────
  function wireEvents() {
    const isIndia = isIndianLocation();

    document.querySelectorAll('.month-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const month = parseInt(btn.dataset.month, 10);
        SimState.selectedMonth = month;

        // Update selection state
        document.querySelectorAll('.month-card').forEach(b => {
          b.classList.toggle('selected', parseInt(b.dataset.month, 10) === month);
          b.setAttribute('aria-pressed', parseInt(b.dataset.month, 10) === month);
        });

        // Update info card
        const info = document.getElementById('season-selected-info');
        if (info) info.innerHTML = buildSelectedInfo(month, isIndia);

        // Stage 2 next is always available once a month is picked
        // (SimState.selectedMonth is initialized in init so btn already enabled)
      });
    });
  }

  // ─── Helpers ──────────────────────────────────────────
  function isCurrentMonth(month) {
    return month === new Date().getMonth() + 1;
  }

  function getIndiaSeason(month) {
    return SEASONS_INDIA.find(s => s.months.includes(month)) || null;
  }

  function getIndiaSeasonColor(month) {
    return getIndiaSeason(month)?.color || null;
  }

  // ─── Public API ───────────────────────────────────────
  return { init };

})();
