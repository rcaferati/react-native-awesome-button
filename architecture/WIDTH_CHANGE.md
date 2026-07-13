# Width Change Architecture

React Native Awesome Button animates size changes by default through
`animateSize={true}`. Fixed `width` and `height` changes animate, measured
auto-width string label changes animate, and `animateSize={false}` keeps both
paths instant. Bridge changes between fixed and auto width remain instant for
this release.

## Runtime Split

`src/useButtonSizeBehavior.ts` owns the size state machine. It tracks resolved
width and height, animated dimension values, displayed string text, text/width
choreography, stale-run guards, and cleanup for interrupted animations.

`src/autoWidthMeasurement.tsx` owns target width discovery for auto-width string
labels. It provides a shared detached measurement host, host registration and
failover, FIFO request processing, in-flight dedupe, and a bounded LRU cache.

`src/Button.tsx` stays as the render consumer. It receives resolved dimensions,
animated styles, displayed text, visible layout handlers, and renders the
shared measurement host anchor without owning the size behavior.

## Choreography Rules

Initial auto-width measurement snaps into place so first paint does not animate
from an artificial zero width.

When the next string is wider and `textTransition` is enabled, width animation
and text animation start together. When the next string is narrower,
`textTransition` starts first and width animation starts `50ms` later.

Without `textTransition`, wider strings grow width first and then swap text;
narrower strings swap text first and then shrink width. If the measured width is
unchanged, the size phase is skipped and only the text phase runs.

## Measurement And Performance

Auto-width choreography is intentionally limited to plain string children with
no `before`, `after`, or `extra` content. Other auto-width content falls back to
visible layout measurement because there is no safe target string to premeasure.

Target strings are measured in a detached transparent `Modal` host, not inside
the live button subtree. This prevents row layouts, parent constraints, or the
current compact button width from capping intrinsic target width. The host
measures the full hidden padded and bordered container, not raw text width.

Only one measurement request is active at a time. Identical queued or active
requests share the same result, and resolved widths are cached in a `250` entry
LRU keyed by width-affecting inputs such as text, font family, font size, bold
weight, border width, and horizontal padding.

The modal host mounts only while an active measurement exists. Keeping it
mounted after measurement would create an invisible overlay that can intercept
touches on the demo and consuming apps.

## Implementation Constraints

Dimension animation uses JS-driven `Animated.timing` with `125ms` and
`Easing.bezier(0.3, 0.05, 0.2, 1)`. React Native cannot native-drive layout
properties such as `width` and `height`, so these animations must use
`useNativeDriver: false`.

The visible label remains single-line with clipped overflow during text frames.
This keeps scramble frames from wrapping while the button is growing or
shrinking.

The size controller gates asynchronous measurements and animation completions
with run tokens so stale work cannot publish after a newer label or size target
takes ownership.
