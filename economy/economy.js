// ══════════════════════════════════════════
//  ECONOMY & DEBT SIMULATOR
//  World Map + Real Historical Data + Reveal
// ══════════════════════════════════════════

// ── REAL DATA ──
let econDB = null;           // full economic_data.json
let selectedISO = null;      // e.g. "USA"
let selectedYear = null;     // e.g. 1980
let realHistory = {};        // {gdp:[], inf:[], une:[], dbt:[], years:[]}
let lockedFirstStep = false; // true while on historical lock
let simYearsElapsed = 0;     // how many steps user has taken

// ── SIM STATE ──
let year = 2024, autoTimer = null, autoRunning = false;
let hist = { gdp:[2.8], inf:[3.1], une:[5.2], dbt:[60] };
let simHist = { gdp:[], inf:[], une:[], dbt:[], years:[] }; // user path for reveal
let soc = { equality:55, trust:60, innovation:65, stability:70, welfare:58, confidence:62 };

// ══════════════════════════════════════════
//  LOAD DATA
// ══════════════════════════════════════════
function loadEconData() {
  logEntry('—', '// LOADING ECONOMIC DATABASE...', 'warn');
  fetch('economy/economic_data.json')
    .then(r => r.json())
    .then(data => {
      econDB = data;
      logEntry('—', '// DATABASE READY — ' + Object.keys(data).length + ' COUNTRIES LOADED', 'good');
      initMap();
    })
    .catch(() => {
      logEntry('—', '// DATA LOAD FAILED — running in manual mode', 'bad');
      initMap(); // still show map, just no data highlighting
    });
}

// ══════════════════════════════════════════
//  WORLD MAP
// ══════════════════════════════════════════

// Minimal Natural Earth SVG paths (simplified world map)
// We load from a CDN-hosted GeoJSON and render it as SVG paths
function initMap() {
  const loading = document.getElementById('map-loading');
  const svg = document.getElementById('world-svg');

  // Load Natural Earth TopoJSON from CDN, convert to SVG paths
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    .then(r => r.json())
    .then(world => {
      if (loading) loading.style.display = 'none';
      renderMapFromTopo(world, svg);
    })
    .catch(() => {
      if (loading) loading.textContent = '// MAP UNAVAILABLE — type a country name to search';
    });
}

function renderMapFromTopo(topo, svg) {
  // Convert topojson to SVG using simple mercator-like projection
  const countries = topo.objects.countries.geometries;
  const arcs = topo.arcs;
  const transform = topo.transform || { scale: [1,1], translate: [0,0] };

  // Build ISO numeric → ISO3 lookup from econDB names
  // topojson countries-110m uses ISO numeric codes as 'id'
  const numericToISO3 = buildNumericLookup();

  const W = 2000, H = 1001;

  countries.forEach(geo => {
    const iso3 = numericToISO3[String(geo.id)] || '';
    const hasData = iso3 && econDB && econDB[iso3] && Object.keys(econDB[iso3].years || {}).length > 0;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = topoToPath(geo, arcs, transform, W, H);
    if (!d) return;

    path.setAttribute('d', d);
    path.setAttribute('data-iso3', iso3);
    path.classList.add(hasData ? 'has-data' : 'no-data');

    if (hasData) {
      path.addEventListener('click', () => selectCountry(iso3, path));
      path.addEventListener('mouseenter', () => {
        if (!path.classList.contains('selected')) {
          path.style.fill = '#00C896';
        }
      });
      path.addEventListener('mouseleave', () => {
        if (!path.classList.contains('selected')) {
          path.style.fill = '';
        }
      });
    }

    svg.appendChild(path);
  });
}

// ISO numeric to ISO3 lookup (UN M49 / ISO 3166)
function buildNumericLookup() {
  // Key subset of the ~250 countries in the Natural Earth data
  return {
    "4":"AFG","8":"ALB","12":"DZA","24":"AGO","32":"ARG","36":"AUS","40":"AUT",
    "50":"BGD","56":"BEL","68":"BOL","76":"BRA","100":"BGR","116":"KHM","120":"CMR",
    "124":"CAN","144":"LKA","152":"CHL","156":"CHN","170":"COL","188":"CRI",
    "191":"HRV","192":"CUB","203":"CZE","204":"BEN","208":"DNK","214":"DOM",
    "218":"ECU","818":"EGY","222":"SLV","231":"ETH","246":"FIN","250":"FRA",
    "266":"GAB","276":"DEU","288":"GHA","300":"GRC","320":"GTM","332":"HTI",
    "340":"HND","348":"HUN","356":"IND","360":"IDN","364":"IRN","368":"IRQ",
    "372":"IRL","376":"ISR","380":"ITA","388":"JAM","392":"JPN","400":"JOR",
    "398":"KAZ","404":"KEN","408":"PRK","410":"KOR","414":"KWT","418":"LAO",
    "422":"LBN","430":"LBR","434":"LBY","458":"MYS","484":"MEX","504":"MAR",
    "508":"MOZ","516":"NAM","524":"NPL","528":"NLD","540":"NCL","554":"NZL",
    "558":"NIC","566":"NGA","578":"NOR","586":"PAK","591":"PAN","600":"PRY",
    "604":"PER","608":"PHL","616":"POL","620":"PRT","630":"PRI","642":"ROU",
    "643":"RUS","646":"RWA","682":"SAU","686":"SEN","694":"SLE","706":"SOM",
    "710":"ZAF","724":"ESP","729":"SDN","752":"SWE","756":"CHE","760":"SYR",
    "762":"TJK","764":"THA","788":"TUN","792":"TUR","800":"UGA","804":"UKR",
    "784":"ARE","826":"GBR","840":"USA","858":"URY","860":"UZB","862":"VEN",
    "704":"VNM","887":"YEM","894":"ZMB","716":"ZWE","450":"MDG","466":"MLI",
    "478":"MRT","440":"LTU","428":"LVA","233":"EST","703":"SVK","705":"SVN",
    "191":"HRV","70":"BIH","807":"MKD","688":"SRB","499":"MNE","8":"ALB",
    "112":"BLR","440":"LTU","372":"IRL","348":"HUN","498":"MDA","051":"ARM",
    "031":"AZE","268":"GEO","795":"TKM","417":"KGZ","762":"TJK","860":"UZB",
    "051":"ARM","031":"AZE","398":"KAZ","116":"KHM","418":"LAO","104":"MMR",
    "608":"PHL","626":"TLS","562":"NER","854":"BFA","148":"TCD","072":"BWA",
    "426":"LSO","748":"SWZ","454":"MWI","834":"TZA","800":"UGA","174":"COM",
    "174":"COM","262":"DJI","232":"ERI","480":"MUS","175":"MYT","638":"REU",
    "540":"NCL","258":"PYF","090":"SLB","242":"FJI","598":"PNG","548":"VUT",
    "776":"TON","882":"WSM","296":"KIR","584":"MHL","583":"FSM","585":"PLW",
    "520":"NRU","798":"TUV","180":"COD","178":"COG","140":"CAF","706":"SOM",
    "064":"BTN","462":"MDV","144":"LKA"
  };
}

function topoToPath(geo, arcs, transform, W, H) {
  // Simple TopoJSON arc decoder + Mercator projection
  const s = transform.scale;
  const t = transform.translate;

  function decodeArc(arcIdx) {
    const reversed = arcIdx < 0;
    const arc = arcs[reversed ? ~arcIdx : arcIdx];
    let x = 0, y = 0;
    const pts = arc.map(([dx, dy]) => {
      x += dx; y += dy;
      const lon = x * s[0] + t[0];
      const lat = y * s[1] + t[1];
      return project(lon, lat, W, H);
    });
    return reversed ? pts.reverse() : pts;
  }

  function ringToD(ring) {
    const pts = ring.flatMap(idx => decodeArc(idx));
    if (pts.length < 2) return '';
    return 'M' + pts.map(([x,y]) => x.toFixed(1)+','+y.toFixed(1)).join('L') + 'Z';
  }

  try {
    if (geo.type === 'Polygon') {
      return geo.arcs.map(ringToD).join(' ');
    } else if (geo.type === 'MultiPolygon') {
      return geo.arcs.map(poly => poly.map(ringToD).join(' ')).join(' ');
    }
  } catch(e) { return ''; }
  return '';
}

function project(lon, lat, W, H) {
  // Simple equirectangular projection
  const x = (lon + 180) / 360 * W;
  const latRad = lat * Math.PI / 180;
  const mercN = Math.log(Math.tan(Math.PI/4 + latRad/2));
  const y = H/2 - (mercN / (Math.PI) * (H/2));
  return [x, Math.max(0, Math.min(H, y))];
}

// ── Map search ──
function mapSearch(q) {
  const box = document.getElementById('map-search-results');
  if (!q || q.length < 2) { box.innerHTML = ''; return; }
  if (!econDB) { box.innerHTML = ''; return; }
  const lower = q.toLowerCase();
  const matches = Object.entries(econDB)
    .filter(([, v]) => v.name.toLowerCase().includes(lower))
    .slice(0, 8);
  box.innerHTML = matches.map(([iso3, v]) =>
    `<div class="map-sr-item" onclick="selectCountryByISO('${iso3}')">${v.name}</div>`
  ).join('');
}

function selectCountryByISO(iso3) {
  document.getElementById('map-search-results').innerHTML = '';
  document.getElementById('map-search').value = '';
  // highlight on map
  document.querySelectorAll('.world-svg path.selected').forEach(p => {
    p.classList.remove('selected');
    p.style.fill = '';
  });
  const path = document.querySelector(`.world-svg path[data-iso3="${iso3}"]`);
  if (path) {
    path.classList.add('selected');
    path.style.fill = '#00C896';
  }
  selectCountry(iso3, path);
}

// ── Country selection ──
function selectCountry(iso3, pathEl) {
  if (!econDB || !econDB[iso3]) return;

  // deselect previous
  document.querySelectorAll('.world-svg path.selected').forEach(p => {
    p.classList.remove('selected');
    p.style.fill = '';
  });
  if (pathEl) { pathEl.classList.add('selected'); pathEl.style.fill = '#00C896'; }

  selectedISO = iso3;
  const country = econDB[iso3];

  // find valid years (at least 2 non-null indicators)
  const validYears = Object.entries(country.years)
    .filter(([, v]) => Object.values(v).filter(x => x !== null).length >= 2)
    .map(([y]) => parseInt(y))
    .sort((a,b) => a-b);

  if (validYears.length === 0) return;

  const minY = validYears[0];
  const maxY = Math.min(validYears[validYears.length-1], 2022);

  const slider = document.getElementById('panel-year-slider');
  slider.min = minY;
  slider.max = maxY;
  slider.value = Math.min(1990, maxY);

  // flag emoji from iso2
  const iso2 = country.iso2 || '';
  const flag = iso2 ? iso2ToFlag(iso2) : '';
  document.getElementById('panel-flag').textContent = flag;
  document.getElementById('panel-name').textContent = country.name;
  document.getElementById('panel-iso').textContent = iso3;

  document.getElementById('country-panel').classList.remove('hidden');
  panelYearChange(slider.value);
}

function iso2ToFlag(iso2) {
  if (!iso2 || iso2.length !== 2) return '';
  const offset = 127397;
  return String.fromCodePoint(...iso2.toUpperCase().split('').map(c => c.charCodeAt(0) + offset));
}

function panelYearChange(yr) {
  selectedYear = parseInt(yr);
  document.getElementById('panel-year-display').textContent = yr;
  if (!econDB || !selectedISO) return;
  const yData = (econDB[selectedISO].years || {})[String(yr)] || {};
  const fmt = (v, suffix) => v !== null && v !== undefined ? (+v).toFixed(1) + suffix : '—';
  document.getElementById('pp-gdp').textContent = fmt(yData.gdp_growth, '%');
  document.getElementById('pp-inf').textContent = fmt(yData.inflation, '%');
  document.getElementById('pp-une').textContent = fmt(yData.unemployment, '%');
  document.getElementById('pp-dbt').textContent = fmt(yData.debt_gdp, '%');
}

function closePanel() {
  document.getElementById('country-panel').classList.add('hidden');
  document.querySelectorAll('.world-svg path.selected').forEach(p => {
    p.classList.remove('selected');
    p.style.fill = '';
  });
  selectedISO = null;
}

// ── Begin simulation ──
function beginSimulation() {
  if (!selectedISO || !selectedYear || !econDB) return;

  const country = econDB[selectedISO];
  const yData = (country.years || {})[String(selectedYear)] || {};

  // store real history for reveal
  const startYr = selectedYear;
  realHistory = { gdp:[], inf:[], une:[], dbt:[], years:[] };
  for (let y = startYr; y <= Math.min(startYr + 40, 2024); y++) {
    const d = (country.years || {})[String(y)] || {};
    realHistory.years.push(y);
    realHistory.gdp.push(d.gdp_growth !== undefined ? d.gdp_growth : null);
    realHistory.inf.push(d.inflation  !== undefined ? d.inflation  : null);
    realHistory.une.push(d.unemployment !== undefined ? d.unemployment : null);
    realHistory.dbt.push(d.debt_gdp !== undefined ? d.debt_gdp : null);
  }

  // switch screens
  document.getElementById('eco-map-screen').classList.add('hidden');
  document.getElementById('eco-sim-screen').classList.remove('hidden');

  // set title
  document.getElementById('sim-country-title').innerHTML =
    `${country.name}<br><span>${selectedYear}</span>`;

  // initialise sim with real values
  const gdp0 = val(yData.gdp_growth, 2.8);
  const inf0 = val(yData.inflation,  3.1);
  const une0 = val(yData.unemployment, 5.2);
  const dbt0 = val(yData.debt_gdp,   60);
  const spe0 = val(yData.govt_spending, 20);
  const tax0 = val(yData.tax_rate,   25);

  year = selectedYear;
  hist = { gdp:[gdp0], inf:[inf0], une:[une0], dbt:[dbt0] };
  simHist = { gdp:[gdp0], inf:[inf0], une:[une0], dbt:[dbt0], years:[year] };
  simYearsElapsed = 0;
  lockedFirstStep = true;

  soc = { equality:55, trust:60, innovation:65, stability:70, welfare:58, confidence:62 };

  // set sliders to real values
  setSlider('spend', spe0, 10, 60, '%');
  setSlider('tax',   tax0,  5, 65, '%');
  setSlider('rate',  4.5,   0, 20, '%');
  setSlider('money', 3,    -5, 25, '%');
  setSlider('debt',  dbt0,  0, 250, '%');

  // lock sliders
  document.getElementById('sim-controls').classList.add('sliders-locked');

  // show REAL badges
  ['gdp','inf','une','dbt'].forEach(k => {
    document.getElementById('badge-' + k).classList.remove('hidden');
  });

  // lock banner
  document.getElementById('lock-banner').classList.remove('hidden');
  document.getElementById('lock-banner-text').textContent =
    `// HISTORICAL DATA — ${selectedYear} ${selectedISO} — STEP FORWARD TO TAKE CONTROL`;

  // update cards with real values
  document.getElementById('yr').textContent = year;
  document.getElementById('gdp-val').textContent = fmtGDP(gdp0);
  document.getElementById('inf-val').textContent = inf0.toFixed(1) + '%';
  document.getElementById('une-val').textContent = une0.toFixed(1) + '%';
  document.getElementById('dbt-val').textContent = Math.round(dbt0) + '%';
  document.getElementById('gdp-desc').textContent = descGDP(gdp0);
  document.getElementById('inf-desc').textContent = descInf(inf0);
  document.getElementById('une-desc').textContent = descUne(une0);
  document.getElementById('dbt-desc').textContent = descDbt(dbt0);
  ['gdp-delta','inf-delta','une-delta','dbt-delta'].forEach(id =>
    document.getElementById(id).innerHTML = '');

  document.getElementById('sim-status-text').textContent =
    `${selectedISO} ${selectedYear} — LOCKED`;

  // hide reveal btn
  document.getElementById('reveal-btn').classList.add('hidden');

  // clear log
  document.getElementById('log').innerHTML = '';
  logEntry(year, `Loaded real ${country.name} data. Step forward to begin your tenure.`, 'good');

  renderSoc();
  setTimeout(() => {
    sparkline('sp-gdp', hist.gdp, '#00C896');
    sparkline('sp-inf', hist.inf, '#FF4D4F');
    sparkline('sp-une', hist.une, '#FFB800');
    sparkline('sp-dbt', hist.dbt, '#818CF8');
  }, 50);
}

function val(v, fallback) {
  return (v !== null && v !== undefined) ? parseFloat(v) : fallback;
}

function setSlider(id, v, min, max, suffix) {
  const el = document.getElementById(id);
  const display = document.getElementById('v-' + id);
  el.min = min; el.max = max;
  el.value = Math.max(min, Math.min(max, v));
  display.textContent = (+el.value).toFixed(id === 'rate' ? 1 : 0) + suffix;
}

function backToMap() {
  clearInterval(autoTimer); autoRunning = false;
  document.getElementById('eco-sim-screen').classList.add('hidden');
  document.getElementById('eco-map-screen').classList.remove('hidden');
  document.getElementById('reveal-btn').classList.add('hidden');
}

// ══════════════════════════════════════════
//  SIMULATOR ENGINE (original, preserved)
// ══════════════════════════════════════════

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
  let gdp = 2.5 + (s.spend-20)*0.05 + (s.money-3)*0.08 - (s.rate-4)*0.18
            - (s.tax-25)*0.04 - Math.max(0,s.debt-80)*0.01 + (Math.random()-0.5)*0.6;
  gdp = clamp(gdp, -6, 9);

  let inf = 1.5 + (s.money-3)*0.22 + (s.spend-20)*0.04 - (s.rate-4)*0.14
            + (Math.random()-0.5)*0.5;
  inf = clamp(inf, -1, 18);

  let une = 4.5 - (s.spend-20)*0.04 + (s.rate-4)*0.12 + (s.tax-25)*0.05
            + (Math.random()-0.5)*0.4;
  une = clamp(une, 1, 22);

  let deficit  = (s.spend/100) - (s.tax/100*0.9);
  let interest = (s.debt * s.rate) / 1000;
  let dbt = s.debt + deficit*100 - gdp*0.3 + interest + (Math.random()-0.5)*1;
  dbt = clamp(dbt, 0, 300);
  document.getElementById('debt').value = dbt;
  document.getElementById('v-debt').textContent = Math.round(dbt) + '%';

  return { gdp, inf, une, dbt };
}

function socColor(v) {
  if (v > 70) return '#00C896';
  if (v > 45) return '#FFB800';
  return '#FF4D4F';
}

function renderSoc() {
  const labels = { equality:'Equality', trust:'Trust', innovation:'Innovation',
                   stability:'Stability', welfare:'Welfare', confidence:'Confidence' };
  document.getElementById('soc-grid').innerHTML = Object.entries(soc)
    .map(([k,v]) => `
    <div class="soc-item">
      <div class="soc-item-name">${labels[k]}</div>
      <div class="soc-item-val" style="color:${socColor(v)}">${Math.round(v)}</div>
      <div class="soc-bar-bg"><div class="soc-bar-fill"
        style="width:${Math.round(v)}%;background:${socColor(v)}"></div></div>
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

function fmtGDP(v) { return (v>0?'+':'') + v.toFixed(1) + '%'; }
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
  if (!log) return;
  const d = document.createElement('div');
  d.className = 'log-entry ' + type;
  d.innerHTML = `<span class="log-year">${y}</span><span class="log-msg">${msg}</span>`;
  log.prepend(d);
  while (log.children.length > 25) log.removeChild(log.lastChild);
}

function stepYear() {
  // ── UNLOCK on first step ──
  if (lockedFirstStep) {
    lockedFirstStep = false;
    document.getElementById('sim-controls').classList.remove('sliders-locked');
    ['gdp','inf','une','dbt'].forEach(k =>
      document.getElementById('badge-' + k).classList.add('hidden'));
    document.getElementById('lock-banner').classList.add('hidden');
    document.getElementById('sim-status-text').textContent =
      `${selectedISO || ''} — IN PROGRESS`;
    logEntry(year + 1, `You assumed office. Policy levers unlocked.`, 'good');
  }

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

  simHist.gdp.push(r.gdp); simHist.inf.push(r.inf);
  simHist.une.push(r.une); simHist.dbt.push(r.dbt);
  simHist.years.push(year);

  simYearsElapsed++;

  document.getElementById('gdp-val').textContent = fmtGDP(r.gdp);
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

  sparkline('sp-gdp', hist.gdp, '#00C896');
  sparkline('sp-inf', hist.inf, '#FF4D4F');
  sparkline('sp-une', hist.une, '#FFB800');
  sparkline('sp-dbt', hist.dbt, '#818CF8');

  updateSociety(r);

  // show reveal button after 5 steps
  if (simYearsElapsed === 5 && selectedISO) {
    document.getElementById('reveal-btn').classList.remove('hidden');
  }

  // events
  if (r.inf > 9)        logEntry(year, 'Inflation out of control — purchasing power collapsing!', 'bad');
  else if (r.gdp < -3)  logEntry(year, 'Severe recession. Unemployment surging.', 'bad');
  else if (r.dbt > 160) logEntry(year, 'Debt crisis territory — credit markets tightening.', 'bad');
  else if (r.gdp > 5 && r.inf < 4 && r.une < 5)
                        logEntry(year, 'Goldilocks! Strong growth, low inflation, full employment.', 'good');
  else if (r.une < 3)   logEntry(year, 'Labour market overheating — wage inflation building.', 'warn');
  else if (r.inf < 0)   logEntry(year, 'Deflation detected — consumers delaying purchases.', 'warn');
  else {
    const msgs = [
      `Rate ${s.rate}% — ${s.rate>7?'restrictive':'accommodative'} monetary stance.`,
      `Govt spending at ${s.spend}% of GDP.`,
      `Tax revenue ${s.tax<20?'low — deficit widening':'steady'}.`,
      `Debt service cost rising with higher rates.`,
      `Central bank monitoring inflation trends.`
    ];
    logEntry(year, msgs[Math.floor(Math.random()*msgs.length)]);
  }
}

function autoRun() {
  if (autoRunning) {
    clearInterval(autoTimer); autoRunning = false;
    document.getElementById('auto-btn').textContent = '\u23E9 Auto';
    document.getElementById('auto-btn').classList.remove('auto-on');
  } else {
    autoRunning = true;
    document.getElementById('auto-btn').textContent = '\u23F9 Stop';
    document.getElementById('auto-btn').classList.add('auto-on');
    autoTimer = setInterval(stepYear, 850);
  }
}

function resetSim() {
  clearInterval(autoTimer); autoRunning = false;
  document.getElementById('auto-btn').textContent = '\u23E9 Auto';
  document.getElementById('auto-btn').classList.remove('auto-on');

  if (selectedISO && selectedYear) {
    beginSimulation(); // re-init with same country/year
    return;
  }

  // fallback: pure reset
  year = 2024; document.getElementById('yr').textContent = year;
  hist = { gdp:[2.8], inf:[3.1], une:[5.2], dbt:[60] };
  simHist = { gdp:[], inf:[], une:[], dbt:[], years:[] };
  simYearsElapsed = 0;
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
  ['gdp-delta','inf-delta','une-delta','dbt-delta'].forEach(id =>
    document.getElementById(id).innerHTML = '');
  document.getElementById('log').innerHTML =
    '<div class="log-entry"><span class="log-year">2024</span><span class="log-msg">Simulation reset. Ready.</span></div>';
  document.getElementById('reveal-btn').classList.add('hidden');
  renderSoc();
  setTimeout(() => {
    sparkline('sp-gdp',[2.8],'#00C896');
    sparkline('sp-inf',[3.1],'#FF4D4F');
    sparkline('sp-une',[5.2],'#FFB800');
    sparkline('sp-dbt',[60],'#818CF8');
  }, 50);
}

// ══════════════════════════════════════════
//  REVEAL MODAL
// ══════════════════════════════════════════
function openRevealModal() {
  const modal = document.getElementById('reveal-modal');
  modal.classList.remove('hidden');

  const endYear = year;
  const startY = selectedYear || 2024;
  const country = (econDB && selectedISO) ? econDB[selectedISO].name : '';
  document.getElementById('reveal-title').textContent =
    `HOW DID YOU DO? // ${selectedISO} ${startY}–${endYear}`;

  // Build x-axis years from simHist
  const simYears = simHist.years;
  if (!simYears.length) return;

  // Match real data to sim years
  function getRealSeries(key) {
    return simYears.map(y => {
      const idx = realHistory.years.indexOf(y);
      return idx >= 0 ? realHistory[key][idx] : null;
    });
  }

  drawRevealChart('rc-gdp', simYears, simHist.gdp, getRealSeries('gdp'));
  drawRevealChart('rc-inf', simYears, simHist.inf, getRealSeries('inf'));
  drawRevealChart('rc-une', simYears, simHist.une, getRealSeries('une'));
  drawRevealChart('rc-dbt', simYears, simHist.dbt, getRealSeries('dbt'));
}

function closeRevealModal() {
  document.getElementById('reveal-modal').classList.add('hidden');
}

function drawRevealChart(canvasId, years, simData, realData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.offsetWidth || 360;
  const cssH = 140;
  canvas.width  = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { t:8, r:8, b:24, l:36 };
  const W = cssW - pad.l - pad.r;
  const H = cssH - pad.t - pad.b;
  const n = years.length;
  if (n < 2) return;

  // combined range
  const allVals = [...simData, ...realData.filter(v => v !== null)];
  const mn = Math.min(...allVals) - 1;
  const mx = Math.max(...allVals) + 1;
  const rng = mx - mn || 1;

  const xp = i => pad.l + (i / (n-1)) * W;
  const yp = v => pad.t + H - ((v - mn) / rng) * H;

  // grid
  ctx.strokeStyle = 'rgba(0,200,150,0.06)';
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const gy = pad.t + (g/4) * H;
    ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(pad.l + W, gy); ctx.stroke();
  }

  // x-axis labels (every ~5 years)
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = '9px Courier New';
  ctx.textAlign = 'center';
  years.forEach((y, i) => {
    if (i === 0 || i === n-1 || y % 5 === 0) {
      ctx.fillText(y, xp(i), cssH - 6);
    }
  });

  // real line (dashed green)
  const realPts = realData.map((v, i) => v !== null ? {x: xp(i), y: yp(v)} : null).filter(Boolean);
  if (realPts.length >= 2) {
    ctx.beginPath();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#00C896';
    ctx.lineWidth = 2;
    ctx.moveTo(realPts[0].x, realPts[0].y);
    realPts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // sim line (solid amber)
  ctx.beginPath();
  ctx.setLineDash([]);
  ctx.strokeStyle = '#FFB800';
  ctx.lineWidth = 2;
  simData.forEach((v, i) => {
    i === 0 ? ctx.moveTo(xp(i), yp(v)) : ctx.lineTo(xp(i), yp(v));
  });
  ctx.stroke();
}

// ══════════════════════════════════════════
//  economyInit — called by main.js on tab load
// ══════════════════════════════════════════
function economyInit() {
  // If first load, kick off data fetch + map
  if (!econDB) {
    renderSoc();
    loadEconData();
  } else {
    // Re-entering tab: just redraw sparklines if on sim screen
    if (!document.getElementById('eco-sim-screen').classList.contains('hidden')) {
      renderSoc();
      setTimeout(() => {
        sparkline('sp-gdp', hist.gdp, '#00C896');
        sparkline('sp-inf', hist.inf, '#FF4D4F');
        sparkline('sp-une', hist.une, '#FFB800');
        sparkline('sp-dbt', hist.dbt, '#818CF8');
      }, 50);
    }
  }
}
