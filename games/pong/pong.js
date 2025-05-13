// Canvas setup
const canvas = document.getElementById('pongCanvas'),
      ctx    = canvas.getContext('2d');

const modeSelect    = document.getElementById('mode-select'),
      controlSelect = document.getElementById('control-select'),
      sensSlider    = document.getElementById('sensitivity'),
      fsBtn         = document.getElementById('fullscreen-btn');

// State
let mode = 'single',
    control = 'keyboard',
    sens = parseInt(sensSlider.value);

modeSelect.onchange    = () => mode = modeSelect.value;
controlSelect.onchange = () => control = controlSelect.value;
sensSlider.oninput     = () => sens = parseInt(sensSlider.value);

// Fullscreen
fsBtn.onclick = () => {
  if (!document.fullscreenElement) canvas.requestFullscreen();
  else document.exitFullscreen();
};

// Paddles
const PADDLE_H = 100, PADDLE_W = 12;
let leftY = (canvas.height - PADDLE_H)/2,
    rightY = leftY;

// Ball
let ball = { x: canvas.width/2, y: canvas.height/2, r:12, dx:5, dy:5 };

// Scores
let scores = { left:0, right:0 };
const saveScores = () => localStorage.setItem('pongScores', JSON.stringify(scores));
const loadScores = () => {
  const s = JSON.parse(localStorage.getItem('pongScores') || '{}');
  scores = { left: s.left||0, right: s.right||0 };
};
loadScores();

// Input trackers
const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup',   e => keys[e.key] = false);

// Gamepad
let gamepads = {};
window.addEventListener('gamepadconnected', e => {
  gamepads[e.gamepad.index] = e.gamepad;
});
window.addEventListener('gamepaddisconnected', e => {
  delete gamepads[e.gamepad.index];
});

// Touch
let touchDir = 0;
canvas.addEventListener('pointermove', e => {
  if (control !== 'touch') return;
  const rect = canvas.getBoundingClientRect();
  const y = e.clientY - rect.top;
  // Left half controls left paddle
  if (e.clientX - rect.left < canvas.width/2) {
    leftY = y - PADDLE_H/2;
  }
});

// Draw frame
function draw() {
  // Clear
  ctx.fillStyle = '#222';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Draw paddles
  ctx.fillStyle = '#eee';
  ctx.fillRect(0,leftY,PADDLE_W,PADDLE_H);
  ctx.fillRect(canvas.width - PADDLE_W,rightY,PADDLE_W,PADDLE_H);

  // Draw ball
  ctx.beginPath();
  ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);
  ctx.fill();

  // Move ball
  ball.x += ball.dx; ball.y += ball.dy;
  if (ball.y < ball.r || ball.y > canvas.height - ball.r) ball.dy = -ball.dy;

  // Collisions
  if (
    ball.x - ball.r < PADDLE_W &&
    ball.y > leftY && ball.y < leftY + PADDLE_H
  ) ball.dx = -ball.dx;

  if (
    ball.x + ball.r > canvas.width - PADDLE_W &&
    ball.y > rightY && ball.y < rightY + PADDLE_H
  ) ball.dx = -ball.dx;

  // Score
  if (ball.x < 0 || ball.x > canvas.width) {
    if (ball.x < 0) scores.right++;
    else scores.left++;
    saveScores();
    ball.x = canvas.width/2; ball.y = canvas.height/2;
    ball.dx = -ball.dx;
  }
}

// Update paddles
function updatePaddles() {
  // Keyboard
  if (control === 'keyboard' || control === 'both') {
    if (keys.w) leftY -= sens;
    if (keys.s) leftY += sens;
    if (keys.ArrowUp) rightY -= sens;
    if (keys.ArrowDown) rightY += sens;
  }

  // Gamepad
  if (control === 'gamepad') {
    const gp = navigator.getGamepads()[0];
    if (gp) {
      leftY += gp.axes[1] * sens * 2;
      rightY += gp.axes[3] * sens * 2;
    }
  }

  // Single player AI
  if (mode === 'single') {
    rightY += (ball.y - (rightY + PADDLE_H/2)) * 0.05 * sens;
  }

  // Bounds
  leftY  = Math.max(0, Math.min(canvas.height - PADDLE_H, leftY));
  rightY = Math.max(0, Math.min(canvas.height - PADDLE_H, rightY));
}

// Main loop
function loop() {
  draw();
  updatePaddles();
  requestAnimationFrame(loop);
}

// Start
loop();
