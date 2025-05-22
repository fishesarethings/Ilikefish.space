// assets/js/games-list.js

window.addEventListener('DOMContentLoaded', async () => {
  let data;
  try {
    // Grab the folders list from games/index.json
    const res = await fetch('/games/index.json');
    data = await res.json();
  } catch (err) {
    return console.error('Failed to load games/index.json', err);
  }

  for (const slug of data.folders) {
    try {
      const cfg = await fetch(`/games/${slug}/config.json`).then(r => r.json());
      renderGameCard(cfg);
    } catch (err) {
      console.error(`Failed to load /games/${slug}/config.json`, err);
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
      <button onclick="window.open('/games/${game.folder}/${game.entry}','_blank')">
        Play
      </button>
    </div>
  `;

  // -- Home page featured
  const feat = document.getElementById('featured-games');
  if (feat && feat.children.length < 3) feat.append(card.cloneNode(true));

  // -- Home page "all"
  const allHome = document.getElementById('all-games');
  if (allHome) allHome.append(card.cloneNode(true));

  // -- games.html
  const allPage = document.getElementById('games-container');
  if (allPage) allPage.append(card);
}
