// assets/js/games-list.js
window.addEventListener('DOMContentLoaded', async () => {
  let folders = [];
  try {
    // 1) grab the list of game folder names
    const idx = await fetch('/games/index.json').then(r => r.json());
    folders = idx.folders || [];
  } catch (err) {
    return console.error('Failed to load /games/index.json:', err);
  }

  // 2) load each config.json and render it
  for (const slug of folders) {
    try {
      const game = await fetch(`/games/${slug}/config.json`).then(r => r.json());
      renderGameCard(game);
    } catch (err) {
      console.error(`Failed to load /games/${slug}/config.json:`, err);
    }
  }
});

function renderGameCard(game) {
  // build the card
  const card = document.createElement('div');
  card.className = 'game-card';
  card.innerHTML = `
    <img src="/games/${game.folder}/${game.icon}" alt="${game.name}">
    <div class="card-info">
      <h3>${game.name}</h3>
      <button onclick="window.open('/games/${game.folder}/${game.entry}','_blank')">
        Play
      </button>
    </div>`;

  // append to Featured (max 3)
  const feat = document.getElementById('featured-games');
  if (feat && feat.children.length < 3) {
    feat.appendChild(card.cloneNode(true));
  }

  // append to All on index page
  const allIdx = document.getElementById('all-games');
  if (allIdx) {
    allIdx.appendChild(card.cloneNode(true));
  }

  // append to games.html page
  const allPage = document.getElementById('games-container');
  if (allPage) {
    allPage.appendChild(card);
  }
}
