# 🌱 PLANT GROWTH SIMULATOR — Complete Build Package
## For Pradeep's Sandbox (pradeepjainbp.in/Plants)

---

## WHAT'S IN THIS PACKAGE

| # | File | Purpose |
|---|------|---------|
| 1 | `01_ARCHITECTURE_REVIEW.md` | Tech stack validation, API risks, redesign decisions |
| 2 | `02_FOLDER_STRUCTURE.md` | Complete /Plants folder structure with every file described |
| 3 | `plants.json` | 344 plants, multilingual (EN/HI/KN/TA/TE/MR), India-focused |
| 4 | `soil-profiles.json` | 47 regional soil defaults (India + global) |
| 5 | `04_GEMINI_PROMPT_CHAIN.md` | GrowBot persona, 5 prompts with JSON schemas, Worker proxy |
| 6 | `05_BUILD_SPECIFICATION.md` | Complete build spec for Claude Code — UI, state, scores, visuals |

---

## KEY ARCHITECTURE DECISIONS (Summary)

1. **SoilGrids API removed** — currently down with no ETA. Replaced with Gemini inference + soil-profiles.json fallback + user self-report.

2. **Gemini prompts reduced from 5 to 4+1** — P1 (Location+Season) merges location and soil analysis. P3 (Stage Guide) is called per-stage instead of all-at-once. P5 (Diagnostician) is on-demand only.

3. **CSS-based plant illustration** — no canvas, no sprite sheets. Plant built from CSS shapes driven by custom properties that JS updates based on health scores.

4. **Deterministic scoring** — Gemini provides the rules (what helps/hurts, by how much). A pure JS scoring engine applies them. No randomness in score calculations.

5. **Cloudflare Worker proxy** — all Gemini calls routed through a Worker that adds the API key, validates origin, and rate-limits. No API key in client code.

---

## HOW TO HAND THIS TO CLAUDE CODE

1. Share the **Build Specification** (`05_BUILD_SPECIFICATION.md`) as the primary instruction document
2. Share the **Folder Structure** (`02_FOLDER_STRUCTURE.md`) so it knows every file to create
3. Share the **Gemini Prompt Chain** (`04_GEMINI_PROMPT_CHAIN.md`) for all prompt templates and JSON schemas
4. Place `plants.json` and `soil-profiles.json` in `/Plants/data/` — these are ready to use as-is
5. Tell Claude Code to follow the **Implementation Order** in Section 12 of the Build Spec (7 phases)

### Suggested Claude Code Prompt
```
Build the Plant Growth Simulator described in the attached specification.

Key files to reference:
- 05_BUILD_SPECIFICATION.md — the complete build spec (follow this)
- 02_FOLDER_STRUCTURE.md — every file to create
- 04_GEMINI_PROMPT_CHAIN.md — Gemini prompts and JSON schemas
- plants.json — plant database (344 entries, ready to use)
- soil-profiles.json — regional soil defaults (47 entries, ready to use)

Build in the order specified in Section 12 of the Build Spec (7 phases).
This is a pure HTML/CSS/JS project — no frameworks, no build tools.
Place everything in a /Plants folder.

For the Gemini API proxy, create a Cloudflare Worker script that I'll 
deploy separately. Use a placeholder URL like WORKER_URL in the client 
code that I'll replace with the actual deployed Worker URL.
```

---

## PLANT DATABASE STATS

```
Total plants: 344
Categories:
  Vegetable:    74
  Fruit:        55
  Flower:       35
  Tree:         35
  Indoor Plant: 30
  Herb:         30
  Spice:        29
  Cash Crop:    24
  Grain:        17
  Pulse:        15
```

All entries include: id, common names in 6 languages (EN, HI, KN, TA, TE, MR), scientific name, category, subcategory, and tags for searchability.

---

## ESTIMATED COSTS

| Item | Cost |
|------|------|
| Gemini API per session | ~$0.025 |
| 400 sessions budget | ~$10 |
| Hosting (Cloudflare Pages) | Free |
| Nominatim API | Free |
| Open-Meteo API | Free |
| Cloudflare Worker | Free tier (100K requests/day) |

---

## WHAT'S NOT INCLUDED (Future Enhancements)

- Multi-language UI (currently English only; plant names are multilingual)
- Offline/PWA mode
- User accounts / saved simulations
- Community plant additions
- Photo-based plant disease diagnosis (camera → Gemini Vision)
- Companion planting recommendations
- Moon phase planting calendar
- Market price integration

These can be added incrementally after v1 ships.
