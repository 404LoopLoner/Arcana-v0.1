import ParticlePool from "./ParticlePool.js";

export default class GlowEmitter{

    constructor(){

        this.pool=new ParticlePool(120);

    }

    emit(x,y){

        const p=this.pool.get();

        if(!p) return;

        p.init({

            type:"glow",

            x,

            y,

            vx:0,

            vy:0,

            life:.15,

            maxLife:.15,

            size:9,

            glow:40,

            color:"#ff9d00"

        });

    }

    update(dt){

        this.pool.update(dt);

    }

    draw(ctx){

        ctx.save();

        ctx.globalCompositeOperation="lighter";

        this.pool.draw(ctx);

        ctx.restore();

    }

}