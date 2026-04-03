/**
 * gemini-proxy.js — Cloudflare Worker
 * Proxies Gemini API calls from the Plant Growth Simulator.
 *
 * Setup:
 * 1. Deploy this as a Cloudflare Worker
 * 2. Set GEMINI_API_KEY as a Worker secret (wrangler secret put GEMINI_API_KEY)
 * 3. Update WORKER_URL in api-gemini.js with the deployed Worker URL
 *
 * Routes:
 *   POST /  — proxies to Gemini generateContent API
 *   OPTIONS / — CORS preflight
 */

const ALLOWED_ORIGINS = [
  'https://pradeepjainbp.in',
  'https://www.pradeepjainbp.in',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Simple in-memory rate limiter (resets per Worker instance)
const rateLimitMap = new Map();
const RATE_LIMIT_MAX     = 30;   // requests per window
const RATE_LIMIT_WINDOW  = 3600; // seconds (1 hour)

function checkRateLimit(ip) {
  const now = Math.floor(Date.now() / 1000);
  const entry = rateLimitMap.get(ip) || { count: 0, windowStart: now };

  // Reset window if expired
  if (now - entry.windowStart > RATE_LIMIT_WINDOW) {
    entry.count = 0;
    entry.windowStart = now;
  }

  entry.count++;
  rateLimitMap.set(ip, entry);

  return entry.count <= RATE_LIMIT_MAX;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin':  ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age':       '86400',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Validate origin
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate API key is set
    if (!env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Forward to Gemini
    const geminiRes = await fetch(`${GEMINI_URL}?key=${env.GEMINI_API_KEY}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    const data = await geminiRes.json();

    return new Response(JSON.stringify(data), {
      status: geminiRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
