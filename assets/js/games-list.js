// assets/js/games-list.js
window.addEventListener('DOMContentLoaded', async () => {
  let manifestText;
  try {
    manifestText = await fetch('/precache-manifest.js').then(r => r.text());
  } catch (err) {
    return console.error('Could not load precache‐manifest:', err);
  }

  // Pull every slug that has a config.json
  const slugs = Array.from(new Set(
    [...manifestText.matchAll(/["']\/games\/([^\/]+)\/config\.json["']/g)]
      .map(m => m[1])
  ));

  for (const slug of slugs) {
    try {
      const resp = await fetch(`/games/${slug}/config.json`);
      if (!resp.ok) throw new Error(resp.statusText);
      const game = await resp.json();
      renderGameCard(game);
    } catch (err) {
      console.error(`Failed to load game '${slug}':`, err);
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
      <button onclick="window.open('/games/${game.folder}/${game.entry}','_blank')">
        Play
      </button>
    </div>`;

  // Featured on index.html (max 3)
  const feat = document.getElementById('featured-games');
  if (feat && feat.children.length < 3) {
    feat.append(card.cloneNode(true));
  }

  // All on index.html
  const allIdx = document.getElementById('all-games');
  if (allIdx) {
    allIdx.append(card.cloneNode(true));
  }

  // All on games.html
  const allPage = document.getElementById('games-container');
  if (allPage) {
    allPage.append(card);
  }
}
