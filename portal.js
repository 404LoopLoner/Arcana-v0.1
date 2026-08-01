/*
==========================================================
ARCANA V1.0

Doctor Strange Portal Engine

PART 1

==========================================================
*/

export const PortalState={

    CLOSED:0,

    SUMMONING:1,

    OPENING:2,

    OPEN:3,

    SELECTING:4,

    LAUNCHING:5,

    CLOSING:6

};

export default class Portal{

    constructor(){

        this.state=PortalState.CLOSED;

        this.visible=false;

        this.x=0;

        this.y=0;

        this.radius=0;

        this.targetRadius=240;

        this.innerRadius=0;

        this.progress=0;

        this.rotation=0;

        this.rotation2=0;

        this.rotation3=0;

        this.alpha=0;

        this.scale=0;

        this.selected=-1;

        this.hoverTimer=0;

        this.launchAnimation=0;

        this.apps=[];

        this.createApps();

    }

    createApps(){

        this.apps=[

            {
                name:"YouTube",
                icon:"▶",
                angle:0
            },

            {
                name:"ChatGPT",
                icon:"✦",
                angle:45
            },

            {
                name:"GitHub",
                icon:"⌘",
                angle:90
            },

            {
                name:"VSCode",
                icon:"⌂",
                angle:135
            },

            {
                name:"Spotify",
                icon:"♫",
                angle:180
            },

            {
                name:"Chrome",
                icon:"◎",
                angle:225
            },

            {
                name:"Discord",
                icon:"◈",
                angle:270
            },

            {
                name:"Explorer",
                icon:"▣",
                angle:315
            }

        ];

    }

    follow(x,y){

        this.x=x;

        this.y=y;

    }

    summon(){

        if(this.state!==PortalState.CLOSED)
            return;

        this.visible=true;

        this.state=PortalState.SUMMONING;

    }

    close(){

        if(this.state===PortalState.CLOSED)
            return;

        this.state=PortalState.CLOSING;

    }
    update(dt){

        switch(this.state){

            case PortalState.SUMMONING:

                this.progress+=dt*1.5;

                this.scale+=dt*2;

                this.alpha+=dt*3;

                this.radius+=

                (

                    this.targetRadius-

                    this.radius

                )*.12;

                if(this.progress>=1){

                    this.progress=1;

                    this.state=PortalState.OPENING;

                }

            break;

            case PortalState.OPENING:

                this.innerRadius+=

                (

                    this.targetRadius*.82-

                    this.innerRadius

                )*.12;

                if(

                    Math.abs(

                        this.innerRadius-

                        this.targetRadius*.82

                    )<1

                ){

                    this.state=PortalState.OPEN;

                }

            break;

            case PortalState.OPEN:

                break;

            case PortalState.LAUNCHING:

                this.launchAnimation+=dt*3;

                if(this.launchAnimation>1){

                    this.close();

                }

            break;

            case PortalState.CLOSING:

                this.alpha-=dt*3;

                this.radius*=0.92;

                this.innerRadius*=0.92;

                if(this.alpha<=0){

                    this.state=PortalState.CLOSED;

                    this.visible=false;

                    this.progress=0;

                    this.launchAnimation=0;

                }

            break;

        }

        this.rotation+=dt*0.4;

        this.rotation2-=dt*0.65;

        this.rotation3+=dt*0.9;

    }
    draw(ctx){

        if(!this.visible)
            return;

        ctx.save();

        ctx.translate(

            this.x,

            this.y

        );

        ctx.globalAlpha=this.alpha;

        this.drawOuterRing(ctx);

        this.drawMiddleRing(ctx);

        this.drawInnerRing(ctx);

        this.drawCenter(ctx);

        this.drawApps(ctx);

        ctx.restore();

    }
    drawOuterRing(ctx){

        ctx.save();

        ctx.rotate(

            this.rotation

        );

        ctx.strokeStyle="#ff8c00";

        ctx.shadowBlur=35;

        ctx.shadowColor="#ff8c00";

        ctx.lineWidth=4;

        ctx.beginPath();

        ctx.arc(

            0,

            0,

            this.radius,

            0,

            Math.PI*2

        );

        ctx.stroke();

        ctx.restore();

    }
    drawMiddleRing(ctx){

        ctx.save();

        ctx.rotate(

            this.rotation2

        );

        ctx.strokeStyle="#ffc04d";

        ctx.shadowBlur=25;

        ctx.shadowColor="#ffb347";

        ctx.lineWidth=2;

        for(let i=0;i<48;i++){

            ctx.beginPath();

            ctx.arc(

                0,

                0,

                this.radius-18,

                i*.13,

                i*.13+.04

            );

            ctx.stroke();

        }

        ctx.restore();

    }
    drawInnerRing(ctx){

        ctx.save();

        ctx.rotate(

            this.rotation3

        );

        ctx.strokeStyle="#fff2a8";

        ctx.shadowBlur=18;

        ctx.shadowColor="#fff2a8";

        ctx.lineWidth=3;

        ctx.beginPath();

        ctx.arc(

            0,

            0,

            this.innerRadius,

            0,

            Math.PI*2

        );

        ctx.stroke();

        ctx.restore();

    }
    drawCenter(ctx){

        ctx.beginPath();

        ctx.arc(

            0,

            0,

            this.innerRadius-15,

            0,

            Math.PI*2

        );

        ctx.fillStyle=

        "rgba(20,10,5,.35)";

        ctx.fill();

    }
    drawApps(ctx){

        const orbit=

        this.innerRadius-40;

        this.apps.forEach((app,index)=>{

            const angle=

            app.angle*

            Math.PI/180+

            this.rotation;

            const x=

            Math.cos(angle)

            *orbit;

            const y=

            Math.sin(angle)

            *orbit;

            ctx.beginPath();

            ctx.arc(

                x,

                y,

                22,

                0,

                Math.PI*2

            );

            ctx.fillStyle=

            index===this.selected?

            "#ffd95e":

            "#ff8c00";

            ctx.shadowBlur=25;

            ctx.shadowColor=ctx.fillStyle;

            ctx.fill();

            ctx.fillStyle="#111";

            ctx.font="18px Arial";

            ctx.textAlign="center";

            ctx.fillText(

                app.icon,

                x,

                y+6

            );

        });

    }

}