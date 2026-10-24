// assets/js/games-list.js
window.addEventListener('DOMContentLoaded', async () => {
  console.log('[games-list] DOM ready, fetching /games/index.json…');

  const feat = document.getElementById('featured-games');
  const allHome = document.getElementById('all-games');
  const recHome = document.getElementById('recommended-games');
  const allPage = document.getElementById('games-container');

  [feat, allHome, recHome, allPage].forEach(el => {
    if (el) el.innerHTML = '';
  });

  let index;
  try {
    index = await fetch('/games/index.json').then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    console.log('[games-list] got index.json →', index);
  } catch (err) {
    return console.error('[games-list] ❌ failed to load /games/index.json:', err);
  }

  if (!Array.isArray(index.folders)) {
    return console.error('[games-list] ❌ index.json.folders is not an Array');
  }

  const isTouchDevice = (typeof window !== 'undefined') &&
    (window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false);

  async function loadConfig(slug) {
    try {
      const resp = await fetch(`/games/${slug}/config.json`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const game = await resp.json();
      game.folder = game.folder || slug;

      if (isTouchDevice && game.touch !== true) {
        console.log(`[games-list] skipping non-touch game "${slug}" on touch device`);
        return null;
      }
      return game;
    } catch (e) {
      console.error(`[games-list] ❌ failed to load config.json for "${slug}":`, e);
      return null;
    }
  }

  const games = (await Promise.all(index.folders.map(loadConfig))).filter(Boolean);
  if (window.ILF_RECS) window.ILF_RECS.saveCatalog(games);

  const featured = games
    .filter(game => game.featured)
    .sort((a, b) => {
      const aOrder = typeof a.featuredOrder === 'number' ? a.featuredOrder : 999;
      const bOrder = typeof b.featuredOrder === 'number' ? b.featuredOrder : 999;
      return aOrder - bOrder;
    })
    .slice(0, 8);

  function initRowReveal(row) {
    if (!row || row.dataset.revealReady === '1') return;
    row.dataset.revealReady = '1';
    row.classList.add('ilf-reveal');

    const cards = Array.from(row.children).filter(el => el.classList.contains('game-card'));
    cards.forEach((card, index) => card.style.setProperty('--ilf-i', String(index)));

    if (!('IntersectionObserver' in window) ||
        (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      row.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        row.classList.add('is-visible');
        observer.disconnect();
      });
    }, { threshold: 0.15 });
    observer.observe(row);
  }

  function formatDuration(seconds) {
    const minutes = Math.round((Number(seconds) || 0) / 60);
    if (minutes < 1) return '<1m';
    if (minutes < 60) return minutes + 'm';
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours + 'h' + (rest ? ' ' + rest + 'm' : '');
  }

  function updatePlayStats() {
    const row = document.getElementById('play-stats');
    if (!row) return;

    const stats = window.ILF_RECS ? window.ILF_RECS.getStats(games) : null;
    if (!stats || !stats.totalPlays) {
      row.hidden = true;
      return;
    }

    row.hidden = false;
    const streak = row.querySelector('[data-stat="streak"]');
    const hours = row.querySelector('[data-stat="hours"]');
    const average = row.querySelector('[data-stat="avg"]');
    if (streak) streak.textContent = stats.streak.count
      ? `🔥 ${stats.streak.count}-day streak`
      : '🔥 Start a streak';
    if (hours) hours.textContent = `⏱ ${formatDuration(stats.totalSeconds)} played`;
    if (average) average.textContent = `~${formatDuration(stats.averageSeconds)} avg session`;
  }

  function fillStatsDialog(stats) {
    const modal = document.getElementById('play-stats-modal');
    if (!modal) return;

    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    set('stat-streak', String(stats.streak.count || 0));
    set('stat-hours', formatDuration(stats.totalSeconds));
    set('stat-avg', formatDuration(stats.averageSeconds));
    set('stat-games', String(stats.uniqueGames || 0));
    set('stat-plays', String(stats.totalPlays || 0));

    const favorite = document.getElementById('stat-favorite');
    if (favorite) {
      const label = stats.favoriteTag
        ? stats.favoriteTag.charAt(0).toUpperCase() + stats.favoriteTag.slice(1)
        : 'Not enough plays yet';
      favorite.textContent = 'Favourite vibe: ' + label;
    }

    const recent = document.getElementById('stat-recent');
    if (recent) {
      recent.textContent = stats.recent.length
        ? 'Recently played: ' + stats.recent.map(item => item.name).join(' · ')
        : 'Play a game to start building stats.';
    }
  }

  function openStatsDialog() {
    const modal = document.getElementById('play-stats-modal');
    if (!modal || !window.ILF_RECS) return;
    fillStatsDialog(window.ILF_RECS.getStats(games));
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    const close = document.getElementById('stats-close');
    if (close) close.focus();
  }

  function closeStatsDialog() {
    const modal = document.getElementById('play-stats-modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    const row = document.getElementById('play-stats');
    if (row) row.focus();
  }

  const statsRow = document.getElementById('play-stats');
  const statsModal = document.getElementById('play-stats-modal');
  const statsClose = document.getElementById('stats-close');
  if (statsRow) statsRow.addEventListener('click', openStatsDialog);
  if (statsClose) statsClose.addEventListener('click', closeStatsDialog);
  if (statsModal) {
    statsModal.addEventListener('click', event => {
      if (event.target === statsModal) closeStatsDialog();
    });
  }
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && statsModal && !statsModal.hidden) closeStatsDialog();
  });

  function renderFeatured() {
    if (!feat) return;
    feat.innerHTML = '';
    featured.forEach(game => feat.append(renderGameCard(game)));
    initRowReveal(feat);
  }

  function renderHomeAll() {
    if (!allHome) return;
    const ordered = window.ILF_RECS ? window.ILF_RECS.rank(games) : games;
    allHome.innerHTML = '';
    ordered.forEach(game => allHome.append(renderGameCard(game)));
  }

  function renderHomeRecommended() {
    if (!recHome) return;
    recHome.classList.remove('ilf-reveal', 'is-visible');
    delete recHome.dataset.revealReady;
    const picked = window.ILF_RECS
      ? window.ILF_RECS.recommended(games, 5)
      : games.slice(0, 5);
    recHome.innerHTML = '';
    picked.forEach(game => recHome.append(renderGameCard(game)));
    initRowReveal(recHome);
    updatePlayStats();
  }

  function applySearchFilter() {
    const input = document.getElementById('search-box');
    if (!input) return;
    const term = input.value.trim().toLowerCase();
    document.querySelectorAll('#games-container .game-card').forEach(card => {
      const nameEl = card.querySelector('h3');
      const name = nameEl ? nameEl.textContent.toLowerCase() : '';
      card.style.display = (!term || name.includes(term)) ? '' : 'none';
    });
  }

  function renderGamesPage() {
    if (!allPage) return;
    const ordered = window.ILF_RECS ? window.ILF_RECS.rank(games) : games;
    allPage.innerHTML = '';
    ordered.forEach(game => allPage.append(renderGameCard(game)));
    applySearchFilter();
  }

  renderFeatured();
  renderHomeAll();
  renderHomeRecommended();
  renderGamesPage();

  function historySignature() {
    try {
      return window.ILF_RECS ? JSON.stringify(window.ILF_RECS.getHistory()) : '';
    } catch (e) {
      return '';
    }
  }

  let lastHistory = historySignature();

  function refreshPersonalised(force) {
    const next = historySignature();
    if (!force && next === lastHistory) return;
    lastHistory = next;
    renderHomeAll();
    renderHomeRecommended();
    renderGamesPage();
  }

  // Returning from a game, switching tabs, or playing in another tab should
  // be reflected immediately the next time the list is visible.
  window.addEventListener('pageshow', event => {
    if (event.persisted) refreshPersonalised(true);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshPersonalised(false);
  });
  window.addEventListener('storage', () => refreshPersonalised(true));

  document.addEventListener('ilf:history-changed', event => {
    const detail = event.detail || {};
    if (typeof detail.feedback !== 'number' || !detail.folder) return;
    const marker = 'folder=' + encodeURIComponent(detail.folder);
    document.querySelectorAll('.game-card').forEach(card => {
      if ((card.getAttribute('href') || '').includes(marker)) {
        paintThumbButtons(card, detail.feedback);
      }
    });
  });
});

function renderGameCard(game) {
  if (!game.folder || !game.icon || !game.entry || !game.name) {
    console.error('[games-list] ❌ invalid config.json missing required fields:', game);
    return document.createTextNode('');
  }

  const link = document.createElement('a');
  link.href = `/games/game_player.html?folder=${encodeURIComponent(game.folder)}`;
  link.className = 'game-card';
  link.style.textDecoration = 'none';
  link.style.color = 'inherit';

  const feedback = window.ILF_RECS ? window.ILF_RECS.feedbackFor(game.folder) : 0;

  link.innerHTML = `
    <img src="/games/${game.folder}/${game.icon}" alt="${game.name}">
    <div class="card-info">
      <h3>${game.name}</h3>
      <div class="card-actions">
        <button type="button" class="play-btn">Play</button>
        <div class="thumb-row" aria-label="Tune recommendations">
          <button type="button" class="thumb-btn" data-thumb="up" aria-label="More games like ${game.name}" title="More like this" aria-pressed="${feedback === 1}">👍</button>
          <button type="button" class="thumb-btn" data-thumb="down" aria-label="Fewer games like ${game.name}" title="Less like this" aria-pressed="${feedback === -1}">👎</button>
        </div>
      </div>
    </div>
  `;

  const playBtn = link.querySelector('.play-btn');
  if (playBtn) {
    playBtn.addEventListener('click', (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      const url = `/games/game_player.html?folder=${encodeURIComponent(game.folder)}`;
      location.href = url;
    });
  }

  const up = link.querySelector('[data-thumb="up"]');
  const down = link.querySelector('[data-thumb="down"]');
  paintThumbButtons(link, feedback);

  [up, down].forEach(button => {
    if (!button) return;
    button.addEventListener('click', (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      if (!window.ILF_RECS) return;
      const wanted = button.getAttribute('data-thumb') === 'up' ? 1 : -1;
      const current = window.ILF_RECS.feedbackFor(game.folder);
      const next = current === wanted ? 0 : wanted;
      window.ILF_RECS.recordFeedback(game.folder, next);
      paintThumbButtons(link, next);
    });
  });

  return link;
}

function paintThumbButtons(card, value) {
  const up = card.querySelector('[data-thumb="up"]');
  const down = card.querySelector('[data-thumb="down"]');
  if (up) {
    up.classList.toggle('is-on', value === 1);
    up.setAttribute('aria-pressed', String(value === 1));
  }
  if (down) {
    down.classList.toggle('is-on', value === -1);
    down.setAttribute('aria-pressed', String(value === -1));
  }
}
