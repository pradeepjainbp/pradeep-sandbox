const API_BASE = "https://jyotish-api-wml3.onrender.com";
let selectedCityData = null;

function astrologyInit() {
    if (typeof gsap === 'undefined') console.error("GSAP not loaded yet.");
    if (typeof gsap !== 'undefined' && gsap.registerPlugin) {
        gsap.registerPlugin(MotionPathPlugin, TextPlugin);
    }
    flatpickr("#astro-dob", { dateFormat: "Y-m-d", theme: "dark" });
    flatpickr("#astro-tob", { enableTime: true, noCalendar: true, dateFormat: "H:i", time_24hr: false, theme: "dark" });
    const cityInput = document.getElementById('astro-city');
    const autoList = document.getElementById('city-autocomplete-list');
    let debounceTimer;

    cityInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        const val = this.value;
        autoList.innerHTML = '';
        selectedCityData = null;
        if (!val || val.length < 3) return;
        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=5&format=json`);
                const data = await res.json();
                if (data.results) {
                    data.results.forEach(cityObj => {
                        const item = document.createElement('div');
                        let label = `${cityObj.name}`;
                        if (cityObj.admin1) label += `, ${cityObj.admin1}`;
                        if (cityObj.country) label += `, ${cityObj.country}`;
                        item.textContent = label;
                        item.addEventListener('click', () => {
                            cityInput.value = label;
                            selectedCityData = { lat: cityObj.latitude, lon: cityObj.longitude, timezone: cityObj.timezone };
                            autoList.innerHTML = '';
                        });
                        autoList.appendChild(item);
                    });
                }
            } catch(e) { console.error(e); }
        }, 400);
    });

    document.addEventListener('click', (e) => {
        if (e.target !== cityInput) autoList.innerHTML = '';
    });

    const form = document.getElementById('astrology-birth-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!selectedCityData) {
                alert("Please select a precise city from the dropdown suggestions.");
                return;
            }
            if (typeof window.AudioEngine !== 'undefined') window.AudioEngine.init();
            const btn = form.querySelector('.jyotish-btn');
            btn.innerHTML = "Computing Cosmos...<br><span style='font-size:10px;text-transform:none;'>(Waking deep-space engine on Render, may take 45s)</span>";
            btn.disabled = true;

            try {
                const dob = document.getElementById('astro-dob').value;
                const tob = document.getElementById('astro-tob').value;
                const [year, month, day] = dob.split('-').map(Number);
                const [hour, minute] = tob.split(':').map(Number);
                const chartPayload = {
                    year, month, day, hour, minute,
                    lat: selectedCityData.lat, lon: selectedCityData.lon, timezone: selectedCityData.timezone
                };
                const chartRes = await fetch(`${API_BASE}/api/chart/compute`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(chartPayload)
                });
                if (!chartRes.ok) throw new Error("Chart computation failed.");
                const chartData = await chartRes.json();
                
                document.getElementById('jyotish-intake').style.display = 'none';
                startOrreryReveal(chartData);

            } catch (err) {
                console.error(err);
                alert("Error computing chart. Ensure backend is live.");
                btn.innerHTML = "Compute Chart";
                btn.disabled = false;
            }
        });
    }
}

function startOrreryReveal(chart) {
    const orreryLayer = document.getElementById('orrery-layer');
    orreryLayer.style.display = 'flex';
    orreryLayer.style.flexDirection = 'column';
    orreryLayer.style.alignItems = 'center';
    orreryLayer.style.justifyContent = 'center';
    orreryLayer.style.height = 'calc(100vh - 80px)';
    orreryLayer.style.overflow = 'hidden';

    document.getElementById('orrery-title').style.opacity = '0';
    document.getElementById('orrery-title').style.position = 'absolute';
    document.getElementById('orrery-title').style.bottom = '15%';
    document.getElementById('orrery-title').style.width = '100%';
    document.getElementById('orrery-title').style.textAlign = 'center';
    document.getElementById('orrery-title').style.fontFamily = 'Cinzel';
    document.getElementById('orrery-title').style.color = 'var(--text-primary)';
    document.getElementById('orrery-title').style.fontSize = '1.4rem';
    document.getElementById('orrery-title').style.zIndex = '10';

    drawOrrerySVG(chart);
    setupTooltips(chart);
    runRevealAnimation(chart);
}

const signColors = [
    'rgba(255, 69, 0, 0.15)',    // 0 Aries (Fire spark)
    'rgba(144, 238, 144, 0.15)', // 1 Taurus (Green soil)
    'rgba(240, 248, 255, 0.15)', // 2 Gemini (Sky white)
    'rgba(135, 206, 250, 0.15)', // 3 Cancer (Pond cyan)
    'rgba(218, 165, 32, 0.20)',  // 4 Leo (Gold roar)
    'rgba(34, 139, 34, 0.15)',   // 5 Virgo (Forest green)
    'rgba(176, 196, 222, 0.15)', // 6 Libra (Silvery air)
    'rgba(0, 0, 139, 0.20)',     // 7 Scorpio (Lake indigo)
    'rgba(178, 34, 34, 0.20)',   // 8 Sag (Crimson fire)
    'rgba(101, 67, 33, 0.15)',   // 9 Capricorn (Brown rock)
    'rgba(138, 43, 226, 0.15)',  // 10 Aquarius (Electric violet)
    'rgba(0, 105, 148, 0.25)'    // 11 Pisces (Deep navy ocean)
];

function setupTooltips(chart) {
    const tooltip = document.getElementById('planet-tooltip');
    const elements = ['Fire', 'Earth', 'Air', 'Water'];
    const rashiNames = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
    const houseMeanings = ["", "Self, Appearance, Vitality", "Wealth, Family, Finances", "Courage, Siblings", "Mother, Home, Emotions", "Children, Intellect, Creativity", "Enemies, Debts, Health", "Partnership, Marriage", "Transformation, Mysticism", "Dharma, Fortune", "Career, Status", "Gains, Ambition", "Loss, Subconscious, Liberation"];

    document.querySelectorAll('.house-hitbox').forEach(box => {
        box.addEventListener('mouseenter', (e) => {
            let h = parseInt(box.dataset.house);
            let r = parseInt(box.dataset.rashi);
            if(window.AudioEngine) window.AudioEngine.playElement(r); // Procedural sign audio
            
            tooltip.innerHTML = `
                <div class="tt-title" style="color:var(--text-secondary)">House ${h}</div>
                <div style="margin-bottom:5px;">${houseMeanings[h]}</div>
                <div style="color:var(--teal)">Rashi: ${rashiNames[r]} <span style="font-size:0.8rem;opacity:0.7">(${elements[r % 4]})</span></div>
            `;
            tooltip.style.opacity = 1;
            tooltip.style.left = (e.pageX + 15) + 'px';
            tooltip.style.top = (e.pageY + 15) + 'px';
        });
        box.addEventListener('mousemove', (e) => {
            tooltip.style.left = (e.pageX + 15) + 'px';
            tooltip.style.top = (e.pageY + 15) + 'px';
        });
        box.addEventListener('mouseleave', () => tooltip.style.opacity = 0);
    });

    const planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
    planets.forEach(p => {
        let img = document.getElementById(`planet-img-${p}`);
        if (!img) return;
        let data = chart.planets[p];
        let h = (data.rashi_num - chart.lagna.rashi_num + 12) % 12 + 1;
        img.addEventListener('mouseenter', (e) => {
            e.stopPropagation();
            if(window.AudioEngine) window.AudioEngine.playMix(p, data.rashi_num); // Procedural mix!

            tooltip.innerHTML = `
                <div class="tt-title">${p} <span style="font-size:0.9rem">${data.rashi}</span></div>
                <div style="color:var(--text-secondary); margin-bottom:5px;">House ${h}</div>
                <div>Degree: ${data.degree.toFixed(2)}°</div>
                <div>Nakshatra: ${data.nakshatra} (Pada ${data.pada})</div>
                <div>Speed: ${data.speed.toFixed(2)}°/day ${data.is_retrograde ? '<span style="color:#FF6B6B">(Ret)</span>' : ''}</div>
            `;
            tooltip.style.opacity = 1;
            tooltip.style.left = (e.pageX + 15) + 'px';
            tooltip.style.top = (e.pageY + 15) + 'px';
        });
        img.addEventListener('mousemove', (e) => {
            tooltip.style.left = (e.pageX + 15) + 'px';
            tooltip.style.top = (e.pageY + 15) + 'px';
        });
        img.addEventListener('mouseleave', () => tooltip.style.opacity = 0);
    });
}

function drawOrrerySVG(chart) {
    const svg = document.getElementById('zodiac-wheel');
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.maxHeight = '70vh';
    svg.style.maxWidth = '100vw';
    svg.style.overflow = 'visible';
    svg.setAttribute('viewBox', '0 0 1000 1000');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const cx = 500, cy = 500, r = 350;
    let html = `
        <defs>
            <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <linearGradient id="radar-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="var(--teal)" stop-opacity="0.4" />
                <stop offset="100%" stop-color="transparent" stop-opacity="0" />
            </linearGradient>
        </defs>
        <circle id="center-pulse" cx="${cx}" cy="${cy}" r="4" fill="var(--gold)" opacity="0" />
        <circle id="wheel-ring" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--text-secondary)" stroke-width="1" stroke-dasharray="2200" stroke-dashoffset="2200" />
    `;

    const rashiNames = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
    
    for(let i=0; i<12; i++) {
        let angle1 = (i * 30) - 90;
        let angle2 = ((i+1) * 30) - 90;
        let rad1 = angle1 * Math.PI / 180;
        let rad2 = angle2 * Math.PI / 180;
        let rx1 = cx + r * Math.cos(rad1);
        let ry1 = cy + r * Math.sin(rad1);
        let rx2 = cx + r * Math.cos(rad2);
        let ry2 = cy + r * Math.sin(rad2);
        let path = `M ${cx} ${cy} L ${rx1} ${ry1} A ${r} ${r} 0 0 1 ${rx2} ${ry2} Z`;
        let tx = cx + (r+40) * Math.cos(rad1 + (15 * Math.PI/180));
        let ty = cy + (r+40) * Math.sin(rad1 + (15 * Math.PI/180));
        let house = (i - chart.lagna.rashi_num + 12) % 12 + 1;
        html += `
            <path class="rashi-slice house-hitbox" data-type="cosmos" data-rashi="${i}" data-house="${house}" d="${path}" fill="${signColors[i]}" opacity="0" pointer-events="all" />
            <line class="zodiac-div" x1="${cx + (r-15)*Math.cos(rad1)}" y1="${cy + (r-15)*Math.sin(rad1)}" x2="${cx + (r+15)*Math.cos(rad1)}" y2="${cy + (r+15)*Math.sin(rad1)}" stroke="var(--text-secondary)" stroke-width="1" opacity="0" pointer-events="none" />
            <text class="zodiac-label" x="${tx}" y="${ty}" fill="var(--gold)" font-family="Cinzel" font-size="18" text-anchor="middle" dominant-baseline="middle" opacity="0" pointer-events="none">${rashiNames[i]}</text>
        `;
    }

    html += `
        <g id="radar-group" style="opacity:0;">
            <line x1="500" y1="500" x2="500" y2="150" stroke="var(--teal)" stroke-width="2" filter="url(#glow)"/>
            <polygon points="500,500 500,150 550,150" fill="url(#radar-grad)" />
        </g>
    `;

    let lagnaAngle = (chart.lagna.longitude) - 90;
    let lx = cx + r * Math.cos(lagnaAngle * Math.PI/180);
    let ly = cy + r * Math.sin(lagnaAngle * Math.PI/180);
    html += `<circle id="lagna-marker" cx="${lx}" cy="${ly}" r="8" fill="var(--teal)" opacity="0" filter="url(#glow)" pointer-events="none"/>`;

    const gridSize = 480;
    const boxW = gridSize / 4; 
    const bx = cx - gridSize/2;
    const by = cy - gridSize/2;
    const siCoords = [[1,0], [2,0], [3,0], [3,1], [3,2], [3,3], [2,3], [1,3], [0,3], [0,2], [0,1], [0,0]];
    const siLabels = ["Ar", "Ta", "Ge", "Ca", "Le", "Vi", "Li", "Sc", "Sa", "Cp", "Aq", "Pi"];
    for (let i=0; i<12; i++) {
        let [col, row] = siCoords[i];
        let house = (i - chart.lagna.rashi_num + 12) % 12 + 1;
        html += `
            <rect class="si-box" x="${bx + col*boxW}" y="${by + row*boxW}" width="${boxW}" height="${boxW}" pointer-events="none" />
            <text class="si-label" x="${bx + col*boxW + 5}" y="${by + row*boxW + 18}" pointer-events="none">${siLabels[i]}</text>
            <rect class="house-hitbox si-fill" data-type="si" data-rashi="${i}" data-house="${house}" x="${bx + col*boxW}" y="${by + row*boxW}" width="${boxW}" height="${boxW}" fill="${signColors[i]}" opacity="0" pointer-events="all" style="display:none;" />
        `;
    }

    html += `<rect class="ni-line" x="${bx}" y="${by}" width="${gridSize}" height="${gridSize}" pointer-events="none" />
             <line class="ni-line" x1="${bx}" y1="${by}" x2="${bx+gridSize}" y2="${by+gridSize}" pointer-events="none" />
             <line class="ni-line" x1="${bx+gridSize}" y1="${by}" x2="${bx}" y2="${by+gridSize}" pointer-events="none" />
             <polygon class="ni-line" points="${bx+gridSize/2},${by} ${bx+gridSize},${by+gridSize/2} ${bx+gridSize/2},${by+gridSize} ${bx},${by+gridSize/2}" pointer-events="none" />`;
    const niCenters = [[240, 120], [120, 40], [40, 120], [120, 240], [40, 360], [120, 440], [240, 360], [360, 440], [440, 360], [360, 240], [440, 120], [360, 40]];
    const hw = gridSize/2, qw = gridSize/4, tqw = gridSize*0.75, w = gridSize;
    const niPolygons = [
        `${hw},0 ${tqw},${qw} ${hw},${hw} ${qw},${qw}`, `0,0 ${hw},0 ${qw},${qw}`, `0,0 ${qw},${qw} 0,${hw}`, `0,${hw} ${qw},${qw} ${hw},${hw} ${qw},${tqw}`,
        `0,${hw} 0,${w} ${qw},${tqw}`, `0,${w} ${hw},${w} ${qw},${tqw}`, `${hw},${hw} ${qw},${tqw} ${hw},${w} ${tqw},${tqw}`, `${hw},${w} ${w},${w} ${tqw},${tqw}`,
        `${w},${w} ${w},${hw} ${tqw},${tqw}`, `${hw},${hw} ${tqw},${tqw} ${w},${hw} ${tqw},${qw}`, `${w},${hw} ${w},0 ${tqw},${qw}`, `${w},0 ${hw},0 ${tqw},${qw}`
    ];
    for(let h=1; h<=12; h++) {
        let [xx, yy] = niCenters[h-1];
        let rashiForHouse = (chart.lagna.rashi_num + h - 1) % 12;
        html += `<text class="ni-label" x="${bx+xx}" y="${by+yy-30}" font-size="14" fill="var(--text-secondary)" text-anchor="middle" opacity="0" pointer-events="none">${rashiForHouse+1}</text>`;
        let pts = niPolygons[h-1].split(' ').map(pair => { let [px,py] = pair.split(','); return `${bx+parseFloat(px)},${by+parseFloat(py)}`; }).join(' ');
        html += `<polygon class="house-hitbox ni-fill" data-type="ni" data-rashi="${rashiForHouse}" data-house="${h}" points="${pts}" fill="${signColors[rashiForHouse]}" opacity="0" pointer-events="all" style="display:none;" />`;
    }

    let lagnaRashi = chart.lagna.rashi_num;
    html += `<text id="si-lagna-text" class="si-label" x="${bx + siCoords[lagnaRashi][0]*boxW + boxW/2}" y="${by + siCoords[lagnaRashi][1]*boxW + boxW/2}" font-size="20" fill="var(--teal)" text-anchor="middle" dominant-baseline="middle" opacity="0" pointer-events="none">ASC</text>`;
    html += `<text id="ni-lagna-text" class="ni-label" x="${bx+niCenters[0][0]}" y="${by+niCenters[0][1]}" font-size="20" fill="var(--teal)" text-anchor="middle" dominant-baseline="middle" opacity="0" pointer-events="none">ASC</text>`;

    const planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
    let rashiCounts = {};
    planets.forEach(p => { rashiCounts[chart.planets[p].rashi_num] = (rashiCounts[chart.planets[p].rashi_num] || 0) + 1; });
    
    let currentRashiPos = {};
    planets.forEach(p => {
        let long = chart.planets[p].longitude;
        let angle = long - 90;
        let px = cx + (r-50) * Math.cos(angle * Math.PI/180);
        let py = cy + (r-50) * Math.sin(angle * Math.PI/180);
        
        let rashi = chart.planets[p].rashi_num;
        let targetX_si = bx + siCoords[rashi][0] * boxW + boxW/2;
        let targetY_si = by + siCoords[rashi][1] * boxW + boxW/2;
        
        let house = (rashi - chart.lagna.rashi_num + 12) % 12;
        let targetX_ni = bx + niCenters[house][0];
        let targetY_ni = by + niCenters[house][1];
        
        let total = rashiCounts[rashi];
        let pIdx = currentRashiPos[rashi] || 0;
        currentRashiPos[rashi] = pIdx + 1;
        
        let ox_si = 0, oy_si = 0, ox_ni = 0, oy_ni = 0;
        if (total > 1 && total <= 4) {
            let corners = [[-1,-1], [1,-1], [-1,1], [1,1]];
            ox_si = ox_ni = corners[pIdx % 4][0] * 22;
            oy_si = oy_ni = corners[pIdx % 4][1] * 22;
        } else if (total > 4) {
            let pA = (pIdx / total) * 360;
            ox_si = ox_ni = 28 * Math.cos(pA * Math.PI/180);
            oy_si = oy_ni = 28 * Math.sin(pA * Math.PI/180);
        }

        let ext = (p==="Saturn"||p==="Rahu"||p==="Ketu") ? "png" : "jpg";
        html += `
            <g id="planet-g-${p}" transform="translate(${cx}, ${cy})" data-px="${px}" data-py="${py}" data-txsi="${targetX_si+ox_si}" data-tysi="${targetY_si+oy_si}" data-txni="${targetX_ni+ox_ni}" data-tyni="${targetY_ni+oy_ni}">
                <image id="planet-img-${p}" data-planet="${p}" class="planet-img" href="astrology/assets/planets/${p}.${ext}" x="-25" y="-25" width="50" height="50" opacity="0" pointer-events="all" />
            </g>
        `;
    });
    svg.innerHTML = html;
}

function runRevealAnimation(chart) {
    const tl = gsap.timeline();
    
    tl.to("#panchanga-panel", { display: "block", opacity: 1, duration: 1 }, 0);
    let fullText = `<b>PANCHANGA VITALS</b><br><br><span style="color:var(--teal)">Lagna:</span> ${chart.lagna.rashi} (${chart.lagna.degree.toFixed(2)}°)<br><span style="color:var(--teal)">Moon Rashi:</span> ${chart.planets.Moon.rashi}<br><span style="color:var(--teal)">Moon Nakshatra:</span> ${chart.planets.Moon.nakshatra} (Pada ${chart.planets.Moon.pada})<br><br><span style="color:var(--teal)">Mahadasha at Birth:</span><br>${chart.dasha.lord} (${chart.dasha.years_remaining_at_birth.toFixed(1)}y)<br><br><i style="color:var(--text-secondary);font-size:0.8rem;">Explore the Cosmos</i>`;
    tl.to("#panchanga-panel", { duration: 3, text: { value: fullText }, ease: "none" }, 1.0);

    tl.to("#center-pulse", { opacity: 1, scale: 1.5, duration: 1, yoyo: true, repeat: -1 }, 4.0);
    tl.to("#om-symbol", { opacity: 0.15, duration: 2 }, 4.5);
    tl.to("#wheel-ring", { strokeDashoffset: 0, duration: 2, ease: "power2.inOut" }, 5.5);
    tl.to(".zodiac-div", { opacity: 1, duration: 0.5, stagger: 0.1 }, 6.5);
    tl.to(".zodiac-label", { opacity: 1, duration: 0.5, stagger: 0.1 }, 6.5);
    tl.to("#lagna-marker", { opacity: 1, duration: 0.2, scale: 1.5, yoyo: true, repeat: 1 }, 7.5);
    
    tl.to(".rashi-slice", { opacity: 1, duration: 2, stagger: 0.1 }, 8.0);
    tl.call(() => { document.querySelectorAll('.house-hitbox[data-type="cosmos"]').forEach(h => h.style.display = 'block'); }, null, 8.5);

    tl.to("#radar-group", { opacity: 1, duration: 1 }, 9.0);
    tl.to("#radar-group", { rotation: 360, svgOrigin: "500 500", duration: 18, ease: "none" }, 10.0);

    const planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
    let sortedPlanets = [...planets].sort((a,b) => chart.planets[a].longitude - chart.planets[b].longitude);
    
    sortedPlanets.forEach((p) => {
        let long = chart.planets[p].longitude;
        let timeHit = 10.0 + (long / 360) * 18.0;
        let el = document.querySelector(`#planet-g-${p}`);
        let px = parseFloat(el.dataset.px);
        let py = parseFloat(el.dataset.py);
        
        tl.to(`#planet-img-${p}`, { opacity: p === "Ketu" ? 0.8 : 1, duration: 1.5 }, timeHit - 0.5);
        tl.to(`#planet-g-${p}`, { x: px, y: py, duration: 1.5, ease: "elastic.out(1, 0.3)" }, timeHit - 0.5);
        
        tl.call(() => {
            if (typeof window.AudioEngine !== 'undefined') window.AudioEngine.playMix(p, chart.planets[p].rashi_num);
        }, null, timeHit);
    });

    tl.to("#radar-group", { opacity: 0, duration: 1 }, 32.0);
    tl.to("#chart-controls", { display: "flex", opacity: 1, duration: 1 }, 33.0);
    tl.call(() => triggerDashboard(chart), null, 34.0);

    setupMorphButtons(chart);
}

function setupMorphButtons(chart) {
    const btnC = document.getElementById('btn-cosmos');
    const btnS = document.getElementById('btn-south');
    const btnN = document.getElementById('btn-north');
    btnC.addEventListener('click', () => morphToGrid(chart, 'cosmos'));
    btnS.addEventListener('click', () => morphToGrid(chart, 'south'));
    btnN.addEventListener('click', () => morphToGrid(chart, 'north'));
}

function morphToGrid(chart, type) {
    const tl = gsap.timeline();
    tl.to(['#wheel-ring', '.zodiac-div', '.zodiac-label', '#lagna-marker', '.rashi-slice'], { opacity: 0, duration: 1.0, ease: "power2.inOut" }, 0);
    tl.to(['.si-box', '.si-label', '#si-lagna-text', '.si-fill'], { opacity: 0, duration: 1.0 }, 0);
    tl.to(['.ni-line', '.ni-label', '#ni-lagna-text', '.ni-fill'], { opacity: 0, duration: 1.0 }, 0);
    
    document.querySelectorAll('.house-hitbox').forEach(h => h.style.display = 'none');
    
    if (type === 'cosmos') {
        tl.to(['#wheel-ring', '.zodiac-div', '.zodiac-label'], { opacity: 1, duration: 1.5, ease: "power2.out" }, 0.5);
        tl.to('#lagna-marker', { opacity: 1, duration: 1.0, yoyo: true, repeat: 1 }, 1.0);
        tl.to('.rashi-slice', { opacity: 1, duration: 1.5 }, 0.5);
        document.querySelectorAll('.house-hitbox[data-type="cosmos"]').forEach(h => h.style.display = 'block');
    } else if (type === 'south') {
        tl.to('.si-box', { opacity: 1, duration: 1.0, stagger: 0.05, ease: "power2.out" }, 0.5);
        tl.to('.si-fill', { opacity: 1, duration: 1.5 }, 0.5);
        tl.to('.si-label', { opacity: 1, duration: 1.5 }, 1.0);
        tl.to('#si-lagna-text', { opacity: 1, duration: 1.0, scale: 1.2, yoyo: true, repeat: 1 }, 1.5);
        document.querySelectorAll('.house-hitbox[data-type="si"]').forEach(h => h.style.display = 'block');
    } else {
        tl.to('.ni-line', { opacity: 1, duration: 1.0, stagger: 0.1, ease: "power2.out" }, 0.5);
        tl.to('.ni-fill', { opacity: 1, duration: 1.5 }, 0.5);
        tl.to('.ni-label', { opacity: 1, duration: 1.5 }, 1.0);
        tl.to('#ni-lagna-text', { opacity: 1, duration: 1.0, scale: 1.2, yoyo: true, repeat: 1 }, 1.5);
        document.querySelectorAll('.house-hitbox[data-type="ni"]').forEach(h => h.style.display = 'block');
    }

    const planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
    planets.forEach((p) => {
        let el = document.querySelector(`#planet-g-${p}`);
        let tx = parseFloat(type === 'south' ? el.dataset.txsi : (type === 'north' ? el.dataset.txni : el.dataset.px));
        let ty = parseFloat(type === 'south' ? el.dataset.tysi : (type === 'north' ? el.dataset.tyni : el.dataset.py));
        tl.to(`#planet-g-${p}`, { x: tx, y: ty, duration: 2.0, ease: "circ.inOut" }, 0.5);
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACT TWO — DOMAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

let _chartDataGlobal = null;

function showDomainDashboard(chartData) {
    _chartDataGlobal = chartData;
    const layer = document.getElementById('dashboard-layer');
    layer.style.display = 'block';
    layer.innerHTML = buildDashboardHTML(chartData);

    // Stagger card entry animation — wait one frame for DOM paint
    requestAnimationFrame(() => gsap.from('.domain-card', {
        y: 60, opacity: 0, duration: 0.6,
        stagger: 0.08, ease: 'power2.out', delay: 0.3
    }));

    // Animate score bars after cards appear
    setTimeout(() => animateScoreBars(chartData.domains), 800);

    // Build Planetary Council section
    const inner = document.querySelector('.dashboard-inner');
    if (inner) buildCouncilSection(inner);

    // Build D3 Ashtakavarga grid
    if (typeof d3 !== 'undefined') {
        buildAshtakavargaGrid(chartData.bav, chartData.sav);
    } else {
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js', () => {
            buildAshtakavargaGrid(chartData.bav, chartData.sav);
        });
    }
}

function buildDashboardHTML(chartData) {
    const domains = chartData.domains || [];
    const summary = chartData.bav_summary || {};

    let cardsHTML = domains.map(d => {
        const colorClass = d.score >= 61 ? 'score-gold' : d.score >= 46 ? 'score-teal' : d.score >= 25 ? 'score-amber' : 'score-red';
        const driver1 = d.top_drivers[0] || {};
        const driver2 = d.top_drivers[1] || {};
        return `
        <div class="domain-card" data-domain-id="${d.domain_id}" onclick="openDrilldown('${d.domain_id}')">
            <div class="domain-card-header">
                <div>
                    <div class="domain-name">${d.domain_name}</div>
                    <div class="domain-sanskrit">${d.sanskrit}</div>
                </div>
                <div class="domain-score ${colorClass}" id="score-${d.domain_id}">0</div>
            </div>
            <div class="domain-bar-bg">
                <div class="domain-bar-fill ${colorClass}" id="bar-${d.domain_id}" style="width:0%"></div>
            </div>
            <div class="domain-drivers">
                ${driver1.planet ? `<span class="driver-pill">${driver1.planet} · ${driver1.bav_score}/8</span>` : ''}
                ${driver2.planet ? `<span class="driver-pill">${driver2.planet} · ${driver2.bav_score}/8</span>` : ''}
            </div>
            <div class="domain-sav">House ${d.house} · ${d.sav_score}/56 votes</div>
        </div>`;
    }).join('');

    return `
    <div class="dashboard-inner">
        <div class="dashboard-header">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
                <div>
                    <h2 class="dash-title">Life Domain Intelligence</h2>
                    <p class="dash-sub">Every score is derived from the Ashtakavarga — the collective planetary vote on each area of life.</p>
                </div>
                <button class="jyotish-btn jyotish-back-btn" onclick="resetJyotish()" style="margin-top:0; flex-shrink:0;">← New Chart</button>
            </div>
        </div>

        <div class="domains-grid">${cardsHTML}</div>

        <div class="avarga-section">
            <h3 class="avarga-title">Ashtakavarga — The Planetary Vote Table</h3>
            <p class="avarga-sub">Each number is how many of the 8 voters (7 planets + Lagna) voted favourably for that house. Hover any cell to understand why.</p>
            <div id="avarga-d3-container"></div>
            <div class="avarga-summary">
                ${summary.strongest_house ? `Strongest house: <span style="color:var(--gold)">${summary.strongest_house}</span> with <span style="color:var(--gold)">${summary.strongest_score}/56</span> votes &nbsp;·&nbsp; Most challenged: <span style="color:#FF6B6B">${summary.weakest_house}</span> with <span style="color:#FF6B6B">${summary.weakest_score}/56</span>` : ''}
            </div>
        </div>

        <div class="drilldown-overlay" id="drilldown-overlay" style="display:none;" onclick="closeDrilldown()">
            <div class="drilldown-panel" id="drilldown-panel" onclick="event.stopPropagation()">
                <button class="drilldown-close" onclick="closeDrilldown()">✕</button>
                <div id="drilldown-content"></div>
            </div>
        </div>
    </div>`;
}

function animateScoreBars(domains) {
    if (!domains) return;
    domains.forEach(d => {
        const scoreEl = document.getElementById(`score-${d.domain_id}`);
        const barEl = document.getElementById(`bar-${d.domain_id}`);
        if (!scoreEl || !barEl) return;
        // Animate score number
        let start = 0;
        const end = d.score;
        const duration = 600;
        const step = (timestamp, startTime) => {
            const progress = Math.min((timestamp - startTime) / duration, 1);
            scoreEl.textContent = Math.round(progress * end);
            if (progress < 1) requestAnimationFrame(ts => step(ts, startTime));
        };
        requestAnimationFrame(ts => step(ts, ts));
        // Animate bar width
        gsap.to(barEl, { width: d.score + '%', duration: 0.8, ease: 'power2.out', delay: Math.random() * 0.3 });
    });
}

function buildAshtakavargaGrid(bav, sav) {
    const container = document.getElementById('avarga-d3-container');
    if (!container || !bav || !sav) return;

    const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    const houses = Array.from({length: 12}, (_, i) => i + 1);

    const margin = { top: 40, right: 20, bottom: 20, left: 90 };
    const cellSize = 44;
    const width = cellSize * 12 + margin.left + margin.right;
    const height = cellSize * (planets.length + 1) + margin.top + margin.bottom;

    d3.select('#avarga-d3-container').selectAll('*').remove();

    const svg = d3.select('#avarga-d3-container')
        .append('svg')
        .attr('width', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('font-family', "'JetBrains Mono', monospace");

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Color scale
    const colorScale = score => {
        if (score >= 7) return '#C9A84C';      // gold
        if (score >= 5) return '#4ECDC4';      // teal
        if (score >= 3) return '#F59E0B';      // amber
        return '#FF6B6B';                       // red
    };

    // House column headers
    g.selectAll('.house-label')
        .data(houses)
        .enter().append('text')
        .attr('class', 'house-label')
        .attr('x', (d, i) => i * cellSize + cellSize / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#8888BB')
        .attr('font-size', '11px')
        .text(d => `H${d}`);

    // Planet rows + cells
    planets.forEach((planet, row) => {
        // Planet label
        g.append('text')
            .attr('x', -8)
            .attr('y', row * cellSize + cellSize / 2 + 4)
            .attr('text-anchor', 'end')
            .attr('fill', '#F0EEE6')
            .attr('font-size', '12px')
            .text(planet);

        // Cells
        const scores = bav[planet] || Array(12).fill(0);
        g.selectAll(`.cell-${planet}`)
            .data(scores)
            .enter().append('rect')
            .attr('x', (d, i) => i * cellSize + 1)
            .attr('y', row * cellSize + 1)
            .attr('width', cellSize - 2)
            .attr('height', cellSize - 2)
            .attr('rx', 3)
            .attr('fill', d => colorScale(d))
            .attr('fill-opacity', 0.25)
            .attr('stroke', d => colorScale(d))
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                d3.select(this).attr('fill-opacity', 0.6);
                showAvargaTooltip(event, planet, houses[scores.indexOf(d)], d);
            })
            .on('mouseout', function(event, d) {
                d3.select(this).attr('fill-opacity', 0.25);
                hideAvargaTooltip();
            });

        // Score numbers
        g.selectAll(`.num-${planet}`)
            .data(scores)
            .enter().append('text')
            .attr('x', (d, i) => i * cellSize + cellSize / 2)
            .attr('y', row * cellSize + cellSize / 2 + 4)
            .attr('text-anchor', 'middle')
            .attr('fill', d => colorScale(d))
            .attr('font-size', '13px')
            .attr('font-weight', '500')
            .text(d => d);
    });

    // SAV row (totals)
    const savRow = planets.length;
    g.append('text')
        .attr('x', -8)
        .attr('y', savRow * cellSize + cellSize / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('fill', '#C9A84C')
        .attr('font-size', '12px')
        .attr('font-weight', '700')
        .text('TOTAL');

    g.selectAll('.sav-cell')
        .data(sav || Array(12).fill(0))
        .enter().append('rect')
        .attr('x', (d, i) => i * cellSize + 1)
        .attr('y', savRow * cellSize + 1)
        .attr('width', cellSize - 2)
        .attr('height', cellSize - 2)
        .attr('rx', 3)
        .attr('fill', d => d >= 30 ? '#C9A84C' : d >= 25 ? '#4ECDC4' : '#FF6B6B')
        .attr('fill-opacity', 0.3)
        .attr('stroke', d => d >= 30 ? '#C9A84C' : d >= 25 ? '#4ECDC4' : '#FF6B6B')
        .attr('stroke-opacity', 0.8)
        .attr('stroke-width', 1.5);

    g.selectAll('.sav-num')
        .data(sav || Array(12).fill(0))
        .enter().append('text')
        .attr('x', (d, i) => i * cellSize + cellSize / 2)
        .attr('y', savRow * cellSize + cellSize / 2 + 4)
        .attr('text-anchor', 'middle')
        .attr('fill', d => d >= 30 ? '#C9A84C' : d >= 25 ? '#4ECDC4' : '#FF6B6B')
        .attr('font-size', '13px')
        .attr('font-weight', '700')
        .text(d => d);
}

// Tooltip for Ashtakavarga grid
let _avargaTooltip = null;
function showAvargaTooltip(event, planet, house, score) {
    if (!_avargaTooltip) {
        _avargaTooltip = document.createElement('div');
        _avargaTooltip.className = 'avarga-tooltip';
        document.body.appendChild(_avargaTooltip);
    }
    const quality = score >= 6 ? 'voted strongly — speaks with authority here'
        : score >= 4 ? 'mixed vote — moderate influence'
        : 'voted weakly — speaks with restraint here';
    _avargaTooltip.innerHTML = `<strong style="color:var(--gold)">${planet}</strong> → House ${house}<br><span style="color:var(--teal)">${score}/8</span> · ${quality}`;
    _avargaTooltip.style.display = 'block';
    _avargaTooltip.style.left = (event.pageX + 14) + 'px';
    _avargaTooltip.style.top = (event.pageY + 14) + 'px';
}
function hideAvargaTooltip() {
    if (_avargaTooltip) _avargaTooltip.style.display = 'none';
}

// Drill-down panel for a domain
function openDrilldown(domainId) {
    if (!_chartDataGlobal) return;
    const domain = (_chartDataGlobal.domains || []).find(d => d.domain_id === domainId);
    if (!domain) return;

    const breakdown = domain.score_breakdown || {};
    const bav = domain.bav_breakdown || {};

    document.getElementById('drilldown-content').innerHTML = `
        <h3 class="dd-title">${domain.domain_name} <span class="dd-sanskrit">${domain.sanskrit}</span></h3>
        <p class="dd-desc">${domain.description}</p>
        <div class="dd-score-big">Score: <span style="color:var(--gold)">${domain.score}</span>/100</div>

        <h4 class="dd-section-title">Score Breakdown</h4>
        <div class="dd-breakdown">
            <div class="dd-row"><span>Ashtakavarga (40%)</span><span style="color:var(--teal)">${breakdown.sav} pts</span></div>
            <div class="dd-row"><span>House lord dignity (20%)</span><span style="color:var(--teal)">${breakdown.dignity} pts</span></div>
            <div class="dd-row"><span>Divisional confirmation (15%)</span><span style="color:var(--teal)">${breakdown.divisional} pts</span></div>
            <div class="dd-row"><span>Dasha activation (15%)</span><span style="color:var(--teal)">${breakdown.dasha} pts</span></div>
            <div class="dd-row"><span>Aspect balance (10%)</span><span style="color:var(--teal)">${breakdown.aspects} pts</span></div>
        </div>

        <h4 class="dd-section-title">Planetary Votes for House ${domain.house}</h4>
        <div class="dd-bav-row">
            ${Object.entries(bav).map(([p, s]) => `
                <div class="dd-bav-cell ${s >= 6 ? 'bav-gold' : s >= 4 ? 'bav-teal' : s >= 2 ? 'bav-amber' : 'bav-red'}">
                    <div class="dd-planet">${p}</div>
                    <div class="dd-bav-score">${s}/8</div>
                </div>`).join('')}
        </div>

        <div class="dd-lord">
            House lord: <span style="color:var(--gold)">${domain.house_lord}</span>
            · Dignity: <span style="color:var(--teal)">${domain.house_lord_dignity}</span>
            · SAV: <span style="color:var(--gold)">${domain.sav_score}/56</span>
        </div>
    `;
    document.getElementById('drilldown-overlay').style.display = 'flex';
    gsap.fromTo('#drilldown-panel', { x: 80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' });
}

function closeDrilldown() {
    gsap.to('#drilldown-panel', {
        x: 80, opacity: 0, duration: 0.3, ease: 'power2.in',
        onComplete: () => { document.getElementById('drilldown-overlay').style.display = 'none'; }
    });
}

// Called from runRevealAnimation to trigger dashboard after orrery
function triggerDashboard(chartData) {
    showDomainDashboard(chartData);
    const layer = document.getElementById('dashboard-layer');
    gsap.from(layer, { y: 80, opacity: 0, duration: 1.2, ease: 'power2.out' });
}

function loadScript(src, callback) {
    const s = document.createElement('script');
    s.src = src;
    s.onload = callback;
    document.head.appendChild(s);
}

function resetJyotish() {
    // Stop any active speech
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    _councilSpeaking = false;
    _chartDataGlobal = null;
    _activePlanet = null;
    _activeDomain = null;

    // Hide all layers
    ['orrery-layer', 'dashboard-layer', 'council-layer'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // Clear dashboard so it rebuilds fresh next time
    const dash = document.getElementById('dashboard-layer');
    if (dash) dash.innerHTML = '';

    // Show intake form
    const intake = document.getElementById('jyotish-intake');
    if (intake) intake.style.display = 'block';

    // Reset form fields
    const form = document.getElementById('astrology-birth-form');
    if (form) form.reset();
    const btn = form ? form.querySelector('button[type="submit"]') : null;
    if (btn) { btn.innerHTML = 'Compute Chart'; btn.disabled = false; }

    // Scroll to top of content
    window.scrollTo(0, 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACT THREE — PLANETARY COUNCIL
// ═══════════════════════════════════════════════════════════════════════════════

const PLANET_META = {
    Sun:     { glyph: '☉', color: '#C9A84C', gender: 'male',    speech: { pitch: 0.75, rate: 0.88 } },
    Moon:    { glyph: '☽', color: '#8888BB', gender: 'female',  speech: { pitch: 1.25, rate: 0.90 } },
    Mars:    { glyph: '♂', color: '#FF6B6B', gender: 'male',    speech: { pitch: 0.82, rate: 1.08 } },
    Mercury: { glyph: '☿', color: '#4ECDC4', gender: 'neutral', speech: { pitch: 1.10, rate: 1.15 } },
    Jupiter: { glyph: '♃', color: '#6BCB77', gender: 'male',    speech: { pitch: 0.68, rate: 0.80 } },
    Venus:   { glyph: '♀', color: '#F472B6', gender: 'female',  speech: { pitch: 1.35, rate: 0.93 } },
    Saturn:  { glyph: '♄', color: '#94A3B8', gender: 'neutral', speech: { pitch: 0.58, rate: 0.72 } },
    Rahu:    { glyph: '☊', color: '#7B2FBE', gender: 'male',    speech: { pitch: 0.88, rate: 0.93 } },
    Ketu:    { glyph: '☋', color: '#2F4858', gender: 'neutral', speech: { pitch: 1.00, rate: 0.63 } },
};

const DOMAIN_NAMES = {
    dharma: 'Dharma & Purpose', wealth: 'Wealth & Accumulation',
    siblings: 'Siblings & Courage', home: 'Home & Roots',
    children: 'Children & Creativity', health: 'Health & Service',
    marriage: 'Marriage & Partnership', transformation: 'Transformation',
    fortune: 'Fortune & Higher Learning', career: 'Career & Status',
    gains: 'Gains & Networks', liberation: 'Liberation',
};

let _activePlanet = null;
let _activeDomain = null;
let _councilSpeaking = false;

function buildCouncilSection(container) {
    const planets = Object.keys(PLANET_META);
    const domains = Object.keys(DOMAIN_NAMES);

    const html = `
    <div class="council-section">
        <div class="council-header-block">
            <h3 class="council-title">The Planetary Council</h3>
            <p class="council-sub">Select a life domain, then choose a planet to hear its voice. Or ask two planets to debate.</p>
        </div>

        <div class="council-domain-pills" id="council-domain-pills">
            ${domains.map(d => `<button class="domain-pill" data-domain="${d}" onclick="selectCouncilDomain('${d}')">${DOMAIN_NAMES[d]}</button>`).join('')}
        </div>

        <div class="council-planet-arc" id="council-planet-arc">
            ${planets.map(p => `
            <button class="planet-glyph" data-planet="${p}" onclick="selectCouncilPlanet('${p}')"
                style="--planet-color: ${PLANET_META[p].color}">
                <span class="planet-symbol">${PLANET_META[p].glyph}</span>
                <span class="planet-label">${p}</span>
            </button>`).join('')}
        </div>

        <div class="council-actions" id="council-actions" style="display:none;">
            <button class="council-btn speak-btn" onclick="invokePlanetSpeak()">Hear this planet speak</button>
            <button class="council-btn debate-btn" onclick="openDebateSelector()">Ask two planets to debate</button>
        </div>

        <div class="council-question-wrap" id="council-question-wrap" style="display:none;">
            <input class="council-question-input" id="council-question"
                placeholder="Ask a question, or leave blank for an open reading…" type="text">
        </div>

        <div class="council-speech-area" id="council-speech-area"></div>

        <div class="debate-selector" id="debate-selector" style="display:none;">
            <p class="debate-selector-label">Choose a second planet to debate</p>
            <div class="debate-planet-row">
                ${planets.map(p => `<button class="planet-glyph small" data-planet="${p}" onclick="invokePlanetDebate('${p}')"
                    style="--planet-color: ${PLANET_META[p].color}">
                    ${PLANET_META[p].glyph} <span style="font-size:0.7rem">${p}</span>
                </button>`).join('')}
            </div>
        </div>
    </div>`;

    container.insertAdjacentHTML('beforeend', html);
}

function selectCouncilDomain(domainId) {
    _activeDomain = domainId;
    document.querySelectorAll('.domain-pill').forEach(el => el.classList.remove('active'));
    document.querySelector(`.domain-pill[data-domain="${domainId}"]`).classList.add('active');
    checkCouncilReady();
}

function selectCouncilPlanet(planetName) {
    _activePlanet = planetName;
    document.querySelectorAll('.planet-glyph').forEach(el => el.classList.remove('active'));
    document.querySelectorAll(`.planet-glyph[data-planet="${planetName}"]`).forEach(el => el.classList.add('active'));
    checkCouncilReady();
}

function checkCouncilReady() {
    const actions = document.getElementById('council-actions');
    const qWrap = document.getElementById('council-question-wrap');
    if (_activePlanet && _activeDomain) {
        actions.style.display = 'flex';
        qWrap.style.display = 'block';
    }
}

async function invokePlanetSpeak() {
    if (!_activePlanet || !_activeDomain || !_chartDataGlobal || _councilSpeaking) return;
    _councilSpeaking = true;
    document.getElementById('debate-selector').style.display = 'none';

    const question = document.getElementById('council-question').value;
    const area = document.getElementById('council-speech-area');
    area.innerHTML = buildSpeechCard(_activePlanet, '', true);

    try {
        const res = await fetch(`${API_BASE}/api/planet/speak`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                planet: _activePlanet,
                chart: _chartDataGlobal,
                domain: _activeDomain,
                question: question,
            }),
        });
        if (!res.ok) throw new Error('API error');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        const textEl = document.getElementById(`speech-text-${_activePlanet}`);
        const loaderEl = document.getElementById(`speech-loader-${_activePlanet}`);
        if (loaderEl) loaderEl.remove();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value, { stream: true });
            if (textEl) textEl.textContent = fullText;
        }

        // Speak aloud
        speakAloud(fullText, _activePlanet);

    } catch (err) {
        const textEl = document.getElementById(`speech-text-${_activePlanet}`);
        if (textEl) textEl.textContent = 'The planet is silent right now. Please try again.';
        console.error(err);
    }
    _councilSpeaking = false;
}

function openDebateSelector() {
    const sel = document.getElementById('debate-selector');
    sel.style.display = sel.style.display === 'none' ? 'block' : 'none';
}

async function invokePlanetDebate(secondPlanet) {
    if (!_activePlanet || !_activeDomain || !_chartDataGlobal || _councilSpeaking) return;
    if (secondPlanet === _activePlanet) return;
    _councilSpeaking = true;
    document.getElementById('debate-selector').style.display = 'none';

    const question = document.getElementById('council-question').value;
    const area = document.getElementById('council-speech-area');
    area.innerHTML = `<div class="debate-loading">Summoning the council…<span class="blink">▋</span></div>`;

    try {
        const res = await fetch(`${API_BASE}/api/planet/debate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                planet_a: _activePlanet,
                planet_b: secondPlanet,
                chart: _chartDataGlobal,
                domain: _activeDomain,
                question: question,
            }),
        });
        const data = await res.json();
        area.innerHTML = `
            <div class="debate-pair">
                ${buildSpeechCard(data.planet_a, data.response_a, false)}
                ${buildSpeechCard(data.planet_b, data.response_b, false)}
            </div>`;
        gsap.from('.speech-card', { y: 30, opacity: 0, duration: 0.6, stagger: 0.2, ease: 'power2.out' });
    } catch (err) {
        area.innerHTML = '<div class="council-error">The debate could not be summoned. Please try again.</div>';
        console.error(err);
    }
    _councilSpeaking = false;
}

function buildSpeechCard(planetName, text, loading) {
    const meta = PLANET_META[planetName] || {};
    return `
    <div class="speech-card" id="speech-card-${planetName}" style="border-color: ${meta.color}40">
        <div class="speech-card-header" style="color: ${meta.color}">
            <span class="speech-glyph">${meta.glyph || ''}</span>
            <span class="speech-planet-name">${planetName}</span>
            ${!loading ? `<button class="speak-aloud-btn" onclick="speakAloud(document.getElementById('speech-text-${planetName}').textContent, '${planetName}')" title="Speak aloud">🔊</button>` : ''}
        </div>
        <div class="speech-text" id="speech-text-${planetName}">
            ${loading ? `<span id="speech-loader-${planetName}" class="speech-loader">…</span>` : text}
        </div>
    </div>`;
}

// Web Speech API — gendered voice selection per planet
const _MALE_VOICE_HINTS   = ['david', 'mark', 'james', 'fred', 'alex', 'george', 'paul', 'daniel', 'ryan', 'guy', 'rishi', 'liam', 'eric'];
const _FEMALE_VOICE_HINTS = ['zira', 'susan', 'linda', 'jenny', 'natasha', 'samantha', 'victoria', 'kate', 'emily', 'tessa', 'libby', 'hazel', 'aria', 'sonia', 'ava'];

function _pickVoice(gender) {
    const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
    if (gender === 'male') {
        return voices.find(v => _MALE_VOICE_HINTS.some(h => v.name.toLowerCase().includes(h)))
            || voices.find(v => v.name.toLowerCase().includes('male'))
            || voices[0];
    }
    if (gender === 'female') {
        return voices.find(v => _FEMALE_VOICE_HINTS.some(h => v.name.toLowerCase().includes(h)))
            || voices.find(v => v.name.toLowerCase().includes('female'))
            || voices[0];
    }
    return voices[0]; // neutral — any English voice
}

function speakAloud(text, planetName) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const meta = PLANET_META[planetName] || {};
    const profile = meta.speech || { pitch: 1, rate: 1 };
    utter.pitch = profile.pitch;
    utter.rate  = profile.rate;

    const trySpeak = () => {
        const voice = _pickVoice(meta.gender || 'neutral');
        if (voice) utter.voice = voice;
        window.speechSynthesis.speak(utter);
    };

    // Voices may not be loaded yet on first call
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        trySpeak();
    } else {
        window.speechSynthesis.onvoiceschanged = () => { trySpeak(); };
    }
}
