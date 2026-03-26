// ══════════════════════════════════════════
//  ECONOMY & DEBT SIMULATOR v3
// ══════════════════════════════════════════

const TAB_CONFIG = {
  economic:    { accent:'#00C896', indicators:[
    {key:'gdp_growth',    label:'GDP GROWTH',    suffix:'%',   dp:1, goodUp:true },
    {key:'inflation',     label:'INFLATION',     suffix:'%',   dp:1, goodUp:false},
    {key:'unemployment',  label:'UNEMPLOYMENT',  suffix:'%',   dp:1, goodUp:false},
    {key:'debt_gdp',      label:'DEBT / GDP',    suffix:'%',   dp:0, goodUp:false},
    {key:'trade_gdp',     label:'TRADE / GDP',   suffix:'%',   dp:1, goodUp:true },
    {key:'govt_spending', label:'GOVT SPENDING', suffix:'%',   dp:1, goodUp:null },
    {key:'tax_rate',      label:'TAX RATE',      suffix:'%',   dp:1, goodUp:null },
    {key:'gdp_per_capita',label:'GDP/CAPITA',    suffix:'',    dp:0, goodUp:true, prefix:'$'},
  ]},
  population:  { accent:'#4fc3f7', indicators:[
    {key:'population',       label:'POPULATION',    suffix:'',  dp:0, goodUp:null},
    {key:'pop_growth',       label:'POP GROWTH',    suffix:'%', dp:2, goodUp:null},
    {key:'urbanization',     label:'URBANIZATION',  suffix:'%', dp:1, goodUp:true},
    {key:'dependency_ratio', label:'DEPENDENCY',    suffix:'%', dp:1, goodUp:false},
    {key:'net_migration',    label:'NET MIGRATION', suffix:'',  dp:0, goodUp:null},
  ]},
  health:      { accent:'#ef9a9a', indicators:[
    {key:'life_expectancy',    label:'LIFE EXPECT',  suffix:' yrs', dp:1, goodUp:true },
    {key:'child_mortality',    label:'CHILD MORT',   suffix:'',     dp:1, goodUp:false},
    {key:'hospital_beds',      label:'HOSP BEDS',    suffix:'/1k',  dp:1, goodUp:true },
    {key:'physicians_per1000', label:'PHYSICIANS',   suffix:'/1k',  dp:2, goodUp:true },
    {key:'health_expenditure', label:'HEALTH SPEND', suffix:'%GDP', dp:1, goodUp:true },
  ]},
  education:   { accent:'#fff176', indicators:[
    {key:'literacy_rate',         label:'LITERACY',   suffix:'%',    dp:1, goodUp:true},
    {key:'primary_enrollment',    label:'PRIMARY',    suffix:'%',    dp:1, goodUp:true},
    {key:'secondary_enrollment',  label:'SECONDARY',  suffix:'%',    dp:1, goodUp:true},
    {key:'tertiary_enrollment',   label:'TERTIARY',   suffix:'%',    dp:1, goodUp:true},
    {key:'education_expenditure', label:'EDU SPEND',  suffix:'%GDP', dp:1, goodUp:true},
  ]},
  environment: { accent:'#a5d6a7', indicators:[
    {key:'co2_per_capita',        label:'CO\u2082/CAPITA',  suffix:' t',     dp:1, goodUp:false},
    {key:'forest_area',           label:'FOREST AREA', suffix:'%',      dp:1, goodUp:true },
    {key:'energy_use_per_capita', label:'ENERGY USE',  suffix:' kg',    dp:0, goodUp:null },
    {key:'freshwater_use',        label:'FRESHWATER',  suffix:'%',      dp:1, goodUp:false},
    {key:'pm25_air_pollution',    label:'PM2.5',       suffix:'\u03bcg', dp:1, goodUp:false},
  ]},
  governance:  { accent:'#ce93d8', indicators:[
    {key:'govt_transparency',     label:'TRANSPARENCY', suffix:'', dp:2, goodUp:true },
    {key:'govt_effectiveness',    label:'EFFECT',       suffix:'', dp:2, goodUp:true },
    {key:'control_of_corruption', label:'CORRUPTION',   suffix:'', dp:2, goodUp:true },
    {key:'rule_of_law',           label:'RULE OF LAW',  suffix:'', dp:2, goodUp:true },
    {key:'gini_index',            label:'GINI INDEX',   suffix:'', dp:1, goodUp:false},
  ]},
};

const G20_PTS = {
  USA:{label:'USA',cx:-100,cy:38},  CAN:{label:'CAN',cx:-96,cy:58},
  MEX:{label:'MEX',cx:-102,cy:24}, BRA:{label:'BRA',cx:-52,cy:-12},
  ARG:{label:'ARG',cx:-65,cy:-35}, GBR:{label:'UK',cx:-2,cy:54},
  FRA:{label:'FRA',cx:2,cy:46},    DEU:{label:'DEU',cx:10,cy:51},
  ITA:{label:'ITA',cx:12,cy:43},   RUS:{label:'RUS',cx:95,cy:62},
  CHN:{label:'CHN',cx:104,cy:35},  IND:{label:'IND',cx:78,cy:22},
  JPN:{label:'JPN',cx:138,cy:37},  KOR:{label:'KOR',cx:128,cy:37},
  AUS:{label:'AUS',cx:134,cy:-26}, SAU:{label:'SAU',cx:45,cy:24},
  TUR:{label:'TUR',cx:35,cy:39},   ZAF:{label:'ZAF',cx:25,cy:-30},
  IDN:{label:'IDN',cx:117,cy:-3},
};

// ── STATE ──
let econDB = null, selectedISO = null, selectedYear = null;
let realHistory = {};
let simHist = {gdp:[],inf:[],une:[],dbt:[],years:[]};
let simYearsElapsed = 0, simMode = 'history', interferePending = false;
let deviationHistory = [], activeTab = 'economic', groupSparkData = {};
let year = 2024, autoTimer = null, autoRunning = false;
let hist = {gdp:[2.8],inf:[3.1],une:[5.2],dbt:[60]};
let soc = {equality:55,trust:60,innovation:65,stability:70,welfare:58,confidence:62};
let revealCharts = [];

// ── DATA LOADING ──
function loadEconData() {
  logEntry('—','// LOADING ECONOMIC DATABASE...','warn');
  fetch('economy/economic_data.json')
    .then(r=>r.json())
    .then(data=>{
      econDB = data;
      logEntry('—','// DATABASE READY — '+Object.keys(data).length+' COUNTRIES','good');
      loadD3ThenMap();
    })
    .catch(()=>{ logEntry('—','// DATA LOAD FAILED','bad'); loadD3ThenMap(); });
}

function loadScript(src,cb){
  if(document.querySelector('script[src="'+src+'"]')){cb();return;}
  const s=document.createElement('script');
  s.src=src; s.onload=cb; s.onerror=cb;
  document.head.appendChild(s);
}

function loadD3ThenMap(){
  loadScript('https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js',()=>{
    loadScript('https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js',initMap);
  });
}

// ══════════════════════════════════════════
//  D3 WORLD MAP
// ══════════════════════════════════════════
function initMap(){
  const loading=document.getElementById('map-loading');
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    .then(r=>r.json())
    .then(world=>{ if(loading)loading.style.display='none'; renderD3Map(world); })
    .catch(()=>{ if(loading)loading.textContent='// MAP UNAVAILABLE — use search'; });
}

function renderD3Map(world){
  const svgEl=document.getElementById('world-svg');
  const cont=document.getElementById('map-container');
  if(!svgEl)return;
  const W=cont?Math.max(600,cont.offsetWidth-80):1000;
  const H=Math.round(W*0.5);
  svgEl.setAttribute('viewBox','0 0 '+W+' '+H);

  if(typeof d3==='undefined'||typeof topojson==='undefined'){
    // fallback to built-in renderer
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r=>r.json()).then(w=>renderMapFallback(w,svgEl));
    return;
  }

  const svg=d3.select('#world-svg');
  svg.selectAll('*').remove();
  const proj=d3.geoNaturalEarth1().fitSize([W,H],{type:'Sphere'});
  const path=d3.geoPath(proj);

  // Ocean
  svg.append('rect').attr('width',W).attr('height',H).attr('fill','#1a3a5c');
  // Graticule
  svg.append('path').datum(d3.geoGraticule()())
    .attr('d',path).attr('fill','none')
    .attr('stroke','rgba(255,255,255,0.04)').attr('stroke-width',0.6);

  const n2i=buildNumericLookup();
  const countries=topojson.feature(world,world.objects.countries);
  const tip=document.getElementById('map-tooltip');

  svg.selectAll('path.country')
    .data(countries.features).enter().append('path')
    .attr('class',d=>{ const i=n2i[String(d.id)]||''; return 'country '+(i&&econDB&&econDB[i]?'has-data':'no-data'); })
    .attr('d',path)
    .attr('data-iso3',d=>n2i[String(d.id)]||'')
    .attr('fill',d=>{ const i=n2i[String(d.id)]||''; return i&&econDB&&econDB[i]?'#2d5a3d':'#1e3a2a'; })
    .attr('stroke','#0f2218').attr('stroke-width',0.5)
    .on('mousemove',function(ev,d){
      const i=n2i[String(d.id)]||'';
      if(!i||!econDB||!econDB[i])return;
      if(!this.classList.contains('selected')) d3.select(this).attr('fill','#4a8c5c');
      if(tip){
        const r=svgEl.getBoundingClientRect();
        let tx=ev.clientX-r.left+14, ty=ev.clientY-r.top-10;
        if(tx+200>r.width) tx-=220;
        tip.textContent=econDB[i].name+' — Click to simulate';
        tip.style.left=tx+'px'; tip.style.top=ty+'px';
        tip.classList.add('visible');
      }
    })
    .on('mouseleave',function(ev,d){
      const i=n2i[String(d.id)]||'';
      if(!this.classList.contains('selected'))
        d3.select(this).attr('fill',i&&econDB&&econDB[i]?'#2d5a3d':'#1e3a2a');
      if(tip) tip.classList.remove('visible');
    })
    .on('click',function(ev,d){
      const i=n2i[String(d.id)]||'';
      if(i&&econDB&&econDB[i]) selectCountry(i,this);
    });

  // J&K overlay (India's claim)
  fetch('economy/india_jk_patch.geojson').then(r=>r.json()).then(jk=>{
    svg.selectAll('path.jk-patch').data(jk.features).enter().append('path')
      .attr('class','jk-patch').attr('d',path)
      .attr('fill','#2d5a3d').attr('stroke','#0f2218').attr('stroke-width',0.3)
      .attr('pointer-events','none');
    // J&K shown per India's official claim
  }).catch(()=>{});

  // G20 labels
  Object.entries(G20_PTS).forEach(([iso3,info])=>{
    const pt=proj([info.cx,info.cy]); if(!pt)return;
    svg.append('text').attr('x',pt[0]).attr('y',pt[1])
      .attr('text-anchor','middle')
      .attr('font-family',"'Courier New',monospace")
      .attr('font-size',Math.max(7,W/150)+'px')
      .attr('fill','rgba(255,255,255,0.72)')
      .attr('pointer-events','none').text(info.label);
  });
}

function mapSearch(q){
  const box=document.getElementById('map-search-results');
  if(!q||q.length<2||!econDB){box.innerHTML='';return;}
  const low=q.toLowerCase();
  const m=Object.entries(econDB).filter(([,v])=>v.name.toLowerCase().includes(low)).slice(0,8);
  box.innerHTML=m.map(([iso3,v])=>'<div class="map-sr-item" onclick="selectCountryByISO(\''+iso3+'\')">'+v.name+'</div>').join('');
}

function selectCountryByISO(iso3){
  document.getElementById('map-search-results').innerHTML='';
  document.getElementById('map-search').value='';
  document.querySelectorAll('#world-svg .country.selected').forEach(p=>{
    p.classList.remove('selected');
    const pi=p.getAttribute('data-iso3')||'';
    if(typeof d3!=='undefined') d3.select(p).attr('fill',pi&&econDB&&econDB[pi]?'#2d5a3d':'#1e3a2a');
  });
  const el=document.querySelector('#world-svg [data-iso3="'+iso3+'"]');
  if(el){ el.classList.add('selected'); if(typeof d3!=='undefined') d3.select(el).attr('fill','#6aaa7a'); }
  selectCountry(iso3,el);
}

function selectCountry(iso3,pathEl){
  if(!econDB||!econDB[iso3])return;
  document.querySelectorAll('#world-svg .country.selected').forEach(p=>{
    p.classList.remove('selected');
    const pi=p.getAttribute('data-iso3')||'';
    if(typeof d3!=='undefined') d3.select(p).attr('fill',pi&&econDB&&econDB[pi]?'#2d5a3d':'#1e3a2a');
  });
  if(pathEl){ pathEl.classList.add('selected'); if(typeof d3!=='undefined') d3.select(pathEl).attr('fill','#6aaa7a'); }

  selectedISO=iso3;
  const c=econDB[iso3];
  const valid=Object.entries(c.years||{})
    .filter(([,v])=>{ const e=v.economic||v; return Object.values(e).filter(x=>x!==null).length>=2; })
    .map(([y])=>parseInt(y)).sort((a,b)=>a-b);
  if(!valid.length)return;

  const sl=document.getElementById('panel-year-slider');
  sl.min=valid[0]; sl.max=Math.min(valid[valid.length-1],2022);
  sl.value=Math.min(1990,sl.max);

  const iso2=c.iso2||'';
  document.getElementById('panel-flag').textContent=iso2?iso2ToFlag(iso2):'';
  document.getElementById('panel-name').textContent=c.name;
  document.getElementById('panel-iso').textContent=iso3;
  document.getElementById('country-panel').classList.remove('hidden');
  panelYearChange(sl.value);
}

function iso2ToFlag(iso2){
  if(!iso2||iso2.length!==2)return'';
  return String.fromCodePoint(...iso2.toUpperCase().split('').map(c=>c.charCodeAt(0)+127397));
}

function panelYearChange(yr){
  selectedYear=parseInt(yr);
  document.getElementById('panel-year-display').textContent=yr;
  if(!econDB||!selectedISO)return;
  const yData=(econDB[selectedISO].years||{})[String(yr)]||{};
  const fmt=(v,s)=>(v!==null&&v!==undefined)?(+v).toFixed(1)+s:'—';
  document.getElementById('pp-gdp').textContent=fmt(gi(yData,'economic','gdp_growth'),'%');
  document.getElementById('pp-inf').textContent=fmt(gi(yData,'economic','inflation'),'%');
  document.getElementById('pp-une').textContent=fmt(gi(yData,'economic','unemployment'),'%');
  document.getElementById('pp-dbt').textContent=fmt(gi(yData,'economic','debt_gdp'),'%');
}

function closePanel(){
  document.getElementById('country-panel').classList.add('hidden');
  document.querySelectorAll('#world-svg .country.selected').forEach(p=>{
    p.classList.remove('selected');
    const pi=p.getAttribute('data-iso3')||'';
    if(typeof d3!=='undefined') d3.select(p).attr('fill',pi&&econDB&&econDB[pi]?'#2d5a3d':'#1e3a2a');
  });
  selectedISO=null;
}

// backward-compat: supports both old flat {gdp_growth:x} and new grouped {economic:{gdp_growth:x}}
function gi(yData,group,key){
  if(!yData)return null;
  if(yData[group]&&yData[group][key]!==undefined)return yData[group][key];
  if(yData[key]!==undefined)return yData[key];
  return null;
}
function fv(v,fb){ return (v!==null&&v!==undefined)?parseFloat(v):fb; }

// ══════════════════════════════════════════
//  APPEND A — SIMULATION SETUP
// ══════════════════════════════════════════

function beginSimulation(){
  if(!selectedISO||!selectedYear)return;
  const c=econDB[selectedISO];
  document.getElementById('country-panel').classList.add('hidden');
  document.getElementById('eco-map-screen').classList.add('hidden');
  document.getElementById('eco-sim-screen').classList.remove('hidden');

  // Top bar
  const iso2=c.iso2||'';
  document.getElementById('topbar-flag').textContent=iso2?iso2ToFlag(iso2):'';
  document.getElementById('topbar-country').textContent=c.name.toUpperCase();
  document.getElementById('topbar-year').textContent=selectedYear;
  document.getElementById('yr').textContent=selectedYear;

  year=selectedYear;
  simMode='history'; simYearsElapsed=0; interferePending=false;
  deviationHistory=[]; groupSparkData={};

  buildRealHistory();
  seedState();
  initAllTabPanels();
  updateAllIndicatorCards();
  renderSoc();
  logEntry('—','// SIMULATION STARTED: '+c.name+' FROM '+year,'good');
  document.getElementById('topbar-mode').textContent='HISTORY MODE';
  document.getElementById('btn-history').classList.add('active-mode');
  document.getElementById('btn-interfere').classList.remove('active-mode','apply-mode');
}

function buildRealHistory(){
  realHistory={years:[]};
  Object.keys(TAB_CONFIG).forEach(g=>{ realHistory[g]={}; TAB_CONFIG[g].indicators.forEach(ind=>{ realHistory[g][ind.key]=[]; }); });
  const yrs=Object.keys((econDB[selectedISO]||{}).years||{}).map(Number).sort((a,b)=>a-b);
  yrs.forEach(yr=>{
    const yData=(econDB[selectedISO].years||{})[String(yr)]||{};
    realHistory.years.push(yr);
    Object.keys(TAB_CONFIG).forEach(g=>{
      TAB_CONFIG[g].indicators.forEach(ind=>{
        realHistory[g][ind.key].push(gi(yData,g,ind.key));
      });
    });
  });
}

function seedState(){
  // Seed sliders + hist from real data at startYear
  const yData=(econDB[selectedISO].years||{})[String(year)]||{};
  const e=g=>gi(yData,'economic',g);
  setSlider('rate',   fv(e('gdp_growth'),4.5));
  setSlider('money',  3);
  setSlider('spend',  fv(e('govt_spending'),20));
  setSlider('tax',    fv(e('tax_rate'),25));
  setSlider('trade',  fv(e('trade_gdp'),40));
  setSlider('debt',   fv(e('debt_gdp'),60));
  hist={
    gdp:[fv(e('gdp_growth'),2.8)],
    inf:[fv(e('inflation'),3.1)],
    une:[fv(e('unemployment'),5.2)],
    dbt:[fv(e('debt_gdp'),60)]
  };
  simHist={gdp:[],inf:[],une:[],dbt:[],years:[]};
  // Seed groupSparkData from real history up to startYear
  Object.keys(TAB_CONFIG).forEach(g=>{
    TAB_CONFIG[g].indicators.forEach(ind=>{
      const key=g+'.'+ind.key;
      groupSparkData[key]=[];
      realHistory.years.forEach((yr,i)=>{
        if(yr<=year){
          const v=realHistory[g][ind.key][i];
          if(v!==null&&v!==undefined) groupSparkData[key].push(parseFloat(v));
        }
      });
    });
  });
}

function setSlider(id,val){
  const el=document.getElementById(id); if(!el)return;
  el.value=val;
  const disp=document.getElementById('v-'+id);
  if(disp) disp.textContent=parseFloat(val).toFixed(1)+'%';
}

function backToMap(){
  document.getElementById('eco-sim-screen').classList.add('hidden');
  document.getElementById('eco-map-screen').classList.remove('hidden');
  if(autoRunning){ clearInterval(autoTimer); autoRunning=false; document.getElementById('auto-btn').textContent='⏩ AUTO'; }
}

// ══════════════════════════════════════════
//  APPEND B — TAB PANELS + INDICATOR CARDS
// ══════════════════════════════════════════

function switchTab(name){
  activeTab=name;
  document.querySelectorAll('.itab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('hidden',p.id!=='tab-'+name));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='tab-'+name));
}

function initAllTabPanels(){
  Object.entries(TAB_CONFIG).forEach(([group,cfg])=>{
    const panel=document.getElementById('tab-'+group); if(!panel)return;
    panel.innerHTML='<div class="ind-cards-grid">'+
      cfg.indicators.map(ind=>`
        <div class="ind-card" id="ic-${group}-${ind.key}">
          <div class="ind-card-label">${ind.label}</div>
          <div class="ind-card-val" id="icv-${group}-${ind.key}" style="color:${cfg.accent}">—</div>
          <canvas class="ind-spark" id="ics-${group}-${ind.key}" width="120" height="36"></canvas>
          <span class="ind-badge ind-badge-na" id="icb-${group}-${ind.key}">—</span>
        </div>`).join('')+
    '</div>';
  });
}

function updateAllIndicatorCards(){
  const yData=(econDB[selectedISO]&&econDB[selectedISO].years||{})[String(year)]||{};
  Object.entries(TAB_CONFIG).forEach(([group,cfg])=>{
    cfg.indicators.forEach(ind=>{
      const raw=gi(yData,group,ind.key);
      const sparkKey=group+'.'+ind.key;
      // In history mode use real val; in interfere mode use simulated if econ group
      let val=raw, isReal=true;
      if(simMode==='interfere'&&group==='economic'){
        if(ind.key==='gdp_growth')    { val=hist.gdp[hist.gdp.length-1]; isReal=false; }
        else if(ind.key==='inflation'){ val=hist.inf[hist.inf.length-1]; isReal=false; }
        else if(ind.key==='unemployment'){ val=hist.une[hist.une.length-1]; isReal=false; }
        else if(ind.key==='debt_gdp'){ val=hist.dbt[hist.dbt.length-1]; isReal=false; }
      }
      pushSparkData(sparkKey, val);
      updateIndCard(group, ind, val, isReal, cfg.accent);
    });
  });
}

function pushSparkData(key, val){
  if(!groupSparkData[key]) groupSparkData[key]=[];
  if(val!==null&&val!==undefined) groupSparkData[key].push(parseFloat(val));
  if(groupSparkData[key].length>30) groupSparkData[key].shift();
}

function updateIndCard(group, ind, val, isReal, accent){
  const valEl=document.getElementById('icv-'+group+'-'+ind.key);
  const badgeEl=document.getElementById('icb-'+group+'-'+ind.key);
  const canvasEl=document.getElementById('ics-'+group+'-'+ind.key);
  if(!valEl)return;
  if(val===null||val===undefined){
    valEl.textContent='—';
    if(badgeEl){ badgeEl.textContent='N/A'; badgeEl.className='ind-badge ind-badge-na'; }
  } else {
    const num=parseFloat(val);
    const prefix=ind.prefix||'';
    valEl.textContent=prefix+(ind.dp===0?Math.round(num).toLocaleString():num.toFixed(ind.dp))+ind.suffix;
    // trend arrow
    const sparkKey=group+'.'+ind.key;
    const arr=groupSparkData[sparkKey]||[];
    let trend='';
    if(arr.length>=2){ const d=arr[arr.length-1]-arr[arr.length-2]; trend=d>0?' ▲':d<0?' ▼':''; }
    if(badgeEl){
      badgeEl.textContent=isReal?'REAL':'SIM';
      badgeEl.className='ind-badge '+(isReal?'ind-badge-real':'ind-badge-sim');
    }
    valEl.textContent=prefix+(ind.dp===0?Math.round(num).toLocaleString():num.toFixed(ind.dp))+ind.suffix+trend;
  }
  if(canvasEl) sparkline(canvasEl, groupSparkData[group+'.'+ind.key]||[], accent);
}

function sparkline(canvas, data, color){
  if(!canvas||data.length<2)return;
  const ctx=canvas.getContext('2d');
  const W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H);
  const mn=Math.min(...data), mx=Math.max(...data);
  const rng=mx-mn||1;
  const pts=data.map((v,i)=>[(i/(data.length-1))*W, H-((v-mn)/rng)*(H-4)-2]);
  ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
  pts.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));
  ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.stroke();
  // fill under line
  const grad=ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,color+'33'); grad.addColorStop(1,color+'00');
  ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
  pts.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));
  ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath();
  ctx.fillStyle=grad; ctx.fill();
}

// ══════════════════════════════════════════
//  APPEND C — DUAL MODE + SIM ENGINE
// ══════════════════════════════════════════

function doHistoryRoll(){
  simMode='history';
  interferePending=false;
  document.getElementById('topbar-mode').textContent='HISTORY MODE';
  document.getElementById('btn-interfere').classList.remove('apply-mode');
  // Advance one year using real data
  const nextYr=year+1;
  const yData=(econDB[selectedISO].years||{})[String(nextYr)]||null;
  if(!yData){ logEntry(year,'// NO MORE HISTORICAL DATA','warn'); return; }
  year=nextYr;
  document.getElementById('topbar-year').textContent=year;
  document.getElementById('yr').textContent=year;
  // Sync sliders from real data
  const e=k=>gi(yData,'economic',k);
  if(e('gdp_growth')!==null)   setSlider('rate',  fv(e('gdp_growth'),4.5));
  if(e('govt_spending')!==null) setSlider('spend', fv(e('govt_spending'),20));
  if(e('tax_rate')!==null)      setSlider('tax',   fv(e('tax_rate'),25));
  if(e('trade_gdp')!==null)     setSlider('trade', fv(e('trade_gdp'),40));
  if(e('debt_gdp')!==null)      setSlider('debt',  fv(e('debt_gdp'),60));
  hist.gdp.push(fv(e('gdp_growth'),hist.gdp[hist.gdp.length-1]));
  hist.inf.push(fv(e('inflation'),hist.inf[hist.inf.length-1]));
  hist.une.push(fv(e('unemployment'),hist.une[hist.une.length-1]));
  hist.dbt.push(fv(e('debt_gdp'),hist.dbt[hist.dbt.length-1]));
  simYearsElapsed++;
  updateAllIndicatorCards();
  updateSociety(hist.gdp.slice(-1)[0],hist.inf.slice(-1)[0],hist.une.slice(-1)[0],hist.dbt.slice(-1)[0]);
  renderSoc();
  calcEconDeviation();
  logEntry(year,'// HISTORY: GDP '+hist.gdp.slice(-1)[0].toFixed(1)+'%  INF '+hist.inf.slice(-1)[0].toFixed(1)+'%','info');
  if(simYearsElapsed>=5) document.getElementById('reveal-btn').classList.remove('hidden');
}

function doInterfere(){
  if(!interferePending){
    // First click: unlock levers, wait for second click
    interferePending=true;
    simMode='interfere';
    document.getElementById('topbar-mode').textContent='INTERFERE MODE';
    document.getElementById('btn-interfere').classList.add('apply-mode');
    logEntry(year,'// LEVERS UNLOCKED — set your policy, then click INTERFERE again','warn');
    return;
  }
  // Second click: run sim step with current lever positions
  interferePending=false;
  document.getElementById('btn-interfere').classList.remove('apply-mode');
  stepYear();
  if(simYearsElapsed>=5) document.getElementById('reveal-btn').classList.remove('hidden');
}

function getRealEconForYear(iso3,yr){
  const yData=((econDB[iso3]||{}).years||{})[String(yr)]||{};
  return {
    gdp:  gi(yData,'economic','gdp_growth'),
    inf:  gi(yData,'economic','inflation'),
    une:  gi(yData,'economic','unemployment'),
    dbt:  gi(yData,'economic','debt_gdp'),
  };
}

function stepYear(){
  const rate=parseFloat(document.getElementById('rate').value)||4.5;
  const money=parseFloat(document.getElementById('money').value)||3;
  const spend=parseFloat(document.getElementById('spend').value)||20;
  const tax=parseFloat(document.getElementById('tax').value)||25;
  const trade=parseFloat(document.getElementById('trade').value)||40;
  const debt=parseFloat(document.getElementById('debt').value)||60;

  const prevGdp=hist.gdp[hist.gdp.length-1];
  const prevInf=hist.inf[hist.inf.length-1];
  const prevUne=hist.une[hist.une.length-1];
  const prevDbt=hist.dbt[hist.dbt.length-1];

  // Simplified macro model
  let gdp = prevGdp
    + (money - 3) * 0.15          // loose money → growth
    - (rate - 4) * 0.25           // high rates → slow growth
    + (spend - 20) * 0.08         // fiscal stimulus
    - (tax - 25) * 0.06           // tax drag
    + (trade - 40) * 0.02         // openness bonus
    + (Math.random()-0.5)*0.8;    // noise

  let inf = prevInf
    + (money - 3) * 0.3
    - (rate - 4) * 0.2
    + (spend - 20) * 0.05
    + (Math.random()-0.5)*0.5;

  let une = prevUne
    - (gdp - 2) * 0.4
    + (rate - 4) * 0.15
    + (Math.random()-0.5)*0.3;

  let dbt = prevDbt
    + (spend - tax*0.4) * 0.5
    - gdp * 0.3;

  gdp=Math.max(-15,Math.min(15,gdp));
  inf=Math.max(-5,Math.min(30,inf));
  une=Math.max(1,Math.min(30,une));
  dbt=Math.max(0,Math.min(250,dbt));

  hist.gdp.push(gdp); hist.inf.push(inf); hist.une.push(une); hist.dbt.push(dbt);
  simHist.gdp.push(gdp); simHist.inf.push(inf); simHist.une.push(une); simHist.dbt.push(dbt);
  simHist.years.push(year+1);

  year++;
  document.getElementById('topbar-year').textContent=year;
  document.getElementById('yr').textContent=year;
  simYearsElapsed++;
  updateAllIndicatorCards();
  updateSociety(gdp,inf,une,dbt);
  renderSoc();
  calcEconDeviation();
  let msg='GDP '+gdp.toFixed(1)+'%  INF '+inf.toFixed(1)+'%  UNE '+une.toFixed(1)+'%  DBT '+Math.round(dbt)+'%';
  logEntry(year,'// '+msg, gdp>0?'good':'bad');
}

function updateVal(id,suffix){
  const el=document.getElementById(id); if(!el)return;
  const disp=document.getElementById('v-'+id); if(disp) disp.textContent=parseFloat(el.value).toFixed(1)+suffix;
}

function calcEconDeviation(){
  if(!selectedISO||simHist.years.length===0)return;
  let totalDiff=0, count=0;
  simHist.years.forEach((yr,i)=>{
    const real=getRealEconForYear(selectedISO,yr);
    if(real.gdp!==null){ totalDiff+=Math.abs(simHist.gdp[i]-(real.gdp||0)); count++; }
    if(real.inf!==null){ totalDiff+=Math.abs(simHist.inf[i]-(real.inf||0)); count++; }
    if(real.une!==null){ totalDiff+=Math.abs(simHist.une[i]-(real.une||0)); count++; }
  });
  const pct=count?totalDiff/count:0;
  deviationHistory.push(pct);
  updateDeviationBadge(pct);
}

function updateDeviationBadge(pct){
  const badge=document.getElementById('deviation-badge'); if(!badge)return;
  if(pct<3){      badge.textContent='ON TRACK';    badge.className='dev-badge dev-track'; }
  else if(pct<8){ badge.textContent='DIVERGING';   badge.className='dev-badge dev-amber'; }
  else{           badge.textContent='OFF COURSE';  badge.className='dev-badge dev-red';   }
}

// ══════════════════════════════════════════
//  APPEND D — SOCIETY + LOG + AUTO/RESET
// ══════════════════════════════════════════

function updateSociety(gdp,inf,une,dbt){
  soc.equality   = Math.max(0,Math.min(100, soc.equality  - une*0.3 + gdp*0.1));
  soc.trust      = Math.max(0,Math.min(100, soc.trust     - inf*0.2 + gdp*0.15 - (dbt>100?0.5:0)));
  soc.innovation = Math.max(0,Math.min(100, soc.innovation+ gdp*0.2 - une*0.1));
  soc.stability  = Math.max(0,Math.min(100, soc.stability - Math.abs(inf-2)*0.3 - (dbt>120?0.4:0)));
  soc.welfare    = Math.max(0,Math.min(100, soc.welfare   + gdp*0.1 - une*0.25));
  soc.confidence = Math.max(0,Math.min(100, soc.confidence+ gdp*0.2 - inf*0.15 - une*0.15));
}

function renderSoc(){
  const grid=document.getElementById('soc-grid'); if(!grid)return;
  const items=[
    {k:'equality',  label:'EQUALITY',    color:'#00C896'},
    {k:'trust',     label:'TRUST',       color:'#4fc3f7'},
    {k:'innovation',label:'INNOVATION',  color:'#fff176'},
    {k:'stability', label:'STABILITY',   color:'#a5d6a7'},
    {k:'welfare',   label:'WELFARE',     color:'#ef9a9a'},
    {k:'confidence',label:'CONFIDENCE',  color:'#ce93d8'},
  ];
  grid.innerHTML=items.map(it=>{
    const v=Math.round(soc[it.k]);
    return `<div class="soc-item">
      <div class="soc-item-name">${it.label}</div>
      <div class="soc-bar-bg"><div class="soc-bar-fill" style="width:${v}%;background:${it.color}"></div></div>
      <div class="soc-item-val" style="color:${it.color}">${v}</div>
    </div>`;
  }).join('');
}

function logEntry(yr,msg,type){
  const log=document.getElementById('log'); if(!log)return;
  const cls=type==='good'?'good':type==='bad'?'bad':type==='warn'?'warn':'';
  const div=document.createElement('div');
  div.className='log-entry '+cls;
  div.innerHTML='<span class="log-year">'+yr+'</span><span class="log-msg">'+msg+'</span>';
  log.appendChild(div);
  log.scrollTop=log.scrollHeight;
  // keep last 60 entries
  while(log.children.length>60) log.removeChild(log.firstChild);
}

function autoRun(){
  if(autoRunning){
    clearInterval(autoTimer); autoRunning=false;
    document.getElementById('auto-btn').textContent='⏩ AUTO';
    return;
  }
  autoRunning=true;
  document.getElementById('auto-btn').textContent='⏹ STOP';
  autoTimer=setInterval(()=>{
    if(simMode==='history') doHistoryRoll();
    else stepYear();
  },900);
}

function resetSim(){
  if(autoRunning){ clearInterval(autoTimer); autoRunning=false; document.getElementById('auto-btn').textContent='⏩ AUTO'; }
  if(!selectedISO||!selectedYear)return;
  year=selectedYear;
  simMode='history'; simYearsElapsed=0; interferePending=false;
  deviationHistory=[]; simHist={gdp:[],inf:[],une:[],dbt:[],years:[]};
  soc={equality:55,trust:60,innovation:65,stability:70,welfare:58,confidence:62};
  document.getElementById('topbar-year').textContent=year;
  document.getElementById('yr').textContent=year;
  document.getElementById('topbar-mode').textContent='HISTORY MODE';
  document.getElementById('reveal-btn').classList.add('hidden');
  document.getElementById('btn-interfere').classList.remove('apply-mode');
  document.getElementById('deviation-badge').textContent='ON TRACK';
  document.getElementById('deviation-badge').className='dev-badge dev-track';
  document.getElementById('log').innerHTML='';
  seedState();
  initAllTabPanels();
  updateAllIndicatorCards();
  renderSoc();
  logEntry('—','// SIMULATION RESET','warn');
}

// ══════════════════════════════════════════
//  APPEND E — REVEAL MODAL + UTILITIES
// ══════════════════════════════════════════

function openRevealModal(){
  document.getElementById('reveal-modal').classList.remove('hidden');
  const avgDev=deviationHistory.length?
    deviationHistory.reduce((a,b)=>a+b,0)/deviationHistory.length:0;
  document.getElementById('reveal-dev-pct').textContent=avgDev.toFixed(1)+'%';
  const verdicts=[
    [2,'Remarkably close. You governed like a historian.'],
    [5,'Solid stewardship. Minor divergences, but coherent.'],
    [10,'Notable differences. Bold choices — for better or worse.'],
    [99,'A very different path. History might judge you harshly.'],
  ];
  const v=verdicts.find(([t])=>avgDev<=t)||verdicts[verdicts.length-1];
  document.getElementById('reveal-verdict').textContent=v[1];
  document.getElementById('reveal-title').textContent=
    'YOUR LEGACY vs REALITY — '+(econDB[selectedISO]||{}).name||'';
  drawRevealCharts();
}

function closeRevealModal(){
  document.getElementById('reveal-modal').classList.add('hidden');
  revealCharts.forEach(c=>{ try{c.destroy();}catch(e){} });
  revealCharts=[];
}

function drawRevealCharts(){
  // Load Chart.js then draw
  loadScript('https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js',()=>{
    const configs=[
      {id:'rc-economic',   group:'economic',    key:'gdp_growth',    label:'GDP Growth %',        color:'#00C896'},
      {id:'rc-population', group:'population',  key:'pop_growth',    label:'Population Growth %', color:'#4fc3f7'},
      {id:'rc-health',     group:'health',      key:'life_expectancy',label:'Life Expectancy',    color:'#ef9a9a'},
      {id:'rc-education',  group:'education',   key:'literacy_rate', label:'Literacy Rate %',     color:'#fff176'},
      {id:'rc-environment',group:'environment', key:'co2_per_capita',label:'CO₂ / Capita (t)',    color:'#a5d6a7'},
      {id:'rc-governance', group:'governance',  key:'gini_index',    label:'Gini Index',          color:'#ce93d8'},
    ];
    configs.forEach(cfg=>drawRevealChart(cfg));
  });
}

function drawRevealChart(cfg){
  const canvas=document.getElementById(cfg.id); if(!canvas)return;
  // Build real series from realHistory
  const realYears=realHistory.years||[];
  const realVals=(realHistory[cfg.group]||{})[cfg.key]||[];
  const simYears=simHist.years||[];

  // Sim vals: only available for economic group keys we tracked
  const simKeyMap={
    'gdp_growth':'gdp','inflation':'inf','unemployment':'une','debt_gdp':'dbt'
  };
  const simArr=simKeyMap[cfg.key]?simHist[simKeyMap[cfg.key]]:[];

  // Merge all years
  const allYears=[...new Set([...realYears,...simYears])].sort((a,b)=>a-b);
  const realMap={}, simMap={};
  realYears.forEach((y,i)=>{ if(realVals[i]!==null&&realVals[i]!==undefined) realMap[y]=realVals[i]; });
  simYears.forEach((y,i)=>{ if(simArr[i]!==null&&simArr[i]!==undefined) simMap[y]=simArr[i]; });

  const rData=allYears.map(y=>realMap[y]??null);
  const sData=allYears.map(y=>simMap[y]??null);

  const ctx=canvas.getContext('2d');
  try{ Chart.getChart(canvas)?.destroy(); }catch(e){}
  const ch=new Chart(ctx,{
    type:'line',
    data:{
      labels:allYears,
      datasets:[
        {label:'Real',data:rData,borderColor:cfg.color,borderWidth:2,pointRadius:0,tension:0.3,spanGaps:true},
        {label:'You', data:sData,borderColor:'#ffffff',borderWidth:1.5,borderDash:[4,3],pointRadius:0,tension:0.3,spanGaps:true},
      ]
    },
    options:{
      responsive:true,animation:false,
      plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false}},
      scales:{
        x:{ticks:{color:'#666',font:{size:9}},grid:{color:'rgba(255,255,255,0.05)'}},
        y:{ticks:{color:'#666',font:{size:9}},grid:{color:'rgba(255,255,255,0.05)'}},
      }
    }
  });
  revealCharts.push(ch);
}

function buildNumericLookup(){
  // Maps TopoJSON numeric country ID → ISO3 code using our econDB names
  // We rely on a hardcoded table of ~220 numeric→ISO3 mappings
  const tbl={4:'AFG',8:'ALB',12:'DZA',24:'AGO',32:'ARG',36:'AUS',40:'AUT',50:'BGD',
    56:'BEL',64:'BTN',68:'BOL',76:'BRA',100:'BGR',116:'KHM',120:'CMR',124:'CAN',
    144:'LKA',152:'CHL',156:'CHN',170:'COL',188:'CRI',191:'HRV',192:'CUB',203:'CZE',
    208:'DNK',218:'ECU',818:'EGY',231:'ETH',246:'FIN',250:'FRA',276:'DEU',288:'GHA',
    300:'GRC',320:'GTM',332:'HTI',340:'HND',348:'HUN',356:'IND',360:'IDN',364:'IRN',
    368:'IRQ',372:'IRL',376:'ISR',380:'ITA',388:'JAM',392:'JPN',400:'JOR',404:'KEN',
    408:'PRK',410:'KOR',414:'KWT',418:'LAO',422:'LBN',434:'LBY',484:'MEX',504:'MAR',
    516:'NAM',524:'NPL',528:'NLD',554:'NZL',558:'NIC',566:'NGA',578:'NOR',586:'PAK',
    591:'PAN',600:'PRY',604:'PER',608:'PHL',616:'POL',620:'PRT',630:'PRI',634:'QAT',
    642:'ROU',643:'RUS',682:'SAU',686:'SEN',710:'ZAF',724:'ESP',752:'SWE',756:'CHE',
    760:'SYR',764:'THA',780:'TTO',788:'TUN',792:'TUR',800:'UGA',804:'UKR',784:'ARE',
    826:'GBR',840:'USA',858:'URY',862:'VEN',704:'VNM',887:'YEM',894:'ZMB',716:'ZWE',
    012:'DZA',233:'EST',428:'LVA',440:'LTU',703:'SVK',705:'SVN',191:'HRV',
  };
  const out={};
  Object.entries(tbl).forEach(([num,iso3])=>{ out[String(parseInt(num))]=iso3; });
  return out;
}

function renderMapFallback(world, svgEl){
  // Basic fallback: just show country outlines in gray if D3 fails
  svgEl.innerHTML='<text x="50%" y="50%" text-anchor="middle" fill="#666" font-family="monospace" font-size="14">// MAP UNAVAILABLE — use search above</text>';
}

// ── INIT (called by main.js tab switcher) ──
function economyInit(){
  // Redraw sparklines for any currently visible indicator cards
  Object.keys(groupSparkData).forEach(key=>{
    const [group,indKey]=key.split('.');
    const canvas=document.getElementById('ics-'+group+'-'+indKey);
    const cfg=TAB_CONFIG[group]; if(!cfg)return;
    const ind=cfg.indicators.find(i=>i.key===indKey); if(!ind)return;
    if(canvas) sparkline(canvas, groupSparkData[key], cfg.accent);
  });
  // Kick off data load if not yet started
  if(!econDB) loadEconData();
}

// ── BOOTSTRAP ──
document.addEventListener('DOMContentLoaded', loadEconData);
