fetch('games/games.json')
  .then(res => res.json())
  .then(games => {
    // Featured on home (first 3)
    const featured = document.getElementById('featured-games');
    games.slice(0, 3).forEach(game => {
      const card = document.createElement('div');
      card.classList.add('game-card');
      card.innerHTML = `
        <h3>${game.name}</h3>
        <a href="games/${game.folder}/index.html">Play Offline</a>
      `;
      featured.append(card);
    });

    // All games page
    const container = document.getElementById('games-container');
    if (container) {
      games.forEach(game => {
        const card = document.createElement('div');
        card.classList.add('game-card');
        card.innerHTML = `
          <h3>${game.name}</h3>
          <a href="games/${game.folder}/index.html">Play Offline</a>
        `;
        container.append(card);
      });
    }
  });
