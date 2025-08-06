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
    return console.error('[games-list] ❌ failed to load /games/index.json:', err);
  }

  if (!Array.isArray(index.folders)) {
    return console.error('[games-list] ❌ index.json.folders is not an Array');
  }

  for (const slug of index.folders) {
    console.log(`[games-list] loading config for "${slug}"…`);
    try {
      const resp = await fetch(`/games/${slug}/config.json`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const game = await resp.json();
      console.log(`[games-list] rendering game:`, game);
      renderGameCard(game);
    } catch (e) {
      console.error(`[games-list] ❌ failed to load config.json for "${slug}":`, e);
    }
  }
});

function renderGameCard(game) {
  if (!game.folder || !game.icon || !game.entry || !game.name) {
    console.error('[games-list] ❌ invalid config.json missing required fields:', game);
    return;
  }

  const card = document.createElement('div');
  card.className = 'game-card';
  
  // Create anchor tag to wrap the image and button for the "Play" action
  const playLink = document.createElement('a');
  playLink.href = `/games/${game.folder}/${game.entry}`;
  playLink.target = '_blank'; // Open in a new tab

  // Create the image and button within the link
  playLink.innerHTML = `
    <img src="/games/${game.folder}/${game.icon}" alt="${game.name}">
    <div class="card-info">
      <h3>${game.name}</h3>
      <button>Play</button>
    </div>
  `;

  card.append(playLink); // Append the anchor tag (with the play link) to the card

  // Featured (home)
  const feat = document.getElementById('featured-games');
  if (feat) {
    console.log('[games-list] appending featured:', game.name);
    if (feat.children.length < 3) feat.append(card.cloneNode(true));
  } else {
    console.warn('[games-list] featured-games container not found');
  }

  // All on home
  const allHome = document.getElementById('all-games');
  if (allHome) {
    console.log('[games-list] appending to all-home:', game.name);
    allHome.append(card.cloneNode(true));
  } else {
    console.warn('[games-list] all-games container not found');
  }

  // All on games.html
  const allPage = document.getElementById('games-container');
  if (allPage) {
    console.log('[games-list] appending to games-page:', game.name);
    allPage.append(card);
  } else {
    console.warn('[games-list] games-container not found');
  }
}
