
# I like fishes

A static, offline-capable PWA showcasing HTML5 games with Apple-style scroll animations and a live Minecraft-server dashboard.

---

## Table of Contents

1. [Overview](#overview)  
2. [Project Structure](#project-structure)  
3. [Developer Setup](#developer-setup)  
4. [Adding & Configuring Games](#adding--configuring-games)  
5. [Game Folder Config Format](#game-folder-config-format)  
6. [Touch & Controller Support](#touch--controller-support)  
7. [No Logging Policy](#no-logging-policy)  
8. [Deployment](#deployment)  
9. [License](#license)  
10. [Credits](#credits)  

---

## Overview

- Three pages: **Home**, **Games**, **Minecraft Server**  
- Apple-style **smooth scroll** & **zoom effects** via Locomotive Scroll  
- Typing-effect hero header with blinking cursor  
- **Offline-first** via Service Worker & PWA manifest  
- Each game in its own folder with a `config.json`  
- Live stats chart (falls back to “Offline”)  
- Fullscreen, controller, and touch support  

---

## Project Structure

```
my-site/
├─ index.html
├─ games.html
├─ server.html
├─ manifest.json
├─ CNAME
├─ README.md
├─ assets/
│  ├─ css/
│  │  └─ styles.css
│  └─ js/
│     ├─ typing.js
│     ├─ loco.js
│     ├─ games-list.js
│     ├─ server.js
│     ├─ fullscreen.js
│     ├─ sw-register.js
│     └─ service-worker.js
├─ assets/img/
│  ├─ bg-home.jpg
│  ├─ bg-games.jpg
│  ├─ bg-server.jpg
│  └─ example-game-icon.png
└─ games/
   └─ pong/
      ├─ index.html
      ├─ pong.css
      ├─ pong.js
      └─ config.json
```

---

## Developer Setup

1. **Clone** the repo:  
   ```bash
   git clone https://github.com/yourusername/ilikefish.space.git
   cd ilikefish.space
   ```
2. **Serve locally** (e.g. via `http-server`):  
   ```bash
   npx http-server . -p 8080
   ```
3. Open `http://localhost:8080/` in your browser.

---

## Adding & Configuring Games

1. **Create a folder** under `/games/` named for your game (e.g. `mygame`).  
2. Inside that folder include:  
   - `index.html` (entry point)  
   - Game assets (CSS/JS files)  
   - `icon.png` (300×300px cover image)  
   - `config.json` (metadata)  
3. **No need to edit** a central JSON—`assets/js/games-list.js` auto-discovers every `/games/*/config.json`.  
4. On next load (online), the Service Worker caches the new game files automatically.

---

## Game Folder Config Format

Each game must include a `config.json` like this:

```json
{
  "name": "Game Title",
  "folder": "pong",
  "icon": "icon.png",
  "entry": "index.html",
  "touchInstructions": "Use drag or tap to move.",
  "controllerMapping": {
    "buttons": {
      "0": "Jump",
      "1": "Shoot"
    },
    "axes": {
      "0": "Move X",
      "1": "Move Y"
    }
  }
}
```

- **name**: Displayed in gallery  
- **folder**: Folder name (matches this directory)  
- **icon**: Cover image filename  
- **entry**: HTML entry file  
- **touchInstructions**: Shown to touchscreen users  
- **controllerMapping**: (Optional) maps Gamepad buttons/axes  

---

## Touch & Controller Support

- **Touch**: Implement `pointerdown`, `pointermove`, `pointerup` in your game.  
- **Controller**: Listen for `gamepadconnected` and poll `navigator.getGamepads()` to handle input.

---

## No Logging Policy

This site does **not** collect or transmit personal data. All stats queries run client-side against your Minecraft server API.

---

## Deployment

1. **Push** to GitHub.  
2. In **GitHub Pages** settings:  
   - Source → `main` branch, root (`/`)  
   - Custom domain → `ilikefish.space`  
3. On **Namecheap DNS**:  
   - **A** @ → `185.199.108.153`  
   - **A** @ → `185.199.109.153`  
   - **A** @ → `185.199.110.153`  
   - **A** @ → `185.199.111.153`  
   - **CNAME** www → `yourusername.github.io.`  

---

## License

```
© 2025 Your Name. All Rights Reserved.
No part of this website may be reproduced, distributed,
or modified without written permission.
```

---

## Credits

- **Locomotive Scroll** for smooth scrolling  
- **Chart.js** for stats graphs  
- **MDN Fullscreen API** docs  
- **MDN Gamepad API** docs  
