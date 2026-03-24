// ── ABOUT PAGE — Data Visualisation ──

function drawDonut(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.offsetWidth || 200;
  const cssH = canvas.offsetHeight || 200;
  canvas.width  = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = cssW / 2, cy = cssH / 2;
  const outer = Math.min(cssW, cssH) * 0.44;
  const inner = Math.min(cssW, cssH) * 0.28;

  const segments = [
    { value: 30, color: '#6366F1' },
    { value: 25, color: '#10B981' },
    { value: 20, color: '#F59E0B' },
    { value: 15, color: '#2563EB' },
    { value: 10, color: '#EC4899' },
  ];

  let startAngle = -Math.PI / 2;
  const gap = 0.03;

  segments.forEach(seg => {
    const sweep = (seg.value / 100) * Math.PI * 2 - gap;
    ctx.beginPath();
    ctx.arc(cx, cy, outer, startAngle, startAngle + sweep);
    ctx.arc(cx, cy, inner, startAngle + sweep, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    startAngle += sweep + gap;
  });

  // Centre label
  const fs = Math.round(cssW * 0.115);
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font         = `900 ${fs}px Fraunces, serif`;
  ctx.fillStyle    = '#0A0F1E';
  ctx.fillText('A Day', cx, cy - fs * 0.5);
  ctx.font      = `400 ${Math.round(cssW * 0.07)}px Sora, sans-serif`;
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('in my life', cx, cy + fs * 0.55);
}

function aboutInit() {
  setTimeout(() => {
    drawDonut('time-donut');
  }, 80);
}
