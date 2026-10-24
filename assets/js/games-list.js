// assets/js/games-list.js
window.addEventListener('DOMContentLoaded', async () => {
  console.log('[games-list] DOM ready, fetching /games/index.json…');

  const feat = document.getElementById('featured-games');
  const allHome = document.getElementById('all-games');
  const recHome = document.getElementById('recommended-games');
  const allPage = document.getElementById('games-container');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    setupScrollTracks();
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

  // Native, sticky scroll tracks for the two home carousels. The page keeps
  // its normal vertical scrolling; the row position is derived from how far
  // through the track the visitor has scrolled.
  let pinnedFrame = 0;

  function updatePinnedRows() {
    document.querySelectorAll('.scroll-track[data-scroll-pin="1"]').forEach(section => {
      const row = section.querySelector('.cards-row');
      if (!row) return;
      const extra = section.offsetHeight - window.innerHeight;
      if (extra <= 0) return;
      const progress = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / extra));
      row.scrollLeft = progress * (row.scrollWidth - row.clientWidth);
    });
  }

  function queuePinnedUpdate() {
    if (pinnedFrame) return;
    pinnedFrame = requestAnimationFrame(() => {
      pinnedFrame = 0;
      updatePinnedRows();
    });
  }

  function setupScrollTracks() {
    const canPin = window.innerWidth > 800 &&
      window.matchMedia && window.matchMedia('(pointer: fine)').matches &&
      !reduceMotion;

    document.querySelectorAll('.scroll-track').forEach(section => {
      const row = section.querySelector('.cards-row');
      if (!row) return;

      if (!canPin) {
        section.style.height = '';
        delete section.dataset.scrollPin;
        row.scrollLeft = 0;
        return;
      }

      const max = row.scrollWidth - row.clientWidth;
      if (max < 40) {
        section.style.height = '';
        delete section.dataset.scrollPin;
        row.scrollLeft = 0;
        return;
      }

      section.style.height = `calc(100vh + ${Math.ceil(max * 1.5)}px)`;
      section.dataset.scrollPin = '1';
      row.scrollLeft = 0;
    });

    updatePinnedRows();
  }

  window.addEventListener('scroll', queuePinnedUpdate, { passive: true });
  window.addEventListener('resize', setupScrollTracks);
  window.addEventListener('load', setupScrollTracks);
  setupScrollTracks();

  // A quick boundary catch: if a fast scroll is about to jump over a pinned
  // menu, ease the page to the entrance (or exit, when scrolling back up).
  // Once inside the track, scrolling is completely native again.
  if (window.matchMedia && window.matchMedia('(pointer: fine)').matches && !reduceMotion) {
    let boundaryLock = 0;

    window.addEventListener('wheel', event => {
      if (event.ctrlKey || event.metaKey) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (performance.now() < boundaryLock) {
        event.preventDefault();
        return;
      }

      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      if (!delta) return;

      const tracks = Array.from(document.querySelectorAll('.scroll-track[data-scroll-pin="1"]'))
        .map(section => {
          const rect = section.getBoundingClientRect();
          const extra = section.offsetHeight - window.innerHeight;
          return { section, rect, extra, top: rect.top };
        })
        .filter(item => item.extra > 40);

      let target = null;
      let destination = 0;

      if (delta > 0) {
        // Approaching a menu from above: pin it at the top before allowing it
        // to be scrolled through.
        const candidates = tracks
          .filter(item => item.top > 0 && item.top < window.innerHeight * 0.8)
          .sort((a, b) => a.top - b.top);
        if (candidates.length) {
          target = candidates[0];
          destination = window.scrollY + target.top;
        }
      } else {
        // Coming back up: land at the end of the menu first, then let native
        // scrolling run the row backwards.
        const candidates = tracks
          .filter(item => item.top < -item.extra && item.top > -item.extra - window.innerHeight * 0.8)
          .sort((a, b) => b.top - a.top);
        if (candidates.length) {
          target = candidates[0];
          destination = window.scrollY + target.top + target.extra;
        }
      }

      if (!target) return;

      event.preventDefault();
      window.scrollTo({ top: Math.max(0, destination), behavior: 'smooth' });
      boundaryLock = performance.now() + 420;
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
