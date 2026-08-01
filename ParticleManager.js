import SparkEmitter from "./SparkEmitter.js";
import GlowEmitter from "./GlowEmitter.js";
import ExplosionEmitter from "./ExplosionEmitter.js";
import TrailEmitter from "./TrailEmitter.js";
import RuneEmitter from "./RuneEmitter.js";
import Lightning from "./Lightning.js";

export default class ParticleManager{

    constructor(){

        this.spark=new SparkEmitter();

        this.glow=new GlowEmitter();

        this.trail=new TrailEmitter();

        this.explosion=new ExplosionEmitter();

        this.runes=new RuneEmitter();

        this.lightning=new Lightning();

    }

    update(dt){

        this.spark.update(dt);

        this.glow.update(dt);

        this.trail.update(dt);

        this.explosion.update(dt);

        this.runes.update(dt);

    }

    draw(ctx){

        this.spark.draw(ctx);

        this.glow.draw(ctx);

        this.trail.draw(ctx);

        this.explosion.draw(ctx);

    }

}