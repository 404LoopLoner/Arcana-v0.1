const startButton = document.getElementById("startButton");
const bootScreen = document.getElementById("bootScreen");
const interfaceScreen = document.getElementById("interface");

const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");

const ctx = canvas.getContext("2d");

const statusText = document.getElementById("status");
const systemMessage = document.getElementById("systemMessage");
const fpsText = document.getElementById("fps");

let width = window.innerWidth;
let height = window.innerHeight;

let particles = [];

let lastFrame = performance.now();
let frameCounter = 0;
let fps = 0;

/* ---------------------------------
   INITIALIZE
---------------------------------- */

startButton.addEventListener("click", async () => {

  startButton.innerText = "INITIALIZING...";

  try {

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: {
          ideal: 1280
        },

        height: {
          ideal: 720
        },

        facingMode: "user"
      },

      audio: false
    });

    video.srcObject = stream;

    await video.play();

    bootScreen.classList.add("hidden");
    interfaceScreen.classList.remove("hidden");

    resizeCanvas();

    systemMessage.innerText = "VISION CORE ONLINE";

    setTimeout(() => {
      systemMessage.innerText = "PRESENT BOTH HANDS";
    }, 1800);

    animate();

  } catch (error) {

    console.error(error);

    startButton.innerText = "CAMERA ACCESS FAILED";

  }

});

/* ---------------------------------
   CANVAS
---------------------------------- */

function resizeCanvas() {

  width = window.innerWidth;
  height = window.innerHeight;

  canvas.width = width;
  canvas.height = height;

}

window.addEventListener("resize", resizeCanvas);

/* ---------------------------------
   PARTICLE CLASS
---------------------------------- */

class Particle {

  constructor(x, y) {

    this.x = x;
    this.y = y;

    this.size =
      Math.random() * 3 + 1;

    this.life = 1;

    this.velocityX =
      (Math.random() - 0.5) * 2;

    this.velocityY =
      (Math.random() - 0.5) * 2;

  }

  update() {

    this.x += this.velocityX;
    this.y += this.velocityY;

    this.life -= 0.025;

    this.size *= 0.98;

  }

  draw() {

    ctx.save();

    ctx.globalAlpha =
      Math.max(this.life, 0);

    ctx.beginPath();

    ctx.arc(
      this.x,
      this.y,
      this.size,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = "#8ef8ff";

    ctx.shadowColor = "#00d9ff";
    ctx.shadowBlur = 15;

    ctx.fill();

    ctx.restore();

  }

}

/* ---------------------------------
   CREATE PARTICLE
---------------------------------- */

function createParticle(x, y) {

  particles.push(
    new Particle(x, y)
  );

}

/* ---------------------------------
   UPDATE PARTICLES
---------------------------------- */

function updateParticles() {

  for (
    let i = particles.length - 1;
    i >= 0;
    i--
  ) {

    particles[i].update();
    particles[i].draw();

    if (particles[i].life <= 0) {
      particles.splice(i, 1);
    }

  }

}

/* ---------------------------------
   DRAW CENTER RETICLE
---------------------------------- */

function drawReticle() {

  const x = width / 2;
  const y = height / 2;

  ctx.save();

  ctx.strokeStyle =
    "rgba(80,220,255,0.25)";

  ctx.lineWidth = 1;

  ctx.beginPath();

  ctx.arc(
    x,
    y,
    40,
    0,
    Math.PI * 2
  );

  ctx.stroke();

  ctx.beginPath();

  ctx.arc(
    x,
    y,
    55,
    0,
    Math.PI * 2
  );

  ctx.stroke();

  ctx.beginPath();

  ctx.moveTo(x - 75, y);
  ctx.lineTo(x - 45, y);

  ctx.moveTo(x + 45, y);
  ctx.lineTo(x + 75, y);

  ctx.moveTo(x, y - 75);
  ctx.lineTo(x, y - 45);

  ctx.moveTo(x, y + 45);
  ctx.lineTo(x, y + 75);

  ctx.stroke();

  ctx.restore();

}

/* ---------------------------------
   ROTATING CORE
---------------------------------- */

let rotation = 0;

function drawCore() {

  const x = width / 2;
  const y = height / 2;

  rotation += 0.005;

  ctx.save();

  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.strokeStyle =
    "rgba(0,220,255,0.18)";

  ctx.lineWidth = 1;

  ctx.beginPath();

  ctx.arc(
    0,
    0,
    95,
    0,
    Math.PI * 1.3
  );

  ctx.stroke();

  ctx.beginPath();

  ctx.arc(
    0,
    0,
    115,
    Math.PI,
    Math.PI * 2.3
  );

  ctx.stroke();

  for (let i = 0; i < 12; i++) {

    const angle =
      (Math.PI * 2 / 12) * i;

    const x1 =
      Math.cos(angle) * 105;

    const y1 =
      Math.sin(angle) * 105;

    const x2 =
      Math.cos(angle) * 112;

    const y2 =
      Math.sin(angle) * 112;

    ctx.beginPath();

    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    ctx.stroke();

  }

  ctx.restore();

}

/* ---------------------------------
   CURSOR DEMO

   Temporary mouse tracking lets us
   test particle effects before
   hand tracking is added.
---------------------------------- */

let cursorX = width / 2;
let cursorY = height / 2;

window.addEventListener(
  "mousemove",
  (event) => {

    cursorX = event.clientX;
    cursorY = event.clientY;

    for (let i = 0; i < 2; i++) {

      createParticle(
        cursorX,
        cursorY
      );

    }

  }
);

/* ---------------------------------
   DRAW ENERGY CURSOR
---------------------------------- */

function drawEnergyCursor() {

  ctx.save();

  ctx.beginPath();

  ctx.arc(
    cursorX,
    cursorY,
    7,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = "#ffffff";

  ctx.shadowColor = "#00eaff";
  ctx.shadowBlur = 25;

  ctx.fill();

  ctx.beginPath();

  ctx.arc(
    cursorX,
    cursorY,
    16,
    0,
    Math.PI * 2
  );

  ctx.strokeStyle =
    "rgba(0,230,255,0.5)";

  ctx.stroke();

  ctx.restore();

}

/* ---------------------------------
   FPS
---------------------------------- */

function updateFPS() {

  frameCounter++;

  const now = performance.now();

  if (now - lastFrame >= 1000) {

    fps = frameCounter;

    frameCounter = 0;

    lastFrame = now;

    fpsText.innerText =
      `FPS ${fps}`;

  }

}

/* ---------------------------------
   ANIMATION LOOP
---------------------------------- */

function animate() {

  ctx.clearRect(
    0,
    0,
    width,
    height
  );

  drawReticle();

  drawCore();

  updateParticles();

  drawEnergyCursor();

  updateFPS();

  requestAnimationFrame(animate);

}

/* ---------------------------------
   FUTURE ARCANA MODULES

   HAND TRACKING
   ↓
   LEFT / RIGHT IDENTIFICATION
   ↓
   INDEX FINGER TRAJECTORY
   ↓
   CIRCLE DETECTION
   ↓
   SUMMONING
   ↓
   RUNE RECOGNITION
   ↓
   COMMAND ENGINE
---------------------------------- */

console.log(
  "%c ARCANA CORE ",
  "background:#001820;color:#6ff7ff;font-size:20px;padding:10px"
);

console.log(
  "Spatial Gesture OS // Development Build"
);