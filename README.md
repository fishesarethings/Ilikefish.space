# I like fishes _ – Game Developer Guide

## Overview  
This guide explains how to add and configure new HTML5 games for the **I like fishes _** site. Games are discovered automatically, cached offline, and displayed with Apple-style scroll/zoom animations.

## Prerequisites  
- Basic HTML5/CSS/JavaScript  
- A static file server (e.g., `http-server`) for local testing

## Folder Structure  
```  
my-site/  
└─ games/  
   └─ <game-slug>/  
      ├─ index.html  
      ├─ assets.css/.js  
      ├─ icon.png  
      └─ config.json  
```

## Adding a New Game  
1. **Create** `games/<game-slug>/`.  
2. **Include**:  
   - `index.html` (canvas or iframe entry).  
   - Game assets (CSS/JS).  
   - `icon.png` (300×300px).  
   - `config.json`.  
3. **Test** locally:  
   ```bash  
   npx http-server . -p 8080  
   open http://localhost:8080/games/<game-slug>/index.html  
   ```  
4. Service Worker auto-discovers `config.json` and caches assets.

## config.json Format  
```json  
{  
  "name": "Game Title",  
  "folder": "<game-slug>",  
  "icon": "icon.png",  
  "entry": "index.html",  
  "touchInstructions": "Tap or swipe to move.",  
  "controllerMapping": {  
    "buttons": { "0": "Jump", "1": "Shoot" },  
    "axes":    { "0": "Move X", "1": "Move Y" }  
  }  
}  
```

## Input Support  
- **Touch**: use pointer events.  
- **Controller**: use Gamepad API (`navigator.getGamepads()`).

## Offline Caching  
Games are cached on install for offline play.

## Score Persistence  
Use browser localStorage to save and load scores:

```js  
// Save scores  
localStorage.setItem('pongScores', JSON.stringify(scores));  
// Load scores  
const scores = JSON.parse(localStorage.getItem('pongScores') || '{}');  
```

## No Copyright  
Use only original or public-domain assets.

## Contributing  
Submit a PR with your game folder and `config.json`.  
