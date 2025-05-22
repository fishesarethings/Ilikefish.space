// assets/js/games-list.js
window.addEventListener('DOMContentLoaded', async () => {
  let manifestText;
  try {
    manifestText = await fetch('/precache-manifest.js').then(r => r.text());
  } catch (e) {
    return console.error('Could not load precache manifest', e);
  }
  // extract unique slugs
  const slugs = [...new Set(
    [...manifestText.matchAll(/["']\/games\/([^\/]+)\/config\.json["']/g)]
      .map(m => m[1])
  )];

  for (const slug of slugs) {
    try {
      const resp = await fetch(`/games/${slug}/config.json`);
      const game = await resp.json();
      renderGameCard(game);
    } catch (err) {
      console.error(`Failed to load ${slug}`, err);
    }
  }
});

function renderGameCard(game) {
  const card = document.createElement('div');
  card.className = 'game-card';
  card.innerHTML = `
    <img src="/games/${game.folder}/${game.icon}" alt="${game.name}">
    <div class="card-info">
      <h3>${game.name}</h3>
      <button onclick="window.open('/games/${game.folder}/${game.entry}','_blank')">Play</button>
    </div>
  `;

  // featured (home, max 3)
  const feat = document.getElementById('featured-games');
  if (feat && feat.children.length < 3) feat.append(card.cloneNode(true));

  // all on home
  const allHome = document.getElementById('all-games');
  if (allHome) allHome.append(card.cloneNode(true));

  // all on games.html
  const allPage = document.getElementById('games-container');
  if (allPage) allPage.append(card);
}
