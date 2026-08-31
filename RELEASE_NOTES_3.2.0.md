# React Native Awesome Button 3.2.0

React Native Awesome Button 3.2.0 makes interaction, progress, sizing, and text transitions more
predictable while expanding the typed configuration and accessibility surface.

## Highlights

- Keeps callbacks current across rerenders while preserving transition-scoped release and progress
  completion behavior.
- Strengthens cancellation, long-press replacement, one-shot progress completion, Reduced Motion,
  large-text, RTL, and numeric validation behavior.
- Stabilizes auto-width growth and shrink choreography so labels settle without stale frames,
  reversal, or overshoot.
- Adds typed `buttonStyle`, `containerStyle`, `faceHeight`, `autoWidth`, accessibility text, and the
  canonical `x` compatibility bridge.
- Adds deterministic package, API-report, documentation-coverage, payload, and regression gates.

## Compatibility

- Existing 3.1.0 call sites and legacy aliases remain supported. Canonical bridge fields take
  precedence when both forms are supplied.
- Legacy geometry defaults remain unchanged and are documented in `MIGRATION.md` as future
  major-version debt.
- npm consumers upgrading from 3.0.2 also receive the size-transition improvements documented by
  the GitHub-only v3.1.0 release; old source is not being republished as 3.1.0.

## Verification

- `yarn release:check` — passed.
- 12 Jest suites, 128 tests, and 2 snapshots — passed.
- TypeScript, lint, API Extractor, TSDoc coverage, generated builds, and npm payload validation —
  passed.

## Installation

```sh
yarn add @rcaferati/react-native-awesome-button@3.2.0
```

## Full Changelog

See [v3.1.0...v3.2.0](https://github.com/rcaferati/react-native-awesome-button/compare/v3.1.0...v3.2.0).
