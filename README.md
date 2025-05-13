# I like fishes _ – Game Developer Guide

## Overview  
This guide explains how to add and configure new HTML5 games with advanced controls, versions, and score persistence.

## Pong Versioning & Controls  
- Current Pong v1.2.0 saved in `localStorage`  
- Modes: Single vs. Two Player  
- Control Schemes: Keyboard, Gamepad, Touch  
- Sensitivity slider for paddle speed  
- Start Match button to enable play  
- Fullscreen toggle  
- Version selector to load older builds  
- Score bar showing current score & high score, with reset  

## Score Persistence  
Use `localStorage`:
```js
localStorage.setItem('pongScores', JSON.stringify(scores));
const scores = JSON.parse(localStorage.getItem('pongScores')||'{}');
```

## Adding a New Game  
Follow the existing structure under `games/` and include in `config.json`:
```json
{
  "name":"Game Title",
  "folder":"slug",
  "icon":"icon.png",
  "entry":"slug.html",
  "touchInstructions":"…",
  "controllerMapping": { "axes":{/*…*/},"buttons":{/*…*/} }
}
```

## Deployment  
Push to GitHub; Service Worker will update with version check and cache clear script.  
