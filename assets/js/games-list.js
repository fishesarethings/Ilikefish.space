// assets/js/games-list.js
window.addEventListener('DOMContentLoaded', async () => {
  let idx;
  try {
    idx = await fetch('/games/index.json').then(r => r.json());
  } catch (e) {
    return console.error('Could not load games index.json', e);
  }
  for (const slug of idx.folders) {
    try {
      const game = await fetch(`/games/${slug}/config.json`).then(r => r.json());
      renderGameCard(game);
    } catch (e) {
      console.error('Failed to load game', slug, e);
    }
  }
});

function renderGameCard(game) {
  const card = document.createElement('div');
  card.className = 'game-card';
  card.innerHTML = `
    <img src="/games/${game.folder}/${game.icon}" alt="${game.name}">
    <div class="card-info">
      <h3>${game.name}</h3>
      <button onclick="window.open('/games/${game.folder}/${game.entry}','_blank')">Play</button>
    </div>`;

  // home page: featured (max 3) + all
  const feat = document.getElementById('featured-games');
  if (feat && feat.children.length < 3) feat.append(card.cloneNode(true));
  const allHome = document.getElementById('all-games');
  if (allHome) allHome.append(card.cloneNode(true));

  // games.html: all
  const allPage = document.getElementById('games-container');
  if (allPage) allPage.append(card);
}
