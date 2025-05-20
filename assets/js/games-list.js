// assets/js/games-list.js
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Fetch the auto-generated index of game folders
    const idx = await fetch('/games/index.json').then(r => r.json());
    const folders = idx.folders || [];

    // 2. For each folder, load its config.json and render it
    for (const slug of folders) {
      try {
        const game = await fetch(`/games/${slug}/config.json`).then(r => r.json());
        renderGameCard(game);
      } catch (err) {
        console.error(`Could not load /games/${slug}/config.json:`, err);
      }
    }
  } catch (err) {
    console.error('Could not fetch /games/index.json:', err);
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

  // Append to our container
  document.getElementById('games-container')?.append(card);
}
