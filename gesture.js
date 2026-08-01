/*
=========================================================
ARCANA V1.0
Gesture Recognition Engine
Part 1
=========================================================
*/

import * as Utils from "./utils.js";

const listeners = {};

const state = {

    left:null,

    right:null,

    previousLeft:null,

    previousRight:null,

    lastGesture:null,

    cooldown:{},

    swipeHistory:{
        Left:[],
        Right:[]
    }

};

const COOLDOWN = 350;


/*=======================================================*/

export function on(name,callback){

    if(!listeners[name])
        listeners[name]=[];

    listeners[name].push(callback);

}


/*=======================================================*/

function emit(name,data){

    if(!listeners[name]) return;

    listeners[name].forEach(cb=>cb(data));

}


/*=======================================================*/

function inCooldown(name){

    const now=performance.now();

    if(!state.cooldown[name])
        return false;

    return now-state.cooldown[name]<COOLDOWN;

}


/*=======================================================*/

function trigger(name,data={}){

    if(inCooldown(name))
        return;

    state.cooldown[name]=performance.now();

    emit(name,data);

}
/*=======================================================*/

export function update(frame){

    state.previousLeft=state.left;
    state.previousRight=state.right;

    state.left=frame.left;
    state.right=frame.right;

    if(state.left)
        detectHand(state.left,"Left");

    if(state.right)
        detectHand(state.right,"Right");

}
/*=======================================================*/

function detectHand(hand,label){

    if(isPinching(hand))
        trigger("pinch",{hand:label});

    if(isFist(hand))
        trigger("fist",{hand:label});

    if(isOpenPalm(hand))
        trigger("palm",{hand:label});

    if(isPeace(hand))
        trigger("peace",{hand:label});

    if(isThumbsUp(hand))
        trigger("thumbs",{hand:label});

    if(isSpider(hand))
        trigger("spider",{hand:label});

}
/*=======================================================*/

function extended(hand,tip,pip){

    return hand[tip].y < hand[pip].y;

}

function folded(hand,tip,pip){

    return hand[tip].y > hand[pip].y;

}
/*=======================================================*/

export function isPinching(hand){

    return Utils.distance(

        hand[4],

        hand[8]

    )<0.05;

}
/*=======================================================*/

export function isOpenPalm(hand){

    return(

        extended(hand,8,6)&&

        extended(hand,12,10)&&

        extended(hand,16,14)&&

        extended(hand,20,18)

    );

}
/*=======================================================*/

export function isFist(hand){

    return(

        folded(hand,8,6)&&

        folded(hand,12,10)&&

        folded(hand,16,14)&&

        folded(hand,20,18)

    );

}
/*=======================================================*/

export function isPeace(hand){

    return(

        extended(hand,8,6)&&

        extended(hand,12,10)&&

        folded(hand,16,14)&&

        folded(hand,20,18)

    );

}
/*=======================================================*/

export function isThumbsUp(hand){

    return(

        hand[4].y<hand[3].y&&

        folded(hand,8,6)&&

        folded(hand,12,10)&&

        folded(hand,16,14)&&

        folded(hand,20,18)

    );

}
/*=======================================================*/

export function isSpider(hand){

    return(

        extended(hand,8,6)&&

        folded(hand,12,10)&&

        folded(hand,16,14)&&

        extended(hand,20,18)

    );

}
/*=======================================================*/

export function wristRotation(hand){

    const wrist=hand[0];

    const index=hand[5];

    return Utils.degrees(

        Math.atan2(

            index.y-wrist.y,

            index.x-wrist.x

        )

    );

}
/*=======================================================*/

export function reset(){

    state.left=null;

    state.right=null;

}