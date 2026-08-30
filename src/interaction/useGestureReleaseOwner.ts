import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Animated, Easing, type GestureResponderEvent } from 'react-native';
import {
  ANIMATED_TIMING_OFF,
  DEFAULT_DEBOUNCED_PRESS_TIME,
} from '../constants';
import { cancelFrame, requestFrame } from '../frameLoop';
import { animateSpring, animateTiming } from '../helpers';
import { normalizeNonNegative } from '../normalization';
import type { PressProgressLiveDependencies } from './contracts';

type GestureDisposition = 'armed' | 'blocked' | 'long';

type ActiveGesture = {
  disposition: GestureDisposition;
  id: number;
};

type UseGestureReleaseOwnerOptions = {
  animatedActive: Animated.Value;
  animatedOpacity: Animated.Value;
  animatedValue: Animated.Value;
  getBusy: () => boolean;
  getLive: () => PressProgressLiveDependencies;
  isMounted: () => boolean;
  requestActivation: (physicalLifecycle: boolean) => boolean;
};

const useGestureReleaseOwner = ({
  animatedActive,
  animatedOpacity,
  animatedValue,
  getBusy,
  getLive,
  isMounted,
  requestActivation,
}: UseGestureReleaseOwnerOptions) => {
  const gestureSequenceRef = useRef(0);
  const activeGestureRef = useRef<ActiveGesture | null>(null);
  const releasedGestureRef = useRef<GestureDisposition | null>(null);
  const pressedRef = useRef(false);
  const releasingRef = useRef(false);
  const releaseGenerationRef = useRef(0);
  const lastAcceptedAtRef = useRef<number | null>(null);
  const releaseSnapshotRef = useRef<(() => void) | undefined>(undefined);
  const releaseContinuationRef = useRef<(() => void) | undefined>(undefined);
  const pressAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const releaseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const releasedDispositionFrameRef = useRef<ReturnType<
    typeof requestFrame
  > | null>(null);
  const activationFrameOneRef = useRef<ReturnType<typeof requestFrame> | null>(
    null
  );
  const activationFrameTwoRef = useRef<ReturnType<typeof requestFrame> | null>(
    null
  );
  const activationFrameThreeRef = useRef<ReturnType<
    typeof requestFrame
  > | null>(null);
  const pressOutFrameOneRef = useRef<ReturnType<typeof requestFrame> | null>(
    null
  );
  const pressOutFrameTwoRef = useRef<ReturnType<typeof requestFrame> | null>(
    null
  );
  const pressOutFrameThreeRef = useRef<ReturnType<typeof requestFrame> | null>(
    null
  );
  const longPressGestureActiveRef = useRef(false);
  const longPressArmedRef = useRef(false);
  const longPressDisarmedRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const isStructurallyEligible = useCallback(() => {
    const live = getLive();
    return isMounted() && !live.disabled && live.hasChildren && !getBusy();
  }, [getBusy, getLive, isMounted]);

  const stopOwnedWork = useCallback(() => {
    releaseGenerationRef.current += 1;
    pressAnimationRef.current?.stop();
    releaseAnimationRef.current?.stop();
    pressAnimationRef.current = null;
    releaseAnimationRef.current = null;
    clearLongPressTimer();
    cancelFrame(releasedDispositionFrameRef.current);
    cancelFrame(activationFrameOneRef.current);
    cancelFrame(activationFrameTwoRef.current);
    cancelFrame(activationFrameThreeRef.current);
    cancelFrame(pressOutFrameOneRef.current);
    cancelFrame(pressOutFrameTwoRef.current);
    cancelFrame(pressOutFrameThreeRef.current);
    releasedDispositionFrameRef.current = null;
    activationFrameOneRef.current = null;
    activationFrameTwoRef.current = null;
    activationFrameThreeRef.current = null;
    pressOutFrameOneRef.current = null;
    pressOutFrameTwoRef.current = null;
    pressOutFrameThreeRef.current = null;
    releaseSnapshotRef.current = undefined;
    releaseContinuationRef.current = undefined;
  }, [clearLongPressTimer]);

  const settlePressVisuals = useCallback(() => {
    animatedActive.setValue(0);
    animatedValue.setValue(0);
    animatedOpacity.setValue(1);
    pressedRef.current = false;
    releasingRef.current = false;
  }, [animatedActive, animatedOpacity, animatedValue]);

  const finishRelease = useCallback(
    (
      generation: number,
      snapshot: (() => void) | undefined,
      continuation: (() => void) | undefined
    ) => {
      if (!isMounted() || releaseGenerationRef.current !== generation) return;
      releasingRef.current = false;
      releaseAnimationRef.current = null;
      pressedRef.current = false;
      releaseSnapshotRef.current = undefined;
      releaseContinuationRef.current = undefined;
      snapshot?.();
      if (!isMounted() || releaseGenerationRef.current !== generation) return;
      continuation?.();
    },
    [isMounted]
  );

  const beginRelease = useCallback(
    (onPressedOutSnapshot?: () => void, continuation?: () => void) => {
      if (!isMounted() || releasingRef.current) return false;
      pressAnimationRef.current?.stop();
      pressAnimationRef.current = null;
      releasingRef.current = true;
      releaseGenerationRef.current += 1;
      const generation = releaseGenerationRef.current;
      releaseSnapshotRef.current = onPressedOutSnapshot;
      releaseContinuationRef.current = continuation;
      const live = getLive();

      if (live.reduceMotion) {
        settlePressVisuals();
        finishRelease(generation, onPressedOutSnapshot, continuation);
        return true;
      }

      const animation = live.springRelease
        ? Animated.parallel([
            animateSpring({ variable: animatedActive, toValue: 0 }),
            animateSpring({ variable: animatedValue, toValue: 0 }),
            animateTiming({ variable: animatedOpacity, toValue: 1 }),
          ])
        : Animated.parallel([
            animateTiming({
              variable: animatedActive,
              toValue: 0,
              duration: ANIMATED_TIMING_OFF,
            }),
            animateTiming({
              variable: animatedValue,
              toValue: 0,
              duration: ANIMATED_TIMING_OFF,
            }),
            animateTiming({ variable: animatedOpacity, toValue: 1 }),
          ]);
      releaseAnimationRef.current = animation;
      animation.start(({ finished }) => {
        if (
          finished &&
          releaseAnimationRef.current === animation &&
          releaseGenerationRef.current === generation
        ) {
          finishRelease(generation, onPressedOutSnapshot, continuation);
        }
      });
      return true;
    },
    [
      animatedActive,
      animatedOpacity,
      animatedValue,
      finishRelease,
      getLive,
      isMounted,
      settlePressVisuals,
    ]
  );

  const cancelActiveGesture = useCallback(() => {
    const active = activeGestureRef.current;
    if (active === null) return;
    activeGestureRef.current = null;
    releasedGestureRef.current =
      active.disposition === 'long' ? 'long' : 'blocked';
    cancelFrame(releasedDispositionFrameRef.current);
    releasedDispositionFrameRef.current = null;
    clearLongPressTimer();
    longPressDisarmedRef.current = true;
    if (pressedRef.current && !getBusy()) {
      beginRelease(getLive().onPressedOut);
    }
  }, [beginRelease, clearLongPressTimer, getBusy, getLive]);

  const commitPressedState = useCallback(
    (gestureId: number) => {
      if (
        activeGestureRef.current?.id !== gestureId ||
        !isStructurallyEligible()
      ) {
        return false;
      }
      pressedRef.current = true;
      return true;
    },
    [isStructurallyEligible]
  );

  const beginPressVisual = useCallback(
    (gestureId: number) => {
      if (
        activeGestureRef.current?.id !== gestureId ||
        !isStructurallyEligible()
      ) {
        return;
      }
      releaseGenerationRef.current += 1;
      releaseAnimationRef.current?.stop();
      releaseAnimationRef.current = null;
      releasingRef.current = false;
      const live = getLive();
      const duration = live.reduceMotion
        ? 0
        : live.pressInAnimationDuration ??
          live.animationDuration ??
          ANIMATED_TIMING_OFF;
      if (duration === 0) {
        animatedValue.setValue(1);
        animatedActive.setValue(1);
        animatedOpacity.setValue(live.progress ? 1 : live.activeOpacity);
        return;
      }
      const easing = live.animationCurve ?? Easing.out(Easing.cubic);
      const animation = Animated.parallel([
        animateTiming({
          variable: animatedValue,
          toValue: 1,
          duration,
          easing,
        }),
        animateTiming({
          variable: animatedActive,
          toValue: 1,
          duration,
          easing,
        }),
        animateTiming({
          variable: animatedOpacity,
          toValue: live.progress ? 1 : live.activeOpacity,
          duration,
          easing,
        }),
      ]);
      pressAnimationRef.current = animation;
      animation.start(({ finished }) => {
        if (finished && pressAnimationRef.current === animation) {
          pressAnimationRef.current = null;
        }
      });
    },
    [
      animatedActive,
      animatedOpacity,
      animatedValue,
      getLive,
      isStructurallyEligible,
    ]
  );

  const dispatchPhysicalLongPress = useCallback(
    (event: GestureResponderEvent) => {
      const active = activeGestureRef.current;
      if (
        active === null ||
        active.disposition !== 'armed' ||
        !longPressGestureActiveRef.current ||
        !longPressArmedRef.current ||
        longPressDisarmedRef.current ||
        !isStructurallyEligible()
      ) {
        return;
      }
      const live = getLive();
      if (live.onLongPressAction !== undefined) {
        live.onLongPressAction();
      } else if (live.onLongPress != null) {
        live.onLongPress(event);
      } else {
        return;
      }
      active.disposition = 'long';
      if (!isMounted() || !isStructurallyEligible()) cancelActiveGesture();
    },
    [cancelActiveGesture, getLive, isMounted, isStructurallyEligible]
  );

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      clearLongPressTimer();
      const liveAtStart = getLive();
      const hasLongPress =
        liveAtStart.onLongPressAction !== undefined ||
        liveAtStart.onLongPress !== undefined;
      longPressGestureActiveRef.current = true;
      longPressArmedRef.current = hasLongPress;
      longPressDisarmedRef.current = !hasLongPress;
      event.persist?.();

      if (!isStructurallyEligible()) {
        releasedGestureRef.current = 'blocked';
        return;
      }
      gestureSequenceRef.current += 1;
      const gestureId = gestureSequenceRef.current;
      activeGestureRef.current = { id: gestureId, disposition: 'armed' };
      releasedGestureRef.current = null;
      liveAtStart.onPressIn?.(event);
      if (!commitPressedState(gestureId)) {
        cancelActiveGesture();
        return;
      }
      Promise.resolve().then(() => {
        if (!isMounted()) return;
        if (
          activeGestureRef.current?.id !== gestureId ||
          !isStructurallyEligible()
        ) {
          cancelActiveGesture();
          return;
        }
        getLive().onPressedIn?.();
        if (
          activeGestureRef.current?.id !== gestureId ||
          !isStructurallyEligible()
        ) {
          cancelActiveGesture();
          return;
        }
        beginPressVisual(gestureId);
      });

      if (hasLongPress && isStructurallyEligible()) {
        const delay = normalizeNonNegative(liveAtStart.delayLongPress, 500);
        longPressTimerRef.current = setTimeout(() => {
          longPressTimerRef.current = null;
          dispatchPhysicalLongPress(event);
        }, delay);
      }
    },
    [
      beginPressVisual,
      cancelActiveGesture,
      clearLongPressTimer,
      commitPressedState,
      dispatchPhysicalLongPress,
      getLive,
      isMounted,
      isStructurallyEligible,
    ]
  );

  const rememberReleasedDisposition = useCallback(
    (disposition: GestureDisposition) => {
      releasedGestureRef.current = disposition;
      cancelFrame(releasedDispositionFrameRef.current);
      releasedDispositionFrameRef.current = requestFrame(() => {
        releasedDispositionFrameRef.current = null;
        releasedGestureRef.current = null;
      });
    },
    []
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      clearLongPressTimer();
      const active = activeGestureRef.current;
      if (active === null) {
        longPressGestureActiveRef.current = false;
        longPressArmedRef.current = false;
        return;
      }
      activeGestureRef.current = null;
      rememberReleasedDisposition(active.disposition);
      const onPressedOutSnapshot = getLive().onPressedOut;
      event.persist?.();
      pressOutFrameOneRef.current = requestFrame(() => {
        pressOutFrameOneRef.current = null;
        pressOutFrameTwoRef.current = requestFrame(() => {
          pressOutFrameTwoRef.current = null;
          pressOutFrameThreeRef.current = requestFrame(() => {
            pressOutFrameThreeRef.current = null;
            if (!isMounted()) return;
            getLive().onPressOut?.(event);
            Promise.resolve().then(() => {
              if (!isMounted()) return;
              if (getLive().progress && active.disposition === 'armed') {
                if (!getBusy() && pressedRef.current) {
                  beginRelease(onPressedOutSnapshot);
                }
                return;
              }
              if (pressedRef.current) beginRelease(onPressedOutSnapshot);
            });
          });
        });
      });
      longPressGestureActiveRef.current = false;
      longPressArmedRef.current = false;
    },
    [
      beginRelease,
      clearLongPressTimer,
      getBusy,
      getLive,
      isMounted,
      rememberReleasedDisposition,
    ]
  );

  const handlePress = useCallback(() => {
    cancelFrame(releasedDispositionFrameRef.current);
    releasedDispositionFrameRef.current = null;
    const disposition = releasedGestureRef.current;
    releasedGestureRef.current = null;
    if (disposition === 'blocked' || disposition === 'long') return;
    const physicalLifecycle =
      disposition !== null || activeGestureRef.current !== null;
    if (activeGestureRef.current !== null && !getLive().progress) {
      activeGestureRef.current = null;
      if (pressedRef.current) beginRelease(getLive().onPressedOut);
    }
    requestActivation(physicalLifecycle);
  }, [beginRelease, getLive, requestActivation]);

  const handleAtomicPress = useCallback(
    () => requestActivation(false),
    [requestActivation]
  );

  const handleAtomicLongPress = useCallback(() => {
    const callback = getLive().onLongPressAction;
    if (!isStructurallyEligible() || callback === undefined) return false;
    callback();
    return true;
  }, [getLive, isStructurallyEligible]);

  const acceptDebounce = useCallback(() => {
    const duration = Math.max(
      0,
      getLive().debouncedPressTime ?? DEFAULT_DEBOUNCED_PRESS_TIME
    );
    const now = Date.now();
    if (
      duration > 0 &&
      lastAcceptedAtRef.current !== null &&
      now - lastAcceptedAtRef.current < duration
    ) {
      return false;
    }
    lastAcceptedAtRef.current = now;
    return true;
  }, [getLive]);

  const deferActivation = useCallback(
    (callback: () => void) => {
      activationFrameOneRef.current = requestFrame(() => {
        activationFrameOneRef.current = null;
        activationFrameTwoRef.current = requestFrame(() => {
          activationFrameTwoRef.current = null;
          activationFrameThreeRef.current = requestFrame(() => {
            activationFrameThreeRef.current = null;
            if (isMounted()) callback();
          });
        });
      });
    },
    [isMounted]
  );

  const releaseForProgress = useCallback(
    ({
      onPressedOutSnapshot,
      onSettled,
      physicalLifecycle,
    }: {
      onPressedOutSnapshot?: () => void;
      onSettled: () => void;
      physicalLifecycle: boolean;
    }) => {
      if (physicalLifecycle && pressedRef.current) {
        beginRelease(onPressedOutSnapshot, onSettled);
      } else {
        settlePressVisuals();
        onSettled();
      }
    },
    [beginRelease, settlePressVisuals]
  );

  useLayoutEffect(() => {
    const live = getLive();
    if (
      longPressGestureActiveRef.current &&
      live.onLongPressAction === undefined &&
      live.onLongPress === undefined
    ) {
      longPressDisarmedRef.current = true;
      clearLongPressTimer();
    }
  });

  useEffect(() => {
    const live = getLive();
    if (live.disabled || !live.hasChildren) cancelActiveGesture();
  });

  useEffect(() => {
    const live = getLive();
    if (!live.reduceMotion) return;
    pressAnimationRef.current?.stop();
    releaseAnimationRef.current?.stop();
    if (releasingRef.current) {
      const generation = releaseGenerationRef.current;
      const snapshot = releaseSnapshotRef.current;
      const continuation = releaseContinuationRef.current;
      settlePressVisuals();
      finishRelease(generation, snapshot, continuation);
      return;
    }
    if (getBusy()) return;
    if (pressedRef.current) {
      animatedValue.setValue(1);
      animatedActive.setValue(1);
      animatedOpacity.setValue(live.progress ? 1 : live.activeOpacity);
    } else {
      settlePressVisuals();
    }
  });

  useLayoutEffect(
    () => () => {
      activeGestureRef.current = null;
      releasedGestureRef.current = null;
      longPressGestureActiveRef.current = false;
      longPressArmedRef.current = false;
      longPressDisarmedRef.current = true;
      stopOwnedWork();
    },
    [stopOwnedWork]
  );

  return {
    acceptDebounce,
    deferActivation,
    handleAtomicLongPress,
    handleAtomicPress,
    handlePress,
    handlePressIn,
    handlePressOut,
    isStructurallyEligible,
    releaseForProgress,
  };
};

export default useGestureReleaseOwner;
