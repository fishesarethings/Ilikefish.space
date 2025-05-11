# I like fishes

## Overview
This static PWA hosts offline-capable HTML5 games with Apple-style scroll animations.

## Developer Setup
1. Clone repo, ensure Node.js installed if you use npm.
2. Serve locally: `npx http-server .`
3. Browse `http://localhost:8080`

## Adding New Games
- Add folder under `/games/` with:
  - `index.html` (canvas or embedded iframe)
  - Game JS/CSS assets
  - Icon (PNG)
- Update `games.json`:
  ```json
  {
    "name":"Game Name",
    "folder":"folder-name",
    "icon":"icon-file.png"
  }
