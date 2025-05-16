## Making a Game Without Code (AI-Driven Workflow)

Use **only ChatGPT**—no external tools—to generate, organize, and test a complete HTML5 game. This workflow guides **absolute beginners** through:

- Crafting a clear prompt for ChatGPT  
- Organizing the generated files into the proper folder structure  
- Testing locally on Windows (Notepad) & Mac (TextEdit)  
- Deploying to GitHub Pages  

### 1. Folder Layout

Create a project folder and subfolders as shown:  
```
my-ai-game/  
├─ index.html              ← AI-generated game entry  
├─ assets/  
│  ├─ css/  
│  │  └─ styles.css       ← AI-generated or inline CSS  
│  ├─ js/  
│  │  └─ game.js          ← AI-generated game logic  
│  └─ img/  
│     └─ icon.png         ← Optional cover image  
└─ README.md               ← This guide  
```  

### 2. ChatGPT Prompt Template

Copy and paste **exactly** (replace bracketed text **only**):

```  
## Build Me a Game  
  
I want to build a simple **[genre/mechanics]** game.  
- The game must include a cover icon (`assets/img/icon.png`).  
- Folder layout as above.  
- Gameplay: **[one-sentence description]**.  
- Controls: **[e.g., arrow keys, touch]**.  
- Canvas size: **640×360**, with a real-time score display.  
- Include comments explaining each major section.  
- Provide all files (`index.html`, `assets/css/styles.css`, `assets/js/game.js`) ready to copy & paste.  
- After generation, I will paste each file into the corresponding path and test.  
```

### 3. Testing Locally

#### On **Windows** with Notepad:  
1. **Open Notepad**.  
2. **Paste** the AI’s `index.html` output; **Save As** `index.html` (choose *All Files*).  
3. **Repeat** for CSS/JS into `assets/css/styles.css` and `assets/js/game.js`.  
4. **Double-click** `index.html` to launch in your default browser :contentReference[oaicite:0]{index=0}.

#### On **Mac** with TextEdit:  
1. **Open TextEdit**, go to *Preferences* → *Open and Save*, check *Display HTML files as code* :contentReference[oaicite:1]{index=1}.  
2. **Paste** `index.html` and **Save** with `.html` extension.  
3. **Create** CSS/JS similarly under `assets/css/` and `assets/js/`.  
4. **Right-click** `index.html` → *Open With* → *Safari/Chrome* :contentReference[oaicite:2]{index=2}.

### 4. Deploying to GitHub Pages

1. **Initialize** your Git repo in `my-ai-game/`:  
   ```bash
   git init -b main
   git add .
   git commit -m "AI-generated game"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ``` :contentReference[oaicite:3]{index=3}  
2. On GitHub, go to *Settings* → *Pages*, set **Source** to **main** branch root, and save :contentReference[oaicite:4]{index=4}.  
3. Your site is live at `https://<your-username>.github.io/<repo-name>/`; browse to **index.html** to play.

### 5. Offline & Updates

- **Service Worker** (optional): register one to cache all files for true offline play—see “Making a Game With Code” PWA snippet above.  
- **Versioning**: Add a simple `<script>` in `index.html` to cache-bust on updates:  
  ```js
  const VER = '1.0.0';
  if (localStorage.getItem('ver') !== VER) {
    localStorage.clear();
    localStorage.setItem('ver', VER);
    location.reload(true);
  }
  ```  

### 6. Next-Level Prompts

Refine your AI game by instructing ChatGPT:

- “Make the background sky-blue and add clouds.”  
- “Include a start screen with a ‘Play’ button.”  
- “Add sound effects using Web Audio API.”  

Use these guidelines to iterate until your game is complete—**all without writing a single line yourself**.

<small>Prompt engineering tips adapted from best practices in [Wired’s 17 Tips for Better ChatGPT Prompts]:contentReference[oaicite:5]{index=5} and [PromptStopia’s HTML prompts]:contentReference[oaicite:6]{index=6}.</small>
