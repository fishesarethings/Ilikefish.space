// Version and State
const CUR_VER = '1.2.0';
let mode='single', control='keyboard', sens=8, started=false;
let scores={left:0,right:0,high:0};
const canvas=document.getElementById('pongCanvas'),
      ctx=canvas.getContext('2d'),
      modeSel=document.getElementById('mode-select'),
      ctrlSel=document.getElementById('control-select'),
      verSel=document.getElementById('version-select'),
      sensSlider=document.getElementById('sensitivity'),
      startBtn=document.getElementById('start-btn'),
      fsBtn=document.getElementById('fullscreen-btn'),
      scoreSpan=document.getElementById('current-score'),
      highSpan=document.getElementById('high-score'),
      resetBtn=document.getElementById('reset-scores');

// Load saved
const saved=JSON.parse(localStorage.getItem('pongScores')||'{}');
scores.left=saved.left||0; scores.right=saved.right||0; scores.high=saved.high||0;
updateScoreUI();

// Handlers
modeSel.onchange=()=>mode=modeSel.value;
ctrlSel.onchange=()=>control=ctrlSel.value;
sensSlider.oninput=()=>sens=+sensSlider.value;
verSel.onchange=()=>location.href=`../versions/${verSel.value}/pong.html`;
startBtn.onclick=()=>started=true;
fsBtn.onclick=()=>!document.fullscreenElement? canvas.requestFullscreen():document.exitFullscreen();
resetBtn.onclick=()=>{
  scores.high=0; saveScores(); updateScoreUI();
};

// Save/load
function saveScores(){
  localStorage.setItem('pongScores',JSON.stringify(scores));
}
function updateScoreUI(){
  scoreSpan.textContent=`${scores.left} – ${scores.right}`;
  highSpan.textContent=`High: ${scores.high}`;
}

// Game elements
const PADDLE_H=100,PADDLE_W=12;
let leftY=(canvas.height-PADDLE_H)/2, rightY=leftY;
let ball={x:canvas.width/2,y:canvas.height/2,r:12,dx:5,dy:5};
const keys={};

// Input
window.addEventListener('keydown',e=>keys[e.key]=true);
window.addEventListener('keyup',e=>keys[e.key]=false);
canvas.addEventListener('pointermove',e=>{
  if(control!=='touch') return;
  let y=e.clientY-canvas.getBoundingClientRect().top;
  if(e.clientX<canvas.width/2) leftY=y-PADDLE_H/2;
});

// Draw
function draw(){
  ctx.fillStyle='#222'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#eee';
  ctx.fillRect(0,leftY,PADDLE_W,PADDLE_H);
  ctx.fillRect(canvas.width-PADDLE_W,rightY,PADDLE_W,PADDLE_H);
  ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,2*Math.PI); ctx.fill();
}

// Update
function update(){
  if(!started) return;
  // Move ball
  ball.x+=ball.dx; ball.y+=ball.dy;
  if(ball.y<ball.r||ball.y>canvas.height-ball.r) ball.dy*=-1;
  // Collide paddles
  if(ball.x< PADDLE_W+ball.r && ball.y>leftY && ball.y<leftY+PADDLE_H) ball.dx*=-1;
  if(ball.x>canvas.width-PADDLE_W-ball.r && ball.y>rightY && ball.y<rightY+PADDLE_H) ball.dx*=-1;
  // Score
  if(ball.x<0||ball.x>canvas.width){
    ball.x=canvas.width/2; ball.y=canvas.height/2;
    if(ball.x<0) scores.right++; else scores.left++;
    scores.high=Math.max(scores.high,scores.left,scores.right);
    saveScores(); updateScoreUI();
    ball.dx*=-1;
  }
  // Paddles
  let sp = (mode==='single'? sens : sens);
  if(control==='keyboard'||control==='both'){
    if(keys.w) leftY-=sp; if(keys.s) leftY+=sp;
    if(mode==='two'){ if(keys.ArrowUp) rightY-=sp; if(keys.ArrowDown) rightY+=sp; }
  }
  if(mode==='single'){
    rightY+=(ball.y-(rightY+PADDLE_H/2))*0.1;
  }
  // Bounds
  leftY=Math.max(0,Math.min(canvas.height-PADDLE_H,leftY));
  rightY=Math.max(0,Math.min(canvas.height-PADDLE_H,rightY));
}

// Main loop
function loop(){
  draw(); update();
  requestAnimationFrame(loop);
}
loop();
