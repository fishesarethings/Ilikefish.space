fetch('games.json')
  .then(r=>r.json())
  .then(games=>{
    const featured = document.getElementById('featured-games');
    const allContainer = document.getElementById('games-container');
    games.forEach((g,i)=>{
      const card = document.createElement('div');
      card.className='game-card';
      card.innerHTML=`
        <img src="assets/img/${g.icon}" alt="${g.name}">
        <div class="card-info">
          <h3>${g.name}</h3>
          <button onclick="launchGame('${g.folder}')">Play</button>
        </div>`;
      card.onclick=_=>launchGame(g.folder);
      // featured first 3
      if(i<3) featured.append(card);
      if(allContainer) allContainer.append(card);
    });
  });

// Launch game in full screen & initialize controls
function launchGame(folder) {
  const url = `games/${folder}/index.html`;
  window.open(url, '_blank'); // can be improved to embed
}
