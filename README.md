# I like fishes _ – Game Developer Guide

## Overview
Each game folder under `games/` is auto-discovered and cached offline. This guide shows how to add games with:
- **Multiplayer vs. local** (WASD vs. arrows)
- **Controller** support for two gamepads
- **Touch** controls
- **Single-player** AI with Easy/Medium/Hard
- **Scorekeeping** with browser storage
- **High-score** saving and reset option

## Folder Structure
my-site/
└─ games/
└─ pong/
├─ pong.html
├─ pong.css
├─ pong.js
├─ icon.png
└─ config.json

pgsql
Copy
Edit

## Adding a New Game
1. **Create** `games/<slug>/`.
2. **Include**:
   - `<slug>.html` entry.
   - CSS/JS assets.
   - `icon.png` (300×300px).
   - `config.json`.
3. **Configure** in `config.json`:
   ```json
   {
     "name":"Title",
     "folder":"slug",
     "icon":"icon.png",
     "entry":"slug.html",
     "touchInstructions":"…",
     "controllerMapping": { "axes":{/*…*/},"buttons":{/*…*/} }
   }
Controls & Modes: Implement WASD, ArrowKeys, Gamepad, Touch in your JS.

Score Persistence:

js
Copy
Edit
// Save
localStorage.setItem('gameScores', JSON.stringify(scores));
// Load
const scores = JSON.parse(localStorage.getItem('gameScores') || '{}');
Test Locally:

bash
Copy
Edit
npx http-server . -p 8080
open http://localhost:8080/games/pong/pong.html
Deploy: Commit, push; Service Worker caches automatically.

Input Support
Touch: pointer events for mobile.

Controller: gamepadconnected + navigator.getGamepads().

Keyboard: keydown events for WASD/Arrows.

Caching & Offline
Service Worker will cache core pages and runtime-cache all assets/games on first load.

Contributing
Fork, add your game folder and config.json, open a PR.

yaml
Copy
Edit

---

With these updates, your Pong game now supports two-player, single-player AI, multiple control schemes, and persistent scoring. Your README explains exactly how to replicate for new games.