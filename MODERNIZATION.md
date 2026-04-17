# React Native Awesome Button Modernization

## Summary

This document is the implementation plan for modernizing the current `react-native-awesome-button` repo.

The package should **not** be renamed to `@rcaferati/react-native-awesome-button` yet. The scoped rename comes **after** the library is stabilized, documented, and releasable on the current package line.

The modernization should happen in two waves:

1. Stabilize and modernize the existing library under `react-native-really-awesome-button`
2. Publish the scoped package and deprecate the old package with a clear migration path

## Current Findings

The current repo has several concrete issues that should define the modernization scope:

- The repo name is `react-native-awesome-button`, but the package metadata, README, npm links, issue URLs, and demo imports still point to `react-native-really-awesome-button`.
- The live npm package is `react-native-really-awesome-button@2.0.4`.
- `@rcaferati/react-native-awesome-button` is not published yet.
- The implementation is based on older React Native assumptions:
  - React `17`
  - React Native `0.68`
  - Expo demo on `45`
  - CircleCI `node:16`
- `package.json` still publishes files that do not exist in the repo:
  - `android`
  - `ios`
  - `cpp`
  - `react-native-really-awesome-button.podspec`
- Tooling and scripts still refer to `example`, while the actual app folder is `demo`.
- The `psbcr` crash from issue `#116` is real: `src/themed/colors.js` relies on `this.pSBCr` in module scope and should be replaced with a pure function.
- The press lifecycle is fragile:
  - action dispatch is tied to `onPressOut`
  - this likely explains issue `#44` and may also be related to issue `#53`
- The themed API has drift:
  - `transparent` exists in `ThemedButton` but is not implemented
  - invalid theme lookup can return `null` and cause crashes
  - theme and variant typing is loose
  - README defaults do not fully match runtime defaults

Open issues informing this plan:

- `#116` cannot read properties of undefined reading `psbcr`
- `#60` add sound to the button
- `#59` transparent picture button
- `#57` problem with the colors
- `#53` hair trigger when overlaying other button
- `#44` `onPress` only fired when I hold the button and not when touched

## Phase 1: Stabilization

### Goals

- Fix known crashes and event-flow bugs first
- Keep the public runtime surface recognizable
- Avoid shipping the scoped rename before the package is healthy

### Core fixes

- Replace the color helper with a pure typed module.
  - Remove all `this`-based parser state.
  - Add deterministic parsing and blending behavior.
  - This is the direct fix for issue `#116`.
- Rework button press handling to follow native `Pressable` semantics.
  - `onPressIn` should trigger the press-in animation only.
  - `onPressOut` should trigger the release animation only.
  - `onPress` should be the only source of action dispatch.
  - Progress mode must continue to support completion via callback.
- Keep `onPressedIn`, `onPressedOut`, `onProgressStart`, and `onProgressEnd`, but treat them as lifecycle observers rather than alternate action triggers.
- Guard theme resolution.
  - `getTheme()` must never crash on invalid `name` or `index`.
  - `ThemedButton` must fall back safely to the default theme or fail predictably with a documented error path.
- Implement `transparent` properly for issue `#59`.
  - Transparent buttons should preserve content and hit target.
  - Base, shadow, and bottom layers should become visually transparent.
  - Press behavior should still work.
- Normalize theme color behavior for issue `#57`.
  - Every theme must resolve valid colors for every maintained variant.
  - Docs must match code defaults.

### Non-goals in Phase 1

- No scoped rename yet
- No sound feature yet
- No major animation redesign
- No dependency on `react-native-reanimated`

## Phase 2: Core Modernization

### Target baseline

- `react >= 18`
- `react-native >= 0.76`
- New Architecture compatibility is required
- Continue using built-in `Animated` in this cycle

### Type and API cleanup

- Preserve the main public surface:
  - default export `AwesomeButton`
  - named exports `ThemedButton`
  - named export `getTheme`
- Replace loose public typing with explicit exported types:
  - `AwesomeButtonProps`
  - `ThemedButtonProps`
  - `ThemeDefinition`
  - `ThemeName`
  - `ButtonVariant`
  - `ButtonSize`
- Remove public-surface `any` usage from:
  - theme config
  - helper contracts
  - button props
  - themed wrapper props
- Make variant support exact.
  - Exported type unions must match the implemented theme map.
  - Hidden or inconsistent theme variants should be removed or fully supported.
- Keep `dangerouslySetPressableProps`, but document it as an escape hatch that must not replace the core press lifecycle.

### Progress behavior

- Preserve existing callback-based progress completion (`next`).
- Refactor internals so a future promise-based API can be added without another lifecycle rewrite.
- Do not introduce a breaking change for progress handling in the first modernization release.

## Phase 3: Packaging, Demo, and Documentation Cleanup

### Package cleanup

- Update `package.json` so published files match the repo.
  - Remove references to missing native folders and missing podspec.
  - Remove stale `example` references and use `demo` consistently.
- Update metadata to the current repo identity.
  - repository
  - homepage
  - bugs
  - README install/import guidance

### Demo cleanup

- Keep `demo/` as the example app.
- Upgrade the demo to a current Expo SDK aligned with the RN support floor.
- Make the demo the compatibility harness for:
  - basic button
  - progress button
  - icon-before/icon-after content
  - transparent button
  - theme switching
  - social variants

### Documentation cleanup

- Rewrite the README from the actual code.
- Fix stale references:
  - old package name
  - old badge/service links
  - outdated Expo instructions
  - incorrect prop defaults
  - incorrect theme usage examples
- Add a `MIGRATION.md` later for the rename and package transition.

### CI and maintenance

- Do not add new CI in this wave.
- Remove or update stale maintenance assumptions after the core code is stable.
- Local quality gates should be enough for the first pass:
  - typecheck
  - lint
  - test
  - build
  - `npm pack --dry-run`

## Sound Strategy

### Decision

Sound is worth designing now, but should **not** ship in the first implementation wave.

### Reasoning

- It is a good enhancement idea from issue `#60`.
- It should not force a bundled audio dependency.
- It should not complicate the stabilization release.

### Planned direction

- Refactor the press lifecycle so all internal phases are centralized:
  - `pressIn`
  - `press`
  - `pressOut`
  - `progressStart`
  - `progressEnd`
- If sound is added later, it should be adapter-based.
  - No bundled `expo-av`
  - No bundled `react-native-sound`
  - No mandatory native setup
- The future public surface should be a lightweight hook or adapter contract, not asset management baked into the component.

## Rename and Release Strategy

### Decision

The rename to `@rcaferati/react-native-awesome-button` happens only after the modernization work is releasable.

### Release order

1. Ship the stabilized modern version on `react-native-really-awesome-button`
2. Update docs and release notes for the scoped package
3. Publish `@rcaferati/react-native-awesome-button`
4. Deprecate `react-native-really-awesome-button` on npm with a migration message

### Migration expectations

- The rename should be a packaging and import-path migration, not a simultaneous API redesign.
- Consumers should keep the same runtime API wherever possible.
- The old package should remain available long enough to support a clean migration window.

## Public API Expectations

The first modernization release should preserve these public exports:

- `default` export: `AwesomeButton`
- `ThemedButton`
- `getTheme`

The first modernization release should continue to support these main capabilities:

- standard button
- progress button
- theme-based button wrapper
- before/after content
- extra content
- lifecycle callbacks
- `dangerouslySetPressableProps`

The first modernization release should add or normalize:

- real `transparent` support
- explicit TypeScript public types
- safer theme fallback behavior
- exact variant typing

## Test Plan

### Unit coverage

- color parsing and blending
- `psbcr` regression coverage
- `getTheme()` fallback behavior
- invalid theme `name` and `index`
- transparent theme/layer rendering
- theme variant matrix and exported type consistency

### Interaction coverage

- `onPress` fires on normal press, not only on long/held touch
- `onPressIn` and `onPressOut` preserve animation sequencing
- release animation does not dispatch duplicate actions
- progress mode starts and completes correctly
- disabled buttons never dispatch actions
- overlapping or off-target gesture behavior does not hair-trigger actions

### Packaging and verification

- typecheck
- lint
- jest
- build
- `npm pack --dry-run`

### Manual checks

- iOS and Android press behavior
- transparent button appearance
- icon/button composition
- progress button flow
- theme examples
- upgraded Expo demo boot and interaction sanity

## Definition of Done

The modernization milestone is complete when:

- the `psbcr` crash is fixed
- press handling follows native `Pressable` semantics
- transparent mode is real and documented
- theme lookup is safe and typed
- README matches the real package behavior
- package metadata no longer points at stale repo names and missing files
- the demo runs on the new supported baseline
- local quality gates pass
- the package is ready for the later scoped rename without further structural cleanup

## Assumptions

- The support floor moves to modern React Native rather than preserving broad legacy compatibility.
- New Architecture compatibility matters more than supporting older React Native releases.
- Sound is intentionally deferred from the first implementation wave.
- No new CI should be introduced during this first modernization pass.
- The scoped package rename is a follow-up release step, not part of the initial stabilization milestone.
