const canvas=document.getElementById('pongCanvas'), ctx=canvas.getContext('2d');
let ball={x:300,y:200,dx:4,dy:4,r:10};
function draw(){
  ctx.clearRect(0,0,600,400);
  // ball
  ctx.fillStyle='white';
  ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,2*Math.PI);ctx.fill();
  ball.x+=ball.dx; ball.y+=ball.dy;
  if(ball.y+ball.r>400||ball.y-ball.r<0) ball.dy*=-1;
  if(ball.x+ball.r>600||ball.x-ball.r<0) ball.dx*=-1;
  requestAnimationFrame(draw);
}
draw();
