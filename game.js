// Run & Gun - Cuphead-style side-scroller
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;
const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 540;
const BOSS_X = WORLD_WIDTH - 280;

// Weapons: { speed, damage, cooldown, bulletWidth, bulletHeight, spread? }
const WEAPONS = {
  pistol: { speed: 12, damage: 1, cooldown: 8, bulletWidth: 12, bulletHeight: 8 },
  machinegun: { speed: 16, damage: 1, cooldown: 3, bulletWidth: 10, bulletHeight: 6 },
  spreadgun: { speed: 14, damage: 1, cooldown: 12, bulletWidth: 10, bulletHeight: 6, spread: 3 },
  plasmagun: { speed: 18, damage: 2, cooldown: 5, bulletWidth: 8, bulletHeight: 8 }
};

// Camera
let cameraX = 0;
const CAMERA_SMOOTH = 0.08;

// Player
const player = {
  x: 100,
  y: 432,
  width: 36,
  height: 48,
  vx: 0,
  vy: 0,
  grounded: false,
  facing: 1,
  shootCooldown: 0,
  invincible: 0,
  gun: 'pistol',
  ownedGuns: ['pistol'],
  crouching: false,
  gold: 0,
  hasArmor: false,
  aimAngle: 0  // radians, 0 = right, updated from mouse
};

// Bullets, enemies, platforms, pickups, boss projectiles
let bullets = [];
let enemies = [];
let platforms = [];
let pickups = [];
let bossProjectiles = [];
let deathEffects = [];
let walkerSpawnTimer = 0;
const WALKER_SPAWN_INTERVAL = 120;

// Level themes - expanded for richer visual variety
const LEVEL_THEMES = {
  1: { // Desert temple - golden sands, pyramids, palms
    skyGrad: ['#c9a227', '#e8c547', '#8b6914'],
    farHills: '#7a5a2a',
    midHills: '#9a7a3a',
    nearHills: '#b89650',
    platformFill: '#5c4033',
    platformStroke: '#8b6914',
    platformInner: '#7a5844',
    platformPattern: 'brick',
    accent: '#d4a84b',
    decor: 'pyramid'
  },
  2: { // Jungle - lush greens, vines, foliage
    skyGrad: ['#1a3d2a', '#2d5a3d', '#0d2818'],
    farHills: '#1e4d30',
    midHills: '#2a6b40',
    nearHills: '#3d8a55',
    platformFill: '#2d4a35',
    platformStroke: '#3d7a4a',
    platformInner: '#4a9a5a',
    platformPattern: 'moss',
    accent: '#5ab870',
    decor: 'vines'
  },
  3: { // Cave - crystals, stalactites, bioluminescence
    skyGrad: ['#0a0a1a', '#1a1a3a', '#0d0d25'],
    farHills: '#1a1a35',
    midHills: '#2a2a50',
    nearHills: '#3a3a70',
    platformFill: '#2a2a45',
    platformStroke: '#4a4a8a',
    platformInner: '#5a5aaa',
    platformPattern: 'crystal',
    accent: '#6a8aff',
    decor: 'stalactite'
  },
  4: { // Volcano - lava, embers, ash
    skyGrad: ['#1a0505', '#4a1010', '#2a0808'],
    farHills: '#4a1515',
    midHills: '#6a2020',
    nearHills: '#8a2525',
    platformFill: '#3a1a15',
    platformStroke: '#8a3020',
    platformInner: '#aa4030',
    platformPattern: 'lava',
    accent: '#ff4422',
    decor: 'ember'
  }
};

// Game state
let score = 0;
let hp = 100;
const MAX_HP = 100;
const DEFAULT_DAMAGE = 20;
let currentLevel = 1;
let gameRunning = true;
let victory = false;
let storeOpen = false;
let levelStartTime = 0;  // Date.now() when level started, for time bonus

// High scores (persistent, arcade-style initials)
const HIGH_SCORE_KEY = 'cupheadRunnerHighScores';
const MAX_HIGH_SCORES = 10;
function getHighScores() {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}
function saveHighScore(initials, sc) {
  const list = getHighScores();
  list.push({ initials: initials.toUpperCase().slice(0, 3), score: sc });
  list.sort((a, b) => b.score - a.score);
  localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(list.slice(0, MAX_HIGH_SCORES)));
}
function isHighScore(sc) {
  const list = getHighScores();
  return list.length < MAX_HIGH_SCORES || sc > (list[list.length - 1]?.score ?? 0);
}

let highScoreOverlayShown = false;
function showHighScoreEntry() {
  const overlay = document.getElementById('highScoreOverlay');
  const enterDiv = document.getElementById('highScoreEnter');
  const listDiv = document.getElementById('highScoreList');
  overlay.style.display = 'flex';
  enterDiv.style.display = 'block';
  listDiv.style.display = 'none';
  const input = document.getElementById('initialsInput');
  input.value = '';
  input.focus();
  input.onkeydown = (e) => {
    if (e.key === 'Enter') document.getElementById('initialsSubmit').click();
  };
  document.getElementById('initialsSubmit').onclick = () => {
    const initials = (input.value || 'AAA').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'AAA';
    saveHighScore(initials, score);
    showHighScoreList();
  };
}
function showHighScoreList() {
  const enterDiv = document.getElementById('highScoreEnter');
  const listDiv = document.getElementById('highScoreList');
  enterDiv.style.display = 'none';
  listDiv.style.display = 'block';
  const table = document.getElementById('highScoreTable');
  const list = getHighScores();
  table.innerHTML = list.map((entry, i) =>
    `<li><span>${i + 1}. ${entry.initials}</span><span>${entry.score}</span></li>`
  ).join('');
}
function onGameEnd() {
  if (highScoreOverlayShown) return;
  highScoreOverlayShown = true;
  const overlay = document.getElementById('highScoreOverlay');
  overlay.style.display = 'flex';
  if (isHighScore(score)) {
    showHighScoreEntry();
  } else {
    showHighScoreList();
  }
}

// Store items
const STORE_GUNS = [
  { id: 'machinegun', name: 'Machine Gun', price: 150, type: 'gun' },
  { id: 'spreadgun', name: 'Spread Gun', price: 300, type: 'gun' },
  { id: 'plasmagun', name: 'Plasma Gun', price: 500, type: 'gun' },
  { id: 'armor', name: 'Armor Suit', price: 250, type: 'armor' }
];

function collides(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

// Mouse aim: world position of mouse
let mouseWorldX = 0;
let mouseWorldY = 0;
function updateMouseAim(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = (e.clientX - rect.left) * scaleX;
  const canvasY = (e.clientY - rect.top) * scaleY;
  mouseWorldX = cameraX + canvasX;
  mouseWorldY = canvasY;
  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;
  player.aimAngle = Math.atan2(mouseWorldY - py, mouseWorldX - px);
  player.facing = Math.cos(player.aimAngle) >= 0 ? 1 : -1;
}
canvas.addEventListener('mousemove', updateMouseAim);
canvas.addEventListener('mouseenter', updateMouseAim);

function getDamageTaken() {
  return player.hasArmor ? Math.floor(DEFAULT_DAMAGE / 2) : DEFAULT_DAMAGE;
}

function loadLevel(levelNum) {
  currentLevel = levelNum;
  levelStartTime = Date.now();
  hp = MAX_HP;
  storeOpen = false;
  platforms.length = 0;
  enemies.length = 0;
  pickups.length = 0;
  bullets.length = 0;
  bossProjectiles.length = 0;
  deathEffects.length = 0;
  walkerSpawnTimer = 0;

  const groundY = 480;
  const playerGroundY = 432;

  // Ground
  platforms.push({ x: 0, y: groundY, width: WORLD_WIDTH, height: 60 });

  // Level-specific content
  if (levelNum === 1) {
    // Level 1 - Desert temple
    for (let i = 0; i < 25; i++) {
      const x = 400 + i * 150 + Math.random() * 80;
      const y = 380 + Math.sin(i * 0.5) * 60;
      platforms.push({ x, y, width: 80 + Math.random() * 40, height: 16 });
    }
    enemies.push(
      { x: 800, y: playerGroundY - 4, width: 44, height: 52, health: 20, maxHealth: 20, vx: -2.4, type: 'walker' },
      { x: 1600, y: playerGroundY - 4, width: 44, height: 52, health: 20, maxHealth: 20, vx: -2.4, type: 'walker' },
      { x: 2000, y: playerGroundY - 4, width: 44, height: 52, health: 20, maxHealth: 20, vx: -2.4, type: 'walker' },
      { x: 2800, y: playerGroundY - 4, width: 44, height: 52, health: 20, maxHealth: 20, vx: -2.4, type: 'walker' },
      { x: 3200, y: playerGroundY - 4, width: 44, height: 52, health: 20, maxHealth: 20, vx: -2.4, type: 'walker' },
      { x: BOSS_X, y: 380, width: 120, height: 100, health: 30, maxHealth: 30, type: 'boss', bossType: 1, vy: 0, shootCooldown: 0 }
    );
    platforms.forEach((p, i) => {
      if (i >= 3 && i % 4 === 0 && i < 20) {
        const projType = i % 2 === 0 ? 'knife' : 'axe';
        enemies.push({
          x: p.x + p.width / 2 - 20,
          y: p.y - 42,
          width: 40,
          height: 42,
          health: 2,
          vx: 0,
          type: 'thrower',
          platformY: p.y,
          shootCooldown: 60 + i * 15,
          projectileType: projType
        });
      }
    });
    platforms.slice(1).forEach((p, i) => {
      if (i % 2 === 0) {
        pickups.push({ x: p.x + p.width / 2 - 11, y: p.y - 50, width: 22, height: 22, type: 'gold', value: 5 });
      }
      if (i % 5 === 0 && i > 0) {
        pickups.push({ x: p.x + 15, y: p.y - 85, width: 22, height: 22, type: 'gold', value: 10 });
      }
      if (i % 6 === 3 && i > 2) {
        pickups.push({ x: p.x + p.width / 2 - 10, y: p.y - 70, width: 20, height: 20, type: 'star', value: 100 });
      }
    });
  } else if (levelNum === 2) {
    // Level 2 - Jungle (harder, gun pickup)
    for (let i = 0; i < 28; i++) {
      const x = 350 + i * 130 + Math.random() * 60;
      const y = 360 + Math.sin(i * 0.6) * 70;
      platforms.push({ x, y, width: 70 + Math.random() * 50, height: 14 });
    }
    enemies.push(
      { x: 800, y: playerGroundY - 4, width: 44, height: 52, health: 20, maxHealth: 20, vx: -2.6, type: 'walker' },
      { x: 1500, y: playerGroundY - 4, width: 44, height: 52, health: 20, maxHealth: 20, vx: -2.6, type: 'walker' },
      { x: 1800, y: playerGroundY - 4, width: 44, height: 52, health: 20, maxHealth: 20, vx: -2.6, type: 'walker' },
      { x: 2600, y: playerGroundY - 4, width: 44, height: 52, health: 20, maxHealth: 20, vx: -2.6, type: 'walker' },
      { x: 3000, y: playerGroundY - 4, width: 44, height: 52, health: 20, maxHealth: 20, vx: -2.6, type: 'walker' },
      { x: BOSS_X, y: 350, width: 100, height: 100, health: 50, maxHealth: 50, type: 'boss', bossType: 2, vy: 0, vx: 2, shootCooldown: 0 }
    );
    platforms.forEach((p, i) => {
      if (i >= 3 && i % 4 === 1 && i < 24) {
        const projType = i % 2 === 0 ? 'knife' : 'axe';
        enemies.push({
          x: p.x + p.width / 2 - 20,
          y: p.y - 42,
          width: 40,
          height: 42,
          health: 2,
          vx: 0,
          type: 'thrower',
          platformY: p.y,
          shootCooldown: 55 + i * 12,
          projectileType: projType
        });
      }
    });
    platforms.slice(1).forEach((p, i) => {
      if (i % 2 === 1) pickups.push({ x: p.x + p.width / 2 - 11, y: p.y - 55, width: 22, height: 22, type: 'gold', value: 8 });
      if (i % 4 === 0 && i > 2) pickups.push({ x: p.x + 20, y: p.y - 95, width: 22, height: 22, type: 'gold', value: 15 });
      if (i % 5 === 2 && i > 3) pickups.push({ x: p.x + 10, y: p.y - 75, width: 20, height: 20, type: 'star', value: 150 });
    });
  } else if (levelNum === 3) {
    // Level 3 - Cave (spread gun for multi-part boss)
    for (let i = 0; i < 32; i++) {
      const x = 300 + i * 120 + Math.random() * 50;
      const y = 340 + Math.sin(i * 0.7) * 80;
      platforms.push({ x, y, width: 65 + Math.random() * 55, height: 14 });
    }
    enemies.push(
      { x: 700, y: playerGroundY - 4, width: 44, height: 52, health: 30, maxHealth: 30, vx: -2.8, type: 'walker' },
      { x: 1300, y: playerGroundY - 4, width: 44, height: 52, health: 30, maxHealth: 30, vx: -2.8, type: 'walker' },
      { x: 1650, y: playerGroundY - 4, width: 44, height: 52, health: 30, maxHealth: 30, vx: -2.8, type: 'walker' },
      { x: 2350, y: playerGroundY - 4, width: 44, height: 52, health: 30, maxHealth: 30, vx: -2.8, type: 'walker' },
      { x: 2700, y: playerGroundY - 4, width: 44, height: 52, health: 30, maxHealth: 30, vx: -2.8, type: 'walker' },
      { x: 3400, y: playerGroundY - 4, width: 44, height: 52, health: 30, maxHealth: 30, vx: -2.8, type: 'walker' },
      { x: BOSS_X, y: 360, width: 140, height: 120, health: 80, maxHealth: 80, type: 'boss', bossType: 3, vy: 0, shootCooldown: 0 }
    );
    platforms.forEach((p, i) => {
      if (i >= 2 && i % 4 === 2 && i < 28) {
        const projType = i % 2 === 0 ? 'knife' : 'axe';
        enemies.push({
          x: p.x + p.width / 2 - 20,
          y: p.y - 42,
          width: 40,
          height: 42,
          health: 2,
          vx: 0,
          type: 'thrower',
          platformY: p.y,
          shootCooldown: 50 + i * 10,
          projectileType: projType
        });
      }
    });
    platforms.slice(1).forEach((p, i) => {
      if (i % 2 === 0) pickups.push({ x: p.x + p.width / 2 - 11, y: p.y - 60, width: 22, height: 22, type: 'gold', value: 10 });
      if (i % 4 === 2 && i > 2) pickups.push({ x: p.x + 10, y: p.y - 105, width: 22, height: 22, type: 'gold', value: 20 });
      if (i % 5 === 1 && i > 4) pickups.push({ x: p.x + 15, y: p.y - 80, width: 20, height: 20, type: 'star', value: 200 });
    });
  } else if (levelNum === 4) {
    // Level 4 - Volcano (rocket launcher for high-HP boss)
    for (let i = 0; i < 35; i++) {
      const x = 250 + i * 110 + Math.random() * 45;
      const y = 320 + Math.sin(i * 0.8) * 90;
      platforms.push({ x, y, width: 60 + Math.random() * 60, height: 14 });
    }
    enemies.push(
      { x: 650, y: playerGroundY - 4, width: 44, height: 52, health: 30, maxHealth: 30, vx: -3, type: 'walker' },
      { x: 1250, y: playerGroundY - 4, width: 44, height: 52, health: 30, maxHealth: 30, vx: -3, type: 'walker' },
      { x: 1550, y: playerGroundY - 4, width: 44, height: 52, health: 30, maxHealth: 30, vx: -3, type: 'walker' },
      { x: 2150, y: playerGroundY - 4, width: 44, height: 52, health: 30, maxHealth: 30, vx: -3, type: 'walker' },
      { x: 2450, y: playerGroundY - 4, width: 44, height: 52, health: 30, maxHealth: 30, vx: -3, type: 'walker' },
      { x: 3050, y: playerGroundY - 4, width: 44, height: 52, health: 30, maxHealth: 30, vx: -3, type: 'walker' },
      { x: 3350, y: playerGroundY - 4, width: 44, height: 52, health: 30, maxHealth: 30, vx: -3, type: 'walker' },
      { x: BOSS_X, y: 320, width: 100, height: 90, health: 100, maxHealth: 100, type: 'boss', bossType: 4, vy: 0, shootCooldown: 0 }
    );
    platforms.forEach((p, i) => {
      if (i >= 2 && i % 4 === 3 && i < 30) {
        const projType = i % 2 === 0 ? 'knife' : 'axe';
        enemies.push({
          x: p.x + p.width / 2 - 20,
          y: p.y - 42,
          width: 40,
          height: 42,
          health: 2,
          vx: 0,
          type: 'thrower',
          platformY: p.y,
          shootCooldown: 45 + i * 8,
          projectileType: projType
        });
      }
    });
    platforms.slice(1).forEach((p, i) => {
      if (i % 2 === 1) pickups.push({ x: p.x + p.width / 2 - 11, y: p.y - 65, width: 22, height: 22, type: 'gold', value: 12 });
      if (i % 4 === 1 && i > 3) pickups.push({ x: p.x + 25, y: p.y - 110, width: 22, height: 22, type: 'gold', value: 25 });
      if (i % 4 === 3 && i > 5) pickups.push({ x: p.x + 18, y: p.y - 85, width: 20, height: 20, type: 'star', value: 250 });
    });
  }

  player.x = 100;
  player.y = playerGroundY;
  player.vx = 0;
  player.vy = 0;
  cameraX = 0;
}

function updatePlayer() {
  if (player.invincible > 0) player.invincible--;

  player.crouching = player.grounded && (keys['s'] || keys['S'] || keys['ArrowDown']);
  if (player.crouching) {
    player.vx = 0;
  } else   if (keys['ArrowLeft'] || keys['a']) {
    player.vx = -MOVE_SPEED;
  } else if (keys['ArrowRight'] || keys['d']) {
    player.vx = MOVE_SPEED;
  } else {
    player.vx = 0;
  }
  // facing is set from mouse aim (updateMouseAim)

  player.x += player.vx;

  // Shoot (direction from mouse aim)
  const gun = WEAPONS[player.gun];
  if (player.shootCooldown > 0) player.shootCooldown--;
  if ((keys['z'] || keys[' '] || keys['space'] || keys['mouse0']) && player.shootCooldown <= 0) {
    const tipDist = 24;
    const baseX = player.x + player.width / 2 + Math.cos(player.aimAngle) * tipDist;
    const baseY = player.y + player.height / 2 + Math.sin(player.aimAngle) * tipDist;

    if (gun.spread) {
      for (let i = 0; i < gun.spread; i++) {
        const angle = player.aimAngle + (i - (gun.spread - 1) / 2) * 0.25;
        bullets.push({
          x: baseX,
          y: baseY,
          vx: gun.speed * Math.cos(angle),
          vy: gun.speed * Math.sin(angle),
          width: gun.bulletWidth,
          height: gun.bulletHeight,
          damage: gun.damage,
          gunType: player.gun
        });
      }
    } else {
      bullets.push({
        x: baseX,
        y: baseY,
        vx: gun.speed * Math.cos(player.aimAngle),
        vy: gun.speed * Math.sin(player.aimAngle),
        width: gun.bulletWidth,
        height: gun.bulletHeight,
        damage: gun.damage,
        gunType: player.gun
      });
    }
    player.shootCooldown = gun.cooldown;
  }

  // Gravity & jump
  player.vy += GRAVITY;
  if ((keys['ArrowUp'] || keys['w']) && player.grounded) {
    player.vy = JUMP_FORCE;
    player.grounded = false;
  }
  player.y += player.vy;

  // Platform collision
  player.grounded = false;
  for (const p of platforms) {
    if (player.x + player.width <= p.x || player.x >= p.x + p.width) continue;
    if (player.vy >= 0 && player.y + player.height <= p.y + 20 && player.y + player.height + player.vy >= p.y) {
      player.y = p.y - player.height;
      player.vy = 0;
      player.grounded = true;
      break;
    }
  }

  player.x = Math.max(0, Math.min(WORLD_WIDTH - player.width, player.x));
  if (player.y > WORLD_HEIGHT) {
    player.y = 432;
    player.vy = 0;
    if (player.invincible <= 0) {
      hp -= getDamageTaken();
      player.invincible = 120;
    }
  }
}

function addDeathEffect(x, y, isBoss = false) {
  const particleCount = isBoss ? 28 : 16;
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
    const speed = 1.5 + Math.random() * 5;
    particles.push({
      x: 0, y: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 1,
      size: 6 + Math.random() * 10,
      hue: isBoss ? 25 : 0
    });
  }
  deathEffects.push({ x, y, particles, timer: 50 });
}

function updateDeathEffects() {
  deathEffects = deathEffects.filter(ef => {
    ef.timer--;
    for (const p of ef.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= 0.025;
    }
    return ef.timer > 0;
  });
}

function drawDeathEffects() {
  for (const ef of deathEffects) {
    const screenX = ef.x - cameraX;
    if (screenX < -80 || screenX > canvas.width + 80) continue;
    const age = 50 - ef.timer;
    if (age < 3) {
      ctx.globalAlpha = 1 - age / 3;
      ctx.fillStyle = 'rgba(80, 70, 60, 0.9)';
      ctx.beginPath();
      ctx.arc(screenX, ef.y, 8 + age * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const p of ef.particles) {
      if (p.life <= 0) continue;
      const sx = screenX + p.x;
      const sy = ef.y + p.y;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = `rgba(35, 30, 28, ${0.85})`;
      ctx.beginPath();
      ctx.arc(sx, sy, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(55, 48, 42, ${0.5})`;
      ctx.beginPath();
      ctx.arc(sx, sy, p.size * 0.5 * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function updateBullets() {
  bullets = bullets.filter(b => {
    b.x += b.vx;
    b.y += b.vy;
    if (b.x < cameraX - 50 || b.x > cameraX + canvas.width + 50) return false;
    for (const e of enemies) {
      if (e.health > 0 && collides(b, e)) {
        e.health -= b.damage || 1;
        score += e.type === 'boss' ? 500 : 100;
        if (e.health <= 0) {
          addDeathEffect(e.x + e.width / 2, e.y + e.height / 2, e.type === 'boss');
        }
        return false;
      }
    }
    return true;
  });
}

function updatePickups() {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    if (collides(player, p)) {
      if (p.type === 'gold') {
        player.gold += p.value || 5;
        score += p.value || 5;
      } else if (p.type === 'star') {
        score += p.value || 100;
      }
      pickups.splice(i, 1);
    }
  }
}

function updateEnemies() {
  const t = Date.now() * 0.001;
  const playerGroundY = 432;

  walkerSpawnTimer++;
  if (walkerSpawnTimer >= WALKER_SPAWN_INTERVAL && !storeOpen) {
    walkerSpawnTimer = 0;
    const inBossArea = player.x > BOSS_X - 350;
    let spawnX, vx;
    if (inBossArea) {
      spawnX = Math.max(cameraX - 120, 20);
      vx = 2.4 + (currentLevel - 1) * 0.4;
    } else {
      spawnX = Math.min(cameraX + canvas.width + 180, WORLD_WIDTH - 50);
      vx = -(2.4 + (currentLevel - 1) * 0.4);
    }
    const walkerHealth = currentLevel <= 2 ? 20 : 30;
    enemies.push({
      x: spawnX,
      y: playerGroundY - 4,
      width: 44,
      height: 52,
      health: walkerHealth,
      maxHealth: walkerHealth,
      vx,
      type: 'walker'
    });
  }

  enemies = enemies.filter(e => e.health > 0 || e.type === 'boss');
  for (const e of enemies) {
    if (e.type === 'walker') {
      e.x += e.vx;
      const onPlatform = platforms.some(p =>
        e.y + e.height >= p.y - 4 && e.y + e.height <= p.y + 12 &&
        e.x + e.width > p.x && e.x < p.x + p.width
      );
      if (!onPlatform) e.vx *= -1;
      e.x = Math.max(0, Math.min(WORLD_WIDTH - e.width, e.x));
      if (e.x <= 0 && e.vx < 0) e.vx = -e.vx;
      if (e.x >= WORLD_WIDTH - e.width && e.vx > 0) e.vx = -e.vx;
    } else if (e.type === 'thrower') {
      e.shootCooldown = (e.shootCooldown || 0) - 1;
      if (e.shootCooldown <= 0 && player.x > e.x - 350 && player.x < e.x + 400) {
        const ex = e.x + e.width / 2;
        const ey = e.y + e.height / 2 - 8;
        const dx = player.x + player.width / 2 - ex;
        const dy = (player.y + player.height / 2) - ey;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 7;
        bossProjectiles.push({
          x: ex - 6, y: ey - 6,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          width: 12, height: 12,
          projectileType: e.projectileType || 'knife'
        });
        e.shootCooldown = 90 + Math.floor(Math.random() * 40);
      }
    } else if (e.type === 'boss') {
      // Boss-specific AI and movement
      if (e.bossType === 1) {
        e.vy = Math.sin(t * 2) * 2;
        e.y += e.vy;
        e.y = Math.max(360, Math.min(420, e.y));
        if (e.x > player.x + 200) e.x -= 1.5;
      } else if (e.bossType === 2) {
        e.x += e.vx;
        if (e.x <= BOSS_X - 80 || e.x >= BOSS_X + 60) e.vx *= -1;
        e.vy = Math.sin(t * 3) * 2.5;
        e.y += e.vy;
        e.y = Math.max(320, Math.min(400, e.y));
      } else if (e.bossType === 3) {
        e.vy = Math.sin(t * 1.5) * 3;
        e.y += e.vy;
        e.y = Math.max(340, Math.min(420, e.y));
      } else if (e.bossType === 4) {
        e.vy = Math.sin(t * 1.2) * 2;
        e.y += e.vy;
        e.y = Math.max(320, Math.min(390, e.y));
      }
      // Boss shooting
      e.shootCooldown = (e.shootCooldown || 0) - 1;
      if (e.shootCooldown <= 0 && player.x > e.x - 400) {
        const cx = e.x + e.width / 2;
        const cy = e.y + e.height / 2;
        const dx = player.x + player.width / 2 - cx;
        const dy = player.y + player.height / 2 - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = e.bossType === 1 ? 6 : e.bossType === 2 ? 8 : e.bossType === 3 ? 7 : 9;
        bossProjectiles.push({
          x: cx - 7, y: cy - 7,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          width: 14, height: 14
        });
        e.shootCooldown = e.bossType === 1 ? 90 : e.bossType === 2 ? 60 : e.bossType === 3 ? 70 : 50;
      }
    }
  }
}

function updateCamera() {
  const targetX = player.x - canvas.width / 2 + player.width / 2;
  cameraX += (targetX - cameraX) * CAMERA_SMOOTH;
  cameraX = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, cameraX));
}

function checkEnemyCollision() {
  if (player.invincible > 0) return;
  for (const e of enemies) {
    if (e.health > 0 && collides(player, e)) {
      hp -= getDamageTaken();
      player.invincible = 120;
      player.vx = -player.facing * 8;
      player.vy = -6;
      break;
    }
  }
  if (hp <= 0) gameRunning = false;
}

function updateBossProjectiles() {
  bossProjectiles = bossProjectiles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < cameraX - 50 || p.x > cameraX + canvas.width + 50) return false;
    if (collides(p, player)) {
      if (player.invincible <= 0) {
        hp -= getDamageTaken();
        player.invincible = 120;
        player.vx = -player.facing * 8;
        player.vy = -6;
        if (hp <= 0) gameRunning = false;
      }
      return false;
    }
    return true;
  });
}

function checkLevelComplete() {
  const boss = enemies.find(e => e.type === 'boss');
  const bossDead = !boss || boss.health <= 0;
  if (bossDead && !storeOpen) {
    const levelTimeSec = (Date.now() - levelStartTime) / 1000;
    const timeBonus = Math.max(0, Math.floor(2500 - levelTimeSec * 25));
    score += timeBonus;
    storeOpen = true;
    openStore();
  }
}

function drawBackground() {
  const theme = LEVEL_THEMES[currentLevel] || LEVEL_THEMES[1];

  // Procedural backgrounds for all levels
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  theme.skyGrad.forEach((c, i) => skyGrad.addColorStop(i / (theme.skyGrad.length - 1), c));
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width + 200, canvas.height);

  const t = Date.now() * 0.001;

  // Sun / Moon / Glow
  if (currentLevel === 1) {
    const sunX = canvas.width * 0.8;
    const sunY = 100;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 150);
    sunGlow.addColorStop(0, 'rgba(255, 220, 120, 0.8)');
    sunGlow.addColorStop(0.25, 'rgba(255, 180, 60, 0.5)');
    sunGlow.addColorStop(0.5, 'rgba(255, 140, 30, 0.2)');
    sunGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffe4a0';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 200, 80, 0.9)';
    ctx.lineWidth = 4;
    ctx.stroke();
  } else if (currentLevel === 2) {
    const sunX = canvas.width * 0.75;
    const sunY = 120;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 120);
    sunGlow.addColorStop(0, 'rgba(255, 240, 180, 0.9)');
    sunGlow.addColorStop(0.3, 'rgba(255, 200, 80, 0.4)');
    sunGlow.addColorStop(0.6, 'rgba(255, 150, 50, 0.15)');
    sunGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff8dc';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 220, 120, 0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();
  } else if (currentLevel === 3) {
    const moonX = canvas.width * 0.2;
    const moonY = 80;
    ctx.fillStyle = 'rgba(200, 210, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(moonX + 60, moonY + 40, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c8d4e8';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 28, 0, Math.PI * 2);
    ctx.fill();
  } else if (currentLevel === 4) {
    const lavaGlow = ctx.createRadialGradient(canvas.width / 2, canvas.height + 80, 0, canvas.width / 2, canvas.height, 400);
    lavaGlow.addColorStop(0, 'rgba(255, 80, 30, 0.35)');
    lavaGlow.addColorStop(0.5, 'rgba(255, 40, 10, 0.15)');
    lavaGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = lavaGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Clouds
  if (currentLevel === 2) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    for (let i = 0; i < 5; i++) {
      const px = (i * 380 - cameraX * 0.03) % (canvas.width + 200) - 50;
      const py = 60 + (i % 3) * 45;
      ctx.beginPath();
      ctx.ellipse(px, py, 50 + i * 8, 22, 0, 0, Math.PI * 2);
      ctx.ellipse(px + 40, py + 10, 35, 18, 0, 0, Math.PI * 2);
      ctx.ellipse(px + 75, py - 5, 45, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const depths = [0.05, 0.12, 0.2];
  for (let layer = 0; layer < 3; layer++) {
    ctx.fillStyle = layer === 0 ? theme.farHills : layer === 1 ? theme.midHills : theme.nearHills;
    ctx.globalAlpha = 0.5 + layer * 0.2;
    for (let i = 0; i < 10; i++) {
      const px = (i * 380 - cameraX * depths[layer]) % (canvas.width + 550) - 180;
      const h = 70 + layer * 45 + (i % 4) * 35;
      ctx.beginPath();
      ctx.moveTo(px, canvas.height);
      ctx.quadraticCurveTo(px + 50, canvas.height - h * 0.6, px + 60, canvas.height - h);
      ctx.quadraticCurveTo(px + 70, canvas.height - h * 0.5, px + 120, canvas.height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (theme.decor === 'pyramid') {
    ctx.fillStyle = 'rgba(139, 105, 20, 0.25)';
    for (let i = 0; i < 5; i++) {
      const px = (i * 900 - cameraX * 0.08) % (canvas.width + 600) - 200;
      ctx.beginPath();
      ctx.moveTo(px, canvas.height);
      ctx.lineTo(px + 80, canvas.height - 120);
      ctx.lineTo(px + 160, canvas.height);
      ctx.closePath();
      ctx.fill();
    }
  } else if (theme.decor === 'vines') {
    ctx.strokeStyle = 'rgba(45, 90, 55, 0.5)';
    ctx.lineWidth = 5;
    for (let i = 0; i < 18; i++) {
      const px = (i * 280 - cameraX * 0.12) % (canvas.width + 450) - 80;
      ctx.beginPath();
      ctx.moveTo(px, canvas.height);
      ctx.bezierCurveTo(px + 35, 380, px + 70, 320, px + 90, 260);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(80, 140, 60, 0.4)';
    for (let i = 0; i < 25; i++) {
      const px = (i * 180 - cameraX * 0.15 + Math.sin(t + i) * 30) % (canvas.width + 200) - 30;
      const py = (i * 73) % canvas.height;
      ctx.beginPath();
      ctx.ellipse(px, py, 12, 8, (i % 3) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (theme.decor === 'stalactite') {
    ctx.fillStyle = 'rgba(60, 60, 100, 0.6)';
    for (let i = 0; i < 25; i++) {
      const px = (i * 175 - cameraX * 0.18) % (canvas.width + 350) - 60;
      const len = 50 + (i % 5) * 22;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px + 18, len);
      ctx.lineTo(px + 36, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(100, 120, 255, 0.5)';
    for (let i = 0; i < 40; i++) {
      const px = (i * 95 - cameraX * 0.08) % (canvas.width + 150);
      const py = 80 + (i * 31) % (canvas.height - 100);
      ctx.globalAlpha = 0.4 + Math.sin(t * 3 + i) * 0.3;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (theme.decor === 'ember') {
    for (let i = 0; i < 50; i++) {
      const px = (i * 120 - cameraX * 0.25) % (canvas.width + 250) - 40;
      const py = (i * 37 + t * 20) % (canvas.height + 50);
      ctx.globalAlpha = 0.2 + Math.sin(i * 0.7 + t * 2) * 0.25;
      ctx.fillStyle = i % 3 === 0 ? '#ff6622' : i % 3 === 1 ? '#ffaa44' : theme.accent;
      ctx.beginPath();
      ctx.arc(px, py, 2 + (i % 2) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Near hills - rolling terrain
  ctx.fillStyle = theme.nearHills;
  ctx.globalAlpha = 0.8;
  for (let i = 0; i < 14; i++) {
    const depth = [0.25, 0.38, 0.52][i % 3];
    const px = (i * 350 - cameraX * depth) % (canvas.width + 500) - 120;
    ctx.beginPath();
    ctx.ellipse(px + 280, 510 + (i % 2) * 40, 380, 110, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Fog/mist layer (all levels)
  const fogColors = {
    1: ['rgba(120, 90, 40, 0.1)', 'rgba(80, 60, 25, 0.2)'],
    2: ['rgba(100, 120, 80, 0.12)', 'rgba(60, 90, 50, 0.2)'],
    3: ['rgba(80, 80, 120, 0.15)', 'rgba(50, 50, 90, 0.25)']
  };
  if (currentLevel <= 3) {
    const c = fogColors[currentLevel] || fogColors[2];
    const fogGrad = ctx.createLinearGradient(0, canvas.height - 150, 0, canvas.height);
    fogGrad.addColorStop(0, 'transparent');
    fogGrad.addColorStop(0.5, c[0]);
    fogGrad.addColorStop(1, c[1]);
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Film grain
  ctx.fillStyle = 'rgba(0,0,0,0.015)';
  for (let i = 0; i < 150; i++) {
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
  }
}

function drawPlatforms() {
  const theme = LEVEL_THEMES[currentLevel] || LEVEL_THEMES[1];
  const t = Date.now() * 0.002;
  platforms.forEach((p, idx) => {
    const screenX = p.x - cameraX;
    if (screenX + p.width < 0 || screenX > canvas.width) return;

    const isFloating = idx > 0;
    if (isFloating) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(screenX + 4, p.y + 6, p.width, p.height);
      ctx.shadowColor = theme.accent;
      ctx.shadowBlur = 12 + Math.sin(t + p.x * 0.01) * 4;
      ctx.fillStyle = theme.platformFill;
      ctx.fillRect(screenX, p.y, p.width, p.height);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = theme.platformFill;
      ctx.fillRect(screenX, p.y, p.width, p.height);
    }

    // Level-specific platform patterns
    if (theme.platformPattern === 'brick') {
      ctx.strokeStyle = theme.platformStroke;
      ctx.lineWidth = 1;
      for (let bx = 0; bx < p.width; bx += 24) {
        for (let by = 0; by < p.height; by += 10) {
          ctx.strokeRect(screenX + bx + 2, p.y + by + 2, 20, 6);
        }
      }
      if (isFloating) {
        ctx.fillStyle = `rgba(212, 168, 75, ${0.15 + Math.sin(t + p.x * 0.02) * 0.08})`;
        ctx.fillRect(screenX + 2, p.y + 2, p.width - 4, p.height - 4);
      }
    } else if (theme.platformPattern === 'moss') {
      ctx.fillStyle = theme.platformInner;
      for (let i = 0; i < 8; i++) {
        const ox = (i * 17 + p.x) % 40;
        ctx.beginPath();
        ctx.arc(screenX + ox, p.y + 6, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = theme.platformStroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, p.y, p.width, p.height);
    } else if (theme.platformPattern === 'crystal') {
      ctx.fillStyle = theme.platformInner;
      ctx.globalAlpha = 0.8;
      for (let i = 0; i < 5; i++) {
        const cx = screenX + 8 + i * (p.width / 5);
        ctx.beginPath();
        ctx.moveTo(cx, p.y + p.height);
        ctx.lineTo(cx - 4, p.y + 4);
        ctx.lineTo(cx + 4, p.y + 4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX, p.y, p.width, p.height);
    } else if (theme.platformPattern === 'lava') {
      ctx.fillStyle = theme.platformInner;
      ctx.fillRect(screenX + 2, p.y + 2, p.width - 4, p.height - 4);
      ctx.fillStyle = theme.accent;
      ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.005) * 0.2;
      ctx.fillRect(screenX + 4, p.y + 4, p.width - 8, p.height - 8);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = theme.platformStroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, p.y, p.width, p.height);
    } else {
      ctx.strokeStyle = theme.platformStroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, p.y, p.width, p.height);
      ctx.fillStyle = theme.platformInner;
      ctx.fillRect(screenX + 4, p.y + 4, p.width - 8, p.height - 8);
    }
    if (isFloating && theme.accent) {
      ctx.strokeStyle = theme.accent;
      ctx.globalAlpha = 0.4 + Math.sin(t + p.x * 0.015) * 0.2;
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, p.y, p.width, p.height);
      ctx.globalAlpha = 1;
    }
  });
}

function drawPickups() {
  const pulse = Math.sin(Date.now() * 0.006) * 0.1 + 1;
  for (const p of pickups) {
    const x = p.x - cameraX;
    if (x + p.width < 0 || x > canvas.width) continue;

    if (p.type === 'gold') {
      const cx = x + p.width / 2;
      const cy = p.y + p.height / 2;
      const r = (p.width / 2) * pulse;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffec8b';
      ctx.beginPath();
      ctx.arc(cx - 2, cy - 2, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'star') {
      const cx = x + p.width / 2;
      const cy = p.y + p.height / 2;
      const r = (p.width / 2) * pulse;
      ctx.fillStyle = '#fff8dc';
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPlayer() {
  const x = player.x - cameraX;
  const y = player.y;
  if (x + player.width < 0 || x > canvas.width) return;

  ctx.save();
  if (player.facing < 0) {
    ctx.translate(x + player.width, y);
    ctx.scale(-1, 1);
    ctx.translate(-x - player.width, -y);
  }

  const cx = x + player.width / 2;
  const flash = player.invincible > 0 && Math.floor(player.invincible / 4) % 2 === 0;
  ctx.strokeStyle = '#1a0a0a';
  ctx.lineWidth = 3;

  if (player.crouching) {
    // Crouched pose: legs bent, torso compact, fedora low
    ctx.fillStyle = flash ? '#fff' : '#8b6914';
    ctx.beginPath();
    ctx.moveTo(cx - 16, y + player.height - 4);
    ctx.quadraticCurveTo(cx - 14, y + 38, cx - 8, y + 32);
    ctx.lineTo(cx + 8, y + 32);
    ctx.quadraticCurveTo(cx + 14, y + 38, cx + 16, y + player.height - 4);
    ctx.lineTo(cx + 12, y + player.height + 4);
    ctx.lineTo(cx - 12, y + player.height + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = flash ? '#fff' : '#e8c478';
    ctx.beginPath();
    ctx.ellipse(cx, y + 28, 10, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = flash ? '#fff' : '#2a1810';
    ctx.beginPath();
    ctx.ellipse(cx, y + 12, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = flash ? '#fff' : '#3d2817';
    ctx.beginPath();
    ctx.ellipse(cx, y + 16, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = flash ? '#fff' : '#f5d9a0';
    ctx.beginPath();
    ctx.ellipse(cx, y + 18, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1a0a0a';
    ctx.beginPath();
    ctx.arc(cx - 4, y + 17, 2, 0, Math.PI * 2);
    ctx.arc(cx + 4, y + 17, 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Standing pose
    ctx.fillStyle = flash ? '#fff' : '#8b6914';
    ctx.beginPath();
    ctx.moveTo(cx - 18, y + player.height - 4);
    ctx.quadraticCurveTo(cx - 16, y + 32, cx - 12, y + 22);
    ctx.lineTo(cx + 12, y + 22);
    ctx.quadraticCurveTo(cx + 16, y + 32, cx + 18, y + player.height - 4);
    ctx.lineTo(cx + 14, y + player.height + 8);
    ctx.lineTo(cx - 14, y + player.height + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = flash ? '#fff' : '#e8c478';
    ctx.beginPath();
    ctx.ellipse(cx, y + player.height / 2 + 4, 10, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = flash ? '#fff' : '#2a1810';
    ctx.beginPath();
    ctx.ellipse(cx, y + 6, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = flash ? '#fff' : '#3d2817';
    ctx.beginPath();
    ctx.ellipse(cx, y + 10, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a0a0a';
    ctx.stroke();

    ctx.fillStyle = flash ? '#fff' : '#f5d9a0';
    ctx.beginPath();
    ctx.arc(cx, y + 20, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1a0a0a';
    ctx.beginPath();
    ctx.arc(cx - 5, y + 18, 2.5, 0, Math.PI * 2);
    ctx.arc(cx + 5, y + 18, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const gunY = player.crouching ? y + 26 : y + player.height / 2;
  const gunAngle = player.facing > 0 ? player.aimAngle : Math.PI - player.aimAngle;
  ctx.translate(cx, gunY);
  ctx.rotate(gunAngle);
  const gx = 8;
  const gy = 0;
  if (player.gun === 'machinegun') {
    ctx.fillStyle = flash ? '#fff' : '#3a3a3a';
    ctx.fillRect(gx, gy - 3, 35, 6);
    ctx.fillRect(gx - 2, gy - 2, 40, 4);
    ctx.fillStyle = flash ? '#fff' : '#2a2a2a';
    ctx.fillRect(gx + 4, gy + 2, 12, 8);
    ctx.strokeStyle = '#1a0a0a';
    ctx.lineWidth = 1;
    ctx.strokeRect(gx, gy - 3, 35, 6);
    ctx.strokeRect(gx + 4, gy + 2, 12, 8);
  } else if (player.gun === 'spreadgun') {
    ctx.fillStyle = flash ? '#fff' : '#4a4a6a';
    ctx.fillRect(gx, gy - 4, 28, 8);
    ctx.fillStyle = flash ? '#fff' : '#6a8aff';
    ctx.fillRect(gx + 20, gy - 3, 12, 6);
    ctx.strokeStyle = '#1a0a0a';
    ctx.lineWidth = 1;
    ctx.strokeRect(gx, gy - 4, 40, 8);
  } else if (player.gun === 'plasmagun') {
    ctx.fillStyle = flash ? '#fff' : '#6a4a8a';
    ctx.fillRect(gx, gy - 4, 32, 8);
    ctx.fillStyle = flash ? '#fff' : '#8a6aff';
    ctx.fillRect(gx + 27, gy - 3, 10, 6);
    ctx.strokeStyle = '#1a0a0a';
    ctx.lineWidth = 1;
    ctx.strokeRect(gx, gy - 4, 45, 8);
  } else {
    ctx.strokeStyle = '#1a0a0a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + 22, gy - 4);
    ctx.stroke();
  }
  ctx.rotate(-gunAngle);
  ctx.translate(-cx, -gunY);

  ctx.restore();
}

function drawBullets() {
  for (const b of bullets) {
    const x = b.x - cameraX;
    if (x < -30 || x > canvas.width + 30) continue;
    if (b.gunType === 'machinegun') {
      ctx.fillStyle = '#aaa';
      ctx.strokeStyle = '#555';
    } else if (b.gunType === 'spreadgun') {
      ctx.fillStyle = '#6a8aff';
      ctx.strokeStyle = '#4a5aaa';
    } else if (b.gunType === 'plasmagun') {
      ctx.fillStyle = '#aa66ff';
      ctx.strokeStyle = '#6a3a9a';
    } else {
      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = '#8b6914';
    }
    ctx.lineWidth = 1;
    ctx.fillRect(x, b.y, b.width, b.height);
    ctx.strokeRect(x, b.y, b.width, b.height);
  }
}

function drawBoss(boss) {
  const x = boss.x - cameraX;
  const bx = boss.x;
  const by = boss.y;
  if (x + boss.width < -50 || x > canvas.width + 50) return;

  const theme = LEVEL_THEMES[currentLevel] || LEVEL_THEMES[1];
  const maxHp = boss.maxHealth || boss.health;

  // HP bar
  const barW = 140;
  const barX = x + boss.width / 2 - barW / 2;
  const barY = boss.y - 28;
  ctx.fillStyle = '#333';
  ctx.fillRect(barX - 2, barY - 2, barW + 4, 14);
  ctx.fillStyle = '#822';
  ctx.fillRect(barX, barY, barW, 10);
  ctx.fillStyle = '#2a2';
  ctx.fillRect(barX, barY, barW * (boss.health / maxHp), 10);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, 10);

  // Boss 1: Dinosaur (T-Rex style)
  if (boss.bossType === 1) {
    ctx.fillStyle = '#5a7a4a';
    ctx.strokeStyle = '#3a5a2a';
    ctx.lineWidth = 2;
    // Body
    ctx.beginPath();
    ctx.ellipse(x + 70, by + 70, 45, 35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Legs
    ctx.fillRect(x + 40, by + 85, 18, 25);
    ctx.fillRect(x + 85, by + 85, 18, 25);
    ctx.strokeRect(x + 40, by + 85, 18, 25);
    ctx.strokeRect(x + 85, by + 85, 18, 25);
    // Long neck
    ctx.beginPath();
    ctx.moveTo(x + 85, by + 45);
    ctx.quadraticCurveTo(x + 115, by - 10, x + 105, by + 25);
    ctx.lineTo(x + 95, by + 50);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Head with jaw
    ctx.fillStyle = '#6a8a5a';
    ctx.beginPath();
    ctx.arc(x + 100, by + 20, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4a6a3a';
    ctx.beginPath();
    ctx.moveTo(x + 115, by + 25);
    ctx.lineTo(x + 135, by + 35);
    ctx.lineTo(x + 118, by + 32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Eye
    ctx.fillStyle = '#1a0a0a';
    ctx.beginPath();
    ctx.arc(x + 95, by + 15, 5, 0, Math.PI * 2);
    ctx.fill();
    // Tail
    ctx.fillStyle = '#5a7a4a';
    ctx.beginPath();
    ctx.moveTo(x + 25, by + 60);
    ctx.quadraticCurveTo(x - 20, by + 40, x + 15, by + 75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Boss 2: Zombie Giant
  else if (boss.bossType === 2) {
    ctx.fillStyle = '#3d5a4a';
    ctx.strokeStyle = '#2a3d35';
    ctx.lineWidth = 2;
    // Torso (decaying)
    ctx.fillRect(x + 25, by + 35, 55, 55);
    ctx.strokeRect(x + 25, by + 35, 55, 55);
    ctx.fillStyle = '#2a3d2a';
    ctx.fillRect(x + 30, by + 45, 15, 15);
    ctx.fillRect(x + 60, by + 50, 12, 12);
    ctx.fillStyle = '#4a6a5a';
    ctx.beginPath();
    ctx.arc(x + 52, by + 25, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a0a0a';
    ctx.beginPath();
    ctx.arc(x + 47, by + 22, 4, 0, Math.PI * 2);
    ctx.arc(x + 57, by + 22, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(x + 45, by + 28, 14, 4);
    ctx.fillStyle = '#2a1810';
    ctx.fillRect(x + 15, by + 50, 15, 40);
    ctx.fillRect(x + 75, by + 50, 15, 40);
    ctx.strokeRect(x + 15, by + 50, 15, 40);
    ctx.strokeRect(x + 75, by + 50, 15, 40);
  }
  // Boss 3: Octopus
  else if (boss.bossType === 3) {
    ctx.fillStyle = '#4a3a6a';
    ctx.strokeStyle = theme.accent;
    const t = Date.now() * 0.002;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + t * 0.3;
      const tx = x + 70 + Math.cos(angle) * 50;
      const ty = by + 80 + Math.sin(angle) * 35;
      ctx.beginPath();
      ctx.moveTo(x + 70, by + 70);
      ctx.quadraticCurveTo(x + 70 + Math.cos(angle) * 30, by + 75, tx, ty);
      ctx.lineWidth = 10;
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    ctx.fillStyle = '#5a4a7a';
    ctx.beginPath();
    ctx.arc(x + 70, by + 65, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a0a0a';
    ctx.beginPath();
    ctx.arc(x + 58, by + 58, 10, 0, Math.PI * 2);
    ctx.arc(x + 82, by + 58, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + 60, by + 56, 3, 0, Math.PI * 2);
    ctx.arc(x + 84, by + 56, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Boss 4: Donald Trump (cartoon caricature)
  else if (boss.bossType === 4) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#8b6914';
    // Distinctive blonde comb-over hair
    ctx.fillStyle = '#ffec8b';
    ctx.beginPath();
    ctx.moveTo(x + 15, by + 30);
    ctx.quadraticCurveTo(x + 25, by - 5, x + 55, by + 5);
    ctx.quadraticCurveTo(x + 90, by + 15, x + 85, by + 35);
    ctx.lineTo(x + 15, by + 38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe4b5';
    ctx.beginPath();
    ctx.arc(x + 50, by + 45, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd699';
    ctx.beginPath();
    ctx.arc(x + 50, by + 48, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e8b87a';
    ctx.stroke();
    ctx.fillStyle = '#ffec8b';
    ctx.beginPath();
    ctx.moveTo(x + 18, by + 28);
    ctx.quadraticCurveTo(x + 30, by + 8, x + 52, by + 12);
    ctx.quadraticCurveTo(x + 78, by + 18, x + 82, by + 32);
    ctx.lineTo(x + 50, by + 35);
    ctx.lineTo(x + 18, by + 32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a0a0a';
    ctx.beginPath();
    ctx.arc(x + 42, by + 48, 5, 0, Math.PI * 2);
    ctx.arc(x + 58, by + 48, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + 43, by + 47, 2, 0, Math.PI * 2);
    ctx.arc(x + 59, by + 47, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cc6666';
    ctx.beginPath();
    ctx.ellipse(x + 50, by + 58, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(x + 25, by + 62, 50, 25);
    ctx.strokeRect(x + 25, by + 62, 50, 25);
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(x + 38, by + 65, 14, 18);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 40, by + 68, 4, 4);
    ctx.fillRect(x + 46, by + 68, 4, 4);
    ctx.fillRect(x + 40, by + 74, 4, 4);
    ctx.fillRect(x + 46, by + 74, 4, 4);
  }
}

function drawBossProjectiles() {
  for (const p of bossProjectiles) {
    const x = p.x - cameraX;
    if (x < -30 || x > canvas.width + 30) continue;
    if (p.projectileType === 'knife') {
      ctx.save();
      ctx.translate(x + p.width / 2, p.y + p.height / 2);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillStyle = '#c0c0c0';
      ctx.strokeStyle = '#1a0a0a';
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-4, -3);
      ctx.lineTo(-4, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (p.projectileType === 'axe') {
      ctx.save();
      ctx.translate(x + p.width / 2, p.y + p.height / 2);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillStyle = '#6b5344';
      ctx.fillRect(-2, -4, 14, 8);
      ctx.fillStyle = '#8b6914';
      ctx.beginPath();
      ctx.moveTo(10, -6);
      ctx.lineTo(14, 0);
      ctx.lineTo(10, 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1a0a0a';
      ctx.stroke();
      ctx.restore();
    } else {
      const colors = ['#b8860b', '#5a8a3a', '#6a6aff', '#cc4422'];
      ctx.fillStyle = colors[(currentLevel - 1) % 4];
      ctx.strokeStyle = '#1a0a0a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x + p.width / 2, p.y + p.height / 2, p.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

function drawEnemies() {
  const theme = LEVEL_THEMES[currentLevel] || LEVEL_THEMES[1];
  const enemyColor = currentLevel === 1 ? '#8b3a3a' : currentLevel === 2 ? '#4a6b3a' : currentLevel === 3 ? '#4a4a6a' : '#8b4a3a';
  const eyeColor = currentLevel === 1 ? '#ff6b6b' : currentLevel === 2 ? '#7aaf5a' : currentLevel === 3 ? '#6a6a9a' : '#c05050';

  for (const e of enemies) {
    if (e.health <= 0) continue;
    if (e.type === 'boss') {
      drawBoss(e);
      continue;
    }
    const x = e.x - cameraX;
    if (x + e.width < 0 || x > canvas.width) continue;

    if (e.type === 'walker') {
      const maxHp = e.maxHealth || e.health;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - 2, e.y - 14, e.width + 4, 8);
      ctx.fillStyle = '#4a1010';
      ctx.fillRect(x, e.y - 12, e.width, 6);
      ctx.fillStyle = e.health > maxHp * 0.5 ? '#cc2222' : e.health > maxHp * 0.25 ? '#ff6622' : '#ff2222';
      ctx.fillRect(x, e.y - 12, e.width * (e.health / maxHp), 6);
      ctx.strokeStyle = '#1a0a0a';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, e.y - 12, e.width, 6);
      ctx.fillStyle = '#2a1515';
      ctx.fillRect(x + 2, e.y + 2, e.width - 4, e.height - 4);
      ctx.fillStyle = enemyColor;
      ctx.fillRect(x + 4, e.y + 4, e.width - 8, e.height - 8);
      ctx.strokeStyle = '#1a0a0a';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 4, e.y + 4, e.width - 8, e.height - 8);
      ctx.fillStyle = '#3d1a1a';
      ctx.beginPath();
      ctx.moveTo(x + 6, e.y + 8);
      ctx.lineTo(x + 12, e.y + 18);
      ctx.lineTo(x + 10, e.y + 20);
      ctx.lineTo(x + 4, e.y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + e.width - 6, e.y + 8);
      ctx.lineTo(x + e.width - 12, e.y + 18);
      ctx.lineTo(x + e.width - 10, e.y + 20);
      ctx.lineTo(x + e.width - 4, e.y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ff2222';
      ctx.beginPath();
      ctx.arc(x + 14, e.y + 16, 5, 0, Math.PI * 2);
      ctx.arc(x + e.width - 14, e.y + 16, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff6666';
      ctx.beginPath();
      ctx.arc(x + 13, e.y + 14, 2, 0, Math.PI * 2);
      ctx.arc(x + e.width - 13, e.y + 14, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a2a2a';
      ctx.beginPath();
      ctx.moveTo(x + 12, e.y + 6);
      ctx.lineTo(x + 16, e.y - 6);
      ctx.lineTo(x + 20, e.y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + e.width - 12, e.y + 6);
      ctx.lineTo(x + e.width - 16, e.y - 6);
      ctx.lineTo(x + e.width - 20, e.y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1a0a0a';
      ctx.beginPath();
      ctx.moveTo(x + 8, e.y + e.height - 8);
      ctx.lineTo(x + 6, e.y + e.height + 4);
      ctx.lineTo(x + 14, e.y + e.height + 4);
      ctx.closePath();
      ctx.moveTo(x + e.width - 8, e.y + e.height - 8);
      ctx.lineTo(x + e.width - 6, e.y + e.height + 4);
      ctx.lineTo(x + e.width - 14, e.y + e.height + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (e.type === 'thrower') {
      const t = Date.now() * 0.002 + e.x * 0.01;
      const bob = Math.sin(t) * 2;
      const cooldown = e.shootCooldown || 0;
      const isWindingUp = cooldown > 0 && cooldown < 25;
      const isThrowing = cooldown >= 88 || cooldown < 8;
      const armAngle = isWindingUp ? -0.9 : isThrowing ? 0.5 : -0.2;
      const cx = x + e.width / 2;
      const baseY = e.y + bob;

      // Robe / cloak (layered)
      ctx.fillStyle = '#2a2218';
      ctx.beginPath();
      ctx.moveTo(cx - 18, baseY + 42);
      ctx.lineTo(cx - 14, baseY + 8);
      ctx.lineTo(cx, baseY + 4);
      ctx.lineTo(cx + 14, baseY + 8);
      ctx.lineTo(cx + 18, baseY + 42);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1a1510';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#3d3528';
      ctx.beginPath();
      ctx.moveTo(cx - 16, baseY + 40);
      ctx.lineTo(cx - 12, baseY + 10);
      ctx.lineTo(cx + 12, baseY + 10);
      ctx.lineTo(cx + 16, baseY + 40);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#4a4030';
      ctx.stroke();

      // Belt
      ctx.fillStyle = '#5c4a32';
      ctx.fillRect(cx - 14, baseY + 28, 28, 5);
      ctx.strokeStyle = '#3d3020';
      ctx.strokeRect(cx - 14, baseY + 28, 28, 5);

      // Hood (with inner shadow)
      ctx.fillStyle = '#352d22';
      ctx.beginPath();
      ctx.ellipse(cx, baseY + 18, 16, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2a2018';
      ctx.stroke();

      ctx.fillStyle = '#4a3a2a';
      ctx.beginPath();
      ctx.ellipse(cx, baseY + 16, 14, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Face (shadow under hood)
      ctx.fillStyle = '#2d2520';
      ctx.beginPath();
      ctx.ellipse(cx, baseY + 14, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes (glow when winding up)
      const eyeGlow = isWindingUp ? 0.6 + 0.4 * Math.sin(Date.now() * 0.02) : 0.3;
      ctx.fillStyle = `rgba(180, 80, 60, ${eyeGlow})`;
      ctx.beginPath();
      ctx.ellipse(cx - 4, baseY + 13, 3, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 4, baseY + 13, 3, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(cx - 4, baseY + 13, 1.5, 0, Math.PI * 2);
      ctx.arc(cx + 4, baseY + 13, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Throwing arm (rotates with wind-up / throw)
      const armX = cx + 8 + Math.cos(armAngle) * 18;
      const armY = baseY + 12 + Math.sin(armAngle) * 18;
      ctx.strokeStyle = '#5a4a38';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + 6, baseY + 14);
      ctx.lineTo(armX, armY);
      ctx.stroke();
      ctx.lineWidth = 1;

      // Weapon in hand
      const wx = armX + Math.cos(armAngle) * 14;
      const wy = armY + Math.sin(armAngle) * 14;
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(armAngle);
      if (e.projectileType === 'axe') {
        ctx.fillStyle = '#5c4033';
        ctx.fillRect(-2, -3, 18, 6);
        ctx.strokeStyle = '#3d2818';
        ctx.strokeRect(-2, -3, 18, 6);
        ctx.fillStyle = '#8b6914';
        ctx.beginPath();
        ctx.moveTo(14, -8);
        ctx.lineTo(22, 0);
        ctx.lineTo(14, 8);
        ctx.lineTo(10, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#6a5a3a';
        ctx.beginPath();
        ctx.moveTo(16, -4);
        ctx.lineTo(20, 0);
        ctx.lineTo(16, 4);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = '#6b5a4a';
        ctx.fillRect(-1, -2, 10, 4);
        ctx.strokeStyle = '#4a3a2a';
        ctx.strokeRect(-1, -2, 10, 4);
        ctx.fillStyle = '#a0a0a0';
        ctx.beginPath();
        ctx.moveTo(8, -6);
        ctx.lineTo(18, 0);
        ctx.lineTo(8, 6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#606060';
        ctx.stroke();
        ctx.fillStyle = '#808080';
        ctx.beginPath();
        ctx.moveTo(10, -2);
        ctx.lineTo(16, 0);
        ctx.lineTo(10, 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // HP bar
      const maxHp = e.maxHealth || e.health;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - 2, baseY - 10, e.width + 4, 6);
      ctx.fillStyle = '#4a1010';
      ctx.fillRect(x, baseY - 8, e.width, 4);
      ctx.fillStyle = e.health > maxHp * 0.5 ? '#cc2222' : e.health > maxHp * 0.25 ? '#ff6622' : '#ff2222';
      ctx.fillRect(x, baseY - 8, e.width * (e.health / maxHp), 4);
      ctx.strokeStyle = '#1a0a0a';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, baseY - 8, e.width, 4);
    } else {
      ctx.fillStyle = theme.platformFill;
      ctx.strokeStyle = '#1a0a0a';
      ctx.lineWidth = 2;
      ctx.fillRect(x, e.y, e.width, e.height);
      ctx.strokeRect(x, e.y, e.width, e.height);
      ctx.fillStyle = theme.platformInner;
      ctx.fillRect(x + 12, e.y + 10, 24, 12);
    }
  }
}

function drawHUD() {
  document.getElementById('score').textContent = score;
  document.getElementById('hp').textContent = hp;
  document.getElementById('gold').textContent = player.gold;
  document.getElementById('level').textContent = currentLevel;
}

function renderStore() {
  const container = document.getElementById('storeGuns');
  container.innerHTML = '';
  STORE_GUNS.forEach(g => {
    const div = document.createElement('div');
    div.className = 'store-gun';
    const isArmor = g.type === 'armor';
    const owned = isArmor ? player.hasArmor : player.ownedGuns.includes(g.id);
    const equipped = !isArmor && player.gun === g.id;
    const action = isArmor ? (owned ? 'owned' : 'buy') : (owned ? 'equip' : 'buy');
    const btnText = isArmor ? (owned ? 'Owned' : 'Buy') : (equipped ? 'Equipped' : owned ? 'Equip' : 'Buy');
    const statusText = isArmor ? (owned ? '(reduces damage by half)' : '') : (equipped ? '(equipped)' : owned ? '(owned)' : '');
    div.innerHTML = `
      <span class="store-gun-name">${g.name} ${statusText}</span>
      <span>
        <span class="store-gun-price">${owned ? '' : g.price + ' gold'}</span>
        <button class="store-gun-btn" data-gun="${g.id}" data-price="${g.price}" data-action="${action}" data-type="${g.type || 'gun'}" ${!owned && player.gold < g.price ? 'disabled' : ''}>
          ${btnText}
        </button>
      </span>
    `;
    container.appendChild(div);
  });
  container.querySelectorAll('.store-gun-btn:not([disabled])').forEach(btn => {
    btn.onclick = () => {
      const gun = btn.dataset.gun;
      const price = parseInt(btn.dataset.price);
      const action = btn.dataset.action;
      const itemType = btn.dataset.type;
      if (itemType === 'armor' && action === 'buy' && player.gold >= price) {
        player.gold -= price;
        player.hasArmor = true;
        renderStore();
        drawHUD();
      } else if (itemType === 'gun') {
        if (action === 'buy' && player.gold >= price) {
          player.gold -= price;
          if (!player.ownedGuns.includes(gun)) player.ownedGuns.push(gun);
          player.gun = gun;
          renderStore();
          drawHUD();
        } else if (action === 'equip') {
          player.gun = gun;
          renderStore();
          drawHUD();
        }
      }
    };
  });
}

function openStore() {
  document.getElementById('storePanel').classList.add('visible');
  renderStore();
  const btn = document.getElementById('storeContinue');
  btn.textContent = currentLevel < 4 ? 'Continue to Next Level' : 'Complete Adventure';
  btn.onclick = closeStore;
}

function closeStore() {
  document.getElementById('storePanel').classList.remove('visible');
  storeOpen = false;
  if (currentLevel < 4) {
    loadLevel(currentLevel + 1);
  } else {
    victory = true;
    gameRunning = false;
  }
}

const keys = {};
document.addEventListener('keydown', e => {
  const k = e.key === ' ' ? ' ' : e.key.toLowerCase();
  keys[k] = true;
  if (e.key === 'Space') keys[' '] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space'].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup', e => {
  const k = e.key === ' ' ? ' ' : e.key.toLowerCase();
  keys[k] = false;
  if (e.key === 'Space') keys[' '] = false;
});
canvas.addEventListener('mousedown', e => {
  if (e.button === 0) keys['mouse0'] = true;
  e.preventDefault();
});
canvas.addEventListener('mouseup', e => {
  if (e.button === 0) keys['mouse0'] = false;
});
canvas.addEventListener('mouseleave', () => { keys['mouse0'] = false; });

function gameLoop() {
  if (!gameRunning) {
    onGameEnd();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '48px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(victory ? 'VICTORY!' : 'GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '24px Georgia';
    ctx.fillText('Final score: ' + score, canvas.width / 2, canvas.height / 2 + 20);
    requestAnimationFrame(gameLoop);
    return;
  }

  if (!storeOpen) {
    updatePlayer();
    updateBullets();
    updateDeathEffects();
    updatePickups();
    updateEnemies();
    updateBossProjectiles();
    updateCamera();
    checkEnemyCollision();
    checkLevelComplete();
  }

  drawBackground();
  drawPlatforms();
  drawPickups();
  drawBullets();
  drawBossProjectiles();
  drawEnemies();
  drawDeathEffects();
  drawPlayer();
  drawHUD();

  requestAnimationFrame(gameLoop);
}

loadLevel(1);
gameLoop();
