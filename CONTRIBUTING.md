# Contributing

## Toolchain

- Node 24.15.0
- Corepack 0.36.0 with Yarn 4.5.1
- npm is used only to bootstrap Corepack and inspect the publication tarball;
  Yarn remains the sole project dependency resolver

Bootstrap the package root with:

```sh
npm install --global corepack@0.36.0
corepack enable
yarn install --immutable
```

Run the complete non-publishing package gate with:

```sh
yarn release:check
```

That command checks formatting, ESLint, TypeScript, package-owned Jest coverage, the built package, the reviewed API report, exported TSDoc coverage, and the npm tarball manifest. It never updates the API baseline or publishes.

To review an intentional API change, run `yarn prepare` followed by `yarn api:report`, inspect `etc/react-native-awesome-button.api.md`, and update `CHANGELOG.md` plus `MIGRATION.md`. CI uses `yarn api:check` and never rewrites the report.

Tests belong under `src/__tests__`. The Expo demo is a showcase and is not an automated package-test target. Physical-device accessibility, keyboard, RTL, large-text, and Reduced Motion checks remain manual runtime evidence.
