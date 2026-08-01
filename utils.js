/*
==========================================================
ARCANA V1.0
Utility Engine

Everything in ARCANA depends on this file.
==========================================================
*/

export const ARCANA = {

    VERSION: "1.0",

    DEBUG: true,

    FPS: 60,

    PARTICLE_LIMIT: 800,

    PORTAL_RADIUS: 260,

    ARC_RADIUS: 120,

    GLOW: "#ff9626",

    BLUE: "#47e7ff",

    WHITE: "#ffffff"

};





//==========================================================
export function clamp(value,min,max){

    return Math.max(
        min,
        Math.min(
            max,
            value
        )
    );

}





//==========================================================
export function lerp(a,b,t){

    return a+(b-a)*t;

}





//==========================================================
export function map(value,inMin,inMax,outMin,outMax){

    return outMin+

    (value-inMin)*

    (outMax-outMin)/

    (inMax-inMin);

}





//==========================================================
export function distance(a,b){

    return Math.hypot(

        a.x-b.x,

        a.y-b.y

    );

}





//==========================================================
export function angle(a,b){

    return Math.atan2(

        b.y-a.y,

        b.x-a.x

    );

}





//==========================================================
export function degrees(rad){

    return rad*180/Math.PI;

}





//==========================================================
export function radians(deg){

    return deg*Math.PI/180;

}





//==========================================================
export function midpoint(a,b){

    return{

        x:(a.x+b.x)/2,

        y:(a.y+b.y)/2

    };

}





//==========================================================
export function normalize(v){

    let len=Math.hypot(v.x,v.y);

    if(len===0)return{

        x:0,

        y:0

    };

    return{

        x:v.x/len,

        y:v.y/len

    };

}





//==========================================================
export function wristRotation(hand){

    let wrist=hand[0];

    let index=hand[5];

    return degrees(

        angle(

            wrist,

            index

        )

    );

}





//==========================================================
export function thumbTip(hand){

    return hand[4];

}

export function indexTip(hand){

    return hand[8];

}

export function middleTip(hand){

    return hand[12];

}

export function ringTip(hand){

    return hand[16];

}

export function pinkyTip(hand){

    return hand[20];

}





//==========================================================
export function pinchDistance(hand){

    return distance(

        thumbTip(hand),

        indexTip(hand)

    );

}





//==========================================================
export function isPinching(hand){

    return pinchDistance(hand)<0.05;

}





//==========================================================
export function smooth(current,target,speed=.15){

    return lerp(

        current,

        target,

        speed

    );

}





//==========================================================
export function createUID(){

    return Math.random()

    .toString(36)

    .substring(2,10);

}





//==========================================================
export class Timer{

    constructor(){

        this.last=performance.now();

    }

    elapsed(){

        return performance.now()-this.last;

    }

    reset(){

        this.last=performance.now();

    }

}





//==========================================================
export class Trail{

    constructor(max=40){

        this.points=[];

        this.max=max;

    }

    add(x,y){

        this.points.push({

            x,

            y,

            life:1

        });

        while(

            this.points.length>

            this.max

        ){

            this.points.shift();

        }

    }

    update(){

        for(

            let p of this.points

        ){

            p.life-=0.03;

        }

        this.points=this.points.filter(

            p=>p.life>0

        );

    }

}