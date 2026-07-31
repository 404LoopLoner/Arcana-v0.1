import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/vision_bundle.mjs";

/* ============================================================
   ARCANA SPATIAL OS — V0.5
   ============================================================

   FEATURES

   ✓ Webcam hand tracking
   ✓ Two-hand detection
   ✓ Circular summoning
   ✓ Energy fingertip trails
   ✓ Trails fade after 3 seconds
   ✓ Tracking-jump protection
   ✓ RIGHT HAND volume controller
   ✓ Pinch + wrist rotation volume
   ✓ LEFT HAND peace sign opens portal
   ✓ Portal application launcher
   ✓ Right index selects application
   ✓ Right pinch launches application
   ✓ Orange Arcana HUD
   ✓ Particles / runes / portal effects

============================================================ */


/* ============================================================
   DOM
============================================================ */

const startButton =
  document.getElementById("startButton");

const bootScreen =
  document.getElementById("bootScreen");

const interfaceScreen =
  document.getElementById("interface");

const video =
  document.getElementById("camera");

const canvas =
  document.getElementById("canvas");

const ctx =
  canvas.getContext("2d");

const statusText =
  document.getElementById("status");

const systemMessage =
  document.getElementById("systemMessage");

const fpsText =
  document.getElementById("fps");


/* ============================================================
   CANVAS / CAMERA
============================================================ */

let width = innerWidth;
let height = innerHeight;

let handLandmarker = null;

let running = false;

let lastVideoTime = -1;


/* ============================================================
   PERFORMANCE
============================================================ */

let lastFrame =
  performance.now();

let frameCounter = 0;


/* ============================================================
   HANDS
============================================================ */

let leftHand = null;
let rightHand = null;


/* ============================================================
   ARCANA STATE
============================================================ */

let arcanaActive = false;

let summonFlash = 0;

let masterRotation = 0;

let runePulse = 0;


/* ============================================================
   TRAILS
============================================================ */

const TRAIL_LIFETIME = 3000;

const MAX_TRAIL_DISTANCE = 95;

const trails = {
  Left: [],
  Right: []
};


/* ============================================================
   CIRCLE SUMMONING
============================================================ */

const circleHistory = {
  Left: [],
  Right: []
};

const circleProgress = {
  Left: 0,
  Right: 0
};

const circleCompleted = {
  Left: false,
  Right: false
};

const MAX_CIRCLE_HISTORY = 70;


/* ============================================================
   PARTICLES
============================================================ */

let particles = [];


/* ============================================================
   VOLUME
============================================================ */

let volume = 65;

let previousVolumeAngle = null;

let smoothedVolumeAngle = null;

let volumeChanging = false;

let lastVolumeChange = 0;

const VOLUME_SENSITIVITY = 1.0;


/* ============================================================
   PORTAL
============================================================ */

let portalOpen = false;

let portalProgress = 0;

let portalHoldStart = null;

let portalRotation = 0;

let portalSelected = -1;

let pinchWasDown = false;

let portalCloseHold = null;

const PORTAL_HOLD_TIME = 700;


/* ============================================================
   APPLICATIONS
============================================================ */

const portalApps = [

  {
    name: "GITHUB",
    icon: "GH",
    url: "https://github.com/"
  },

  {
    name: "YOUTUBE",
    icon: "YT",
    url: "https://www.youtube.com/"
  },

  {
    name: "SPOTIFY",
    icon: "SP",
    url: "https://open.spotify.com/"
  },

  {
    name: "GOOGLE",
    icon: "G",
    url: "https://www.google.com/"
  },

  {
    name: "CHATGPT",
    icon: "AI",
    url: "https://chatgpt.com/"
  },

  {
    name: "VS CODE",
    icon: "</>",
    url: "https://vscode.dev/"
  }

];


/* ============================================================
   START
============================================================ */

startButton.addEventListener(
  "click",
  async () => {

    startButton.innerText =
      "LOADING ARCANA VISION...";

    try {

      await initializeVision();

      startButton.innerText =
        "REQUESTING CAMERA...";

      const stream =
        await navigator.mediaDevices.getUserMedia({

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

      bootScreen.classList.add(
        "hidden"
      );

      interfaceScreen.classList.remove(
        "hidden"
      );

      resizeCanvas();

      running = true;

      systemMessage.innerText =
        "VISION CORE ONLINE";

      setTimeout(() => {

        if (!arcanaActive) {

          systemMessage.innerText =
            "DRAW CIRCLES WITH BOTH INDEX FINGERS";

        }

      }, 1500);

      requestAnimationFrame(loop);

    }

    catch (error) {

      console.error(error);

      startButton.innerText =
        "INITIALIZATION FAILED";

      alert(
        "ARCANA failed to initialize.\n\nOpen DevTools → Console for details."
      );

    }

  }
);


/* ============================================================
   MEDIAPIPE
============================================================ */

async function initializeVision() {

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


/* ============================================================
   RESIZE
============================================================ */

function resizeCanvas() {

  width = innerWidth;
  height = innerHeight;

  canvas.width = width;
  canvas.height = height;

  clearTracking();

}

window.addEventListener(
  "resize",
  resizeCanvas
);


/* ============================================================
   COORDINATES
============================================================ */

function screenPoint(lm) {

  return {

    x:
      width -
      lm.x * width,

    y:
      lm.y * height

  };

}


/* ============================================================
   DISTANCE
============================================================ */

function distance(a, b) {

  return Math.hypot(

    a.x - b.x,

    a.y - b.y

  );

}


/* ============================================================
   HAND CENTER
============================================================ */

function handCenter(lm) {

  const ids =
    [0, 5, 9, 13, 17];

  let x = 0;
  let y = 0;

  for (const id of ids) {

    const p =
      screenPoint(lm[id]);

    x += p.x;
    y += p.y;

  }

  return {

    x:
      x / ids.length,

    y:
      y / ids.length

  };

}


/* ============================================================
   FINGER DETECTION
============================================================ */

function fingerExtended(
  lm,
  tip,
  pip
) {

  return (
    lm[tip].y <
    lm[pip].y
  );

}


/* ============================================================
   PINCH
============================================================ */

function isPinching(lm) {

  return (

    distance(
      lm[4],
      lm[8]
    ) < 0.055

  );

}


/* ============================================================
   PEACE SIGN
============================================================ */

function isPeaceSign(lm) {

  const index =
    fingerExtended(
      lm,
      8,
      6
    );

  const middle =
    fingerExtended(
      lm,
      12,
      10
    );

  const ring =
    fingerExtended(
      lm,
      16,
      14
    );

  const pinky =
    fingerExtended(
      lm,
      20,
      18
    );

  return (

    index &&
    middle &&
    !ring &&
    !pinky

  );

}


/* ============================================================
   OPEN PALM
============================================================ */

function isOpenPalm(lm) {

  let count = 0;

  if (
    fingerExtended(
      lm,
      8,
      6
    )
  )
    count++;

  if (
    fingerExtended(
      lm,
      12,
      10
    )
  )
    count++;

  if (
    fingerExtended(
      lm,
      16,
      14
    )
  )
    count++;

  if (
    fingerExtended(
      lm,
      20,
      18
    )
  )
    count++;

  return count >= 4;

}


/* ============================================================
   FIST
============================================================ */

function isFist(lm) {

  let count = 0;

  if (
    fingerExtended(
      lm,
      8,
      6
    )
  )
    count++;

  if (
    fingerExtended(
      lm,
      12,
      10
    )
  )
    count++;

  if (
    fingerExtended(
      lm,
      16,
      14
    )
  )
    count++;

  if (
    fingerExtended(
      lm,
      20,
      18
    )
  )
    count++;

  return count === 0;

}


/* ============================================================
   POINT GESTURE
============================================================ */

function isPointGesture(lm) {

  const index =
    fingerExtended(
      lm,
      8,
      6
    );

  const middle =
    fingerExtended(
      lm,
      12,
      10
    );

  const ring =
    fingerExtended(
      lm,
      16,
      14
    );

  const pinky =
    fingerExtended(
      lm,
      20,
      18
    );

  return (

    index &&
    !middle &&
    !ring &&
    !pinky

  );

}


/* ============================================================
   PARTICLE
============================================================ */

class Particle {

  constructor(
    x,
    y,
    mode = "blue"
  ) {

    this.x = x;
    this.y = y;

    this.vx =
      (Math.random() - 0.5) * 3;

    this.vy =
      (Math.random() - 0.5) * 3;

    this.life = 1;

    this.size =
      Math.random() * 3 + 1;

    this.mode = mode;

  }


  update() {

    this.x += this.vx;

    this.y += this.vy;

    this.life -= 0.035;

    this.size *= 0.97;

  }


  draw() {

    const orange =
      this.mode === "orange";

    ctx.save();

    ctx.globalAlpha =
      Math.max(
        0,
        this.life
      );

    ctx.beginPath();

    ctx.arc(
      this.x,
      this.y,
      this.size,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      orange
        ? "#ffd28a"
        : "#b9fbff";

    ctx.shadowColor =
      orange
        ? "#ff7700"
        : "#00eaff";

    ctx.shadowBlur = 18;

    ctx.fill();

    ctx.restore();

  }

}


/* ============================================================
   SPAWN PARTICLES
============================================================ */

function spawnParticles(
  x,
  y,
  count = 2,
  mode = "blue"
) {

  for (
    let i = 0;
    i < count;
    i++
  ) {

    particles.push(

      new Particle(
        x,
        y,
        mode
      )

    );

  }

}


/* ============================================================
   PARTICLE UPDATE
============================================================ */

function updateParticles() {

  for (
    let i =
      particles.length - 1;

    i >= 0;

    i--
  ) {

    particles[i].update();

    particles[i].draw();

    if (
      particles[i].life <= 0
    ) {

      particles.splice(
        i,
        1
      );

    }

  }


  /*
     Prevent memory buildup
  */

  if (
    particles.length > 700
  ) {

    particles.splice(
      0,
      particles.length - 700
    );

  }

}


/* ============================================================
   TRAIL UPDATE
============================================================ */

function updateTrail(
  label,
  lm
) {

  const point =
    screenPoint(lm[8]);

  const now =
    performance.now();

  const trail =
    trails[label];

  if (
    trail.length > 0
  ) {

    const previous =
      trail[
        trail.length - 1
      ];

    const jump =
      distance(
        point,
        previous
      );

    /*
       Tracking jumped.

       Clear the old line rather than
       drawing across the screen.
    */

    if (
      jump >
      MAX_TRAIL_DISTANCE
    ) {

      trail.length = 0;

    }

  }


  trail.push({

    x: point.x,

    y: point.y,

    created: now

  });


  /*
     Hard safety cap.
  */

  if (
    trail.length > 150
  ) {

    trail.shift();

  }


  spawnParticles(

    point.x,

    point.y,

    arcanaActive
      ? 2
      : 1,

    arcanaActive
      ? "orange"
      : "blue"

  );

}


/* ============================================================
   DRAW TRAIL
============================================================ */

function drawTrail(label) {

  const trail =
    trails[label];

  if (!trail)
    return;


  const now =
    performance.now();


  /*
     Remove everything older
     than 3 seconds.
  */

  while (

    trail.length > 0 &&

    now -
    trail[0].created >
    TRAIL_LIFETIME

  ) {

    trail.shift();

  }


  if (
    trail.length < 2
  )
    return;


  ctx.save();

  ctx.lineCap = "round";

  ctx.lineJoin = "round";


  for (
    let i = 1;
    i < trail.length;
    i++
  ) {

    const previous =
      trail[i - 1];

    const current =
      trail[i];


    /*
       Don't draw a MediaPipe jump.
    */

    if (

      distance(
        previous,
        current
      ) >
      MAX_TRAIL_DISTANCE

    )
      continue;


    const age =
      now -
      current.created;


    const life =
      Math.max(

        0,

        1 -
        age /
        TRAIL_LIFETIME

      );


    ctx.beginPath();


    ctx.moveTo(

      previous.x,

      previous.y

    );


    ctx.lineTo(

      current.x,

      current.y

    );


    ctx.strokeStyle =
      arcanaActive

        ? `rgba(255,125,0,${life * 0.75})`

        : `rgba(0,235,255,${life * 0.75})`;


    ctx.lineWidth =
      1 +
      life * 3;


    ctx.shadowColor =
      arcanaActive
        ? "#ff7900"
        : "#00eaff";


    ctx.shadowBlur =
      8 +
      life * 10;


    ctx.stroke();

  }


  ctx.restore();

}


/* ============================================================
   CIRCLE TRACKING
============================================================ */

function updateCircleTracking(
  label,
  lm
) {

  if (arcanaActive)
    return;


  /*
     Require index pointing gesture.

     Peace sign is also allowed because
     tracking can occasionally classify
     the middle finger incorrectly.
  */

  if (

    !isPointGesture(lm) &&
    !isPeaceSign(lm)

  ) {

    circleProgress[label] *= 0.97;

    return;

  }


  const p =
    screenPoint(lm[8]);


  const history =
    circleHistory[label];


  if (
    history.length > 0
  ) {

    const previous =
      history[
        history.length - 1
      ];


    const jump =
      distance(
        p,
        previous
      );


    if (
      jump >
      130
    ) {

      history.length = 0;

      circleProgress[label] = 0;

      return;

    }


    /*
       Ignore micro jitter.
    */

    if (
      jump < 3
    )
      return;

  }


  history.push(p);


  if (
    history.length >
    MAX_CIRCLE_HISTORY
  ) {

    history.shift();

  }


  analyzeCircle(
    label,
    history
  );

}


/* ============================================================
   CIRCLE ANALYSIS
============================================================ */

function analyzeCircle(
  label,
  points
) {

  if (
    points.length < 18
  ) {

    circleProgress[label] =
      points.length /
      18 *
      0.15;

    return;

  }


  let cx = 0;
  let cy = 0;


  for (
    const p of points
  ) {

    cx += p.x;

    cy += p.y;

  }


  cx /=
    points.length;

  cy /=
    points.length;


  let averageRadius = 0;


  for (
    const p of points
  ) {

    averageRadius +=
      distance(

        p,

        {
          x: cx,
          y: cy
        }

      );

  }


  averageRadius /=
    points.length;


  /*
     Reject tiny accidental loops.
  */

  if (
    averageRadius < 30
  ) {

    circleProgress[label] *= 0.9;

    return;

  }


  /*
     Reject giant movements.
  */

  if (
    averageRadius > 280
  ) {

    circleHistory[label].length = 0;

    circleProgress[label] = 0;

    return;

  }


  let totalAngle = 0;


  let previousAngle =
    Math.atan2(

      points[0].y - cy,

      points[0].x - cx

    );


  for (
    let i = 1;
    i < points.length;
    i++
  ) {

    const angle =
      Math.atan2(

        points[i].y - cy,

        points[i].x - cx

      );


    let delta =
      angle -
      previousAngle;


    while (
      delta >
      Math.PI
    )
      delta -=
        Math.PI * 2;


    while (
      delta <
      -Math.PI
    )
      delta +=
        Math.PI * 2;


    if (
      Math.abs(delta) <
      Math.PI / 2
    ) {

      totalAngle += delta;

    }


    previousAngle =
      angle;

  }


  const revolution =
    Math.abs(
      totalAngle
    ) /
    (
      Math.PI * 2
    );


  circleProgress[label] =
    Math.min(
      revolution,
      1
    );


  const start =
    points[0];

  const end =
    points[
      points.length - 1
    ];


  const closure =
    distance(
      start,
      end
    );


  if (

    revolution >= 0.78 &&

    closure <
    averageRadius * 1.35

  ) {

    completeCircle(
      label,
      cx,
      cy
    );

  }

}


/* ============================================================
   CIRCLE COMPLETE
============================================================ */

function completeCircle(
  label,
  x,
  y
) {

  if (
    circleCompleted[label]
  )
    return;


  circleCompleted[label] = true;

  circleProgress[label] = 1;


  spawnParticles(

    x,

    y,

    60,

    "orange"

  );


  if (

    circleCompleted.Left &&

    circleCompleted.Right

  ) {

    activateArcana();

  }

  else {

    systemMessage.innerText =

      `${label.toUpperCase()} ARC LOCKED // SUMMON OTHER HAND`;

  }

}


/* ============================================================
   CIRCLE PROGRESS HUD
============================================================ */

function drawCircleProgress(
  label,
  lm
) {

  if (
    arcanaActive ||
    !lm
  )
    return;


  const center =
    handCenter(lm);


  const progress =
    circleProgress[label];


  ctx.save();


  ctx.lineWidth = 3;


  ctx.strokeStyle =
    "rgba(0,230,255,.15)";


  ctx.beginPath();


  ctx.arc(

    center.x,

    center.y,

    82,

    0,

    Math.PI * 2

  );


  ctx.stroke();


  ctx.strokeStyle =
    circleCompleted[label]
      ? "#ff9b28"
      : "#70f6ff";


  ctx.shadowColor =
    circleCompleted[label]
      ? "#ff7200"
      : "#00eaff";


  ctx.shadowBlur = 20;


  ctx.beginPath();


  ctx.arc(

    center.x,

    center.y,

    82,

    -Math.PI / 2,

    -Math.PI / 2 +
    progress *
    Math.PI *
    2

  );


  ctx.stroke();


  ctx.textAlign = "center";


  ctx.font =
    "bold 11px Arial";


  ctx.fillStyle =
    circleCompleted[label]
      ? "#ffc06b"
      : "#8ffaff";


  ctx.fillText(

    circleCompleted[label]

      ? `${label.toUpperCase()} ARC LOCKED`

      : `${label.toUpperCase()} ${Math.round(progress * 100)}%`,

    center.x,

    center.y + 110

  );


  ctx.restore();

}


/* ============================================================
   ACTIVATE ARCANA
============================================================ */

function activateArcana() {

  if (arcanaActive)
    return;


  arcanaActive = true;

  summonFlash = 1;


  statusText.innerText =
    "SPATIAL INTERFACE ACTIVE";


  systemMessage.innerText =
    "ARCANA CORE // SUMMONED";


  spawnParticles(

    width / 2,

    height / 2,

    120,

    "orange"

  );


  setTimeout(() => {

    if (
      arcanaActive &&
      !portalOpen
    ) {

      systemMessage.innerText =
        "RIGHT: AUDIO // LEFT ✌: PORTAL";

    }

  }, 1800);

}


/* ============================================================
   FINGER NODE
============================================================ */

function drawFingerNode(
  lm,
  active = false
) {

  const p =
    screenPoint(lm[8]);


  ctx.save();


  ctx.beginPath();


  ctx.arc(

    p.x,

    p.y,

    active ? 8 : 6,

    0,

    Math.PI * 2

  );


  ctx.fillStyle = "#ffffff";


  ctx.shadowColor =
    active
      ? "#ff7900"
      : "#00eaff";


  ctx.shadowBlur = 25;


  ctx.fill();


  ctx.beginPath();


  ctx.arc(

    p.x,

    p.y,

    active ? 18 : 14,

    0,

    Math.PI * 2

  );


  ctx.strokeStyle =
    active
      ? "rgba(255,145,30,.8)"
      : "rgba(0,235,255,.7)";


  ctx.lineWidth = 1;


  ctx.stroke();


  ctx.restore();

}


/* ============================================================
   ARCANE RING
============================================================ */

function drawArcaneRing(
  x,
  y,
  radius,
  direction = 1
) {

  ctx.save();


  ctx.translate(
    x,
    y
  );


  ctx.rotate(

    masterRotation *
    direction

  );


  ctx.strokeStyle =
    "rgba(255,140,25,.8)";


  ctx.shadowColor =
    "#ff7100";


  ctx.shadowBlur =
    15 +
    Math.sin(runePulse) * 5;


  ctx.lineWidth = 1.5;


  /*
     Outer ring
  */

  ctx.beginPath();


  ctx.arc(

    0,
    0,
    radius,
    0,
    Math.PI * 2

  );


  ctx.stroke();


  /*
     Inner ring
  */

  ctx.beginPath();


  ctx.arc(

    0,
    0,

    radius * 0.79,

    0,

    Math.PI * 2

  );


  ctx.stroke();


  /*
     Core ring
  */

  ctx.beginPath();


  ctx.arc(

    0,
    0,

    radius * 0.56,

    0,

    Math.PI * 2

  );


  ctx.stroke();


  /*
     Rune ticks
  */

  for (
    let i = 0;
    i < 32;
    i++
  ) {

    const angle =
      Math.PI *
      2 *
      i /
      32;


    const r1 =
      radius * 0.82;


    const r2 =
      radius *
      (
        i % 4 === 0
          ? 1.08
          : 0.97
      );


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


  /*
     Triangle 1
  */

  ctx.beginPath();


  for (
    let i = 0;
    i < 3;
    i++
  ) {

    const angle =

      -Math.PI / 2 +

      i *
      Math.PI *
      2 /
      3;


    const px =

      Math.cos(angle) *
      radius *
      0.58;


    const py =

      Math.sin(angle) *
      radius *
      0.58;


    if (
      i === 0
    )
      ctx.moveTo(
        px,
        py
      );

    else
      ctx.lineTo(
        px,
        py
      );

  }


  ctx.closePath();

  ctx.stroke();


  /*
     Triangle 2
  */

  ctx.rotate(
    Math.PI
  );


  ctx.beginPath();


  for (
    let i = 0;
    i < 3;
    i++
  ) {

    const angle =

      -Math.PI / 2 +

      i *
      Math.PI *
      2 /
      3;


    const px =

      Math.cos(angle) *
      radius *
      0.42;


    const py =

      Math.sin(angle) *
      radius *
      0.42;


    if (
      i === 0
    )
      ctx.moveTo(
        px,
        py
      );

    else
      ctx.lineTo(
        px,
        py
      );

  }


  ctx.closePath();

  ctx.stroke();


  ctx.restore();

}


/* ============================================================
   ANGLE NORMALIZATION
============================================================ */

function normalizeAngleDelta(
  delta
) {

  while (
    delta >
    Math.PI
  )
    delta -=
      Math.PI * 2;


  while (
    delta <
    -Math.PI
  )
    delta +=
      Math.PI * 2;


  return delta;

}


/* ============================================================
   PALM ROTATION
============================================================ */

function getPalmRotation(lm) {

  /*
     Index MCP = landmark 5
     Pinky MCP = landmark 17

     Measuring this line gives us
     palm/wrist rotation.
  */

  const indexBase =
    screenPoint(
      lm[5]
    );


  const pinkyBase =
    screenPoint(
      lm[17]
    );


  return Math.atan2(

    indexBase.y -
    pinkyBase.y,

    indexBase.x -
    pinkyBase.x

  );

}


/* ============================================================
   RIGHT HAND VOLUME
============================================================ */

function processVolumeHand(lm) {

  if (
    !arcanaActive ||
    portalOpen
  )
    return;


  const pinching =
    isPinching(lm);


  if (!pinching) {

    previousVolumeAngle = null;

    smoothedVolumeAngle = null;

    volumeChanging = false;

    return;

  }


  const rawAngle =
    getPalmRotation(lm);


  if (
    smoothedVolumeAngle === null
  ) {

    smoothedVolumeAngle =
      rawAngle;

  }

  else {

    let smoothingDelta =
      normalizeAngleDelta(

        rawAngle -
        smoothedVolumeAngle

      );


    smoothedVolumeAngle +=
      smoothingDelta *
      0.25;

  }


  if (
    previousVolumeAngle === null
  ) {

    previousVolumeAngle =
      smoothedVolumeAngle;

    return;

  }


  let delta =
    normalizeAngleDelta(

      smoothedVolumeAngle -
      previousVolumeAngle

    );


  /*
     Ignore hand tremor.
  */

  if (
    Math.abs(delta) <
    0.006
  )
    return;


  /*
     Reject tracking jumps.
  */

  if (
    Math.abs(delta) >
    0.35
  ) {

    previousVolumeAngle =
      smoothedVolumeAngle;

    return;

  }


  const degrees =

    delta *
    180 /
    Math.PI;


  /*
     Mirrored camera.

     Clockwise -> volume up
     Counterclockwise -> down.
  */

  volume -=

    degrees *
    VOLUME_SENSITIVITY;


  volume =
    Math.max(

      0,

      Math.min(
        100,
        volume
      )

    );


  previousVolumeAngle =
    smoothedVolumeAngle;


  volumeChanging = true;


  lastVolumeChange =
    performance.now();


  systemMessage.innerText =

    `RIGHT AUDIO ARC // ${Math.round(volume)}%`;

}


/* ============================================================
   VOLUME HUD
============================================================ */

function drawVolumeHUD(lm) {

  if (
    !lm ||
    portalOpen
  )
    return;


  if (

    performance.now() -
    lastVolumeChange >
    250

  ) {

    volumeChanging = false;

  }


  const center =
    handCenter(lm);


  const radius = 118;


  drawArcaneRing(

    center.x,

    center.y,

    radius,

    -1

  );


  const start =
    Math.PI * 0.75;


  const total =
    Math.PI * 1.5;


  const amount =
    volume / 100;


  ctx.save();


  ctx.lineCap = "round";


  /*
     Background meter
  */

  ctx.lineWidth = 8;


  ctx.strokeStyle =
    "rgba(255,120,0,.15)";


  ctx.beginPath();


  ctx.arc(

    center.x,

    center.y,

    radius + 20,

    start,

    start + total

  );


  ctx.stroke();


  /*
     Active volume
  */

  ctx.strokeStyle =
    "#ffad3d";


  ctx.shadowColor =
    "#ff7200";


  ctx.shadowBlur =
    volumeChanging
      ? 30
      : 16;


  ctx.beginPath();


  ctx.arc(

    center.x,

    center.y,

    radius + 20,

    start,

    start +
    total *
    amount

  );


  ctx.stroke();


  /*
     Dial knob
  */

  const knobAngle =

    start +
    total *
    amount;


  const knobX =

    center.x +

    Math.cos(knobAngle) *
    (radius + 20);


  const knobY =

    center.y +

    Math.sin(knobAngle) *
    (radius + 20);


  ctx.beginPath();


  ctx.arc(

    knobX,

    knobY,

    volumeChanging
      ? 9
      : 6,

    0,

    Math.PI * 2

  );


  ctx.fillStyle =
    "#ffffff";


  ctx.shadowBlur = 25;


  ctx.fill();


  /*
     Percentage
  */

  ctx.textAlign =
    "center";


  ctx.fillStyle =
    "#ffd29a";


  ctx.font =
    "bold 28px Arial";


  ctx.fillText(

    `${Math.round(volume)}%`,

    center.x,

    center.y + 5

  );


  ctx.font =
    "10px Arial";


  ctx.fillStyle =
    "#ffb65c";


  ctx.fillText(

    "RIGHT // AUDIO ARC",

    center.x,

    center.y + 30

  );


  ctx.fillText(

    isPinching(lm)

      ? "ROTATE WRIST ↺ ↻"

      : "PINCH TO ENGAGE",

    center.x,

    center.y + 49

  );


  /*
     Equalizer
  */

  for (
    let i = 0;
    i < 11;
    i++
  ) {

    const normalized =
      i / 10;


    const active =
      normalized <
      volume / 100;


    const wave =

      Math.sin(

        performance.now() *
        0.006 +
        i

      );


    const barHeight =

      8 +

      Math.abs(wave) *
      10 +

      volume /
      18;


    ctx.fillStyle =

      active

        ? "rgba(255,175,65,.9)"

        : "rgba(255,150,50,.12)";


    ctx.fillRect(

      center.x -
      52 +
      i * 10,

      center.y +
      82 -
      barHeight,

      4,

      barHeight

    );

  }


  ctx.restore();

}


/* ============================================================
   PORTAL ACTIVATION
============================================================ */

function processPortalGesture(lm) {

  if (
    !arcanaActive
  )
    return;


  /*
     Portal already open.

     Don't run opening gesture again.
  */

  if (portalOpen)
    return;


  if (
    isPeaceSign(lm)
  ) {

    if (
      portalHoldStart === null
    ) {

      portalHoldStart =
        performance.now();

    }


    const elapsed =

      performance.now() -
      portalHoldStart;


    portalProgress =
      Math.min(

        elapsed /
        PORTAL_HOLD_TIME,

        1

      );


    systemMessage.innerText =

      `PORTAL LINK ${Math.round(portalProgress * 100)}%`;


    if (
      portalProgress >= 1
    ) {

      openPortal();

    }

  }

  else {

    portalHoldStart = null;


    portalProgress =
      Math.max(

        0,

        portalProgress -
        0.08

      );

  }

}


/* ============================================================
   OPEN PORTAL
============================================================ */

function openPortal() {

  if (portalOpen)
    return;


  portalOpen = true;

  portalProgress = 1;

  portalSelected = -1;

  previousVolumeAngle = null;

  smoothedVolumeAngle = null;

  volumeChanging = false;

  summonFlash = 0.45;


  spawnParticles(

    width / 2,

    height / 2,

    120,

    "orange"

  );


  systemMessage.innerText =
    "ARCANA APPLICATION NEXUS // ONLINE";

}


/* ============================================================
   CLOSE PORTAL
============================================================ */

function closePortal() {

  portalOpen = false;

  portalProgress = 0;

  portalHoldStart = null;

  portalSelected = -1;

  pinchWasDown = false;


  spawnParticles(

    width / 2,

    height / 2,

    60,

    "orange"

  );


  systemMessage.innerText =
    "PORTAL CLOSED // AUDIO ARC RESTORED";

}


/* ============================================================
   PORTAL CLOSE GESTURE
============================================================ */

function processPortalCloseGesture() {

  if (
    !portalOpen ||
    !leftHand
  ) {

    portalCloseHold = null;

    return;

  }


  /*
     Left fist for about 0.7 sec
     closes portal.
  */

  if (
    isFist(leftHand)
  ) {

    if (
      portalCloseHold === null
    ) {

      portalCloseHold =
        performance.now();

    }


    const elapsed =

      performance.now() -
      portalCloseHold;


    if (
      elapsed > 700
    ) {

      closePortal();

      portalCloseHold = null;

    }

  }

  else {

    portalCloseHold = null;

  }

}


/* ============================================================
   PORTAL
============================================================ */

function drawPortal() {

  if (

    !portalOpen &&
    portalProgress <= 0

  )
    return;


  const cx =
    width / 2;


  const cy =
    height / 2;


  const openScale =
    portalOpen
      ? 1
      : portalProgress;


  const radius =

    Math.min(
      width,
      height
    ) *

    0.29 *

    openScale;


  if (
    radius < 10
  )
    return;


  portalRotation +=
    0.006;


  ctx.save();


  ctx.translate(
    cx,
    cy
  );


  /*
     Portal atmosphere
  */

  const gradient =

    ctx.createRadialGradient(

      0,
      0,
      radius * 0.1,

      0,
      0,
      radius * 1.4

    );


  gradient.addColorStop(

    0,

    "rgba(255,130,20,.08)"

  );


  gradient.addColorStop(

    0.55,

    "rgba(255,90,0,.04)"

  );


  gradient.addColorStop(

    1,

    "rgba(255,80,0,0)"

  );


  ctx.fillStyle =
    gradient;


  ctx.beginPath();


  ctx.arc(

    0,
    0,

    radius * 1.45,

    0,

    Math.PI * 2

  );


  ctx.fill();


  /*
     Rotating rune rings
  */

  for (
    let ring = 0;
    ring < 4;
    ring++
  ) {

    ctx.save();


    const direction =
      ring % 2 === 0
        ? 1
        : -1;


    ctx.rotate(

      portalRotation *
      direction *
      (ring + 1) *
      0.55

    );


    const r =

      radius *
      (
        1 -
        ring * 0.11
      );


    ctx.strokeStyle =

      `rgba(
        255,
        ${125 + ring * 18},
        30,
        ${0.85 - ring * 0.12}
      )`;


    ctx.shadowColor =
      "#ff6a00";


    ctx.shadowBlur = 20;


    ctx.lineWidth =
      ring === 0
        ? 3
        : 1;


    ctx.beginPath();


    ctx.arc(

      0,
      0,
      r,
      0,
      Math.PI * 2

    );


    ctx.stroke();


    const count =
      24 +
      ring * 8;


    for (
      let i = 0;
      i < count;
      i++
    ) {

      const angle =

        Math.PI *
        2 *
        i /
        count;


      const inner =
        r - 8;


      const outer =

        r +

        (
          i % 4 === 0
            ? 16
            : 6
        );


      ctx.beginPath();


      ctx.moveTo(

        Math.cos(angle) *
        inner,

        Math.sin(angle) *
        inner

      );


      ctx.lineTo(

        Math.cos(angle) *
        outer,

        Math.sin(angle) *
        outer

      );


      ctx.stroke();

    }


    ctx.restore();

  }


  /*
     Inner hexagon
  */

  ctx.save();


  ctx.rotate(

    -portalRotation *
    0.8

  );


  ctx.strokeStyle =
    "rgba(255,170,65,.45)";


  ctx.lineWidth = 1;


  ctx.beginPath();


  for (
    let i = 0;
    i < 6;
    i++
  ) {

    const angle =

      Math.PI *
      2 *
      i /
      6 -

      Math.PI / 2;


    const x =

      Math.cos(angle) *
      radius *
      0.48;


    const y =

      Math.sin(angle) *
      radius *
      0.48;


    if (
      i === 0
    )
      ctx.moveTo(
        x,
        y
      );

    else
      ctx.lineTo(
        x,
        y
      );

  }


  ctx.closePath();

  ctx.stroke();

  ctx.restore();


  ctx.restore();


  /*
     Apps
  */

  if (portalOpen) {

    drawPortalApps(

      cx,

      cy,

      radius

    );

  }

}


/* ============================================================
   PORTAL APPLICATIONS
============================================================ */

function drawPortalApps(
  cx,
  cy,
  radius
) {

  portalSelected = -1;


  let pointer = null;


  /*
     RIGHT INDEX FINGER = pointer
  */

  if (rightHand) {

    pointer =
      screenPoint(
        rightHand[8]
      );

  }


  const orbitRadius =
    radius * 0.70;


  for (
    let i = 0;
    i < portalApps.length;
    i++
  ) {

    const app =
      portalApps[i];


    /*
       Keep icons mostly stable.

       Only slight orbit movement.
    */

    const angle =

      portalRotation *
      0.08 +

      Math.PI *
      2 *
      i /
      portalApps.length -

      Math.PI / 2;


    const x =

      cx +

      Math.cos(angle) *
      orbitRadius;


    const y =

      cy +

      Math.sin(angle) *
      orbitRadius;


    const hover =

      pointer &&

      distance(

        pointer,

        {
          x,
          y
        }

      ) < 52;


    if (hover) {

      portalSelected = i;

    }


    /*
       Connector
    */

    ctx.save();


    ctx.strokeStyle =

      hover

        ? "rgba(255,200,100,.65)"

        : "rgba(255,130,20,.12)";


    ctx.lineWidth = 1;


    ctx.beginPath();


    ctx.moveTo(
      cx,
      cy
    );


    ctx.lineTo(
      x,
      y
    );


    ctx.stroke();


    /*
       App orb
    */

    ctx.beginPath();


    ctx.arc(

      x,
      y,

      hover
        ? 40
        : 31,

      0,

      Math.PI * 2

    );


    ctx.fillStyle =

      hover

        ? "rgba(255,120,0,.28)"

        : "rgba(5,10,15,.75)";


    ctx.fill();


    ctx.strokeStyle =

      hover

        ? "#ffe0a0"

        : "#ff942e";


    ctx.shadowColor =
      "#ff6a00";


    ctx.shadowBlur =

      hover
        ? 32
        : 14;


    ctx.lineWidth =

      hover
        ? 2
        : 1;


    ctx.stroke();


    /*
       Icon
    */

    ctx.textAlign =
      "center";


    ctx.textBaseline =
      "middle";


    ctx.fillStyle =

      hover
        ? "#ffffff"
        : "#ffc16c";


    ctx.font =

      hover

        ? "bold 15px Arial"

        : "bold 12px Arial";


    ctx.fillText(

      app.icon,

      x,

      y

    );


    /*
       Name
    */

    ctx.font =
      "9px Arial";


    ctx.fillStyle =
      "#ffc16c";


    ctx.fillText(

      app.name,

      x,

      y + 52

    );


    ctx.restore();

  }


  /*
     Central title
  */

  ctx.save();


  ctx.textAlign =
    "center";


  ctx.fillStyle =
    "#ffd18b";


  ctx.shadowColor =
    "#ff7200";


  ctx.shadowBlur = 16;


  ctx.font =
    "bold 13px Arial";


  ctx.fillText(

    "ARCANA // APPLICATION NEXUS",

    cx,

    cy - 10

  );


  ctx.font =
    "9px Arial";


  ctx.fillText(

    portalSelected >= 0

      ? `${portalApps[portalSelected].name} // PINCH TO OPEN`

      : "RIGHT INDEX // SELECT",

    cx,

    cy + 14

  );


  ctx.fillText(

    "LEFT FIST // CLOSE PORTAL",

    cx,

    cy + 34

  );


  ctx.restore();


  /*
     Draw pointer last
  */

  if (pointer) {

    ctx.save();


    ctx.beginPath();


    ctx.arc(

      pointer.x,

      pointer.y,

      11,

      0,

      Math.PI * 2

    );


    ctx.strokeStyle =
      "#fff2d0";


    ctx.shadowColor =
      "#ff7900";


    ctx.shadowBlur = 25;


    ctx.lineWidth = 2;


    ctx.stroke();


    ctx.restore();

  }


  processPortalSelection();

}


/* ============================================================
   PORTAL SELECTION
============================================================ */

function processPortalSelection() {

  if (
    !portalOpen ||
    !rightHand
  ) {

    pinchWasDown = false;

    return;

  }


  const pinch =
    isPinching(
      rightHand
    );


  /*
     Rising-edge detection.

     Prevents opening 20 tabs while
     fingers remain pinched.
  */

  if (

    pinch &&

    !pinchWasDown &&

    portalSelected >= 0

  ) {

    const app =

      portalApps[
        portalSelected
      ];


    systemMessage.innerText =

      `OPENING ${app.name}`;


    spawnParticles(

      width / 2,

      height / 2,

      55,

      "orange"

    );


    /*
       Browsers can block gesture-created
       popup windows because this isn't a
       conventional mouse click.

       If allowed, this opens the app.
    */

    const opened =
      window.open(

        app.url,

        "_blank"

      );


    if (!opened) {

      systemMessage.innerText =

        `${app.name} READY // BROWSER BLOCKED POPUP`;

    }

  }


  pinchWasDown =
    pinch;

}


/* ============================================================
   SUMMONING CONNECTION
============================================================ */

function drawSummoningConnection() {

  if (

    arcanaActive ||

    !leftHand ||

    !rightHand

  )
    return;


  const left =
    screenPoint(
      leftHand[8]
    );


  const right =
    screenPoint(
      rightHand[8]
    );


  ctx.save();


  const gradient =

    ctx.createLinearGradient(

      left.x,
      left.y,

      right.x,
      right.y

    );


  gradient.addColorStop(

    0,

    "rgba(0,235,255,.08)"

  );


  gradient.addColorStop(

    0.5,

    "rgba(120,250,255,.5)"

  );


  gradient.addColorStop(

    1,

    "rgba(0,235,255,.08)"

  );


  ctx.strokeStyle =
    gradient;


  ctx.lineWidth = 1;


  ctx.shadowColor =
    "#00eaff";


  ctx.shadowBlur = 10;


  ctx.beginPath();


  ctx.moveTo(

    left.x,

    left.y

  );


  ctx.lineTo(

    right.x,

    right.y

  );


  ctx.stroke();


  ctx.restore();

}


/* ============================================================
   HAND PROCESSING
============================================================ */

function processHands(result) {

  leftHand = null;
  rightHand = null;


  if (

    !result.landmarks ||

    result.landmarks.length === 0

  ) {

    statusText.innerText =

      arcanaActive

        ? "SPATIAL CORE // STANDBY"

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

    (
      landmarks,
      index
    ) => {

      let label =

        result
          .handednesses?.[index]?.[0]
          ?.categoryName ||

        "Unknown";


      /*
         Mirror correction.
      */

      label =

        label === "Left"

          ? "Right"

          : label === "Right"

            ? "Left"

            : label;


      if (

        label !== "Left" &&

        label !== "Right"

      )
        return;


      if (
        label === "Left"
      ) {

        leftHand =
          landmarks;

      }


      if (
        label === "Right"
      ) {

        rightHand =
          landmarks;

      }


      updateTrail(

        label,

        landmarks

      );


      if (
        !arcanaActive
      ) {

        updateCircleTracking(

          label,

          landmarks

        );

      }


      drawFingerNode(

        landmarks,

        arcanaActive

      );

    }

  );


  /*
     LOCKED MODE
  */

  if (!arcanaActive) {

    if (

      leftHand &&

      rightHand

    ) {

      systemMessage.innerText =

        `CIRCLE BOTH INDEX FINGERS // L ${Math.round(circleProgress.Left * 100)}% // R ${Math.round(circleProgress.Right * 100)}%`;

    }

    else {

      systemMessage.innerText =
        "PRESENT BOTH HANDS";

    }

    return;

  }


  /*
     ARCANA ACTIVE
  */


  /*
     LEFT HAND
     Peace sign -> Portal
  */

  if (leftHand) {

    processPortalGesture(
      leftHand
    );

  }


  /*
     RIGHT HAND
     Pinch + rotate -> Volume

     Only when portal is closed.
  */

  if (
    rightHand &&
    !portalOpen
  ) {

    processVolumeHand(
      rightHand
    );

  }


  /*
     Portal closing
  */

  processPortalCloseGesture();

}


/* ============================================================
   CENTRAL CORE
============================================================ */

function drawCentralCore() {

  if (!arcanaActive)
    return;


  const x =
    width / 2;


  const y = 100;


  ctx.save();


  ctx.textAlign =
    "center";


  ctx.fillStyle =
    "#ffc46d";


  ctx.shadowColor =
    "#ff7200";


  ctx.shadowBlur = 15;


  ctx.font =
    "bold 11px Arial";


  ctx.fillText(

    "A R C A N A   //   S P A T I A L   C O R E",

    x,

    y

  );


  ctx.font =
    "9px Arial";


  ctx.fillText(

    portalOpen

      ? "APPLICATION NEXUS ACTIVE"

      : "RIGHT AUDIO ARC // LEFT PORTAL COMMAND",

    x,

    y + 20

  );


  ctx.restore();

}


/* ============================================================
   ACTIVATION FLASH
============================================================ */

function drawFlash() {

  if (
    summonFlash <= 0
  )
    return;


  ctx.save();


  ctx.globalAlpha =

    summonFlash *
    0.45;


  ctx.fillStyle =
    "#ffd39a";


  ctx.fillRect(

    0,

    0,

    width,

    height

  );


  ctx.restore();


  summonFlash -=
    0.035;

}


/* ============================================================
   FPS
============================================================ */

function updateFPS() {

  frameCounter++;


  const now =
    performance.now();


  if (

    now -
    lastFrame >=
    1000

  ) {

    fpsText.innerText =

      `FPS ${frameCounter}`;


    frameCounter = 0;


    lastFrame = now;

  }

}


/* ============================================================
   CLEAR TRACKING
============================================================ */

function clearTracking() {

  trails.Left.length = 0;

  trails.Right.length = 0;


  circleHistory.Left.length = 0;

  circleHistory.Right.length = 0;

}


/* ============================================================
   MAIN LOOP
============================================================ */

async function loop() {

  if (!running)
    return;


  ctx.clearRect(

    0,

    0,

    width,

    height

  );


  masterRotation +=
    0.006;


  runePulse +=
    0.06;


  /*
     MediaPipe detection
  */

  if (

    handLandmarker &&

    video.readyState >= 2 &&

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


    processHands(
      result
    );

  }


  /*
     Trails
  */

  drawTrail(
    "Left"
  );


  drawTrail(
    "Right"
  );


  /*
     BEFORE SUMMON
  */

  if (!arcanaActive) {

    drawSummoningConnection();


    drawCircleProgress(

      "Left",

      leftHand

    );


    drawCircleProgress(

      "Right",

      rightHand

    );

  }


  /*
     AFTER SUMMON
  */

  else {

    /*
       Volume ring only exists
       when portal isn't active.
    */

    if (

      rightHand &&

      !portalOpen

    ) {

      drawVolumeHUD(
        rightHand
      );

    }


    /*
       Portal
    */

    drawPortal();


    /*
       Top system HUD
    */

    drawCentralCore();

  }


  /*
     Particles
  */

  updateParticles();


  /*
     Flash effects
  */

  drawFlash();


  /*
     FPS
  */

  updateFPS();


  requestAnimationFrame(
    loop
  );

}


/* ============================================================
   CONSOLE
============================================================ */

console.log(
  "%c ARCANA SPATIAL OS // V0.5 ",
  "background:#120600;color:#ffb347;font-size:18px;padding:10px"
);

console.log(
  "Dual Arc Core Ready"
);

console.log(
  "RIGHT: Pinch + wrist rotation = Audio Arc"
);

console.log(
  "LEFT: Peace sign = Application Portal"
);