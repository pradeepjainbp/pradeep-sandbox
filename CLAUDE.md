# Pradeep's Sandbox — AI Context Document
> Read this before touching anything. It will save you a lot of guessing.

---

## What This Is

A personal portfolio + simulations website for **Pradeep Jain B P**, a Marketing Operations Manager based in Bangalore, India. He works for People Inc. (Dotdash Meredith) managing US magazine subscriber campaigns remotely.

The site is his personal playground — part professional profile, part working simulations he built to satisfy his curiosity about economics, personal finance, agri science, and justice systems.

**Live repo:** `github.com/pradeepjainbp/pradeep-sandbox`

---

## Tech Stack

- Plain **HTML + CSS + JS** — no frameworks, no build tools
- **Supabase** (CDN) loaded in index.html — used by Loan Tracker
- **Google Fonts** — Fraunces + Sora
- **Canvas API** — used for charts in About Me tab
- Hosted likely via **Cloudflare Pages** (branch exists: `cloudflare/workers-autoconfig`)

---

## File Structure

```
/
├── index.html          ← Shell: header, nav, #content div
├── main.js             ← Tab switcher with lazy-loading + caching
├── shared/
│   └── site.css        ← Global styles: header, nav, body, fonts
├── Images/
│   └── pradeep.jpg     ← Pradeep's photo (circular crop, object-position: right top)
├── home/
│   ├── home.html / .css / .js
├── about/
│   ├── about.html / .css / .js
├── economy/
│   ├── economy.html / .css / .js
├── loans/
│   ├── loans.html / .css / .js
├── plants/
│   └── plants.html     ← Coming soon page (no .css/.js yet)
└── judicial/
    └── judicial.html   ← Coming soon page (no .css/.js yet)
```

### How Tabs Work

`main.js` lazy-loads each tab's HTML/CSS/JS on demand and caches it.
After loading, it calls `window[tabName + 'Init']()` if it exists.
- `economyInit()` — redraws sparklines
- `aboutInit()` — draws the donut chart canvas
- `homeInit()` — (currently empty)

---

## Global Design Rules — NEVER BREAK THESE

| Rule | Value |
|------|-------|
| Header background | `#0A0F1E` |
| Nav background | `#0D1424` |
| No cream anywhere | No `#FFFBF0` or `#FFF8E7` — use `#F8FAFC` or `#ffffff` |
| Display headings | Fraunces serif (weights 300, 700, 900) |
| Body font | Sora (weights 300, 400, 600, 700) — replaces old DM Sans |
| Logo dot animation | Pulses between `#6366F1` → `#10B981` → `#F59E0B` |
| Tab underlines | Each tab has its own accent color (see below) |
| Tab badge "Live" | `#10B981` green bg, white text |
| Tab badge "Soon" | Dark subtle bg, muted text |

### Per-Tab Nav Underline Colors
| Tab | Color |
|-----|-------|
| Home | `#6366F1` indigo |
| About Me | `#F59E0B` amber |
| Economy & Debt | `#10B981` green |
| Loan Tracker | `#2563EB` blue |
| Plant Simulator | `#4ADE80` bright green |
| Judicial System | `#818CF8` muted indigo |

---

## Tab-by-Tab Design Themes

### 🏠 Home
- **Feel:** Personal launchpad. Dark hero fading to light content.
- **Hero:** `#0A0F1E` full bleed, white text, terminal widget on right showing live economy sim stats
- **Below hero:** `#F8FAFC`, 4 project cards in 2×2 grid
- **Project card themes:**
  - Economy: dark `#0A0F1E` bg, terminal green numbers
  - Loans: white, bold blue `#2563EB`
  - Plants: light green `#F0FDF4`
  - Judicial: light indigo `#EEF2FF`
- **Ideas backlog** section at the bottom

### 👤 About Me
- **Design brief:** "Show don't tell — the page itself should demonstrate that I love data and visualisation"
- **Feel:** Editorial magazine, Bloomberg Businessweek. White `#ffffff` background.
- **Accent:** `#6366F1`
- **Sections (top to bottom):**
  1. Hero — 50/50 split: left (eyebrow, name, italic role, big quote mark + quote, LinkedIn/Email pills) | right (circular photo 280px, `#6366F1` border)
  2. Stat cards — 4 dark `#0A0F1E` cards: 18+ / 15+ / $2M+ / Millions
  3. **Career Gantt chart** — CSS horizontal timeline 2006→2026, proportional bars:
     - Kotak/Padmamba: amber `#F59E0B`
     - Thomson Reuters: red `#EF4444`
     - People Inc. progression: 4 shades of indigo (light → dark = Analyst → Manager)
  4. Two-column: **Animated skill bars** (6 skills, CSS animation) | **Canvas donut** "A Day in My Life"
  5. Two-column: **Working style badges** (colored pills) + Life Beyond Work | **Language rings** (CSS `conic-gradient`)
  6. Two-column: **Most Proud Of** (4 items with icons) | **Awards + Education**
  7. Dark CTA strip — "Want to see how I think? Explore the simulations →"
- **Photo:** `../Images/pradeep.jpg`, `object-position: right top`
- **Canvas chart:** `aboutInit()` → `drawDonut('time-donut')` — 5 segments, DPR-aware

### 📈 Economy & Debt Simulator
- **Feel:** Bloomberg terminal / trading floor. Completely different universe.
- **Page background:** `#050D0A` (near black)
- **Accent:** `#00C896` terminal green
- **Warning:** `#FFB800` amber | **Danger:** `#FF4D4F` red | **Debt:** `#818CF8`
- **All text:** white or terminal green
- **Labels:** `Courier New` monospace, uppercase, letter-spaced
- **Sliders:** green track `rgba(0,200,150,0.2)`, glowing green thumb
- **Buttons:** monospace, green outline → fills on hover; primary = solid green
- **Event log:** pure `#000000` bg, green monospace text, colored entries
- **Section titles:** `// Central Bank` and `// Finance Ministry` style
- **`economyInit()`** redraws sparklines with colors: GDP=#00C896, Inflation=#FF4D4F, Unemployment=#FFB800, Debt=#818CF8
- **Simulation logic** is all in `economy.js` — `stepYear()`, `autoRun()`, `resetSim()`

### 🤝 Loan Tracker
- **Status:** HTML/CSS/JS files exist but NOT yet redesigned (still old cream theme)
- **Planned feel:** Fintech app — Revolut, N26, Wise
- **Planned palette:** White bg, `#2563EB` blue, `#10B981` green (money in), `#EF4444` red (money out)
- **Uses Supabase** for data persistence

### 🌱 Plant Simulator
- **Status:** Coming soon page only (`plants.html`), no CSS/JS
- **Planned feel:** Organic + scientific, nature documentary × lab notebook
- **Planned palette:** Deep forest `#0D1F0D` bg, `#4ADE80` green, earth tones
- **Coming soon tagline:** "Teaching computers to grow things"

### ⚖️ Judicial System
- **Status:** Coming soon page only (`judicial.html`), no CSS/JS
- **Planned feel:** Institutional authority — The Economist, supreme court gravitas
- **Planned palette:** Deep indigo `#1E1B4B` bg, `#818CF8` muted indigo, `#F59E0B` gold
- **Typography:** Merriweather serif headings + Sora body
- **Coming soon tagline:** "Simulating the systems that shape society"

---

## About Pradeep (for personalisation context)

- **Role:** Marketing Operations Manager, People Inc. (Dotdash Meredith)
- **Location:** Bangalore, India (works with US teams remotely)
- **Career:** 18+ years — Thomson Reuters (2007–2012) → People Inc./Meredith (2012–present)
- **Specialties:** Campaign operations, forecasting, VBA/Power Query automation, data analysis
- **Currently learning:** Python, AI agent systems
- **Education:** MBA (Distinction) BMSCE, VTU · B.Sc Physics/Maths/Electronics, National College
- **Languages:** English (100%), Kannada (92%), Hindi (72%)
- **Personality:** ENTJ · Systems Thinker · Data Obsessive · Self-Starter
- **Contact:** pradeepjainbp@gmail.com · linkedin.com/in/pradeep-jain-3671ab20
- **Life beyond work:** Container gardening, Montessori with kids, Indian equities tracking, Python/AI evenings

---

## What's Done vs Pending

### ✅ Done
- Global: dark header/nav, Sora font, per-tab underlines, pulse dot animation
- Home: full redesign — dark hero + terminal widget + themed project cards + ideas backlog
- About Me: full data-viz redesign — Gantt, skill bars, donut, language rings, awards
- Economy: full Bloomberg/terminal theme — dark bg, green accents, monospace everything

### ⏳ Pending (next in queue)
- Loan Tracker: fintech theme redesign
- Plant Simulator: full coming soon page with themed design + animations
- Judicial System: full coming soon page with institutional theme

---

## Conventions & Preferences

- Pradeep prefers **visual over text** — charts, timelines, rings over paragraphs
- Each tab should feel like a **completely different website** that belongs to the same family
- Same dark header/nav on every tab — that's the unifying element
- No long paragraphs anywhere if a visual can do the same job
- **Git:** repo is at `github.com/pradeepjainbp/pradeep-sandbox`, main branch
- When pushing: `git add` specific files (not `-A`), meaningful commit messages
