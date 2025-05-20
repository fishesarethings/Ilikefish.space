window.addEventListener('DOMContentLoaded', async () => {
  try {
    const manifestText = await fetch('/precache-manifest.js').then(r => r.text());
    const slugs = [...new Set(
      [...manifestText.matchAll(/["']\/games\/([^\/]+)\/config\.json["']/g)]
        .map(m => m[1])
    )];

    for (const slug of slugs) {
      const game = await fetch(`/games/${slug}/config.json`).then(r => r.json());
      renderGameCard(game);
    }
  } catch (err) {
    console.error('Failed to load games:', err);
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
    </div>`;

  // Featured
  const featured = document.getElementById('featured-games');
  if (featured && featured.children.length < 3) featured.append(card.cloneNode(true));

  // All on index
  const allIndex = document.getElementById('all-games');
  if (allIndex) allIndex.append(card.cloneNode(true));

  // All on games.html
  const allPage = document.getElementById('games-container');
  if (allPage) allPage.append(card);
}
