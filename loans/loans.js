// ══════════════════════════════════════════════════════════
// LOAN TRACKER — Supabase-powered
// ══════════════════════════════════════════════════════════

const LT_URL  = 'https://icfpnrbyqtgdyyejebmk.supabase.co';
const LT_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljZnBucmJ5cXRnZHl5ZWplYm1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMDQ0NzAsImV4cCI6MjA4MjY4MDQ3MH0.MIBPc-5W6e-90dB5jZuVgEMlm8cH8cdw67ushY1wsXY';

let _sb = null;
function getSB() {
  if (!_sb && window.supabase) _sb = window.supabase.createClient(LT_URL, LT_KEY, { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } });
  return _sb;
}

let ltSession = null, ltProfile = null, ltLoans = [], ltTxns = {}, ltCurrentLoan = null, ltInterestOwed = 0;

// ── AUTH ──
async function ltInit() {
  const sb = getSB(); if (!sb) return;
  const { data: { session } } = await sb.auth.getSession();
  ltSession = session;
  if (session) { await ltLoadAll(); }
  ltRender();
  sb.auth.onAuthStateChange(async (event, session) => {
    ltSession = session;
    if (session) {
      await ltLoadAll();
      switchTab('loans');
    } else {
      ltLoans = []; ltTxns = {}; ltProfile = null;
    }
    ltRender();
  });
}

async function ltSignInGoogle() {
  const sb = getSB(); if (!sb) return;
  const redirectTo = location.origin + location.pathname;
  await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
}

async function ltSignOut() {
  const sb = getSB(); if (!sb) return;
  await sb.auth.signOut();
}

// ── DATA LOADING ──
async function ltLoadAll() {
  const sb = getSB(); if (!sb || !ltSession) return;
  const uid = ltSession.user.id;

  // Profile
  const { data: prof } = await sb.from('profiles').select('*').eq('id', uid).single();
  ltProfile = prof;

  // Loans via loan_parties
  const { data: parties } = await sb.from('loan_parties')
    .select('id, relationship, permission, loan:loans(*)')
    .eq('user_id', uid).eq('status', 'active');
  ltLoans = (parties || []).map(p => ({ ...p.loan, relationship: p.relationship, permission: p.permission, party_id: p.id })).filter(l => l && l.id);

  // All transactions for these loans in one query
  if (ltLoans.length > 0) {
    const ids = ltLoans.map(l => l.id);
    const { data: txns } = await sb.from('transactions').select('*').in('loan_id', ids).order('txn_date', { ascending: true });
    ltTxns = {};
    (txns || []).forEach(t => { if (!ltTxns[t.loan_id]) ltTxns[t.loan_id] = []; ltTxns[t.loan_id].push(t); });
  }
}

// ── RENDER ──
function ltRender() {
  const landing = document.getElementById('lt-landing');
  const app = document.getElementById('lt-app');
  if (!ltSession) { landing.style.display = ''; app.style.display = 'none'; return; }
  landing.style.display = 'none'; app.style.display = '';
  ltRenderApp();
}

function ltRenderApp() {
  const name = ltProfile?.display_name || ltSession?.user?.email?.split('@')[0] || 'User';
  document.getElementById('lt-user-name').textContent = name;
  document.getElementById('lt-avatar-initial').textContent = name.charAt(0).toUpperCase();

  let totalLent = 0, totalBorrowed = 0;
  ltLoans.forEach(l => {
    const b = ltBalance(l, ltTxns[l.id] || []);
    if (l.relationship === 'lender') totalLent += b.totalOutstanding;
    else if (l.relationship === 'borrower') totalBorrowed += b.totalOutstanding;
  });
  document.getElementById('lt-total-lent').textContent = ltFmt(totalLent, 'INR');
  document.getElementById('lt-total-borrowed').textContent = ltFmt(totalBorrowed, 'INR');

  const list = document.getElementById('lt-loan-list');
  if (ltLoans.length === 0) {
    list.innerHTML = '<div class="lt-empty"><div class="lt-empty-icon">🤝</div><p>No loans yet. Create your first one!</p></div>';
    return;
  }
  list.innerHTML = ltLoans.map(l => {
    const b = ltBalance(l, ltTxns[l.id] || []);
    const rc = l.relationship === 'lender' ? '#10B981' : l.relationship === 'borrower' ? '#EF4444' : '#3B82F6';
    const rl = l.relationship === 'lender' ? 'I Lent' : l.relationship === 'borrower' ? 'I Borrowed' : 'Observer';
    const pct = b.principalInitial > 0 ? Math.min(100, Math.round((b.totalRepaidPrincipal / b.principalInitial) * 100)) : 0;
    const cur = l.currency || 'INR';
    const intStr = l.interest_type !== 'none' && l.interest_rate ? `${(parseFloat(l.interest_rate)*100).toFixed(1)}% ${l.interest_type}` : 'No interest';
    const statusIcon = l.status === 'active' ? '🟢' : l.status === 'settled' ? '✅' : '⚫';
    return `<div class="lt-loan-card" onclick="ltOpenLoan('${l.id}')">
      <div class="lt-loan-card-top" style="background:${rc}"></div>
      <div class="lt-loan-card-body">
        <div class="lt-loan-card-row">
          <span class="lt-loan-name">${ltEsc(l.notes || 'Loan')}</span>
          <span class="lt-role-badge" style="background:${rc}20;color:${rc};border-color:${rc}">${rl}</span>
        </div>
        <div class="lt-loan-amount">${ltFmt(b.totalOutstanding, cur)}</div>
        <div class="lt-loan-sub">${statusIcon} ${l.status} · outstanding</div>
        <div class="lt-progress-bar"><div class="lt-progress-fill" style="width:${pct}%;background:${rc}"></div></div>
        <div class="lt-loan-meta">${pct}% repaid · ${intStr}</div>
      </div>
    </div>`;
  }).join('');
}

// ── BALANCE CALCULATION ──
function ltBalance(loan, txns) {
  let principalOutstanding = parseFloat(loan.principal_initial || 0);
  let totalRepaidPrincipal = 0, totalRepaidInterest = 0;
  (txns || []).forEach(t => {
    if (t.txn_type === 'repayment') { totalRepaidPrincipal += parseFloat(t.split_principal || 0); totalRepaidInterest += parseFloat(t.split_interest || 0); }
    else if (t.txn_type === 'principal_increase') principalOutstanding += parseFloat(t.amount || 0);
    else if (t.txn_type === 'principal_decrease') principalOutstanding -= parseFloat(t.amount || 0);
  });
  principalOutstanding = Math.max(0, principalOutstanding - totalRepaidPrincipal);
  const today = new Date().toISOString().split('T')[0];
  const rate = parseFloat(loan.interest_rate || 0);
  let interestAccrued = 0;
  if (loan.interest_type === 'simple' && rate > 0) {
    interestAccrued = principalOutstanding * rate * ltPeriods(loan.start_date, today, loan.interest_rate_period);
  } else if (loan.interest_type === 'compound' && rate > 0) {
    interestAccrued = principalOutstanding * (Math.pow(1 + rate, ltPeriods(loan.start_date, today, loan.interest_rate_period)) - 1);
  }
  const interestOutstanding = Math.max(0, interestAccrued - totalRepaidInterest);
  return { principalOutstanding, interestOutstanding, totalOutstanding: principalOutstanding + interestOutstanding, totalRepaidPrincipal, totalRepaidInterest, principalInitial: parseFloat(loan.principal_initial || 0) };
}

function ltPeriods(start, end, period) {
  const days = Math.max(0, (new Date(end) - new Date(start)) / 86400000);
  if (period === 'day') return days;
  if (period === 'month') return days / 30.4375;
  return days / 365.25;
}

function ltFmt(amount, currency) {
  currency = currency || 'INR';
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Math.max(0, amount)); }
  catch { return currency + ' ' + Math.max(0, Math.round(amount)).toLocaleString(); }
}

function ltEsc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function ltDateStr(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }

// ── LOAN DETAIL ──
async function ltOpenLoan(loanId) {
  ltCurrentLoan = ltLoans.find(l => l.id === loanId);
  if (!ltCurrentLoan) return;
  const loan = ltCurrentLoan;

  // Refresh transactions for this loan
  const sb = getSB();
  const { data: txns } = await sb.from('transactions').select('*').eq('loan_id', loanId).order('txn_date', { ascending: false });
  ltTxns[loanId] = txns || [];

  const txnList = ltTxns[loanId];
  const b = ltBalance(loan, [...txnList].reverse());
  const cur = loan.currency || 'INR';
  const rc = loan.relationship === 'lender' ? '#10B981' : loan.relationship === 'borrower' ? '#EF4444' : '#3B82F6';
  const rl = loan.relationship === 'lender' ? 'I Lent' : loan.relationship === 'borrower' ? 'I Borrowed' : 'Observer';
  const pct = b.principalInitial > 0 ? Math.min(100, Math.round((b.totalRepaidPrincipal / b.principalInitial) * 100)) : 0;
  const canEdit = loan.permission === 'editor' || loan.permission === 'admin';
  const intStr = loan.interest_type !== 'none' && loan.interest_rate ? `${(parseFloat(loan.interest_rate)*100).toFixed(2)}% per ${loan.interest_rate_period} (${loan.interest_type})` : 'No interest';

  const txnHtml = txnList.length === 0
    ? '<div class="lt-empty-txn">No payments recorded yet.</div>'
    : txnList.map(t => {
        const icon = t.txn_type === 'repayment' ? '💸' : t.txn_type === 'principal_increase' ? '📈' : t.txn_type === 'reversal' ? '↩️' : '📝';
        const hasSplit = (parseFloat(t.split_principal||0) + parseFloat(t.split_interest||0)) > 0;
        return `<div class="lt-txn-row">
          <span class="lt-txn-icon">${icon}</span>
          <div class="lt-txn-info">
            <div class="lt-txn-label">${t.txn_type.replace(/_/g,' ')}</div>
            <div class="lt-txn-date">${ltDateStr(t.txn_date)}${t.payment_method ? ' · '+t.payment_method : ''}${t.notes ? ' · '+ltEsc(t.notes) : ''}</div>
            ${hasSplit ? `<div class="lt-txn-split">Principal: ${ltFmt(t.split_principal,cur)} · Interest: ${ltFmt(t.split_interest,cur)}</div>` : ''}
          </div>
          <div class="lt-txn-amount">${ltFmt(t.amount, cur)}</div>
        </div>`;
      }).join('');

  document.getElementById('lt-detail-body').innerHTML = `
    <div class="lt-detail-header" style="border-left-color:${rc}">
      <div>
        <div class="lt-detail-role" style="color:${rc}">${rl}</div>
        <div class="lt-detail-title">${ltEsc(loan.notes || 'Loan')}</div>
        <div class="lt-detail-status">${loan.status}</div>
      </div>
      <div class="lt-detail-amount-wrap">
        <div class="lt-detail-amount">${ltFmt(b.totalOutstanding, cur)}</div>
        <div class="lt-detail-amount-sub">outstanding</div>
      </div>
    </div>
    <div class="lt-detail-progress-row">
      <div class="lt-detail-progress-bar"><div class="lt-detail-progress-fill" style="width:${pct}%;background:${rc}"></div></div>
      <span>${pct}% repaid</span>
    </div>
    <div class="lt-detail-grid">
      <div class="lt-detail-stat"><div class="lt-detail-stat-label">Principal</div><div class="lt-detail-stat-val">${ltFmt(b.principalInitial,cur)}</div></div>
      <div class="lt-detail-stat"><div class="lt-detail-stat-label">Repaid</div><div class="lt-detail-stat-val">${ltFmt(b.totalRepaidPrincipal+b.totalRepaidInterest,cur)}</div></div>
      <div class="lt-detail-stat"><div class="lt-detail-stat-label">Interest due</div><div class="lt-detail-stat-val">${ltFmt(b.interestOutstanding,cur)}</div></div>
      <div class="lt-detail-stat"><div class="lt-detail-stat-label">Start date</div><div class="lt-detail-stat-val">${ltDateStr(loan.start_date)}</div></div>
      <div class="lt-detail-stat"><div class="lt-detail-stat-label">Due date</div><div class="lt-detail-stat-val">${ltDateStr(loan.due_date) || 'Open-ended'}</div></div>
      <div class="lt-detail-stat"><div class="lt-detail-stat-label">Interest</div><div class="lt-detail-stat-val">${intStr}</div></div>
    </div>
    ${canEdit ? `<button class="lt-btn lt-btn-primary" onclick="ltOpenRecordPayment()" style="width:100%;padding:12px 0;margin-bottom:4px">💸 Record Payment</button>` : ''}
    <div class="lt-txn-list-header">Transaction History</div>
    <div>${txnHtml}</div>
    <p class="lt-disclaimer">LoanTracker is a personal tracking tool. Not legal or financial advice.</p>
  `;
  document.getElementById('lt-detail-modal').classList.add('open');
}

function ltCloseDetail() { document.getElementById('lt-detail-modal').classList.remove('open'); }

// ── CREATE LOAN ──
function ltOpenCreateLoan() {
  document.getElementById('lt-create-form').reset();
  document.getElementById('lt-start-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('lt-interest-fields').style.display = 'none';
  document.getElementById('lt-create-modal').classList.add('open');
}
function ltCloseCreateLoan() { document.getElementById('lt-create-modal').classList.remove('open'); }
function ltToggleInterest() {
  document.getElementById('lt-interest-fields').style.display = document.getElementById('lt-interest-type').value !== 'none' ? '' : 'none';
}

async function ltSubmitCreateLoan() {
  const sb = getSB(); if (!sb || !ltSession) return;
  const notes = document.getElementById('lt-notes').value.trim();
  const principal = parseFloat(document.getElementById('lt-principal').value);
  const startDate = document.getElementById('lt-start-date').value;
  if (!notes || !principal || !startDate) { alert('Please fill in all required fields.'); return; }
  const btn = document.getElementById('lt-create-submit-btn');
  btn.disabled = true; btn.textContent = 'Creating…';
  const interestType = document.getElementById('lt-interest-type').value;
  const hasInterest = interestType !== 'none';
  const { data: loan, error } = await sb.from('loans').insert({
    created_by: ltSession.user.id,
    currency: document.getElementById('lt-currency').value,
    principal_initial: principal,
    start_date: startDate,
    due_date: document.getElementById('lt-due-date').value || null,
    interest_type: interestType,
    interest_rate: hasInterest ? parseFloat(document.getElementById('lt-rate').value || 0) / 100 : null,
    interest_rate_period: hasInterest ? document.getElementById('lt-rate-period').value : null,
    notes,
    status: 'active',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).select().single();
  if (error) { alert('Error: ' + error.message); btn.disabled = false; btn.textContent = 'Create Loan'; return; }
  await sb.from('loan_parties').insert({ loan_id: loan.id, user_id: ltSession.user.id, permission: 'admin', relationship: document.getElementById('lt-role').value, status: 'active' });
  btn.disabled = false; btn.textContent = 'Create Loan';
  ltCloseCreateLoan();
  await ltLoadAll();
  ltRenderApp();
}

// ── RECORD PAYMENT ──
function ltOpenRecordPayment() {
  if (!ltCurrentLoan) return;
  const b = ltBalance(ltCurrentLoan, ltTxns[ltCurrentLoan.id] || []);
  ltInterestOwed = b.interestOutstanding;
  document.getElementById('lt-pay-form').reset();
  document.getElementById('lt-pay-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('lt-pay-currency-label').textContent = ltCurrentLoan.currency || 'INR';
  ltUpdatePaymentPreview();
  document.getElementById('lt-pay-modal').classList.add('open');
}
function ltCloseRecordPayment() { document.getElementById('lt-pay-modal').classList.remove('open'); }

function ltUpdatePaymentPreview() {
  const amount = parseFloat(document.getElementById('lt-pay-amount').value) || 0;
  const cur = ltCurrentLoan?.currency || 'INR';
  const intPart = Math.min(amount, ltInterestOwed);
  const prinPart = Math.max(0, amount - intPart);
  document.getElementById('lt-pay-preview-interest').textContent = ltFmt(intPart, cur);
  document.getElementById('lt-pay-preview-principal').textContent = ltFmt(prinPart, cur);
}

async function ltSubmitPayment() {
  const sb = getSB(); if (!sb || !ltSession || !ltCurrentLoan) return;
  const amount = parseFloat(document.getElementById('lt-pay-amount').value);
  const date = document.getElementById('lt-pay-date').value;
  if (!amount || !date) { alert('Please enter amount and date.'); return; }
  const btn = document.getElementById('lt-pay-submit-btn');
  btn.disabled = true; btn.textContent = 'Recording…';
  const intPart = Math.min(amount, ltInterestOwed);
  const prinPart = Math.max(0, amount - intPart);
  const { error } = await sb.from('transactions').insert({
    loan_id: ltCurrentLoan.id,
    created_by: ltSession.user.id,
    txn_date: date,
    txn_type: 'repayment',
    amount,
    split_principal: prinPart,
    split_interest: intPart,
    payment_method: document.getElementById('lt-pay-method').value || null,
    notes: document.getElementById('lt-pay-notes').value.trim() || null,
    client_id: crypto.randomUUID(),
    edit_window_minutes: 10,
  });
  btn.disabled = false; btn.textContent = 'Record Payment';
  if (error) { alert('Error: ' + error.message); return; }
  ltCloseRecordPayment();
  await ltLoadAll();
  ltRenderApp();
  await ltOpenLoan(ltCurrentLoan.id);
}

// ── LOANS TAB INIT ──
var _ltInited = false;
function loansInit() {
  if (!_ltInited) {
    _ltInited = true;
    ltInit();
  } else {
    ltRender();
  }
}
