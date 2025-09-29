# I like fishes _ – Game Developer Guide

## Overview

This guide walks you through adding, organizing, and testing HTML5 games in the **I like fishes _** PWA on GitHub Pages. No build tools required—just drop files into your repo and open in a browser.

---

## 📁 Folder Structure

```
my-site/
├─ index.html
├─ games.html
├─ server.html
├─ manifest.json
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

* `icon.png` should be **exactly 300×300px**.
* All visual/audio assets live inside each game folder (or inline them).
* Use absolute paths (`/assets/...`, `/games/...`) so resources resolve consistently across pages and caching layers.

---

## ➕ Adding a New Game

1. Create `/games/<slug>/`.
2. Add these files:

   * `<slug>.html` (entry)
   * `<slug>.css` (styles)
   * `<slug>.js` (logic)
   * `icon.png` (300×300px)
   * `config.json` (metadata). **Important:** include a short `description` field — this is shown in the game loader UI.

Example `config.json` (required fields):

```json
{
  "name": "My Game",
  "folder": "<slug>",
  "icon": "icon.png",
  "entry": "<slug>.html",
  "description": "A short, 1–2 sentence summary of the game shown in the game loader.",
  "touchInstructions": "Tap or click to play.",
  "controllerMapping": { "buttons": {}, "axes": {} }
}
```

**Description guidance**

* Keep it concise (recommended 20–180 characters).
* Plain text only (no HTML). The loader will escape HTML for safety.
* If `description` is missing, the loader will display **"No description"**.

3. Update `/games/index.json` if you’re not using auto-discovery (optional). Example:

```json
{
  "folders": ["pong","timestable-balloons","why-chicken-crossed","<slug>"]
}
```

4. Test locally by simply opening `index.html` or `games.html` in your browser—no server needed.

---

## ⚙️ How It Works

### Game Discovery

* `games-list.js` fetches `/games/index.json` → each `config.json` → renders cards in Featured & All sections. The loader reads `name`, `description`, `icon`, `entry` and `touchInstructions` from each `config.json`.

### Server Stats

* `server.js` writes join info (mc.ilikefish.space + port) and fetches live stats from `api.mcsrvstat.us` → Chart.js line graph.

---

## 🧠 AI Prompt Template

Use this full prompt in ChatGPT to scaffold a new game folder. Note: the `description` field is required for the game loader.

````markdown
## Scaffold a New Game for "I like fishes _"
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
5. config.json (metadata — **must include** `description`)

Example `config.json` provided to the model should include:
```json
{
  "name": "[Your Game Title]",
  "folder": "[slug]",
  "icon": "icon.png",
  "entry": "[slug].html",
  "description": "A short 1-2 sentence description shown in the loader",
  "touchInstructions": "Tap or click to play."
}
````

### In ChatGPT

* Provide each file in its own code block labeled with filename.
* Include comments explaining major sections.
* Add a Home button linking back to /index.html.
* Ensure all paths are absolute (start with /).

```

---

## 📝 Quick Checklist

```

[ ] Created /games/index.json entry

[ ] /games/<slug>/ contains:

* .html, .css, .js
* icon.png (300×300px)
* config.json (including the required "description" field)

[ ] Opened games.html locally to verify game list

```

Happy coding and creating! 🎮

Soon coming: the game packager to make packaging and uploading games even easier.

```
