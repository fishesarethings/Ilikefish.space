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

  const featured = games
    .filter(game => game.featured)
    .sort((a, b) => {
      const aOrder = typeof a.featuredOrder === 'number' ? a.featuredOrder : 999;
      const bOrder = typeof b.featuredOrder === 'number' ? b.featuredOrder : 999;
      return aOrder - bOrder;
    });

  function renderFeatured() {
    if (!feat) return;
    feat.innerHTML = '';
    featured.forEach(game => feat.append(renderGameCard(game)));
  }

  function renderHomeAll() {
    if (!allHome) return;
    allHome.innerHTML = '';
    games.forEach(game => allHome.append(renderGameCard(game)));
  }

  function renderHomeRecommended() {
    if (!recHome) return;
    const picked = window.ILF_RECS
      ? window.ILF_RECS.recommended(games, 8)
      : games.slice(0, 8);
    recHome.innerHTML = '';
    picked.forEach(game => recHome.append(renderGameCard(game)));
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

  link.innerHTML = `
    <img src="/games/${game.folder}/${game.icon}" alt="${game.name}">
    <div class="card-info">
      <h3>${game.name}</h3>
      <button type="button" class="play-btn">Play</button>
    </div>
  `;

  const playBtn = link.querySelector('.play-btn');
  if (playBtn) {
    playBtn.addEventListener('click', (evt) => {
      evt.preventDefault();
      const url = `/games/game_player.html?folder=${encodeURIComponent(game.folder)}`;
      location.href = url;
    });
  }

  return link;
}
