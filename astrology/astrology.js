const API_BASE = "https://jyotish-api-wml3.onrender.com";
let selectedCityData = null;

function astrologyInit() {
    if (typeof gsap === 'undefined') console.error("GSAP not loaded yet.");

    // Flatpickr
    flatpickr("#astro-dob", { dateFormat: "Y-m-d", theme: "dark" });
    flatpickr("#astro-tob", { enableTime: true, noCalendar: true, dateFormat: "H:i", time_24hr: false, theme: "dark" });

    // City Autocomplete
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
            btn.textContent = "Computing Cosmos...";
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
                startOrreryReveal(chartData);

            } catch (err) {
                console.error(err);
                alert("Error computing chart. Ensure backend is live.");
                btn.textContent = "Compute Chart";
                btn.disabled = false;
            }
        });
    }
}

function startOrreryReveal(chart) {
    document.getElementById('jyotish-intake').style.display = 'none';
    const orreryLayer = document.getElementById('orrery-layer');
    orreryLayer.style.display = 'flex';
    orreryLayer.style.flexDirection = 'column';
    orreryLayer.style.alignItems = 'center';
    orreryLayer.style.justifyContent = 'center';
    orreryLayer.style.height = 'calc(100vh - 80px)';
    orreryLayer.style.overflow = 'hidden';

    document.getElementById('orrery-title').style.opacity = '0';
    document.getElementById('orrery-title').style.position = 'absolute';
    document.getElementById('orrery-title').style.bottom = '10%';
    document.getElementById('orrery-title').style.width = '100%';
    document.getElementById('orrery-title').style.textAlign = 'center';
    document.getElementById('orrery-title').style.fontFamily = 'Cinzel';
    document.getElementById('orrery-title').style.color = 'var(--text-primary)';
    document.getElementById('orrery-title').style.fontSize = '1.2rem';
    document.getElementById('orrery-title').style.zIndex = '10';

    drawOrrerySVG(chart);
    runRevealAnimation(chart);
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

    // 1. ASTROLOGICAL ZODIAC WHEEL (Act 1 elements)
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

    // 2. SOUTH INDIAN CHART GRID (Act 2 elements - initially invisible)
    const gridSize = 480;
    const boxW = gridSize / 4; 
    const bx = cx - gridSize/2;
    const by = cy - gridSize/2;
    
    // South Indian array matching 0=Aries...11=Pisces
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

    // 3. PLANETARY IMAGES (Start on the Orrery, transform to South Indian)
    const planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
    
    // Distribute planets in South Indian chart neatly
    let rashiCounts = {};
    planets.forEach(p => {
        let rashi = (p==="Rahu" || p==="Ketu") ? chart.planets[p].rashi_num : chart.planets[p].rashi_num;
        rashiCounts[rashi] = (rashiCounts[rashi] || 0) + 1;
    });
    
    // Track lagna position for the SI chart
    let lagnaRashi = chart.lagna.rashi_num;
    let [lCol, lRow] = siCoords[lagnaRashi];
    html += `<text id="si-lagna-text" class="si-label" x="${bx + lCol*boxW + boxW/2}" y="${by + lRow*boxW + boxW/2}" font-size="20" fill="var(--teal)" text-anchor="middle" dominant-baseline="middle" opacity="0">ASC</text>`;

    let currentRashiPos = {};
    
    // Draw actual planet images
    planets.forEach(p => {
        // Initial Orrery coordinates
        let long = chart.planets[p].longitude;
        let angle = long - 90;
        let pr = r - 50; 
        let px = cx + pr * Math.cos(angle * Math.PI/180);
        let py = cy + pr * Math.sin(angle * Math.PI/180);
        
        // Final South Indian chart coordinates
        let rashi = chart.planets[p].rashi_num;
        let [col, row] = siCoords[rashi];
        let targetX = bx + col * boxW + boxW/2;
        let targetY = by + row * boxW + boxW/2;
        
        // Spread them out if they share a box
        let total = rashiCounts[rashi];
        let pIdx = currentRashiPos[rashi] || 0;
        currentRashiPos[rashi] = pIdx + 1;
        
        if (total > 1 && total <= 4) {
            let offset = 22;
            let corners = [[-1,-1], [1,-1], [-1,1], [1,1]];
            targetX += corners[pIdx % 4][0] * offset;
            targetY += corners[pIdx % 4][1] * offset;
        } else if (total > 4) {
            let pAngle = (pIdx / total) * 360;
            targetX += 28 * Math.cos(pAngle * Math.PI/180);
            targetY += 28 * Math.sin(pAngle * Math.PI/180);
        }

        // Add to DOM. Size: 40x40. Centered cleanly.
        html += `
            <g id="planet-g-${p}" transform="translate(${px}, ${py})" data-tx="${targetX}" data-ty="${targetY}">
                <image class="planet-img" href="astrology/assets/planets/${p}.jpg" x="-20" y="-20" width="40" height="40" opacity="0" />
            </g>
        `;
    });

    svg.innerHTML = html;
}

function runRevealAnimation(chart) {
    const tl = gsap.timeline();
    
    // 0.0s to 12.0s: Orrery Creation
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
        
        // Materialize image
        tl.to(`#planet-g-${p} .planet-img`, { opacity: p === "Ketu" ? 0.8 : 1, duration: 0.6 }, startTime);
        
        // Initial swoop to orbit (we simulate it by animating from center, meaning transform was initially zeroed and now we restore its position.. wait, the <g> is ALREADY at px,py. Let's make it start from center.)
        tl.from(`#planet-g-${p}`, {
            x: 500, 
            y: 500, 
            duration: 1.0, 
            ease: "back.out(1.2)"
        }, startTime);
    });

    // 14s: Nakshatra text
    tl.to("#orrery-title", { opacity: 0, duration: 0.5 }, 14.0);
    tl.call(() => {
        document.getElementById("orrery-title").innerHTML = `
            <div style="font-family:'Cinzel'; font-size:24px; color:var(--gold);">${chart.planets.Moon.nakshatra}</div>
            <div style="font-family:'Crimson Pro'; font-size:16px;">Pada ${chart.planets.Moon.pada}</div>
        `;
    }, null, 14.5);
    tl.to("#orrery-title", { opacity: 1, duration: 1 }, 14.5);
    
    tl.call(() => {
        document.getElementById("orrery-title").innerHTML += `<div style="margin-top:10px; color:var(--teal); font-family:'JetBrains Mono';">Current Dasha: ${chart.dasha.lord}</div>`;
    }, null, 17.0);
    
    // 19.5s -> TRANSFORMATION TO SOUTH INDIAN CHART!
    tl.to("#orrery-title", { opacity: 0, duration: 0.5 }, 19.0);
    tl.call(() => {
        document.getElementById("orrery-title").innerHTML = `The South Indian Matrix Unfolds...`;
    }, null, 19.5);
    tl.to("#orrery-title", { opacity: 1, duration: 2 }, 19.5);

    // Fade out circular lines
    tl.to(['#wheel-ring', '.zodiac-div', '.zodiac-label', '#lagna-marker'], { opacity: 0, duration: 1.5, ease: "power2.inOut" }, 19.5);
    
    // Fade in South Indian boxes
    tl.to('.si-box', { opacity: 1, duration: 1.5, stagger: 0.05, ease: "power2.out" }, 19.5);
    tl.to('.si-label', { opacity: 1, duration: 2 }, 20.0);
    tl.to('#si-lagna-text', { opacity: 1, duration: 1.5, scale: 1.2, yoyo: true, repeat: 1 }, 20.5);
    
    // Translate planets to grid coordinates
    planets.forEach((p) => {
        let el = document.querySelector(`#planet-g-${p}`);
        let tx = parseFloat(el.dataset.tx);
        let ty = parseFloat(el.dataset.ty);
        // Animate translate safely
        tl.to(`#planet-g-${p}`, {
            x: tx,
            y: ty,
            duration: 2.5,
            ease: "circ.inOut"
        }, 19.5);
    });

}
