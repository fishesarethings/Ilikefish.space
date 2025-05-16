# I like fishes _ – Game Developer Guide

## Overview

This comprehensive guide explains how to properly add, structure, and test new HTML5 games within the **I like fishes _** PWA site. Whether you're a seasoned web developer or just starting out, this will walk you through everything from folder layout to AI-powered code generation and testing.

## Folder Structure

Every game and supporting asset should be neatly organized following this consistent structure:

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

### Notes:

* The `icon.png` must be exactly 300×300 pixels.
* Place all visual and audio assets inside the same game folder or embed them directly.
* All game files should be self-contained within their folder.

## Adding a New Game

To properly add a game to the platform:

1. Create a new folder inside `/games/` with a unique slug name (e.g. `my-platformer`).
2. Within this folder, include all required files:

   * HTML entry file: `<game-slug>.html`
   * CSS file: `<game-slug>.css`
   * JavaScript logic: `<game-slug>.js`
   * Config metadata: `config.json`
   * Game icon: `icon.png` (300×300 pixels)
3. Do not edit any main files manually. The site will automatically discover and include the game.
4. Ensure the game can run offline. Avoid loading large assets externally unless required.
5. Test your game locally:

   * Open `index.html` in a browser for a basic test.
   * For a proper local preview, run: `npx http-server . -p 8080`

## config.json Format

Your configuration file helps the system auto-detect and render your game:

```json
{
  "name": "Game Display Name",
  "folder": "<game-slug>",
  "icon": "icon.png",
  "entry": "<game-slug>.html",
  "touchInstructions": "Tap or swipe to play.",
  "controllerMapping": {
    "buttons": {},
    "axes": {}
  }
}
```

Make sure every property matches the actual filenames used.

## How It Works

* **Game Discovery**: The script `games-list.js` automatically scans `/games/` directories, reads their `config.json`, and builds the game list.
* **Asset Caching**:

  * Core pages (`index.html`, etc.) are pre-cached by the service worker.
  * Game files and assets are cached at runtime when the user accesses them.
  * Once accessed, games become playable offline.

## AI Prompt Template

You can use AI tools like ChatGPT to generate complete HTML5 game templates.

### Prompt Template for AI (use in ChatGPT):

```markdown
## Generate a Game Template for I like fishes _

I want to build a browser-based HTML5 game titled **[Your Game Title]**.

- **Mechanics**: [Brief description — e.g., avoid obstacles, match tiles].
- **Controls**: Arrow keys, spacebar, or touch.
- **Canvas**: 800×600 with background and score text.
- **Files**:
  - `my-game.html`
  - `my-game.css`
  - `my-game.js`
- **No external dependencies unless necessary**.
- Include comments to explain major code blocks.
- Output each file in a separate code block labeled with filename.
- Include sample images as embedded base64 if needed.
- Include a `icon.png` image (placeholder or simple emoji art, 300×300).
- Add a button labeled 'Home' that links to `https://hidden.ilikefish.space`
- Match the folder structure expected in the I like fishes _ developer guide.
```

### Instructions for Beginners:

1. Open ChatGPT and paste the entire prompt.
2. Fill in your game idea in the brackets.
3. ChatGPT will reply with all the required files.
4. Create a folder like `games/my-new-game/`.
5. Copy each code block into its appropriate file.
6. Place a 300×300px icon in the same folder.
7. Add a `config.json` based on the format above.
8. Open `index.html` to test. Or run a local server (`npx http-server`).

### Testing on Windows:

* Open Notepad or VS Code.
* Paste the code from each file output by ChatGPT.
* Save them in the correct folders.
* Open the main HTML file in a browser.

### Testing on macOS:

* Use TextEdit (set to plain text mode) or VS Code.
* Paste and save code in UTF-8 encoding.
* Open your `.html` file with Safari or Chrome.

---

## Quick Checklist

* [ ] Game has dedicated folder: `/games/my-game/`
* [ ] Includes `*.html`, `*.js`, `*.css`, `icon.png`, `config.json`
* [ ] Folder and filenames match config.json
* [ ] Game includes Home button to return to main site
* [ ] Game works offline
* [ ] No inappropriate themes or externally broken links

---

Happy coding and creating!
