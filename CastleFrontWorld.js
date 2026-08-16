
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

		// BG_SKY
		const bG_SKY = this.add.tileSprite(0, 0, 4999, 720, "castle-front-sunset-sky");
		bG_SKY.setOrigin(0, 0);

		// BG_MOUNTAINS
		const bG_MOUNTAINS = this.add.tileSprite(0, 590, 5000, 396, "castle-front-mountains-loop");
		bG_MOUNTAINS.setOrigin(0, 1);
		bG_MOUNTAINS.alpha = 0.82;
		bG_MOUNTAINS.tileScaleX = 1.529;
		bG_MOUNTAINS.tileScaleY = 1.529;

		// BG_FOREST
		const bG_FOREST = this.add.tileSprite(0, 590, 5001, 202, "castle-front-forest-loop");
		bG_FOREST.setOrigin(0, 1);
		bG_FOREST.alpha = 0.92;
		bG_FOREST.tileScaleX = 1.3808;
		bG_FOREST.tileScaleY = 1.3808;

		// BG_CLOUD_BROAD
		const bG_CLOUD_BROAD = this.add.image(90, 108, "castle-front-cloud-broad-sunset");
		bG_CLOUD_BROAD.scaleX = 2.2442;
		bG_CLOUD_BROAD.scaleY = 2.2442;
		bG_CLOUD_BROAD.setOrigin(0, 0);

		// BG_CLOUD_MOUND
		const bG_CLOUD_MOUND = this.add.image(435, 281, "castle-front-cloud-mound-sunset");
		bG_CLOUD_MOUND.scaleX = 1.9117;
		bG_CLOUD_MOUND.scaleY = 1.9117;
		bG_CLOUD_MOUND.setOrigin(0, 0);

		// BG_CLOUD_PUFFS
		const bG_CLOUD_PUFFS = this.add.image(794, 58, "castle-front-cloud-puffs-sunset");
		bG_CLOUD_PUFFS.scaleX = 2.2486;
		bG_CLOUD_PUFFS.scaleY = 2.2486;
		bG_CLOUD_PUFFS.setOrigin(0, 0);

		// BG_CLOUD_SWEEP
		const bG_CLOUD_SWEEP = this.add.image(896, 202, "castle-front-cloud-sweep-sunset");
		bG_CLOUD_SWEEP.scaleX = 2.3735;
		bG_CLOUD_SWEEP.scaleY = 2.3735;
		bG_CLOUD_SWEEP.setOrigin(0, 0);

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
		const rEF_jelly_spawn = this.add.image(481, 590, "construct-ember-jelly", 0);
		rEF_jelly_spawn.scaleX = 0.65;
		rEF_jelly_spawn.scaleY = 0.65;
		rEF_jelly_spawn.setOrigin(0.571, 0.926);

		// WALL_bastion
		const wALL_bastion = this.add.image(191, 592, "castle-front-bastion");
		wALL_bastion.setOrigin(0.5, 1);

		// ASSET_ground_band_grass
		const aSSET_ground_band_grass = this.add.tileSprite(2500, 574, 5000, 76, "castle-front-ground-band-grass");
		aSSET_ground_band_grass.setOrigin(0.5, 0);

		// REF_hero_spawn
		const rEF_hero_spawn = this.add.image(380, 590, "hero-chibi", 21);
		rEF_hero_spawn.scaleX = 1.5;
		rEF_hero_spawn.scaleY = 1.5;
		rEF_hero_spawn.setOrigin(0.5, 0.986);

		// LIVE_PROOF_delete_me
		const lIVE_PROOF_delete_me = this.add.sprite(1500, 578, "construct-ember-jelly", 0);
		lIVE_PROOF_delete_me.scaleX = 0.8;
		lIVE_PROOF_delete_me.scaleY = 0.8;
		lIVE_PROOF_delete_me.setOrigin(0.571, 0.926);

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
