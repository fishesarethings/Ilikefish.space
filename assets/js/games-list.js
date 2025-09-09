// assets/js/games-list.js

window.addEventListener('DOMContentLoaded', async () => {
  console.log('[games-list] DOM ready, fetching /games/index.json…');

  let index;
  try {
    index = await fetch('/games/index.json').then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    console.log('[games-list] got index.json →', index);
  } catch (err) {
    console.error('[games-list] ❌ failed to load /games/index.json:', err);
    return;
  }

  if (!Array.isArray(index.folders)) {
    console.error('[games-list] ❌ index.json.folders is not an Array');
    return;
  }

  const featuredGames = [];
  const allGames = [];

  // Load each game config.json
  for (const slug of index.folders) {
    console.log(`[games-list] loading config for "${slug}"…`);
    try {
      const resp = await fetch(`/games/${slug}/config.json`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const game = await resp.json();

      // Ensure required field fallback
      game.folder = game.folder || slug;

      console.log(`[games-list] loaded game config:`, game);

      allGames.push(game);
      if (game.featured) {
        featuredGames.push(game);
      }
    } catch (e) {
      console.error(`[games-list] ❌ failed to load config.json for "${slug}":`, e);
    }
  }

  // Sort featured games by featuredOrder (default to 999 if not set)
  featuredGames.sort((a, b) => {
    const aOrder = typeof a.featuredOrder === 'number' ? a.featuredOrder : 999;
    const bOrder = typeof b.featuredOrder === 'number' ? b.featuredOrder : 999;
    return aOrder - bOrder;
  });

  // Render featured games
  const feat = document.getElementById('featured-games');
  if (feat) {
    for (const game of featuredGames) {
      console.log('[games-list] rendering featured:', game.name);
      feat.append(renderGameCard(game));
    }
  } else {
    console.warn('[games-list] featured-games container not found');
  }

  // Render all games to both home and games.html
  for (const game of allGames) {
    const card = renderGameCard(game);

    // Append to home (if exists)
    const allHome = document.getElementById('all-games');
    if (allHome) {
      allHome.append(card.cloneNode(true));
    }

    // Append to games.html (if exists)
    const allPage = document.getElementById('games-container');
    if (allPage) {
      allPage.append(card);
    }
  }
});

function renderGameCard(game) {
  if (!game.folder || !game.icon || !game.entry || !game.name) {
    console.error('[games-list] ❌ invalid config.json missing required fields:', game);
    return document.createTextNode(''); // Return empty node on error
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
