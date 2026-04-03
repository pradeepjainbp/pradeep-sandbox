# GEMINI PROMPT CHAIN — GrowBot
## Plant Growth Simulator AI Engine

---

## SYSTEM PROMPT (Shared Across All Calls)

```
You are GrowBot, an expert agricultural scientist and plant advisor built into 
an educational plant growth simulator. You combine deep knowledge of agronomy, 
horticulture, soil science, and plant pathology with the ability to explain 
concepts simply.

RULES:
1. Always respond with valid JSON only. No markdown, no backticks, no preamble.
2. Every recommendation must include a "why" field (max 40 words) explaining 
   the science in plain language.
3. Be India-aware: default to Indian conditions, varieties, seasons (Kharif/
   Rabi/Zaid), and local practices — but adapt globally when the location is 
   outside India.
4. Scores are always integers 0-100. Never return decimals.
5. When uncertain, say so in the "confidence" field (0.0 to 1.0). Do not 
   hallucinate specific data.
6. Use metric units (Celsius, cm, kg, litres).
7. Seasonal awareness: India has three growing seasons — Kharif (Jun-Oct, 
   monsoon), Rabi (Oct-Mar, winter), Zaid (Mar-Jun, summer). Adapt to 
   local seasons for non-Indian locations.
8. For scores, higher is always better (100 = perfect, 0 = dead/failed).
```

---

## PROMPT P1: Location + Season Analysis

### When Called
After user selects a location (lat/long) and planting month.

### Input Variables
- `{{LAT}}` — latitude
- `{{LON}}` — longitude  
- `{{LOCATION_NAME}}` — human-readable name (from Nominatim)
- `{{COUNTRY}}` — country name
- `{{MONTH}}` — selected planting month (1-12)
- `{{CLIMATE_DATA}}` — JSON from Open-Meteo with monthly averages:
  ```json
  {
    "temperature_2m_mean": [24.1, 25.3, ...],
    "precipitation_sum": [2.5, 8.1, ...],
    "relative_humidity_2m_mean": [55, 48, ...],
    "et0_fao_evapotranspiration": [4.2, 5.1, ...]
  }
  ```

### Prompt Template
```
Analyze this location for plant growing:

Location: {{LOCATION_NAME}}, {{COUNTRY}}
Coordinates: {{LAT}}, {{LON}}
Selected planting month: {{MONTH}}

Climate data (12 monthly averages):
{{CLIMATE_DATA}}

Provide a complete location growing profile. Infer the soil type from the 
geographic location (you know typical soil profiles for most regions — 
e.g., Bangalore has red laterite soil, Indo-Gangetic plains have alluvial 
soil, etc.). If you're not confident about the soil, set soil_confidence 
to a low value.

Respond with this exact JSON structure:
```

### Output JSON Schema
```json
{
  "location_profile": {
    "name": "string — location display name",
    "climate_zone": "string — e.g., 'Tropical Wet', 'Semi-Arid', 'Temperate Continental'",
    "hardiness_zone": "string — USDA equivalent, e.g., '11a' or 'unknown'",
    "growing_season": {
      "type": "string — 'year-round' | 'kharif-rabi-zaid' | 'spring-fall' | 'monsoon-based'",
      "current_season": "string — season name for selected month",
      "months_remaining": "integer — months left in current season",
      "best_months": [3, 4, 10, 11]
    },
    "climate_summary": {
      "annual_rainfall_mm": "integer",
      "avg_temp_selected_month_c": "number",
      "min_temp_coldest_month_c": "number",
      "max_temp_hottest_month_c": "number",
      "humidity_selected_month_pct": "integer",
      "frost_risk": "boolean",
      "monsoon_months": [6, 7, 8, 9]
    }
  },
  "soil_profile": {
    "type": "string — e.g., 'Red Laterite', 'Alluvial', 'Black Cotton', 'Sandy Loam'",
    "pH_range": { "min": 5.5, "max": 6.5 },
    "texture": "string — 'sandy' | 'loamy' | 'clayey' | 'silty' | 'laterite'",
    "drainage": "string — 'well-drained' | 'moderate' | 'poor'",
    "organic_matter": "string — 'low' | 'medium' | 'high'",
    "fertility": "string — 'low' | 'medium' | 'high'",
    "typical_deficiencies": ["nitrogen", "phosphorus"],
    "soil_confidence": 0.8,
    "why": "string — ≤40 words explaining the soil inference"
  },
  "initial_scores": {
    "soil_health": "integer 0-100 — based on natural soil quality for the region",
    "water_balance": "integer 0-100 — based on current month rainfall vs evaporation",
    "ecosystem": 50
  },
  "recommendations": {
    "general_advice": "string — ≤60 words of practical advice for this location/season",
    "watch_out_for": ["string — key challenge 1", "string — key challenge 2"],
    "ideal_for": ["string — what grows well here this season"]
  }
}
```

### Token Estimate
- Input: ~400 tokens (climate data + template)
- Output: ~500 tokens
- Cost: ~$0.001

---

## PROMPT P2: Plant Match & Suitability

### When Called
After user selects a plant from the list (or asks "what should I grow?").

### Input Variables
- `{{LOCATION_PROFILE}}` — full JSON from P1 response
- `{{PLANT_NAME}}` — common English name
- `{{PLANT_SCIENTIFIC}}` — scientific name
- `{{PLANT_CATEGORY}}` — category from plants.json
- `{{MODE}}` — "score" (score a specific plant) or "suggest" (recommend top plants)

### Prompt Template (Score Mode)
```
Given this location profile:
{{LOCATION_PROFILE}}

Score the suitability of growing {{PLANT_NAME}} ({{PLANT_SCIENTIFIC}}, 
category: {{PLANT_CATEGORY}}) at this location in the selected month.

Consider: temperature match, rainfall, humidity, soil pH, soil texture, 
frost risk, season timing, and local growing traditions.

Respond with this exact JSON structure:
```

### Prompt Template (Suggest Mode)
```
Given this location profile:
{{LOCATION_PROFILE}}

Suggest the top 8 plants to grow at this location in the selected month.
Include a mix of: vegetables, fruits, herbs, and flowers.
Prioritize plants that are locally popular and well-suited to conditions.

Respond with this exact JSON structure:
```

### Output JSON Schema (Score Mode)
```json
{
  "suitability": {
    "score": "integer 0-100",
    "grade": "string — 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Not Recommended'",
    "color": "string — '#22c55e' | '#84cc16' | '#eab308' | '#f97316' | '#ef4444'",
    "why": "string — ≤40 words explaining the score"
  },
  "key_factors": {
    "temperature_match": { "score": "integer 0-100", "detail": "string ≤25 words" },
    "water_needs_match": { "score": "integer 0-100", "detail": "string ≤25 words" },
    "soil_match": { "score": "integer 0-100", "detail": "string ≤25 words" },
    "season_match": { "score": "integer 0-100", "detail": "string ≤25 words" }
  },
  "growing_requirements": {
    "sunlight_hours": "integer — hours per day",
    "water_needs": "string — 'low' | 'moderate' | 'high'",
    "optimal_temp_range_c": { "min": 20, "max": 35 },
    "soil_pH_preferred": { "min": 6.0, "max": 7.0 },
    "days_to_harvest": "integer — approximate",
    "spacing_cm": "integer — between plants",
    "depth_cm": "integer — planting depth"
  },
  "alternatives": [
    {
      "name": "string — plant name",
      "score": "integer 0-100",
      "why": "string — ≤25 words why it's better"
    }
  ],
  "initial_plant_vitality": "integer 0-100 — starting vitality score based on match"
}
```

### Output JSON Schema (Suggest Mode)
```json
{
  "suggestions": [
    {
      "name": "string",
      "scientific": "string",
      "category": "string",
      "score": "integer 0-100",
      "color": "string — hex color",
      "why": "string — ≤30 words",
      "difficulty": "string — 'beginner' | 'intermediate' | 'advanced'"
    }
  ]
}
```

### Token Estimate
- Input: ~600 tokens (location profile + plant info)
- Output: ~600 tokens
- Cost: ~$0.002

---

## PROMPT P3: Stage Guide Generator

### When Called
Once per growth stage transition (user advances the timeline).

### Growth Stages (6 total)
1. **Pre-planting** — soil prep, bed construction
2. **Planting** — seed/seedling, spacing, initial care
3. **Sprouting / Early Growth** — first 2-4 weeks
4. **Vegetative Growth** — main growth period
5. **Flowering / Fruiting** — reproductive stage
6. **Harvest / Post-harvest** — when and how to harvest

### Input Variables
- `{{PLANT_NAME}}` — plant name
- `{{PLANT_CATEGORY}}` — category
- `{{CURRENT_STAGE}}` — stage number (1-6) and name
- `{{LOCATION_PROFILE}}` — location summary (abbreviated)
- `{{CURRENT_SCORES}}` — current scores JSON
- `{{DECISIONS_HISTORY}}` — past decisions made by user

### Prompt Template
```
Generate growing guidance for Stage {{CURRENT_STAGE}} of 
{{PLANT_NAME}} ({{PLANT_CATEGORY}}).

Location: {{LOCATION_PROFILE}}
Current scores: {{CURRENT_SCORES}}
Past decisions: {{DECISIONS_HISTORY}}

Provide the stage guide with 3-5 decisions the user needs to make, 
each with 2-3 options that have different effects on scores.

Respond with this exact JSON structure:
```

### Output JSON Schema
```json
{
  "stage": {
    "number": "integer 1-6",
    "name": "string",
    "description": "string — ≤50 words describing this stage",
    "duration_days": "integer — typical duration",
    "visual_state": {
      "plant_height_pct": "integer 0-100 — % of full height",
      "leaf_count": "string — 'none' | 'few' | 'moderate' | 'full' | 'declining'",
      "leaf_color": "string — CSS color value",
      "has_flowers": "boolean",
      "has_fruit": "boolean",
      "stem_thickness": "string — 'seedling' | 'thin' | 'moderate' | 'thick'",
      "soil_condition": "string — 'dry' | 'moist' | 'wet' | 'waterlogged'"
    }
  },
  "decisions": [
    {
      "id": "string — unique ID like 'preplant_compost'",
      "title": "string — e.g., 'Add Compost?'",
      "description": "string — ≤40 words explaining the decision",
      "options": [
        {
          "id": "string — e.g., 'compost_yes'",
          "label": "string — e.g., 'Yes, add compost'",
          "effects": {
            "soil_health": "integer — delta (-20 to +20)",
            "plant_vitality": "integer — delta",
            "water_balance": "integer — delta",
            "ecosystem": "integer — delta"
          },
          "why": "string — ≤30 words explaining the effect",
          "cost_indicator": "string — 'free' | 'low' | 'medium' | 'high'"
        }
      ]
    }
  ],
  "care_tips": [
    {
      "tip": "string — ≤40 words",
      "category": "string — 'watering' | 'nutrition' | 'pest' | 'pruning' | 'general'"
    }
  ],
  "upcoming_alert": {
    "type": "string — 'none' | 'pest_risk' | 'weather' | 'nutrient' | 'timing'",
    "message": "string — ≤30 words, or empty if type is 'none'"
  }
}
```

### Token Estimate
- Input: ~500 tokens
- Output: ~800 tokens
- Cost: ~$0.003

---

## PROMPT P4: Decision Point Advisor

### When Called
At specific decision points during the growth timeline (pest alert, weather event, nutrient deficiency, etc.).

### Input Variables
- `{{PLANT_NAME}}` — plant name
- `{{CURRENT_STAGE}}` — current growth stage
- `{{EVENT_TYPE}}` — "pest" | "weather" | "nutrient" | "disease" | "harvest_timing"
- `{{EVENT_DETAIL}}` — specific event description (auto-generated or user-triggered)
- `{{CURRENT_SCORES}}` — current scores
- `{{LOCATION_PROFILE}}` — abbreviated location data

### Prompt Template
```
A decision point has occurred during {{PLANT_NAME}} growth:

Event type: {{EVENT_TYPE}}
Event detail: {{EVENT_DETAIL}}
Current stage: {{CURRENT_STAGE}}
Current scores: {{CURRENT_SCORES}}
Location: {{LOCATION_PROFILE}}

Provide 2-3 response options the grower can take, with clear 
trade-offs between effectiveness, cost, and ecosystem impact.

Respond with this exact JSON structure:
```

### Output JSON Schema
```json
{
  "event": {
    "type": "string",
    "severity": "string — 'low' | 'medium' | 'high' | 'critical'",
    "title": "string — e.g., 'Aphid Infestation Detected'",
    "description": "string — ≤50 words describing what's happening",
    "visual_indicator": {
      "leaf_spots": "boolean",
      "wilting": "boolean",
      "yellowing": "boolean",
      "pest_visible": "boolean",
      "color_override": "string — CSS color or null"
    }
  },
  "options": [
    {
      "id": "string",
      "label": "string — e.g., 'Use Neem Oil Spray'",
      "approach": "string — 'organic' | 'chemical' | 'cultural' | 'ignore'",
      "effects": {
        "soil_health": "integer — delta",
        "plant_vitality": "integer — delta",
        "water_balance": "integer — delta",
        "ecosystem": "integer — delta"
      },
      "why": "string — ≤40 words",
      "trade_off": "string — ≤25 words on what you sacrifice",
      "time_to_effect_days": "integer"
    }
  ],
  "do_nothing_consequence": {
    "description": "string — ≤30 words on what happens if ignored",
    "vitality_loss_per_day": "integer — score points lost daily"
  }
}
```

### Token Estimate
- Input: ~400 tokens
- Output: ~500 tokens
- Cost: ~$0.002

---

## PROMPT P5: Symptom Diagnostician (On-Demand)

### When Called
Only when user clicks "My plant looks sick" button.

### Input Variables
- `{{PLANT_NAME}}` — plant name
- `{{SYMPTOMS}}` — array of selected symptom checkboxes
- `{{CURRENT_STAGE}}` — growth stage
- `{{CURRENT_SCORES}}` — scores
- `{{RECENT_DECISIONS}}` — last 5 decisions made

### Prompt Template
```
Diagnose this plant issue:

Plant: {{PLANT_NAME}}
Growth stage: {{CURRENT_STAGE}}
Reported symptoms: {{SYMPTOMS}}
Current scores: {{CURRENT_SCORES}}
Recent care decisions: {{RECENT_DECISIONS}}

Use differential diagnosis: consider the most likely cause first, 
then alternatives. Factor in the care history — user decisions 
may have caused the issue.

Respond with this exact JSON structure:
```

### Output JSON Schema
```json
{
  "diagnosis": {
    "primary": {
      "condition": "string — e.g., 'Nitrogen Deficiency'",
      "confidence": "number 0.0-1.0",
      "category": "string — 'nutrient' | 'pest' | 'disease' | 'environmental' | 'care_error'",
      "description": "string — ≤50 words explaining what it is",
      "why": "string — ≤40 words connecting symptoms to cause",
      "caused_by_user_decision": "boolean — true if likely caused by a past decision"
    },
    "alternatives": [
      {
        "condition": "string",
        "confidence": "number 0.0-1.0",
        "why": "string — ≤25 words"
      }
    ]
  },
  "treatment": {
    "immediate_action": "string — ≤40 words",
    "long_term_fix": "string — ≤40 words",
    "recovery_time_days": "integer",
    "score_adjustments": {
      "soil_health": "integer — expected delta after treatment",
      "plant_vitality": "integer — expected delta",
      "ecosystem": "integer — expected delta"
    }
  },
  "prevention": {
    "tip": "string — ≤40 words on preventing recurrence",
    "related_decision": "string — which future decision to pay attention to"
  }
}
```

### Token Estimate
- Input: ~400 tokens
- Output: ~500 tokens
- Cost: ~$0.002

---

## API CALL CONFIGURATION

### Gemini API Request Format
```javascript
{
  "contents": [
    {
      "role": "user",
      "parts": [{ "text": "{{INTERPOLATED_PROMPT}}" }]
    }
  ],
  "systemInstruction": {
    "parts": [{ "text": "{{SYSTEM_PROMPT}}" }]
  },
  "generationConfig": {
    "temperature": 0.3,
    "topP": 0.8,
    "topK": 40,
    "maxOutputTokens": 2048,
    "responseMimeType": "application/json"
  }
}
```

### Key Settings Explained
- **temperature: 0.3** — Low for consistent, factual responses. Agricultural advice should be reliable, not creative.
- **responseMimeType: "application/json"** — Forces Gemini to output valid JSON. Critical for parsing reliability.
- **maxOutputTokens: 2048** — Generous ceiling but actual responses are ~500-800 tokens. Prevents truncation.

### Error Handling Strategy
```
1. Call Gemini through Cloudflare Worker proxy
2. Worker adds API key, validates origin, rate-limits
3. If response.ok === false:
   - 429 (rate limit): show "GrowBot is busy, try again in 30s"
   - 500/503: retry once after 2s, then show error
   - 400 (bad request): log error, show generic message
4. Parse response JSON:
   - JSON.parse in try/catch
   - Validate required top-level keys exist
   - If missing keys: use sensible defaults for scores, show partial data
   - If total parse failure: retry once, then show "GrowBot had trouble"
5. Max 2 automatic retries per prompt
6. Show loading spinner during all Gemini calls
7. Cache P1 response in SimState (don't re-fetch if location hasn't changed)
8. Cache P2 response per plant+location combo in SimState
```

### Cost Analysis Per Full Session
| Prompt | Calls per session | Input tokens | Output tokens | Cost |
|--------|-------------------|-------------|---------------|------|
| P1 | 1 | 400 | 500 | $0.001 |
| P2 | 2-3 | 600 | 600 | $0.004 |
| P3 | 6 (one per stage) | 500 | 800 | $0.014 |
| P4 | 2-3 | 400 | 500 | $0.004 |
| P5 | 0-1 | 400 | 500 | $0.002 |
| **Total** | **~13** | | | **~$0.025** |

At ~$0.025 per full session, a $10 budget supports ~400 complete sessions — plenty for a personal portfolio project.

---

## CLOUDFLARE WORKER PROXY

### Purpose
Protects Gemini API key from exposure in client-side code.

### Implementation
```javascript
// gemini-proxy.js — Cloudflare Worker

export default {
  async fetch(request, env) {
    // 1. CORS — only allow your domain
    const origin = request.headers.get('Origin');
    const allowed = ['https://pradeepjainbp.in', 'http://localhost:8080'];
    if (!allowed.includes(origin)) {
      return new Response('Forbidden', { status: 403 });
    }

    // 2. Rate limit by IP (simple in-memory, resets per Worker instance)
    // For production: use Cloudflare KV or Durable Objects
    const ip = request.headers.get('CF-Connecting-IP');
    // ... rate limit logic ...

    // 3. Forward to Gemini
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body = await request.json();
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await geminiResponse.json();

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
};
```

### Deployment
- Set `GEMINI_API_KEY` as Worker environment variable (secret)
- Deploy to route: `api.pradeepjainbp.in/gemini` or `pradeepjainbp.in/api/gemini`
- Add CORS preflight handling for OPTIONS requests
