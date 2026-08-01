/*
============================================================

 ARCANA SPATIAL OS
 Version 1.0

 Doctor Strange × Tony Stark

============================================================
*/

import { Hands } from "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js";
import { Camera } from "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";
import { drawConnectors, drawLandmarks } from "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js";

import DesktopBridge from "./js/desktopBridge.js";

import Portal from "./js/portal.js";
import ArcCore from "./js/arcCore.js";

import ParticleManager from "./js/vfx/ParticleManager.js";



/*==========================================================

CONFIGURATION

==========================================================*/

const CONFIG = {

    DEBUG: true,

    FPS: 60,

    PORTAL_RADIUS: 240,

    ARC_RADIUS: 135,

    PORTAL_HOLD_TIME: 0.8,

    APP_HOVER_TIME: 0.8,

    TRAIL_FADE: 3,

    PINCH_THRESHOLD: 0.05,

    FIST_THRESHOLD: 0.22,

    HAND_TIMEOUT: 1000

};



/*==========================================================

GLOBAL STATE

==========================================================*/

const STATE = {

    initialized: false,

    leftHand: null,

    rightHand: null,

    lastHandsSeen: 0,

    deltaTime: 0,

    lastFrame: performance.now(),

    fps: 0,

    frameCount: 0,

    elapsed: 0

};



/*==========================================================

GESTURE STATE

==========================================================*/

const GESTURE = {

    leftPinch: false,

    rightPinch: false,

    leftFist: false,

    rightFist: false,

    leftOpen: false,

    rightOpen: false,

    summonPortal: false,

    launchGesture: false,

    wristRotation: 0

};



/*==========================================================

PORTAL STATE

==========================================================*/

const PORTAL = {

    active: false,

    opening: false,

    closing: false,

    progress: 0,

    hoverIndex: -1,

    launchProgress: 0

};



/*==========================================================

ARC CORE STATE

==========================================================*/

const ARC = {

    visible: false,

    mode: "VOLUME",

    value: 50,

    rotation: 0,

    cooldown: false

};



/*==========================================================

CANVAS

==========================================================*/

const video = document.getElementById("video");

const canvas = document.getElementById("output");

const ctx = canvas.getContext("2d");



/*==========================================================

MODULES

==========================================================*/

const portal = new Portal();

const arcCore = new ArcCore();

const particles = new ParticleManager();

const bridge = DesktopBridge;



/*==========================================================

APPLICATIONS

==========================================================*/

const APPS = [

    {

        name: "YouTube",

        command: "youtube",

        icon: "▶"

    },

    {

        name: "ChatGPT",

        command: "chatgpt",

        icon: "✦"

    },

    {

        name: "GitHub",

        command: "github",

        icon: "⌘"

    },

    {

        name: "VSCode",

        command: "vscode",

        icon: "⌂"

    },

    {

        name: "Spotify",

        command: "spotify",

        icon: "♫"

    },

    {

        name: "Chrome",

        command: "chrome",

        icon: "◎"

    },

    {

        name: "Discord",

        command: "discord",

        icon: "◈"

    },

    {

        name: "Explorer",

        command: "explorer",

        icon: "▣"

    }

];



/*==========================================================

INITIALIZATION

==========================================================*/

async function initializeARCANA() {

    console.log("");

    console.log("===================================");

    console.log(" ARCANA SPATIAL OS ");

    console.log("===================================");

    console.log("");

    console.log("Initializing Camera...");

    console.log("Initializing Portal Engine...");

    console.log("Initializing ARC Core...");

    console.log("Initializing Particle Engine...");

    console.log("Connecting Desktop Core...");



    bridge.on("connected", () => {

        console.log("Desktop Core Connected");

    });



    bridge.on("disconnected", () => {

        console.log("Desktop Core Disconnected");

    });



    STATE.initialized = true;

}
/*==========================================================

MEDIAPIPE HANDS

==========================================================*/

const hands = new Hands({

    locateFile: (file) => {

        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;

    }

});

hands.setOptions({

    maxNumHands: 2,

    modelComplexity: 1,

    minDetectionConfidence: 0.8,

    minTrackingConfidence: 0.7

});

hands.onResults(onResults);



/*==========================================================

CAMERA

==========================================================*/

const camera = new Camera(video, {

    onFrame: async () => {

        await hands.send({

            image: video

        });

    },

    width: 1280,

    height: 720

});



/*==========================================================

HAND DATA

==========================================================*/

let leftHand = null;
let rightHand = null;

let previousLeft = null;
let previousRight = null;



/*==========================================================

HAND SMOOTHING

==========================================================*/

const SMOOTHING = 0.45;



function smoothPoint(previous, current){

    if(!previous)

        return current;

    return{

        x: previous.x*(1-SMOOTHING)+current.x*SMOOTHING,

        y: previous.y*(1-SMOOTHING)+current.y*SMOOTHING,

        z: previous.z*(1-SMOOTHING)+current.z*SMOOTHING

    };

}



function smoothLandmarks(previous,current){

    if(!previous)

        return current;

    return current.map((point,index)=>{

        return smoothPoint(

            previous[index],

            point

        );

    });

}



/*==========================================================

HAND CLASSIFICATION

==========================================================*/

function classifyHands(results){

    leftHand=null;

    rightHand=null;

    if(!results.multiHandLandmarks)

        return;

    results.multiHandLandmarks.forEach((landmarks,index)=>{

        const handedness=

        results.multiHandedness[index]

        .label;

        if(handedness==="Left"){

            leftHand=smoothLandmarks(

                previousLeft,

                landmarks

            );

            previousLeft=leftHand;

        }

        else{

            rightHand=smoothLandmarks(

                previousRight,

                landmarks

            );

            previousRight=rightHand;

        }

    });

}



/*==========================================================

FPS

==========================================================*/

function updateFPS(){

    const now=performance.now();

    STATE.deltaTime=(

        now-

        STATE.lastFrame

    )/1000;

    STATE.lastFrame=now;

    STATE.frameCount++;

    STATE.elapsed+=STATE.deltaTime;

    if(STATE.elapsed>=1){

        STATE.fps=STATE.frameCount;

        STATE.frameCount=0;

        STATE.elapsed=0;

    }

}



/*==========================================================

CANVAS

==========================================================*/

function resizeCanvas(){

    canvas.width=window.innerWidth;

    canvas.height=window.innerHeight;

}

resizeCanvas();

window.addEventListener(

    "resize",

    resizeCanvas

);



/*==========================================================

DRAW CAMERA

==========================================================*/

function drawCamera(){

    ctx.drawImage(

        video,

        0,

        0,

        canvas.width,

        canvas.height

    );

}



/*==========================================================

DRAW LANDMARKS

==========================================================*/

function drawHands(){

    ctx.save();

    ctx.lineWidth=2;

    if(leftHand){

        drawConnectors(

            ctx,

            leftHand,

            HAND_CONNECTIONS,

            {

                color:"#ff9900",

                lineWidth:3

            }

        );

        drawLandmarks(

            ctx,

            leftHand,

            {

                color:"#ffffff",

                radius:4

            }

        );

    }

    if(rightHand){

        drawConnectors(

            ctx,

            rightHand,

            HAND_CONNECTIONS,

            {

                color:"#00d5ff",

                lineWidth:3

            }

        );

        drawLandmarks(

            ctx,

            rightHand,

            {

                color:"#ffffff",

                radius:4

            }

        );

    }

    ctx.restore();

}



/*==========================================================

MEDIAPIPE CALLBACK

==========================================================*/

function onResults(results){

    updateFPS();

    classifyHands(results);

    STATE.leftHand=leftHand;

    STATE.rightHand=rightHand;

    STATE.lastHandsSeen=performance.now();

}
/*==========================================================

GESTURE UTILITIES

==========================================================*/

function distance(a, b) {

    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);

}

function midpoint(a, b) {

    return {

        x: (a.x + b.x) * 0.5,
        y: (a.y + b.y) * 0.5,
        z: (a.z + b.z) * 0.5

    };

}



/*==========================================================

PINCH DETECTION

==========================================================*/

function isPinching(hand) {

    if (!hand) return false;

    return distance(

        hand[4],

        hand[8]

    ) < CONFIG.PINCH_THRESHOLD;

}



/*==========================================================

FIST DETECTION

==========================================================*/

function isFist(hand) {

    if (!hand) return false;

    const fingers = [

        distance(hand[8], hand[5]),

        distance(hand[12], hand[9]),

        distance(hand[16], hand[13]),

        distance(hand[20], hand[17])

    ];

    return fingers.every(

        d => d < CONFIG.FIST_THRESHOLD

    );

}



/*==========================================================

OPEN PALM

==========================================================*/

function isOpenPalm(hand) {

    if (!hand) return false;

    const fingers = [

        distance(hand[8], hand[5]),

        distance(hand[12], hand[9]),

        distance(hand[16], hand[13]),

        distance(hand[20], hand[17])

    ];

    return fingers.every(

        d => d > 0.10

    );

}



/*==========================================================

WRIST ROTATION

==========================================================*/

function wristAngle(hand){

    if(!hand)

        return 0;

    const wrist = hand[0];

    const index = hand[5];

    return Math.atan2(

        index.y - wrist.y,

        index.x - wrist.x

    ) * 180 / Math.PI;

}



/*==========================================================

FORWARD PUSH

==========================================================*/

function forwardPush(hand){

    if(!hand)

        return false;

    return hand[8].z < -0.12;

}



/*==========================================================

TWO HAND DISTANCE

==========================================================*/

function handDistance(){

    if(!leftHand || !rightHand)

        return 0;

    return distance(

        leftHand[0],

        rightHand[0]

    );

}



/*==========================================================

DOCTOR STRANGE SUMMON

Both hands pinching while apart.

==========================================================*/

function detectPortalGesture(){

    if(!leftHand || !rightHand)

        return false;

    return (

        isPinching(leftHand) &&

        isPinching(rightHand) &&

        handDistance() > 0.35

    );

}



/*==========================================================

UPDATE GESTURES

==========================================================*/

function updateGestures(){

    GESTURE.leftPinch = isPinching(leftHand);

    GESTURE.rightPinch = isPinching(rightHand);

    GESTURE.leftFist = isFist(leftHand);

    GESTURE.rightFist = isFist(rightHand);

    GESTURE.leftOpen = isOpenPalm(leftHand);

    GESTURE.rightOpen = isOpenPalm(rightHand);

    GESTURE.wristRotation =

        wristAngle(rightHand);

    GESTURE.summonPortal =

        detectPortalGesture();

    GESTURE.launchGesture =

        forwardPush(rightHand);

}



/*==========================================================

GESTURE ACTIONS

==========================================================*/

function processGestures(){

    updateGestures();

    //----------------------------------------------------
    // PORTAL
    //----------------------------------------------------

    if(

        GESTURE.summonPortal &&

        !PORTAL.active

    ){

        portal.follow(

            canvas.width * 0.25,

            canvas.height * 0.55

        );

        portal.summon();

        PORTAL.active = true;

    }

    //----------------------------------------------------
    // CLOSE PORTAL
    //----------------------------------------------------

    if(

        GESTURE.leftFist &&

        PORTAL.active

    ){

        portal.close();

        PORTAL.active = false;

    }

    //----------------------------------------------------
    // ARC CORE
    //----------------------------------------------------

    if(GESTURE.rightOpen){

        ARC.visible = true;

        arcCore.show();

    }

    else{

        ARC.visible = false;

        arcCore.hide();

    }

    //----------------------------------------------------
    // ROTATE ARC CORE
    //----------------------------------------------------

    arcCore.follow(

        canvas.width * 0.75,

        canvas.height * 0.55

    );

    arcCore.setRotation(

        GESTURE.wristRotation

    );

}
/*==========================================================

PORTAL ENGINE

==========================================================*/

function updatePortal() {

    if (!leftHand)
        return;

    //--------------------------------------------------
    // Follow Left Palm
    //--------------------------------------------------

    const palm = leftHand[0];

    const x = palm.x * canvas.width;

    const y = palm.y * canvas.height;

    portal.follow(x, y);

    //--------------------------------------------------
    // Update
    //--------------------------------------------------

    portal.update(STATE.deltaTime);

}



/*==========================================================

PORTAL APP HOVER

==========================================================*/

function updatePortalHover() {

    if (!portal.visible)
        return;

    if (!rightHand)
        return;

    const finger = rightHand[8];

    const px = finger.x * canvas.width;

    const py = finger.y * canvas.height;

    let hovered = -1;

    let bestDistance = 999999;

    portal.apps.forEach((app, index) => {

        const angle =
            app.angle * Math.PI / 180 +
            portal.rotation;

        const orbit =
            portal.innerRadius - 40;

        const ax =
            portal.x +
            Math.cos(angle) * orbit;

        const ay =
            portal.y +
            Math.sin(angle) * orbit;

        const dx = px - ax;

        const dy = py - ay;

        const d = Math.sqrt(dx * dx + dy * dy);

        if (d < 40 && d < bestDistance) {

            hovered = index;

            bestDistance = d;

        }

    });

    portal.selected = hovered;

}
/*==========================================================

PORTAL LAUNCH

==========================================================*/

function updatePortalLaunch() {

    if (!portal.visible)
        return;

    if (portal.selected < 0)
        return;

    if (!GESTURE.launchGesture)
        return;

    const app = APPS[portal.selected];

    console.log(

        "Launching",

        app.command

    );

    bridge.openApp(

        app.command

    );

    portal.state = 5;

}
/*==========================================================

DRAW PORTAL

==========================================================*/

function drawPortal() {

    if (!portal.visible)
        return;

    portal.draw(ctx);

}
/*==========================================================

PORTAL PARTICLES

==========================================================*/

function updatePortalParticles() {

    if (!portal.visible)
        return;

    for (let i = 0; i < 6; i++) {

        const angle =
            Math.random() *
            Math.PI * 2;

        const r =
            portal.radius;

        const x =
            portal.x +
            Math.cos(angle) * r;

        const y =
            portal.y +
            Math.sin(angle) * r;

        particles.spark.emit(

            x,

            y

        );

    }

}
/*==========================================================

PORTAL LOOP

==========================================================*/

function portalLoop(){

    updatePortal();

    updatePortalHover();

    updatePortalLaunch();

    updatePortalParticles();

}
/*==========================================================

ARC CORE ENGINE

==========================================================*/

function updateArcCore() {

    if (!rightHand) {

        arcCore.hide();

        return;

    }

    //--------------------------------------------------
    // Follow Right Palm
    //--------------------------------------------------

    const palm = rightHand[0];

    const x = palm.x * canvas.width;

    const y = palm.y * canvas.height;

    arcCore.follow(x, y);

    //--------------------------------------------------
    // Visibility
    //--------------------------------------------------

    if (GESTURE.rightOpen) {

        arcCore.show();

    } else {

        arcCore.hide();

    }

    //--------------------------------------------------
    // Update Animation
    //--------------------------------------------------

    arcCore.update(

        STATE.deltaTime

    );

}
/*==========================================================

ARC CORE MODE

==========================================================*/

function updateArcMode(){

    if(!ARC.visible)
        return;

    arcCore.setRotation(

        GESTURE.wristRotation

    );

    ARC.mode = arcCore.getMode();

}
/*==========================================================

PINCH CONTROL

==========================================================*/

function updateArcControl(){

    if(!GESTURE.rightPinch)
        return;

    switch(ARC.mode){

        case "VOLUME":

            updateVolume();

        break;

        case "MEDIA":

            updateMedia();

        break;

        case "PORTAL":

            portal.summon();

        break;

    }

}
/*==========================================================

VOLUME CONTROL

==========================================================*/

let previousAngle = 0;

function updateVolume(){

    const angle =

        GESTURE.wristRotation;

    const delta =

        angle -

        previousAngle;

    previousAngle = angle;

    if(Math.abs(delta) < 2)
        return;

    ARC.value += delta * 0.6;

    ARC.value =

        Math.max(

            0,

            Math.min(

                100,

                ARC.value

            )

        );

    bridge.setVolume(

        Math.round(

            ARC.value

        )

    );

}
/*==========================================================

MEDIA CONTROL

==========================================================*/

let mediaLatch = false;

function updateMedia(){

    if(mediaLatch)
        return;

    bridge.playPause();

    mediaLatch = true;

    setTimeout(()=>{

        mediaLatch=false;

    },700);

}
/*==========================================================

DRAW ARC CORE

==========================================================*/

function drawArcCore(){

    if(!ARC.visible)
        return;

    arcCore.draw(ctx);

}
/*==========================================================

ARC LOOP

==========================================================*/

function arcLoop(){

    updateArcCore();

    updateArcMode();

    updateArcControl();

}
/*==========================================================

MAIN UPDATE LOOP

==========================================================*/

function update() {

    // Calculate FPS / delta time
    updateFPS();

    // Read latest hand gestures
    processGestures();

    // Update Portal
    portalLoop();

    // Update ARC Core
    arcLoop();

    // Update Particle System
    particles.update(STATE.deltaTime);

}
/*==========================================================

MAIN DRAW LOOP

==========================================================*/

function draw() {

    ctx.clearRect(

        0,

        0,

        canvas.width,

        canvas.height

    );

    //--------------------------------------------------

    drawCamera();

    //--------------------------------------------------

    drawHands();

    //--------------------------------------------------

    drawPortal();

    //--------------------------------------------------

    drawArcCore();

    //--------------------------------------------------

    particles.draw(ctx);

    //--------------------------------------------------

    if(CONFIG.DEBUG){

        drawDebugHUD();

    }

}
/*==========================================================

DEBUG HUD

==========================================================*/

function drawDebugHUD(){

    ctx.save();

    ctx.fillStyle="#00ff99";

    ctx.font="16px Consolas";

    ctx.fillText(

        `FPS : ${STATE.fps}`,

        20,

        30

    );

    ctx.fillText(

        `Portal : ${portal.visible}`,

        20,

        55

    );

    ctx.fillText(

        `Mode : ${ARC.mode}`,

        20,

        80

    );

    ctx.fillText(

        `Volume : ${Math.round(ARC.value)}`,

        20,

        105

    );

    ctx.restore();

}
/*==========================================================

MAIN LOOP

==========================================================*/

function animate(){

    update();

    draw();

    requestAnimationFrame(

        animate

    );

}
/*==========================================================

START ARCANA

==========================================================*/

async function startARCANA(){

    await initializeARCANA();

    await camera.start();

    console.log("");

    console.log("================================");

    console.log(" ARCANA READY ");

    console.log("================================");

    console.log("");

    animate();

}

startARCANA();
/*==========================================================

DESKTOP COMMAND ENGINE

==========================================================*/

const COMMANDS = {

    youtube() {

        bridge.openApp("youtube");

    },

    chatgpt() {

        bridge.openApp("chatgpt");

    },

    github() {

        bridge.openApp("github");

    },

    vscode() {

        bridge.openApp("vscode");

    },

    spotify() {

        bridge.openApp("spotify");

    },

    chrome() {

        bridge.openApp("chrome");

    },

    discord() {

        bridge.openApp("discord");

    },

    explorer() {

        bridge.openApp("explorer");

    }

};
/*==========================================================

PORTAL SELECTION

==========================================================*/

let hoverStart = 0;
let lastHover = -1;

function updatePortalSelection(){

    if(!portal.visible)
        return;

    if(portal.selected===-1){

        hoverStart=0;
        lastHover=-1;
        return;

    }

    if(lastHover!==portal.selected){

        hoverStart=performance.now();
        lastHover=portal.selected;

    }

    const held=

        (performance.now()-hoverStart)/1000;

    PORTAL.progress=Math.min(

        held/

        CONFIG.APP_HOVER_TIME,

        1

    );

}
/*==========================================================

LAUNCH APPLICATION

==========================================================*/

function executePortalSelection(){

    if(portal.selected<0)
        return;

    if(PORTAL.progress<1)
        return;

    if(!GESTURE.launchGesture)
        return;

    const app=

        APPS[portal.selected];

    if(!app)
        return;

    console.log(

        "[ARCANA]",

        app.name

    );

    if(

        COMMANDS[

            app.command

        ]

    ){

        COMMANDS[

            app.command

        ]();

    }

    portal.state=5;

    PORTAL.progress=0;

}
/*==========================================================

PORTAL PROGRESS RING

==========================================================*/

function drawPortalProgress(){

    if(!portal.visible)
        return;

    if(portal.selected<0)
        return;

    const app=

        portal.apps[

            portal.selected

        ];

    const angle=

        app.angle*

        Math.PI/180+

        portal.rotation;

    const orbit=

        portal.innerRadius-40;

    const x=

        portal.x+

        Math.cos(angle)

        *orbit;

    const y=

        portal.y+

        Math.sin(angle)

        *orbit;

    ctx.save();

    ctx.strokeStyle="#00ffff";

    ctx.shadowBlur=20;

    ctx.shadowColor="#00ffff";

    ctx.lineWidth=4;

    ctx.beginPath();

    ctx.arc(

        x,

        y,

        30,

        -Math.PI/2,

        -Math.PI/2+

        Math.PI*2*

        PORTAL.progress

    );

    ctx.stroke();

    ctx.restore();

}
/*==========================================================

PORTAL COMMAND LOOP

==========================================================*/

function portalCommandLoop(){

    updatePortalSelection();

    executePortalSelection();

}
