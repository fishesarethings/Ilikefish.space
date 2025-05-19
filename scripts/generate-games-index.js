// scripts/generate-games-index.js
const fs    = require('fs');
const path  = require('path');

// Path to your games folder
const GAMES_DIR = path.join(__dirname, '..', 'games');
const INDEX_JSON = path.join(GAMES_DIR, 'index.json');

// Read all entries in games/, filter directories
const folders = fs.readdirSync(GAMES_DIR, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name)
  // Only keep those that actually have a config.json
  .filter(name => fs.existsSync(path.join(GAMES_DIR, name, 'config.json')));

// Write out index.json
fs.writeFileSync(
  INDEX_JSON,
  JSON.stringify({ folders }, null, 2),
  'utf-8'
);

console.log(`Regenerated ${INDEX_JSON}:`, folders);
