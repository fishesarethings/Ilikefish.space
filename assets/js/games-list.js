fetch('games/pong/config.json')
  .then(r => r.json())
  .then(games => {
    const featured = document.getElementById('featured-games');
    const all = document.getElementById('games-container');
    games.forEach((g, i) => {
      const card = document.createElement('div');
      card.className = 'game-card';
      card.innerHTML = `
        <img src="assets/img/${g.icon}" alt="${g.name}">
        <div class="card-info">
          <h3>${g.name}</h3>
          <button onclick="launchGame('${g.folder}')">Play</button>
        </div>`;
      if (i < 3) featured.append(card);
      if (all) all.append(card);
    });
  });
function launchGame(folder) {
  window.open(`games/${folder}/${folder}.html`, '_blank');
}
