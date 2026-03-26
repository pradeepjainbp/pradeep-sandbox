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

function setupTooltips(chart) {
    const tooltip = document.getElementById('planet-tooltip');
    
    // Setup mapping for planets
    const planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
    planets.forEach(p => {
        let img = document.getElementById(`planet-img-${p}`);
        if (!img) return;
        let data = chart.planets[p];
        img.addEventListener('mouseenter', (e) => {
            tooltip.innerHTML = `
                <div class="tt-title">${p} <span>${data.rashi}</span></div>
                <div>Degree: ${data.degree.toFixed(2)}°</div>
                <div>Nakshatra: ${data.nakshatra} (Pada ${data.pada})</div>
                <div>Speed: ${data.speed.toFixed(2)}°/day ${data.is_retrograde ? '<span style="color:#FF6B6B">(Ret)</span>' : ''}</div>
            `;
            tooltip.style.opacity = 1;
            let tx = e.pageX + 15;
            let ty = e.pageY + 15;
            tooltip.style.left = tx + 'px';
            tooltip.style.top = ty + 'px';
        });
        img.addEventListener('mousemove', (e) => {
            tooltip.style.left = (e.pageX + 15) + 'px';
            tooltip.style.top = (e.pageY + 15) + 'px';
        });
        img.addEventListener('mouseleave', () => {
            tooltip.style.opacity = 0;
        });
        img.style.cursor = 'pointer';
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
        </defs>
        <circle id="center-pulse" cx="${cx}" cy="${cy}" r="4" fill="var(--gold)" opacity="0" />
        <circle id="wheel-ring" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--text-secondary)" stroke-width="1" stroke-dasharray="2200" stroke-dashoffset="2200" />
    `;

    const rashiNames = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
    for(let i=0; i<12; i++) {
        let angle = (i * 30) - 90;
        let rad = angle * Math.PI / 180;
        let x1 = cx + (r-15) * Math.cos(rad);
        let y1 = cy + (r-15) * Math.sin(rad);
        let x2 = cx + (r+15) * Math.cos(rad);
        let y2 = cy + (r+15) * Math.sin(rad);
        let tx = cx + (r+40) * Math.cos(rad + (15 * Math.PI/180));
        let ty = cy + (r+40) * Math.sin(rad + (15 * Math.PI/180));
        html += `
            <line class="zodiac-div" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--text-secondary)" stroke-width="1" opacity="0" />
            <text class="zodiac-label" x="${tx}" y="${ty}" fill="var(--gold)" font-family="Cinzel" font-size="18" text-anchor="middle" dominant-baseline="middle" opacity="0">${rashiNames[i]}</text>
        `;
    }

    let lagnaAngle = (chart.lagna.longitude) - 90;
    let lx = cx + r * Math.cos(lagnaAngle * Math.PI/180);
    let ly = cy + r * Math.sin(lagnaAngle * Math.PI/180);
    html += `<circle id="lagna-marker" cx="${lx}" cy="${ly}" r="8" fill="var(--teal)" opacity="0" filter="url(#glow)" />`;

    // South Indian Grid
    const gridSize = 480;
    const boxW = gridSize / 4; 
    const bx = cx - gridSize/2;
    const by = cy - gridSize/2;
    
    const siCoords = [[1,0], [2,0], [3,0], [3,1], [3,2], [3,3], [2,3], [1,3], [0,3], [0,2], [0,1], [0,0]];
    const siLabels = ["Ar", "Ta", "Ge", "Ca", "Le", "Vi", "Li", "Sc", "Sa", "Cp", "Aq", "Pi"];
    for (let i=0; i<12; i++) {
        let [col, row] = siCoords[i];
        let rcX = bx + col * boxW;
        let rcY = by + row * boxW;
        html += `
            <rect class="si-box" x="${rcX}" y="${rcY}" width="${boxW}" height="${boxW}" />
            <text class="si-label" x="${rcX + 5}" y="${rcY + 18}">${siLabels[i]}</text>
        `;
    }

    // North Indian Grid
    html += `<rect class="ni-line" x="${bx}" y="${by}" width="${gridSize}" height="${gridSize}" />`;
    html += `<line class="ni-line" x1="${bx}" y1="${by}" x2="${bx+gridSize}" y2="${by+gridSize}" />`;
    html += `<line class="ni-line" x1="${bx+gridSize}" y1="${by}" x2="${bx}" y2="${by+gridSize}" />`;
    html += `<polygon class="ni-line" points="${bx+gridSize/2},${by} ${bx+gridSize},${by+gridSize/2} ${bx+gridSize/2},${by+gridSize} ${bx},${by+gridSize/2}" />`;
    
    const niCoords = [
        [240, 120], [120, 40], [40, 120], [120, 240], 
        [40, 360], [120, 440], [240, 360], [360, 440], 
        [440, 360], [360, 240], [440, 120], [360, 40]
    ];
    for(let h=1; h<=12; h++) {
        let [xx, yy] = niCoords[h-1];
        let rashiForHouse = (chart.lagna.rashi_num + h - 1) % 12;
        html += `<text class="ni-label" x="${bx+xx}" y="${by+yy-30}" font-size="14" fill="var(--text-secondary)" text-anchor="middle" opacity="0">${rashiForHouse+1}</text>`;
    }

    let lagnaRashi = chart.lagna.rashi_num;
    let [lCol, lRow] = siCoords[lagnaRashi];
    html += `<text id="si-lagna-text" class="si-label" x="${bx + lCol*boxW + boxW/2}" y="${by + lRow*boxW + boxW/2}" font-size="20" fill="var(--teal)" text-anchor="middle" dominant-baseline="middle" opacity="0">ASC</text>`;
    
    let [nx, ny] = niCoords[0];
    html += `<text id="ni-lagna-text" class="ni-label" x="${bx+nx}" y="${by+ny}" font-size="20" fill="var(--teal)" text-anchor="middle" dominant-baseline="middle" opacity="0">ASC</text>`;

    const planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
    
    // Setup position bounds
    let rashiCounts = {};
    planets.forEach(p => {
        let rashi = (p==="Rahu" || p==="Ketu") ? chart.planets[p].rashi_num : chart.planets[p].rashi_num;
        rashiCounts[rashi] = (rashiCounts[rashi] || 0) + 1;
    });
    
    let currentRashiPos = {};
    planets.forEach(p => {
        let long = chart.planets[p].longitude;
        let angle = long - 90;
        let pr = r - 50;
        let px = cx + pr * Math.cos(angle * Math.PI/180);
        let py = cy + pr * Math.sin(angle * Math.PI/180);
        
        let rashi = chart.planets[p].rashi_num;
        let [col, row] = siCoords[rashi];
        let targetX_si = bx + col * boxW + boxW/2;
        let targetY_si = by + row * boxW + boxW/2;
        
        let house = (rashi - chart.lagna.rashi_num + 12) % 12;
        let [cx_ni, cy_ni] = niCoords[house];
        let targetX_ni = bx + cx_ni;
        let targetY_ni = by + cy_ni;
        
        let total = rashiCounts[rashi];
        let pIdx = currentRashiPos[rashi] || 0;
        currentRashiPos[rashi] = pIdx + 1;
        
        let ox_si = 0, oy_si = 0;
        let ox_ni = 0, oy_ni = 0;
        if (total > 1 && total <= 4) {
            let corners = [[-1,-1], [1,-1], [-1,1], [1,1]];
            ox_si = corners[pIdx % 4][0] * 22;
            oy_si = corners[pIdx % 4][1] * 22;
            ox_ni = corners[pIdx % 4][0] * 22;
            oy_ni = corners[pIdx % 4][1] * 22;
        } else if (total > 4) {
            let pA = (pIdx / total) * 360;
            ox_si = 28 * Math.cos(pA * Math.PI/180);
            oy_si = 28 * Math.sin(pA * Math.PI/180);
            ox_ni = 28 * Math.cos(pA * Math.PI/180);
            oy_ni = 28 * Math.sin(pA * Math.PI/180);
        }

        let ext = (p==="Saturn"||p==="Rahu"||p==="Ketu") ? "png" : "jpg";
        html += `
            <g id="planet-g-${p}" transform="translate(${cx}, ${cy})" data-px="${px}" data-py="${py}" data-txsi="${targetX_si+ox_si}" data-tysi="${targetY_si+oy_si}" data-txni="${targetX_ni+ox_ni}" data-tyni="${targetY_ni+oy_ni}">
                <image id="planet-img-${p}" data-planet="${p}" class="planet-img" href="astrology/assets/planets/${p}.${ext}" x="-25" y="-25" width="50" height="50" opacity="0" />
            </g>
        `;
    });
    svg.innerHTML = html;
}

function runRevealAnimation(chart) {
    const tl = gsap.timeline();
    
    tl.to("#center-pulse", { opacity: 1, scale: 1.5, duration: 1, yoyo: true, repeat: -1 }, 0);
    tl.to("#om-symbol", { opacity: 0.15, duration: 2 }, 0.8);
    tl.to("#orrery-title", { opacity: 1, duration: 1 }, 1.5);
    tl.to("#wheel-ring", { strokeDashoffset: 0, duration: 2, ease: "power2.inOut" }, 2.5);
    tl.to(".zodiac-div", { opacity: 1, duration: 0.5, stagger: 0.1 }, 2.5);
    tl.to(".zodiac-label", { opacity: 1, duration: 0.5, stagger: 0.1 }, 2.5);
    
    tl.to("#lagna-marker", { opacity: 1, duration: 0.2, scale: 1.5, yoyo: true, repeat: 1 }, 4.5);
    tl.set("#lagna-marker", { opacity: 1 }, 4.7);
    tl.call(() => {
        document.getElementById("orrery-title").innerHTML = `<span style="color:var(--gold);">Lagna: ${chart.lagna.rashi}</span> <span style="color:var(--teal); font-family:'JetBrains Mono';">${chart.lagna.degree.toFixed(2)}°</span>`;
    }, null, 4.5);
    
    const planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
    planets.forEach((p, i) => {
        let startTime = 5.5 + (i * 0.3);
        let el = document.querySelector(`#planet-g-${p}`);
        let px = parseFloat(el.dataset.px);
        let py = parseFloat(el.dataset.py);
        
        tl.to(`#planet-img-${p}`, { opacity: p === "Ketu" ? 0.8 : 1, duration: 0.6 }, startTime);
        tl.to(`#planet-g-${p}`, {
            x: px,
            y: py,
            duration: 1.0, 
            ease: "back.out(1.2)"
        }, startTime);
    });

    tl.to("#orrery-title", { opacity: 0, duration: 0.5 }, 14.0);
    tl.call(() => {
        document.getElementById("orrery-title").innerHTML = `<div style="font-family:'Cinzel'; font-size:28px; color:var(--gold);">${chart.planets.Moon.nakshatra}</div><div style="font-family:'Crimson Pro'; font-size:18px;">Pada ${chart.planets.Moon.pada}</div>`;
    }, null, 14.5);
    tl.to("#orrery-title", { opacity: 1, duration: 1 }, 14.5);
    
    // Final morph buttons & Panchanga Typweriter
    tl.to("#orrery-title", { opacity: 0, duration: 0.5 }, 17.5);
    tl.to("#chart-controls", { display: "flex", opacity: 1, duration: 1 }, 18.0);
    tl.to("#panchanga-panel", { display: "block", opacity: 1, duration: 0.2 }, 18.0);
    
    let fullText = `<b>PANCHANGA VITALS</b><br><br><span style="color:var(--teal)">Lagna:</span> ${chart.lagna.rashi} (${chart.lagna.degree.toFixed(2)}°)<br><span style="color:var(--teal)">Moon Rashi:</span> ${chart.planets.Moon.rashi}<br><span style="color:var(--teal)">Moon Nakshatra:</span> ${chart.planets.Moon.nakshatra} (Pada ${chart.planets.Moon.pada})<br><br><span style="color:var(--teal)">Mahadasha at Birth:</span><br>${chart.dasha.lord} (${chart.dasha.total_period_years}y)<br><br><i style="color:var(--text-secondary);font-size:0.8rem;">Select Matrix Format Below</i>`;
    tl.to("#panchanga-panel", { 
        duration: 3, 
        text: { value: fullText }, 
        ease: "none"
    }, 18.2);

    setupMorphButtons(chart);
}

function setupMorphButtons(chart) {
    const btnS = document.getElementById('btn-south');
    const btnN = document.getElementById('btn-north');
    
    btnS.addEventListener('click', () => morphToGrid(chart, 'south'));
    btnN.addEventListener('click', () => morphToGrid(chart, 'north'));
}

function morphToGrid(chart, type) {
    const tl = gsap.timeline();
    tl.to("#chart-controls", { opacity: 0, duration: 0.5, onComplete: () => document.getElementById("chart-controls").style.display='none' }, 0);
    tl.to(['#wheel-ring', '.zodiac-div', '.zodiac-label', '#lagna-marker'], { opacity: 0, duration: 1.0, ease: "power2.inOut" }, 0);
    
    if (type === 'south') {
        tl.to('.si-box', { opacity: 1, duration: 1.0, stagger: 0.05, ease: "power2.out" }, 0.5);
        tl.to('.si-label', { opacity: 1, duration: 1.5 }, 1.0);
        tl.to('#si-lagna-text', { opacity: 1, duration: 1.0, scale: 1.2, yoyo: true, repeat: 1 }, 1.5);
    } else {
        tl.to('.ni-line', { opacity: 1, duration: 1.0, stagger: 0.1, ease: "power2.out" }, 0.5);
        tl.to('.ni-label', { opacity: 1, duration: 1.5 }, 1.0);
        tl.to('#ni-lagna-text', { opacity: 1, duration: 1.0, scale: 1.2, yoyo: true, repeat: 1 }, 1.5);
    }

    const planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
    planets.forEach((p) => {
        let el = document.querySelector(`#planet-g-${p}`);
        let tx = parseFloat(type === 'south' ? el.dataset.txsi : el.dataset.txni);
        let ty = parseFloat(type === 'south' ? el.dataset.tysi : el.dataset.tyni);
        tl.to(`#planet-g-${p}`, { x: tx, y: ty, duration: 2.0, ease: "circ.inOut" }, 0.5);
    });
}
