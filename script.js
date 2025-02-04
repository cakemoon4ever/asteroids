// CONFIGURAÇÕES GERAIS
const FPS = 30; 
const FRICTION = 0.7;
const GAME_LIVES = 3;
const LASER_DIST = 0.6;
const LASER_EXPLODE_DUR = 0.1;
const LASER_MAX = 10;
const LASER_SPD = 500;
const ROID_JAG = 0.4;
const ROID_PTS_LGE = 20;
const ROID_PTS_MED = 50;
const ROID_PTS_SML = 100;
const ROID_NUM = 3;
const ROID_SIZE = 100;
const ROID_SPD = 50;
const ROID_VERT = 10;
const SAVE_KEY_SCORE = "highscore";
const SHIP_BLINK_DUR = 0.1;
const SHIP_EXPLODE_DUR = 0.3;
const SHIP_INV_DUR = 3;
const SHIP_SIZE = 30;
const SHIP_THRUST = 5;
const SHIP_TURN_SPD = 360;
const SHOW_BOUNDING = false;
const SHOW_CENTRE_DOT = false;
const MUSIC_ON = true;
const SOUND_ON = true;
const TEXT_FADE_TIME = 2.5;
const TEXT_SIZE = 35;

/** @type {HTMLCanvasElement} */
var canv = document.getElementById("gameCanvas");
var ctx = canv.getContext("2d");

// CONFIGURAÇÃO DE IMAGENS E EFEITOS NEON
var shipImg = new Image();
shipImg.src = "ship.png";

// Asteroids images (crypto1.png a crypto8.png)
var cryptoImgs = [];
var cryptoSrcs = [
  "crypto1.png", "crypto2.png", "crypto3.png", "crypto4.png",
  "crypto5.png", "crypto6.png", "crypto7.png", "crypto8.png"
];
cryptoSrcs.forEach(src => {
  let img = new Image();
  img.src = src;
  cryptoImgs.push(img);
});

// Funções de glow para efeito neon
function applyGlow(color = "#00eaff") {
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;
}
function resetGlow() {
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
}

// SONS – os arquivos de áudio estão na raiz
var fxExplode = new Sound("explode.m4a");
var fxHit = new Sound("hit.m4a", 5);
var fxLaser = new Sound("laser.m4a", 5, 0.5);
var fxThrust = new Sound("thrust.m4a");
var music = new Music("music.m4a");
var roidsLeft, roidsTotal;

// PARÂMETROS DO JOGO
var level, lives, roids, score, scoreHigh, ship, text, textAlpha;
newGame();

// EVENTOS DE TECLADO
document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

// LOOP DE ATUALIZAÇÃO DO JOGO
setInterval(update, 1000 / FPS);

function createAsteroidBelt() {
  roids = [];
  roidsTotal = (ROID_NUM + level) * 7;
  roidsLeft = roidsTotal;
  var x, y;
  for (var i = 0; i < ROID_NUM + level; i++) {
    do {
      x = Math.floor(Math.random() * canv.width);
      y = Math.floor(Math.random() * canv.height);
    } while (distBetweenPoints(ship.x, ship.y, x, y) < ROID_SIZE * 2 + ship.r);
    roids.push(newAsteroid(x, y, Math.ceil(ROID_SIZE / 2)));
  }
}

function destroyAsteroid(index) {
  var x = roids[index].x;
  var y = roids[index].y;
  var r = roids[index].r;

  if (r == Math.ceil(ROID_SIZE / 2)) {
    roids.push(newAsteroid(x, y, Math.ceil(ROID_SIZE / 4)));
    roids.push(newAsteroid(x, y, Math.ceil(ROID_SIZE / 4)));
    score += ROID_PTS_LGE;
  } else if (r == Math.ceil(ROID_SIZE / 4)) {
    roids.push(newAsteroid(x, y, Math.ceil(ROID_SIZE / 8)));
    roids.push(newAsteroid(x, y, Math.ceil(ROID_SIZE / 8)));
    score += ROID_PTS_MED;
  } else {
    score += ROID_PTS_SML;
  }

  if (score > scoreHigh) {
    scoreHigh = score;
    localStorage.setItem(SAVE_KEY_SCORE, scoreHigh);
  }

  roids.splice(index, 1);
  fxHit.play();
  roidsLeft--;
  music.setAsteroidRatio(roidsLeft / roidsTotal);

  if (roids.length === 0) {
    level++;
    newLevel();
  }
}

function distBetweenPoints(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function drawShip(x, y, a) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-a + Math.PI / 2);
  applyGlow("#00eaff");
  ctx.drawImage(shipImg, -SHIP_SIZE, -SHIP_SIZE, SHIP_SIZE * 2, SHIP_SIZE * 2);
  resetGlow();
  ctx.restore();
}

function explodeShip() {
  ship.explodeTime = Math.ceil(SHIP_EXPLODE_DUR * FPS);
  fxExplode.play();
}

function gameOver() {
  ship.dead = true;
  text = "Game Over";
  textAlpha = 1.0;
}

function keyDown(ev) {
  if (ship.dead) return;
  switch(ev.keyCode) {
    case 32:
      shootLaser();
      break;
    case 37:
      ship.rot = SHIP_TURN_SPD / 180 * Math.PI / FPS;
      break;
    case 38:
      ship.thrusting = true;
      break;
    case 39:
      ship.rot = -SHIP_TURN_SPD / 180 * Math.PI / FPS;
      break;
  }
}

function keyUp(ev) {
  if (ship.dead) return;
  switch(ev.keyCode) {
    case 32:
      ship.canShoot = true;
      break;
    case 37:
      ship.rot = 0;
      break;
    case 38:
      ship.thrusting = false;
      break;
    case 39:
      ship.rot = 0;
      break;
  }
}

function newAsteroid(x, y, r) {
  var lvlMult = 1 + 0.1 * level;
  var roid = {
    x: x,
    y: y,
    xv: (Math.random() * ROID_SPD * lvlMult / FPS) * (Math.random() < 0.5 ? 1 : -1),
    yv: (Math.random() * ROID_SPD * lvlMult / FPS) * (Math.random() < 0.5 ? 1 : -1),
    a: Math.random() * Math.PI * 2,
    r: r,
    offs: [],
    vert: Math.floor(Math.random() * (ROID_VERT + 1) + ROID_VERT / 2)
  };
  for (var i = 0; i < roid.vert; i++) {
    roid.offs.push(Math.random() * ROID_JAG * 2 + 1 - ROID_JAG);
  }
  roid.img = cryptoImgs[Math.floor(Math.random() * cryptoImgs.length)];
  return roid;
}

function newGame() {
  level = 0;
  lives = GAME_LIVES;
  score = 0;
  ship = newShip();
  var scoreStr = localStorage.getItem(SAVE_KEY_SCORE);
  scoreHigh = scoreStr ? parseInt(scoreStr) : 0;
  newLevel();
}

function newLevel() {
  music.setAsteroidRatio(1);
  text = "Level " + (level + 1);
  textAlpha = 1.0;
  createAsteroidBelt();
}

function newShip() {
  return {
    x: canv.width / 2,
    y: canv.height / 2,
    a: 90 / 180 * Math.PI,
    r: SHIP_SIZE,
    blinkNum: Math.ceil(SHIP_INV_DUR / SHIP_BLINK_DUR),
    blinkTime: Math.ceil(SHIP_BLINK_DUR * FPS),
    canShoot: true,
    dead: false,
    explodeTime: 0,
    lasers: [],
    rot: 0,
    thrusting: false,
    thrust: { x: 0, y: 0 }
  };
}

function shootLaser() {
  if (ship.canShoot && ship.lasers.length < LASER_MAX) {
    ship.lasers.push({
      x: ship.x + 4 / 3 * ship.r * Math.cos(ship.a),
      y: ship.y - 4 / 3 * ship.r * Math.sin(ship.a),
      xv: LASER_SPD * Math.cos(ship.a) / FPS,
      yv: -LASER_SPD * Math.sin(ship.a) / FPS,
      dist: 0,
      explodeTime: 0
    });
    fxLaser.play();
  }
  ship.canShoot = false;
}

function Music(srcLow, srcHigh) {
  this.soundLow = new Audio(srcLow);
  this.soundHigh = new Audio(srcHigh);
  this.low = true;
  this.tempo = 1.0;
  this.beatTime = 0;
  this.play = function() {
    if (MUSIC_ON) {
      if (this.low) {
        this.soundLow.play();
      } else {
        this.soundHigh.play();
      }
      this.low = !this.low;
    }
  }
  this.setAsteroidRatio = function(ratio) {
    this.tempo = 1.0 - 0.75 * (1.0 - ratio);
  }
  this.tick = function() {
    if (this.beatTime === 0) {
      this.play();
      this.beatTime = Math.ceil(this.tempo * FPS);
    } else {
      this.beatTime--;
    }
  }
}

function Sound(src, maxStreams = 1, vol = 1.0) {
  this.streamNum = 0;
  this.streams = [];
  for (var i = 0; i < maxStreams; i++) {
    this.streams.push(new Audio(src));
    this.streams[i].volume = vol;
  }
  this.play = function() {
    if (SOUND_ON) {
      this.streamNum = (this.streamNum + 1) % maxStreams;
      this.streams[this.streamNum].play();
    }
  }
  this.stop = function() {
    this.streams[this.streamNum].pause();
    this.streams[this.streamNum].currentTime = 0;
  }
}

function update() {
  var blinkOn = ship.blinkNum % 2 === 0;
  var exploding = ship.explodeTime > 0;
  
  music.tick();
  
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canv.width, canv.height);
  
  for (var i = 0; i < roids.length; i++) {
    var a = roids[i].a, r = roids[i].r, x = roids[i].x, y = roids[i].y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    applyGlow("#ff00ff");
    ctx.drawImage(roids[i].img, -r, -r, r * 2, r * 2);
    resetGlow();
    ctx.restore();
    if (SHOW_BOUNDING) {
      ctx.strokeStyle = "lime";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2, false);
      ctx.stroke();
    }
  }
  
  if (ship.thrusting && !ship.dead) {
    ship.thrust.x += SHIP_THRUST * Math.cos(ship.a) / FPS;
    ship.thrust.y -= SHIP_THRUST * Math.sin(ship.a) / FPS;
    fxThrust.play();
    if (!exploding && blinkOn) {
      ctx.save();
      applyGlow("#00ff00");
      ctx.fillStyle = "rgba(255,0,0,0.8)";
      ctx.beginPath();
      ctx.moveTo(
        ship.x - ship.r * (2/3 * Math.cos(ship.a) + 0.5 * Math.sin(ship.a)),
        ship.y + ship.r * (2/3 * Math.sin(ship.a) - 0.5 * Math.cos(ship.a))
      );
      ctx.lineTo(
        ship.x - ship.r * 5/3 * Math.cos(ship.a),
        ship.y + ship.r * 5/3 * Math.sin(ship.a)
      );
      ctx.lineTo(
        ship.x - ship.r * (2/3 * Math.cos(ship.a) - 0.5 * Math.sin(ship.a)),
        ship.y + ship.r * (2/3 * Math.sin(ship.a) + 0.5 * Math.cos(ship.a))
      );
      ctx.closePath();
      ctx.fill();
      resetGlow();
      ctx.restore();
    }
  } else {
    ship.thrust.x -= FRICTION * ship.thrust.x / FPS;
    ship.thrust.y -= FRICTION * ship.thrust.y / FPS;
    fxThrust.stop();
  }
  
  if (!exploding) {
    if (blinkOn && !ship.dead) {
      drawShip(ship.x, ship.y, ship.a);
    }
    if (ship.blinkNum > 0) {
      ship.blinkTime--;
      if (ship.blinkTime === 0) {
        ship.blinkTime = Math.ceil(SHIP_BLINK_DUR * FPS);
        ship.blinkNum--;
      }
    }
  } else {
    var explosionColors = ["#ff0055", "#ff5500", "#ffaa00", "#ffff00", "#ffffff"];
    for (var i = 0; i < explosionColors.length; i++) {
      ctx.fillStyle = explosionColors[i];
      ctx.beginPath();
      ctx.arc(ship.x, ship.y, ship.r * (1.7 - 0.2 * i), 0, Math.PI * 2, false);
      ctx.fill();
    }
  }
  
  if (SHOW_CENTRE_DOT) {
    ctx.fillStyle = "red";
    ctx.fillRect(ship.x - 1, ship.y - 1, 2, 2);
  }
  
  for (var i = 0; i < ship.lasers.length; i++) {
    if (ship.lasers[i].explodeTime === 0) {
      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(ship.lasers[i].x, ship.lasers[i].y, SHIP_SIZE / 15, 0, Math.PI * 2, false);
      ctx.fill();
    } else {
      ctx.fillStyle = "#ff4500";
      ctx.beginPath();
      ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.75, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.fillStyle = "#ff9999";
      ctx.beginPath();
      ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.5, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.fillStyle = "#ff66cc";
      ctx.beginPath();
      ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.25, 0, Math.PI * 2, false);
      ctx.fill();
    }
  }
  
  if (textAlpha >= 0) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255," + textAlpha + ")";
    ctx.font = "small-caps " + TEXT_SIZE + "px Orbitron";
    ctx.fillText(text, canv.width / 2, canv.height * 0.75);
    textAlpha -= (1.0 / TEXT_FADE_TIME / FPS);
  } else if (ship.dead) {
    newGame();
  }
  
  for (var i = 0; i < lives; i++) {
    drawShip(SHIP_SIZE + i * SHIP_SIZE * 1.2, SHIP_SIZE, 0.5 * Math.PI);
  }
  
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.font = TEXT_SIZE + "px Orbitron";
  ctx.fillText(score, canv.width - SHIP_SIZE / 2, SHIP_SIZE);
  
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.font = (TEXT_SIZE * 0.75) + "px Orbitron";
  ctx.fillText("BEST " + scoreHigh, canv.width / 2, SHIP_SIZE);
  
  for (var i = roids.length - 1; i >= 0; i--) {
    var ax = roids[i].x, ay = roids[i].y, ar = roids[i].r;
    for (var j = ship.lasers.length - 1; j >= 0; j--) {
      var lx = ship.lasers[j].x, ly = ship.lasers[j].y;
      if (ship.lasers[j].explodeTime === 0 && distBetweenPoints(ax, ay, lx, ly) < ar) {
        destroyAsteroid(i);
        ship.lasers[j].explodeTime = Math.ceil(LASER_EXPLODE_DUR * FPS);
        break;
      }
    }
  }
  
  if (!exploding) {
    if (ship.blinkNum === 0 && !ship.dead) {
      for (var i = 0; i < roids.length; i++) {
        if (distBetweenPoints(ship.x, ship.y, roids[i].x, roids[i].y) < ship.r + roids[i].r) {
          explodeShip();
          destroyAsteroid(i);
          break;
        }
      }
    }
    ship.a += ship.rot;
    ship.x += ship.thrust.x;
    ship.y += ship.thrust.y;
  } else {
    ship.explodeTime--;
    if (ship.explodeTime === 0) {
      lives--;
      ship = (lives === 0) ? (gameOver(), newShip()) : newShip();
    }
  }
  
  if (ship.x < 0 - ship.r) ship.x = canv.width + ship.r;
  else if (ship.x > canv.width + ship.r) ship.x = 0 - ship.r;
  if (ship.y < 0 - ship.r) ship.y = canv.height + ship.r;
  else if (ship.y > canv.height + ship.r) ship.y = 0 - ship.r;
  
  for (var i = ship.lasers.length - 1; i >= 0; i--) {
    if (ship.lasers[i].dist > LASER_DIST * canv.width) {
      ship.lasers.splice(i, 1);
      continue;
    }
    if (ship.lasers[i].explodeTime > 0) {
      ship.lasers[i].explodeTime--;
      if (ship.lasers[i].explodeTime === 0) {
        ship.lasers.splice(i, 1);
        continue;
      }
    } else {
      ship.lasers[i].x += ship.lasers[i].xv;
      ship.lasers[i].y += ship.lasers[i].yv;
      ship.lasers[i].dist += Math.sqrt(ship.lasers[i].xv**2 + ship.lasers[i].yv**2);
    }
    if (ship.lasers[i].x < 0) ship.lasers[i].x = canv.width;
    else if (ship.lasers[i].x > canv.width) ship.lasers[i].x = 0;
    if (ship.lasers[i].y < 0) ship.lasers[i].y = canv.height;
    else if (ship.lasers[i].y > canv.height) ship.lasers[i].y = 0;
  }
  
  for (var i = 0; i < roids.length; i++) {
    roids[i].x += roids[i].xv;
    roids[i].y += roids[i].yv;
    if (roids[i].x < 0 - roids[i].r) roids[i].x = canv.width + roids[i].r;
    else if (roids[i].x > canv.width + roids[i].r) roids[i].x = 0 - roids[i].r;
    if (roids[i].y < 0 - roids[i].r) roids[i].y = canv.height + roids[i].r;
    else if (roids[i].y > canv.height + roids[i].r) roids[i].y = 0 - roids[i].r;
  }
}
