// ── SIMULATION STATE ──
let year = 2024, autoTimer = null, autoRunning = false;
let hist = { gdp:[2.8], inf:[3.1], une:[5.2], dbt:[60] };
let soc = { equality:55, trust:60, innovation:65, stability:70, welfare:58, confidence:62 };

function updateVal(id, suf) {
  const v = parseFloat(document.getElementById(id).value);
  document.getElementById('v-' + id).textContent = v + (suf || '');
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function getState() {
  return {
    rate:  parseFloat(document.getElementById('rate').value),
    money: parseFloat(document.getElementById('money').value),
    spend: parseFloat(document.getElementById('spend').value),
    tax:   parseFloat(document.getElementById('tax').value),
    debt:  parseFloat(document.getElementById('debt').value)
  };
}

function simulate(s) {
  let gdp = 2.5 + (s.spend-20)*0.05 + (s.money-3)*0.08 - (s.rate-4)*0.18 - (s.tax-25)*0.04 - Math.max(0,s.debt-80)*0.01 + (Math.random()-0.5)*0.6;
  gdp = clamp(gdp, -6, 9);

  let inf = 1.5 + (s.money-3)*0.22 + (s.spend-20)*0.04 - (s.rate-4)*0.14 + (Math.random()-0.5)*0.5;
  inf = clamp(inf, -1, 18);

  let une = 4.5 - (s.spend-20)*0.04 + (s.rate-4)*0.12 + (s.tax-25)*0.05 + (Math.random()-0.5)*0.4;
  une = clamp(une, 1, 22);

  let deficit = (s.spend/100) - (s.tax/100*0.9);
  let interest = (s.debt * s.rate) / 1000;
  let dbt = s.debt + deficit*100 - gdp*0.3 + interest + (Math.random()-0.5)*1;
  dbt = clamp(dbt, 0, 300);
  document.getElementById('debt').value = dbt;
  document.getElementById('v-debt').textContent = Math.round(dbt) + '%';

  return { gdp, inf, une, dbt };
}

function socColor(v) {
  if (v > 70) return 'var(--c3)';
  if (v > 45) return 'var(--c5)';
  return 'var(--c1)';
}

function socBarColor(v) {
  if (v > 70) return '#6BCB77';
  if (v > 45) return '#FF922B';
  return '#FF6B6B';
}

function renderSoc() {
  const labels = { equality:'Equality', trust:'Trust', innovation:'Innovation', stability:'Stability', welfare:'Welfare', confidence:'Confidence' };
  document.getElementById('soc-grid').innerHTML = Object.entries(soc).map(([k,v]) => `
    <div class="soc-item">
      <div class="soc-item-name">${labels[k]}</div>
      <div class="soc-item-val" style="color:${socColor(v)}">${Math.round(v)}</div>
      <div class="soc-bar-bg"><div class="soc-bar-fill" style="width:${Math.round(v)}%;background:${socBarColor(v)}"></div></div>
    </div>`).join('');
}

function updateSociety(r) {
  const s = getState();
  soc.equality   = clamp(soc.equality   + (r.gdp>3?1:-0.5) - (r.dbt>100?1.5:0) + (s.spend>30?0.5:0), 0, 100);
  soc.trust      = clamp(soc.trust      + (r.inf<3&&r.gdp>2?1:-1) - (r.inf>7?3:0), 0, 100);
  soc.innovation = clamp(soc.innovation + (r.gdp>3?0.8:0) - (r.une>10?2:0) + (s.rate<5?0.3:0), 0, 100);
  soc.stability  = clamp(soc.stability  - Math.abs(r.inf-2.5)*0.4 - (r.dbt>120?1.2:0) + (r.gdp>2?0.4:0), 0, 100);
  soc.welfare    = clamp(soc.welfare    + (s.spend>30?0.8:-0.4) - (r.une>8?1.2:0) + (r.gdp>3?0.3:0), 0, 100);
  soc.confidence = clamp(soc.confidence + (r.gdp>0?0.4:-0.8) - (r.inf>6?1:0), 0, 100);
  renderSoc();
}

function sparkline(id, data, color) {
  const c = document.getElementById(id);
  if (!c) return;
  const w = c.parentElement.offsetWidth || 200, h = 40;
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  if (data.length < 2) return;
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pts = data.map((v,i) => ({ x: i/(data.length-1)*w, y: h - (v-mn)/rng*(h-6) - 3 }));
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.lineTo(pts[pts.length-1].x, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fillStyle = color + '22'; ctx.fill();
  const lp = pts[pts.length-1];
  ctx.beginPath(); ctx.arc(lp.x, lp.y, 4, 0, Math.PI*2);
  ctx.fillStyle = color; ctx.fill();
}

function descGDP(v) { return v>5?'Strong expansion':v>2?'Moderate growth':v>0?'Sluggish growth':v>-2?'Mild recession':'Deep recession'; }
function descInf(v) { return v<0?'Deflation risk':v<2?'Below target':v<4?'Near target':v<7?'Elevated':'High inflation'; }
function descUne(v) { return v<3?'Overheated labour':v<6?'Near natural rate':v<10?'Elevated':'High unemployment'; }
function descDbt(v) { return v<40?'Very low':v<70?'Manageable':v<100?'Elevated':v<150?'Risk zone':'Debt crisis!'; }

function deltaHtml(cur, prev, goodUp) {
  const d = cur - prev;
  if (Math.abs(d) < 0.05) return '';
  const good = goodUp ? d > 0 : d < 0;
  return `<span class="${good?'up':'dn'}">${d>0?'▲':'▼'} ${Math.abs(d).toFixed(1)}</span>`;
}

function logEntry(y, msg, type='') {
  const log = document.getElementById('log');
  const d = document.createElement('div');
  d.className = 'log-entry ' + type;
  d.innerHTML = `<span class="log-year">${y}</span><span class="log-msg">${msg}</span>`;
  log.prepend(d);
  while (log.children.length > 25) log.removeChild(log.lastChild);
}

function stepYear() {
  year++;
  document.getElementById('yr').textContent = year;
  const s = getState();
  const r = simulate(s);
  const prev = {
    gdp: hist.gdp[hist.gdp.length-1],
    inf: hist.inf[hist.inf.length-1],
    une: hist.une[hist.une.length-1],
    dbt: hist.dbt[hist.dbt.length-1]
  };

  hist.gdp.push(r.gdp); hist.inf.push(r.inf); hist.une.push(r.une); hist.dbt.push(r.dbt);
  if (hist.gdp.length > 24) { hist.gdp.shift(); hist.inf.shift(); hist.une.shift(); hist.dbt.shift(); }

  document.getElementById('gdp-val').textContent = (r.gdp>0?'+':'') + r.gdp.toFixed(1) + '%';
  document.getElementById('gdp-desc').textContent = descGDP(r.gdp);
  document.getElementById('gdp-delta').innerHTML = deltaHtml(r.gdp, prev.gdp, true);

  document.getElementById('inf-val').textContent = r.inf.toFixed(1) + '%';
  document.getElementById('inf-desc').textContent = descInf(r.inf);
  document.getElementById('inf-delta').innerHTML = deltaHtml(r.inf, prev.inf, false);

  document.getElementById('une-val').textContent = r.une.toFixed(1) + '%';
  document.getElementById('une-desc').textContent = descUne(r.une);
  document.getElementById('une-delta').innerHTML = deltaHtml(r.une, prev.une, false);

  document.getElementById('dbt-val').textContent = Math.round(r.dbt) + '%';
  document.getElementById('dbt-desc').textContent = descDbt(r.dbt);
  document.getElementById('dbt-delta').innerHTML = deltaHtml(r.dbt, prev.dbt, false);

  sparkline('sp-gdp', hist.gdp, '#6BCB77');
  sparkline('sp-inf', hist.inf, '#FF6B6B');
  sparkline('sp-une', hist.une, '#FFD93D');
  sparkline('sp-dbt', hist.dbt, '#4D96FF');

  updateSociety(r);

  // events
  if (r.inf > 9)       logEntry(year, 'Inflation out of control — purchasing power collapsing!', 'bad');
  else if (r.gdp < -3) logEntry(year, 'Severe recession. Unemployment surging.', 'bad');
  else if (r.dbt > 160) logEntry(year, 'Debt crisis territory — credit markets tightening.', 'bad');
  else if (r.gdp > 5 && r.inf < 4 && r.une < 5) logEntry(year, 'Goldilocks! Strong growth, low inflation, full employment.', 'good');
  else if (r.une < 3)  logEntry(year, 'Labour market overheating — wage inflation building.', 'warn');
  else if (r.inf < 0)  logEntry(year, 'Deflation detected — consumers delaying purchases.', 'warn');
  else {
    const msgs = [
      `Rate ${s.rate}% — ${s.rate>7?'restrictive':'accommodative'} monetary stance.`,
      `Govt spending at ${s.spend}% of GDP.`,
      `Tax revenue ${s.tax<20?'low — deficit widening':'steady}.'}`,
      `Debt service cost rising with higher rates.`,
      `Central bank monitoring inflation trends.`
    ];
    logEntry(year, msgs[Math.floor(Math.random()*msgs.length)]);
  }
}

function autoRun() {
  if (autoRunning) {
    clearInterval(autoTimer); autoRunning = false;
    document.getElementById('auto-btn').textContent = '⏩ Auto';
    document.getElementById('auto-btn').classList.remove('auto-on');
  } else {
    autoRunning = true;
    document.getElementById('auto-btn').textContent = '⏹ Stop';
    document.getElementById('auto-btn').classList.add('auto-on');
    autoTimer = setInterval(stepYear, 850);
  }
}

function resetSim() {
  clearInterval(autoTimer); autoRunning = false;
  document.getElementById('auto-btn').textContent = '⏩ Auto';
  document.getElementById('auto-btn').classList.remove('auto-on');
  year = 2024; document.getElementById('yr').textContent = year;
  hist = { gdp:[2.8], inf:[3.1], une:[5.2], dbt:[60] };
  soc  = { equality:55, trust:60, innovation:65, stability:70, welfare:58, confidence:62 };
  ['rate','money','spend','tax','debt'].forEach(id => {
    const defaults = { rate:'4.5', money:'3', spend:'20', tax:'25', debt:'60' };
    document.getElementById(id).value = defaults[id];
    document.getElementById('v-'+id).textContent = defaults[id] + '%';
  });
  document.getElementById('gdp-val').textContent = '+2.8%';
  document.getElementById('inf-val').textContent = '3.1%';
  document.getElementById('une-val').textContent = '5.2%';
  document.getElementById('dbt-val').textContent = '60%';
  document.getElementById('gdp-desc').textContent = 'Moderate expansion';
  document.getElementById('inf-desc').textContent = 'Slightly elevated';
  document.getElementById('une-desc').textContent = 'Near natural rate';
  document.getElementById('dbt-desc').textContent = 'Manageable';
  ['gdp-delta','inf-delta','une-delta','dbt-delta'].forEach(id => document.getElementById(id).innerHTML = '');
  document.getElementById('log').innerHTML = '<div class="log-entry"><span class="log-year">2024</span><span class="log-msg">Simulation reset. Ready.</span></div>';
  renderSoc();
  setTimeout(() => {
    sparkline('sp-gdp',[2.8],'#6BCB77');
    sparkline('sp-inf',[3.1],'#FF6B6B');
    sparkline('sp-une',[5.2],'#FFD93D');
    sparkline('sp-dbt',[60],'#4D96FF');
  }, 50);
}

function economyInit() {
  renderSoc();
  setTimeout(function() {
    sparkline('sp-gdp', hist.gdp, '#6BCB77');
    sparkline('sp-inf', hist.inf, '#FF6B6B');
    sparkline('sp-une', hist.une, '#FFD93D');
    sparkline('sp-dbt', hist.dbt, '#4D96FF');
  }, 50);
}
