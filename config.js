window.JAVI_CONFIG = {
  theme: {
    primary: '#0d47a1',   // blue
    accent: '#1976d2',    // lighter blue
    background: '#ffffff' // canvas background if images fail
  },
  sprites: {
    character: 'assets/character.png',
    obstacle:  'assets/obstacle.png',
    background: 'assets/bg.png'
  },
  gameplay: {
    gravity: 1800,      // px/s^2
    jumpVelocity: -700, // px/s
    groundY: 440,       // y position of ground line
    speed: 420,         // world scroll speed (px/s)
    spawnInterval: [0.9, 1.8]
  },
  debug: {
    showHitboxes: false
  }
};
