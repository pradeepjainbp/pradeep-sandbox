# JYOTISH — Vedic Astrology Tab: Build Plan
> Auto-updated as tasks complete. Start here in every new session.
> Last updated: 2026-03-27 (end of session 2)

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
| 1A | Gemini | `astrology.html` shell (birth form, orrery layer, dashboard layer, council layer) | ✅ 2026-03-27 |
| 1B | Gemini | `astrology.css` — full visual identity, form, orrery, dashboard, council styles | ✅ 2026-03-27 |
| 1C | Gemini | Tab wired into `index.html` nav (`#7B2FBE` accent, GSAP/flatpickr/audio.js loaded) | ✅ 2026-03-27 |

### PHASE 2 — Python Backend
| # | Model | Task | Status |
|---|-------|------|--------|
| 2A | Gemini | FastAPI skeleton in `astrology-api/` | ✅ 2026-03-27 |
| 2B | Gemini+Sonnet | `requirements.txt` (added `anthropic`, `python-dotenv`) | ✅ 2026-03-27 |
| 2C | Gemini | `chart.py`: pyswisseph core (Lahiri, True Nodes, all 9 grahas, dignity, retrograde, Rashi+Bhava) | ✅ 2026-03-27 |
| 2D | Gemini | `dasha.py`: Vimshottari Dasha at birth | ✅ 2026-03-27 |
| 2E | Sonnet | `ashtakavarga.py`: full BPHS rules — Bhinna for 7 planets + Sarvashtakavarga | ✅ 2026-03-27 |
| 2F | Gemini | `divisional.py`: D2, D7, D9, D10 | ✅ 2026-03-27 |
| 2G | Gemini | `tests/test_nehru.py`: 3 of 4 checks written. ⚠️ Dasha check pending. Run to verify. | ⚠️ Partial |
| 2H | Gemini+Sonnet | `main.py`: all endpoints — chart/compute, planet/speak (streaming), planet/debate, geocode | ✅ 2026-03-27 |
| 2I | Sonnet | `domains.py`: 12-domain scoring engine (SAV 40% + dignity 20% + div 15% + dasha 15% + aspects 10%) | ✅ 2026-03-27 |
| 2J | Sonnet | `council.py`: 9 planet personas, Claude API streaming, Rahu/Ketu separate, debate mode | ✅ 2026-03-27 |

### PHASE 3 — Frontend Logic
| # | Model | Task | Status |
|---|-------|------|--------|
| 3A | Gemini | `astrology.js`: birth form, geocoding (open-meteo), API call, orrery trigger | ✅ 2026-03-27 |
| 3B | Gemini | `astrology.js`: 34s GSAP orrery — radar sweep, 3 chart views (circular/SI/NI), morph buttons | ✅ 2026-03-27 |
| 3C | Sonnet | `astrology.js`: domain dashboard — 12 cards, animated bars, D3 Ashtakavarga grid, drill-down panel | ✅ 2026-03-27 |

### PHASE 4 — Planetary Council
| # | Model | Task | Status |
|---|-------|------|--------|
| 4A | Sonnet | `astrology.js`: Council UI — domain pills, 9 planet glyphs, streaming speech cards | ✅ 2026-03-27 |
| 4B | Sonnet | `astrology.js`: Web Speech API (pitch/rate per planet), debate mode (2 cards side by side) | ✅ 2026-03-27 |

### PHASE 5 — Deploy & Polish
| # | Model | Task | Status |
|---|-------|------|--------|
| 5A | — | Backend deployed to Render.com (`jyotish-api-wml3.onrender.com`) by Gemini | ✅ 2026-03-27 |
| 5B | — | `ANTHROPIC_API_KEY` added to Render environment variables by Pradeep | ✅ 2026-03-27 |
| 5C | — | Push new backend files to GitHub so Render redeploys with domains.py + council.py | ⬜ **DO THIS FIRST** |
| 5D | — | Run Nehru verification test on live backend. Fix any calculation discrepancies. | ⬜ Pending |
| 5E | — | End-to-end test: enter birth date → orrery → domain cards → invoke a planet persona | ⬜ Pending |

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
- 2026-03-27: Plan created. Stack: static frontend + Render.com Python backend.
- 2026-03-27: Gemini built Act 1 (orrery with 3 chart views + Tattva audio), chart.py, dasha.py, divisional.py, main.py, deployed to Render.
- 2026-03-27: Sonnet completed ashtakavarga.py (real BPHS rules), domains.py (12-domain scoring), council.py (9 planet personas + Claude API), Act 2 dashboard JS+CSS, Act 3 council JS+CSS.
- 2026-03-27: ANTHROPIC_API_KEY added to Render via environment variables by Pradeep.
- 2026-03-27: JS crash fix — added null guard in buildAshtakavargaGrid (`if (!bav || !sav) return`) and requestAnimationFrame for GSAP timing.
- Nav accent: `#7B2FBE` (Rahu's violet)
- Backend URL: `https://jyotish-api-wml3.onrender.com` (free tier — cold starts ~45s after inactivity)

---

## ⚠️ BLOCKER — START HERE NEXT SESSION

**The backend on Render is MISSING the new files created in session 2.**
They exist locally but have NOT been pushed to GitHub yet.
Render auto-deploys from GitHub, so the live backend is still the old Gemini version
(no domains.py, no council.py, old ashtakavarga.py stub returning 4/8 for everything).

**First thing to do next session:**
```bash
git add astrology/astrology-api/astro/domains.py
git add astrology/astrology-api/astro/council.py
git add astrology/astrology-api/astro/ashtakavarga.py
git add astrology/astrology-api/main.py
git add astrology/astrology.js
git add astrology/astrology.css
git commit -m "feat(jyotish): Act 2 domain dashboard + Act 3 planetary council"
git push
```
Then wait 2-3 minutes for Render to rebuild, then hard refresh the site (Ctrl+Shift+R).
