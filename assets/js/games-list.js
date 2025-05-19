// Dynamically load all games listed in games/index.json
fetch('games/index.json')
  .then(r => r.json())
  .then(data => data.folders.forEach(addGameCard));

function addGameCard(slug) {
  fetch(`games/${slug}/config.json`)
    .then(r => r.json())
    .then(game => {
      const card = document.createElement('div');
      card.className = 'game-card';
      card.innerHTML = `
        <img src="games/${game.folder}/${game.icon}" alt="${game.name}">
        <div class="card-info">
          <h3>${game.name}</h3>
          <button onclick="launchGame('${game.folder}')">Play</button>
        </div>`;
      // Featured on index
      const featured = document.getElementById('featured-games');
      if (featured && featured.children.length < 3) {
        featured.append(card.cloneNode(true));
      }
      // All games on games.html
      const container = document.getElementById('games-container');
      if (container) {
        container.append(card);
      }
    });
}

function launchGame(folder) {
  window.open(`games/${folder}/${folder}.html`, '_blank');
}
