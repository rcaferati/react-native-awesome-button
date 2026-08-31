# Performance Evidence

Pass 5 treats performance evidence as informational. It does not establish a release threshold.

The package-owned benchmark records React Profiler commit counts for a mounted button receiving rapid A → B → C callback, style, content, and size updates. It also verifies that unmount cleanup prevents post-removal progress and animation dispatch. Run it with:

```sh
yarn test performanceBaseline --runInBand
```

## Pass 5 local baseline

Recorded on 2026-08-30 using a 14-core Apple M3 Max MacBook Pro with 36 GB memory, macOS 26.6.2 (25G83), arm64, Node 24.15.0, Yarn 4.5.1, React 18.2.0, and React Native 0.76.0. Jest ran serially in its package test/development transform environment; this is not an optimized application build or a device frame-rate measurement.

After five unrecorded warm-up repetitions, 25 measured repetitions each mounted one core button, committed three rapid callback/style/content/height replacements, and unmounted it. React Profiler reported exactly eight commits per repetition. The wall-clock median was 2.679 ms with a median absolute deviation of 0.206 ms. Wall-clock values are retained only as local comparison evidence and are never asserted by CI. A second regression verifies that teardown cancels queued progress completion.

A future performance change must retain the observable-behavior tests, rerun the same method on a declared host, and include before/after evidence. No README performance claim is authorized from this initial baseline.
