/* ═══════════════════════════════════════════════════════
   state.js
   SimState: single source of truth for the simulator
   + scoring engine (pure functions)
   ═══════════════════════════════════════════════════════ */

'use strict';

// ─── Budget by plant category ─────────────────────────────
const BUDGET_BY_CATEGORY = {
  'Herb':              800,
  'Leafy Vegetable':   800,
  'Vegetable':        1500,
  'Fruit':            2500,
  'Flower':           1200,
  'Spice':            2000,
  'Cash Crop':        4000,
  'Grain':            4000,
  'Pulse':            4000,
  'Tree':             6000,
  'Fruit Tree':       6000,
  'Indoor Plant':      600,
};

// Default for unknown categories
const DEFAULT_BUDGET = 1500;

function getBudgetForPlant(category) {
  if (!category) return DEFAULT_BUDGET;
  // Try exact match first, then partial match
  if (BUDGET_BY_CATEGORY[category]) return BUDGET_BY_CATEGORY[category];
  const key = Object.keys(BUDGET_BY_CATEGORY).find(k =>
    category.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(category.toLowerCase())
  );
  return key ? BUDGET_BY_CATEGORY[key] : DEFAULT_BUDGET;
}

// ─── SimState ─────────────────────────────────────────────
const SimState = {

  // Location
  location: {
    name:            '',
    lat:             0,
    lon:             0,
    country:         '',
    climateData:     null,   // Open-Meteo response
    locationProfile: null,   // P1 Gemini response
  },

  // Season
  selectedMonth: null,       // 1-12, set on init to current month

  // Plant
  plant: {
    id:          null,
    name:        '',
    scientific:  '',
    category:    '',
    emoji:       '🌿',
    suitability: null,       // P2 Gemini response
  },

  // Scores (integers 0-100)
  scores: {
    soilHealth:    50,
    plantVitality: 50,
    waterBalance:  70,
    ecosystem:     50,
  },

  // Growth stages
  currentGrowthStage: 1,     // 1-6 (growth stages within stage-6 section)
  stageGuide:         null,  // Current P3 response

  // Stage completion tracking
  stageDecisionsComplete: {
    1: false,  // pre-planting
    2: false,  // planting
  },

  // Decision history
  decisions: [],             // [{id, choice, effects, stage, timestamp}]
  events:    [],             // [{type, response, timestamp}]

  // Gemini response cache
  geminiCache: {},           // keyed by prompt hash

  // Wallet / economy
  wallet: {
    startingBudget: 0,     // set on plant selection from BUDGET_BY_CATEGORY
    balance:        0,     // current balance (decreases as money is spent)
    totalSpent:     0,
    transactions:   [],    // [{label, amount, stage, timestamp}]
    estimatedYield: null,  // from harvest stage
    marketPrice:    null,  // ₹ per unit
    grossRevenue:   null,
    harvestEconomics: null, // full P3 harvest_economics object
  },

  // UI state
  isLoading: false,
  error:     null,
};

// ─── Score update ─────────────────────────────────────────
function updateScores(deltas) {
  for (const [key, delta] of Object.entries(deltas)) {
    if (SimState.scores[key] === undefined) continue;
    SimState.scores[key] = clamp(SimState.scores[key] + (delta || 0), 0, 100);
  }
  // Refresh UI
  if (typeof ScoresUI !== 'undefined')    ScoresUI.render();
  if (typeof PlantVisualUI !== 'undefined') PlantVisualUI.update();
}

// ─── Apply a decision from P3/P4 ─────────────────────────
function applyDecision(decisionId, choiceId, option) {
  const effects = option.effects || {};
  updateScores({
    soilHealth:    effects.soil_health    || 0,
    plantVitality: effects.plant_vitality || 0,
    waterBalance:  effects.water_balance  || 0,
    ecosystem:     effects.ecosystem      || 0,
  });

  SimState.decisions.push({
    id:        decisionId,
    choice:    choiceId,
    effects:   effects,
    stage:     SimState.currentGrowthStage,
    timestamp: Date.now(),
  });

  // Animate score deltas in UI
  if (typeof ScoresUI !== 'undefined') ScoresUI.showDeltas(effects);
}

// ─── Initialize scores from P1 + P2 ──────────────────────
function initializeScores(p1Response, p2Response) {
  if (p1Response?.initial_scores) {
    const s = p1Response.initial_scores;
    SimState.scores.soilHealth   = s.soil_health   ?? 50;
    SimState.scores.waterBalance = s.water_balance ?? 70;
    SimState.scores.ecosystem    = s.ecosystem     ?? 50;
  }
  if (p2Response?.initial_plant_vitality != null) {
    SimState.scores.plantVitality = p2Response.initial_plant_vitality;
  }
  if (typeof ScoresUI !== 'undefined') ScoresUI.render();
}

// ─── Passive vitality drift at each stage transition ──────
function passiveVitalityAdjustment() {
  const { soilHealth, waterBalance, ecosystem } = SimState.scores;
  const envAvg = Math.round((soilHealth + waterBalance + ecosystem) / 3);
  const drift  = Math.round((envAvg - SimState.scores.plantVitality) * 0.1);
  if (drift !== 0) {
    updateScores({ plantVitality: drift });
  }
}

// ─── Compute overall grade ────────────────────────────────
function computeGrade() {
  const avg = Math.round(
    (SimState.scores.soilHealth +
     SimState.scores.plantVitality +
     SimState.scores.waterBalance +
     SimState.scores.ecosystem) / 4
  );

  const grades = [
    [95, 'A+'], [90, 'A'], [85, 'A-'],
    [80, 'B+'], [75, 'B'], [70, 'B-'],
    [65, 'C+'], [60, 'C'], [55, 'C-'],
    [40, 'D'],
  ];

  const grade = grades.find(([min]) => avg >= min)?.[1] ?? 'F';
  const label =
    avg >= 90 ? 'Outstanding' :
    avg >= 80 ? 'Good' :
    avg >= 70 ? 'Satisfactory' :
    avg >= 60 ? 'Needs Improvement' :
    avg >= 40 ? 'Poor' : 'Failed';

  return { avg, grade, label };
}

// ─── Wallet helpers ───────────────────────────────────────
function initWallet(category) {
  const budget = getBudgetForPlant(category);
  SimState.wallet.startingBudget = budget;
  SimState.wallet.balance        = budget;
  SimState.wallet.totalSpent     = 0;
  SimState.wallet.transactions   = [];
  SimState.wallet.estimatedYield = null;
  SimState.wallet.marketPrice    = null;
  SimState.wallet.grossRevenue   = null;
  SimState.wallet.harvestEconomics = null;
  if (typeof WalletUI !== 'undefined') WalletUI.init(budget);
}

function spendMoney(amount, label, stage) {
  if (!amount || amount <= 0) return;
  SimState.wallet.balance    -= amount;
  SimState.wallet.totalSpent += amount;
  SimState.wallet.transactions.push({
    label,
    amount,
    stage: stage || SimState.currentGrowthStage,
    timestamp: Date.now(),
  });
  if (typeof WalletUI !== 'undefined') WalletUI.render(amount);
}

// ─── Helpers ──────────────────────────────────────────────
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, Math.round(val)));
}

// Build compact decisions summary for P3/P4 prompts
function getDecisionsSummary(last = 5) {
  return SimState.decisions.slice(-last).map(d =>
    `${d.id}: chose ${d.choice}`
  ).join('; ') || 'none yet';
}
