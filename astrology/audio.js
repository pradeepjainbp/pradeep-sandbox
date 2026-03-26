window.AudioEngine = (function() {
    let ctx = null;
    let masterGain = null;

    function init() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = ctx.createGain();
            masterGain.gain.value = 0.6;
            masterGain.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') ctx.resume();
    }

    function createNoise(type) {
        const bufferSize = ctx.sampleRate * 5; 
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            let white = Math.random() * 2 - 1;
            if (type === 'white') {
                data[i] = white;
            } else if (type === 'pink') {
                data[i] = (lastOut + (0.02 * white)) / 1.02; 
                lastOut = data[i];
                data[i] *= 3.5;
            }
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        return noise;
    }

    function playSignAmbiance(rashiNum) {
        if (!ctx) return;
        const gain = ctx.createGain();
        gain.connect(masterGain);
        let now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.5);
        gain.gain.linearRampToValueAtTime(0, now + 4);

        if ([3, 7, 11].includes(rashiNum)) { 
            const noise = createNoise('white');
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.Q.value = 0.5;
            if (rashiNum === 3) filter.frequency.value = 800; // Cancer (Pond)
            if (rashiNum === 7) filter.frequency.value = 300; // Scorpio (Lake)
            if (rashiNum === 11) filter.frequency.value = 80; // Pisces (Deep Ocean)
            noise.connect(filter); filter.connect(gain);
            noise.start(now); noise.stop(now+4);
        }
        else if ([0, 4, 8].includes(rashiNum)) {
            const noise = createNoise('pink');
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.Q.value = 3;
            if (rashiNum === 0) filter.frequency.value = 1200; // Aries (Spark)
            if (rashiNum === 4) filter.frequency.value = 400; // Leo (Roar)
            if (rashiNum === 8) filter.frequency.value = 800; // Sag (Wildfire)
            noise.connect(filter); filter.connect(gain);
            noise.start(now); noise.stop(now+4);
        }
        else if ([2, 6, 10].includes(rashiNum)) { 
            const noise = createNoise('pink');
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.Q.value = 2;
            if (rashiNum === 2) filter.frequency.value = 2500; // Gemini (Breeze)
            if (rashiNum === 6) filter.frequency.value = 1200; // Libra (Steady Air)
            if (rashiNum === 10) filter.frequency.value = 300; // Aqua (Deep Gale)
            noise.connect(filter); filter.connect(gain);
            noise.start(now); noise.stop(now+4);
        }
        else if ([1, 5, 9].includes(rashiNum)) { 
            const osc = ctx.createOscillator();
            osc.connect(gain);
            osc.type = 'triangle';
            if (rashiNum === 1) osc.frequency.value = 80; // Taurus
            if (rashiNum === 5) osc.frequency.value = 60; // Virgo
            if (rashiNum === 9) osc.frequency.value = 40; // Capricorn
            osc.start(now); osc.stop(now+4);
        }
    }

    function playInterplanetaryReaction(planet, rashiNum) {
        if (!ctx) return;
        const pNatures = {
            'Sun': 'Hot', 'Mars': 'Hot', 'Ketu': 'Hot',
            'Moon': 'ColdWater', 'Venus': 'ColdWater', 
            'Saturn': 'ColdRock', 'Rahu': 'ColdRock',
            'Mercury': 'Neutral', 'Jupiter': 'Neutral'
        };
        const rNatures = {
            0:'Fire', 4:'Fire', 8:'Fire',
            3:'Water', 7:'Water', 11:'Water',
            1:'Earth', 5:'Earth', 9:'Earth',
            2:'Air', 6:'Air', 10:'Air'
        };

        let pNat = pNatures[planet];
        let rNat = rNatures[rashiNum];
        
        let now = ctx.currentTime;
        const gain = ctx.createGain();
        gain.connect(masterGain);
        gain.gain.setValueAtTime(0, now);

        if (pNat === 'Hot' && rNat === 'Water') {
            // Steam Sizzle
            gain.gain.linearRampToValueAtTime(0.5, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 2);
            const noise = createNoise('white');
            const hp = ctx.createBiquadFilter();
            hp.type = 'highpass'; hp.frequency.value = 4000; 
            noise.connect(hp); hp.connect(gain);
            noise.start(now); noise.stop(now+2);
        }
        else if (pNat === 'ColdWater' && rNat === 'Fire') {
            // Hissing Evaporation
            gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
            gain.gain.linearRampToValueAtTime(0, now + 1.5);
            const noise = createNoise('pink');
            const dp = ctx.createBiquadFilter();
            dp.type = 'bandpass'; dp.frequency.value = 6000; dp.Q.value = 10;
            noise.connect(dp); dp.connect(gain);
            noise.start(now); noise.stop(now+1.5);
        }
        else if (pNat === 'ColdRock' && rNat === 'Water') {
            // Sploosh / Plunge
            gain.gain.linearRampToValueAtTime(0.8, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1);
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.5); 
            osc.connect(gain); osc.start(now); osc.stop(now+1);
        }
        else {
            // Base Harmony
            gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 3.0);
            const osc = ctx.createOscillator();
            const freqs = { 'Sun': 261.6, 'Moon': 329.6, 'Mars': 196.0, 'Mercury': 392.0, 'Jupiter': 130.8, 'Venus': 440.0, 'Saturn': 98.0, 'Rahu': 110.0, 'Ketu': 880.0 };
            osc.type = (pNat === 'Hot') ? 'sawtooth' : (pNat === 'ColdWater' ? 'sine' : 'triangle');
            osc.frequency.setValueAtTime(freqs[planet] || 440, now);
            osc.connect(gain); osc.start(now); osc.stop(now+3);
        }
    }

    return {
        init,
        playElement: function(rashiNum) {
            init(); 
            playSignAmbiance(parseInt(rashiNum));
        },
        playMix: function(planet, rashiNum) {
            init();
            playSignAmbiance(parseInt(rashiNum));
            setTimeout(() => playInterplanetaryReaction(planet, parseInt(rashiNum)), 100);
        }
    };
})();
