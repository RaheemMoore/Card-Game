# Phaser Runtime Observation Bridge — Proposed Contract

**Status:** design contract; implementation must be reviewed against the latest live scenes before landing.

The bridge exists only in development/test builds. It gives deterministic tooling a stable way to observe and set up bounded Phaser scenarios without coupling tests to arbitrary private scene fields.

```ts
interface CardEngineStudioBridge {
  version: 1;
  listScenarios(): ScenarioDescriptor[];
  runScenario(name: string): Promise<ScenarioResult>;
  getSnapshot(): StudioRuntimeSnapshot;
  clearScenario(): void;
}

declare global {
  interface Window {
    __CARD_ENGINE_STUDIO__?: CardEngineStudioBridge;
  }
}
```

`StudioRuntimeSnapshot` should expose only stable test information:

- active game and scene key;
- route or mode;
- viewport and device profile;
- player world position, rendered bounds, display scale, direction, animation key/frame;
- camera scroll, zoom, bounds, follow target, and state;
- named important objects with world bounds, depth, visibility, and collision category;
- current scenario, phase, and assertion states;
- captured runtime/console errors.

Rules:

- Never ship the bridge in production bundles.
- Scene adapters translate implementation details into the stable contract.
- Tests do not reach directly into scene-private fields.
- Scenario setup is bounded and reversible.
- The bridge does not contain credentials or expose private account/player data.

Initial scenarios:

- `courtyard-character-walk`
- `courtyard-direction-validation`
- `courtyard-collision-and-occlusion`
- `tower-camera-follow`
- `tower-depth-sorting`
- `forge-strike-fullscreen-mobile`
