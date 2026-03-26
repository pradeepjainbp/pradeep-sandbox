const API_BASE = "https://jyotish-api-wml3.onrender.com";

function astrologyInit() {
    if (typeof gsap === 'undefined') {
        console.error("GSAP not loaded yet.");
    }

    const form = document.getElementById('astrology-birth-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('.jyotish-btn');
            btn.textContent = "Computing Cosmos...";
            btn.disabled = true;

            try {
                const city = document.getElementById('astro-city').value;
                const dob = document.getElementById('astro-dob').value;
                const tob = document.getElementById('astro-tob').value;

                const geoRes = await fetch(`${API_BASE}/api/geocode?city=${encodeURIComponent(city)}`);
                const geoData = await geoRes.json();
                
                if (geoData.error) {
                    alert("City not found. Try again.");
                    btn.textContent = "Compute Chart";
                    btn.disabled = false;
                    return;
                }

                const [year, month, day] = dob.split('-').map(Number);
                const [hour, minute] = tob.split(':').map(Number);

                const chartPayload = {
                    year, month, day, hour, minute,
                    lat: geoData.lat, lon: geoData.lon, timezone: geoData.timezone
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

    document.getElementById('orrery-title').style.opacity = '0';
    document.getElementById('orrery-title').style.position = 'absolute';
    document.getElementById('orrery-title').style.bottom = '10%';
    document.getElementById('orrery-title').style.width = '100%';
    document.getElementById('orrery-title').style.textAlign = 'center';
    document.getElementById('orrery-title').style.fontFamily = 'Cinzel';
    document.getElementById('orrery-title').style.color = 'var(--text-primary)';
    document.getElementById('orrery-title').style.fontSize = '1.2rem';

    drawOrrerySVG(chart);
    runRevealAnimation(chart);
}

function drawOrrerySVG(chart) {
    const svg = document.getElementById('zodiac-wheel');
    svg.style.width = '600px';
    svg.style.height = '600px';
    svg.style.overflow = 'visible';

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
            <text class="zodiac-label" x="${tx}" y="${ty}" fill="var(--gold)" font-family="Cinzel" font-size="16" text-anchor="middle" dominant-baseline="middle" opacity="0">${rashiNames[i]}</text>
        `;
    }

    let lagnaAngle = (chart.lagna.longitude) - 90;
    let lx = cx + r * Math.cos(lagnaAngle * Math.PI/180);
    let ly = cy + r * Math.sin(lagnaAngle * Math.PI/180);
    html += `<circle id="lagna-marker" cx="${lx}" cy="${ly}" r="8" fill="var(--teal)" opacity="0" filter="url(#glow)" />`;

    const planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
    const glyphs = {Sun:"☉", Moon:"☽", Mars:"♂", Mercury:"☿", Jupiter:"♃", Venus:"♀", Saturn:"♄", Rahu:"☊", Ketu:"☋"};
    const colors = {Rahu:"var(--rahu-color)", Ketu:"var(--ketu-color)"};
    
    planets.forEach(p => {
        let long = chart.planets[p].longitude;
        let angle = long - 90;
        let pr = r - 60;
        let px = cx + pr * Math.cos(angle * Math.PI/180);
        let py = cy + pr * Math.sin(angle * Math.PI/180);
        let color = colors[p] || "var(--teal)";
        
        html += `<text class="planet-glyph" id="planet-${p}" x="${cx}" y="${cy}" fill="${color}" font-family="Arial" font-size="28" text-anchor="middle" dominant-baseline="middle" opacity="0" data-x="${px}" data-y="${py}">${glyphs[p]}</text>`;
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
        let startTime = 5.5 + (i * 0.2);
        let el = `#planet-${p}`;
        let pData = document.querySelector(el);
        let tx = parseFloat(pData.dataset.x);
        let ty = parseFloat(pData.dataset.y);
        
        tl.to(el, {
            opacity: p === "Ketu" ? 0.6 : 1, 
            x: tx - 500, 
            y: ty - 500, 
            duration: 0.6, 
            ease: "back.out(1.7)"
        }, startTime);
    });

    tl.to("#orrery-title", { opacity: 0, duration: 0.5 }, 12.0);
    tl.call(() => {
        document.getElementById("orrery-title").innerHTML = `
            <div style="font-family:'Cinzel'; font-size:24px; color:var(--gold);">${chart.planets.Moon.nakshatra}</div>
            <div style="font-family:'Crimson Pro'; font-size:16px;">Pada ${chart.planets.Moon.pada}</div>
        `;
    }, null, 12.5);
    tl.to("#orrery-title", { opacity: 1, duration: 1 }, 12.5);
    
    tl.call(() => {
        document.getElementById("orrery-title").innerHTML += `<div style="margin-top:10px; color:var(--teal); font-family:'JetBrains Mono';">Current Dasha: ${chart.dasha.lord}</div>`;
    }, null, 16.0);
    
    tl.to("#orrery-layer", { opacity: 0.3, duration: 1.5, scale: 0.8, y: -100 }, 18.0);
    tl.to("#dashboard-layer", { display: "block", y: -50, opacity: 1, duration: 1.5 }, 18.0);
}
