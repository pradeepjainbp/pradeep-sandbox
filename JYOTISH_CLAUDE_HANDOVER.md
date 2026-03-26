# JYOTISH Astrology Dashboard: Claude Handover Document

## Project Objective
The goal of this project is to build a hyper-sensory, cinematic Vedic Astrology dashboard. Unlike standard astrology websites that simply print static charts, this dashboard is designed to let the user visually and auditorily *feel* the specific physical placement of planets in the cosmos.

## Current Architecture & Stack
- **Backend**: Python `FastAPI` deployed on Render.com, utilizing `pyswisseph` for ultra-precise ephemeris chart mathematics.
- **Frontend**: Vanilla HTML/CSS/JS. No heavy UI frameworks (React/Vue) were used in order to maintain absolute, low-level control over rendering performance and timeline orchestrations.
- **Animation**: `GSAP` (GreenSock). Used for the complex 24-second deep-reveal timeline and the geometry morphing between chart layouts.
- **Audio**: Native `Web Audio API` (`audio.js`).

## What We Built & Why We Built It

### 1. The Multi-Chart Geometric Engine (`astrology.js`)
**What it is:** A single SVG canvas (`#zodiac-wheel`) mathematically computes and houses three distinct chart layouts simultaneously: Circular Cosmos (Orrery), South Indian (grid squares), and North Indian (diagonal diamonds). 

**Why it was built this way:** Instead of re-rendering the DOM when a user switches chart types, we initialize the coordinates of *all three layouts* as invisible mathematical anchor points (`data-txsi`, `data-txni`, `data-px`). We then use GSAP to infinitely and smoothly translate (`x`,`y`) the planet image groups between these layouts based on user toggles. This allows zero-latency geometric morphing.

### 2. Deep Interaction Hitboxes
**What it is:** We programmed 36 specialized, transparent SVG shapes to act as pointer-event triggers. 
- 12 `path` arcs for the Circular Cosmos.
- 12 `rect` bounding boxes mapped to the South Indian perimeter.
- 12 complex, mathematically perfect `polygon` coordinates mapped to the cross-diagonal North Indian chart.

**Why it was built this way:** We needed a way for users to hover over empty "houses" and still trigger sensory feedback. Standard HTML divs cannot map to the non-euclidean diamond shapes of a North Indian chart, so we relied on pure SVG coordinates to capture mouse events flawlessly regardless of the active matrix layout.

### 3. The Procedural "Tattva" Audio Engine (`audio.js`)
**What it is:** A generative sound synthesizer built from scratch that reacts to astrological physics rather than playing standard MP3s.

**Logic:**
- We identified the 12 Rashis (Zodiac signs) as explicit physical environments: 4 elements (Fire, Earth, Air, Water) multiplied by 3 depths (e.g., Cancer = Pond, Scorpio = Lake, Pisces = Ocean; Aries = Spark, Leo = Roar, Sag = Wildfire).
- We mapped the 9 Planets to physical temperatures/temperaments (Sun/Mars = Hot Fiery, Moon/Venus = Cold Watery, Saturn/Rahu = Cold Rock).
- When a specific planet is placed in a specific house, Biquad filters and custom white/pink noise algorithms instantly mix them.
- *Example:* Hovering a "Hot" Sun inside a "Watery" Pisces dynamically triggers a high-pass filtered white-noise hiss simulation—the literal sound of boiling water and steam.

**Why it was built this way:** The user wanted the dashboard to be a sensory experience of *meaning*, not just musical tones. By using the Web Audio API to procedurally generate physics-based reactions (splashes, hisses, deep earth rumbles), the user visceral connects with the concept of a fiery planet burning inside a water environment. It also costs 0 network bandwidth compared to loading hundreds of WAV files.

### 4. Cinematic Timeline Orchestration
**What it is:** A meditative 34-second opening sequence. It features a typing Panchanga log, elemental chart slices fading in, and an 18-second deep-space radar line that sweeps a full 360 degrees, dropping the planets into place and triggering their audio as the beam passes their exact longitude degree.

## Next Steps for Claude (Focus Areas)
1. **Animation Polish:** The user feels the opening animation/radar-sweep is computationally impressive but may still feel slightly disconnected or imperfect visually. The user will provide specific visual directions on what feels lacking in the current "Sensory UX".
2. **Phase 3 - Domain Dashboard:** The core logic is built, but the "Domain Score" logic (scoring health, wealth, family based on benefic/malefic mathematical weights) and the Ashtakavarga D3.js grids still need to be built below the main chart.
3. **Phase 4 - Planetary Council:** Implementing a Claude AI proxy (`council.py`) that uses the calculated chart JSON to simulate a "Council of 9 Planets" debating the user's life based on their dignity.
