// Castle Kit V3 — the five redrawn kit pieces assembled into a castle front.
//
// This scene exists to answer the one thing a review sheet cannot: does the kit
// hold together at true game scale, next to the actual hero? Two things are on
// trial.
//
//   1. THE x2.6 TOWER SCALE. The tower plates were framed at a different
//      internal scale in Leonardo; composited against the wall, their doors only
//      matched the wall's doors at about 2.6x. That multiplier is baked into the
//      ASSETS (towers were generated at 0.8125, walls at 0.3125), so every piece
//      here is placed at Phaser scale 1. If the towers read wrong, the number is
//      wrong — not the placement.
//
//   2. WALL-TO-HERO RATIO. The reference tilemaps sit at 2.5-3x. The hero is 71px
//      at scale 1.408, so ~100px, and the wall band is 212 — about 2.1x, a little
//      under the references. The ruler beside the hero makes that measurable
//      instead of arguable.
//
// Not a courtyard and not trying to be: no colliders, no walkable floor, no
// quadrants. CourtyardV2 is untouched.
//
//   /dev/scene?start=CastleKitV3

/* START OF COMPILED CODE */

class CastleKitV3 extends Phaser.Scene {

	constructor() {
		super("CastleKitV3");
	}

	/** @returns {void} */
	editorCreate() {

		// Geometry is derived from the pieces' real sizes rather than typed in,
		// so a re-export at a different size moves everything correctly.
		// Raheem, seeing it in the scene: "the wall is meant to be much larger."
		// He is right, and it was measurable before he said it — the wall band
		// came out 2.1x the hero against the references' 2.5-3x.
		//
		// The fix is NOT to scale the wall alone. Every piece's size relative to
		// every other is already correct (that is what the x2.6 tower correction
		// bought), so scaling one piece would break the kit. The whole castle
		// scales together and the hero does not: at 1.6 the wall band reads 325px
		// against his 100, which is 3.25x and lands inside the reference band.
		// 1.0, and the reasoning matters because it settles the hero question too.
		//
		// At CASTLE 1.6 the castle was upscaled 1.6x and then, to fit any of it on
		// screen, the camera had to pull back to about 0.6 — a net 0.96. All that
		// buys is a downscale at the end, which is the one thing pixel art will not
		// survive. So: everything at 1:1, camera at 1:1, and the ratio comes from
		// the art's own sizes.
		//
		// Wall band 203px / hero at NATIVE 71px = 2.86x, which is the middle of the
		// references' 2.5-3x. The hero was not too big; his x1.408 RENDER scale was.
		// Dropping it costs nothing and needs no new sheet.
		const CASTLE = 1.0;

		const WALL_W = 318, WALL_H = 203;   // castle-wall-straight-v3
		const SIDE_W = 125, SIDE_H = 318;   // castle-wall-side-v3
		const GATE_W = 294, GATE_H = 221;   // castle-gate-house-v3
		const CORNER_W = 183, CORNER_H = 269;
		const TOWER_H = 457;

		const TOP = 420;                    // top of the wall band
		const BASE = TOP + WALL_H;          // the line every front piece stands on
		const LEFT_X = 180, RIGHT_X = 1612; // corner tower centres

		// ground
		const ground = this.add.tileSprite(960, 620, 1920, 1240, "ground-tileset-forestfloor-dirt-32");
		ground.setDepth(0);

		// Everything castle-shaped goes in here and is scaled as one, so the kit's
		// internal proportions can never drift apart by accident.
		const castle = this.add.container(0, 0);
		castle.setScale(CASTLE);
		castle.setDepth(1);

		// The battle tower sits BEHIND the wall — that is its whole job, to be the
		// thing you see rising over the back wall and are about to climb.
		const battleTower = this.add.image(896, TOP + 60 - TOWER_H / 2, "tower-battle-v3");
		castle.add(battleTower);
		battleTower.setDepth(1);

		// side walls, running away from each corner tower
		const sideLeft = this.add.tileSprite(LEFT_X, BASE + SIDE_H / 2, SIDE_W, SIDE_H, "wall-side-v3");
		const sideRight = this.add.tileSprite(RIGHT_X, BASE + SIDE_H / 2, SIDE_W, SIDE_H, "wall-side-v3");
		castle.add(sideLeft);
		sideLeft.setDepth(2);
		castle.add(sideRight);
		sideRight.setDepth(2);

		// front wall runs, tiled either side of the gate
		const runLeftW = 636, runRightW = 318;
		const runLeft = this.add.tileSprite(LEFT_X + CORNER_W / 2 + runLeftW / 2, TOP + WALL_H / 2,
			runLeftW, WALL_H, "wall-straight-v3");
		// THE GATEHOUSE IS SCALED UP AND PUSHED FORWARD, and one change fixes two
		// complaints at once.
		//
		// Raheem: "the walls look bigger than the main gate, and they're on the same
		// y", and separately "the walls were blown up a bit more than the entrance...
		// they should be equally as pixelated."
		//
		// Both are measurable. Apparent pixel-block size — the mean run of identical
		// neighbouring pixels — is 7.65 on the wall but only 3.25 on the gate, so the
		// wall's pixels really are 2.4x chunkier. That is NOT a reduction-ratio
		// mismatch (wall 3.22x, gate 3.29x — near identical); it is content density.
		// The wall plate is a plain expanse of stone, the gate plate is packed with
		// pipes, roundels, runes and windows, so the same reduction leaves the gate
		// carrying far more variation per pixel.
		//
		// Upscaling the gate fixes both: it becomes physically dominant AND its
		// pixels get chunkier, moving toward the wall's. At 1.45 the gate's apparent
		// pixel goes 3.25 -> 4.7.
		//
		// It is also pushed FORWARD of the wall line, which is what a real gatehouse
		// does — it projects from the curtain wall rather than sitting flush in it.
		const GATE_SCALE = 1.45;
		const GATE_FORWARD = 46;
		const gate = this.add.image(runLeft.x + runLeftW / 2 + (GATE_W * GATE_SCALE) / 2,
			BASE + GATE_FORWARD - (GATE_H * GATE_SCALE) / 2, "gate-house-v3");
		gate.setScale(GATE_SCALE);
		const runRight = this.add.tileSprite(gate.x + (GATE_W * GATE_SCALE) / 2 + runRightW / 2, TOP + WALL_H / 2,
			runRightW, WALL_H, "wall-straight-v3");
		castle.add(runLeft);
		runLeft.setDepth(3);
		castle.add(runRight);
		runRight.setDepth(3);
		castle.add(gate);
		gate.setDepth(4);

		// corner towers last — they cap the runs, so they draw over them
		const cornerLeft = this.add.image(LEFT_X, BASE - CORNER_H / 2, "tower-corner-v3");
		const cornerRight = this.add.image(RIGHT_X, BASE - CORNER_H / 2, "tower-corner-v3");
		castle.add(cornerLeft);
		cornerLeft.setDepth(5);
		castle.add(cornerRight);
		cornerRight.setDepth(5);

		// HERO SIZE TEST — Raheem, 2026-08-09: "I think our characters may be a bit
		// too big", against the reference tilemaps.
		//
		// All four are drawn at Phaser scale 1. That is the point: pixel art must
		// never be shrunk at render time, so each of these is a genuinely smaller
		// NATIVE sheet, area-averaged down by lib/resample.py. What is on screen is
		// what would ship.
		//
		// Caveat worth knowing: the original 78x152 sheet is not in the repo, so
		// these come from the already-reduced 71px one — a second reduction. If a
		// smaller size wins, the clean way to ship it is regenerating from PixelLab
		// at that size rather than stacking another resample.
		const SIZES = [
			{ key: "hero-chibi", h: 71, note: "native, no render scale" },
			{ key: "hero-chibi-56", h: 56, note: "79%" },
			{ key: "hero-chibi-48", h: 48, note: "68%" },
			{ key: "hero-chibi-40", h: 40, note: "56%" },
		];
		const FOOT = 1030;              // one ground line for all four
		let hx = 520;
		for (const sz of SIZES) {
			const spr = this.add.sprite(hx, FOOT - sz.h / 2, sz.key, 0);
			spr.setDepth(6);
			const cap = this.add.text(hx - 40, FOOT + 12, "", {});
			cap.text = sz.h + "px  " + sz.note;
			cap.setStyle({ color: "#aebdd3", fontFamily: "Arial", fontSize: "13px" });
			cap.setDepth(7);
			hx += 150;
		}

		// The wall band, drawn beside them at the same castle scale, so the ratio
		// can be read off rather than argued about.
		const bandRule = this.add.rectangle(430, (BASE - WALL_H / 2) * CASTLE, 4, WALL_H * CASTLE);
		bandRule.isFilled = true;
		bandRule.fillColor = 9127167;
		bandRule.setDepth(6);

		const bandCap = this.add.text(360, (BASE * CASTLE) + 12, "", {});
		bandCap.text = "wall band " + Math.round(WALL_H * CASTLE) + "px";
		bandCap.setStyle({ color: "#7fb2ff", fontFamily: "Arial", fontSize: "13px" });
		bandCap.setDepth(7);

		const title = this.add.text(40, 34, "", {});
		title.text = "CASTLE KIT V3";
		title.setStyle({ color: "#f6e6b5", fontFamily: "Arial", fontSize: "32px", fontStyle: "bold" });
		title.setDepth(7);

		const sub = this.add.text(40, 78, "", {});
		sub.text = "every piece at Phaser scale 1 — the x2.6 tower correction is baked into the assets\n" +
			"gold rule = hero 100px    blue rule = wall band 325px at castle scale 1.6    ratio 3.25x  (references sit at 2.5-3x)";
		sub.setStyle({ color: "#aebdd3", fontFamily: "Arial", fontSize: "16px" });
		sub.setDepth(7);

		this.cameras.main.setBackgroundColor("#1b2233");
	}

	create() {
		this.editorCreate();
	}
}

/* END OF COMPILED CODE */
