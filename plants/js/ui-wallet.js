/* ═══════════════════════════════════════════════════════
   ui-wallet.js
   Wallet widget — shows budget remaining, animates spend
   ═══════════════════════════════════════════════════════ */

'use strict';

const WalletUI = (() => {

  let _budget = 0;

  // ─── Init: show widget + set starting budget ──────────
  function init(budget) {
    _budget = budget;
    const widget = document.getElementById('wallet-widget');
    if (widget) widget.style.display = 'flex';
    render(0);
  }

  // ─── Render: update amount + bar fill ────────────────
  function render(amountJustSpent) {
    const { balance, startingBudget } = SimState.wallet;

    const amountEl = document.getElementById('wallet-amount');
    const fillEl   = document.getElementById('wallet-bar-fill');

    if (amountEl) {
      amountEl.textContent = `₹${balance.toLocaleString('en-IN')}`;
    }

    if (fillEl && startingBudget > 0) {
      const pct = Math.max(0, Math.min(100, (balance / startingBudget) * 100));
      fillEl.style.width = `${pct}%`;

      // Color: green → amber → red as balance depletes
      if (pct > 50)      fillEl.style.background = '#4caf50';
      else if (pct > 20) fillEl.style.background = '#ffc107';
      else               fillEl.style.background = '#f44336';
    }

    if (amountJustSpent > 0) {
      flashSpend();
      if (SimState.wallet.balance < SimState.wallet.startingBudget * 0.2) {
        flashLow();
      }
    }
  }

  // ─── Flash the widget on spend ────────────────────────
  function flashSpend() {
    const widget = document.getElementById('wallet-widget');
    if (!widget) return;
    widget.classList.add('wallet-flash');
    setTimeout(() => widget.classList.remove('wallet-flash'), 600);
  }

  // ─── Red pulse if balance is critical ─────────────────
  function flashLow() {
    const widget = document.getElementById('wallet-widget');
    if (!widget) return;
    widget.classList.add('wallet-low');
    setTimeout(() => widget.classList.remove('wallet-low'), 1200);
  }

  // ─── Floating cost chip ───────────────────────────────
  // Floats "─₹500" upward from the clicked button toward the wallet widget
  function showFloatingCost(amount, fromEl) {
    if (!amount || amount <= 0 || !fromEl) return;

    const chip = document.createElement('div');
    chip.className = 'wallet-float-chip';
    chip.textContent = `─₹${amount.toLocaleString('en-IN')}`;

    // Position near the button
    const rect = fromEl.getBoundingClientRect();
    chip.style.left = `${rect.left + rect.width / 2}px`;
    chip.style.top  = `${rect.top + window.scrollY}px`;

    document.body.appendChild(chip);

    // Animate upward then fade
    requestAnimationFrame(() => {
      chip.style.transform = 'translateY(-60px) translateX(-50%)';
      chip.style.opacity   = '0';
    });

    setTimeout(() => chip.remove(), 800);
  }

  // ─── Public API ───────────────────────────────────────
  return { init, render, showFloatingCost, flashLow };

})();
