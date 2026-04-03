/* ═══════════════════════════════════════════════════════
   api-gemini.js
   Gemini proxy caller:
   - Loads prompt templates from /prompts/
   - Interpolates variables
   - Calls Cloudflare Worker proxy
   - Retry logic (max 2), 15s timeout
   - Response caching in SimState.geminiCache
   ═══════════════════════════════════════════════════════ */

'use strict';

const GeminiAPI = (() => {

  // Replace with your deployed Cloudflare Worker URL after deployment
  const WORKER_URL = 'https://growbot-gemini-proxy.pradeepjainbp.workers.dev';

  const MAX_RETRIES = 2;
  const TIMEOUT_MS  = 15000;

  // In-memory prompt cache (so .txt files are only fetched once)
  const promptCache = {};

  // ─── Load prompt template ──────────────────────────────
  async function loadPrompt(name) {
    if (promptCache[name]) return promptCache[name];
    const res  = await fetch(`prompts/${name}.txt`);
    if (!res.ok) throw new Error(`Prompt not found: ${name}`);
    const text = await res.text();
    promptCache[name] = text;
    return text;
  }

  // ─── Interpolate {{VARIABLE}} placeholders ─────────────
  function interpolate(template, vars) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const val = vars[key];
      if (val === undefined || val === null) return '';
      return typeof val === 'object' ? JSON.stringify(val) : String(val);
    });
  }

  // ─── Simple hash for cache key ─────────────────────────
  function hashKey(promptId, variables) {
    const str = promptId + JSON.stringify(variables);
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return String(h);
  }

  // ─── Main Gemini call ──────────────────────────────────
  async function callGemini(promptId, variables) {
    SimState.isLoading = true;

    // Check cache first
    const cacheKey = hashKey(promptId, variables);
    if (SimState.geminiCache[cacheKey]) {
      SimState.isLoading = false;
      return SimState.geminiCache[cacheKey];
    }

    // Load templates
    const [systemPrompt, promptTemplate] = await Promise.all([
      loadPrompt('system-prompt'),
      loadPrompt(promptId),
    ]);

    const prompt = interpolate(promptTemplate, variables);

    const requestBody = {
      contents: [
        { role: 'user', parts: [{ text: prompt }] }
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature:      0.3,
        topP:             0.8,
        topK:             40,
        maxOutputTokens:  8192,
        responseMimeType: 'application/json',
      }
    };

    let lastError;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const response = await fetch(WORKER_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(requestBody),
          signal:  controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 429) {
            showToast('GrowBot is busy — please try again in 30 seconds', 'error');
            SimState.isLoading = false;
            return null;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error('Empty response from Gemini');

        // Extract JSON — Gemini sometimes wraps with markdown fences or preamble
        // text regardless of responseMimeType:'application/json'
        let cleanText = text;
        const jsonStart = cleanText.indexOf('{');
        const jsonEnd   = cleanText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          cleanText = cleanText.slice(jsonStart, jsonEnd + 1);
        }

        // Parse and validate
        const parsed = JSON.parse(cleanText);
        validateTopLevelKeys(promptId, parsed);

        // Cache successful result
        SimState.geminiCache[cacheKey] = parsed;
        SimState.isLoading = false;
        return parsed;

      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES) {
          await sleep(2000);
        }
      }
    }

    SimState.isLoading = false;
    console.error('Gemini call failed after retries:', lastError);
    showToast('GrowBot had trouble thinking — please try again', 'error');
    return null;
  }

  // ─── Basic response validation ─────────────────────────
  function validateTopLevelKeys(promptId, parsed) {
    const required = {
      'p1-location-season':   ['location_profile', 'soil_profile', 'initial_scores'],
      'p2-plant-match-score':  ['suitability'],
      'p2-plant-match-suggest':['suggestions'],
      'p3-stage-guide':        ['stage', 'decisions'],
      'p4-decision-point':     ['event', 'options'],
      'p5-diagnostician':      ['diagnosis', 'treatment'],
    };

    const keys = required[promptId] || [];
    const missing = keys.filter(k => !(k in parsed));
    if (missing.length) {
      throw new Error(`Missing keys in ${promptId} response: ${missing.join(', ')}`);
    }
  }

  // ─── Public API ───────────────────────────────────────
  return { callGemini };

})();
