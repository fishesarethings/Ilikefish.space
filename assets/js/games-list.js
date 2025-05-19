// assets/js/games-list.js

// On DOM ready, scan /games/ directory via fetch API on the
// pre-generated manifest (see steps below) and render every config.json.
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // Fetch a list of all files in /games/ from your service worker manifest
    const manifest = await fetch('/precache-manifest.js').then(r => r.text());
    // Extract all game config paths: "/games/<slug>/config.json"
    const slugs = Array.from(new Set(
      [...manifest.matchAll(/["']\/games\/([^\/]+)\/config\.json["']/g)]
        .map(m => m[1])
    ));

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
    <img src="games/${game.folder}/${game.icon}" alt="${game.name}">
    <div class="card-info">
      <h3>${game.name}</h3>
      <button onclick="window.open('games/${game.folder}/${game.folder}.html','_blank')">
        Play
      </button>
    </div>`;
  // Featured (up to 3)
  const featured = document.getElementById('featured-games');
  if (featured && featured.children.length < 3) featured.append(card.cloneNode(true));
  // All games
  const all = document.getElementById('games-container');
  if (all) all.append(card);
}
