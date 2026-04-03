# BUILD SPECIFICATION — Plant Growth Simulator
## For Claude Code to Build Without Ambiguity

---

## 1. PROJECT SETUP

### Technology
- Pure HTML5, CSS3, ES6+ JavaScript
- No frameworks, no build tools, no npm
- Single `index.html` entry point
- All JS modules loaded with `<script>` tags (or ES module imports with `type="module"`)
- CSS loaded with `<link>` tags

### Hosting
- Cloudflare Pages via GitHub repo
- Project lives in `/Plants` folder within existing site
- Entry URL: `pradeepjainbp.in/Plants/`

### External Dependencies (CDN only)
- None required for core functionality
- Optional: Google Fonts for typography

---

## 2. UI LAYOUT & DESIGN

### Design Direction
**Aesthetic: "Living Earth"** — warm, organic, soil-toned interface that feels like opening a gardener's journal. Think: earth browns, leaf greens, terracotta, warm cream backgrounds. NOT sterile white tech UI.

### Color Palette (CSS Custom Properties)
```css
:root {
  /* Earth Tones */
  --bg-primary: #faf6f0;        /* warm cream */
  --bg-secondary: #f0e8db;      /* light sand */
  --bg-card: #ffffff;
  --bg-soil: #5c4033;           /* rich brown */
  --bg-soil-light: #8b6f5e;
  
  /* Greens — plant health spectrum */
  --green-lush: #2d8a4e;
  --green-healthy: #4caf50;
  --green-pale: #8bc34a;
  --yellow-stress: #ffc107;
  --orange-danger: #ff9800;
  --red-critical: #f44336;
  
  /* UI Colors */
  --text-primary: #2c1810;      /* dark brown */
  --text-secondary: #6b5242;
  --text-muted: #9c8577;
  --accent: #2d8a4e;            /* forest green */
  --accent-hover: #236b3d;
  --border: #e0d5c8;
  
  /* Score Gauge Colors */
  --score-excellent: #2d8a4e;
  --score-good: #8bc34a;
  --score-fair: #ffc107;
  --score-poor: #ff9800;
  --score-critical: #f44336;
}
```

### Typography
```css
/* Use a warm, readable font pair */
--font-display: 'Playfair Display', Georgia, serif;  /* headings */
--font-body: 'Source Sans 3', 'Segoe UI', sans-serif; /* body text */
--font-mono: 'JetBrains Mono', monospace;             /* scores, data */
```

### Page Layout (Single Page, Stage-Based)
```
┌─────────────────────────────────────────────┐
│  HEADER: "🌱 Plant Growth Simulator"        │
│  Subtitle: "Learn to grow anything, anywhere"│
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │     PROGRESS BAR (6 stages)         │    │
│  │  [1]──[2]──[3]──[4]──[5]──[6]      │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │     ACTIVE STAGE CONTENT            │    │
│  │     (only one visible at a time)    │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌──────────┐  ┌───────────────────────┐    │
│  │  PLANT   │  │   SCORE DASHBOARD     │    │
│  │  VISUAL  │  │   4 score gauges      │    │
│  │  (CSS)   │  │                       │    │
│  └──────────┘  └───────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  FOOTER: credits, Gemini badge      │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

### Responsive Behavior
- **Desktop (>1024px):** Plant visual + score dashboard side by side below main content
- **Tablet (768-1024px):** Plant visual above score dashboard, both full width
- **Mobile (<768px):** Everything stacked vertically. Decision cards become swipeable. Score dashboard becomes 2×2 grid of compact gauges.

---

## 3. STAGE-BY-STAGE UI SPECIFICATION

### Stage 1: Pick Location
```
┌─────────────────────────────────────┐
│  🌍 Where will you grow?            │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🔍 Search for a place...    │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─ Autocomplete Dropdown ─────┐    │
│  │ Bangalore, Karnataka, India │    │
│  │ Bangkok, Thailand           │    │
│  │ Barcelona, Spain            │    │
│  └─────────────────────────────┘    │
│                                     │
│  [After selection:]                 │
│  ┌─ Location Card ─────────────┐    │
│  │ 📍 Bangalore, India         │    │
│  │ Lat: 12.97, Lon: 77.59     │    │
│  │ Climate: Tropical Savanna   │    │
│  │                  [Change]   │    │
│  └─────────────────────────────┘    │
│                                     │
│              [Next →]               │
└─────────────────────────────────────┘
```
**Behavior:**
- Input has 500ms debounce
- Calls Nominatim on each debounced keystroke
- Shows top 5 results in dropdown
- On selection: stores lat/long/name in SimState
- Clicking Next triggers Open-Meteo climate fetch

### Stage 2: Pick Season / Month
```
┌───────────────────────────────────────┐
│  📅 When do you want to plant?        │
│                                       │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐            │
│  │Jan│ │Feb│ │Mar│ │Apr│            │
│  └───┘ └───┘ └───┘ └───┘            │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐            │
│  │May│ │Jun│ │Jul│ │Aug│            │
│  └───┘ └───┘ └───┘ └───┘            │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐            │
│  │Sep│ │Oct│ │Nov│ │Dec│            │
│  └───┘ └───┘ └───┘ └───┘            │
│                                       │
│  If India: Show Kharif/Rabi/Zaid      │
│  labels above the month grid          │
│                                       │
│  Current month auto-highlighted       │
│                                       │
│         [← Back]  [Next →]            │
└───────────────────────────────────────┘
```
**Behavior:**
- Month cards are clickable, selected month gets green border
- Current month is pre-selected
- For Indian locations, show season labels: "Kharif (Jun–Oct)", "Rabi (Oct–Mar)", "Zaid (Mar–Jun)"
- On Next: calls **P1 (Location + Season Analysis)** via Gemini
- Shows loading spinner: "GrowBot is analyzing your location..."

### Stage 3: Pick Plant
```
┌───────────────────────────────────────┐
│  🌿 What do you want to grow?         │
│                                       │
│  ┌─ Category Tabs ────────────────┐   │
│  │ All │ Veg │ Fruit │ Herb │ ... │   │
│  └────────────────────────────────┘   │
│                                       │
│  ┌─────────────────────────────┐      │
│  │ 🔍 Search plants...         │      │
│  └─────────────────────────────┘      │
│                                       │
│  ┌─ Search Results ────────────┐      │
│  │ 🍅 Tomato (Tamatar)    🟢95│      │
│  │ 🌶️ Green Chilli        🟢88│      │
│  │ 🥬 Spinach (Palak)     🟡65│      │
│  │ 🍎 Apple               🔴22│      │
│  └─────────────────────────────┘      │
│                                       │
│  [Or: "🤔 Suggest plants for me"]     │
│                                       │
│  [After selection:]                   │
│  ┌─ Suitability Card ─────────┐      │
│  │ 🍅 Tomato                   │      │
│  │ Solanum lycopersicum        │      │
│  │                             │      │
│  │ Suitability: ████████░░ 85  │      │
│  │ Grade: GOOD 🟢              │      │
│  │                             │      │
│  │ "Tomatoes thrive in         │      │
│  │  Bangalore's mild climate.  │      │
│  │  Good soil match. Watch     │      │
│  │  for excess monsoon rain."  │      │
│  │                             │      │
│  │ 🌡️ Temp: 92/100             │      │
│  │ 💧 Water: 78/100            │      │
│  │ 🪨 Soil: 85/100             │      │
│  │ 📅 Season: 90/100           │      │
│  │                             │      │
│  │ Alternatives:               │      │
│  │ • Cherry Tomato (90)        │      │
│  │ • Brinjal (88)              │      │
│  │ • Capsicum (82)             │      │
│  └─────────────────────────────┘      │
│                                       │
│         [← Back]  [Start Growing →]   │
└───────────────────────────────────────┘
```
**Behavior:**
- Search filters plants.json locally (no API call)
- Search matches across all language fields (EN, HI, KN, TA, TE, MR)
- Category tabs filter by `category` field
- When a plant is selected, calls **P2 (Plant Match)** via Gemini
- Suitability score shown as colored progress bar
- "Suggest plants for me" calls P2 in suggest mode
- Color coding: ≥80 green, 60-79 lime/yellow, 40-59 orange, <40 red
- Clicking an alternative auto-selects that plant and re-fetches P2

### Stage 4: Pre-Planting Decisions
```
┌───────────────────────────────────────┐
│  🪴 Prepare Your Growing Space        │
│                                       │
│  Stage 1 of 6: Pre-Planting           │
│                                       │
│  ┌─ Decision Card 1 ──────────┐       │
│  │ 🧱 What container/bed?     │       │
│  │                             │       │
│  │ ┌─────────┐ ┌─────────┐    │       │
│  │ │ Ground  │ │ Raised  │    │       │
│  │ │ Bed     │ │ Bed     │    │       │
│  │ │ +5 soil │ │ +10 soil│    │       │
│  │ │ Free    │ │ Medium  │    │       │
│  │ └─────────┘ └─────────┘    │       │
│  │                             │       │
│  │ "Raised beds improve        │       │
│  │  drainage and let you       │       │
│  │  control soil quality."     │       │
│  └─────────────────────────────┘       │
│                                       │
│  [More decision cards...]              │
│                                       │
│         [← Back]  [Next Stage →]       │
└───────────────────────────────────────┘
```
**Behavior:**
- Calls **P3 (Stage Guide)** for stage 1 when entering
- Shows loading spinner: "GrowBot is preparing your planting guide..."
- Renders 3-5 decision cards from P3 response
- Each card has 2-3 options, shown as clickable tiles
- Selecting an option immediately updates scores (animated)
- "Why" text shown below each option in muted text
- All decisions must be made before "Next Stage" is enabled

### Stage 5: Planting
Same layout as Stage 4, but with planting-specific decisions from P3 (stage 2).

### Stage 6: Growth Timeline
```
┌───────────────────────────────────────────┐
│  🌱 Growing Timeline                      │
│                                           │
│  ┌─ Timeline Slider ─────────────────┐    │
│  │ [🌱]────[🌿]────[🌸]────[🍅]────[✂️] │    │
│  │  Sprout  Veg   Flower  Fruit  Harvest │    │
│  │        ↑ You are here                  │    │
│  └────────────────────────────────────┘    │
│                                           │
│  ┌──────────────────────────────────┐     │
│  │        PLANT VISUAL              │     │
│  │     (CSS plant changes with      │     │
│  │      each stage and score)       │     │
│  │                                  │     │
│  │         🌿🌿                     │     │
│  │          │                       │     │
│  │          │                       │     │
│  │    ══════╧══════                 │     │
│  │    ░░░SOIL░░░░░                  │     │
│  └──────────────────────────────────┘     │
│                                           │
│  ┌─ Stage Info ─────────────────────┐     │
│  │ 🌿 Vegetative Growth (Week 4-8)  │     │
│  │ Your tomato is growing leaves    │     │
│  │ and building strength.           │     │
│  │                                  │     │
│  │ Care Tips:                       │     │
│  │ • Water deeply every 3 days      │     │
│  │ • Watch for aphids on new growth │     │
│  └──────────────────────────────────┘     │
│                                           │
│  ┌─ Decision Point (if triggered) ──┐     │
│  │ ⚠️ Pest Alert: Aphids detected!  │     │
│  │                                  │     │
│  │ [Neem Oil] [Chemical] [Ignore]   │     │
│  └──────────────────────────────────┘     │
│                                           │
│  [My plant looks sick 🩺]                  │
│                                           │
│  [⏩ Advance to Next Stage]                │
│                                           │
│  ┌─ Score Dashboard ────────────────┐     │
│  │ 🪨 Soil: 72   💚 Vitality: 85    │     │
│  │ 💧 Water: 68   🌍 Ecosystem: 55  │     │
│  └──────────────────────────────────┘     │
└───────────────────────────────────────────┘
```
**Behavior:**
- Timeline slider is visual-only (not draggable), advances with button
- Each stage advance calls **P3 (Stage Guide)** for the next stage
- Decision points may trigger mid-stage, calling **P4 (Decision Point Advisor)**
- Plant visual updates with each stage (see Visual System below)
- Scores animate on change
- "My plant looks sick" button opens diagnostic modal (calls P5)
- At final stage (Harvest): show harvest summary with final scores and educational recap

---

## 4. CSS PLANT VISUAL SYSTEM

### Architecture
The plant is built from CSS elements, not images. This keeps file size tiny and allows smooth animation.

### HTML Structure
```html
<div class="plant-container">
  <div class="plant">
    <div class="fruit fruit-1"></div>
    <div class="fruit fruit-2"></div>
    <div class="flower"></div>
    <div class="leaf leaf-left-1"></div>
    <div class="leaf leaf-right-1"></div>
    <div class="leaf leaf-left-2"></div>
    <div class="leaf leaf-right-2"></div>
    <div class="leaf leaf-left-3"></div>
    <div class="leaf leaf-right-3"></div>
    <div class="stem"></div>
  </div>
  <div class="soil">
    <div class="soil-surface"></div>
    <div class="soil-body"></div>
  </div>
</div>
```

### CSS Custom Properties (Driven by JS)
```css
.plant-container {
  --stem-height: 40%;       /* 0-100% of container */
  --stem-width: 4px;        /* thickens with growth */
  --stem-color: #4a7c59;
  --leaf-color: #4caf50;    /* changes with health */
  --leaf-size: 1;           /* scale factor */
  --leaf-droop: 0deg;       /* 0 = perky, 30+ = wilting */
  --leaf-count: 6;          /* controls visibility */
  --flower-visible: 0;      /* 0 or 1 */
  --flower-color: #ffeb3b;
  --fruit-visible: 0;       /* 0 or 1 */
  --fruit-color: #f44336;
  --fruit-size: 0;          /* 0-1 scale */
  --soil-color: #5c4033;
  --soil-moisture: 0.5;     /* affects soil darkness */
}
```

### Visual States by Plant Vitality Score

| Score | Leaf Color | Droop Angle | Stem | Special |
|-------|-----------|-------------|------|---------|
| 90-100 | `#2d8a4e` (deep green) | 0° | Thick, tall | Slight sway animation |
| 70-89 | `#4caf50` (green) | 5° | Medium | Normal |
| 50-69 | `#8bc34a` (yellow-green) | 15° | Medium | Some leaves hidden |
| 30-49 | `#ffc107` (yellow) | 25° | Thin | Brown spots (pseudo-elements) |
| 10-29 | `#ff9800` (orange-brown) | 40° | Very thin | Most leaves hidden, brown |
| 0-9 | `#795548` (brown) | 60° | Collapsed | Nearly all leaves gone |

### Visual States by Growth Stage

| Stage | Stem Height | Leaves | Flowers | Fruit |
|-------|------------|--------|---------|-------|
| Pre-planting | 0% | 0 | No | No |
| Planting | 5% (seed bump) | 0 | No | No |
| Sprouting | 15% | 2 (tiny) | No | No |
| Vegetative | 60% | 6 (full) | No | No |
| Flowering | 80% | 6 | Yes | No |
| Fruiting/Harvest | 100% | 6 | Fading | Yes |

### Transition Animation
```css
.plant * {
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
```
All changes (color, size, droop) animate smoothly over 0.8 seconds.

---

## 5. SCORE DASHBOARD

### Display Format
Four circular gauge arcs (or horizontal bars on mobile).

```
  ┌────────────┐  ┌────────────┐
  │   🪨 72    │  │   💚 85    │
  │ Soil Health │  │  Vitality  │
  │  ████████░░ │  │ █████████░ │
  └────────────┘  └────────────┘
  ┌────────────┐  ┌────────────┐
  │   💧 68    │  │   🌍 55    │
  │   Water    │  │ Ecosystem  │
  │  ███████░░░ │  │ ██████░░░░ │
  └────────────┘  └────────────┘
```

### Score Colors
- 80-100: `--score-excellent` (green)
- 60-79: `--score-good` (lime)
- 40-59: `--score-fair` (amber)
- 20-39: `--score-poor` (orange)
- 0-19: `--score-critical` (red)

### Tooltips
On hover/tap, each gauge shows a tooltip explaining the score:
- Soil Health: "Reflects pH balance, nutrient levels, organic matter, and drainage quality"
- Plant Vitality: "Overall plant health — driven by soil, water, weather, and your care decisions"
- Water Balance: "How well-watered your plant is — too much or too little both hurt"
- Ecosystem: "Long-term soil ecosystem health — builds with organic practices over time"

### Score Change Indicators
When a score changes after a decision:
- Show a `+5` or `-3` animated number floating upward from the gauge
- Number is green for positive, red for negative
- Fades out after 1.5 seconds

---

## 6. STATE MANAGEMENT

### SimState Object
```javascript
// state.js
const SimState = {
  // Location
  location: {
    name: '',
    lat: 0,
    lon: 0,
    country: '',
    climateData: null,        // Open-Meteo response
    locationProfile: null      // P1 Gemini response
  },
  
  // Season
  selectedMonth: new Date().getMonth() + 1,
  
  // Plant
  plant: {
    id: '',
    name: '',
    scientific: '',
    category: '',
    suitability: null          // P2 Gemini response
  },
  
  // Scores
  scores: {
    soilHealth: 50,
    plantVitality: 50,
    waterBalance: 70,
    ecosystem: 50
  },
  
  // Growth
  currentStage: 1,             // 1-6
  stageGuide: null,            // Current P3 response
  
  // History
  decisions: [],               // [{id, choice, effects, timestamp}]
  events: [],                  // [{type, response, timestamp}]
  
  // Cache
  geminiCache: {},             // keyed by prompt hash
  
  // UI State
  isLoading: false,
  error: null
};
```

### State Mutation Functions
```javascript
// All state changes go through these functions
function updateScores(deltas) {
  // deltas = {soilHealth: +5, plantVitality: -3, ...}
  for (const [key, delta] of Object.entries(deltas)) {
    SimState.scores[key] = clamp(SimState.scores[key] + delta, 0, 100);
  }
  renderScores();    // Update UI
  renderPlant();     // Update plant visual
}

function addDecision(decisionId, choiceId, effects) {
  SimState.decisions.push({
    id: decisionId,
    choice: choiceId,
    effects: effects,
    stage: SimState.currentStage,
    timestamp: Date.now()
  });
  updateScores(effects);
}

function advanceStage() {
  if (SimState.currentStage < 6) {
    SimState.currentStage++;
    loadStageGuide(SimState.currentStage);
  }
}
```

---

## 7. API CALL SEQUENCE (Implementation Detail)

### api-gemini.js
```javascript
async function callGemini(promptId, variables) {
  SimState.isLoading = true;
  showLoadingSpinner(getLoadingMessage(promptId));
  
  // 1. Load prompt template
  const systemPrompt = await loadPrompt('system-prompt');
  const promptTemplate = await loadPrompt(promptId);
  
  // 2. Interpolate variables
  const prompt = interpolate(promptTemplate, variables);
  
  // 3. Check cache
  const cacheKey = hashString(promptId + JSON.stringify(variables));
  if (SimState.geminiCache[cacheKey]) {
    SimState.isLoading = false;
    hideLoadingSpinner();
    return SimState.geminiCache[cacheKey];
  }
  
  // 4. Call Cloudflare Worker proxy
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json'
    }
  };
  
  let retries = 0;
  const maxRetries = 2;
  
  while (retries <= maxRetries) {
    try {
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          showToast('GrowBot is busy — please try again in 30 seconds');
          break;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) throw new Error('Empty response');
      
      const parsed = JSON.parse(text);
      
      // Cache successful response
      SimState.geminiCache[cacheKey] = parsed;
      SimState.isLoading = false;
      hideLoadingSpinner();
      return parsed;
      
    } catch (err) {
      retries++;
      if (retries > maxRetries) {
        SimState.isLoading = false;
        hideLoadingSpinner();
        showToast('GrowBot had trouble thinking — please try again');
        return null;
      }
      await sleep(2000); // Wait 2s before retry
    }
  }
}
```

### Prompt Loading
```javascript
// Prompts stored as .txt files, loaded once and cached
const promptCache = {};

async function loadPrompt(name) {
  if (promptCache[name]) return promptCache[name];
  const response = await fetch(`/Plants/prompts/${name}.txt`);
  const text = await response.text();
  promptCache[name] = text;
  return text;
}

function interpolate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key];
    return typeof val === 'object' ? JSON.stringify(val) : String(val);
  });
}
```

---

## 8. SCORING ENGINE LOGIC

### Score Initialization
After P1 and P2 are called:
```javascript
function initializeScores(p1Response, p2Response) {
  SimState.scores = {
    soilHealth: p1Response.initial_scores.soil_health,
    plantVitality: p2Response.initial_plant_vitality,
    waterBalance: p1Response.initial_scores.water_balance,
    ecosystem: p1Response.initial_scores.ecosystem
  };
}
```

### Score Modification (Decision-Based)
When user makes a decision, the P3/P4 response includes exact deltas:
```javascript
function applyDecision(decisionId, optionId, option) {
  // option.effects = {soil_health: 5, plant_vitality: 3, water_balance: 0, ecosystem: 2}
  updateScores({
    soilHealth: option.effects.soil_health || 0,
    plantVitality: option.effects.plant_vitality || 0,
    waterBalance: option.effects.water_balance || 0,
    ecosystem: option.effects.ecosystem || 0
  });
  
  addDecision(decisionId, optionId, option.effects);
}
```

### Score Clamping
All scores are always clamped to [0, 100]:
```javascript
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
```

### Plant Vitality Auto-Adjustment
Plant vitality naturally trends toward the average of other scores (passive influence):
```javascript
function passiveVitalityAdjustment() {
  const { soilHealth, waterBalance, ecosystem } = SimState.scores;
  const environmentAvg = Math.round((soilHealth + waterBalance + ecosystem) / 3);
  const currentVitality = SimState.scores.plantVitality;
  
  // Vitality drifts 10% toward environment average each stage
  const drift = Math.round((environmentAvg - currentVitality) * 0.1);
  if (drift !== 0) {
    updateScores({ plantVitality: drift });
  }
}
```
Called at each stage transition.

---

## 9. LOADING STATES & FEEDBACK

### Loading Messages (per prompt)
| Prompt | Loading Message |
|--------|----------------|
| P1 | "GrowBot is studying your location's climate and soil..." |
| P2 (score) | "GrowBot is checking if {{PLANT_NAME}} will thrive here..." |
| P2 (suggest) | "GrowBot is finding the best plants for your location..." |
| P3 | "GrowBot is preparing your growing guide for this stage..." |
| P4 | "GrowBot is analyzing the situation..." |
| P5 | "GrowBot is diagnosing your plant..." |

### Loading Spinner Design
A simple CSS animation: rotating leaf icon or pulsing plant emoji.
```css
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
}
.loading-spinner .icon {
  font-size: 32px;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.1); opacity: 1; }
}
```

### Toast Notifications
For non-blocking feedback (errors, score changes):
```css
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-soil);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  animation: slideUp 0.3s ease, fadeOut 0.3s ease 2.7s;
  z-index: 1000;
}
```

---

## 10. DIAGNOSTIC MODAL (P5)

### Trigger
"My plant looks sick 🩺" button visible during Stage 6 (growth timeline).

### UI
```
┌─ Diagnostic Modal ──────────────────────┐
│                                         │
│  🩺 What symptoms do you see?           │
│                                         │
│  ☐ Yellowing leaves                     │
│  ☐ Brown spots on leaves                │
│  ☐ Wilting despite watering             │
│  ☐ Stunted growth                       │
│  ☐ White powdery coating                │
│  ☐ Holes in leaves                      │
│  ☐ Stem rotting at base                 │
│  ☐ Leaves curling                       │
│  ☐ Fruit dropping early                 │
│  ☐ Sticky residue on leaves             │
│                                         │
│         [Diagnose 🔍]  [Cancel]         │
│                                         │
│  [After diagnosis:]                     │
│  ┌─────────────────────────────────┐    │
│  │ 🔬 Diagnosis: Nitrogen          │    │
│  │    Deficiency (85% confidence)  │    │
│  │                                 │    │
│  │ Why: Yellowing starts from      │    │
│  │ older leaves upward, common     │    │
│  │ in laterite soils after heavy   │    │
│  │ rain leaches nitrogen.          │    │
│  │                                 │    │
│  │ 💊 Treatment:                   │    │
│  │ Apply diluted fish emulsion     │    │
│  │ or urea at 1g/litre.           │    │
│  │                                 │    │
│  │ ⏱ Recovery: ~7 days             │    │
│  │                                 │    │
│  │ [Apply Treatment] [Dismiss]     │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### Behavior
- User selects 1+ symptoms from checkboxes
- Clicks "Diagnose" → calls **P5**
- Shows diagnosis with confidence level
- "Apply Treatment" button applies score adjustments from P5 response

---

## 11. HARVEST SUMMARY

When user completes Stage 6:
```
┌───────────────────────────────────────────┐
│  🎉 Harvest Complete!                     │
│                                           │
│  You grew: Tomato (Tamatar)               │
│  Location: Bangalore, India               │
│  Season: Kharif                           │
│                                           │
│  ┌─ Final Scores ──────────────────┐      │
│  │ 🪨 Soil Health:    78 / 100     │      │
│  │ 💚 Plant Vitality:  82 / 100    │      │
│  │ 💧 Water Balance:  70 / 100     │      │
│  │ 🌍 Ecosystem:      62 / 100    │      │
│  │                                 │      │
│  │ Overall Grade: B+ (Good)        │      │
│  └─────────────────────────────────┘      │
│                                           │
│  ┌─ What You Learned ─────────────┐       │
│  │ • Composting boosted soil       │       │
│  │   health by 15 points          │       │
│  │ • Neem oil saved your plant     │       │
│  │   from aphid damage             │       │
│  │ • Over-watering in August       │       │
│  │   caused temporary root stress  │       │
│  └─────────────────────────────────┘       │
│                                           │
│  [🔄 Grow Something New]                   │
│  [🔗 Share Results]                        │
└───────────────────────────────────────────┘
```

### Grade Calculation
- A+ (95-100), A (90-94), A- (85-89)
- B+ (80-84), B (75-79), B- (70-74)
- C+ (65-69), C (60-64), C- (55-59)
- D (40-54), F (<40)

Grade is average of all 4 final scores.

---

## 12. IMPLEMENTATION ORDER FOR CLAUDE CODE

Build in this exact sequence to enable incremental testing:

### Phase 1: Skeleton (Estimated: 30 min)
1. Create `/Plants/index.html` with all `<section>` stage containers
2. Create `main.css` with theme variables and basic layout
3. Create `app.js` with stage show/hide logic
4. Verify: stages switch when clicking Next/Back

### Phase 2: Location & Season (Estimated: 45 min)
5. Create `api-nominatim.js` with debounced search
6. Create `ui-location.js` with autocomplete dropdown
7. Create `ui-season.js` with month grid
8. Create `api-weather.js` with Open-Meteo fetch
9. Verify: can search location, select month, fetch climate data

### Phase 3: Plant Selection (Estimated: 45 min)
10. Place `plants.json` in `/Plants/data/`
11. Create `ui-plant-picker.js` with multilingual search
12. Create `components.css` with card, dropdown, badge styles
13. Verify: can search plants, filter by category, see results

### Phase 4: Gemini Integration (Estimated: 60 min)
14. Create `api-gemini.js` with proxy caller + retry logic
15. Create all prompt `.txt` files in `/Plants/prompts/`
16. Create `state.js` with SimState + scoring engine
17. Create `gemini-proxy.js` Cloudflare Worker
18. Verify: P1 and P2 calls work, responses parse correctly

### Phase 5: Growth Simulation (Estimated: 90 min)
19. Create `ui-pre-planting.js` and `ui-planting.js` (decision cards)
20. Create `ui-timeline.js` (timeline slider, stage progression)
21. Wire P3 and P4 Gemini calls to stage transitions
22. Create `ui-scores.js` (score gauges with animation)
23. Verify: can progress through all 6 stages with decisions

### Phase 6: Plant Visual (Estimated: 60 min)
24. Create `plant-visual.css` (full CSS plant illustration)
25. Create `ui-plant-visual.js` (maps scores to CSS properties)
26. Wire visual updates to score changes and stage transitions
27. Verify: plant changes appearance based on health and stage

### Phase 7: Polish (Estimated: 45 min)
28. Create `ui-diagnostic.js` (symptom modal + P5 call)
29. Create `responsive.css` (mobile breakpoints)
30. Add harvest summary screen
31. Add loading spinners, toast notifications, error states
32. Create `utils.js` with shared helpers
33. Final testing across all stages

### Total Estimated Build Time: ~6-7 hours for Claude Code
