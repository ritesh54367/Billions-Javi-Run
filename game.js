(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const logicalW = canvas.width;
  const logicalH = canvas.height;
  canvas.width = logicalW * DPR;
  canvas.height = logicalH * DPR;
  ctx.scale(DPR, DPR);

  const C = window.JAVI_CONFIG;
  const state = { running: false, paused: false, showHitboxes: C.debug.showHitboxes, score: 0, highScore: 0 };
  const world = { groundY: C.gameplay.groundY, speed: C.gameplay.speed, gravity: C.gameplay.gravity, entities: [] };
  const player = { x: 100, y: world.groundY - 64, w: 56, h: 64, vy: 0, onGround: true };

  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnRestart = document.getElementById('btnRestart');
  const toggleHitboxes = document.getElementById('toggleHitboxes');

  toggleHitboxes.checked = state.showHitboxes;
  toggleHitboxes.addEventListener('change', () => state.showHitboxes = toggleHitboxes.checked);
  btnStart.onclick = () => { if (!state.running) startGame(); else jump(); };
  btnPause.onclick = () => state.paused = !state.paused;
  btnRestart.onclick = () => resetGame();
  document.addEventListener('keydown', e => e.code === 'Space' && (state.running ? jump() : startGame()));
  document.addEventListener('touchstart', () => (state.running ? jump() : startGame()), { passive: true });

  const img = {};
  const loadImage = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = src; });
  Promise.all([
    loadImage(C.sprites.character), loadImage(C.sprites.obstacle), loadImage(C.sprites.background)
  ]).then(([c, o, b]) => { img.char = c; img.obs = o; img.bg = b; drawSplash(); loop(0); });

  function startGame(){ state.running = true; state.paused = false; state.score = 0; world.entities = []; player.y = world.groundY - player.h; player.vy = 0; player.onGround = true; }
  function resetGame(){ state.running = false; startGame(); }
  function jump(){ if (player.onGround) { player.vy = C.gameplay.jumpVelocity; player.onGround = false; } }

  function spawnObstacle(){ const size = 48 + Math.random()*40; world.entities.push({x: logicalW + 40, y: world.groundY - size, w: size, h: size}); }
  function rects(a,b){ return !(a.x+a.w<b.x||a.x>b.x+b.w||a.y+a.h<b.y||a.y>b.y+b.h); }

  function update(dt){
    if(!state.running || state.paused)return;
    if(Math.random()<dt/1.5)spawnObstacle();
    world.entities.forEach(e=>e.x-=world.speed*dt);
    world.entities=world.entities.filter(e=>e.x>-e.w);

    player.vy += world.gravity*dt;
    player.y += player.vy*dt;
    if(player.y+player.h>=world.groundY){player.y=world.groundY-player.h;player.vy=0;player.onGround=true;}

    for(const e of world.entities)
      if(rects({x:player.x,y:player.y,w:player.w,h:player.h}, e)) state.running=false;
  }

  function drawBG(time){
    ctx.fillStyle=C.theme.background;ctx.fillRect(0,0,logicalW,logicalH);
    if(img.bg){const w=img.bg.width,h=img.bg.height,off=-(time*C.gameplay.speed*0.3)%w;for(let x=off;x<logicalW;x+=w)ctx.drawImage(img.bg,x,0,w,h);}
    ctx.strokeStyle=C.theme.accent;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,world.groundY);ctx.lineTo(logicalW,world.groundY);ctx.stroke();
  }
  function drawPlayer(){img.char?ctx.drawImage(img.char,player.x,player.y,player.w,player.h):(ctx.fillStyle=C.theme.primary,ctx.fillRect(player.x,player.y,player.w,player.h));}
  function drawObs(){world.entities.forEach(e=>{img.obs?ctx.drawImage(img.obs,e.x,e.y,e.w,e.h):(ctx.fillStyle=C.theme.primary,ctx.fillRect(e.x,e.y,e.w,e.h));});}
  function drawHUD(){ctx.fillStyle=C.theme.primary;ctx.font='16px sans-serif';ctx.fillText('Score: '+state.score,20,30);}
  function drawSplash(){ctx.fillStyle='#eaf2ff';ctx.fillRect(0,0,logicalW,logicalH);ctx.fillStyle=C.theme.primary;ctx.font='bold 48px sans-serif';ctx.fillText('Javi Run',logicalW/2-110,logicalH/2);}
  let last=0;function loop(t){const dt=(t-last)/1000;last=t;update(dt);drawBG(t/1000);drawObs();drawPlayer();drawHUD();requestAnimationFrame(loop);}
})();
