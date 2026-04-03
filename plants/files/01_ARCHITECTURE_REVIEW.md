# ARCHITECTURE REVIEW — Plant Growth Simulator
## For Pradeep's Sandbox (pradeepjainbp.in/Plants)

---

## 1. TECH STACK VERDICT

| Component | Original Choice | Verdict | Notes |
|-----------|----------------|---------|-------|
| Frontend | Pure HTML/CSS/JS | ✅ KEEP | Consistent with existing site, no build tools needed |
| Hosting | Cloudflare Pages + GitHub | ✅ KEEP | Already working for the Sandbox |
| Location | Nominatim (OpenStreetMap) | ✅ KEEP | Free, no key, reliable. Add 1s debounce + `Accept-Language: en` header |
| Weather | Open-Meteo | ✅ KEEP | Free, no key, excellent coverage. Use `/v1/climate` for historical normals + `/v1/forecast` for current |
| Soil | SoilGrids REST API | ⚠️ CRITICAL RISK | API is currently **paused** with no ETA for restoration. Needs redesign (see below) |
| AI Engine | Gemini 2.5 Flash | ✅ KEEP | $0.30/M input, $2.50/M output. Free tier available for dev. Excellent for structured JSON |
| API Proxy | Cloudflare Worker | ✅ KEEP | Already exists in your infra. Route Gemini calls through it to protect API key |
| Plant Data | Local plants.json | ✅ KEEP | ~400 entries, multilingual, fast autocomplete |

---

## 2. CRITICAL RISKS & MITIGATIONS

### RISK 1: SoilGrids API is DOWN (Severity: HIGH)

The SoilGrids REST API v2.0 is **currently paused** with no restoration timeline. This was flagged as unstable in the original plan — it has now gone from "unstable" to "unavailable."

**Redesigned Approach:**
Instead of depending on SoilGrids at runtime, use a **three-tier fallback strategy**:

1. **Primary: Ask Gemini** — Include soil inference in the Location Intelligence prompt. Gemini already knows typical soil profiles for most regions (e.g., "Bangalore: red laterite soil, pH 5.5–6.5, well-drained, low organic carbon"). This is accurate enough for an educational simulator.

2. **Secondary: Hardcoded regional soil profiles** — Create a `soil-profiles.json` with ~50 entries mapping broad regions (Indian agro-climatic zones, US USDA zones, etc.) to typical soil properties. Match by lat/long bounding boxes.

3. **Tertiary: User self-reports** — If location is unusual or Gemini is uncertain, show a simple soil questionnaire: "What kind of soil do you have?" with visual cards (clayey red, sandy, black cotton, loamy, etc.). This is also more educational.

**Why this is actually better:** Most users don't know what SoilGrids data means anyway. Gemini explaining "Your area typically has red laterite soil, which is acidic and drains quickly — here's what that means for your plant" is far more educational than raw pH numbers from an API.

### RISK 2: Gemini API Key Exposure (Severity: MEDIUM)

**Mitigation:** Route ALL Gemini calls through a Cloudflare Worker proxy. The Worker:
- Stores the Gemini API key as an environment variable
- Accepts requests from your domain only (CORS check on `Origin` header)
- Rate-limits per IP (e.g., 30 requests/hour) to prevent abuse
- Forwards to `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

### RISK 3: Gemini Returns Malformed JSON (Severity: MEDIUM)

Gemini is generally good at structured JSON, but hallucinations or truncated responses can happen.

**Mitigation:**
- Set `response_mime_type: "application/json"` in the Gemini request (forces JSON mode)
- Set `response_schema` with the exact expected schema (Gemini 2.5 Flash supports this)
- Client-side: wrap JSON.parse in try/catch, validate required fields exist
- If parse fails: show a friendly "GrowBot is thinking too hard — try again" message with retry button
- Max 2 automatic retries before showing error

### RISK 4: Nominatim Rate Limiting (Severity: LOW)

Nominatim's usage policy requires max 1 request/second and a custom User-Agent.

**Mitigation:**
- 500ms debounce on search input (only fire after user stops typing)
- Custom User-Agent header: `PradeepSandbox-PlantSim/1.0`
- Cache recent results in sessionStorage

### RISK 5: Open-Meteo Data Gaps (Severity: LOW)

Open-Meteo has excellent global coverage but may lack hyperlocal data for remote areas.

**Mitigation:**
- Use the `/v1/climate` endpoint with ERA5 reanalysis data (covers 1940–present globally)
- Fall back to Gemini's knowledge of regional climate if API returns sparse data

---

## 3. GEMINI PROMPT CHAIN — CRITICAL REDESIGN

### Original Plan: 5 Prompts
1. Location Intelligence
2. Plant Suitability
3. Full Growing Guide
4. Timeline Decision Points
5. Diagnostic Engine

### Problems with the Original:
- **Prompts 1 and 2 are always called together** — no user journey ever needs location data without immediately needing plant suitability. Merging saves a round-trip and ~$0.001 per session.
- **Prompt 3 (Full Growing Guide) is too monolithic** — a complete stage-by-stage guide for a plant could be 2000+ tokens of output. Better to generate it progressively as the user advances through stages.
- **Prompt 5 (Diagnostic Engine) is rarely used** — most users won't diagnose symptoms. It should be on-demand only, not part of the main chain.
- **Missing: a "What should I grow?" exploratory prompt** — many users won't know what to plant. They need a "recommend plants for my situation" entry point.

### Redesigned: 4 Prompts (+ 1 On-Demand)

| # | Prompt | When Called | Purpose |
|---|--------|------------|---------|
| P1 | **Location + Season Analysis** | After user picks location + month | Processes climate data + infers soil. Returns location profile with climate summary, soil profile, growing season info |
| P2 | **Plant Match & Suitability** | After user picks a plant (or asks "what should I grow?") | Scores the plant 0–100 for this location/season. Returns suitability score, reasoning, top 3 alternatives if score < 60, and basic growing requirements |
| P3 | **Stage Guide Generator** | Called once per growth stage transition | Returns advice for the CURRENT stage only (not all stages at once). Includes: actions to take, what to watch for, expected timeline, scoring adjustments |
| P4 | **Decision Point Advisor** | At each decision point in the timeline | Handles: pest alerts, weather events, nutrient deficiency signs, harvest timing. Returns contextual advice based on current scores and conditions |
| P5 | **Symptom Diagnostician** | On-demand only (user clicks "My plant looks sick") | User describes symptoms → Gemini reasons through possible causes → returns diagnosis + remedy. NOT part of main flow |

### Why 4+1 is Better Than 5:
- **Fewer round-trips in the critical path** (P1 merges location + soil)
- **Progressive generation** (P3 called per-stage, not all-at-once) saves tokens and keeps responses focused
- **P2 dual-purpose** — works for both "score this plant" and "suggest plants" use cases
- **P5 is truly on-demand** — saves tokens for users who never need it
- **Total cost per full session estimate:** ~$0.005–0.015 (very cheap)

---

## 4. API CALL SEQUENCE (Revised)

```
User picks location → Nominatim geocode → lat/long
                    → Open-Meteo /climate API → climate data
                    → [P1] Gemini: Location + Season Analysis
                    
User picks plant    → plants.json lookup
                    → [P2] Gemini: Plant Match & Suitability
                    → Show suitability score + alternatives
                    
User starts sim     → [P3] Gemini: Stage Guide (Stage 1: Pre-planting)
                    → User makes decisions → scores update
                    → [P3] Gemini: Stage Guide (Stage 2: Planting)
                    → ... repeat per stage ...
                    
Decision point      → [P4] Gemini: Decision Point Advisor
                    → User responds → scores update
                    
User clicks "sick"  → [P5] Gemini: Symptom Diagnostician (on-demand)
```

---

## 5. ADDITIONAL ARCHITECTURE DECISIONS

### State Management
Pure JS object (`window.SimState`) holding:
- `location`: lat, long, name, country, climate data
- `season`: selected month, derived season
- `plant`: selected plant object from plants.json
- `scores`: { soilHealth, plantVitality, waterBalance, ecosystem }
- `stage`: current growth stage index
- `history`: array of decisions made and their effects
- `geminiCache`: cached responses to avoid redundant API calls

No localStorage persistence — this is a session-based simulator. Each visit is a fresh start (keeps it simple, avoids stale state bugs).

### Visual Plant Rendering
Use **CSS-based illustration** rather than canvas or SVG sprites:
- Plant is composed of CSS shapes (stem, leaves, flowers, fruits)
- CSS custom properties drive colors: `--leaf-color`, `--stem-width`, `--droop-angle`
- Plant Vitality Score (0–100) maps to visual properties:
  - 80–100: Lush green, upright, full foliage
  - 60–79: Slightly pale, minor droop
  - 40–59: Yellowing leaves, visible wilt
  - 20–39: Brown spots, severe droop, leaf loss
  - 0–19: Nearly dead, brown/grey, collapsed
- Transitions animated with CSS transitions (0.5s ease)

Why CSS over Canvas/SVG sprites: simpler to build, easier to animate, smaller file size, and the "cartoon" aesthetic works well with CSS shapes. For a portfolio project, this is the right trade-off.

### Scoring Engine
All 4 scores are 0–100 integers, recalculated after each decision:

**Soil Health Score** = weighted average of:
- pH appropriateness for plant (25%)
- Nutrient levels NPK (25%)
- Organic matter / carbon (20%)
- Drainage match (15%)
- Microbiome health (15%)

**Plant Vitality Score** = weighted average of:
- Soil Health contribution (30%)
- Water Balance (25%)
- Season/climate match (20%)
- Care actions taken (15%)
- Pest/disease pressure (10%)

**Water Balance** = simple bucket model:
- Starts at 70 (optimal)
- Each day: rainfall adds, evaporation subtracts, user watering adds
- Over 85 = waterlogged, under 30 = drought stress
- Sweet spot varies by plant (Gemini provides optimal range)

**Ecosystem Score** = long-term health:
- Starts at 50
- Increases with: composting, mulching, crop rotation, organic pest control
- Decreases with: chemical pesticides, monoculture, soil neglect
- Persists across growth cycles (for perennials)

Scores are initialized by Gemini in P1/P2 responses and modified by a pure JS scoring function based on user decisions. Gemini provides the *rules* (what helps, what hurts, by how much); the JS engine applies them deterministically.

---

## 6. WHAT I REMOVED FROM THE ORIGINAL PLAN

1. **SoilGrids as a runtime dependency** — replaced with Gemini inference + regional defaults + user self-report
2. **Monolithic Growing Guide prompt** — replaced with per-stage progressive generation
3. **5 separate Gemini prompts** — consolidated to 4+1 (on-demand)
4. **Trefle/Perenual plant APIs** — correctly excluded in original, confirmed excluded
5. **Complex canvas-based plant rendering** — CSS-based is simpler and sufficient

---

## 7. WHAT I ADDED

1. **Three-tier soil data fallback** (Gemini → regional defaults → user questionnaire)
2. **"What should I grow?" exploratory mode** via P2 prompt
3. **Cloudflare Worker proxy spec** for API key protection + rate limiting
4. **Session-based state** (no localStorage complexity)
5. **Deterministic scoring engine** (Gemini provides rules, JS applies them)
6. **CSS-based plant illustration** system
7. **Gemini JSON mode** (`response_mime_type` + `response_schema`) for reliable structured output
