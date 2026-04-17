# React Native Awesome Button Demo

`demo/` is the Expo SDK 52 compatibility harness for `react-native-really-awesome-button`.

The app resolves the package name to the local library source during development, so changes in `../src` are reflected in the demo without publishing first.

## What It Covers

- registered theme navigation
- basic buttons
- progress buttons
- before / after / icon content
- transparent buttons
- social variants
- extra-content button compositions

The demo is configured for Expo SDK 52, React Native `0.76`, Hermes, and `newArchEnabled: true`.

## Install

From the repo root:

```bash
yarn --cwd demo install
```

## Run

From the repo root:

```bash
yarn demo
yarn demo:ios
yarn demo:android
yarn demo:web
```

Or run Expo directly inside `demo/`:

```bash
npx expo start
```

No global `expo-cli` install is required.
