export default class Lightning{

    draw(ctx,a,b){

        const segments=18;

        ctx.save();

        ctx.strokeStyle="#fff6c8";

        ctx.shadowBlur=20;

        ctx.shadowColor="#ff7b00";

        ctx.lineWidth=2;

        ctx.beginPath();

        ctx.moveTo(

            a.x,

            a.y

        );

        for(

            let i=1;

            i<segments;

            i++

        ){

            const t=i/segments;

            const x=

                a.x+

                (b.x-a.x)*t+

                (Math.random()-.5)*12;

            const y=

                a.y+

                (b.y-a.y)*t+

                (Math.random()-.5)*12;

            ctx.lineTo(x,y);

        }

        ctx.lineTo(

            b.x,

            b.y

        );

        ctx.stroke();

        ctx.restore();

    }

}
