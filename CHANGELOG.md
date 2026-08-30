# Changelog

## Unreleased

- Added the typed `buttonStyle`, `containerStyle`, `faceHeight`, `autoWidth`, eventless `onLongPressAction`, accessibility text, and canonical `x` compatibility bridges without changing 3.1.0 legacy meanings.
- Hardened callback freshness, cancellation, one-shot progress completion, teardown, Reduced Motion, large-text, RTL, and theme-transition ownership.
- Added package-owned compatibility, lifecycle, sizing, accessibility, normalization, and theme regressions.
- Added deterministic release preflight, API-report, documentation-coverage, package-shape, coverage, and CI configuration. These gates do not publish the package.
- Preserved explicitly requested flat visual styling while disabled; disabled state still blocks activation.
- Adopted the shared grapheme-aware text-transition timeline, per-frame native fit checks, 30% width/text choreography, constrained single-line fallback, stable accessibility identity, and Reduced Motion settlement.

See [MIGRATION.md](./MIGRATION.md) for compatibility details and deferred major-version debt.
