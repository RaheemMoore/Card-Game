
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

		// PLACEHOLDER_block_left
		const pLACEHOLDER_block_left = this.add.rectangle(240, 590, 90, 130);
		pLACEHOLDER_block_left.setOrigin(0.5, 1);
		pLACEHOLDER_block_left.isFilled = true;
		pLACEHOLDER_block_left.fillColor = 4864604;

		// PLACEHOLDER_block_mid
		const pLACEHOLDER_block_mid = this.add.rectangle(760, 590, 120, 70);
		pLACEHOLDER_block_mid.setOrigin(0.5, 1);
		pLACEHOLDER_block_mid.isFilled = true;
		pLACEHOLDER_block_mid.fillColor = 6046774;

		// PLACEHOLDER_block_right
		const pLACEHOLDER_block_right = this.add.rectangle(1080, 590, 70, 190);
		pLACEHOLDER_block_right.setOrigin(0.5, 1);
		pLACEHOLDER_block_right.isFilled = true;
		pLACEHOLDER_block_right.fillColor = 4864604;

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
