(() => {
  // Core robust runner implementation
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // Responsive canvas sizing (keeps logical coords stable)
  function resizeCanvas() {
    // target logical size: 960x540 scaled to fit width while keeping aspect
    const maxWidth = Math.min(window.innerWidth * 0.96, 1000);
    const aspect = 16 / 9;
    const logicalW = Math.round(maxWidth);
    const logicalH = Math.round(maxWidth / aspect);
    canvas.style.width = logicalW + 'px';
    canvas.style.height = logicalH + 'px';
    const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.width = logicalW * DPR;
    canvas.height = logicalH * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    state.logicalW = logicalW;
    state.logicalH = logicalH;
    state.groundY = logicalH - C.gameplay.groundOffset;
  }
  window.addEventListener('resize', resizeCanvas);

  // Config
  const C = window.JAVI_CONFIG || {};
  // State & world
  const state = {
    running: false,
    paused: false,
    showHitboxes: !!(C.debug && C.debug.showHitboxes),
    time: 0,
    spawnTimer: 0,
    score: 0,
    highScore: Number(localStorage.getItem('javi_highscore') || 0),
    logicalW: 960,
    logicalH: 540,
    groundY: 540 - (C.gameplay ? C.gameplay.groundOffset : 100)
  };

  // UI elements
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnRestart = document.getElementById('btnRestart');
  const toggleHitboxes = document.getElementById('toggleHitboxes');
  toggleHitboxes.checked = state.showHitboxes;
  toggleHitboxes.addEventListener('change', () => state.showHitboxes = toggleHitboxes.checked);
  btnStart.addEventListener('click', () => { if (!state.running) startGame(); else jump(); });
  btnPause.addEventListener('click', () => state.paused = !state.paused);
  btnRestart.addEventListener('click', () => resetGame());

  // Input handlers
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!state.running) startGame();
      else jump();
    }
  });
  window.addEventListener('touchstart', (e) => {
    if (!state.running) startGame();
    else jump();
  }, { passive: true });

  // World objects
  const world = {
    speed: C.gameplay.speed || 420,
    gravity: C.gameplay.gravity || 1800,
    spawnMin: (C.gameplay.spawnInterval && C.gameplay.spawnInterval[0]) || 0.9,
    spawnMax: (C.gameplay.spawnInterval && C.gameplay.spawnInterval[1]) || 1.5,
    obsMin: (C.gameplay.obstacleSize && C.gameplay.obstacleSize[0]) || 48,
    obsMax: (C.gameplay.obstacleSize && C.gameplay.obstacleSize[1]) || 96,
    entities: []
  };

  const player = {
    x: 120,
    y: state.groundY - 64,
    w: 56,
    h: 64,
    vy: 0,
    onGround: true,
    alive: true
  };

  // Asset loading
  const assets = { char: null, obs: null, bg: null };
  function loadImage(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }
  async function loadAll() {
    const s = C.sprites || {};
    assets.char = await loadImage(s.character);
    assets.obs  = await loadImage(s.obstacle);
    assets.bg   = await loadImage(s.background);
    drawSplash();
  }
  loadAll();

  // Helpers
  function randomRange(a, b) { return a + Math.random() * (b - a); }
  function rectsIntersect(a, b) {
    return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
  }

  // Game control
  function startGame() {
    state.running = true;
    state.paused = false;
    state.time = 0;
    state.spawnTimer = 0;
    state.score = 0;
    world.entities = [];
    player.y = state.groundY - player.h;
    player.vy = 0;
    player.onGround = true;
    player.alive = true;
  }
  function resetGame() {
    state.running = false;
    startGame();
  }
  function jump() {
    if (!player.alive) {
      // on dead tap -> restart
      resetGame();
      return;
    }
    if (player.onGround) {
      player.vy = C.gameplay.jumpVelocity || -700;
      player.onGround = false;
    }
  }

  // Spawn obstacle
  function spawnObstacle() {
    const size = Math.round(randomRange(world.obsMin, world.obsMax));
    const e = {
      type: 'obstacle',
      x: state.logicalW + 40,
      y: state.groundY - size,
      w: size,
      h: size,
      passed: false
    };
    world.entities.push(e);
  }

  // Update loop
  function update(dt) {
    if (!state.running || state.paused) return;

    state.time += dt;
    state.spawnTimer += dt;

    // spawn based on interval
    const nextSpawn = randomRange(world.spawnMin, world.spawnMax);
    if (state.spawnTimer >= nextSpawn) {
      spawnObstacle();
      state.spawnTimer = 0;
    }

    // move entities
    for (let i = world.entities.length - 1; i >= 0; i--) {
      const e = world.entities[i];
      e.x -= world.speed * dt;
      // score when passed player
      if (!e.passed && e.x + e.w < player.x) {
        e.passed = true;
        state.score++;
        if (state.score > state.highScore) {
          state.highScore = state.score;
          try { localStorage.setItem('javi_highscore', String(state.highScore)); } catch (e) {}
        }
      }
      // remove offscreen
      if (e.x + e.w < -100) world.entities.splice(i, 1);
    }

    // physics
    player.vy += world.gravity * dt;
    player.y += player.vy * dt;
    if (player.y + player.h >= state.groundY) {
      player.y = state.groundY - player.h;
      player.vy = 0;
      player.onGround = true;
    }

    // collisions
    const pbox = { x: player.x + 6, y: player.y + 6, w: player.w - 12, h: player.h - 12 };
    for (const e of world.entities) {
      const bbox = { x: e.x, y: e.y, w: e.w, h: e.h };
      if (rectsIntersect(pbox, bbox)) {
        player.alive = false;
        state.running = false;
      }
    }
  }

  // Draw functions
  function drawBackground(time) {
    ctx.fillStyle = (C.theme && C.theme.background) || '#ffffff';
    ctx.fillRect(0, 0, state.logicalW, state.logicalH);

    if (assets.bg) {
      // tile background horizontally for parallax
      const img = assets.bg;
      const scale = Math.max(state.logicalH / img.height, state.logicalW / img.width);
      const w = img.width * scale;
      const h = img.height * scale;
      const offset = -((time * (world.speed * 0.25)) % w);
      for (let x = offset - w; x < state.logicalW + w; x += w) {
        ctx.drawImage(img, x, 0, w, h);
      }
    } else {
      // fallback decorative stripes
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#eaf2ff';
      ctx.fillRect(0, 0, state.logicalW, state.logicalH);
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = (C.theme && C.theme.primary) || '#0d47a1';
      for (let i = 0; i < 10; i++) {
        ctx.fillRect((i * 140) - ((time * 30) % 140), 0, 48, state.logicalH);
      }
      ctx.globalAlpha = 1;
    }

    // ground line
    ctx.strokeStyle = (C.theme && C.theme.accent) || '#1976d2';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, state.groundY + 2);
    ctx.lineTo(state.logicalW, state.groundY + 2);
    ctx.stroke();
  }

  function drawPlayer() {
    if (assets.char) {
      ctx.drawImage(assets.char, player.x, player.y, player.w, player.h);
    } else {
      ctx.fillStyle = (C.theme && C.theme.primary) || '#0d47a1';
      roundRect(ctx, player.x, player.y, player.w, player.h, 10, true);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(player.x + player.w * 0.65, player.y + player.h * 0.35, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (state.showHitboxes) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 1;
      ctx.strokeRect(player.x + 6, player.y + 6, player.w - 12, player.h - 12);
    }
  }

  function drawEntities() {
    for (const e of world.entities) {
      if (e.type === 'obstacle') {
        if (assets.obs) ctx.drawImage(assets.obs, e.x, e.y, e.w, e.h);
        else {
          ctx.fillStyle = (C.theme && C.theme.primary) || '#0d47a1';
          roundRect(ctx, e.x, e.y, e.w, e.h, 8, true);
        }
        if (state.showHitboxes) {
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 1;
          ctx.strokeRect(e.x, e.y, e.w, e.h);
        }
      }
    }
  }

  function drawHUD() {
    ctx.fillStyle = (C.theme && C.theme.primary) || '#0d47a1';
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillText('Score: ' + state.score, 18, 28);
    ctx.fillText('Best: ' + state.highScore, 18, 52);

    if (!player.alive) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.font = '700 36px system-ui, sans-serif';
      ctx.fillText('Game Over', state.logicalW / 2 - 88, state.logicalH / 2 - 10);
      ctx.font = '400 14px system-ui, sans-serif';
      ctx.fillText('Press Space / Tap to Restart', state.logicalW / 2 - 100, state.logicalH / 2 + 18);
    } else if (!state.running) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.font = '700 36px system-ui, sans-serif';
      ctx.fillText('Javi Run', state.logicalW / 2 - 80, state.logicalH / 2 - 10);
      ctx.font = '400 14px system-ui, sans-serif';
      ctx.fillText('Press Space / Tap to Start', state.logicalW / 2 - 94, state.logicalH / 2 + 18);
    }
  }

  function roundRect(ctx, x, y, w, h, r, fill) {
    if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + w - r.tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    ctx.lineTo(x + w, y + h - r.br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    ctx.lineTo(x + r.bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    else ctx.stroke();
  }

  function drawSplash() {
    drawBackground(0);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    roundRect(ctx, state.logicalW / 2 - 220, state.logicalH / 2 - 120, 440, 240, 18, true);
    ctx.fillStyle = (C.theme && C.theme.primary) || '#0d47a1';
    ctx.font = '800 44px system-ui, sans-serif';
    ctx.fillText('Javi Run', state.logicalW / 2 - 90, state.logicalH / 2 - 30);
    ctx.font = '400 16px system-ui, sans-serif';
    ctx.fillText('Blue & White endless runner', state.logicalW / 2 - 110, state.logicalH / 2 + 2);
    ctx.fillText('Replace /assets images & tweak config.js', state.logicalW / 2 - 140, state.logicalH / 2 + 30);
  }

  // Main loop
  let lastTs = 0;
  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(1 / 30, (ts - lastTs) / 1000); // clamp dt
    lastTs = ts;

    update(dt);
    // draw
    drawBackground(state.time);
    drawEntities();
    drawPlayer();
    drawHUD();

    requestAnimationFrame(loop);
  }

  // Init
  function init() {
    resizeCanvas();
    drawSplash();
    requestAnimationFrame(loop);
  }

  // Start on load
  window.addEventListener('load', init);
})();
