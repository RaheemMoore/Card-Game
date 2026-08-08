import type { WildlifeAgent } from './WildlifeAgent';
import type { WildlifePoint } from './types';

/** Scene-level owner for the small number of animals living in the courtyard. */
export class WildlifeManager {
  private readonly animals = new Set<WildlifeAgent>();
  private motionOff = false;

  add(animal: WildlifeAgent): WildlifeAgent {
    this.animals.add(animal);
    animal.setMotionOff(this.motionOff);
    return animal;
  }

  remove(animal: WildlifeAgent): void {
    if (!this.animals.delete(animal)) return;
    animal.destroy();
  }

  update(now: number, deltaMs: number, playerPosition?: WildlifePoint): void {
    for (const animal of this.animals) animal.update(now, deltaMs, playerPosition);
  }

  setMotionOff(off: boolean): void {
    this.motionOff = off;
    for (const animal of this.animals) animal.setMotionOff(off);
  }

  destroy(): void {
    for (const animal of this.animals) animal.destroy();
    this.animals.clear();
  }
}
