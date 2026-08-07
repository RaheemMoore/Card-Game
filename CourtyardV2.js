
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
				],
				layers: [
					{
						type: "tilelayer",
						name: "ground",
						width: 80,
						height: 60,
						opacity: 1,
						data: [64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 63, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 13, 13, 13, 13, 13, 13, 13, 13, 13, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 61, 62, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 54, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 47, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 46, 1, 1, 1, 1, 1, 1, 47, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 46, 1, 1, 54, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 1, 1, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 54, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 1, 1, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 54, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 1, 1, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 54, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 1, 1, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 1, 1, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 1, 1, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 4, 4, 3, 1, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 44, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 40, 16, 16, 12, 4, 3, 1, 44, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 40, 1, 1, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 1, 1, 1, 1, 1, 6, 16, 16, 11, 5, 9, 1, 1, 1, 1, 1, 5, 14, 16, 16, 16, 16, 15, 9, 1, 1, 1, 5, 9, 1, 1, 5, 9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 1, 1, 1, 1, 1, 5, 13, 13, 9, 1, 1, 1, 1, 1, 1, 1, 2, 8, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 47, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 46, 16, 16, 16, 11, 1, 1, 47, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 46, 1, 1, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 13, 13, 13, 9, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 1, 1, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 1, 1, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 1, 1, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 63, 61, 61, 61, 62, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 1, 1, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 59, 49, 49, 49, 54, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 1, 1, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 63, 57, 49, 49, 49, 54, 64, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 1, 1, 1, 1, 43, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 38, 1, 1, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 60, 51, 49, 49, 49, 53, 62, 64, 64, 64, 64, 64, 64, 16, 16, 11, 1, 1, 44, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 40, 1, 1, 1, 1, 1, 1, 44, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 40, 1, 1, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 59, 49, 49, 49, 49, 54, 64, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 5, 13, 9, 1, 1, 1, 1, 5, 14, 16, 16, 12, 4, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 5, 13, 9, 5, 9, 1, 1, 1, 1, 1, 1, 6, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 59, 49, 49, 49, 49, 53, 62, 16, 16, 16, 16, 16, 16, 16, 12, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 8, 16, 16, 16, 15, 9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 8, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 16, 16, 16, 12, 4, 4, 4, 4, 4, 8, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 6, 16, 64, 64, 64, 64, 63, 62, 63, 61, 62, 64, 64, 64, 64, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 8, 16, 64, 64, 64, 63, 57, 53, 57, 49, 54, 64, 64, 64, 64, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 13, 9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 5, 13, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 12, 3, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 12, 3, 1, 1, 1, 2, 8, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 12, 4, 4, 4, 4, 4, 3, 1, 1, 1, 2, 4, 4, 4, 4, 4, 8, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 9, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 5, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 12, 4, 4, 4, 4, 8, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 5, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 31, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 30, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 27, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 22, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 5, 9, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 28, 19, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 18, 24, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 12, 3, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 27, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 22, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 13, 13, 13, 13, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 13, 9, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 28, 20, 19, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 18, 20, 24, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 13, 9, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 12, 3, 1, 1, 1, 1, 1, 1, 5, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 28, 19, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 18, 24, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 13, 13, 9, 1, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 28, 20, 20, 19, 18, 20, 20, 20, 19, 18, 20, 24, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 28, 24, 16, 16, 16, 28, 24, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 13, 13, 13, 13, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 12, 3, 1, 1, 1, 5, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 5, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 5, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 5, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 12, 3, 1, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 5, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 11, 1, 1, 1, 1, 1, 1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16],
					},
				],
			},
		});
		const courtyardGround = this.add.tilemap("courtyardGround_79a8a5b4-2f74-4cd6-a031-e2045a43b238");
		courtyardGround.addTilesetImage("grass-dirt", "ground-tileset-grass-dirt-32");
		courtyardGround.addTilesetImage("dirt-paving", "ground-tileset-dirt-paving-32");
		courtyardGround.addTilesetImage("castle-floor", "ground-tileset-dirt-floor-32");
		courtyardGround.addTilesetImage("ground-tileset-forestfloor-dirt-32");

		// VIEWPORT_zoom2_960x540
		const vIEWPORT_zoom2_960x540 = this.add.rectangle(2703, 1, 960, 540);
		vIEWPORT_zoom2_960x540.setOrigin(0, 0);
		vIEWPORT_zoom2_960x540.isStroked = true;
		vIEWPORT_zoom2_960x540.strokeColor = 16763904;
		vIEWPORT_zoom2_960x540.lineWidth = 6;

		// L1_GROUND
		const l1_GROUND = this.add.layer();

		// ground
		const ground = courtyardGround.createLayer("ground", ["ground-tileset-forestfloor-dirt-32","grass-dirt","castle-floor","dirt-paving"], 0, 0);
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

		// castleTowerWest
		const castleTowerWest = this.add.image(384, 517, "tower-watch-v2");
		castleTowerWest.scaleX = 1.4;
		castleTowerWest.scaleY = 1.4;
		castleTowerWest.setOrigin(0, 0);
		castleTowerWest.visible = false;
		l3_CASTLE.add(castleTowerWest);

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

		// SHELF_wall_side_1
		const sHELF_wall_side_1 = this.add.image(523, 582, "wall-side");
		sHELF_wall_side_1.scaleX = 1.142292861719713;
		sHELF_wall_side_1.scaleY = 1.3873158625341773;
		l3_CASTLE.add(sHELF_wall_side_1);

		// PASS_wallSouthD
		const pASS_wallSouthD = this.add.image(1696, 928, "wall-straight-v2");
		pASS_wallSouthD.setOrigin(0, 0);
		pASS_wallSouthD.visible = false;
		l3_CASTLE.add(pASS_wallSouthD);

		// SHELF_wall_side_3
		const sHELF_wall_side_3 = this.add.image(2110, 583, "wall-side");
		sHELF_wall_side_3.scaleX = 1.142292861719713;
		sHELF_wall_side_3.scaleY = 1.3873158625341773;
		l3_CASTLE.add(sHELF_wall_side_3);

		// castleTowerWest_2
		const castleTowerWest_2 = this.add.image(321, 681, "tower-watch-v2");
		castleTowerWest_2.scaleX = 1.4;
		castleTowerWest_2.scaleY = 1.4;
		castleTowerWest_2.setOrigin(0, 0);
		l3_CASTLE.add(castleTowerWest_2);

		// castleTowerWest_1
		const castleTowerWest_1 = this.add.image(1913, 679, "tower-watch-v2");
		castleTowerWest_1.scaleX = 1.4;
		castleTowerWest_1.scaleY = 1.4;
		castleTowerWest_1.setOrigin(0, 0);
		l3_CASTLE.add(castleTowerWest_1);

		// SHELF_wall_north
		const sHELF_wall_north = this.add.image(574, -6, "wall-north");
		sHELF_wall_north.scaleX = 1.002714667991714;
		sHELF_wall_north.scaleY = 1.1;
		sHELF_wall_north.setOrigin(0, 0);
		l3_CASTLE.add(sHELF_wall_north);

		// SHELF_gate_drawbridge
		const sHELF_gate_drawbridge = this.add.image(3355, 2072, "gate-drawbridge");
		sHELF_gate_drawbridge.scaleX = 1.2179184862700398;
		sHELF_gate_drawbridge.scaleY = 1.1317833460082098;
		sHELF_gate_drawbridge.setOrigin(1, 1);
		l3_CASTLE.add(sHELF_gate_drawbridge);

		// SHELF_wall_north_1
		const sHELF_wall_north_1 = this.add.image(1312, -6, "wall-north");
		sHELF_wall_north_1.scaleX = 1.002714667991714;
		sHELF_wall_north_1.scaleY = 1.1;
		sHELF_wall_north_1.setOrigin(0, 0);
		l3_CASTLE.add(sHELF_wall_north_1);

		// SHELF_gate_drawbridge_V5
		const sHELF_gate_drawbridge_V5 = this.add.image(1128, 864, "gate-drawbridge-v5");
		sHELF_gate_drawbridge_V5.setOrigin(0, 0);
		l3_CASTLE.add(sHELF_gate_drawbridge_V5);

		// SHELF_wall_corner_turn
		const sHELF_wall_corner_turn = this.add.image(2591, 1992, "wall-corner-turn");
		sHELF_wall_corner_turn.scaleX = 1.6174553850910134;
		sHELF_wall_corner_turn.scaleY = 1.5093493504936581;
		sHELF_wall_corner_turn.setOrigin(0, 0);
		l3_CASTLE.add(sHELF_wall_corner_turn);

		// SHELF_wall_straight_v2
		const sHELF_wall_straight_v2 = this.add.image(1270, 2217, "wall-straight-v2");
		sHELF_wall_straight_v2.setOrigin(0, 0);
		l3_CASTLE.add(sHELF_wall_straight_v2);

		// SHELF_gate_house_v2
		const sHELF_gate_house_v2 = this.add.image(-1960, 1525, "gate-house-v2");
		sHELF_gate_house_v2.setOrigin(0, 0);
		l3_CASTLE.add(sHELF_gate_house_v2);

		// SHELF_corner_outer_v2
		const sHELF_corner_outer_v2 = this.add.image(2403, 2300, "wall-corner-outer-v2");
		sHELF_corner_outer_v2.setOrigin(0, 0);
		l3_CASTLE.add(sHELF_corner_outer_v2);

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

		// L11_MARKERS
		const l11_MARKERS = this.add.layer();

		// scaleHeroTopOfStair
		const scaleHeroTopOfStair = this.add.sprite(1306, 1209, "hero-chibi", 0);
		scaleHeroTopOfStair.scaleX = 1.408;
		scaleHeroTopOfStair.scaleY = 1.408;
		scaleHeroTopOfStair.setOrigin(0.5, 1);
		l11_MARKERS.add(scaleHeroTopOfStair);

		// scaleHeroNative71px
		const scaleHeroNative71px = this.add.sprite(900, 1800, "hero-chibi", 0);
		scaleHeroNative71px.setOrigin(0.5, 1);
		l11_MARKERS.add(scaleHeroNative71px);

		// scaleHeroBesideTree
		const scaleHeroBesideTree = this.add.sprite(780, 1311, "hero-chibi", 0);
		scaleHeroBesideTree.scaleX = 1.408;
		scaleHeroBesideTree.scaleY = 1.408;
		scaleHeroBesideTree.setOrigin(0.5, 1);
		l11_MARKERS.add(scaleHeroBesideTree);

		// MISSING_northWall_run
		const mISSING_northWall_run = this.add.rectangle(448, 96, 1760, 112);
		mISSING_northWall_run.setOrigin(0, 0);
		mISSING_northWall_run.isFilled = true;
		mISSING_northWall_run.fillColor = 16720486;
		mISSING_northWall_run.fillAlpha = 0.35;
		mISSING_northWall_run.isStroked = true;
		mISSING_northWall_run.strokeColor = 16720486;
		mISSING_northWall_run.lineWidth = 4;
		l11_MARKERS.add(mISSING_northWall_run);

		// scaleHeroFootOfStair
		const scaleHeroFootOfStair = this.add.sprite(1397, 1808, "hero-chibi", 0);
		scaleHeroFootOfStair.scaleX = 1.408;
		scaleHeroFootOfStair.scaleY = 1.408;
		scaleHeroFootOfStair.setOrigin(0.5, 1);
		l11_MARKERS.add(scaleHeroFootOfStair);

		// MISSING_eastWall_run
		const mISSING_eastWall_run = this.add.rectangle(2096, 208, 112, 1010);
		mISSING_eastWall_run.setOrigin(0, 0);
		mISSING_eastWall_run.isFilled = true;
		mISSING_eastWall_run.fillColor = 16720486;
		mISSING_eastWall_run.fillAlpha = 0.35;
		mISSING_eastWall_run.isStroked = true;
		mISSING_eastWall_run.strokeColor = 16720486;
		mISSING_eastWall_run.lineWidth = 4;
		l11_MARKERS.add(mISSING_eastWall_run);

		// MISSING_westWall_run
		const mISSING_westWall_run = this.add.rectangle(448, 208, 112, 1010);
		mISSING_westWall_run.setOrigin(0, 0);
		mISSING_westWall_run.isFilled = true;
		mISSING_westWall_run.fillColor = 16720486;
		mISSING_westWall_run.fillAlpha = 0.35;
		mISSING_westWall_run.isStroked = true;
		mISSING_westWall_run.strokeColor = 16720486;
		mISSING_westWall_run.lineWidth = 4;
		l11_MARKERS.add(mISSING_westWall_run);

		// L4_QUADRANT_NE
		const l4_QUADRANT_NE = this.add.layer();

		// NE_apprentice_cardwright
		const nE_apprentice_cardwright = this.add.sprite(1700, 448, "anim-apprentice-cardwright-study-east", 0);
		nE_apprentice_cardwright.scaleX = 0.667;
		nE_apprentice_cardwright.scaleY = 0.667;
		nE_apprentice_cardwright.setOrigin(0.5, 1);
		l4_QUADRANT_NE.add(nE_apprentice_cardwright);

		// L5_QUADRANT_NW
		this.add.layer();

		// L6_QUADRANT_SW
		this.add.layer();

		// L7_QUADRANT_SE
		this.add.layer();

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

		// L14_COLLIDERS
		const l14_COLLIDERS = this.add.layer();

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

		// BLOCK_example_southWallBand
		const bLOCK_example_southWallBand = this.add.rectangle(1117, 1660, 768, 124);
		bLOCK_example_southWallBand.setOrigin(0, 0);
		bLOCK_example_southWallBand.isFilled = true;
		bLOCK_example_southWallBand.fillColor = 16724821;
		bLOCK_example_southWallBand.fillAlpha = 0.35;
		bLOCK_example_southWallBand.isStroked = true;
		bLOCK_example_southWallBand.strokeColor = 16724821;
		bLOCK_example_southWallBand.lineWidth = 2;
		l14_COLLIDERS.add(bLOCK_example_southWallBand);

		// ZONE_example_stairTop
		const zONE_example_stairTop = this.add.rectangle(1258, 1177, 96, 64);
		zONE_example_stairTop.setOrigin(0, 0);
		zONE_example_stairTop.isFilled = true;
		zONE_example_stairTop.fillColor = 3394815;
		zONE_example_stairTop.fillAlpha = 0.35;
		zONE_example_stairTop.isStroked = true;
		zONE_example_stairTop.strokeColor = 3394815;
		zONE_example_stairTop.lineWidth = 2;
		l14_COLLIDERS.add(zONE_example_stairTop);

		this.l14_COLLIDERS = l14_COLLIDERS;
		this.courtyardGround = courtyardGround;

		this.events.emit("scene-awake");
	}

	/** @type {Phaser.GameObjects.Layer} */
	l14_COLLIDERS;
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
