// ── TAB SWITCHER WITH LAZY LOADING ──
const _tabCache = {};
const _tabAssetsLoaded = new Set();

async function switchTab(name, preserveHash = false) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector('[data-tab="' + name + '"]');
  if (btn) btn.classList.add('active');
  
  if (!preserveHash) {
    history.replaceState(null, '', '#' + name);
  }

  const content = document.getElementById('content');

  // If already cached, re-attach and re-init
  if (_tabCache[name]) {
    content.innerHTML = '';
    content.appendChild(_tabCache[name]);
    const fn = window[name + 'Init'];
    if (typeof fn === 'function') fn();
    window.scrollTo(0, 0);
    return;
  }

  content.innerHTML = '<div class="tab-loading">Loading…</div>';

  try {
    const res = await fetch(name + '/' + name + '.html');
    if (!res.ok) throw new Error('not found');
    const html = await res.text();

    const div = document.createElement('div');
    div.innerHTML = html;
    _tabCache[name] = div;
    content.innerHTML = '';
    content.appendChild(div);

    // Load CSS (once)
    if (!_tabAssetsLoaded.has(name + '.css')) {
      _tabAssetsLoaded.add(name + '.css');
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = name + '/' + name + '.css';
      document.head.appendChild(link);
    }

    // Load JS (once) and wait
    if (!_tabAssetsLoaded.has(name + '.js')) {
      _tabAssetsLoaded.add(name + '.js');
      await new Promise(resolve => {
        const s = document.createElement('script');
        s.src = name + '/' + name + '.js';
        s.onload = s.onerror = resolve;
        document.body.appendChild(s);
      });
    }

    // Call tab init if defined
    const fn = window[name + 'Init'];
    if (typeof fn === 'function') fn();

  } catch (e) {
    content.innerHTML = '<div class="coming-soon"><div class="coming-soon-icon">🚧</div><h2>Coming Soon</h2><p>This section is under construction.</p></div>';
  }

  window.scrollTo(0, 0);
}

// Start on hash or home
document.addEventListener('DOMContentLoaded', function() {
  let hash = location.hash.replace('#', '');
  let tab = hash || 'home';
  let preserveHash = false;
  
  // Handle Supabase OAuth redirects
  if (hash.includes('access_token=') || hash.includes('error=')) {
    tab = 'loans';
    preserveHash = true;
  }
  
  switchTab(tab, preserveHash);
});
