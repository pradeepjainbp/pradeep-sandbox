# Plant Simulator — Gamification Redesign (v2)
> Redrafted: 2026-04-03 | Claude Opus 4.6 with Pradeep Jain B P
> v1 of this document was written against an older codebase state — many bugs it listed are already fixed.

---

## ACTUAL STATE OF THE CODEBASE (as at 2026-04-03)

The existing document listed 5 bugs. Here is the true status:

| Bug | Described | Actual Status |
|-----|-----------|---------------|
| 1 — `name_en` vs `common_en` field mismatch | Critical | **ALREADY FIXED** — current code uses `common_en` correctly everywhere |
| 2 — No emoji data | Medium | **ALREADY FIXED** — `CATEGORY_EMOJI` map exists in `ui-plant-picker.js` |
| 3 — Progress step clicks don't work | Medium | **ALREADY WIRED** in `app.js` → `wireProgressSteps()`. **One gap:** CSS has no `cursor: pointer` on `.step.completed` |
| 4 — Common name not prominent | Medium | **ALREADY FIXED** — `renderResults()` shows `common_en` as primary name |
| 5 — `selectPlant()` wrong field names | Low | **ALREADY FIXED** — uses `plant.common_en` correctly |

**The only Phase 1 fix still needed:** Add CSS `cursor: pointer; hover effect` to `.step.completed`.

Everything else is a *product* problem, not a bug problem.

---

## THE REAL PROBLEM: IT'S A QUESTIONNAIRE, NOT A GAME

The simulator as built is a guided educational form. Users answer questions about soil and watering with no real sense of:
- **Stakes** — what do I lose if I choose wrong?
- **Tension** — will my plant actually die?
- **Agency** — does my choice matter right now, visually?
- **Reward** — what does success feel like?

The fix is not more features. It's a **game loop** with real economics at its heart.

---

## THE GAME LOOP (North Star Vision)

```
SETUP (Stages 1-3)
  Pick location → season → plant
  → GrowBot sets the scene: "Bangalore. October. You want to grow Methi."
  → Budget revealed: ₹1,200 (scaled to crop type)
  → Win condition shown: "Harvest 300g and turn a profit"

INVEST (Stages 4-5)
  Every decision has a rupee cost
  → "Add organic compost? ─ ₹500" vs "Chemical fertilizer? ─ ₹180"
  → Budget meter drains visibly
  → Plant visual updates immediately on each choice
  → GrowBot explains the trade-off (the teaching moment)

GROW (Stage 6 — 4 sub-stages)
  Plant grows stage by stage with animation
  → More decisions, more costs
  → Scores shift, plant visual responds
  → "GrowBot Warning: Aphids spotted — intervene or wait?"

HARVEST
  P&L Statement — the moment of truth
  → Total spent: ₹780 / Yield: 280g / Market price: ₹8/100g
  → Revenue: ₹22.40 / Profit: -₹757.60
  → "This is why methi is a subsistence crop, not a cash crop."
  → Grade: B+ (plant thrived even if economics didn't)
  → Try again / Try a different crop
```

This structure teaches **real farming economics** through play, not through paragraphs.

---

## PHASE 1 — THE ONE REMAINING FIX (30 minutes)

### Fix: Clickable progress steps need CSS

In `css/main.css`, add to the progress steps section:

```css
.progress-steps .step.completed {
  cursor: pointer;
}
.progress-steps .step.completed .step-dot {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.progress-steps .step.completed:hover .step-dot {
  transform: scale(1.15);
  box-shadow: 0 0 0 4px rgba(45, 138, 78, 0.2);
}
```

That's it for bug fixes. Everything else is feature work.

---

## PHASE 2 — WALLET / ECONOMY GAMIFICATION

### 2a — Budget Scaling by Plant Type

Starting budget is NOT a flat ₹5,000. It scales to the crop so the tension is real:

| Category | Starting Budget | Rationale |
|----------|----------------|-----------|
| Herb / Leafy Vegetable | ₹800 | Methi, coriander — quick, cheap, low stakes |
| Vegetable | ₹1,500 | Tomato, brinjal — moderate investment |
| Fruit (annual) | ₹2,500 | Watermelon, cucumber — more inputs needed |
| Flower | ₹1,200 | Marigold, sunflower |
| Spice | ₹2,000 | Chilli, turmeric — longer cycle |
| Cash Crop / Grain / Pulse | ₹4,000 | Groundnut, wheat — real farm economics |
| Tree / Fruit Tree | ₹6,000 | Mango, banana — long-term investment |
| Indoor Plant | ₹600 | Pothos, snake plant — low stakes, accessible |

Add a `BUDGET_BY_CATEGORY` lookup in `js/state.js`.

### 2b — First Cost: Buying Seeds/Saplings

The first financial moment should happen **at the transition from Stage 3 → 4**, before any decisions. When the user clicks "Start Growing":
- A modal/card appears: "GrowBot sourced your seeds — ₹[seed_cost] spent from your budget"
- This is a fixed cost (Gemini provides it as part of P2 response)
- Immediately real: you've committed. No going back without losing that ₹.

Add `seed_cost_rupees` to the P2 response schema (p2-plant-match-score prompt).

### 2c — SimState additions

Add to `SimState` in `js/state.js`:

```js
wallet: {
  startingBudget:  0,     // set on plant selection from BUDGET_BY_CATEGORY
  balance:         0,     // current balance
  totalSpent:      0,
  transactions:    [],    // [{label, amount, stage, timestamp}]
  estimatedYield:  null,  // from harvest stage (kg or units)
  marketPrice:     null,  // ₹ per unit from Gemini harvest response
  grossRevenue:    null,
},
```

Add helper in `js/state.js`:

```js
function spendMoney(amount, label, stage) {
  if (amount <= 0) return;
  SimState.wallet.balance    -= amount;
  SimState.wallet.totalSpent += amount;
  SimState.wallet.transactions.push({ label, amount, stage, timestamp: Date.now() });
  if (typeof WalletUI !== 'undefined') WalletUI.render(amount);
}
```

### 2d — Wallet Widget in Header

Add to `index.html` between `.header-center` and `.header-badge`:

```html
<div class="wallet-widget" id="wallet-widget" style="display:none">
  <div class="wallet-icon">💰</div>
  <div class="wallet-body">
    <div class="wallet-amount" id="wallet-amount">₹0</div>
    <div class="wallet-label">budget</div>
  </div>
  <div class="wallet-bar-wrap">
    <div class="wallet-bar-fill" id="wallet-bar-fill"></div>
  </div>
</div>
```

Show from Stage 4 onwards (alongside sidebar). The bar depletes visually as money is spent — like a health bar for your wallet.

Create `js/ui-wallet.js`:
- `init(budget)` — sets starting budget, shows widget
- `render(amountJustSpent)` — updates display, animates number countdown
- `showFloatingCost(amount, fromEl)` — floats "─₹500" chip from decision card up toward wallet widget
- `flashLow()` — red pulse if balance < 20% of starting budget

### 2e — Decision Cards Show Cost

Update `p3-stage-guide.txt` prompt: add `cost_rupees` to option schema:

```json
{
  "id": "string",
  "label": "string",
  "cost_rupees": "integer — actual rupee cost (0 if free/DIY)",
  "cost_label": "string — e.g., 'Buy organic compost (5kg) — ₹500'",
  "effects": { ... },
  "why": "string",
  "cost_indicator": "string — keep for backward compat"
}
```

In all three decision UIs (`ui-pre-planting.js`, `ui-planting.js`, `ui-timeline.js`), update `buildDecisionCard()` option tiles:

```html
<button class="decision-option" data-option="${opt.id}">
  <div class="option-top">
    <span class="option-label">${escapeHtml(opt.label)}</span>
    <span class="option-cost ${opt.cost_rupees === 0 ? 'cost-free' : 'cost-spend'}">
      ${opt.cost_rupees === 0 ? 'Free' : `─₹${opt.cost_rupees.toLocaleString('en-IN')}`}
    </span>
  </div>
  <div class="option-effects">${chips}</div>
  <p class="option-why">${escapeHtml(opt.why || '')}</p>
</button>
```

On click: `spendMoney(opt.cost_rupees, opt.cost_label || opt.label, SimState.currentGrowthStage)`.
Then: `WalletUI.showFloatingCost(opt.cost_rupees, buttonElement)`.

### 2f — Harvest P&L Statement

Update `p3-stage-guide.txt` for the Harvest stage to return:

```json
"harvest_economics": {
  "yield_amount": "float",
  "yield_unit": "string — 'kg' | 'g' | 'bunch' | 'pieces'",
  "market_price_per_unit": "integer — ₹",
  "market_price_label": "string — e.g., '₹8 per 100g at local mandi'",
  "gross_revenue": "integer — total ₹ earned",
  "quality_label": "string — 'Poor' | 'Average' | 'Good' | 'Excellent'",
  "farmer_insight": "string — 60 words max: the real economic lesson from this crop"
}
```

Replace the grade card in `ui-timeline.js → renderHarvestSummary()` with:

```
╔═══════════════════════════════════════════╗
║  🌾 HARVEST REPORT — Methi               ║
║  📍 Bangalore · October 2025             ║
╚═══════════════════════════════════════════╝

EXPENSES
  Seeds (50g pack)              ─₹ 40
  Organic compost (5kg)         ─₹ 500
  Drip watering setup           ─₹ 180
  Neem spray (pest control)     ─₹ 60
  ─────────────────────────────────────────
  Total Invested                ─₹ 780

YIELD
  Harvest: 280g (Good quality)
  Market: ₹8 per 100g (local mandi)
  ─────────────────────────────────────────
  Gross Revenue                 +₹ 22

NET RESULT     ─₹ 758 loss
               (This is expected for methi)

═══════════════════════════════════════════
SCORES   Soil 78 · Vitality 82 · Water 71 · Eco 85
GRADE    B+  —  Your plant thrived. The economics didn't.
═══════════════════════════════════════════

💡 "Methi is a subsistence crop — Indian households grow
   it for freshness and nutrition, not income. A commercial
   farmer grows 10 batches simultaneously. Try tomatoes if
   you want to see a crop that can actually pay for itself."

[🔄 Grow Something New]   [🍅 Try Tomatoes Instead]
```

The `[Try X Instead]` button pre-fills the plant picker with a Gemini-suggested profitable alternative.

---

## PHASE 3 — VISUAL & ANIMATION

### 3a — Plant Visual: Seed State + Stage Transitions

The current `STAGE_MAP` in `ui-plant-visual.js` starts at `'none'`. Add:

```js
'seed': { stemH: '2%', leafVis: 0, flowers: false, fruits: false, thickness: '2px' },
```

Set plant to `'seed'` state when entering Stage 4 (pre-planting). This is the moment the player has "bought" their seeds.

**Stage transitions must be visually dramatic** — this is the payoff moment. Add to CSS:

```css
.plant-container {
  /* Existing properties + */
  transition: --stem-height 1.5s cubic-bezier(0.34, 1.56, 0.64, 1),
              --leaf-opacity 1.2s ease,
              --flower-opacity 0.8s ease,
              --fruit-size 1.0s ease;
}

/* Growth burst animation when stage advances */
@keyframes growBurst {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.08); }
  100% { transform: scale(1); }
}

.plant-container.stage-advancing {
  animation: growBurst 0.8s ease forwards;
}
```

In `ui-timeline.js`, when advancing to next growth stage:
1. Add `.stage-advancing` class to plant container
2. Remove it after 800ms
3. Call `PlantVisualUI.setStageByIndex(newIdx)` during the burst

### 3b — Vitality Modifiers (Visual Feedback)

The current `VITALITY_MAP` drives colors but no structural changes. Add CSS classes:

```css
/* Thriving: leaves wider, slight upward lean, glow effect */
.plant-container.vitality-high .leaf { filter: saturate(1.4) brightness(1.1); }
.plant-container.vitality-high .stem { filter: drop-shadow(0 0 8px rgba(45,138,78,0.4)); }

/* Stressed: leaves narrower, slight droop */
.plant-container.vitality-critical .leaf {
  animation: wilt-droop 2s ease-in-out infinite alternate;
}

@keyframes wilt-droop {
  from { transform: rotate(var(--leaf-droop, 0deg)); }
  to   { transform: rotate(calc(var(--leaf-droop, 0deg) + 8deg)) scaleX(0.9); }
}
```

### 3c — Decision Feedback Animations

When a decision is made:
- **Cost > 0**: `WalletUI.showFloatingCost()` — chip floats from card to wallet widget
- **Vitality delta > 0**: Brief green pulse on the vitality gauge arc
- **Vitality delta < 0**: Red shake on the vitality gauge arc
- **Plant visual updates within 500ms** of decision click (not waiting for Gemini)

These fire immediately on click, BEFORE the Gemini response — creates instant feedback loop.

### 3d — Stage Narrative (GrowBot Story Text)

Add a story intro above decision cards in each stage. In `ui-timeline.js`:

```js
const STAGE_STORIES = {
  0: (plant, loc) =>
    `The ${plant.name} seeds are in the ground. The ${loc.season || 'season'} air in ${loc.name} carries that mix of rain and dust.
     GrowBot is watching closely — the first two weeks will tell us a lot.`,
  1: (plant) =>
    `Something is happening. The leaves are reaching. This is the stage where your earlier choices start to compound.`,
  2: (plant) =>
    `The plant is committing. Stems thickening, leaves spreading, roots going deep.
     What you do with water and nutrition now will shape everything that follows.`,
  3: (plant) =>
    `The ${plant.name} is flowering. Almost there. One wrong move — too much water, a pest unnoticed — can still derail it.
     Trust the process and watch carefully.`,
};
```

Render as a `<blockquote class="growbot-narration">` above the decision cards, with GrowBot avatar icon.

---

## PHASE 4 — POLISH / FUTURE (Not in current scope)

These are good ideas but out of scope for this sprint:

- **Leaderboard**: Best P&L by crop type stored in Supabase
- **Shareable card**: "I grew Methi in Bangalore and spent ₹780 for ₹22 revenue" — PNG card
- **Challenge mode**: "Grow this crop with only ₹500"
- **Crop comparison**: Two crops, same budget, same location — who wins?
- **Streak system**: Grow 3 crops in a row without plant death
- **Achievement badges**: "First Harvest", "Organic Farmer", "Loss Leader", etc.
- **Mobile-first layout**: Current layout needs responsive rework for phones

---

## FILE CHANGE SUMMARY

| File | Change | Phase |
|------|--------|-------|
| `css/main.css` | `.step.completed { cursor: pointer + hover effect }` | 1 |
| `js/state.js` | Add `wallet` object + `BUDGET_BY_CATEGORY` + `spendMoney()` | 2 |
| `js/ui-wallet.js` | NEW: wallet widget, floating cost animation, low-balance flash | 2 |
| `index.html` | Add `#wallet-widget` to header + `<script src="js/ui-wallet.js">` | 2 |
| `prompts/p2-plant-match-score.txt` | Add `seed_cost_rupees` to response schema | 2 |
| `prompts/p3-stage-guide.txt` | Add `cost_rupees`, `cost_label` to option schema; add `harvest_economics` | 2 |
| `js/ui-pre-planting.js` | Show cost pill on options, call `spendMoney()` on click | 2 |
| `js/ui-planting.js` | Show cost pill on options, call `spendMoney()` on click | 2 |
| `js/ui-timeline.js` | Show cost pill on options; replace harvest grade card with P&L | 2 |
| `js/app.js` | On Stage 3→4 transition: show seed purchase modal, call `WalletUI.init()` | 2 |
| `js/ui-plant-visual.js` | Add `'seed'` state to `STAGE_MAP` | 3 |
| `css/plant-visual.css` | Stage transition animation, vitality-high/critical effects, wilt keyframes | 3 |
| `js/ui-timeline.js` | Add STAGE_STORIES narrative text per growth stage | 3 |

---

## IMPLEMENTATION ORDER

1. `css/main.css` — cursor fix (10 min) — deploy immediately, fixes UX now
2. `js/state.js` — add `wallet` + `BUDGET_BY_CATEGORY` + `spendMoney()` (30 min)
3. `prompts/p3-stage-guide.txt` — add cost fields + harvest_economics (20 min)
4. `prompts/p2-plant-match-score.txt` — add seed_cost_rupees (10 min)
5. `js/ui-wallet.js` — new file, wallet widget + animations (1.5 hours)
6. `index.html` — add wallet widget HTML + script tag (15 min)
7. `js/app.js` — seed purchase modal on Stage 3→4 + WalletUI.init() (30 min)
8. `js/ui-pre-planting.js` — cost pills + spendMoney (45 min)
9. `js/ui-planting.js` — cost pills + spendMoney (45 min)
10. `js/ui-timeline.js` — cost pills + P&L harvest summary + narrative text (2 hours)
11. `css/plant-visual.css` — stage transition animations + vitality modifiers (1 hour)
12. `js/ui-plant-visual.js` — add `seed` stage (15 min)

Deploy after step 1 (quick win), then again after step 10 (main gamification), then after step 12 (visuals).

---

## KEY DESIGN DECISIONS (Reasoning for each)

**Why budget scales by crop?**
A flat ₹5,000 budget trivialises methi (costs ₹300 total) and breaks immersion. When the budget is ₹800 and methi seeds cost ₹40, every decision feels weighted. The constraint is the game.

**Why seed cost is the first spend?**
It creates a psychological commitment. You've invested. You can't go back. This is exactly how real farmers feel — once the seeds are in the ground, sunk cost changes behaviour. The game should replicate that feeling.

**Why immediate visual feedback before Gemini responds?**
Gemini takes 2-4 seconds. If the plant only changes after the API call, decisions feel disconnected from consequences. Optimistic UI updates on click, then Gemini can refine further — the plant shouldn't wait for AI to grow.

**Why a loss can still get a B+ grade?**
Because the goal is learning, not just profit. Methi grown well with good vitality scores deserves recognition even if it loses money economically. The two dimensions — horticultural success and economic success — should be scored separately and together tell a richer story.

**Why include the "farmer insight" in harvest?**
This is the educational payload. The game is designed to make you feel the economics before explaining them. The insight lands differently after you've watched ₹780 disappear for ₹22 revenue.

---

## NOTES FOR ALL SESSIONS

- Worker: `growbot-gemini-proxy.pradeepjainbp.workers.dev` — redeploy with `npx wrangler deploy` from `plants/worker/` when `gemini-proxy.js` changes
- Gemini model: `gemini-2.5-flash-lite` — fast, no thinking, stable
- `GEMINI_API_KEY` is a Cloudflare Worker secret (never in client code)
- Git: `github.com/pradeepjainbp/pradeep-sandbox`, branch: `main`
- `data/plants.json`: 344 plants, fields: `id`, `common_en`, `common_hi`, `common_kn`, `common_ta`, `common_te`, `common_mr`, `scientific`, `category`, `subcategory`, `tags`
- `data/soil-profiles.json`: 47 regional soil defaults
