// assets/js/games-list.js
window.addEventListener('DOMContentLoaded', async () => {
  console.log('[games-list] DOM ready, fetching /games/index.json…');

  // Clear containers
  const feat = document.getElementById('featured-games');
  if (feat) feat.innerHTML = '';

  const allHome = document.getElementById('all-games');
  if (allHome) allHome.innerHTML = '';

  const allPage = document.getElementById('games-container');
  if (allPage) allPage.innerHTML = '';

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

  const featuredGames = [];

  // Load configs one by one, render immediately
  for (const slug of index.folders) {
    console.log(`[games-list] loading config for "${slug}"…`);
    try {
      const resp = await fetch(`/games/${slug}/config.json`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const game = await resp.json();

      // fallback: ensure folder set
      game.folder = game.folder || slug;
      console.log(`[games-list] loaded game config:`, game);

      // Add to featured buffer
      if (game.featured) {
        featuredGames.push(game);
        // Keep featured sorted as we go
        featuredGames.sort((a, b) => {
          const aOrder = typeof a.featuredOrder === 'number' ? a.featuredOrder : 999;
          const bOrder = typeof b.featuredOrder === 'number' ? b.featuredOrder : 999;
          return aOrder - bOrder;
        });

        // Clear and re-render featured
        if (feat) {
          feat.innerHTML = '';
          for (const f of featuredGames) {
            feat.append(renderGameCard(f));
          }
        }
      }

      // Render to all immediately
      const card = renderGameCard(game);
      if (allHome) allHome.append(card.cloneNode(true));
      if (allPage) allPage.append(card);

    } catch (e) {
      console.error(`[games-list] ❌ failed to load config.json for "${slug}":`, e);
    }

    // Small delay so browser paints between fetches
    await new Promise(r => setTimeout(r, 100));
  }
});

function renderGameCard(game) {
  if (!game.folder || !game.icon || !game.entry || !game.name) {
    console.error('[games-list] ❌ invalid config.json missing required fields:', game);
    return document.createTextNode('');
  }

  const link = document.createElement('a');
  link.href = `/games/${game.folder}/${game.entry}`;
  link.target = '_blank';
  link.className = 'game-card';
  link.style.textDecoration = 'none';
  link.style.color = 'inherit';

  link.innerHTML = `
    <img src="/games/${game.folder}/${game.icon}" alt="${game.name}">
    <div class="card-info">
      <h3>${game.name}</h3>
      <button type="button">Play</button>
    </div>
  `;

  return link;
}
