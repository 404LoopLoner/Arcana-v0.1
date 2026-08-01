/*
=========================================================
ARCANA V1.0
Camera Engine
Part 1
=========================================================
*/

import { ARCANA } from "./utils.js";

let video = null;

let stream = null;

let hands = null;

let running = false;

let animationId = null;

let lastFrameTime = performance.now();

let fps = 0;


//---------------------------------------------------------

export let leftHand = null;

export let rightHand = null;

export let handCount = 0;


//---------------------------------------------------------

let frameCallbacks = [];


//---------------------------------------------------------

export function onFrame(callback){

    frameCallbacks.push(callback);

}


//---------------------------------------------------------

export function getVideo(){

    return video;

}


//---------------------------------------------------------

export function getFPS(){

    return fps;

}


//---------------------------------------------------------

export async function initializeCamera(videoElement){

    video = videoElement;

    stream = await navigator.mediaDevices.getUserMedia({

        video:{

            width:1280,

            height:720,

            facingMode:"user"

        },

        audio:false

    });

    video.srcObject = stream;

    await video.play();

}


//---------------------------------------------------------

async function createHands(){

    hands = new Hands({

        locateFile:(file)=>{

            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;

        }

    });

    hands.setOptions({

        maxNumHands:2,

        modelComplexity:1,

        minDetectionConfidence:0.7,

        minTrackingConfidence:0.7

    });

    hands.onResults(onResults);

}


//---------------------------------------------------------

export async function initialize(videoElement){

    await initializeCamera(videoElement);

    await createHands();

}
//---------------------------------------------------------

async function processFrame(){

    if(!running) return;

    await hands.send({

        image:video

    });

    animationId=requestAnimationFrame(

        processFrame

    );

}


//---------------------------------------------------------

export async function start(){

    if(running) return;

    running=true;

    processFrame();

}


//---------------------------------------------------------

export function stop(){

    running=false;

    cancelAnimationFrame(

        animationId

    );

}


//---------------------------------------------------------

function calculateFPS(){

    const now=performance.now();

    fps=Math.round(

        1000/

        (now-lastFrameTime)

    );

    lastFrameTime=now;

}
//---------------------------------------------------------

function assignHands(results){

    leftHand=null;

    rightHand=null;

    handCount=0;

    if(

        !results.multiHandLandmarks

    ) return;

    handCount=

        results.multiHandLandmarks.length;

    results.multiHandLandmarks.forEach(

        (landmarks,index)=>{

            const label=

            results.multiHandedness[index]

            .label;

            if(label==="Left"){

                leftHand=landmarks;

            }

            else{

                rightHand=landmarks;

            }

        }

    );

}
//---------------------------------------------------------

function onResults(results){

    calculateFPS();

    assignHands(results);

    for(

        const callback

        of frameCallbacks

    ){

        callback({

            left:leftHand,

            right:rightHand,

            count:handCount,

            fps

        });

    }

}
//---------------------------------------------------------

export function isRunning(){

    return running;

}