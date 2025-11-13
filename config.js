// EDITABLE CONFIG: change sprite paths, physics, and spawn rates here
window.JAVI_CONFIG = {
  theme: {
    primary: '#0d47a1',   // blue
    accent: '#1976d2',    // lighter blue
    background: '#ffffff' // fallback canvas background
  },
  sprites: {
    // Place images into /assets and update paths if you rename them.
    character: 'assets/character.png',
    obstacle:  'assets/obstacle.png',
    background: 'assets/bg.png'
  },
  gameplay: {
    gravity: 1800,      // px / s^2
    jumpVelocity: -700, // initial jump vy (px / s)
    groundOffset: 100,  // ground Y is canvas.height - groundOffset
    speed: 420,         // world scroll speed px / s
    spawnInterval: [0.9, 1.5], // seconds between obstacles (min, max)
    obstacleSize: [48, 96] // min and max obstacle size in px
  },
  debug: {
    showHitboxes: false
  }
};
