export default class RuneEmitter{

    constructor(){

        this.angle=0;

    }

    update(dt){

        this.angle+=dt;

    }

    draw(ctx,x,y,radius){

        ctx.save();

        ctx.translate(x,y);

        ctx.rotate(this.angle);

        ctx.strokeStyle="#ffb347";

        ctx.shadowBlur=25;

        ctx.shadowColor="#ff8c00";

        ctx.lineWidth=2;

        for(let i=0;i<12;i++){

            ctx.rotate(Math.PI/6);

            ctx.beginPath();

            ctx.arc(

                radius,

                0,

                8,

                0,

                Math.PI*2

            );

            ctx.stroke();

        }

        ctx.restore();

    }

}