# JYOTISH — Vedic Astrology Tab: Build Plan
> Auto-updated as tasks complete. Start here in every new session.
> Last updated: 2026-03-27

---

## How to Resume in a New Session
1. Read `CLAUDE.md` (project context)
2. Read this file — find the first ⬜ task and continue
3. Model assignments are marked [Opus] or [Sonnet] — use the hybrid model approach

---

## Architecture Decision
- **Frontend**: Plain HTML/CSS/JS in `astrology/` folder — matches existing site pattern
- **Backend**: Python FastAPI deployed on Render.com (free tier)
- **Astro engine**: pyswisseph (Swiss Ephemeris) — Lahiri ayanamsha, True Nodes
- **AI personas**: Anthropic Claude API proxied through Python backend (key never exposed to frontend)
- **Animation**: GSAP (CDN) for orrery reveal, D3.js for Ashtakavarga grid

---

## File Structure
```
astrology/
├── JYOTISH_BUILD_PLAN.md     ← this file
├── astrology.html            ← tab shell
├── astrology.css             ← visual identity
├── astrology.js              ← all frontend logic
└── astrology-api/            ← Python backend (deploy to Render separately)
    ├── main.py               ← FastAPI app + all endpoints
    ├── chart.py              ← Swiss Ephemeris core engine
    ├── ashtakavarga.py       ← Bhinna + Sarvashtakavarga
    ├── dasha.py              ← Vimshottari Dasha
    ├── divisional.py         ← D2, D7, D9, D10
    ├── domains.py            ← 12 domain scoring
    ├── council.py            ← Claude API proxy + planet personas
    ├── requirements.txt
    └── tests/
        └── test_nehru.py     ← Verification test — MUST PASS before any UI work
```

---

## The Six Laws (Never Break These)
1. Never present output as fate — tendencies, not verdicts
2. Flag Lagna sensitivity honestly (within 3° of sign boundary → show both possibilities)
3. Every score must be traceable — no black boxes
4. Rahu and Ketu are NOT planets — different math, different voice, no Bhinna scores
5. Planet personas never break character, never speak deterministically
6. Ashtakavarga is the spine — every score, every voice, every domain derives from it

---

## Visual Identity (Locked)
| Token | Value |
|-------|-------|
| BG primary | `#0D0D1A` |
| BG secondary | `#1A1A2E` |
| Card surface | `rgba(255,255,255,0.04)` + `backdrop-filter: blur(12px)` |
| Gold accent | `#C9A84C` |
| Teal accent | `#4ECDC4` |
| Text primary | `#F0EEE6` |
| Text secondary | `#8888BB` |
| Weak/challenged | `#FF6B6B` |
| Strong/favorable | `#6BCB77` |
| Rahu color | `#7B2FBE` |
| Ketu color | `#2F4858` |
| Nav underline | `#7B2FBE` |
| Heading font | Cinzel (Google Fonts) |
| Body font | Crimson Pro (Google Fonts) |
| Data font | JetBrains Mono (Google Fonts) |
| Sanskrit font | Noto Sans Devanagari (Google Fonts) |

---

## Build Phases & Task Tracker

### PHASE 1 — Frontend Shell
| # | Model | Task | Status |
|---|-------|------|--------|
| 1A | Sonnet | Create `astrology/` folder + `astrology.html` shell (birth input form, placeholder sections for orrery/dashboard/council, load all 4 fonts) | ⬜ Pending |
| 1B | Sonnet | Create `astrology.css` (full visual identity, birth form styling, card surfaces) | ⬜ Pending |
| 1C | Sonnet | Wire astrology tab into `main.js` nav (`#7B2FBE` accent, `'Soon'` badge initially) | ⬜ Pending |

### PHASE 2 — Python Backend
| # | Model | Task | Status |
|---|-------|------|--------|
| 2A | Gemini | Design Python backend structure: FastAPI app skeleton in `astrology/astrology-api/` | ✅ Done |
| 2B | Gemini | Write `requirements.txt` | ✅ Done |
| 2C | Opus | Write `chart.py`: Swiss Ephemeris core (Lahiri, True Nodes, all 9 grahas, Lagna, Nakshatra, dignity, retrograde, combustion, Rashi + Bhava house systems, Lagna sensitivity flag) | ⬜ Pending |
| 2D | Opus | Write `dasha.py`: Vimshottari Dasha — 365.25-day years, Mahadasha + Antardasha + Pratyantardasha with exact dates | ⬜ Pending |
| 2E | Opus | Write `ashtakavarga.py`: Bhinna for all 7 classical planets + Lagna, Sarvashtakavarga totals (BPHS rules as lookup table) | ⬜ Pending |
| 2F | Sonnet | Write `divisional.py`: D2 (Hora), D7 (Saptamsha), D9 (Navamsha), D10 (Dasamsha) | ⬜ Pending |
| 2G | Sonnet | Write `tests/test_nehru.py` and run: Nehru chart (14 Nov 1889, 11PM IST, Allahabad) must match Drik Panchang. **MUST PASS before proceeding to UI.** | ⬜ Pending |
| 2H | Sonnet | Write `main.py`: FastAPI app with all endpoints + CORS | ⬜ Pending |
| 2I | Opus | Write `domains.py`: 12 domain scoring engine (weighted formula across Ashtakavarga, dignity, divisional, Dasha, aspects) | ⬜ Pending |
| 2J | Opus | Write `council.py`: all 9 planet system prompts (exact voice/tone per spec), Claude API streaming, Rahu/Ketu separate handling, debate mode | ⬜ Pending |

### PHASE 3 — Frontend Logic
| # | Model | Task | Status |
|---|-------|------|--------|
| 3A | Sonnet | `astrology.js` Part 1: birth form handler, geocoding, fetch `/api/chart/compute`, trigger orrery | ⬜ Pending |
| 3B | Opus | `astrology.js` Part 2: full 18-second GSAP orrery reveal (zodiac SVG draw, planet arcs via MotionPath, Lagna snap + radial pulse, OM symbol, nakshatra reveal, dominant graha pulse, Dasha card, dashboard ascent) | ⬜ Pending |
| 3C | Sonnet | `astrology.js` Part 3: 12 domain dashboard (score cards, animated bars, D3 Ashtakavarga grid 7×12, color coding, hover tooltips, drill-down panel) | ⬜ Pending |

### PHASE 4 — Planetary Council
| # | Model | Task | Status |
|---|-------|------|--------|
| 4A | Sonnet | `astrology.js` Part 4: Planetary Council UI (9 planet glyph arc, selection, streaming response display) | ⬜ Pending |
| 4B | Sonnet | `astrology.js` Part 5: Web Speech API voice profiles per planet, debate mode (two glass cards), Lagna sensitivity dual-display | ⬜ Pending |

### PHASE 5 — Deploy & Polish
| # | Model | Task | Status |
|---|-------|------|--------|
| 5A | Sonnet | Deploy backend to Render.com: write `render.yaml`, test all endpoints live, update API base URL in `astrology.js` | ⬜ Pending |
| 5B | Sonnet | Final polish: Statement of Honest Purpose below birth form, mobile responsive orrery, `'Live'` badge on nav tab | ⬜ Pending |

---

## API Endpoints (backend)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chart/compute` | `{dob, tob, place, timezone}` → full chart object |
| POST | `/api/domains/score` | chart object → 12 domain scores |
| POST | `/api/planet/speak` | `{planet, chart, domain, question}` → streaming Claude response |
| POST | `/api/planet/debate` | `{planet_a, planet_b, chart, domain, question}` → two streaming responses |
| GET | `/api/chart/{id}` | retrieve saved chart |
| POST | `/api/chart/save` | save chart to DB |

---

## Verification Checkpoint (Phase 2G)
Nehru's chart — **14 November 1889, 11:00 PM IST, Allahabad (25.4358°N, 81.8463°E)**

| Field | Expected |
|-------|----------|
| Lagna | Karka (Cancer) |
| Moon | Makara (Capricorn), Nakshatra: Shravana |
| Sun | Vrishchika (Scorpio) |
| Mahadasha at birth | Moon Mahadasha |

Do NOT proceed to Phase 3 until all four match Drik Panchang.

---

## Notes / Decisions Log
- 2026-03-27: Gemini taking over execution from Claude. Prioritizing Python backend (Phase 2 here) first as per Master Prompt.
- 2026-03-27: Plan created. Stack decided: static frontend + Render.com Python backend.
- Nav accent color for Astrology tab: `#7B2FBE` (Rahu's violet — fitting for Jyotish)
