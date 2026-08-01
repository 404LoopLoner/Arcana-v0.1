/*
==========================================================
ARCANA V1.0

ARC CORE
Tony Stark Inspired Spatial HUD

==========================================================
*/

export default class ArcCore {

    constructor() {

        this.x = 0;
        this.y = 0;

        this.radius = 130;

        this.visible = false;

        this.alpha = 0;

        this.rotation = 0;
        this.targetRotation = 0;

        this.selected = 0;

        this.items = [

            "VOLUME",
            "MEDIA",
            "BRIGHT",
            "SCROLL",
            "MOUSE",
            "AI",
            "DESKTOP",
            "PORTAL"

        ];

    }

    //==================================================

    show() {

        this.visible = true;

    }

    hide() {

        this.visible = false;

    }

    //==================================================

    follow(x, y) {

        this.x = x;
        this.y = y;

    }

    //==================================================

    setRotation(angle) {

        this.targetRotation = angle;

        let sector = Math.round(

            ((angle + 180) / 360) *

            this.items.length

        );

        sector = (

            sector +

            this.items.length

        ) %

        this.items.length;

        this.selected = sector;

    }

    //==================================================

    getMode() {

        return this.items[this.selected];

    }

    //==================================================

    update(dt) {

        if (this.visible)

            this.alpha += dt * 3;

        else

            this.alpha -= dt * 3;

        this.alpha = Math.max(

            0,

            Math.min(

                1,

                this.alpha

            )

        );

        this.rotation +=

            (

                this.targetRotation -

                this.rotation

            ) * 0.12;

    }

    //==================================================

    draw(ctx) {

        if (this.alpha <= 0) return;

        ctx.save();

        ctx.translate(

            this.x,

            this.y

        );

        ctx.rotate(

            this.rotation *

            Math.PI /

            180

        );

        ctx.globalAlpha = this.alpha;

        ctx.globalCompositeOperation = "lighter";

        this.drawOuterRing(ctx);

        this.drawSegments(ctx);

        this.drawIcons(ctx);

        this.drawCenter(ctx);

        ctx.restore();

    }

    //==================================================

    drawOuterRing(ctx) {

        ctx.beginPath();

        ctx.arc(

            0,

            0,

            this.radius,

            0,

            Math.PI * 2

        );

        ctx.lineWidth = 3;

        ctx.strokeStyle = "#ff9d00";

        ctx.shadowBlur = 25;

        ctx.shadowColor = "#ff9d00";

        ctx.stroke();

    }

    //==================================================

    drawSegments(ctx) {

        ctx.save();

        ctx.strokeStyle = "#ffb347";

        ctx.lineWidth = 2;

        ctx.shadowBlur = 12;

        ctx.shadowColor = "#ff9d00";

        for (let i = 0; i < 80; i++) {

            const start = i * 0.08;

            ctx.beginPath();

            ctx.arc(

                0,

                0,

                this.radius - 15,

                start,

                start + 0.04

            );

            ctx.stroke();

        }

        ctx.restore();

    }

    //==================================================

    drawIcons(ctx) {

        const orbit = this.radius - 30;

        const total = this.items.length;

        for (let i = 0; i < total; i++) {

            const angle =

                (

                    Math.PI * 2 /

                    total

                ) * i;

            const x =

                Math.cos(angle) *

                orbit;

            const y =

                Math.sin(angle) *

                orbit;

            ctx.beginPath();

            ctx.arc(

                x,

                y,

                i === this.selected ? 16 : 11,

                0,

                Math.PI * 2

            );

            ctx.fillStyle =

                i === this.selected

                    ? "#ffd95e"

                    : "#1aa7ff";

            ctx.shadowBlur =

                i === this.selected

                    ? 40

                    : 12;

            ctx.shadowColor = ctx.fillStyle;

            ctx.fill();

            ctx.fillStyle = "#ffffff";

            ctx.font = "11px Arial";

            ctx.textAlign = "center";

            ctx.fillText(

                this.items[i],

                x,

                y + 28

            );

        }

    }

    //==================================================

    drawCenter(ctx) {

        ctx.beginPath();

        ctx.arc(

            0,

            0,

            42,

            0,

            Math.PI * 2

        );

        ctx.fillStyle =

            "rgba(20,20,25,.82)";

        ctx.fill();

        ctx.lineWidth = 3;

        ctx.strokeStyle = "#ff9d00";

        ctx.shadowBlur = 30;

        ctx.shadowColor = "#ff9d00";

        ctx.stroke();

        ctx.fillStyle = "#ffffff";

        ctx.font = "bold 15px Arial";

        ctx.textAlign = "center";

        ctx.fillText(

            this.getMode(),

            0,

            5

        );

    }

}