const gameFolders = ['pong' /*, add other slugs here */];

Promise.all(
  gameFolders.map(slug =>
    fetch(`games/${slug}/config.json`).then(r => r.json())
  )
).then(games => {
  const featured = document.getElementById('featured-games');
  const all      = document.getElementById('games-container');

  games.forEach((g, i) => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
      <img src="games/${g.folder}/${g.icon}" alt="${g.name}">
      <div class="card-info">
        <h3>${g.name}</h3>
        <button onclick="launchGame('${g.folder}')">Play</button>
      </div>`;
    if (i < 3) featured.append(card);
    if (all)    all.append(card);
  });
});

function launchGame(folder) {
  window.open(`games/${folder}/${folder}.html`, '_blank');
}
