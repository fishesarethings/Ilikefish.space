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
      ? window.ILF_RECS.recommended(games, 8)
      : games.slice(0, 8);
    recHome.innerHTML = '';
    picked.forEach(game => recHome.append(renderGameCard(game)));
    initRowReveal(recHome);
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

  // Turn vertical wheel movement into horizontal movement while a game row is
  // fully in view. First the row is centred; then it scrolls to its end before
  // the page is allowed to continue. Touch devices keep native swipe + page scroll.
  if (window.matchMedia && window.matchMedia('(pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const rowStates = new WeakMap();
    let centringUntil = 0;

    function animateRow(row, target) {
      let state = rowStates.get(row);
      if (!state) {
        state = { target: row.scrollLeft, frame: 0 };
        rowStates.set(row, state);
      }
      state.target = target;
      if (state.frame) return;

      function step() {
        const distance = state.target - row.scrollLeft;
        if (Math.abs(distance) < 0.8) {
          row.scrollLeft = state.target;
          state.frame = 0;
          return;
        }
        row.scrollLeft += distance * 0.24;
        state.frame = setTimeout(step, 16);
      }
      state.frame = setTimeout(step, 16);
    }

    window.addEventListener('wheel', event => {
      if (event.ctrlKey || event.metaKey) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (performance.now() < centringUntil) {
        event.preventDefault();
        return;
      }

      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      if (!delta) return;

      const rows = Array.from(document.querySelectorAll('.cards-row')).filter(row => {
        const rect = row.getBoundingClientRect();
        return rect.height > 0 &&
          rect.top >= -4 &&
          rect.bottom <= window.innerHeight + 4 &&
          row.scrollWidth > row.clientWidth + 2;
      });
      if (!rows.length) return;

      rows.sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return Math.abs((ar.top + ar.height / 2) - window.innerHeight / 2) -
          Math.abs((br.top + br.height / 2) - window.innerHeight / 2);
      });

      const row = rows[0];
      const rect = row.getBoundingClientRect();
      const centreOffset = Math.abs((rect.top + rect.height / 2) - window.innerHeight / 2);

      // Bring the menu to the middle of the viewport before taking over scrolling.
      if (centreOffset > 36) {
        event.preventDefault();
        const top = window.scrollY + rect.top - (window.innerHeight - rect.height) / 2;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        centringUntil = performance.now() + 760;

        // AOS / late layout changes can move the section slightly while the
        // smooth scroll is running. Correct to the exact centre before locking.
        setTimeout(() => {
          const current = row.getBoundingClientRect();
          const offset = (current.top + current.height / 2) - window.innerHeight / 2;
          if (Math.abs(offset) > 3) {
            window.scrollTo({ top: window.scrollY + offset, behavior: 'auto' });
          }
          centringUntil = 0;
        }, 720);
        return;
      }

      const max = row.scrollWidth - row.clientWidth;
      const target = Math.max(0, Math.min(max, row.scrollLeft + delta));
      if (delta > 0 && row.scrollLeft < max - 1) {
        event.preventDefault();
        animateRow(row, target);
      } else if (delta < 0 && row.scrollLeft > 1) {
        event.preventDefault();
        animateRow(row, target);
      }
    }, { passive: false });
  }

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
      evt.stopPropagation();
      const url = `/games/game_player.html?folder=${encodeURIComponent(game.folder)}`;
      location.href = url;
    });
  }

  return link;
}
