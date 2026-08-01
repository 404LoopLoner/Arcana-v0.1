import ParticlePool from "./ParticlePool.js";

export default class SparkEmitter{

    constructor(max=600){

        this.pool=new ParticlePool(max);

    }

    emit(x,y,count=4){

        for(let i=0;i<count;i++){

            const p=this.pool.get();

            if(!p) continue;

            const angle=Math.random()*Math.PI*2;

            const speed=120+Math.random()*180;

            p.init({

                type:"spark",

                x,

                y,

                vx:Math.cos(angle)*speed,

                vy:Math.sin(angle)*speed,

                gravity:55,

                drag:.985,

                life:.55,

                maxLife:.55,

                size:1+Math.random()*2,

                glow:18,

                color:this.randomFire(),

                rotation:Math.random()*6,

                rotationSpeed:(Math.random()-.5)*14

            });

        }

    }

    randomFire(){

        const colors=[

            "#ff7a00",

            "#ff9d00",

            "#ffbc38",

            "#ffd95e",

            "#fff2a8"

        ];

        return colors[

            Math.floor(

                Math.random()*colors.length

            )

        ];

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