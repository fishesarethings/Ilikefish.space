# I like fishes _ – Game Developer Guide

## Overview

This guide walks you through adding, organizing, and testing HTML5 games in the I like fishes _ PWA on GitHub Pages. No build tools required—just drop files into your repo and open in a browser.

---

## 📁 Folder Structure

```
my-site/
├─ index.html
├─ games.html
├─ server.html
├─ manifest.json
├─ service-worker.js
├─ CNAME
├─ assets/
│ ├─ css/
│ │ └─ styles.css
│ ├─ img/
│ │ ├─ bg-home.jpg
│ │ ├─ bg-games.jpg
│ │ ├─ bg-server.jpg
│ │ └─ ilikefishes.ico
│ └─ js/
│ ├─ typing.js
│ ├─ games-list.js
│ ├─ server.js
│ ├─ fullscreen.js
│ └─ sw-register.js
└─ games/
 ├─ index.json
 └─ <game-slug>/
 ├─ <slug>.html
 ├─ <slug>.css
 ├─ <slug>.js
 ├─ icon.png ← 300×300px
 └─ config.json
```

### Notes
 - icon.png must be exactly 300×300px.
 - All visual/audio assets live inside each game folder (or inline them).
 - Use absolute paths (/assets/..., /games/...) so caching and SW can find them.

---

## ➕ Adding a New Game

1. Create /games/<slug>/.
2. Add these files:
 - <slug>.html (entry)
 - <slug>.css (styles)
 - <slug>.js (logic)
 - icon.png (300×300px)
 - config.json:
 json  {  "name":"My Game",  "folder":"<slug>",  "icon":"icon.png",  "entry":"<slug>.html",  "touchInstructions":"Tap or click to play.",  "controllerMapping":{ "buttons":{}, "axes":{} }  } 
3. Update /games/index.json if you’re not using auto-discovery (optional):
 json  { "folders":[ "pong","timestable-balloons","why-chicken-crossed","<slug>" ] } 
4. Test locally by simply opening index.html or games.html in your browser—no server needed.
5. Offline: first visit caches shell + runtime caches game assets; revisit with network off to confirm.

---

## ⚙️ How It Works

### Game Discovery

- games-list.js fetches /games/index.json → each config.json → renders cards in Featured & All sections.

### Server Stats

- server.js writes join info (mc.ilikefish.space + port) and fetches live stats from api.mcsrvstat.us → Chart.js line graph.

### Asset Caching

- Precache (install): service worker caches core shell:
 • /, /index.html, /games.html, /server.html, /manifest.json
 • /assets/css/styles.css
 • All /assets/js/*.js
 • (Optionally) a generated /precache-manifest.js listing every game asset.

- Runtime cache: on fetch, serve from cache or network, then cache new responses—that way, every visited game and image becomes offline-ready.

---

## 🛠️ Service Worker Setup

### Manual Precache (no build step)
In service-worker.js, modify the install handler’s toCache set to include:

```js
const PRECACHE = 'static-v1';
const PRECACHE_URLS = [
 '/', '/index.html','/games.html','/server.html','/manifest.json',
 '/assets/css/styles.css',
 '/assets/js/typing.js','/assets/js/games-list.js',
 '/assets/js/server.js','/assets/js/fullscreen.js',
 '/assets/js/sw-register.js',
 // + each game entry, icon, and asset folder...
];
self.addEventListener('install', evt => {
 evt.waitUntil(
 caches.open(PRECACHE).then(cache => cache.addAll(PRECACHE_URLS))
 );
});
```

### Automatic Caching

Use the existing HTML-scrape logic to discover <script>, <link>, <img>, and game assets dynamically—just ensure paths resolve.

---

## 🧠 AI Prompt Template

Use this full prompt in ChatGPT to scaffold a new game folder complete with precache manifest:

```markdown
## Scaffold a New Game for “I like fishes _”
I’m building an HTML5 browser game titled [Your Game Title] for the “I like fishes _” site.
### Requirements
- Mechanics: [e.g., avoid obstacles, match tiles].
- Controls: arrow keys, spacebar, or touch input.
- Canvas: 800×600px size with background and HUD.

### Files to generate in /games/[slug]/:
1. [slug].html
2. [slug].css
3. [slug].js
4. icon.png (300×300px placeholder)
5. config.json (metadata as above)
6. precache-manifest.js listing those four paths:
```js
self.__WB_MANIFEST = [
 '/games/[slug]/[slug].html',
 '/games/[slug]/[slug].css',
 '/games/[slug]/[slug].js',
 '/games/[slug]/icon.png'
];
```
### In ChatGPT
 - Provide each file in its own code block labeled with filename.
 - Include comments explaining major sections.
 - Add a Home button linking back to /index.html.
 - Ensure all paths are absolute (start with /).
```

---

## 📝 Quick Checklist

`[ ]` Created /games/index.json entry

`[ ]` /games/<slug>/ contains:
 - .html, .css, .js
 - icon.png (300×300px)
 - config.json
 - precache-manifest.js (if using manual manifest)

`[ ]` Opened games.html locally to verify game list

`[ ]` Tested offline: all visited pages and games load without network

`[ ]` Confirmed MC server address is mc.ilikefish.space, port 19132

`[ ]` Updated service-worker.js to cache all core and game assets

---

Happy coding and creating! 🎮