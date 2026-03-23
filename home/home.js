// ── HOME TAB ──
function homeInit() {
  // Nothing needed on init — static content
}

function addIdea() {
  const title = prompt('What\'s your idea?');
  if (!title || !title.trim()) return;
  const desc = prompt('One line description (optional):') || 'To be explored...';
  const icons = ['💡','🔭','🧪','🗺️','🎯','🧩','🌍','📊'];
  const icon = icons[Math.floor(Math.random() * icons.length)];
  const grid = document.querySelector('.ideas-grid');
  const addBtn = grid.querySelector('.add-idea-card');
  const card = document.createElement('div');
  card.className = 'idea-card';
  card.innerHTML = '<span class="idea-icon">' + icon + '</span><div class="idea-title">' + title.trim() + '</div><div class="idea-desc">' + desc + '</div>';
  grid.insertBefore(card, addBtn);
  const count = document.querySelectorAll('.idea-card').length;
  const pills = document.querySelectorAll('.summary-pill');
  if (pills[2]) pills[2].innerHTML = '<div class="pill-dot" style="background:var(--c6);width:8px;height:8px;border-radius:50%"></div> ' + count + ' Ideas';
}
