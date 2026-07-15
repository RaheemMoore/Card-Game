import type { ArchetypeName } from '../types/card';

export interface ArchetypeDefinition {
  name: ArchetypeName;
  identity: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  motifs: string;
  rankProgression: {
    Foundation: string;
    Forged: string;
    Ascendant: string;
  };
}

export const ARCHETYPES: Record<ArchetypeName, ArchetypeDefinition> = {
  Barbarian: {
    name: 'Barbarian',
    identity: 'Raw physical power, primal warrior',
    palette: { primary: '#8B6914', secondary: '#4a4a4a', accent: '#b91c1c' },
    motifs: 'Fur/hide pieces, tribal scarification, war paint, crude iron weapons',
    rankProgression: {
      Foundation: 'Minimal furs and wraps, simple weapons',
      Forged: 'Partial hide-and-bone armor, battle scars',
      Ascendant: 'Full war-regalia with trophies and totems',
    },
  },
  Monk: {
    name: 'Monk',
    identity: 'Discipline, inner control, martial mastery',
    palette: { primary: '#92400e', secondary: '#78716c', accent: '#dc2626' },
    motifs: 'Simple robes, wrapped hands, prayer beads, subtle energy',
    rankProgression: {
      Foundation: 'Simple robe, bare feet',
      Forged: 'Reinforced wraps and sash, visible training marks',
      Ascendant: 'Ornate ceremonial robe with visible chi/energy manifestation',
    },
  },
  Beastmaster: {
    name: 'Beastmaster',
    identity: 'Wild, feral, bonded to nature and animal companionship',
    palette: { primary: '#166534', secondary: '#78350f', accent: '#a16207' },
    motifs: 'Animal pelts, claw markings, feather/fang jewelry, leather straps',
    rankProgression: {
      Foundation: 'Simple leathers, basic animal bond',
      Forged: 'Animal-hide armor with trophies',
      Ascendant: 'Full beast-totem regalia with spectral animal companion',
    },
  },
  Druid: {
    name: 'Druid',
    identity: 'Nature magic, balance, restoration',
    palette: { primary: '#14532d', secondary: '#78350f', accent: '#ca8a04' },
    motifs: 'Living vines, wooden staff, leaf/floral patterning, antlers',
    rankProgression: {
      Foundation: 'Simple robe with basic staff',
      Forged: 'Vine-wrapped armor, growing power',
      Ascendant: 'Living armor fused with bloom and antlers, glowing nature energy',
    },
  },
  Necromancer: {
    name: 'Necromancer',
    identity: 'Dark magic, death, forbidden knowledge',
    palette: { primary: '#1a1a1a', secondary: '#e5e5e5', accent: '#4ade80' },
    motifs: 'Skulls, tattered robes, dark runes, ghostly energy wisps',
    rankProgression: {
      Foundation: 'Tattered robe, first dark runes',
      Forged: 'Bone-adorned robe with dark energy aura',
      Ascendant: 'Full death-lord regalia with spectral effects',
    },
  },
  Vampire: {
    name: 'Vampire',
    identity: 'Dark charisma, aristocratic predator',
    palette: { primary: '#991b1b', secondary: '#171717', accent: '#d4d4d8' },
    motifs: 'Ornate gothic clothing, cape, fangs, pale skin, red eyes',
    rankProgression: {
      Foundation: 'Simple dark attire, subtle predator presence',
      Forged: 'Ornate gothic coat, growing dark power',
      Ascendant: 'Full regal vampiric regalia with blood-mist effects',
    },
  },
  'Mech Pilot': {
    name: 'Mech Pilot',
    identity: 'Armored technology, heavy combat suit',
    palette: { primary: '#6b7280', secondary: '#2563eb', accent: '#ea580c' },
    motifs: 'Exposed hydraulics, glowing tech panels, HUD visor, heavy plating',
    rankProgression: {
      Foundation: 'Partial exosuit frame, basic HUD',
      Forged: 'More complete armored suit, integrated systems',
      Ascendant: 'Full heavy mech-suit with glowing core and integrated weapons',
    },
  },
  Android: {
    name: 'Android',
    identity: 'Synthetic being, post-human precision',
    palette: { primary: '#e5e7eb', secondary: '#f8fafc', accent: '#06b6d4' },
    motifs: 'Visible seams/joints, glowing circuit lines, sleek minimal design',
    rankProgression: {
      Foundation: 'Exposed basic chassis, raw synthetic form',
      Forged: 'Partial synthetic-skin plating, refined design',
      Ascendant: 'Fully realized sleek synthetic form with glowing core',
    },
  },
  Seraph: {
    name: 'Seraph',
    identity: 'Radiant holy power, righteous protector',
    palette: { primary: '#ca8a04', secondary: '#fefce8', accent: '#bfdbfe' },
    motifs: 'Feathered wings, halo, ornate golden armor, light rays',
    rankProgression: {
      Foundation: 'Simple white garb with small wings',
      Forged: 'Partial golden armor with larger wings',
      Ascendant: 'Full radiant regalia with complete wingspan and halo',
    },
  },
  Human: {
    name: 'Human',
    identity: 'Grounded, no fantasy embellishment — the realistic option',
    palette: { primary: '#78716c', secondary: '#a8a29e', accent: '#d6d3d1' },
    motifs: 'Realistic athletic wear, minimal accessories, no supernatural elements',
    rankProgression: {
      Foundation: 'Basic athletic wear',
      Forged: 'Performance gear, trained physique',
      Ascendant: 'Premium elite athletic gear — elite, not magical',
    },
  },
};

export function getArchetype(name: ArchetypeName): ArchetypeDefinition {
  return ARCHETYPES[name];
}
