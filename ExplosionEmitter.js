import ParticlePool from "./ParticlePool.js";

export default class ExplosionEmitter{

    constructor(){

        this.pool=new ParticlePool(1200);

    }

    explode(x,y,count=120){

        for(let i=0;i<count;i++){

            const p=this.pool.get();

            if(!p) continue;

            const angle=Math.random()*Math.PI*2;

            const speed=80+Math.random()*350;

            p.init({

                type:"spark",

                x,

                y,

                vx:Math.cos(angle)*speed,

                vy:Math.sin(angle)*speed,

                gravity:40,

                drag:.99,

                life:.9,

                maxLife:.9,

                size:2+Math.random()*4,

                glow:25,

                color:"#ff9d00"

            });

        }

    }

    update(dt){

        this.pool.update(dt);

    }

    draw(ctx){

        this.pool.draw(ctx);

    }

}