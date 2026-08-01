import Particle from "./Particle.js";

export default class ParticlePool{

    constructor(max=2000){

        this.pool=[];

        for(

            let i=0;

            i<max;

            i++

        ){

            this.pool.push(

                new Particle()

            );

        }

    }

    get(){

        for(

            const particle

            of this.pool

        ){

            if(!particle.active){

                return particle;

            }

        }

        return null;

    }

    update(dt){

        for(

            const particle

            of this.pool

        ){

            particle.update(dt);

        }

    }

    draw(ctx){

        for(

            const particle

            of this.pool

        ){

            particle.draw(ctx);

        }

    }

}