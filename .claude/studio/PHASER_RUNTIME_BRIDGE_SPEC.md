# Phaser Runtime Observation Bridge — Implemented Contract

**Status:** implemented and locally verified on 2026-08-03 for the courtyard. The bridge and its URL evidence transport are development-only and must remain absent from production bundles.

The bridge gives deterministic tooling a stable way to observe and run bounded Phaser scenarios without coupling tests to arbitrary private scene fields.

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

`StudioRuntimeSnapshot` exposes only stable test information:

- active scene and route;
- viewport;
- player feet-origin position and body bounds;
- velocity, facing, animation, depth, and reduced-motion state;
- fixed-fit camera state;
- named solids and occluders;
- current scenario assertions and verdict;
- a bounded list of runtime errors.

## Current named scenarios

- `courtyard-direction-validation`
- `courtyard-collision-and-occlusion`
- `courtyard-reduced-motion-walk`

These are the only implemented scenarios. Tower scenarios remain future work because no matching Phaser tower scene exists. Forge Strike is a React surface and its shipping workflow is retired.

## Development URL transport

Some browser automation runs page inspection in an isolated execution world and cannot access page globals. In development only, a thin transport invokes the same bridge API from the page's main world:

```text
/castle?studioScenario=<allowlisted-name>&studioRun=<unique-nonce>
```

It waits for a real courtyard snapshot, runs once per nonce, and writes a sanitized result to:

```html
<output id="card-engine-studio-result" data-status="running|pass|fail">
```

The transport contains no movement or assertion logic of its own. It cannot expose the Phaser instance, arbitrary scene fields, account data, credentials, environment values, or local stack paths. Unknown scenarios return a bounded FAIL without moving the player.

## Rules

- Never ship the bridge or URL transport in production bundles.
- Scene adapters translate implementation details into the stable contract.
- Tests do not reach directly into scene-private fields.
- Scenario setup is bounded, reversible, and restored in `finally` cleanup.
- React StrictMode cleanup cannot leave a duplicate bridge or duplicate run.
- The bridge contains no credentials or private account/player data.

## Local evidence — 2026-08-03

- Direction scenario: PASS for up, down, left, and right movement/facing.
- Collision/occlusion scenario: PASS for fountain feet-body collision and lamp depth order.
- Reduced-motion scenario: PASS for movement/facing with walk animation held still.
- Unknown scenario: bounded FAIL with a clean console.
- Courtyard screenshots: captured at live gameplay scale.
- Production bundle scan: required before release and recorded in the release verification.
