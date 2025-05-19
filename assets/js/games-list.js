window.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Load the list of game slugs
    const { folders } = await fetch('/games/index.json').then(r => r.json()); // :contentReference[oaicite:0]{index=0}

    for (const slug of folders) {
      // 2. Fetch each game’s config and render
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
  document.getElementById('games-container').append(card);
}
