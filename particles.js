/*
==========================================================
ARCANA V1.0

Particle Base Class

Everything visual inherits this.

==========================================================
*/

export default class Particle{

    constructor(){

        this.reset();

    }

    reset(){

        this.active=false;

        this.x=0;
        this.y=0;

        this.vx=0;
        this.vy=0;

        this.life=0;
        this.maxLife=1;

        this.size=2;

        this.rotation=0;

        this.rotationSpeed=0;

        this.color="#ffffff";

        this.alpha=1;

        this.glow=0;

        this.gravity=0;

        this.drag=.98;

        this.type="generic";

    }

    init(options={}){

        this.active=true;

        Object.assign(this,options);

    }

    update(dt){

        if(!this.active)
            return;

        this.life-=dt;

        if(this.life<=0){

            this.active=false;

            return;

        }

        this.vx*=this.drag;

        this.vy*=this.drag;

        this.vy+=this.gravity*dt;

        this.x+=this.vx*dt;

        this.y+=this.vy*dt;

        this.rotation+=

            this.rotationSpeed*dt;

        this.alpha=

            this.life/

            this.maxLife;

    }

    draw(ctx){

    if(!this.active)
        return;

    ctx.save();

    ctx.translate(

        this.x,

        this.y

    );

    ctx.rotate(

        this.rotation

    );

    ctx.globalAlpha=this.alpha;

    ctx.shadowBlur=this.glow;

    ctx.shadowColor=this.color;

    ctx.fillStyle=this.color;

    if(this.type==="spark"){

        ctx.beginPath();

        ctx.moveTo(-this.size,0);

        ctx.lineTo(this.size*2,0);

        ctx.lineWidth=this.size;

        ctx.strokeStyle=this.color;

        ctx.stroke();

    }

    else{

        ctx.beginPath();

        ctx.arc(

            0,

            0,

            this.size,

            0,

            Math.PI*2

        );

        ctx.fill();

    }

    ctx.restore();

}

}