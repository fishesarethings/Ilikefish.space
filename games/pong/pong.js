// Constants
const canvas = document.getElementById('pongCanvas'),
      ctx    = canvas.getContext('2d'),
      MODE_SELECT = document.getElementById('mode-select'),
      DIFF_SELECT = document.getElementById('difficulty-select'),
      RESET_BTN   = document.getElementById('reset-scores'),
      TOUCH_UP    = document.getElementById('up-btn'),
      TOUCH_DOWN  = document.getElementById('down-btn');

// Game state
let mode = 'single', difficulty = 'easy';
let scores = { left:0, right:0, high:0 };

// Load scores
if (localStorage.getItem('pongScores')) {
  scores = JSON.parse(localStorage.getItem('pongScores'));
}

// UI updates
function updateScores() {
  const scoreText = `${scores.left} – ${scores.right}`;
  document.title = `Pong (${scoreText})`;
  if (scores.left > scores.high || scores.right > scores.high) {
    scores.high = Math.max(scores.left, scores.right);
    saveScores();
  }
}
function saveScores() {
  localStorage.setItem('pongScores', JSON.stringify(scores));
}

// Reset action
RESET_BTN.onclick = () => {
  scores = { left:0, right:0, high: scores.high };
  saveScores(); updateScores();
};

// Mode & difficulty listeners
MODE_SELECT.onchange = () => {
  mode = MODE_SELECT.value;
  document.getElementById('difficulty-label').style.display = (mode==='single'? 'block':'none');
};
DIFF_SELECT.onchange = () => difficulty = DIFF_SELECT.value;

// Touch controls
let touchY=null;
TOUCH_UP.onpointerdown = () => touchY = -1;
TOUCH_DOWN.onpointerdown = () => touchY = 1;
window.addEventListener('pointerup', ()=> touchY=null);

// Paddle state
let leftY = canvas.height/2 - 40, rightY = leftY;
const paddleH=80, paddleW=10;

// Ball
let ball = { x:300, y:200, dx:4, dy:4, r:10 };

// Game loop
function loop(){
  // Clear
  ctx.clearRect(0,0,600,400);

  // Draw paddles
  ctx.fillStyle='white';
  ctx.fillRect(0,leftY,paddleW,paddleH);
  ctx.fillRect(590,rightY,paddleW,paddleH);

  // Draw ball
  ctx.beginPath();
  ctx.arc(ball.x,ball.y,ball.r,0,2*Math.PI); ctx.fill();

  // Move ball
  ball.x+=ball.dx; ball.y+=ball.dy;
  if(ball.y<ball.r||ball.y>400-ball.r) ball.dy*=-1;

  // Collisions
  if(ball.x - ball.r < paddleW && ball.y > leftY && ball.y < leftY+paddleH){
    ball.dx = -ball.dx;
  }
  if(ball.x + ball.r > 600-paddleW && ball.y > rightY && ball.y < rightY+paddleH){
    ball.dx = -ball.dx;
  }

  // Scoring
  if(ball.x < 0 || ball.x > 600){
    if(ball.x<0) scores.right++;
    else scores.left++;
    saveScores(); updateScores();
    ball.x=300; ball.y=200; ball.dx = -ball.dx;
  }

  // Control paddles
  // Two-player
  if(mode==='two'){
    document.onkeydown = e=>{
      if(e.key==='w') leftY-=8;
      if(e.key==='s') leftY+=8;
      if(e.key==='ArrowUp') rightY-=8;
      if(e.key==='ArrowDown') rightY+=8;
    };
  } else {
    // Single: AI right paddle
    const speed = difficulty==='hard'? 5 : difficulty==='medium'? 3 : 2;
    rightY += (ball.y - (rightY+paddleH/2)) * 0.05 * speed;
    // Player via WASD/touch
    document.onkeydown = e=>{
      if(e.key==='w'||e.key==='ArrowUp') leftY-=8;
      if(e.key==='s'||e.key==='ArrowDown') leftY+=8;
    };
    if(touchY) leftY += touchY*5;
  }

  // Bounds
  leftY = Math.max(0,Math.min(400-paddleH,leftY));
  rightY= Math.max(0,Math.min(400-paddleH,rightY));

  requestAnimationFrame(loop);
}

// Init
window.onload = () => {
  updateScores();
  loop();
};
