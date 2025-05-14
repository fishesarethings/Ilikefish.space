// Canvas setup
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight - (50 + 90);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Assets & Audio
const bgImg      = new Image(); bgImg.src      = 'assets/background.jpg';
const balloonImg = new Image(); balloonImg.src = 'assets/balloon.png';
const popSnd     = new Audio('assets/sounds/pop.mp3');
const wrongSnd   = new Audio('assets/sounds/wrong.mp3');
const bgm        = new Audio('assets/sounds/bgm.mp3'); bgm.loop = true;

// State & Persistence
let balloons = [], lives, score, questionCount, fallTime, diff, paused = false;
const saved      = JSON.parse(localStorage.getItem('timestableScores') || '{}');
const highScores = { easy:0, medium:0, hard:0, ...saved };

// UI Elements
const startScreen   = document.getElementById('start-screen');
const gameContainer = document.getElementById('game-container');
const livesDiv      = document.getElementById('lives');
const scoreBar      = document.getElementById('score-bar');
const currentBar    = document.getElementById('current-bar');
const questionEl    = document.getElementById('question-text');
const answerInput   = document.getElementById('answer-input');
const submitBtn     = document.getElementById('submit-answer');
const pauseBtn      = document.getElementById('pause-btn');
const soundBtn      = document.getElementById('sound-btn');
const audioMenu     = document.getElementById('sound-menu');
const musicVol      = document.getElementById('music-volume');
const fxVol         = document.getElementById('effects-volume');
const keypad        = document.getElementById('keypad');

// Difficulty Selection
document.querySelectorAll('.difficulty-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    diff = btn.dataset.difficulty;
    startScreen.style.display   = 'none';
    gameContainer.style.display = 'block';
    initGame();
  });
});

// Initialize / Reset
function initGame() {
  lives         = diff === 'hard' ? 3 : 5;
  score         = 0;
  questionCount = 0;
  fallTime      = 30000;
  balloons      = [];
  bgm.volume    = musicVol.value = 0.5;
  popSnd.volume = wrongSnd.volume = fxVol.value = 1;
  bgm.play();
  updateUI();
  spawnBalloon();
  requestAnimationFrame(gameLoop);
}

// Spawn logic
function spawnBalloon() {
  if (paused) return;
  const a = Math.ceil(Math.random() * 12),
        b = Math.ceil(Math.random() * 12);
  const speed = canvas.height / (fallTime / 1000 * 60);
  balloons.push({ x: Math.random() * (canvas.width - 100), y: 0, a, b, speed });
  setTimeout(spawnBalloon, diff === 'easy' ? 2000 : diff === 'medium' ? 1500 : 1000);
}

// Main Loop
function gameLoop() {
  if (!paused) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

    balloons.forEach((b, i) => {
      b.y += b.speed;
      ctx.drawImage(balloonImg, b.x, b.y, 100, 100);

      ctx.fillStyle    = 'black';
      ctx.font         = '18px Arial';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${b.a}×${b.b}`, b.x + 50, b.y + 50);

      if (b.y > canvas.height) {
        balloons.splice(i, 1);
        loseLife();
      }
    });

    highlightActive();
  }
  requestAnimationFrame(gameLoop);
}

// Highlight active balloon & question bar
function highlightActive() {
  if (!balloons.length) {
    questionEl.textContent = '?';
    return;
  }
  let active = balloons.reduce((p, c) => (c.y > p.y ? c : p), balloons[0]);
  ctx.strokeStyle = 'yellow';
  ctx.lineWidth   = 3;
  ctx.strokeRect(active.x, active.y, 100, 100);
  questionEl.textContent = `What is: ${active.a} × ${active.b} =`;
}

// Answer handling
submitBtn.addEventListener('click', handleAnswer);
answerInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleAnswer();
});
function handleAnswer() {
  if (paused || !balloons.length) return;
  let active = balloons.reduce((p, c) => (c.y > p.y ? c : p), balloons[0]);
  const val = parseInt(answerInput.value);
  answerInput.value = '';
  if (val === active.a * active.b) {
    popSnd.play();
    balloons = balloons.filter(b => b !== active);
    score++; questionCount++;
    if (questionCount % 5 === 0) {
      fallTime = Math.max(5000, fallTime - 5000);
    }
  } else {
    wrongSnd.play();
    loseLife();
  }
  updateUI();
}

// Lives & UI update
function loseLife() {
  lives--;
  updateUI();
  if (lives <= 0) endGame();
}
function updateUI() {
  livesDiv.textContent    = '❤️'.repeat(lives);
  scoreBar.textContent    = `🏆 High Score: ${highScores[diff] || 0}`;
  currentBar.textContent  = `Current: ${score}`;
}

// Pause button
pauseBtn.addEventListener('click', () => {
  paused = !paused;
  pauseBtn.textContent = paused ? '▶️' : '⏸️';
});

// Sound button — FIXED: toggle a class on the menu
soundBtn.addEventListener('click', () => {
  audioMenu.classList.toggle('visible');
});
musicVol.addEventListener('input', e => bgm.volume = e.target.value);
fxVol.addEventListener('input', e => popSnd.volume = wrongSnd.volume = e.target.value);

// End & persistence
function endGame() {
  paused = true;
  bgm.pause();
  if (score > (highScores[diff] || 0)) {
    highScores[diff] = score;
    localStorage.setItem('timestableScores', JSON.stringify(highScores));
  }
  alert(`Game Over! Your score: ${score}`);
  location.reload();
}

// Keypad handling
document.querySelectorAll('.key').forEach(k => {
  k.addEventListener('click', () => {
    if (k.id === 'key-delete') {
      answerInput.value = answerInput.value.slice(0, -1);
    } else {
      answerInput.value += k.textContent;
    }
    answerInput.focus();
  });
});
