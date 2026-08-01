import { describe, expect, it } from 'vitest';
import { ELEMENT_NAMES } from '../../../types/bible';
import { MATERIAL_KITS, materialKitFor, UNELEMENTED_KIT } from './materialKits';
import { ALL_RECIPES, BY_FORM } from './recipes';

describe('MATERIAL_KITS', () => {
  it('covers every element exhaustively', () => {
    // Mirrors the guard on ELEMENT_TO_DAMAGE_TYPE: a 30th element must be a
    // compile error that forces a decision, not a silent demotion to grey.
    for (const element of ELEMENT_NAMES) {
      expect(MATERIAL_KITS[element], `missing kit for ${element}`).toBeTruthy();
      expect(MATERIAL_KITS[element].element).toBe(element);
    }
    expect(Object.keys(MATERIAL_KITS)).toHaveLength(ELEMENT_NAMES.length);
  });

  it('authors the five elements the pilots cast', () => {
    for (const element of ['Blood', 'Water', 'Fire', 'Nature', 'Holy'] as const) {
      expect(MATERIAL_KITS[element].provisional, `${element} should be authored`).toBe(false);
    }
  });

  it('makes every authored kit distinguishable WITHOUT colour', () => {
    // The Bible's rule, enforced: "Every element should be recognizable even
    // without color." Two kits that differ only in palette are not finished.
    const authored = Object.values(MATERIAL_KITS).filter((k) => !k.provisional);
    const shapeSignatures = authored.map((k) =>
      [k.silhouette, k.edgeProfile, k.particle, k.impact, k.residue].join('|'),
    );

    expect(new Set(shapeSignatures).size).toBe(authored.length);
  });

  it('gives every kit a full palette and a citation', () => {
    for (const kit of Object.values(MATERIAL_KITS)) {
      expect(kit.palette).toHaveLength(3);
      for (const c of kit.palette) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
      expect(kit.citesVisualLanguage.length).toBeGreaterThan(0);
    }
  });

  it('keeps Infernal off the fire palette', () => {
    // Seraph Bible §14 forbids fire-orange for Infernal outright — it is molten
    // obsidian and BLACK light. It shares fire's silhouette because it is
    // molten, and must not share its colour.
    const infernal = MATERIAL_KITS.Infernal;
    expect(infernal.silhouette).toBe(MATERIAL_KITS.Fire.silhouette);
    expect(infernal.palette).not.toEqual(MATERIAL_KITS.Fire.palette);
    expect(infernal.palette[0]).not.toBe(MATERIAL_KITS.Fire.palette[0]);
  });

  it('falls back to the unelemented kit for a legacy card', () => {
    expect(materialKitFor(undefined)).toBe(UNELEMENTED_KIT);
    expect(materialKitFor('Fire')).toBe(MATERIAL_KITS.Fire);
  });
});

describe('recipes', () => {
  it('gives every recipe a fallback that exists', () => {
    const ids = new Set(ALL_RECIPES.map((r) => r.id));
    // Form recipes are addressed by their own id; exact recipes fall back to
    // one of those.
    for (const r of ALL_RECIPES) {
      const target =
        ids.has(r.fallbackRecipeId) ||
        Object.values(BY_FORM).some((f) => f.id === r.fallbackRecipeId);
      expect(target, `${r.id} falls back to unknown ${r.fallbackRecipeId}`).toBe(true);
    }
  });

  it('terminates the fallback chain at the generic recipe', () => {
    expect(BY_FORM.generic.fallbackRecipeId).toBe(BY_FORM.generic.id);
  });

  it('gives every recipe at least one stage that accepts a consequence', () => {
    for (const r of ALL_RECIPES) {
      expect(r.stages.some((s) => s.accepts.length > 0), `${r.id} accepts nothing`).toBe(true);
    }
  });

  it('ships everything as placeholder — no art is approved yet', () => {
    for (const r of ALL_RECIPES) expect(r.approvalStatus).toBe('placeholder');
  });
});
