
// You can write more code here

/* START OF COMPILED CODE */

class CourtyardV2 extends Phaser.Scene {

	constructor() {
		super("CourtyardV2");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	/** @returns {void} */
	editorCreate() {

		// courtyardGround
		this.cache.tilemap.add("courtyardGround_79a8a5b4-2f74-4cd6-a031-e2045a43b238", {
			format: 1,
			data: {
				width: 80,
				height: 60,
				orientation: "orthogonal",
				tilewidth: 32,
				tileheight: 32,
				tilesets: [
					{
						columns: 4,
						margin: 0,
						spacing: 0,
						tilewidth: 32,
						tileheight: 32,
						tilecount: 16,
						firstgid: 1,
						image: "ground-tileset-grass-dirt-32",
						name: "grass-dirt",
						imagewidth: 128,
						imageheight: 128,
					},
					{
						columns: 4,
						margin: 0,
						spacing: 0,
						tilewidth: 32,
						tileheight: 32,
						tilecount: 16,
						firstgid: 17,
						image: "ground-tileset-dirt-paving-32",
						name: "dirt-paving",
						imagewidth: 128,
						imageheight: 128,
					},
					{
						columns: 4,
						margin: 0,
						spacing: 0,
						tilewidth: 32,
						tileheight: 32,
						tilecount: 16,
						firstgid: 33,
						image: "ground-tileset-dirt-floor-32",
						name: "castle-floor",
						imagewidth: 128,
						imageheight: 128,
					},
					{
						columns: 4,
						margin: 0,
						spacing: 0,
						tilewidth: 32,
						tileheight: 32,
						tilecount: 16,
						firstgid: 49,
						image: "ground-tileset-forestfloor-dirt-32",
						name: "ground-tileset-forestfloor-dirt-32",
						imagewidth: 128,
						imageheight: 128,
					},
					{
						columns: 4,
						margin: 0,
						spacing: 0,
						tilewidth: 32,
						tileheight: 32,
						tilecount: 16,
						firstgid: 65,
						image: "ground-tileset-tan-kerb-32",
						name: "ground-tileset-tan-kerb-32",
						imagewidth: 128,
						imageheight: 128,
					},
				],
				layers: [
					{
						type: "tilelayer",
						name: "ground",
						width: 80,
						height: 60,
						opacity: 1,
						data: [64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 33, 33, 33, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 33, 33, 33, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 33, 33, 33, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 43, 33, 38, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 43, 33, 38, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 43, 33, 38, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 43, 33, 38, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 43, 33, 38, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 64, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 43, 33, 38, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 43, 45, 38, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 43, 33, 38, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 43, 34, 38, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 43, 37, 38, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 16, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 43, 33, 38, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 16, 16, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 16, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 16, 16, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 16, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 16, 16, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 16, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 16, 16, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 16, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 33, 33, 33, 33, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 16, 16, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 33, 33, 33, 33, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 33, 33, 33, 33, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 33, 33, 33, 33, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 63, 61, 61, 61, 62, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 33, 33, 33, 33, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 59, 49, 49, 49, 54, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 33, 33, 33, 33, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 63, 57, 49, 49, 49, 54, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 33, 33, 33, 33, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 60, 51, 49, 49, 49, 53, 62, 64, 64, 64, 64, 64, 64, 16, 16, 11, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 65, 33, 33, 33, 33, 65, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 59, 49, 49, 49, 49, 54, 64, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 5, 13, 9, 1, 1, 1, 1, 5, 14, 16, 16, 12, 4, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 5, 13, 9, 5, 9, 1, 1, 1, 1, 1, 1, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 59, 49, 49, 49, 49, 53, 62, 16, 16, 16, 16, 16, 16, 16, 12, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 8, 16, 16, 16, 15, 9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 8, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 16, 12, 4, 4, 4, 4, 4, 8, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 6, 16, 64, 64, 64, 64, 63, 62, 63, 61, 62, 64, 64, 64, 64, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 8, 16, 64, 64, 64, 63, 57, 53, 57, 49, 54, 64, 64, 64, 64, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 13, 9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 5, 13, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 12, 3, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 12, 3, 1, 1, 1, 2, 8, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 12, 4, 4, 4, 4, 4, 3, 1, 1, 1, 2, 4, 4, 4, 4, 4, 8, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 9, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 5, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 12, 4, 4, 4, 4, 8, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 5, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 31, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 30, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 27, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 22, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 5, 9, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 28, 19, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 18, 24, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 12, 3, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 27, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 22, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 13, 13, 13, 13, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 13, 9, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 28, 20, 19, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 18, 20, 24, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 13, 9, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 12, 3, 1, 1, 1, 1, 1, 1, 5, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 28, 19, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 18, 24, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 13, 13, 9, 1, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 28, 20, 20, 19, 18, 20, 20, 20, 19, 18, 20, 24, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 28, 24, 16, 16, 16, 28, 24, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 13, 13, 13, 13, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 12, 3, 1, 1, 1, 5, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 5, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 5, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 5, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 12, 3, 1, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 5, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16],
					},
				],
			},
		});
		const courtyardGround = this.add.tilemap("courtyardGround_79a8a5b4-2f74-4cd6-a031-e2045a43b238");
		courtyardGround.addTilesetImage("grass-dirt", "ground-tileset-grass-dirt-32");
		courtyardGround.addTilesetImage("dirt-paving", "ground-tileset-dirt-paving-32");
		courtyardGround.addTilesetImage("castle-floor", "ground-tileset-dirt-floor-32");
		courtyardGround.addTilesetImage("ground-tileset-forestfloor-dirt-32");
		courtyardGround.addTilesetImage("ground-tileset-tan-kerb-32");

		// VIEWPORT_zoom2_960x540
		const vIEWPORT_zoom2_960x540 = this.add.rectangle(844, 2091, 960, 540);
		vIEWPORT_zoom2_960x540.setOrigin(0, 0);
		vIEWPORT_zoom2_960x540.isStroked = true;
		vIEWPORT_zoom2_960x540.strokeColor = 16763904;
		vIEWPORT_zoom2_960x540.lineWidth = 6;

		// L1_GROUND
		const l1_GROUND = this.add.layer();

		// ground
		const ground = courtyardGround.createLayer("ground", ["ground-tileset-forestfloor-dirt-32","grass-dirt","ground-tileset-tan-kerb-32","castle-floor","dirt-paving"], 0, 0);
		l1_GROUND.add(ground);

		// APRON_pebblesA
		const aPRON_pebblesA = this.add.image(1200, 1256, "ground-overlay-pebbles-scuffs");
		aPRON_pebblesA.scaleX = 0.8;
		aPRON_pebblesA.scaleY = 0.8;
		aPRON_pebblesA.setOrigin(0.5, 0);
		l1_GROUND.add(aPRON_pebblesA);

		// APRON_pebblesB
		const aPRON_pebblesB = this.add.image(1455, 1262, "ground-overlay-pebbles-scuffs");
		aPRON_pebblesB.scaleX = 0.75;
		aPRON_pebblesB.scaleY = 0.75;
		aPRON_pebblesB.setOrigin(0.5, 0);
		aPRON_pebblesB.flipX = true;
		l1_GROUND.add(aPRON_pebblesB);

		// SHADOW_forge
		const sHADOW_forge = this.add.image(1733, 485, "shadow-contact");
		sHADOW_forge.scaleX = 2.05;
		sHADOW_forge.alpha = 0.85;
		l1_GROUND.add(sHADOW_forge);

		// SHADOW_archivist
		const sHADOW_archivist = this.add.image(915, 484, "shadow-contact");
		sHADOW_archivist.scaleX = 2.05;
		sHADOW_archivist.alpha = 0.85;
		l1_GROUND.add(sHADOW_archivist);

		// L2_TERRAIN
		const l2_TERRAIN = this.add.layer();

		// halo_stone_castle_terrain_wall_endcap_1
		const halo_stone_castle_terrain_wall_endcap_1 = this.add.image(1790, 1558, "terrain-wall-endcap");
		halo_stone_castle_terrain_wall_endcap_1.scaleX = -1;
		l2_TERRAIN.add(halo_stone_castle_terrain_wall_endcap_1);

		// wallBandC_2
		const wallBandC_2 = this.add.image(1117, 1528, "terrain-wall-face-rock");
		wallBandC_2.setOrigin(0, 0);
		l2_TERRAIN.add(wallBandC_2);

		// halo_stone_castle_terrain_wall_boulders
		const halo_stone_castle_terrain_wall_boulders = this.add.image(2012, 1696, "terrain-wall-boulders");
		l2_TERRAIN.add(halo_stone_castle_terrain_wall_boulders);

		// halo_stone_castle_terrain_wall_endcap_2
		const halo_stone_castle_terrain_wall_endcap_2 = this.add.image(2286, 1376, "terrain-wall-endcap");
		halo_stone_castle_terrain_wall_endcap_2.scaleX = -1;
		l2_TERRAIN.add(halo_stone_castle_terrain_wall_endcap_2);

		// wallBandC_4
		const wallBandC_4 = this.add.tileSprite(2353, 1262, 206, 256, "terrain-wall-face-rock");
		wallBandC_4.setOrigin(0, 0);
		l2_TERRAIN.add(wallBandC_4);

		// wallBandC
		const wallBandC = this.add.tileSprite(1885, 1430, 674, 256, "terrain-wall-face-rock");
		wallBandC.setOrigin(0, 0);
		l2_TERRAIN.add(wallBandC);

		// wallStair
		const wallStair = this.add.image(1173, 1533, "terrain-wall-stair");
		wallStair.scaleX = 1.6607407900003772;
		wallStair.scaleY = 0.8860267326421837;
		wallStair.setOrigin(0, 0);
		l2_TERRAIN.add(wallStair);

		// wallPillarLeft
		const wallPillarLeft = this.add.image(1169, 1519, "terrain-wall-pillar");
		wallPillarLeft.setOrigin(0, 0);
		l2_TERRAIN.add(wallPillarLeft);

		// wallPillarRight
		const wallPillarRight = this.add.image(1450, 1521, "terrain-wall-pillar");
		wallPillarRight.setOrigin(0, 0);
		wallPillarRight.flipX = true;
		l2_TERRAIN.add(wallPillarRight);

		// wallBandC_1
		const wallBandC_1 = this.add.image(0, 1406, "terrain-wall-face-rock");
		wallBandC_1.setOrigin(0, 0);
		l2_TERRAIN.add(wallBandC_1);

		// halo_stone_castle_terrain_wall_endcap_4
		const halo_stone_castle_terrain_wall_endcap_4 = this.add.image(817, 1531, "terrain-wall-endcap");
		l2_TERRAIN.add(halo_stone_castle_terrain_wall_endcap_4);

		// wallBandC_3
		const wallBandC_3 = this.add.image(350, 1528, "terrain-wall-face-rock");
		wallBandC_3.setOrigin(0, 0);
		l2_TERRAIN.add(wallBandC_3);

		// halo_stone_castle_terrain_wall_endcap
		const halo_stone_castle_terrain_wall_endcap = this.add.image(1971, 1657, "terrain-wall-endcap");
		l2_TERRAIN.add(halo_stone_castle_terrain_wall_endcap);

		// halo_stone_castle_terrain_wall_endcap_3
		const halo_stone_castle_terrain_wall_endcap_3 = this.add.image(272, 1656, "terrain-wall-endcap");
		halo_stone_castle_terrain_wall_endcap_3.scaleX = -1;
		l2_TERRAIN.add(halo_stone_castle_terrain_wall_endcap_3);

		// L2_TERRAIN_1
		const l2_TERRAIN_1 = this.add.layer();

		// halo_stone_castle_terrain_wall_endcap_5
		const halo_stone_castle_terrain_wall_endcap_5 = this.add.image(1790, 1558, "terrain-wall-endcap");
		halo_stone_castle_terrain_wall_endcap_5.scaleX = -1;
		l2_TERRAIN_1.add(halo_stone_castle_terrain_wall_endcap_5);

		// wallBandC_5
		const wallBandC_5 = this.add.image(1117, 1528, "terrain-wall-face-rock");
		wallBandC_5.setOrigin(0, 0);
		l2_TERRAIN_1.add(wallBandC_5);

		// halo_stone_castle_terrain_wall_boulders_1
		const halo_stone_castle_terrain_wall_boulders_1 = this.add.image(2012, 1696, "terrain-wall-boulders");
		l2_TERRAIN_1.add(halo_stone_castle_terrain_wall_boulders_1);

		// halo_stone_castle_terrain_wall_endcap_6
		const halo_stone_castle_terrain_wall_endcap_6 = this.add.image(2286, 1376, "terrain-wall-endcap");
		halo_stone_castle_terrain_wall_endcap_6.scaleX = -1;
		l2_TERRAIN_1.add(halo_stone_castle_terrain_wall_endcap_6);

		// wallBandC_6
		const wallBandC_6 = this.add.tileSprite(2353, 1262, 206, 256, "terrain-wall-face-rock");
		wallBandC_6.setOrigin(0, 0);
		l2_TERRAIN_1.add(wallBandC_6);

		// wallBandC_7
		const wallBandC_7 = this.add.tileSprite(1885, 1430, 674, 256, "terrain-wall-face-rock");
		wallBandC_7.setOrigin(0, 0);
		l2_TERRAIN_1.add(wallBandC_7);

		// wallStair_1
		const wallStair_1 = this.add.image(1173, 1533, "terrain-wall-stair");
		wallStair_1.scaleX = 1.6607407900003772;
		wallStair_1.scaleY = 0.8860267326421837;
		wallStair_1.setOrigin(0, 0);
		l2_TERRAIN_1.add(wallStair_1);

		// wallPillarLeft_1
		const wallPillarLeft_1 = this.add.image(1169, 1519, "terrain-wall-pillar");
		wallPillarLeft_1.setOrigin(0, 0);
		l2_TERRAIN_1.add(wallPillarLeft_1);

		// wallPillarRight_1
		const wallPillarRight_1 = this.add.image(1450, 1521, "terrain-wall-pillar");
		wallPillarRight_1.setOrigin(0, 0);
		wallPillarRight_1.flipX = true;
		l2_TERRAIN_1.add(wallPillarRight_1);

		// wallBandC_8
		const wallBandC_8 = this.add.image(0, 1406, "terrain-wall-face-rock");
		wallBandC_8.setOrigin(0, 0);
		l2_TERRAIN_1.add(wallBandC_8);

		// halo_stone_castle_terrain_wall_endcap_7
		const halo_stone_castle_terrain_wall_endcap_7 = this.add.image(817, 1531, "terrain-wall-endcap");
		l2_TERRAIN_1.add(halo_stone_castle_terrain_wall_endcap_7);

		// wallBandC_9
		const wallBandC_9 = this.add.image(350, 1528, "terrain-wall-face-rock");
		wallBandC_9.setOrigin(0, 0);
		l2_TERRAIN_1.add(wallBandC_9);

		// halo_stone_castle_terrain_wall_endcap_8
		const halo_stone_castle_terrain_wall_endcap_8 = this.add.image(1971, 1657, "terrain-wall-endcap");
		l2_TERRAIN_1.add(halo_stone_castle_terrain_wall_endcap_8);

		// halo_stone_castle_terrain_wall_endcap_9
		const halo_stone_castle_terrain_wall_endcap_9 = this.add.image(272, 1656, "terrain-wall-endcap");
		halo_stone_castle_terrain_wall_endcap_9.scaleX = -1;
		l2_TERRAIN_1.add(halo_stone_castle_terrain_wall_endcap_9);

		// L13_Forest_Under_Brush
		this.add.layer();

		// L12.5 Back Canopy
		const l12_5_Back_Canopy = this.add.layer();

		// nature_tree_broadleaf_large_21
		const nature_tree_broadleaf_large_21 = this.add.image(426, -119, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_21.scaleX = 3;
		nature_tree_broadleaf_large_21.scaleY = 3;
		l12_5_Back_Canopy.add(nature_tree_broadleaf_large_21);

		// nature_tree_broadleaf_large_26
		const nature_tree_broadleaf_large_26 = this.add.image(1592, -121, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_26.scaleX = 3;
		nature_tree_broadleaf_large_26.scaleY = 3;
		l12_5_Back_Canopy.add(nature_tree_broadleaf_large_26);

		// nature_tree_broadleaf_large_27
		const nature_tree_broadleaf_large_27 = this.add.image(1734, -97, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_27.scaleX = 3;
		nature_tree_broadleaf_large_27.scaleY = 3;
		l12_5_Back_Canopy.add(nature_tree_broadleaf_large_27);

		// nature_tree_broadleaf_large_28
		const nature_tree_broadleaf_large_28 = this.add.image(1891, -64, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_28.scaleX = 3;
		nature_tree_broadleaf_large_28.scaleY = 3;
		l12_5_Back_Canopy.add(nature_tree_broadleaf_large_28);

		// nature_tree_broadleaf_large_22
		const nature_tree_broadleaf_large_22 = this.add.image(558, -68, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_22.scaleX = 3;
		nature_tree_broadleaf_large_22.scaleY = 3;
		l12_5_Back_Canopy.add(nature_tree_broadleaf_large_22);

		// nature_tree_broadleaf_large_23
		const nature_tree_broadleaf_large_23 = this.add.image(767, -137, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_23.scaleX = 3;
		nature_tree_broadleaf_large_23.scaleY = 3;
		l12_5_Back_Canopy.add(nature_tree_broadleaf_large_23);

		// nature_tree_broadleaf_large_24
		const nature_tree_broadleaf_large_24 = this.add.image(909, -73, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_24.scaleX = 3;
		nature_tree_broadleaf_large_24.scaleY = 3;
		l12_5_Back_Canopy.add(nature_tree_broadleaf_large_24);

		// nature_tree_broadleaf_large_29
		const nature_tree_broadleaf_large_29 = this.add.image(1181, -117, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_29.scaleX = 3;
		nature_tree_broadleaf_large_29.scaleY = 3;
		l12_5_Back_Canopy.add(nature_tree_broadleaf_large_29);

		// nature_tree_broadleaf_large_30
		const nature_tree_broadleaf_large_30 = this.add.image(1333, -63, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_30.scaleX = 3;
		nature_tree_broadleaf_large_30.scaleY = 3;
		l12_5_Back_Canopy.add(nature_tree_broadleaf_large_30);

		// nature_tree_broadleaf_large_33
		const nature_tree_broadleaf_large_33 = this.add.image(2189, -97, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_33.scaleX = 3;
		nature_tree_broadleaf_large_33.scaleY = 3;
		l12_5_Back_Canopy.add(nature_tree_broadleaf_large_33);

		// nature_tree_broadleaf_large_31
		const nature_tree_broadleaf_large_31 = this.add.image(1480, -60, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_31.scaleX = 3;
		nature_tree_broadleaf_large_31.scaleY = 3;
		l12_5_Back_Canopy.add(nature_tree_broadleaf_large_31);

		// nature_tree_broadleaf_large_25
		const nature_tree_broadleaf_large_25 = this.add.image(1066, -80, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_25.scaleX = 3;
		nature_tree_broadleaf_large_25.scaleY = 3;
		l12_5_Back_Canopy.add(nature_tree_broadleaf_large_25);

		// nature_tree_broadleaf_large_20
		const nature_tree_broadleaf_large_20 = this.add.image(725, -62, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_20.scaleX = 3;
		nature_tree_broadleaf_large_20.scaleY = 3;
		l12_5_Back_Canopy.add(nature_tree_broadleaf_large_20);

		// nature_tree_broadleaf_large_32
		const nature_tree_broadleaf_large_32 = this.add.image(2046, -99, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_32.scaleX = 3;
		nature_tree_broadleaf_large_32.scaleY = 3;
		l12_5_Back_Canopy.add(nature_tree_broadleaf_large_32);

		// L3_CASTLE
		const l3_CASTLE = this.add.layer();

		// PASS_wallSouthB
		const pASS_wallSouthB = this.add.image(1799, 928, "wall-straight-v2");
		pASS_wallSouthB.scaleX = -1;
		pASS_wallSouthB.setOrigin(0, 0);
		l3_CASTLE.add(pASS_wallSouthB);

		// castleWallWest_1
		const castleWallWest_1 = this.add.image(855, 926, "wall-straight-v2");
		castleWallWest_1.scaleX = 1.021294935483723;
		castleWallWest_1.scaleY = 1.0046457310585395;
		castleWallWest_1.setOrigin(0, 0);
		l3_CASTLE.add(castleWallWest_1);

		// castleWallWest
		const castleWallWest = this.add.image(823, 926, "wall-straight-v2");
		castleWallWest.scaleX = 0.9;
		castleWallWest.scaleY = 0.9;
		castleWallWest.visible = false;
		l3_CASTLE.add(castleWallWest);

		// castleGate
		const castleGate = this.add.image(1128, 680, "gate-house-v2");
		castleGate.scaleX = 1.2965567858078328;
		castleGate.scaleY = 1.177636121263248;
		castleGate.setOrigin(0, 0);
		castleGate.visible = false;
		l3_CASTLE.add(castleGate);

		// PASS_wallSouthB_1
		const pASS_wallSouthB_1 = this.add.image(1678, 927, "wall-straight-v2");
		pASS_wallSouthB_1.scaleX = -1;
		pASS_wallSouthB_1.setOrigin(1, 0);
		l3_CASTLE.add(pASS_wallSouthB_1);

		// PASS_wallSouthA
		const pASS_wallSouthA = this.add.image(603, 926, "wall-straight-v2");
		pASS_wallSouthA.setOrigin(0, 0);
		l3_CASTLE.add(pASS_wallSouthA);

		// PASS_wallSouthC
		const pASS_wallSouthC = this.add.image(1312, 928, "wall-straight-v2");
		pASS_wallSouthC.setOrigin(0, 0);
		pASS_wallSouthC.visible = false;
		l3_CASTLE.add(pASS_wallSouthC);

		// RETIRED_wall_side_west_uncut
		const rETIRED_wall_side_west_uncut = this.add.image(523, 582, "wall-side");
		rETIRED_wall_side_west_uncut.scaleX = 1.142292861719713;
		rETIRED_wall_side_west_uncut.scaleY = 1.3873158625341773;
		rETIRED_wall_side_west_uncut.visible = false;
		l3_CASTLE.add(rETIRED_wall_side_west_uncut);

		// PASS_wallSouthD
		const pASS_wallSouthD = this.add.image(1696, 928, "wall-straight-v2");
		pASS_wallSouthD.setOrigin(0, 0);
		pASS_wallSouthD.visible = false;
		l3_CASTLE.add(pASS_wallSouthD);

		// SHELF_gate_drawbridge_V5
		const sHELF_gate_drawbridge_V5 = this.add.image(1506, 1052, "gate-drawbridge-v5");
		sHELF_gate_drawbridge_V5.setOrigin(1, 0.5);
		l3_CASTLE.add(sHELF_gate_drawbridge_V5);

		// SHELF_wall_corner_turn
		const sHELF_wall_corner_turn = this.add.image(2919, 925, "wall-corner-turn");
		sHELF_wall_corner_turn.scaleX = 1.6174553850910134;
		sHELF_wall_corner_turn.scaleY = 1.5093493504936581;
		sHELF_wall_corner_turn.setOrigin(0, 0);
		l3_CASTLE.add(sHELF_wall_corner_turn);

		// SHELF_wall_straight_v2
		const sHELF_wall_straight_v2 = this.add.image(2856, 601, "wall-straight-v2");
		sHELF_wall_straight_v2.setOrigin(0, 0);
		l3_CASTLE.add(sHELF_wall_straight_v2);

		// SHELF_gate_house_v2
		const sHELF_gate_house_v2 = this.add.image(2927, 1266, "gate-house-v2");
		sHELF_gate_house_v2.setOrigin(0, 0);
		l3_CASTLE.add(sHELF_gate_house_v2);

		// SHELF_corner_outer_v2
		const sHELF_corner_outer_v2 = this.add.image(2982, 1629, "wall-corner-outer-v2");
		sHELF_corner_outer_v2.setOrigin(0, 0);
		l3_CASTLE.add(sHELF_corner_outer_v2);

		// castleWall_west_seg1
		const castleWall_west_seg1 = this.add.tileSprite(523, 49.27000045776367, 192, 128, "wall-side");
		castleWall_west_seg1.scaleX = 1.142292861719713;
		castleWall_west_seg1.scaleY = 1.3873158625341773;
		castleWall_west_seg1.setOrigin(0.5, 0);
		l3_CASTLE.add(castleWall_west_seg1);

		// castleWall_west_seg2
		const castleWall_west_seg2 = this.add.tileSprite(523, 226.85000610351562, 192, 128, "wall-side");
		castleWall_west_seg2.scaleX = 1.142292861719713;
		castleWall_west_seg2.scaleY = 1.3873158625341773;
		castleWall_west_seg2.setOrigin(0.5, 0);
		castleWall_west_seg2.tilePositionY = 128;
		l3_CASTLE.add(castleWall_west_seg2);

		// castleWall_west_seg3
		const castleWall_west_seg3 = this.add.tileSprite(523, 404.4200134277344, 192, 128, "wall-side");
		castleWall_west_seg3.scaleX = 1.142292861719713;
		castleWall_west_seg3.scaleY = 1.3873158625341773;
		castleWall_west_seg3.setOrigin(0.5, 0);
		castleWall_west_seg3.tilePositionY = 256;
		l3_CASTLE.add(castleWall_west_seg3);

		// castleWall_west_seg4
		const castleWall_west_seg4 = this.add.tileSprite(523, 582, 192, 128, "wall-side");
		castleWall_west_seg4.scaleX = 1.142292861719713;
		castleWall_west_seg4.scaleY = 1.3873158625341773;
		castleWall_west_seg4.setOrigin(0.5, 0);
		castleWall_west_seg4.tilePositionY = 384;
		l3_CASTLE.add(castleWall_west_seg4);

		// RETIRED_wall_side_east_uncut
		const rETIRED_wall_side_east_uncut = this.add.image(2110, 583, "wall-side");
		rETIRED_wall_side_east_uncut.scaleX = 1.142292861719713;
		rETIRED_wall_side_east_uncut.scaleY = 1.3873158625341773;
		rETIRED_wall_side_east_uncut.visible = false;
		l3_CASTLE.add(rETIRED_wall_side_east_uncut);

		// castleWall_west_seg5
		const castleWall_west_seg5 = this.add.tileSprite(523, 759.5800170898438, 192, 128, "wall-side");
		castleWall_west_seg5.scaleX = 1.142292861719713;
		castleWall_west_seg5.scaleY = 1.3873158625341773;
		castleWall_west_seg5.setOrigin(0.5, 0);
		castleWall_west_seg5.tilePositionY = 512;
		l3_CASTLE.add(castleWall_west_seg5);

		// SHELF_wall_north_1
		const sHELF_wall_north_1 = this.add.image(1312, -6, "wall-north");
		sHELF_wall_north_1.scaleX = 1.002714667991714;
		sHELF_wall_north_1.scaleY = 1.1;
		sHELF_wall_north_1.setOrigin(0, 0);
		l3_CASTLE.add(sHELF_wall_north_1);

		// castleWall_west_seg6
		const castleWall_west_seg6 = this.add.tileSprite(523, 937.1500244140625, 192, 128, "wall-side");
		castleWall_west_seg6.scaleX = 1.142292861719713;
		castleWall_west_seg6.scaleY = 1.3873158625341773;
		castleWall_west_seg6.setOrigin(0.5, 0);
		castleWall_west_seg6.tilePositionY = 640;
		l3_CASTLE.add(castleWall_west_seg6);

		// castleWall_east_seg2
		const castleWall_east_seg2 = this.add.tileSprite(2110, 227.85000610351562, 192, 128, "wall-side");
		castleWall_east_seg2.scaleX = 1.142292861719713;
		castleWall_east_seg2.scaleY = 1.3873158625341773;
		castleWall_east_seg2.setOrigin(0.5, 0);
		castleWall_east_seg2.tilePositionY = 128;
		l3_CASTLE.add(castleWall_east_seg2);

		// castleWall_east_seg3
		const castleWall_east_seg3 = this.add.tileSprite(2110, 405.4200134277344, 192, 128, "wall-side");
		castleWall_east_seg3.scaleX = 1.142292861719713;
		castleWall_east_seg3.scaleY = 1.3873158625341773;
		castleWall_east_seg3.setOrigin(0.5, 0);
		castleWall_east_seg3.tilePositionY = 256;
		l3_CASTLE.add(castleWall_east_seg3);

		// castleWall_east_seg4
		const castleWall_east_seg4 = this.add.tileSprite(2110, 583, 192, 128, "wall-side");
		castleWall_east_seg4.scaleX = 1.142292861719713;
		castleWall_east_seg4.scaleY = 1.3873158625341773;
		castleWall_east_seg4.setOrigin(0.5, 0);
		castleWall_east_seg4.tilePositionY = 384;
		l3_CASTLE.add(castleWall_east_seg4);

		// castleWall_east_seg5
		const castleWall_east_seg5 = this.add.tileSprite(2110, 760.5800170898438, 192, 128, "wall-side");
		castleWall_east_seg5.scaleX = 1.142292861719713;
		castleWall_east_seg5.scaleY = 1.3873158625341773;
		castleWall_east_seg5.setOrigin(0.5, 0);
		castleWall_east_seg5.tilePositionY = 512;
		l3_CASTLE.add(castleWall_east_seg5);

		// castleWall_east_seg6
		const castleWall_east_seg6 = this.add.tileSprite(2110, 938.1500244140625, 192, 128, "wall-side");
		castleWall_east_seg6.scaleX = 1.142292861719713;
		castleWall_east_seg6.scaleY = 1.3873158625341773;
		castleWall_east_seg6.setOrigin(0.5, 0);
		castleWall_east_seg6.tilePositionY = 640;
		l3_CASTLE.add(castleWall_east_seg6);

		// castleWall_east_seg1
		const castleWall_east_seg1 = this.add.tileSprite(2110, 50.27000045776367, 192, 128, "wall-side");
		castleWall_east_seg1.scaleX = 1.142292861719713;
		castleWall_east_seg1.scaleY = 1.3873158625341773;
		castleWall_east_seg1.setOrigin(0.5, 0);
		l3_CASTLE.add(castleWall_east_seg1);

		// castleTowerBackRight
		const castleTowerBackRight = this.add.image(3402, 685, "tower-watch-v2");
		castleTowerBackRight.scaleX = -1.1;
		castleTowerBackRight.scaleY = 1.1;
		l3_CASTLE.add(castleTowerBackRight);

		// castleTowerWest_1
		const castleTowerWest_1 = this.add.image(1913, 679, "tower-watch-v2");
		castleTowerWest_1.scaleX = 1.4;
		castleTowerWest_1.scaleY = 1.4;
		castleTowerWest_1.setOrigin(0, 0);
		l3_CASTLE.add(castleTowerWest_1);

		// castleTowerWest_2
		const castleTowerWest_2 = this.add.image(321, 681, "tower-watch-v2");
		castleTowerWest_2.scaleX = 1.4;
		castleTowerWest_2.scaleY = 1.4;
		castleTowerWest_2.setOrigin(0, 0);
		l3_CASTLE.add(castleTowerWest_2);

		// SHELF_wall_north
		const sHELF_wall_north = this.add.image(574, -6, "wall-north");
		sHELF_wall_north.scaleX = 1.002714667991714;
		sHELF_wall_north.scaleY = 1.1;
		sHELF_wall_north.setOrigin(0, 0);
		l3_CASTLE.add(sHELF_wall_north);

		// L12_FOREST_CANOPY
		const l12_FOREST_CANOPY = this.add.layer();

		// nature_tree_broadleaf_large
		const nature_tree_broadleaf_large = this.add.image(57, -117, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large.scaleX = 3;
		nature_tree_broadleaf_large.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large);

		// nature_shrub_young_tree_cluster
		const nature_shrub_young_tree_cluster = this.add.image(-269, 153, "nature-shrub-young-tree-cluster");
		l12_FOREST_CANOPY.add(nature_shrub_young_tree_cluster);

		// nature_tree_broadleaf_small
		const nature_tree_broadleaf_small = this.add.image(-292, -3, "nature-tree-broadleaf-small");
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_small);

		// nature_rocks_scrub_cluster
		const nature_rocks_scrub_cluster = this.add.image(-245, 279, "nature-rocks-scrub-cluster");
		l12_FOREST_CANOPY.add(nature_rocks_scrub_cluster);

		// nature_tree_broadleaf_large_9
		const nature_tree_broadleaf_large_9 = this.add.image(285, -123, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_9.scaleX = 3;
		nature_tree_broadleaf_large_9.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large_9);

		// nature_tree_broadleaf_large_3
		const nature_tree_broadleaf_large_3 = this.add.image(59, 43, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_3.scaleX = 3;
		nature_tree_broadleaf_large_3.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large_3);

		// nature_tree_broadleaf_large_2
		const nature_tree_broadleaf_large_2 = this.add.image(216, 77, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_2.scaleX = 3;
		nature_tree_broadleaf_large_2.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large_2);

		// nature_tree_broadleaf_large_7
		const nature_tree_broadleaf_large_7 = this.add.image(230, 210, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_7.scaleX = 3;
		nature_tree_broadleaf_large_7.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large_7);

		// nature_tree_broadleaf_large_8
		const nature_tree_broadleaf_large_8 = this.add.image(82, 242, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_8.scaleX = 3;
		nature_tree_broadleaf_large_8.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large_8);

		// nature_tree_broadleaf_large_5
		const nature_tree_broadleaf_large_5 = this.add.image(243, 406, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_5.scaleX = 3;
		nature_tree_broadleaf_large_5.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large_5);

		// nature_tree_broadleaf_large_6
		const nature_tree_broadleaf_large_6 = this.add.image(86, 458, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_6.scaleX = 3;
		nature_tree_broadleaf_large_6.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large_6);

		// nature_tree_broadleaf_large_4
		const nature_tree_broadleaf_large_4 = this.add.image(256, 640, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_4.scaleX = 3;
		nature_tree_broadleaf_large_4.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large_4);

		// nature_tree_broadleaf_large_1
		const nature_tree_broadleaf_large_1 = this.add.image(87, 707, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_1.scaleX = 3;
		nature_tree_broadleaf_large_1.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large_1);

		// nature_tree_broadleaf_large_10
		const nature_tree_broadleaf_large_10 = this.add.image(2337, -60, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_10.scaleX = 3;
		nature_tree_broadleaf_large_10.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large_10);

		// nature_tree_broadleaf_large_11
		const nature_tree_broadleaf_large_11 = this.add.image(2565, -66, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_11.scaleX = 3;
		nature_tree_broadleaf_large_11.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large_11);

		// nature_tree_broadleaf_large_12
		const nature_tree_broadleaf_large_12 = this.add.image(2339, 100, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_12.scaleX = 3;
		nature_tree_broadleaf_large_12.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large_12);

		// nature_tree_broadleaf_large_13
		const nature_tree_broadleaf_large_13 = this.add.image(2496, 134, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_13.scaleX = 3;
		nature_tree_broadleaf_large_13.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large_13);

		// nature_tree_broadleaf_large_14
		const nature_tree_broadleaf_large_14 = this.add.image(2510, 267, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_14.scaleX = 3;
		nature_tree_broadleaf_large_14.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large_14);

		// nature_tree_broadleaf_large_15
		const nature_tree_broadleaf_large_15 = this.add.image(2362, 299, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_15.scaleX = 3;
		nature_tree_broadleaf_large_15.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large_15);

		// nature_tree_broadleaf_large_16
		const nature_tree_broadleaf_large_16 = this.add.image(2523, 463, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_16.scaleX = 3;
		nature_tree_broadleaf_large_16.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large_16);

		// nature_tree_broadleaf_large_17
		const nature_tree_broadleaf_large_17 = this.add.image(2366, 515, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_17.scaleX = 3;
		nature_tree_broadleaf_large_17.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large_17);

		// nature_tree_broadleaf_large_18
		const nature_tree_broadleaf_large_18 = this.add.image(2536, 697, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_18.scaleX = 3;
		nature_tree_broadleaf_large_18.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large_18);

		// nature_tree_broadleaf_large_19
		const nature_tree_broadleaf_large_19 = this.add.image(2367, 764, "nature-tree-broadleaf-large");
		nature_tree_broadleaf_large_19.scaleX = 3;
		nature_tree_broadleaf_large_19.scaleY = 3;
		l12_FOREST_CANOPY.add(nature_tree_broadleaf_large_19);

		// L8_NATURE
		const l8_NATURE = this.add.layer();

		// footShrubB
		const footShrubB = this.add.image(1809, 1541, "nature-shrub-young-tree-cluster");
		footShrubB.setOrigin(0.5, 1);
		l8_NATURE.add(footShrubB);

		// entryShrubL
		const entryShrubL = this.add.image(641, 1486, "nature-shrub-young-tree-cluster");
		entryShrubL.scaleX = 0.85;
		entryShrubL.scaleY = 0.85;
		entryShrubL.setOrigin(0.5, 1);
		l8_NATURE.add(entryShrubL);

		// entryFootRockL
		const entryFootRockL = this.add.image(173, 1777, "nature-rocks-scrub-cluster");
		entryFootRockL.scaleX = 0.9;
		entryFootRockL.scaleY = 0.9;
		entryFootRockL.setOrigin(0.5, 1);
		l8_NATURE.add(entryFootRockL);

		// entryFootShrubL
		const entryFootShrubL = this.add.image(237, 1863, "nature-shrub-young-tree-cluster");
		entryFootShrubL.scaleX = 0.8;
		entryFootShrubL.scaleY = 0.8;
		entryFootShrubL.setOrigin(0.5, 1);
		entryFootShrubL.flipX = true;
		l8_NATURE.add(entryFootShrubL);

		// entryFootRockR
		const entryFootRockR = this.add.image(382, 1893, "nature-rocks-scrub-cluster");
		entryFootRockR.scaleX = 0.85;
		entryFootRockR.scaleY = 0.85;
		entryFootRockR.setOrigin(0.5, 1);
		entryFootRockR.flipX = true;
		l8_NATURE.add(entryFootRockR);

		// entryFootShrubR
		const entryFootShrubR = this.add.image(391, 1811, "nature-shrub-young-tree-cluster");
		entryFootShrubR.scaleX = 0.9;
		entryFootShrubR.scaleY = 0.9;
		entryFootShrubR.setOrigin(0.5, 1);
		l8_NATURE.add(entryFootShrubR);

		// entryGateTreeR
		const entryGateTreeR = this.add.image(84, 1835, "nature-tree-broadleaf-small");
		entryGateTreeR.setOrigin(0.5, 1);
		l8_NATURE.add(entryGateTreeR);

		// L4_QUADRANT_NE
		const l4_QUADRANT_NE = this.add.layer();

		// NE_apprentice_cardwright
		const nE_apprentice_cardwright = this.add.sprite(1563, 761, "anim-apprentice-cardwright-study-east", 0);
		nE_apprentice_cardwright.scaleX = 0.667;
		nE_apprentice_cardwright.scaleY = 0.667;
		nE_apprentice_cardwright.setOrigin(0.5, 1);
		l4_QUADRANT_NE.add(nE_apprentice_cardwright);

		// ARCHIVIST_A_as_generated
		const aRCHIVIST_A_as_generated = this.add.image(3144, -26, "archivist-v1");
		aRCHIVIST_A_as_generated.scaleX = 2;
		aRCHIVIST_A_as_generated.scaleY = 2;
		aRCHIVIST_A_as_generated.setOrigin(0.5, 1);
		l4_QUADRANT_NE.add(aRCHIVIST_A_as_generated);

		// ARCHIVIST_B_stone20
		const aRCHIVIST_B_stone20 = this.add.image(2420, -301, "archivist-v1-stone20");
		aRCHIVIST_B_stone20.scaleX = 2;
		aRCHIVIST_B_stone20.scaleY = 2;
		aRCHIVIST_B_stone20.setOrigin(0.5, 1);
		l4_QUADRANT_NE.add(aRCHIVIST_B_stone20);

		// COMPARE_B_pixellab_redraw
		const cOMPARE_B_pixellab_redraw = this.add.image(1731, 477, "forge-v2");
		cOMPARE_B_pixellab_redraw.scaleX = 2;
		cOMPARE_B_pixellab_redraw.scaleY = 2;
		cOMPARE_B_pixellab_redraw.setOrigin(0.5, 1);
		l4_QUADRANT_NE.add(cOMPARE_B_pixellab_redraw);

		// L5_QUADRANT_NW
		const l5_QUADRANT_NW = this.add.layer();

		// FORGE_A_castle_lavender
		const fORGE_A_castle_lavender = this.add.image(4462, 346, "forge-v1");
		fORGE_A_castle_lavender.scaleX = 2;
		fORGE_A_castle_lavender.scaleY = 2;
		fORGE_A_castle_lavender.setOrigin(0.5, 1);
		l5_QUADRANT_NW.add(fORGE_A_castle_lavender);

		// FORGE_B_warm_rock
		const fORGE_B_warm_rock = this.add.image(3151, 339, "forge-v1-warm");
		fORGE_B_warm_rock.scaleX = 2;
		fORGE_B_warm_rock.scaleY = 2;
		fORGE_B_warm_rock.setOrigin(0.5, 1);
		l5_QUADRANT_NW.add(fORGE_B_warm_rock);

		// L6_QUADRANT_SW
		this.add.layer();

		// L7_QUADRANT_SE
		this.add.layer();

		// L9_SHELF_offmap
		const l9_SHELF_offmap = this.add.layer();

		// FORGE_booth
		const fORGE_booth = this.add.image(4400, 200, "occluder-booth");
		fORGE_booth.scaleX = 1.4;
		fORGE_booth.scaleY = 1.4;
		fORGE_booth.setOrigin(0.5, 1);
		fORGE_booth.visible = false;
		l9_SHELF_offmap.add(fORGE_booth);

		// FORGE_awning
		const fORGE_awning = this.add.image(4400, 400, "occluder-awning-tent");
		fORGE_awning.scaleX = 1.4;
		fORGE_awning.scaleY = 1.4;
		fORGE_awning.setOrigin(0.5, 1);
		fORGE_awning.visible = false;
		l9_SHELF_offmap.add(fORGE_awning);

		// FORGE_brazier
		const fORGE_brazier = this.add.image(4400, 600, "occluder-brazier");
		fORGE_brazier.scaleX = 1.4;
		fORGE_brazier.scaleY = 1.4;
		fORGE_brazier.setOrigin(0.5, 1);
		fORGE_brazier.visible = false;
		l9_SHELF_offmap.add(fORGE_brazier);

		// FORGE_produceTable
		const fORGE_produceTable = this.add.image(4400, 800, "occluder-produce-table");
		fORGE_produceTable.scaleX = 1.4;
		fORGE_produceTable.scaleY = 1.4;
		fORGE_produceTable.setOrigin(0.5, 1);
		fORGE_produceTable.visible = false;
		l9_SHELF_offmap.add(fORGE_produceTable);

		// FORGE_crates
		const fORGE_crates = this.add.image(4400, 1000, "occluder-crates-south");
		fORGE_crates.scaleX = 1.4;
		fORGE_crates.scaleY = 1.4;
		fORGE_crates.setOrigin(0.5, 1);
		fORGE_crates.visible = false;
		l9_SHELF_offmap.add(fORGE_crates);

		// FORGE_barrel
		const fORGE_barrel = this.add.image(4400, 1200, "occluder-water-barrel");
		fORGE_barrel.scaleX = 1.4;
		fORGE_barrel.scaleY = 1.4;
		fORGE_barrel.setOrigin(0.5, 1);
		fORGE_barrel.visible = false;
		l9_SHELF_offmap.add(fORGE_barrel);

		// FORGE_keeperDwarf
		const fORGE_keeperDwarf = this.add.sprite(4400, 1400, "keeper-dwarf", 0);
		fORGE_keeperDwarf.scaleX = 1.408;
		fORGE_keeperDwarf.scaleY = 1.408;
		fORGE_keeperDwarf.setOrigin(0.5, 1);
		fORGE_keeperDwarf.visible = false;
		l9_SHELF_offmap.add(fORGE_keeperDwarf);

		// FORGE_heroForScale
		const fORGE_heroForScale = this.add.sprite(4400, 1600, "hero-chibi", 0);
		fORGE_heroForScale.scaleX = 1.408;
		fORGE_heroForScale.scaleY = 1.408;
		fORGE_heroForScale.setOrigin(0.5, 1);
		fORGE_heroForScale.visible = false;
		l9_SHELF_offmap.add(fORGE_heroForScale);

		// COMPARE_A_leonardo_cutout
		const cOMPARE_A_leonardo_cutout = this.add.image(3812, 326, "forge-v1");
		cOMPARE_A_leonardo_cutout.scaleX = 2;
		cOMPARE_A_leonardo_cutout.scaleY = 2;
		cOMPARE_A_leonardo_cutout.setOrigin(0.5, 1);
		l9_SHELF_offmap.add(cOMPARE_A_leonardo_cutout);

		// COMPARE_C_archivist_leonardo
		const cOMPARE_C_archivist_leonardo = this.add.image(3802, -28, "archivist-v1-stone20");
		cOMPARE_C_archivist_leonardo.scaleX = 2;
		cOMPARE_C_archivist_leonardo.scaleY = 2;
		cOMPARE_C_archivist_leonardo.setOrigin(0.5, 1);
		l9_SHELF_offmap.add(cOMPARE_C_archivist_leonardo);

		// COMPARE_D_archivist_pixellab
		const cOMPARE_D_archivist_pixellab = this.add.image(921, 480, "archivist-v2");
		cOMPARE_D_archivist_pixellab.scaleX = 2;
		cOMPARE_D_archivist_pixellab.scaleY = 2;
		cOMPARE_D_archivist_pixellab.setOrigin(0.5, 1);
		l9_SHELF_offmap.add(cOMPARE_D_archivist_pixellab);

		// L10_VOID_library
		const l10_VOID_library = this.add.layer();

		// VOID_griffin_curled
		const vOID_griffin_curled = this.add.image(-1033, -298, "griffin-cub-unknown");
		vOID_griffin_curled.setOrigin(0, 0);
		l10_VOID_library.add(vOID_griffin_curled);

		// VOID_apprentice
		const vOID_apprentice = this.add.image(-886, -298, "apprentice-unknown");
		vOID_apprentice.setOrigin(0, 0);
		l10_VOID_library.add(vOID_apprentice);

		// VOID_apprentice_f1
		const vOID_apprentice_f1 = this.add.image(-753, -308, "apprentice-frame-1");
		vOID_apprentice_f1.setOrigin(0, 0);
		l10_VOID_library.add(vOID_apprentice_f1);

		// VOID_apprentice_f2
		const vOID_apprentice_f2 = this.add.image(-616, -311, "apprentice-frame-2");
		vOID_apprentice_f2.setOrigin(0, 0);
		l10_VOID_library.add(vOID_apprentice_f2);

		// VOID_dragonkin
		const vOID_dragonkin = this.add.image(-458, -311, "forge-dragon-kin-unknown");
		vOID_dragonkin.setOrigin(0, 0);
		l10_VOID_library.add(vOID_dragonkin);

		// VOID_dragonkin_f0
		const vOID_dragonkin_f0 = this.add.image(-300, -306, "forge-dragon-kin-frame-0");
		vOID_dragonkin_f0.setOrigin(0, 0);
		l10_VOID_library.add(vOID_dragonkin_f0);

		// VOID_lectern_south
		const vOID_lectern_south = this.add.image(-871, 446, "lectern-south");
		vOID_lectern_south.setOrigin(0, 0);
		l10_VOID_library.add(vOID_lectern_south);

		// VOID_lectern_north
		const vOID_lectern_north = this.add.image(-671, 446, "lectern-north");
		vOID_lectern_north.setOrigin(0, 0);
		l10_VOID_library.add(vOID_lectern_north);

		// VOID_rug_0
		const vOID_rug_0 = this.add.image(-871, 666, "rugs-frame-0");
		vOID_rug_0.setOrigin(0, 0);
		l10_VOID_library.add(vOID_rug_0);

		// VOID_rug_1
		const vOID_rug_1 = this.add.image(-671, 666, "rugs-frame-1");
		vOID_rug_1.setOrigin(0, 0);
		l10_VOID_library.add(vOID_rug_1);

		// VOID_rug_2
		const vOID_rug_2 = this.add.image(-471, 666, "rugs-frame-2");
		vOID_rug_2.setOrigin(0, 0);
		l10_VOID_library.add(vOID_rug_2);

		// VOID_rug_3
		const vOID_rug_3 = this.add.image(-271, 666, "rugs-frame-3");
		vOID_rug_3.setOrigin(0, 0);
		l10_VOID_library.add(vOID_rug_3);

		// VOID_tree_0
		const vOID_tree_0 = this.add.image(-451, 29, "tree-blue-pine");
		vOID_tree_0.setOrigin(0, 0);
		l10_VOID_library.add(vOID_tree_0);

		// VOID_tree_2
		const vOID_tree_2 = this.add.image(-569, 165, "tree-green-bare");
		vOID_tree_2.setOrigin(0, 0);
		l10_VOID_library.add(vOID_tree_2);

		// VOID_tree_3
		const vOID_tree_3 = this.add.image(-457, 161, "tree-pale-bare");
		vOID_tree_3.setOrigin(0, 0);
		l10_VOID_library.add(vOID_tree_3);

		// VOID_forgingstand_south
		const vOID_forgingstand_south = this.add.image(-871, 1106, "forging-stand-south");
		vOID_forgingstand_south.setOrigin(0, 0);
		l10_VOID_library.add(vOID_forgingstand_south);

		// VOID_weaponrack_south
		const vOID_weaponrack_south = this.add.image(-671, 1106, "weapon-rack-south");
		vOID_weaponrack_south.setOrigin(0, 0);
		l10_VOID_library.add(vOID_weaponrack_south);

		// VOID_sortingtable_south
		const vOID_sortingtable_south = this.add.image(-471, 1106, "sorting-table-south");
		vOID_sortingtable_south.setOrigin(0, 0);
		l10_VOID_library.add(vOID_sortingtable_south);

		// VOID_handcart_south
		const vOID_handcart_south = this.add.image(-271, 1106, "hand-cart-south");
		vOID_handcart_south.setOrigin(0, 0);
		l10_VOID_library.add(vOID_handcart_south);

		// VOID_reliquary
		const vOID_reliquary = this.add.image(-871, 1326, "reliquary-frame-0");
		vOID_reliquary.setOrigin(0, 0);
		l10_VOID_library.add(vOID_reliquary);

		// VOID_crystal_eruption
		const vOID_crystal_eruption = this.add.image(-671, 1326, "crystal-eruption-frame-0");
		vOID_crystal_eruption.setOrigin(0, 0);
		l10_VOID_library.add(vOID_crystal_eruption);

		// VOID_crystal_mine
		const vOID_crystal_mine = this.add.image(-471, 1326, "crystal-mine-frame-0");
		vOID_crystal_mine.setOrigin(0, 0);
		l10_VOID_library.add(vOID_crystal_mine);

		// VOID_marketstall
		const vOID_marketstall = this.add.image(-271, 1326, "market-stall-unknown");
		vOID_marketstall.setOrigin(0, 0);
		l10_VOID_library.add(vOID_marketstall);

		// VOID_barrel
		const vOID_barrel = this.add.image(-871, 1546, "barrel-unknown");
		vOID_barrel.setOrigin(0, 0);
		l10_VOID_library.add(vOID_barrel);

		// VOID_crate
		const vOID_crate = this.add.image(-671, 1546, "crate-unknown");
		vOID_crate.setOrigin(0, 0);
		l10_VOID_library.add(vOID_crate);

		// VOID_towerwayup
		const vOID_towerwayup = this.add.image(-471, 1546, "tower-way-up-frame-0");
		vOID_towerwayup.setOrigin(0, 0);
		l10_VOID_library.add(vOID_towerwayup);

		// VOID_courtyardprops
		const vOID_courtyardprops = this.add.image(-271, 1546, "courtyard-props-frame-0");
		vOID_courtyardprops.setOrigin(0, 0);
		l10_VOID_library.add(vOID_courtyardprops);

		// tree_teal_willow
		const tree_teal_willow = this.add.image(-481, 118, "tree-teal-willow");
		l10_VOID_library.add(tree_teal_willow);

		// tree_yellow_leafy
		const tree_yellow_leafy = this.add.image(-764, 257, "tree-yellow-leafy");
		l10_VOID_library.add(tree_yellow_leafy);

		// tree_yellow_round
		const tree_yellow_round = this.add.image(-612, 258, "tree-yellow-round");
		l10_VOID_library.add(tree_yellow_round);

		// tree_yellow_willow
		const tree_yellow_willow = this.add.image(-762, 120, "tree-yellow-willow");
		l10_VOID_library.add(tree_yellow_willow);

		// tree_orange_autumn
		const tree_orange_autumn = this.add.image(-246, 465, "tree-orange-autumn");
		tree_orange_autumn.scaleX = 2.2219192985387357;
		tree_orange_autumn.scaleY = 2.059138334505369;
		l10_VOID_library.add(tree_orange_autumn);

		// PREVIEW_tower_cap_v2
		this.add.image(3409, 1475, "tower-cap-v2");

		// PREVIEW_tower_base_v2
		this.add.image(3427, 1735, "tower-base-v2");

		// PREVIEW_tower_full_forReference
		this.add.image(3425, 1095, "tower-watch-v2");

		// L20_GROUND_L0
		const l20_GROUND_L0 = this.add.layer();

		// PLATE_L0_lowGround
		const pLATE_L0_lowGround = this.add.rectangle(0, 1624, 2560, 296);
		pLATE_L0_lowGround.setOrigin(0, 0);
		pLATE_L0_lowGround.isFilled = true;
		pLATE_L0_lowGround.fillColor = 6750088;
		pLATE_L0_lowGround.fillAlpha = 0.25;
		pLATE_L0_lowGround.isStroked = true;
		pLATE_L0_lowGround.strokeColor = 6750088;
		pLATE_L0_lowGround.lineWidth = 3;
		l20_GROUND_L0.add(pLATE_L0_lowGround);

		// L21_GROUND_L1
		const l21_GROUND_L1 = this.add.layer();

		// PLATE_L1_castlePlateau
		const pLATE_L1_castlePlateau = this.add.rectangle(0, 0, 2560, 1528);
		pLATE_L1_castlePlateau.setOrigin(0, 0);
		pLATE_L1_castlePlateau.visible = false;
		pLATE_L1_castlePlateau.isFilled = true;
		pLATE_L1_castlePlateau.fillColor = 16768324;
		pLATE_L1_castlePlateau.fillAlpha = 0.25;
		pLATE_L1_castlePlateau.isStroked = true;
		pLATE_L1_castlePlateau.strokeColor = 16768324;
		pLATE_L1_castlePlateau.lineWidth = 3;
		l21_GROUND_L1.add(pLATE_L1_castlePlateau);

		// L23_RAMPS
		const l23_RAMPS = this.add.layer();

		// RAMP_greatStair
		const rAMP_greatStair = this.add.rectangle(1261, 1470, 185, 230);
		rAMP_greatStair.setOrigin(0, 0);
		rAMP_greatStair.isFilled = true;
		rAMP_greatStair.fillColor = 13395711;
		rAMP_greatStair.fillAlpha = 0.3;
		rAMP_greatStair.isStroked = true;
		rAMP_greatStair.strokeColor = 13395711;
		rAMP_greatStair.lineWidth = 3;
		l23_RAMPS.add(rAMP_greatStair);

		// L11_MARKERS
		const l11_MARKERS = this.add.layer();

		// scaleHeroTopOfStair
		const scaleHeroTopOfStair = this.add.sprite(1062, 1366, "hero-chibi", 0);
		scaleHeroTopOfStair.scaleX = 1.408;
		scaleHeroTopOfStair.scaleY = 1.408;
		scaleHeroTopOfStair.setOrigin(0.5, 1);
		l11_MARKERS.add(scaleHeroTopOfStair);

		// scaleHeroNative71px
		const scaleHeroNative71px = this.add.sprite(900, 1800, "hero-chibi", 0);
		scaleHeroNative71px.setOrigin(0.5, 1);
		l11_MARKERS.add(scaleHeroNative71px);

		// scaleHeroBesideTree
		const scaleHeroBesideTree = this.add.sprite(852, 1387, "hero-chibi", 0);
		scaleHeroBesideTree.scaleX = 1.408;
		scaleHeroBesideTree.scaleY = 1.408;
		scaleHeroBesideTree.setOrigin(0.5, 1);
		l11_MARKERS.add(scaleHeroBesideTree);

		// scaleHeroFootOfStair
		const scaleHeroFootOfStair = this.add.sprite(1397, 1808, "hero-chibi", 0);
		scaleHeroFootOfStair.scaleX = 1.408;
		scaleHeroFootOfStair.scaleY = 1.408;
		scaleHeroFootOfStair.setOrigin(0.5, 1);
		l11_MARKERS.add(scaleHeroFootOfStair);

		// L15_WILDLIFE
		const l15_WILDLIFE = this.add.layer();

		// ROAM_canopyEdge
		const rOAM_canopyEdge = this.add.rectangle(620, 210, 1380, 260);
		rOAM_canopyEdge.setOrigin(0, 0);
		rOAM_canopyEdge.visible = false;
		rOAM_canopyEdge.isFilled = true;
		rOAM_canopyEdge.fillColor = 3407752;
		rOAM_canopyEdge.fillAlpha = 0.12;
		rOAM_canopyEdge.isStroked = true;
		rOAM_canopyEdge.strokeColor = 3407752;
		rOAM_canopyEdge.strokeAlpha = 0.7;
		rOAM_canopyEdge.lineWidth = 3;
		l15_WILDLIFE.add(rOAM_canopyEdge);

		// ROAM_courtyardGreen
		const rOAM_courtyardGreen = this.add.rectangle(620, 480, 1380, 450);
		rOAM_courtyardGreen.setOrigin(0, 0);
		rOAM_courtyardGreen.visible = false;
		rOAM_courtyardGreen.isFilled = true;
		rOAM_courtyardGreen.fillColor = 3407752;
		rOAM_courtyardGreen.fillAlpha = 0.12;
		rOAM_courtyardGreen.isStroked = true;
		rOAM_courtyardGreen.strokeColor = 3407752;
		rOAM_courtyardGreen.strokeAlpha = 0.7;
		rOAM_courtyardGreen.lineWidth = 3;
		l15_WILDLIFE.add(rOAM_courtyardGreen);

		// ROAM_castleFront
		const rOAM_castleFront = this.add.rectangle(420, 1235, 1760, 155);
		rOAM_castleFront.setOrigin(0, 0);
		rOAM_castleFront.visible = false;
		rOAM_castleFront.isFilled = true;
		rOAM_castleFront.fillColor = 3407752;
		rOAM_castleFront.fillAlpha = 0.12;
		rOAM_castleFront.isStroked = true;
		rOAM_castleFront.strokeColor = 3407752;
		rOAM_castleFront.strokeAlpha = 0.7;
		rOAM_castleFront.lineWidth = 3;
		l15_WILDLIFE.add(rOAM_castleFront);

		// wildlifeFoxA
		const wildlifeFoxA = this.add.sprite(1035, 675, "wildlife-fox-trot", 0);
		wildlifeFoxA.scaleX = 0.45;
		wildlifeFoxA.scaleY = 0.45;
		wildlifeFoxA.setOrigin(0.5, 1);
		l15_WILDLIFE.add(wildlifeFoxA);

		// wildlifeRabbitA
		const wildlifeRabbitA = this.add.sprite(1377, 736, "wildlife-rabbit-hop", 0);
		wildlifeRabbitA.scaleX = 0.23;
		wildlifeRabbitA.scaleY = 0.23;
		wildlifeRabbitA.setOrigin(0.5, 1);
		l15_WILDLIFE.add(wildlifeRabbitA);

		// wildlifeRabbitB
		const wildlifeRabbitB = this.add.sprite(1020, 700, "wildlife-rabbit-hop", 0);
		wildlifeRabbitB.scaleX = 0.23;
		wildlifeRabbitB.scaleY = 0.23;
		wildlifeRabbitB.setOrigin(0.5, 1);
		l15_WILDLIFE.add(wildlifeRabbitB);

		// wildlifeFoxB
		const wildlifeFoxB = this.add.sprite(1780, 640, "wildlife-fox-trot", 0);
		wildlifeFoxB.scaleX = 0.45;
		wildlifeFoxB.scaleY = 0.45;
		wildlifeFoxB.setOrigin(0.5, 1);
		l15_WILDLIFE.add(wildlifeFoxB);

		// wildlifeTortoiseC
		const wildlifeTortoiseC = this.add.sprite(1150, 1320, "wildlife-tortoise-toddle", 0);
		wildlifeTortoiseC.scaleX = 0.32;
		wildlifeTortoiseC.scaleY = 0.32;
		wildlifeTortoiseC.setOrigin(0.5, 1);
		l15_WILDLIFE.add(wildlifeTortoiseC);

		// L14_COLLIDERS
		const l14_COLLIDERS = this.add.layer();
		l14_COLLIDERS.visible = false;

		// BLOCK_mapEdge_north
		const bLOCK_mapEdge_north = this.add.rectangle(0, -32, 2560, 32);
		bLOCK_mapEdge_north.setOrigin(0, 0);
		bLOCK_mapEdge_north.isFilled = true;
		bLOCK_mapEdge_north.fillColor = 16724821;
		bLOCK_mapEdge_north.fillAlpha = 0.35;
		bLOCK_mapEdge_north.isStroked = true;
		bLOCK_mapEdge_north.strokeColor = 16724821;
		bLOCK_mapEdge_north.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_mapEdge_north);

		// BLOCK_mapEdge_south
		const bLOCK_mapEdge_south = this.add.rectangle(0, 1920, 2560, 32);
		bLOCK_mapEdge_south.setOrigin(0, 0);
		bLOCK_mapEdge_south.isFilled = true;
		bLOCK_mapEdge_south.fillColor = 16724821;
		bLOCK_mapEdge_south.fillAlpha = 0.35;
		bLOCK_mapEdge_south.isStroked = true;
		bLOCK_mapEdge_south.strokeColor = 16724821;
		bLOCK_mapEdge_south.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_mapEdge_south);

		// BLOCK_mapEdge_west
		const bLOCK_mapEdge_west = this.add.rectangle(-32, 0, 32, 1920);
		bLOCK_mapEdge_west.setOrigin(0, 0);
		bLOCK_mapEdge_west.isFilled = true;
		bLOCK_mapEdge_west.fillColor = 16724821;
		bLOCK_mapEdge_west.fillAlpha = 0.35;
		bLOCK_mapEdge_west.isStroked = true;
		bLOCK_mapEdge_west.strokeColor = 16724821;
		bLOCK_mapEdge_west.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_mapEdge_west);

		// BLOCK_mapEdge_east
		const bLOCK_mapEdge_east = this.add.rectangle(2560, 0, 32, 1920);
		bLOCK_mapEdge_east.setOrigin(0, 0);
		bLOCK_mapEdge_east.isFilled = true;
		bLOCK_mapEdge_east.fillColor = 16724821;
		bLOCK_mapEdge_east.fillAlpha = 0.35;
		bLOCK_mapEdge_east.isStroked = true;
		bLOCK_mapEdge_east.strokeColor = 16724821;
		bLOCK_mapEdge_east.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_mapEdge_east);

		// BLOCK_cliff_centreEast
		const bLOCK_cliff_centreEast = this.add.rectangle(2062.6238589286804, 1654.964038848877, 439, 96);
		bLOCK_cliff_centreEast.scaleX = 1.3494578878555674;
		bLOCK_cliff_centreEast.scaleY = 2.645084036296617;
		bLOCK_cliff_centreEast.setOrigin(1, 0.5);
		bLOCK_cliff_centreEast.isFilled = true;
		bLOCK_cliff_centreEast.fillColor = 16724821;
		bLOCK_cliff_centreEast.fillAlpha = 0.35;
		bLOCK_cliff_centreEast.isStroked = true;
		bLOCK_cliff_centreEast.strokeColor = 16724821;
		bLOCK_cliff_centreEast.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_cliff_centreEast);

		// ZONE_castleGate_passage
		const zONE_castleGate_passage = this.add.rectangle(1274, 1100, 102, 116);
		zONE_castleGate_passage.setOrigin(0, 0);
		zONE_castleGate_passage.isFilled = true;
		zONE_castleGate_passage.fillColor = 3394815;
		zONE_castleGate_passage.fillAlpha = 0.35;
		zONE_castleGate_passage.isStroked = true;
		zONE_castleGate_passage.strokeColor = 3394815;
		zONE_castleGate_passage.lineWidth = 2;
		l14_COLLIDERS.add(zONE_castleGate_passage);

		// BLOCK_castleWall_north
		const bLOCK_castleWall_north = this.add.rectangle(1337.5, 204.25506460666656, 1805, 250);
		bLOCK_castleWall_north.scaleY = 0.4747928169350183;
		bLOCK_castleWall_north.setOrigin(0.5, 1);
		bLOCK_castleWall_north.isFilled = true;
		bLOCK_castleWall_north.fillColor = 16724821;
		bLOCK_castleWall_north.fillAlpha = 0.35;
		bLOCK_castleWall_north.isStroked = true;
		bLOCK_castleWall_north.strokeColor = 16724821;
		bLOCK_castleWall_north.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_castleWall_north);

		// BLOCK_castleWall_west
		const bLOCK_castleWall_west = this.add.rectangle(526.6244426965714, 1211.9981632232666, 164, 992);
		bLOCK_castleWall_west.scaleX = 0.9449087992688273;
		bLOCK_castleWall_west.scaleY = 1.0133677105699197;
		bLOCK_castleWall_west.setOrigin(0.5, 1);
		bLOCK_castleWall_west.isFilled = true;
		bLOCK_castleWall_west.fillColor = 16724821;
		bLOCK_castleWall_west.fillAlpha = 0.35;
		bLOCK_castleWall_west.isStroked = true;
		bLOCK_castleWall_west.strokeColor = 16724821;
		bLOCK_castleWall_west.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_castleWall_west);

		// BLOCK_castleWall_east
		const bLOCK_castleWall_east = this.add.rectangle(2111.56492716074, 1210, 218, 992);
		bLOCK_castleWall_east.scaleX = 0.7114993917998818;
		bLOCK_castleWall_east.scaleY = 1.0452135375349794;
		bLOCK_castleWall_east.setOrigin(0.5, 1);
		bLOCK_castleWall_east.isFilled = true;
		bLOCK_castleWall_east.fillColor = 16724821;
		bLOCK_castleWall_east.fillAlpha = 0.35;
		bLOCK_castleWall_east.isStroked = true;
		bLOCK_castleWall_east.strokeColor = 16724821;
		bLOCK_castleWall_east.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_castleWall_east);

		// BLOCK_castleWall_southWest
		const bLOCK_castleWall_southWest = this.add.rectangle(1273, 1102, 861, 228);
		bLOCK_castleWall_southWest.setOrigin(1, 0.5);
		bLOCK_castleWall_southWest.isFilled = true;
		bLOCK_castleWall_southWest.fillColor = 16724821;
		bLOCK_castleWall_southWest.fillAlpha = 0.35;
		bLOCK_castleWall_southWest.isStroked = true;
		bLOCK_castleWall_southWest.strokeColor = 16724821;
		bLOCK_castleWall_southWest.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_castleWall_southWest);

		// BLOCK_castleWall_southEast
		const bLOCK_castleWall_southEast = this.add.rectangle(1376, 1101, 859, 230);
		bLOCK_castleWall_southEast.setOrigin(0, 0.5);
		bLOCK_castleWall_southEast.isFilled = true;
		bLOCK_castleWall_southEast.fillColor = 16724821;
		bLOCK_castleWall_southEast.fillAlpha = 0.35;
		bLOCK_castleWall_southEast.isStroked = true;
		bLOCK_castleWall_southEast.strokeColor = 16724821;
		bLOCK_castleWall_southEast.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_castleWall_southEast);

		// BLOCK_cliff_westUpper
		const bLOCK_cliff_westUpper = this.add.rectangle(0, 1408, 768, 96);
		bLOCK_cliff_westUpper.scaleX = 0.9950821188192042;
		bLOCK_cliff_westUpper.scaleY = 1.2248911638029218;
		bLOCK_cliff_westUpper.setOrigin(0, 0);
		bLOCK_cliff_westUpper.isFilled = true;
		bLOCK_cliff_westUpper.fillColor = 16724821;
		bLOCK_cliff_westUpper.fillAlpha = 0.35;
		bLOCK_cliff_westUpper.isStroked = true;
		bLOCK_cliff_westUpper.strokeColor = 16724821;
		bLOCK_cliff_westUpper.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_cliff_westUpper);

		// BLOCK_cliff_westLower
		const bLOCK_cliff_westLower = this.add.rectangle(350, 1528, 768, 96);
		bLOCK_cliff_westLower.scaleX = 1.1044414340012412;
		bLOCK_cliff_westLower.scaleY = 2.629383718866098;
		bLOCK_cliff_westLower.setOrigin(0, 0);
		bLOCK_cliff_westLower.isFilled = true;
		bLOCK_cliff_westLower.fillColor = 16724821;
		bLOCK_cliff_westLower.fillAlpha = 0.35;
		bLOCK_cliff_westLower.isStroked = true;
		bLOCK_cliff_westLower.strokeColor = 16724821;
		bLOCK_cliff_westLower.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_cliff_westLower);

		// BLOCK_cliff_centreWest
		const bLOCK_cliff_centreWest = this.add.rectangle(1118, 1528, 143, 96);
		bLOCK_cliff_centreWest.setOrigin(0, 0);
		bLOCK_cliff_centreWest.isFilled = true;
		bLOCK_cliff_centreWest.fillColor = 16724821;
		bLOCK_cliff_centreWest.fillAlpha = 0.35;
		bLOCK_cliff_centreWest.isStroked = true;
		bLOCK_cliff_centreWest.strokeColor = 16724821;
		bLOCK_cliff_centreWest.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_cliff_centreWest);

		// BLOCK_cliff_eastUpper
		const bLOCK_cliff_eastUpper = this.add.rectangle(1885, 1430, 675, 96);
		bLOCK_cliff_eastUpper.setOrigin(0, 0);
		bLOCK_cliff_eastUpper.isFilled = true;
		bLOCK_cliff_eastUpper.fillColor = 16724821;
		bLOCK_cliff_eastUpper.fillAlpha = 0.35;
		bLOCK_cliff_eastUpper.isStroked = true;
		bLOCK_cliff_eastUpper.strokeColor = 16724821;
		bLOCK_cliff_eastUpper.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_cliff_eastUpper);

		// BLOCK_cliff_eastHigh
		const bLOCK_cliff_eastHigh = this.add.rectangle(2353, 1262, 207, 96);
		bLOCK_cliff_eastHigh.setOrigin(0, 0);
		bLOCK_cliff_eastHigh.isFilled = true;
		bLOCK_cliff_eastHigh.fillColor = 16724821;
		bLOCK_cliff_eastHigh.fillAlpha = 0.35;
		bLOCK_cliff_eastHigh.isStroked = true;
		bLOCK_cliff_eastHigh.strokeColor = 16724821;
		bLOCK_cliff_eastHigh.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_cliff_eastHigh);

		// BLOCK_prop_entryFootRockL
		const bLOCK_prop_entryFootRockL = this.add.rectangle(177, 1750, 78, 24);
		bLOCK_prop_entryFootRockL.scaleX = 1.1142786607357662;
		bLOCK_prop_entryFootRockL.scaleY = 1.380963530980824;
		bLOCK_prop_entryFootRockL.setOrigin(0, 0);
		bLOCK_prop_entryFootRockL.isFilled = true;
		bLOCK_prop_entryFootRockL.fillColor = 16724821;
		bLOCK_prop_entryFootRockL.fillAlpha = 0.35;
		bLOCK_prop_entryFootRockL.isStroked = true;
		bLOCK_prop_entryFootRockL.strokeColor = 16724821;
		bLOCK_prop_entryFootRockL.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_prop_entryFootRockL);

		// BLOCK_prop_entryFootShrubL
		const bLOCK_prop_entryFootShrubL = this.add.rectangle(209, 1839, 56, 24);
		bLOCK_prop_entryFootShrubL.setOrigin(0, 0);
		bLOCK_prop_entryFootShrubL.isFilled = true;
		bLOCK_prop_entryFootShrubL.fillColor = 16724821;
		bLOCK_prop_entryFootShrubL.fillAlpha = 0.35;
		bLOCK_prop_entryFootShrubL.isStroked = true;
		bLOCK_prop_entryFootShrubL.strokeColor = 16724821;
		bLOCK_prop_entryFootShrubL.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_prop_entryFootShrubL);

		// BLOCK_prop_entryFootRockR
		const bLOCK_prop_entryFootRockR = this.add.rectangle(345, 1869, 74, 24);
		bLOCK_prop_entryFootRockR.setOrigin(0, 0);
		bLOCK_prop_entryFootRockR.isFilled = true;
		bLOCK_prop_entryFootRockR.fillColor = 16724821;
		bLOCK_prop_entryFootRockR.fillAlpha = 0.35;
		bLOCK_prop_entryFootRockR.isStroked = true;
		bLOCK_prop_entryFootRockR.strokeColor = 16724821;
		bLOCK_prop_entryFootRockR.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_prop_entryFootRockR);

		// BLOCK_prop_entryFootShrubR
		const bLOCK_prop_entryFootShrubR = this.add.rectangle(359, 1787, 64, 24);
		bLOCK_prop_entryFootShrubR.setOrigin(0, 0);
		bLOCK_prop_entryFootShrubR.isFilled = true;
		bLOCK_prop_entryFootShrubR.fillColor = 16724821;
		bLOCK_prop_entryFootShrubR.fillAlpha = 0.35;
		bLOCK_prop_entryFootShrubR.isStroked = true;
		bLOCK_prop_entryFootShrubR.strokeColor = 16724821;
		bLOCK_prop_entryFootShrubR.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_prop_entryFootShrubR);

		// BLOCK_prop_entryGateTreeR
		const bLOCK_prop_entryGateTreeR = this.add.rectangle(72, 1815, 24, 20);
		bLOCK_prop_entryGateTreeR.setOrigin(0, 0);
		bLOCK_prop_entryGateTreeR.isFilled = true;
		bLOCK_prop_entryGateTreeR.fillColor = 16724821;
		bLOCK_prop_entryGateTreeR.fillAlpha = 0.35;
		bLOCK_prop_entryGateTreeR.isStroked = true;
		bLOCK_prop_entryGateTreeR.strokeColor = 16724821;
		bLOCK_prop_entryGateTreeR.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_prop_entryGateTreeR);

		// BLOCK_cliffStep_westUpperEnd_1
		const bLOCK_cliffStep_westUpperEnd_1 = this.add.rectangle(724, 1456, 60, 24);
		bLOCK_cliffStep_westUpperEnd_1.scaleX = 1.0463571678484276;
		bLOCK_cliffStep_westUpperEnd_1.scaleY = 1.985361026563687;
		bLOCK_cliffStep_westUpperEnd_1.setOrigin(0, 0);
		bLOCK_cliffStep_westUpperEnd_1.isFilled = true;
		bLOCK_cliffStep_westUpperEnd_1.fillColor = 16724821;
		bLOCK_cliffStep_westUpperEnd_1.fillAlpha = 0.35;
		bLOCK_cliffStep_westUpperEnd_1.isStroked = true;
		bLOCK_cliffStep_westUpperEnd_1.strokeColor = 16724821;
		bLOCK_cliffStep_westUpperEnd_1.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_cliffStep_westUpperEnd_1);

		// BLOCK_prop_footShrubB
		const bLOCK_prop_footShrubB = this.add.rectangle(1773, 1517, 72, 24);
		bLOCK_prop_footShrubB.setOrigin(0, 0);
		bLOCK_prop_footShrubB.isFilled = true;
		bLOCK_prop_footShrubB.fillColor = 16724821;
		bLOCK_prop_footShrubB.fillAlpha = 0.35;
		bLOCK_prop_footShrubB.isStroked = true;
		bLOCK_prop_footShrubB.strokeColor = 16724821;
		bLOCK_prop_footShrubB.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_prop_footShrubB);

		// BLOCK_forestEdge_west
		const bLOCK_forestEdge_west = this.add.rectangle(0, -32, 400, 760);
		bLOCK_forestEdge_west.setOrigin(0, 0);
		bLOCK_forestEdge_west.isFilled = true;
		bLOCK_forestEdge_west.fillColor = 16724821;
		bLOCK_forestEdge_west.fillAlpha = 0.35;
		bLOCK_forestEdge_west.isStroked = true;
		bLOCK_forestEdge_west.strokeColor = 16724821;
		bLOCK_forestEdge_west.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_forestEdge_west);

		// BLOCK_forestEdge_westLow
		const bLOCK_forestEdge_westLow = this.add.rectangle(0, 728, 330, 90);
		bLOCK_forestEdge_westLow.setOrigin(0, 0);
		bLOCK_forestEdge_westLow.isFilled = true;
		bLOCK_forestEdge_westLow.fillColor = 16724821;
		bLOCK_forestEdge_westLow.fillAlpha = 0.35;
		bLOCK_forestEdge_westLow.isStroked = true;
		bLOCK_forestEdge_westLow.strokeColor = 16724821;
		bLOCK_forestEdge_westLow.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_forestEdge_westLow);

		// BLOCK_forestStump_westA
		const bLOCK_forestStump_westA = this.add.rectangle(20, 800, 120, 70);
		bLOCK_forestStump_westA.setOrigin(0, 0);
		bLOCK_forestStump_westA.isFilled = true;
		bLOCK_forestStump_westA.fillColor = 16724821;
		bLOCK_forestStump_westA.fillAlpha = 0.35;
		bLOCK_forestStump_westA.isStroked = true;
		bLOCK_forestStump_westA.strokeColor = 16724821;
		bLOCK_forestStump_westA.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_forestStump_westA);

		// BLOCK_forestStump_westB
		const bLOCK_forestStump_westB = this.add.rectangle(190, 760, 130, 70);
		bLOCK_forestStump_westB.setOrigin(0, 0);
		bLOCK_forestStump_westB.isFilled = true;
		bLOCK_forestStump_westB.fillColor = 16724821;
		bLOCK_forestStump_westB.fillAlpha = 0.35;
		bLOCK_forestStump_westB.isStroked = true;
		bLOCK_forestStump_westB.strokeColor = 16724821;
		bLOCK_forestStump_westB.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_forestStump_westB);

		// BLOCK_forestEdge_westTop
		const bLOCK_forestEdge_westTop = this.add.rectangle(400, -32, 70, 280);
		bLOCK_forestEdge_westTop.setOrigin(0, 0);
		bLOCK_forestEdge_westTop.isFilled = true;
		bLOCK_forestEdge_westTop.fillColor = 16724821;
		bLOCK_forestEdge_westTop.fillAlpha = 0.35;
		bLOCK_forestEdge_westTop.isStroked = true;
		bLOCK_forestEdge_westTop.strokeColor = 16724821;
		bLOCK_forestEdge_westTop.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_forestEdge_westTop);

		// BLOCK_forestEdge_east
		const bLOCK_forestEdge_east = this.add.rectangle(2266, -32, 294, 810);
		bLOCK_forestEdge_east.setOrigin(0, 0);
		bLOCK_forestEdge_east.isFilled = true;
		bLOCK_forestEdge_east.fillColor = 16724821;
		bLOCK_forestEdge_east.fillAlpha = 0.35;
		bLOCK_forestEdge_east.isStroked = true;
		bLOCK_forestEdge_east.strokeColor = 16724821;
		bLOCK_forestEdge_east.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_forestEdge_east);

		// BLOCK_forestEdge_eastLow
		const bLOCK_forestEdge_eastLow = this.add.rectangle(2350, 778, 210, 130);
		bLOCK_forestEdge_eastLow.setOrigin(0, 0);
		bLOCK_forestEdge_eastLow.isFilled = true;
		bLOCK_forestEdge_eastLow.fillColor = 16724821;
		bLOCK_forestEdge_eastLow.fillAlpha = 0.35;
		bLOCK_forestEdge_eastLow.isStroked = true;
		bLOCK_forestEdge_eastLow.strokeColor = 16724821;
		bLOCK_forestEdge_eastLow.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_forestEdge_eastLow);

		// BLOCK_forestEdge_eastFoot
		const bLOCK_forestEdge_eastFoot = this.add.rectangle(2432, 908, 128, 150);
		bLOCK_forestEdge_eastFoot.setOrigin(0, 0);
		bLOCK_forestEdge_eastFoot.isFilled = true;
		bLOCK_forestEdge_eastFoot.fillColor = 16724821;
		bLOCK_forestEdge_eastFoot.fillAlpha = 0.35;
		bLOCK_forestEdge_eastFoot.isStroked = true;
		bLOCK_forestEdge_eastFoot.strokeColor = 16724821;
		bLOCK_forestEdge_eastFoot.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_forestEdge_eastFoot);

		// BLOCK_forestEdge_eastTopA
		const bLOCK_forestEdge_eastTopA = this.add.rectangle(2200, -32, 70, 330);
		bLOCK_forestEdge_eastTopA.setOrigin(0, 0);
		bLOCK_forestEdge_eastTopA.isFilled = true;
		bLOCK_forestEdge_eastTopA.fillColor = 16724821;
		bLOCK_forestEdge_eastTopA.fillAlpha = 0.35;
		bLOCK_forestEdge_eastTopA.isStroked = true;
		bLOCK_forestEdge_eastTopA.strokeColor = 16724821;
		bLOCK_forestEdge_eastTopA.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_forestEdge_eastTopA);

		// BLOCK_forestEdge_eastTopB
		const bLOCK_forestEdge_eastTopB = this.add.rectangle(2220, 298, 50, 400);
		bLOCK_forestEdge_eastTopB.setOrigin(0, 0);
		bLOCK_forestEdge_eastTopB.isFilled = true;
		bLOCK_forestEdge_eastTopB.fillColor = 16724821;
		bLOCK_forestEdge_eastTopB.fillAlpha = 0.35;
		bLOCK_forestEdge_eastTopB.isStroked = true;
		bLOCK_forestEdge_eastTopB.strokeColor = 16724821;
		bLOCK_forestEdge_eastTopB.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_forestEdge_eastTopB);

		// BLOCK_cliffStep_westUpperEnd_2
		const bLOCK_cliffStep_westUpperEnd_2 = this.add.rectangle(752, 1498, 60, 24);
		bLOCK_cliffStep_westUpperEnd_2.scaleX = 1.0463571678484276;
		bLOCK_cliffStep_westUpperEnd_2.scaleY = 1.985361026563687;
		bLOCK_cliffStep_westUpperEnd_2.setOrigin(0, 0);
		bLOCK_cliffStep_westUpperEnd_2.isFilled = true;
		bLOCK_cliffStep_westUpperEnd_2.fillColor = 16724821;
		bLOCK_cliffStep_westUpperEnd_2.fillAlpha = 0.35;
		bLOCK_cliffStep_westUpperEnd_2.isStroked = true;
		bLOCK_cliffStep_westUpperEnd_2.strokeColor = 16724821;
		bLOCK_cliffStep_westUpperEnd_2.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_cliffStep_westUpperEnd_2);

		// BLOCK_cliffStep_westLowerEnd_2
		const bLOCK_cliffStep_westLowerEnd_2 = this.add.rectangle(273, 1623, 60, 24);
		bLOCK_cliffStep_westLowerEnd_2.scaleX = 1.0463571678484276;
		bLOCK_cliffStep_westLowerEnd_2.scaleY = 1.985361026563687;
		bLOCK_cliffStep_westLowerEnd_2.setOrigin(0, 0);
		bLOCK_cliffStep_westLowerEnd_2.isFilled = true;
		bLOCK_cliffStep_westLowerEnd_2.fillColor = 16724821;
		bLOCK_cliffStep_westLowerEnd_2.fillAlpha = 0.35;
		bLOCK_cliffStep_westLowerEnd_2.isStroked = true;
		bLOCK_cliffStep_westLowerEnd_2.strokeColor = 16724821;
		bLOCK_cliffStep_westLowerEnd_2.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_cliffStep_westLowerEnd_2);

		// BLOCK_cliffStep_westLowerEnd_1
		const bLOCK_cliffStep_westLowerEnd_1 = this.add.rectangle(304, 1577, 60, 24);
		bLOCK_cliffStep_westLowerEnd_1.scaleX = 1.0713468377176072;
		bLOCK_cliffStep_westLowerEnd_1.scaleY = 8.266310345413565;
		bLOCK_cliffStep_westLowerEnd_1.setOrigin(0, 0);
		bLOCK_cliffStep_westLowerEnd_1.isFilled = true;
		bLOCK_cliffStep_westLowerEnd_1.fillColor = 16724821;
		bLOCK_cliffStep_westLowerEnd_1.fillAlpha = 0.35;
		bLOCK_cliffStep_westLowerEnd_1.isStroked = true;
		bLOCK_cliffStep_westLowerEnd_1.strokeColor = 16724821;
		bLOCK_cliffStep_westLowerEnd_1.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_cliffStep_westLowerEnd_1);

		// BLOCK_cliffStep_westLowerEnd_4
		const bLOCK_cliffStep_westLowerEnd_4 = this.add.rectangle(210, 1701, 60, 24);
		bLOCK_cliffStep_westLowerEnd_4.scaleX = 1.0463571678484276;
		bLOCK_cliffStep_westLowerEnd_4.scaleY = 1.985361026563687;
		bLOCK_cliffStep_westLowerEnd_4.setOrigin(0, 0);
		bLOCK_cliffStep_westLowerEnd_4.isFilled = true;
		bLOCK_cliffStep_westLowerEnd_4.fillColor = 16724821;
		bLOCK_cliffStep_westLowerEnd_4.fillAlpha = 0.35;
		bLOCK_cliffStep_westLowerEnd_4.isStroked = true;
		bLOCK_cliffStep_westLowerEnd_4.strokeColor = 16724821;
		bLOCK_cliffStep_westLowerEnd_4.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_cliffStep_westLowerEnd_4);

		// BLOCK_cliffStep_westLowerEnd_3
		const bLOCK_cliffStep_westLowerEnd_3 = this.add.rectangle(241, 1663, 60, 24);
		bLOCK_cliffStep_westLowerEnd_3.scaleX = 1.2356146582345844;
		bLOCK_cliffStep_westLowerEnd_3.scaleY = 4.924183397769843;
		bLOCK_cliffStep_westLowerEnd_3.setOrigin(0, 0);
		bLOCK_cliffStep_westLowerEnd_3.isFilled = true;
		bLOCK_cliffStep_westLowerEnd_3.fillColor = 16724821;
		bLOCK_cliffStep_westLowerEnd_3.fillAlpha = 0.35;
		bLOCK_cliffStep_westLowerEnd_3.isStroked = true;
		bLOCK_cliffStep_westLowerEnd_3.strokeColor = 16724821;
		bLOCK_cliffStep_westLowerEnd_3.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_cliffStep_westLowerEnd_3);

		// BLOCK_building_archive
		const bLOCK_building_archive = this.add.rectangle(665, 414, 500, 70);
		bLOCK_building_archive.setOrigin(0, 0);
		bLOCK_building_archive.isFilled = true;
		bLOCK_building_archive.fillColor = 16724821;
		bLOCK_building_archive.fillAlpha = 0.35;
		bLOCK_building_archive.isStroked = true;
		bLOCK_building_archive.strokeColor = 16724821;
		bLOCK_building_archive.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_building_archive);

		// BLOCK_building_forge
		const bLOCK_building_forge = this.add.rectangle(1473, 371, 508, 70);
		bLOCK_building_forge.setOrigin(0, 0);
		bLOCK_building_forge.isFilled = true;
		bLOCK_building_forge.fillColor = 16724821;
		bLOCK_building_forge.fillAlpha = 0.35;
		bLOCK_building_forge.isStroked = true;
		bLOCK_building_forge.strokeColor = 16724821;
		bLOCK_building_forge.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_building_forge);

		// L24_DOORS
		const l24_DOORS = this.add.layer();

		// DOOR_forge
		const dOOR_forge = this.add.rectangle(1642, 441, 170, 72);
		dOOR_forge.setOrigin(0, 0);
		dOOR_forge.isFilled = true;
		dOOR_forge.fillColor = 16750899;
		dOOR_forge.fillAlpha = 0.4;
		dOOR_forge.isStroked = true;
		dOOR_forge.strokeColor = 16750899;
		dOOR_forge.lineWidth = 3;
		l24_DOORS.add(dOOR_forge);

		// DOOR_collection_archive
		const dOOR_collection_archive = this.add.rectangle(830, 484, 170, 72);
		dOOR_collection_archive.setOrigin(0, 0);
		dOOR_collection_archive.isFilled = true;
		dOOR_collection_archive.fillColor = 10053375;
		dOOR_collection_archive.fillAlpha = 0.4;
		dOOR_collection_archive.isStroked = true;
		dOOR_collection_archive.strokeColor = 10053375;
		dOOR_collection_archive.lineWidth = 3;
		l24_DOORS.add(dOOR_collection_archive);

		this.l1_GROUND = l1_GROUND;
		this.l20_GROUND_L0 = l20_GROUND_L0;
		this.l21_GROUND_L1 = l21_GROUND_L1;
		this.l23_RAMPS = l23_RAMPS;
		this.l11_MARKERS = l11_MARKERS;
		this.l15_WILDLIFE = l15_WILDLIFE;
		this.l14_COLLIDERS = l14_COLLIDERS;
		this.l24_DOORS = l24_DOORS;
		this.courtyardGround = courtyardGround;

		this.events.emit("scene-awake");
	}

	/** @type {Phaser.GameObjects.Layer} */
	l1_GROUND;
	/** @type {Phaser.GameObjects.Layer} */
	l20_GROUND_L0;
	/** @type {Phaser.GameObjects.Layer} */
	l21_GROUND_L1;
	/** @type {Phaser.GameObjects.Layer} */
	l23_RAMPS;
	/** @type {Phaser.GameObjects.Layer} */
	l11_MARKERS;
	/** @type {Phaser.GameObjects.Layer} */
	l15_WILDLIFE;
	/** @type {Phaser.GameObjects.Layer} */
	l14_COLLIDERS;
	/** @type {Phaser.GameObjects.Layer} */
	l24_DOORS;
	/** @type {Phaser.Tilemaps.Tilemap} */
	courtyardGround;

	/* START-USER-CODE */

	// Write your code here

	create() {

		this.editorCreate();
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
