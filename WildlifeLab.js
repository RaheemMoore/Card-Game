
// You can write more code here

/* START OF COMPILED CODE */

class WildlifeLab extends Phaser.Scene {

	constructor() {
		super("WildlifeLab");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	/** @returns {void} */
	editorCreate() {

		// labBackground
		const labBackground = this.add.rectangle(400, 300, 800, 600);
		labBackground.isFilled = true;
		labBackground.fillColor = 1450552;

		// dirtTestGround
		const dirtTestGround = this.add.tileSprite(400, 330, 690, 330, "ground-tileset-dirt-floor-32", 15);
		dirtTestGround.alpha = 0.92;

		// labTitle
		const labTitle = this.add.text(48, 38, "", {});
		labTitle.text = "WILDLIFE LAB";
		labTitle.setStyle({ "color": "#f6e6b5", "fontFamily": "Arial", "fontSize": "34px", "fontStyle": "bold" });

		// labSubtitle
		const labSubtitle = this.add.text(50, 88, "", {});
		labSubtitle.text = "A separate test scene — Courtyard V2 stays untouched";
		labSubtitle.setStyle({ "color": "#aebdd3", "fontFamily": "Arial", "fontSize": "17px", "fontStyle": " " });

		// roamingAreaGuide
		const roamingAreaGuide = this.add.rectangle(400, 330, 690, 330);
		roamingAreaGuide.isFilled = true;
		roamingAreaGuide.fillColor = 2112578;
		roamingAreaGuide.fillAlpha = 0.1;
		roamingAreaGuide.isStroked = true;
		roamingAreaGuide.strokeColor = 7587492;
		roamingAreaGuide.strokeAlpha = 0.65;
		roamingAreaGuide.lineWidth = 3;

		// foxLabel
		const foxLabel = this.add.text(125, 370, "", {});
		foxLabel.setOrigin(0.5, 0);
		foxLabel.text = "FOX LIVE\nroam • sniff • sit";
		foxLabel.setStyle({ "align": "center", "color": "#ffe0bd", "fontFamily": "Arial", "fontSize": "12px", "fontStyle": "bold" });

		// rabbitLabel
		const rabbitLabel = this.add.text(237, 369, "", {});
		rabbitLabel.setOrigin(0.5, 0);
		rabbitLabel.text = "RABBIT LIVE\nhop • nibble";
		rabbitLabel.setStyle({ "align": "center", "color": "#f0e6d8", "fontFamily": "Arial", "fontSize": "12px", "fontStyle": "bold" });

		// tortoiseLabel
		const tortoiseLabel = this.add.text(339, 372, "", {});
		tortoiseLabel.setOrigin(0.5, 0);
		tortoiseLabel.text = "TORTOISE LIVE\nslow walk";
		tortoiseLabel.setStyle({ "align": "center", "color": "#b8f4cb", "fontFamily": "Arial", "fontSize": "12px", "fontStyle": "bold" });

		// labInstructions
		const labInstructions = this.add.text(400, 505, "", {});
		labInstructions.setOrigin(0.5, 0);
		labInstructions.text = "All three animals use real generated animation sheets. Review behavior here before Courtyard V2.";
		labInstructions.setStyle({ "align": "center", "color": "#f6e6b5", "fontFamily": "Arial", "fontSize": "15px", "fontStyle": " " });

		// foxSprite
		const foxSprite = this.add.sprite(126, 355, "wildlife-fox-trot", 0);
		foxSprite.scaleX = 0.7;
		foxSprite.scaleY = 0.7;
		foxSprite.setOrigin(0.5, 1);

		// rabbitSprite
		const rabbitSprite = this.add.sprite(239, 351, "wildlife-rabbit-hop", 0);
		rabbitSprite.scaleX = 0.4;
		rabbitSprite.scaleY = 0.4;
		rabbitSprite.setOrigin(0.5, 1);

		// tortoiseSprite
		const tortoiseSprite = this.add.sprite(348, 356, "wildlife-tortoise-toddle", 0);
		tortoiseSprite.scaleX = 0.66;
		tortoiseSprite.scaleY = 0.66;
		tortoiseSprite.setOrigin(0.5, 1);

		// nature_water_pond_basin
		const nature_water_pond_basin = this.add.image(560, 334, "nature-water-pond-basin");
		nature_water_pond_basin.scaleX = 1.2;
		nature_water_pond_basin.scaleY = 1.2;

		// nature_water_pond_cliff_north
		const nature_water_pond_cliff_north = this.add.image(560, 334, "nature-water-pond-cliff-north");
		nature_water_pond_cliff_north.scaleX = 1.2;
		nature_water_pond_cliff_north.scaleY = 1.2;

		this.roamingAreaGuide = roamingAreaGuide;
		this.foxSprite = foxSprite;
		this.rabbitSprite = rabbitSprite;
		this.tortoiseSprite = tortoiseSprite;

		this.events.emit("scene-awake");
	}

	/** @type {Phaser.GameObjects.Rectangle} */
	roamingAreaGuide;
	/** @type {Phaser.GameObjects.Sprite} */
	foxSprite;
	/** @type {Phaser.GameObjects.Sprite} */
	rabbitSprite;
	/** @type {Phaser.GameObjects.Sprite} */
	tortoiseSprite;

	/* START-USER-CODE */

	// This file is placement only, on purpose.
	//
	// It used to carry a hand-written demonstration routine that walked the three
	// animals through fixed activity arrays. That proved the generated sheets play,
	// but it had no needs, no memory of what it just did, and no idea a player
	// existed. The real behaviour is the shared wildlife system in
	// card-engine/src/pages/castle/wildlife/, attached at run time by
	// src/pages/dev/sceneBehaviors/wildlifeLab.ts.
	//
	// It lives there rather than here for two reasons: this file is evaluated as
	// plain text by /dev/scene, so it cannot import anything; and Phaser Editor
	// rewrites this file on every save, so behaviour kept out of it cannot be lost
	// to a stale Editor project.
	//
	// Loading is handled the same way — /dev/scene loads the wildlife asset pack,
	// so no preload() is needed here.

	create() {

		this.editorCreate();
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
