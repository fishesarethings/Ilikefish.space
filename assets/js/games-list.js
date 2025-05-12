// automatically picks up ANY folder under /games/
async function fetchAllGames() {
  // You’ll need a small JSON that lists subfolders:
  const index = await fetch('games/index.json').then(r => r.json());
  return await Promise.all(
    index.folders.map(slug =>
      fetch(`games/${slug}/config.json`).then(r => r.json())
    )
  );
}

fetchAllGames().then(games => {
  const feat = document.getElementById('featured-games');
  const all  = document.getElementById('games-container');
  games.forEach((g,i) => {
    const c = document.createElement('div');
    c.className = 'game-card';
    c.innerHTML = `
      <img src="games/${g.folder}/${g.icon}" alt="${g.name}">
      <div class="card-info">
        <h3>${g.name}</h3>
        <button onclick="launchGame('${g.folder}')">Play</button>
      </div>`;
    if (i<3) feat.append(c);
    if (all)  all.append(c);
  });
});

function launchGame(slug) {
  window.open(`games/${slug}/${slug}.html`, '_blank');
}
