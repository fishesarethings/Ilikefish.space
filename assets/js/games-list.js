// assets/js/games-list.js

(async () => {
  // 1. fetch the auto-generated slug list
  const slugs = await fetch('games/games.json').then(r => r.json());

  const featured = document.getElementById('featured-games');
  const all      = document.getElementById('games-container');

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    try {
      // 2. fetch each game's config.json
      const cfg = await fetch(`games/${slug}/config.json`).then(r => r.json());
      const card = document.createElement('div');
      card.className = 'game-card';
      card.innerHTML = `
        <img src="games/${slug}/${cfg.icon}" alt="${cfg.name}">
        <div class="card-info">
          <h3>${cfg.name}</h3>
          <button onclick="launchGame('${slug}')">Play</button>
        </div>
      `;
      // 3a. featured = first 3
      if (i < 3 && featured) featured.append(card);
      // 3b. all games
      if (all) all.append(card);

    } catch (err) {
      console.error(`Failed loading games/${slug}/config.json`, err);
    }
  }
})();

// opens the game's HTML entry in a new tab/window
function launchGame(slug) {
  window.open(`games/${slug}/${slug}.html`, '_blank');
}
