# FOLDER & FILE STRUCTURE — /Plants
## Plant Growth Simulator

---

```
/Plants
│
├── index.html                  # Main entry point — single-page app
├── manifest.json               # PWA manifest (optional, for mobile add-to-homescreen)
│
├── /css
│   ├── main.css                # Layout, typography, global styles
│   ├── plant-visual.css        # CSS-based plant illustration system
│   ├── components.css          # Cards, buttons, modals, sliders, score gauges
│   └── responsive.css          # Mobile-first breakpoints
│
├── /js
│   ├── app.js                  # App initialization, routing between stages
│   ├── state.js                # SimState object, score engine, state transitions
│   ├── api-nominatim.js        # Nominatim geocoding + autocomplete
│   ├── api-weather.js          # Open-Meteo climate data fetcher
│   ├── api-gemini.js           # Gemini proxy caller + response parser + retry logic
│   ├── ui-location.js          # Stage 1: Location picker UI
│   ├── ui-season.js            # Stage 2: Month/season selector UI
│   ├── ui-plant-picker.js      # Stage 3: Plant search + suitability display
│   ├── ui-pre-planting.js      # Stage 4: Soil prep decisions UI
│   ├── ui-planting.js          # Stage 5: Planting decisions UI
│   ├── ui-timeline.js          # Stage 6: Growth timeline slider + decision points
│   ├── ui-plant-visual.js      # CSS plant illustration controller (updates custom properties)
│   ├── ui-scores.js            # Score gauges and dashboard rendering
│   ├── ui-diagnostic.js        # On-demand symptom diagnostician modal
│   └── utils.js                # Debounce, formatters, validators, helpers
│
├── /data
│   ├── plants.json             # ~400 plants, multilingual, India-focused
│   └── soil-profiles.json      # ~50 regional soil profiles (fallback for SoilGrids)
│
├── /prompts
│   ├── system-prompt.txt       # GrowBot persona — shared across all Gemini calls
│   ├── p1-location-season.txt  # Prompt template: Location + Season Analysis
│   ├── p2-plant-match.txt      # Prompt template: Plant Match & Suitability
│   ├── p3-stage-guide.txt      # Prompt template: Stage Guide Generator
│   ├── p4-decision-point.txt   # Prompt template: Decision Point Advisor
│   └── p5-diagnostician.txt    # Prompt template: Symptom Diagnostician
│
├── /assets
│   ├── favicon.ico             # Plant/leaf favicon
│   ├── og-image.png            # Social share image (1200x630)
│   └── /icons                  # UI icons (inline SVG preferred, this is fallback)
│       ├── sun.svg
│       ├── water.svg
│       ├── soil.svg
│       └── leaf.svg
│
└── /worker
    └── gemini-proxy.js         # Cloudflare Worker script — proxies Gemini API calls
```

---

## FILE PURPOSES (Detailed)

### Root
| File | Purpose |
|------|---------|
| `index.html` | Single HTML file. Contains all stage containers as `<section>` elements, shown/hidden via JS. Loads all CSS and JS files. No routing library — pure show/hide. |

### /css
| File | Purpose |
|------|---------|
| `main.css` | CSS custom properties (theme colors, fonts), body layout, stage containers, typography scale. Dark soil-toned theme with green accents. |
| `plant-visual.css` | The CSS plant illustration: stem (border-based), leaves (border-radius shapes), flowers (radial-gradient), fruits (circles), soil bed (bottom rectangle). All driven by CSS custom properties that JS updates. |
| `components.css` | Reusable UI: autocomplete dropdown, decision cards, score gauge arcs, timeline slider, modal overlay, toast notifications, buttons, pill tags. |
| `responsive.css` | Breakpoints: mobile-first. 320px base → 768px tablet → 1024px desktop. Plant visual resizes, decision cards stack vertically on mobile. |

### /js
| File | Purpose |
|------|---------|
| `app.js` | Entry point. Initializes SimState, registers event listeners, manages stage transitions. Exposes `App.goToStage(n)` for navigation. |
| `state.js` | `SimState` object definition + scoring engine. Pure functions: `calculateSoilHealth()`, `calculatePlantVitality()`, `calculateWaterBalance()`, `calculateEcosystem()`. Also: `applyDecision(decisionId, choice)` which modifies scores based on Gemini-provided rules. |
| `api-nominatim.js` | `searchLocation(query)` → returns `[{name, lat, lon, country}]`. 500ms debounce built in. Caches in sessionStorage. |
| `api-weather.js` | `getClimateData(lat, lon)` → fetches monthly temperature, precipitation, humidity from Open-Meteo ERA5. Returns structured object with 12-month averages. |
| `api-gemini.js` | `callGemini(promptId, variables)` → loads prompt template, interpolates variables, calls Cloudflare Worker proxy, parses JSON response. Handles retries (max 2), timeout (15s), and malformed response gracefully. |
| `ui-location.js` | Renders location search input + autocomplete dropdown + selected location card with mini-map description. |
| `ui-season.js` | Renders 12-month grid or season cards (Kharif/Rabi/Zaid for India, Spring/Summer/Fall/Winter otherwise). |
| `ui-plant-picker.js` | Renders plant search input + autocomplete from plants.json + suitability color badge + alternative suggestions. |
| `ui-pre-planting.js` | Renders decision cards for: soil prep, compost, pH correction, drainage, bed type, mulching, microbial inoculants. Each card shows choice + educational "why" text. |
| `ui-planting.js` | Renders decision cards for: seed vs seedling, spacing, depth, starter fertiliser, watering rhythm. |
| `ui-timeline.js` | Renders growth stage timeline (horizontal slider), current stage detail panel, decision point modals when triggered, and a "time advance" button. |
| `ui-plant-visual.js` | Controls the CSS plant illustration. Maps `SimState.scores.plantVitality` to CSS custom properties. Handles growth stage transitions (sprout → leafy → flowering → fruiting). |
| `ui-scores.js` | Renders 4 score gauges (circular arc or horizontal bar), animates changes, shows tooltips explaining each score. |
| `ui-diagnostic.js` | Modal that appears when user clicks "My plant looks sick." Presents symptom checkboxes → calls P5 → shows diagnosis + remedy. |
| `utils.js` | `debounce()`, `formatDate()`, `clamp(val, min, max)`, `lerp()`, `randomBetween()`, `escapeHtml()`. |

### /data
| File | Purpose |
|------|---------|
| `plants.json` | ~400 plant entries with multilingual names, categories, tags. Schema detailed in Task 3. |
| `soil-profiles.json` | ~50 regional soil defaults. Schema: `{ "region": "Deccan Plateau", "bounds": [[lat1,lon1],[lat2,lon2]], "pH": 6.5, "texture": "red laterite", "drainage": "well-drained", "organicCarbon": "low", "npk": {"n":"medium","p":"low","k":"medium"} }` |

### /prompts
| File | Purpose |
|------|---------|
| `system-prompt.txt` | GrowBot persona definition. Loaded once and prepended to every Gemini call as the system instruction. |
| `p1-location-season.txt` | Template with `{{CLIMATE_DATA}}`, `{{LAT}}`, `{{LON}}`, `{{MONTH}}` placeholders. |
| `p2-plant-match.txt` | Template with `{{LOCATION_PROFILE}}`, `{{PLANT_NAME}}`, `{{PLANT_CATEGORY}}` placeholders. |
| `p3-stage-guide.txt` | Template with `{{PLANT_PROFILE}}`, `{{CURRENT_STAGE}}`, `{{SCORES}}` placeholders. |
| `p4-decision-point.txt` | Template with `{{EVENT_TYPE}}`, `{{SCORES}}`, `{{STAGE}}` placeholders. |
| `p5-diagnostician.txt` | Template with `{{SYMPTOMS}}`, `{{PLANT}}`, `{{STAGE}}`, `{{SCORES}}` placeholders. |

### /worker
| File | Purpose |
|------|---------|
| `gemini-proxy.js` | Cloudflare Worker that: (1) validates Origin header, (2) rate-limits by IP, (3) injects Gemini API key from env, (4) forwards request to Gemini API, (5) returns response. Deployed as a separate Worker route (e.g., `api.pradeepjainbp.in/gemini`). |

---

## TOTAL FILE COUNT: 28 files
## ESTIMATED TOTAL SIZE: ~250–350 KB (excluding plants.json which is ~80–120 KB)
