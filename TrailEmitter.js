/*
==========================================================
ARCANA V1.0

Energy Trail Emitter

==========================================================
*/

export default class TrailEmitter{

    constructor(maxPoints=60){

        this.points=[];

        this.maxPoints=maxPoints;

    }

    add(x,y){

        this.points.push({

            x,

            y,

            life:1

        });

        while(this.points.length>this.maxPoints){

            this.points.shift();

        }

    }

    update(dt){

        for(const p of this.points){

            p.life-=dt*0.9;

        }

        this.points=this.points.filter(

            p=>p.life>0

        );

    }

    draw(ctx){

        if(this.points.length<2) return;

        ctx.save();

        ctx.globalCompositeOperation="lighter";

        for(let i=1;i<this.points.length;i++){

            const a=this.points[i-1];

            const b=this.points[i];

            const alpha=a.life;

            const width=10*alpha;

            ctx.strokeStyle=`rgba(255,150,40,${alpha})`;

            ctx.shadowBlur=25;

            ctx.shadowColor="#ff9d00";

            ctx.lineWidth=width;

            ctx.beginPath();

            ctx.moveTo(a.x,a.y);

            ctx.lineTo(b.x,b.y);

            ctx.stroke();

        }

        ctx.restore();

    }

}