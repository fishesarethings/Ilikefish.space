const canvas = document.getElementById('pongCanvas');
const ctx    = canvas.getContext('2d');

// Ball
let ball = { x:300, y:200, dx:4, dy:4, r:10 };
// Paddles
const paddleHeight = 80, paddleWidth = 10;
let leftPaddleY  = (canvas.height - paddleHeight) / 2;
let rightPaddleY = (canvas.height - paddleHeight) / 2;
const paddleSpeed = 6;

// Draw everything
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // Ball
  ctx.fillStyle='white';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
  ctx.fill();
  // Paddles
  ctx.fillRect(0, leftPaddleY, paddleWidth, paddleHeight);
  ctx.fillRect(canvas.width - paddleWidth, rightPaddleY, paddleWidth, paddleHeight);
  
  // Move ball
  ball.x += ball.dx;
  ball.y += ball.dy;
  
  // Bounce off top/bottom
  if (ball.y + ball.r > canvas.height || ball.y - ball.r < 0) {
    ball.dy = -ball.dy;
  }
  // Left paddle collision
  if (
    ball.x - ball.r < paddleWidth &&
    ball.y > leftPaddleY && ball.y < leftPaddleY + paddleHeight
  ) {
    ball.dx = -ball.dx;
  }
  // Right paddle collision
  if (
    ball.x + ball.r > canvas.width - paddleWidth &&
    ball.y > rightPaddleY && ball.y < rightPaddleY + paddleHeight
  ) {
    ball.dx = -ball.dx;
  }
  // Score reset
  if (ball.x - ball.r < 0 || ball.x + ball.r > canvas.width) {
    ball.x = canvas.width/2; ball.y = canvas.height/2;
    ball.dx = -ball.dx;
  }
}

// Control paddles via touch
canvas.addEventListener('pointermove', e => {
  const rect = canvas.getBoundingClientRect();
  const y = e.clientY - rect.top;
  // Split left/right half
  if (e.clientX - rect.left < canvas.width/2) {
    leftPaddleY = Math.min(Math.max(y - paddleHeight/2, 0), canvas.height - paddleHeight);
  } else {
    rightPaddleY = Math.min(Math.max(y - paddleHeight/2, 0), canvas.height - paddleHeight);
  }
});

// Main loop
function loop() {
  draw();
  requestAnimationFrame(loop);
}
loop();
