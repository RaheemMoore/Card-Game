
// You can write more code here

/* START OF COMPILED CODE */

class CastleFrontWorld extends Phaser.Scene {

	constructor() {
		super("CastleFrontWorld");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	/** @returns {void} */
	editorCreate() {

		// REF_sky
		const rEF_sky = this.add.rectangle(640, 295, 1280, 590);
		rEF_sky.isFilled = true;
		rEF_sky.fillColor = 9194031;

		// GROUND
		const gROUND = this.add.rectangle(2500, 590, 5000, 130);
		gROUND.setOrigin(0.5, 0);
		gROUND.isFilled = true;
		gROUND.fillColor = 4008479;

		// GROUND_LIP
		const gROUND_LIP = this.add.rectangle(2500, 590, 5000, 7);
		gROUND_LIP.setOrigin(0.5, 0);
		gROUND_LIP.isFilled = true;
		gROUND_LIP.fillColor = 7031347;

		// WALL_LEFT
		const wALL_LEFT = this.add.rectangle(-600, -300, 370, 290);
		wALL_LEFT.setOrigin(0.5, 1);
		wALL_LEFT.isFilled = true;
		wALL_LEFT.fillColor = 2366508;

		// WALL_TOWER_A
		const wALL_TOWER_A = this.add.rectangle(-600, -450, 86, 414);
		wALL_TOWER_A.setOrigin(0.5, 1);
		wALL_TOWER_A.isFilled = true;
		wALL_TOWER_A.fillColor = 2366508;

		// WALL_TOWER_B
		const wALL_TOWER_B = this.add.rectangle(-600, -600, 86, 414);
		wALL_TOWER_B.setOrigin(0.5, 1);
		wALL_TOWER_B.isFilled = true;
		wALL_TOWER_B.fillColor = 2366508;

		// GATE
		const gATE = this.add.rectangle(-600, -750, 104, 218);
		gATE.setOrigin(0.5, 1);
		gATE.isFilled = true;
		gATE.fillColor = 3812415;

		// REF_jelly_spawn
		const rEF_jelly_spawn = this.add.image(660, 590, "construct-ember-jelly", 0);
		rEF_jelly_spawn.scaleX = 2;
		rEF_jelly_spawn.scaleY = 2;
		rEF_jelly_spawn.setOrigin(0.571, 0.926);

		// WALL_bastion
		const wALL_bastion = this.add.image(191, 592, "castle-front-bastion");
		wALL_bastion.setOrigin(0.5, 1);

		// ASSET_ground_band_grass
		const aSSET_ground_band_grass = this.add.tileSprite(2500, 574, 5000, 76, "castle-front-ground-band-grass");
		aSSET_ground_band_grass.setOrigin(0.5, 0);

		// REF_hero_spawn
		const rEF_hero_spawn = this.add.image(380, 590, "hero-chibi", 21);
		rEF_hero_spawn.scaleX = 2;
		rEF_hero_spawn.scaleY = 2;
		rEF_hero_spawn.setOrigin(0.5, 0.986);

		this.events.emit("scene-awake");
	}

	/* START-USER-CODE */

	// Write your code here

	create() {

		this.editorCreate();
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
