
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
		const rEF_sky = this.add.rectangle(640, 415, 1280, 830);
		rEF_sky.isFilled = true;
		rEF_sky.fillColor = 9194031;

		// BG_SKY
		const bG_SKY = this.add.tileSprite(2499.5, 960, 4999, 960, "castle-front-sunset-sky");
		bG_SKY.setOrigin(0.5, 1);

		// BG_MOUNTAINS
		const bG_MOUNTAINS = this.add.tileSprite(0, 830, 5000, 396, "castle-front-mountains-loop");
		bG_MOUNTAINS.scaleX = 1.3;
		bG_MOUNTAINS.scaleY = 1.3;
		bG_MOUNTAINS.setOrigin(0, 1);
		bG_MOUNTAINS.alpha = 0.82;
		bG_MOUNTAINS.tileScaleX = 1.529;
		bG_MOUNTAINS.tileScaleY = 1.529;

		// BG_FOREST
		const bG_FOREST = this.add.tileSprite(0, 830, 5001, 202, "castle-front-forest-loop");
		bG_FOREST.scaleX = 1.4;
		bG_FOREST.scaleY = 1.4;
		bG_FOREST.setOrigin(0, 1);
		bG_FOREST.alpha = 0.92;
		bG_FOREST.tileScaleX = 1.3808;
		bG_FOREST.tileScaleY = 1.3808;

		// BG_CLOUD_BROAD
		const bG_CLOUD_BROAD = this.add.image(90, 144, "castle-front-cloud-broad-sunset");
		bG_CLOUD_BROAD.scaleX = 2.6273476752407743;
		bG_CLOUD_BROAD.scaleY = 1.9769093798893045;
		bG_CLOUD_BROAD.setOrigin(0, 0);

		// BG_CLOUD_MOUND
		const bG_CLOUD_MOUND = this.add.image(435, 375, "castle-front-cloud-mound-sunset");
		bG_CLOUD_MOUND.scaleX = 2.5633390300581427;
		bG_CLOUD_MOUND.scaleY = 1.9009408598438295;
		bG_CLOUD_MOUND.setOrigin(0, 0);

		// BG_CLOUD_PUFFS
		const bG_CLOUD_PUFFS = this.add.image(794, 77, "castle-front-cloud-puffs-sunset");
		bG_CLOUD_PUFFS.scaleX = 3.4851171503965;
		bG_CLOUD_PUFFS.scaleY = 1.9225001715931307;
		bG_CLOUD_PUFFS.setOrigin(0, 0);

		// BG_CLOUD_SWEEP
		const bG_CLOUD_SWEEP = this.add.image(896, 269, "castle-front-cloud-sweep-sunset");
		bG_CLOUD_SWEEP.scaleX = 3.0448749193231253;
		bG_CLOUD_SWEEP.scaleY = 2.1209538023703955;
		bG_CLOUD_SWEEP.setOrigin(0, 0);

		// GROUND
		const gROUND = this.add.rectangle(2500, 830, 5000, 130);
		gROUND.setOrigin(0.5, 0);
		gROUND.isFilled = true;
		gROUND.fillColor = 4008479;

		// GROUND_LIP
		const gROUND_LIP = this.add.rectangle(2500, 830, 5000, 7);
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
		const rEF_jelly_spawn = this.add.image(481, 830, "construct-ember-jelly", 0);
		rEF_jelly_spawn.setOrigin(0.571, 0.926);

		// ASSET_ground_band_grass
		const aSSET_ground_band_grass = this.add.tileSprite(2500, 814, 5000, 76, "castle-front-ground-band-grass");
		aSSET_ground_band_grass.setOrigin(0.5, 0);

		// REF_hero_spawn
		const rEF_hero_spawn = this.add.image(380, 830, "hero-chibi", 21);
		rEF_hero_spawn.scaleX = 1.5;
		rEF_hero_spawn.scaleY = 1.5;
		rEF_hero_spawn.setOrigin(0.5, 0.986);

		// LIVE_PROOF_delete_me
		const lIVE_PROOF_delete_me = this.add.sprite(1500, 818, "construct-ember-jelly", 0);
		lIVE_PROOF_delete_me.setOrigin(0.571, 0.926);

		// castle_front_tower_v3
		const castle_front_tower_v3 = this.add.image(-9, 828, "castle-front-tower-v3");
		castle_front_tower_v3.scaleX = 3.5;
		castle_front_tower_v3.scaleY = 3.5;
		castle_front_tower_v3.setOrigin(0, 1);

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
