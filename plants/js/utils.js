/* ═══════════════════════════════════════════════════════
   utils.js
   Shared helpers — loaded first, available globally
   ═══════════════════════════════════════════════════════ */

'use strict';

// ─── Clamp ────────────────────────────────────────────────
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, Math.round(val)));
}

// ─── Debounce ─────────────────────────────────────────────
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ─── Sleep (Promise-based) ────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Escape HTML ──────────────────────────────────────────
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Format date ──────────────────────────────────────────
function formatDate(date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  }).format(date instanceof Date ? date : new Date(date));
}

// ─── Show/hide loading overlay ────────────────────────────
function showLoading(message) {
  const overlay = document.getElementById('loading-overlay');
  const msgEl   = document.getElementById('loading-message');
  if (overlay) overlay.classList.add('visible');
  if (msgEl && message) msgEl.textContent = message;
  SimState.isLoading = true;
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.remove('visible');
  SimState.isLoading = false;
}

// ─── Toast notifications ──────────────────────────────────
function showToast(message, type = 'default', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const typeClass = type === 'error'   ? 'toast-error'   :
                    type === 'success' ? 'toast-success' :
                    type === 'info'    ? 'toast-info'    : '';

  const toast = document.createElement('div');
  toast.className = `toast ${typeClass}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// ─── Capitalize first letter ──────────────────────────────
function capitalize(str) {
  return str ? str[0].toUpperCase() + str.slice(1) : '';
}

// ─── Linear interpolation ─────────────────────────────────
function lerp(a, b, t) {
  return a + (b - a) * t;
}
