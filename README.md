# I like fishes _ – Game Developer Guide  
  
## Overview  
  
This guide explains how to add new HTML5 games into the **I like fishes _** PWA site.  
  
## Folder Structure  
  
Your project should follow this layout:  
  
```  
my-site/  
├─ index.html  
├─ games.html  
├─ server.html  
├─ manifest.json  
├─ service-worker.js  
├─ CNAME  
├─ assets/  
│  ├─ css/  
│  │  └─ styles.css  
│  ├─ js/  
│  │  ├─ typing.js  
│  │  ├─ loco.js  
│  │  ├─ games-list.js  
│  │  ├─ server.js  
│  │  ├─ fullscreen.js  
│  │  └─ sw-register.js  
│  └─ img/  
│     ├─ bg-home.jpg  
│     ├─ bg-games.jpg  
│     ├─ bg-server.jpg  
│     └─ [shared images]  
└─ games/  
   └─ <game-slug>/  
      ├─ <game-slug>.html  
      ├─ <game-slug>.css  
      ├─ <game-slug>.js  
      ├─ icon.png          ← **300×300px** cover image  
      └─ config.json  
```  
  
## Adding a New Game  
  
1. **Create** a folder under `games/` named exactly your game’s slug (e.g., `pong`).  
2. **Add** these files inside that folder:  
   - `entry`: `<game-slug>.html` (the game’s HTML entry point)  
   - Styles: `<game-slug>.css`  
   - Script: `<game-slug>.js`  
   - **Icon**: `icon.png` (must be **300×300px**)  
   - Metadata: `config.json` (see format below)  
3. **No other edits needed**. On page load (online), the site’s Service Worker will cache new assets and `games-list.js` will automatically detect and render your game.  
4. **Test** by opening `index.html` or via `npx http-server . -p 8080`.  
  
## config.json Format  
  
Each game folder must include a `config.json` with the following structure:  
  
```json  
{  
  "name": "Game Display Name",  
  "folder": "<game-slug>",  
  "icon": "icon.png",  
  "entry": "<game-slug>.html",  
  "touchInstructions": "Tap or swipe to play.",  
  "controllerMapping": {  
    "buttons": { "0": "Jump", "1": "Shoot" },  
    "axes": { "0": "Move X", "1": "Move Y" }  
  }  
}  
```  
  
- **name**: Displayed under your game’s icon.  
- **folder**: Must match this directory’s name.  
- **icon**: Filename of your 300×300px cover image.  
- **entry**: The HTML file that launches your game.  
  
## How It Works  
  
- **Discovery**: `games-list.js` fetches every `games/*/config.json`, builds cards (`<img src="games/slug/icon.png">`, `<h3>name</h3>`, link to `entry`).  
  
- **Caching**:  
  - Core pages (`/`, `index.html`, `games.html`, `server.html`) are pre-cached.  
  - Runtime caches all files under `/assets/` and `/games/` on first fetch.  
  - Once loaded, everything works offline.  
  
## Quick Checklist  
  
- [ ] Create `games/<game-slug>/`  
- [ ] Add `<game-slug>.html`, `.css`, `.js`, `icon.png` (**300×300px**)  
- [ ] Add `config.json` with correct fields  
- [ ] Reload site; new game appears automatically  
- [ ] Test offline by disabling network in dev tools  
  
Happy building!  
