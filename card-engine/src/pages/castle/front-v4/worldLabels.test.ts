import { describe, it, expect } from 'vitest';
import { AUTHORED_GROUND_LABEL, EDITOR_ONLY_PREFIX, parseAuthoredLabels } from './worldLabels';

/**
 * The label parser is what lets the Editor be what-you-see-is-what-you-get.
 *
 * Phaser Editor never writes a label onto the object â€” only as a comment above
 * the `this.add.*` that creates it â€” so this positional read is the only thing
 * telling the runtime which objects are Raheem's world and which are the hero
 * and creature he put there to judge scale against. If it drifts, either a ghost
 * stands in the castle forever or, far worse, the wrong object is deleted from
 * someone's level. Hence a test with the compiler's real output shape in it.
 */

// Copied from an actual CastleFrontWorld.js, tabs and all.
const COMPILED = `
// You can write more code here

/* START OF COMPILED CODE */

class CastleFrontWorld extends Phaser.Scene {

	constructor() {
		super("CastleFrontWorld");
	}

	/** @returns {void} */
	editorCreate() {

		// GROUND
		const gROUND = this.add.rectangle(640, 590, 1280, 130);
		gROUND.setOrigin(0.5, 0);
		gROUND.isFilled = true;

		// WALL_LEFT
		const wALL_LEFT = this.add.rectangle(145, 590, 370, 290);
		wALL_LEFT.setOrigin(0.5, 1);

		// REF_hero_spawn
		const rEF_hero_spawn = this.add.image(380, 590, "hero-chibi", 21);
		rEF_hero_spawn.setOrigin(0.5, 0.986);

		this.events.emit("scene-awake");
	}
}

/* END OF COMPILED CODE */
`;

describe('parseAuthoredLabels', () => {
  it('reads every label in creation order', () => {
    expect(parseAuthoredLabels(COMPILED)).toEqual(['GROUND', 'WALL_LEFT', 'REF_hero_spawn']);
  });

  it('identifies the editor-only objects and the ground contract', () => {
    const labels = parseAuthoredLabels(COMPILED);
    expect(labels.filter((l) => l.startsWith(EDITOR_ONLY_PREFIX))).toEqual(['REF_hero_spawn']);
    expect(labels.includes(AUTHORED_GROUND_LABEL)).toBe(true);
  });

  it('handles an object created without a local variable', () => {
    // The compiler drops the `const` when nothing later refers to the object.
    const source = '\t\t// GATE\n\t\tthis.add.rectangle(176, 590, 104, 218);\n';
    expect(parseAuthoredLabels(source)).toEqual(['GATE']);
  });

  it('ignores prose comments that are not object labels', () => {
    const source = `
      // You can write more code here
      /* START OF COMPILED CODE */
      // GROUND
      const gROUND = this.add.rectangle(0, 0, 10, 10);
    `;
    expect(parseAuthoredLabels(source)).toEqual(['GROUND']);
  });

  it('returns nothing for an empty scene, rather than throwing', () => {
    // The normal state of a freshly created world.
    expect(parseAuthoredLabels('editorCreate() {\n\tthis.events.emit("scene-awake");\n}')).toEqual([]);
  });

  it('survives CRLF, because the Editor writes files on Windows', () => {
    expect(parseAuthoredLabels('\t\t// GROUND\r\n\t\tconst g = this.add.rectangle(0,0,1,1);')).toEqual([
      'GROUND',
    ]);
  });
});
