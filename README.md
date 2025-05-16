# I like fishes \_ – Game Developer Guide

## Overview

This guide explains how to add new HTML5 games into the **I like fishes \_** PWA site.

## Folder Structure

Your project root:

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

1. Create folder `games/<game-slug>/`.
2. Inside add:

   * `entry`: `<game-slug>.html`
   * Styles: `<game-slug>.css`
   * Script: `<game-slug>.js`
   * **Icon**: `icon.png` (300×300px)
   * `config.json` (see below)
3. No further edits; `games-list.js` auto‑discovers and caches it.
4. Test via `index.html` or `npx http-server . -p 8080`.

## config.json Format

```json
{
  "name": "Game Display Name",
  "folder": "<game-slug>",
  "icon": "icon.png",
  "entry": "<game-slug>.html",
  "touchInstructions": "Tap or swipe to play.",
  "controllerMapping": { "buttons": {}, "axes": {} }
}
```

## How It Works

* **Discovery**: `games-list.js` fetches each `config.json` and renders cards.
* **Caching**: Core pages pre-cache; assets and games runtime-cache for offline.

## AI Prompt Template

Use this prompt in ChatGPT to generate a new game template (replace bracketed text):

```markdown
## Generate a Browser Game Template

I want an HTML5 game called **[Your Game Title]**.  
- **Mechanics**: [describe mechanics, e.g., collect items, solve puzzles].  
- **Controls**: arrow keys for movement, SPACE for action.  
- **Canvas**: size 800×600, with a score display at top-left.  
- **Files**: output three files—`index.html`, `assets/css/styles.css`, `assets/js/game.js`.  
- **Assets**: include inline comments, use placeholder graphics.  

Wrap each file in a separate code block labeled with its filename so I can copy & paste.
```

Happy building!
