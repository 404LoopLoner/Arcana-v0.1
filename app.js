import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/vision_bundle.mjs";

const startButton = document.getElementById("startButton");
const bootScreen = document.getElementById("bootScreen");
const interfaceScreen = document.getElementById("interface");

const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const statusText = document.getElementById("status");
const systemMessage = document.getElementById("systemMessage");
const fpsText = document.getElementById("fps");

let width = innerWidth;
let height = innerHeight;

let handLandmarker = null;
let running = false;

let lastVideoTime = -1;

let particles = [];
let trails = {
  Left: [],
  Right: []
};

let lastFrame = performance.now();
let frameCounter = 0;

let arcanaActive = false;
let activationProgress = 0;
let activationHold = 0;

let flash = 0;
let rotation = 0;

let leftHand = null;
let rightHand = null;

const MAX_TRAIL = 35;

/* =========================================================
   START ARCANA
========================================================= */

startButton.addEventListener("click", async () => {

  startButton.innerText = "LOADING VISION CORE...";

  try {

    await initializeHandTracking();

    startButton.innerText = "REQUESTING CAMERA...";

    const stream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: false
      });

    video.srcObject = stream;

    await video.play();

    bootScreen.classList.add("hidden");
    interfaceScreen.classList.remove("hidden");

    resizeCanvas();

    running = true;

    systemMessage.innerText = "VISION CORE ONLINE";

    setTimeout(() => {
      systemMessage.innerText = "PRESENT BOTH HANDS";
    }, 1500);

    requestAnimationFrame(loop);

  } catch (error) {

    console.error(error);

    startButton.innerText = "INITIALIZATION FAILED";

    alert(
      "ARCANA could not initialize.\n\n" +
      "Open DevTools → Console to see the error."
    );
  }
});

/* =========================================================
   MEDIAPIPE
========================================================= */

async function initializeHandTracking() {

  const vision =
    await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
    );

  handLandmarker =
    await HandLandmarker.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",

          delegate: "GPU"
        },

        runningMode: "VIDEO",

        numHands: 2,

        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.5
      }
    );
}

/* =========================================================
   CANVAS
========================================================= */

function resizeCanvas() {

  width = innerWidth;
  height = innerHeight;

  canvas.width = width;
  canvas.height = height;
}

window.addEventListener("resize", resizeCanvas);

/* =========================================================
   COORDINATE CONVERSION
========================================================= */

/*
Camera video is mirrored with CSS.

MediaPipe sees the original video.

Therefore X must be mirrored manually
when drawing on the canvas.
*/

function screenPoint(landmark) {

  return {
    x: width - landmark.x * width,
    y: landmark.y * height
  };
}

/* =========================================================
   PARTICLES
========================================================= */

class Particle {

  constructor(x, y, power = 1) {

    this.x = x;
    this.y = y;

    this.vx =
      (Math.random() - 0.5) * 3 * power;

    this.vy =
      (Math.random() - 0.5) * 3 * power;

    this.life = 1;

    this.size =
      Math.random() * 3 + 1;
  }

  update() {

    this.x += this.vx;
    this.y += this.vy;

    this.life -= 0.035;

    this.size *= 0.97;
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

    ctx.fillStyle =
      arcanaActive
        ? "#ffb347"
        : "#8ef8ff";

    ctx.shadowColor =
      arcanaActive
        ? "#ff7b00"
        : "#00eaff";

    ctx.shadowBlur = 18;

    ctx.fill();

    ctx.restore();
  }
}

function spawnParticles(x, y, count = 2) {

  for (let i = 0; i < count; i++) {

    particles.push(
      new Particle(x, y)
    );
  }
}

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

/* =========================================================
   HAND GESTURES
========================================================= */

function distance(a, b) {

  return Math.hypot(
    a.x - b.x,
    a.y - b.y
  );
}

function fingerExtended(lm, tip, pip) {

  return lm[tip].y < lm[pip].y;
}

function getGesture(lm) {

  const index =
    fingerExtended(lm, 8, 6);

  const middle =
    fingerExtended(lm, 12, 10);

  const ring =
    fingerExtended(lm, 16, 14);

  const pinky =
    fingerExtended(lm, 20, 18);

  const thumbIndexDistance =
    distance(lm[4], lm[8]);

  if (thumbIndexDistance < 0.055) {
    return "PINCH";
  }

  const extended =
    [index, middle, ring, pinky]
      .filter(Boolean)
      .length;

  if (extended >= 4) {
    return "OPEN PALM";
  }

  if (extended === 0) {
    return "FIST";
  }

  if (
    index &&
    middle &&
    !ring &&
    !pinky
  ) {
    return "ARC SIGN";
  }

  if (
    index &&
    !middle &&
    !ring &&
    !pinky
  ) {
    return "POINT";
  }

  return "TRACKING";
}

/* =========================================================
   HAND CENTER
========================================================= */

function handCenter(lm) {

  const ids =
    [0, 5, 9, 13, 17];

  let x = 0;
  let y = 0;

  ids.forEach(id => {

    const p =
      screenPoint(lm[id]);

    x += p.x;
    y += p.y;
  });

  return {
    x: x / ids.length,
    y: y / ids.length
  };
}

/* =========================================================
   FINGER TRAILS
========================================================= */

function updateTrail(label, lm) {

  const point =
    screenPoint(lm[8]);

  trails[label].push(point);

  if (
    trails[label].length >
    MAX_TRAIL
  ) {

    trails[label].shift();
  }

  spawnParticles(
    point.x,
    point.y,
    arcanaActive ? 3 : 1
  );
}

function drawTrail(label) {

  const trail =
    trails[label];

  if (trail.length < 2)
    return;

  ctx.save();

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (
    let i = 1;
    i < trail.length;
    i++
  ) {

    const alpha =
      i / trail.length;

    ctx.beginPath();

    ctx.moveTo(
      trail[i - 1].x,
      trail[i - 1].y
    );

    ctx.lineTo(
      trail[i].x,
      trail[i].y
    );

    ctx.strokeStyle =
      arcanaActive
        ? `rgba(255,140,20,${alpha})`
        : `rgba(70,230,255,${alpha})`;

    ctx.lineWidth =
      1 + alpha * 4;

    ctx.shadowColor =
      arcanaActive
        ? "#ff7700"
        : "#00eaff";

    ctx.shadowBlur = 15;

    ctx.stroke();
  }

  ctx.restore();
}

/* =========================================================
   HAND ENERGY POINTS
========================================================= */

function drawFingerNode(point, radius = 7) {

  ctx.save();

  ctx.beginPath();

  ctx.arc(
    point.x,
    point.y,
    radius,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = "#ffffff";

  ctx.shadowColor =
    arcanaActive
      ? "#ff8c00"
      : "#00eaff";

  ctx.shadowBlur = 25;

  ctx.fill();

  ctx.beginPath();

  ctx.arc(
    point.x,
    point.y,
    radius + 9,
    0,
    Math.PI * 2
  );

  ctx.strokeStyle =
    arcanaActive
      ? "rgba(255,130,0,.7)"
      : "rgba(0,230,255,.7)";

  ctx.lineWidth = 1;

  ctx.stroke();

  ctx.restore();
}

/* =========================================================
   HAND HUD
========================================================= */

function drawHandHUD(
  label,
  lm,
  gesture
) {

  const center =
    handCenter(lm);

  const index =
    screenPoint(lm[8]);

  drawFingerNode(index);

  ctx.save();

  ctx.translate(
    center.x,
    center.y
  );

  rotation += 0.0008;

  ctx.rotate(
    label === "Left"
      ? rotation
      : -rotation
  );

  const color =
    arcanaActive
      ? "rgba(255,135,15,.75)"
      : "rgba(30,225,255,.55)";

  ctx.strokeStyle = color;

  ctx.shadowColor =
    arcanaActive
      ? "#ff7900"
      : "#00eaff";

  ctx.shadowBlur = 15;

  ctx.lineWidth = 1.3;

  ctx.beginPath();

  ctx.arc(
    0,
    0,
    65,
    0,
    Math.PI * 1.55
  );

  ctx.stroke();

  ctx.beginPath();

  ctx.arc(
    0,
    0,
    85,
    Math.PI * .5,
    Math.PI * 2
  );

  ctx.stroke();

  for (
    let i = 0;
    i < 16;
    i++
  ) {

    const angle =
      (Math.PI * 2 / 16) * i;

    const r1 = 75;
    const r2 =
      i % 4 === 0
        ? 91
        : 83;

    ctx.beginPath();

    ctx.moveTo(
      Math.cos(angle) * r1,
      Math.sin(angle) * r1
    );

    ctx.lineTo(
      Math.cos(angle) * r2,
      Math.sin(angle) * r2
    );

    ctx.stroke();
  }

  ctx.restore();

  /* label */

  ctx.save();

  ctx.font =
    "11px Arial";

  ctx.letterSpacing = "2px";

  ctx.fillStyle =
    arcanaActive
      ? "#ffc46b"
      : "#91f7ff";

  ctx.shadowColor =
    arcanaActive
      ? "#ff7900"
      : "#00eaff";

  ctx.shadowBlur = 10;

  ctx.fillText(
    `${label.toUpperCase()} // ${gesture}`,
    center.x - 65,
    center.y + 115
  );

  ctx.restore();
}

/* =========================================================
   ARCANE RUNE
========================================================= */

function drawRune(
  x,
  y,
  radius,
  direction
) {

  ctx.save();

  ctx.translate(x, y);

  rotation += 0.0015;

  ctx.rotate(
    rotation * direction
  );

  ctx.strokeStyle =
    "rgba(255,140,20,.8)";

  ctx.shadowColor =
    "#ff7200";

  ctx.shadowBlur = 20;

  ctx.lineWidth = 2;

  ctx.beginPath();

  ctx.arc(
    0,
    0,
    radius,
    0,
    Math.PI * 2
  );

  ctx.stroke();

  ctx.beginPath();

  ctx.arc(
    0,
    0,
    radius * .78,
    0,
    Math.PI * 2
  );

  ctx.stroke();

  /* triangle */

  ctx.beginPath();

  for (
    let i = 0;
    i < 3;
    i++
  ) {

    const angle =
      -Math.PI / 2 +
      i * Math.PI * 2 / 3;

    const px =
      Math.cos(angle) *
      radius * .67;

    const py =
      Math.sin(angle) *
      radius * .67;

    if (i === 0)
      ctx.moveTo(px, py);
    else
      ctx.lineTo(px, py);
  }

  ctx.closePath();
  ctx.stroke();

  /* rune ticks */

  for (
    let i = 0;
    i < 24;
    i++
  ) {

    const angle =
      Math.PI * 2 / 24 * i;

    const inner =
      radius * .82;

    const outer =
      radius *
      (i % 3 === 0
        ? 1.08
        : .98);

    ctx.beginPath();

    ctx.moveTo(
      Math.cos(angle) * inner,
      Math.sin(angle) * inner
    );

    ctx.lineTo(
      Math.cos(angle) * outer,
      Math.sin(angle) * outer
    );

    ctx.stroke();
  }

  ctx.restore();
}

/* =========================================================
   SUMMONING LOGIC
========================================================= */

function processSummoning() {

  if (
    !leftHand ||
    !rightHand
  ) {

    activationHold = Math.max(
      0,
      activationHold - 2
    );

    activationProgress =
      activationHold / 90;

    return;
  }

  const leftGesture =
    getGesture(leftHand);

  const rightGesture =
    getGesture(rightHand);

  /*
  For V0.2 the summoning pose is:
  both palms open.

  Hold both palms toward the camera.
  */

  if (
    leftGesture === "OPEN PALM" &&
    rightGesture === "OPEN PALM"
  ) {

    activationHold++;

    activationProgress =
      Math.min(
        activationHold / 90,
        1
      );

    systemMessage.innerText =
      `ARCANE LINK ${Math.round(
        activationProgress * 100
      )}%`;

    if (
      activationHold >= 90 &&
      !arcanaActive
    ) {

      activateArcana();
    }

  } else {

    if (!arcanaActive) {

      activationHold =
        Math.max(
          0,
          activationHold - 3
        );

      activationProgress =
        activationHold / 90;

      systemMessage.innerText =
        "OPEN BOTH PALMS";
    }
  }
}

function activateArcana() {

  arcanaActive = true;

  flash = 1;

  systemMessage.innerText =
    "ARCANA CORE // ONLINE";

  statusText.innerText =
    "SPATIAL INTERFACE ACTIVE";

  document.body.classList.add(
    "arcana-active"
  );

  setTimeout(() => {

    systemMessage.innerText =
      "GESTURE CONTROL ENABLED";

  }, 1500);
}

/* =========================================================
   SUMMON PROGRESS
========================================================= */

function drawActivationProgress() {

  if (
    arcanaActive ||
    activationProgress <= 0
  )
    return;

  const x =
    width / 2;

  const y =
    height / 2;

  const radius = 130;

  ctx.save();

  ctx.strokeStyle =
    "rgba(0,235,255,.15)";

  ctx.lineWidth = 4;

  ctx.beginPath();

  ctx.arc(
    x,
    y,
    radius,
    0,
    Math.PI * 2
  );

  ctx.stroke();

  ctx.strokeStyle =
    "#79f6ff";

  ctx.shadowColor =
    "#00eaff";

  ctx.shadowBlur = 25;

  ctx.lineWidth = 4;

  ctx.beginPath();

  ctx.arc(
    x,
    y,
    radius,
    -Math.PI / 2,
    -Math.PI / 2 +
      Math.PI *
      2 *
      activationProgress
  );

  ctx.stroke();

  ctx.restore();
}

/* =========================================================
   ACTIVE ARCANA CORE
========================================================= */

function drawActiveCore() {

  if (!arcanaActive)
    return;

  if (leftHand) {

    const c =
      handCenter(leftHand);

    drawRune(
      c.x,
      c.y,
      110,
      1
    );
  }

  if (rightHand) {

    const c =
      handCenter(rightHand);

    drawRune(
      c.x,
      c.y,
      110,
      -1
    );
  }
}

/* =========================================================
   FLASH
========================================================= */

function drawFlash() {

  if (flash <= 0)
    return;

  ctx.save();

  ctx.globalAlpha =
    flash * .45;

  ctx.fillStyle =
    "#ffd39a";

  ctx.fillRect(
    0,
    0,
    width,
    height
  );

  ctx.restore();

  flash -= .035;
}

/* =========================================================
   HAND DETECTION
========================================================= */

function processHands(result) {

  leftHand = null;
  rightHand = null;

  if (
    !result.landmarks ||
    result.landmarks.length === 0
  ) {

    statusText.innerText =
      arcanaActive
        ? "SPATIAL INTERFACE ACTIVE"
        : "SEARCHING FOR HANDS";

    return;
  }

  statusText.innerText =
    `${result.landmarks.length} HAND${
      result.landmarks.length > 1
        ? "S"
        : ""
    } DETECTED`;

  result.landmarks.forEach(
    (landmarks, index) => {

      let label =
        result.handednesses?.[index]?.[0]
          ?.categoryName ||
        "Unknown";

      /*
      Because the video is mirrored,
      swap handedness labels for
      intuitive screen behavior.
      */

      label =
        label === "Left"
          ? "Right"
          : label === "Right"
          ? "Left"
          : label;

      if (label === "Left") {
        leftHand = landmarks;
      }

      if (label === "Right") {
        rightHand = landmarks;
      }

      const gesture =
        getGesture(landmarks);

      updateTrail(
        label,
        landmarks
      );

      drawHandHUD(
        label,
        landmarks,
        gesture
      );
    }
  );

  if (
    result.landmarks.length === 1 &&
    !arcanaActive
  ) {

    systemMessage.innerText =
      "SECOND HAND REQUIRED";
  }
}

/* =========================================================
   FPS
========================================================= */

function updateFPS() {

  frameCounter++;

  const now =
    performance.now();

  if (
    now - lastFrame >= 1000
  ) {

    fpsText.innerText =
      `FPS ${frameCounter}`;

    frameCounter = 0;
    lastFrame = now;
  }
}

/* =========================================================
   MAIN LOOP
========================================================= */

async function loop() {

  if (!running)
    return;

  ctx.clearRect(
    0,
    0,
    width,
    height
  );

  if (
    handLandmarker &&
    video.readyState >= 2
  ) {

    if (
      video.currentTime !==
      lastVideoTime
    ) {

      lastVideoTime =
        video.currentTime;

      const result =
        handLandmarker.detectForVideo(
          video,
          performance.now()
        );

      processHands(result);

      processSummoning();
    }
  }

  drawTrail("Left");
  drawTrail("Right");

  drawActivationProgress();

  drawActiveCore();

  updateParticles();

  drawFlash();

  updateFPS();

  requestAnimationFrame(loop);
}