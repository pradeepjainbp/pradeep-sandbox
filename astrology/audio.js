window.AudioEngine = (function() {
    let ctx = null;
    let masterGain = null;

    function init() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = ctx.createGain();
            masterGain.gain.value = 0.4;
            masterGain.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') ctx.resume();
    }

    function playElement(element) {
        if(!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);

        let now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

        if (element === 'Fire') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(55, now);
        } else if (element === 'Water') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(110, now);
        } else if (element === 'Air') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, now);
        } else if (element === 'Earth') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(65, now);
        }
        osc.start(now);
        osc.stop(now + 1.5);
    }

    function playPlanet(planet) {
        if(!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);

        let now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);

        const freqs = {
            'Sun': 261.63, 
            'Moon': 329.63, 
            'Mars': 196.00, 
            'Mercury': 392.00, 
            'Jupiter': 130.81, 
            'Venus': 440.00, 
            'Saturn': 98.00, 
            'Rahu': 110.00, 
            'Ketu': 880.00 
        };
        osc.type = (planet === 'Sun' || planet === 'Jupiter' || planet === 'Moon' || planet === 'Venus') ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freqs[planet] || 440, now);
        
        osc.start(now);
        osc.stop(now + 2.0);
    }

    return {
        init,
        playElement,
        playPlanet,
        playMix: function(planet, element) {
            init();
            playElement(element);
            setTimeout(() => playPlanet(planet), 200);
        }
    };
})();
