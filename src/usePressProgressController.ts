import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Animated, Easing, type GestureResponderEvent } from 'react-native';
import { animateElastic, animateSpring, animateTiming } from './helpers';
import { cancelFrame, requestFrame } from './frameLoop';
import { ANIMATED_TIMING_OFF, DEFAULT_DEBOUNCED_PRESS_TIME } from './constants';
import type {
  AwesomeButtonAnimationCurve,
  AwesomeButtonOnPress,
  ProgressCompletionHandler,
} from './types';

type PressProgressControllerOptions = {
  activeOpacity: number;
  animatedActive: Animated.Value;
  animatedLoading: Animated.Value;
  animatedOpacity: Animated.Value;
  animatedValue: Animated.Value;
  activityOpacity: Animated.Value;
  animationCurve?: AwesomeButtonAnimationCurve;
  animationDuration?: number;
  debouncedPressTime?: number;
  disabled: boolean;
  hasChildren: boolean;
  hasLongPress: boolean;
  loadingOpacity: Animated.Value;
  onPhysicalLongPress: (event: GestureResponderEvent) => boolean;
  onPress?: AwesomeButtonOnPress;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
  onPressedIn?: () => void;
  onPressedOut?: () => void;
  onProgressEnd?: () => void;
  onProgressStart?: () => void;
  pressInAnimationDuration?: number;
  progress: boolean;
  progressLoadingTime: number;
  reduceMotion: boolean;
  showProgressBar: boolean;
  springRelease: boolean;
  textOpacity: Animated.Value;
};

type GestureDisposition = 'armed' | 'blocked' | 'long';

type ActiveGesture = {
  id: number;
  disposition: GestureDisposition;
};

type LiveDependencies = Omit<
  PressProgressControllerOptions,
  | 'animatedActive'
  | 'animatedLoading'
  | 'animatedOpacity'
  | 'animatedValue'
  | 'activityOpacity'
  | 'loadingOpacity'
  | 'textOpacity'
>;

type ProgressRun = {
  id: number;
  completionClaimed: boolean;
  activationDelivered: boolean;
  physicalLifecycle: boolean;
  onProgressEndSnapshot?: () => void;
  completionSnapshot?: () => void;
};

const usePressProgressController = (
  options: PressProgressControllerOptions
) => {
  const {
    animatedActive,
    animatedLoading,
    animatedOpacity,
    animatedValue,
    activityOpacity,
    loadingOpacity,
    textOpacity,
  } = options;
  const [activity, setActivity] = useState(false);
  const liveRef = useRef<LiveDependencies>(options);
  const mountedRef = useRef(true);
  const gestureSequenceRef = useRef(0);
  const activeGestureRef = useRef<ActiveGesture | null>(null);
  const releasedGestureRef = useRef<GestureDisposition | null>(null);
  const pressedRef = useRef(false);
  const releasingRef = useRef(false);
  const busyRef = useRef(false);
  const lastAcceptedAtRef = useRef<number | null>(null);
  const progressSequenceRef = useRef(0);
  const progressRunRef = useRef<ProgressRun | null>(null);
  const releaseSnapshotRef = useRef<(() => void) | undefined>(undefined);
  const releaseContinuationRef = useRef<(() => void) | undefined>(undefined);
  const pressAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const releaseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const progressAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const progressCompletionFrameRef = useRef<ReturnType<
    typeof requestFrame
  > | null>(null);
  const progressFallbackFrameRef = useRef<ReturnType<
    typeof requestFrame
  > | null>(null);
  const releasedDispositionFrameRef = useRef<ReturnType<
    typeof requestFrame
  > | null>(null);
  const activationFrameOneRef = useRef<ReturnType<typeof requestFrame> | null>(
    null
  );
  const activationFrameTwoRef = useRef<ReturnType<typeof requestFrame> | null>(
    null
  );
  const pressOutFrameOneRef = useRef<ReturnType<typeof requestFrame> | null>(
    null
  );
  const pressOutFrameTwoRef = useRef<ReturnType<typeof requestFrame> | null>(
    null
  );

  useLayoutEffect(() => {
    liveRef.current = options;
  });

  const isStructurallyEligible = useCallback(() => {
    const live = liveRef.current;
    return (
      mountedRef.current &&
      !live.disabled &&
      live.hasChildren &&
      !busyRef.current
    );
  }, []);

  const stopVisualWork = useCallback(() => {
    pressAnimationRef.current?.stop();
    releaseAnimationRef.current?.stop();
    progressAnimationRef.current?.stop();
    pressAnimationRef.current = null;
    releaseAnimationRef.current = null;
    progressAnimationRef.current = null;
    cancelFrame(progressCompletionFrameRef.current);
    cancelFrame(progressFallbackFrameRef.current);
    cancelFrame(releasedDispositionFrameRef.current);
    cancelFrame(activationFrameOneRef.current);
    cancelFrame(activationFrameTwoRef.current);
    cancelFrame(pressOutFrameOneRef.current);
    cancelFrame(pressOutFrameTwoRef.current);
    progressCompletionFrameRef.current = null;
    progressFallbackFrameRef.current = null;
    releasedDispositionFrameRef.current = null;
    activationFrameOneRef.current = null;
    activationFrameTwoRef.current = null;
    pressOutFrameOneRef.current = null;
    pressOutFrameTwoRef.current = null;
    releaseContinuationRef.current = undefined;
  }, []);

  const settleVisuals = useCallback(() => {
    animatedActive.setValue(0);
    animatedValue.setValue(0);
    animatedOpacity.setValue(1);
    animatedLoading.setValue(0);
    loadingOpacity.setValue(0);
    textOpacity.setValue(1);
    activityOpacity.setValue(0);
    pressedRef.current = false;
    releasingRef.current = false;
  }, [
    activityOpacity,
    animatedActive,
    animatedLoading,
    animatedOpacity,
    animatedValue,
    loadingOpacity,
    textOpacity,
  ]);

  useLayoutEffect(
    () => () => {
      mountedRef.current = false;
      activeGestureRef.current = null;
      releasedGestureRef.current = null;
      progressRunRef.current = null;
      stopVisualWork();
    },
    [stopVisualWork]
  );

  const finishRelease = useCallback(
    (
      snapshot: (() => void) | undefined,
      continuation: (() => void) | undefined
    ) => {
      if (!mountedRef.current) return;
      releasingRef.current = false;
      releaseAnimationRef.current = null;
      pressedRef.current = false;
      releaseSnapshotRef.current = undefined;
      releaseContinuationRef.current = undefined;
      snapshot?.();
      if (!mountedRef.current) return;
      continuation?.();
    },
    []
  );

  const beginRelease = useCallback(
    (onPressedOutSnapshot?: () => void, continuation?: () => void) => {
      if (!mountedRef.current || releasingRef.current) return;

      pressAnimationRef.current?.stop();
      pressAnimationRef.current = null;
      releasingRef.current = true;
      releaseSnapshotRef.current = onPressedOutSnapshot;
      releaseContinuationRef.current = continuation;
      const live = liveRef.current;

      if (live.reduceMotion) {
        settleVisuals();
        finishRelease(onPressedOutSnapshot, continuation);
        return;
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
        if (finished && releaseAnimationRef.current === animation) {
          finishRelease(onPressedOutSnapshot, continuation);
        }
      });
    },
    [
      animatedActive,
      animatedOpacity,
      animatedValue,
      finishRelease,
      settleVisuals,
    ]
  );

  const cancelActiveGesture = useCallback(() => {
    const active = activeGestureRef.current;
    if (active === null) return;

    activeGestureRef.current = null;
    const onPressedOutSnapshot = liveRef.current.onPressedOut;
    if (pressedRef.current) beginRelease(onPressedOutSnapshot);
  }, [beginRelease]);

  useEffect(() => {
    if (options.disabled || !options.hasChildren) cancelActiveGesture();
  }, [cancelActiveGesture, options.disabled, options.hasChildren]);

  useEffect(() => {
    if (!options.reduceMotion) return;

    pressAnimationRef.current?.stop();
    releaseAnimationRef.current?.stop();
    progressAnimationRef.current?.stop();

    if (busyRef.current) {
      animatedLoading.setValue(options.showProgressBar ? 1 : 0);
      loadingOpacity.setValue(options.showProgressBar ? 1 : 0);
      textOpacity.setValue(0);
      activityOpacity.setValue(1);
    } else if (pressedRef.current) {
      animatedValue.setValue(1);
      animatedActive.setValue(1);
      animatedOpacity.setValue(options.progress ? 1 : options.activeOpacity);
    } else {
      const wasReleasing = releasingRef.current;
      const snapshot = releaseSnapshotRef.current;
      const continuation = releaseContinuationRef.current;
      settleVisuals();
      if (wasReleasing) finishRelease(snapshot, continuation);
    }
  }, [
    activityOpacity,
    animatedActive,
    animatedLoading,
    animatedOpacity,
    animatedValue,
    finishRelease,
    loadingOpacity,
    options.activeOpacity,
    options.progress,
    options.reduceMotion,
    options.showProgressBar,
    settleVisuals,
    textOpacity,
  ]);

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

      releaseAnimationRef.current?.stop();
      releaseAnimationRef.current = null;
      releasingRef.current = false;
      const live = liveRef.current;
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
    [animatedActive, animatedOpacity, animatedValue, isStructurallyEligible]
  );

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      const live = liveRef.current;
      if (!isStructurallyEligible()) {
        releasedGestureRef.current = 'blocked';
        return;
      }

      gestureSequenceRef.current += 1;
      const gestureId = gestureSequenceRef.current;
      activeGestureRef.current = { id: gestureId, disposition: 'armed' };
      releasedGestureRef.current = null;

      live.onPressIn?.(event);
      if (!commitPressedState(gestureId)) {
        cancelActiveGesture();
        return;
      }
      Promise.resolve().then(() => {
        if (!mountedRef.current) return;
        if (
          activeGestureRef.current?.id !== gestureId ||
          !isStructurallyEligible()
        ) {
          cancelActiveGesture();
          return;
        }

        liveRef.current.onPressedIn?.();
        if (
          activeGestureRef.current?.id !== gestureId ||
          !isStructurallyEligible()
        ) {
          cancelActiveGesture();
          return;
        }

        beginPressVisual(gestureId);
      });
    },
    [
      beginPressVisual,
      cancelActiveGesture,
      commitPressedState,
      isStructurallyEligible,
    ]
  );

  const handleLongPress = useCallback(
    (event: GestureResponderEvent) => {
      const active = activeGestureRef.current;
      if (
        active === null ||
        active.disposition !== 'armed' ||
        !isStructurallyEligible()
      ) {
        return;
      }

      if (liveRef.current.onPhysicalLongPress(event)) {
        active.disposition = 'long';
        if (!mountedRef.current || !isStructurallyEligible()) {
          cancelActiveGesture();
        }
      }
    },
    [cancelActiveGesture, isStructurallyEligible]
  );

  const acceptDebounce = useCallback(() => {
    const duration = Math.max(
      0,
      liveRef.current.debouncedPressTime ?? DEFAULT_DEBOUNCED_PRESS_TIME
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
  }, []);

  const finishProgress = useCallback(
    (run: ProgressRun) => {
      if (!mountedRef.current || progressRunRef.current !== run) return;

      const completeAfterRelease = () => {
        if (!mountedRef.current || progressRunRef.current !== run) return;
        busyRef.current = false;
        setActivity(false);
        run.completionSnapshot?.();
        Promise.resolve().then(() => {
          if (!mountedRef.current || progressRunRef.current !== run) return;
          run.onProgressEndSnapshot?.();
          if (!mountedRef.current || progressRunRef.current !== run) return;
          progressRunRef.current = null;
        });
      };

      const beginFinalRelease = () => {
        if (!mountedRef.current || progressRunRef.current !== run) return;
        if (run.physicalLifecycle && pressedRef.current) {
          beginRelease(liveRef.current.onPressedOut, completeAfterRelease);
        } else {
          pressedRef.current = false;
          animatedValue.setValue(0);
          animatedActive.setValue(0);
          animatedOpacity.setValue(1);
          completeAfterRelease();
        }
      };

      const live = liveRef.current;
      progressAnimationRef.current?.stop();
      if (live.reduceMotion) {
        animatedLoading.setValue(live.showProgressBar ? 1 : 0);
        loadingOpacity.setValue(0);
        textOpacity.setValue(1);
        activityOpacity.setValue(0);
        beginFinalRelease();
        return;
      }

      const animation = Animated.sequence([
        animateTiming({ variable: animatedLoading, toValue: 1, duration: 120 }),
        Animated.parallel([
          animateElastic({ variable: textOpacity, toValue: 1 }),
          animateElastic({ variable: activityOpacity, toValue: 0 }),
          animateTiming({
            variable: loadingOpacity,
            toValue: 0,
            delay: 120,
            duration: 160,
          }),
        ]),
      ]);
      progressAnimationRef.current = animation;
      animation.start(({ finished }) => {
        if (finished && progressAnimationRef.current === animation) {
          progressAnimationRef.current = null;
          beginFinalRelease();
        }
      });
    },
    [
      activityOpacity,
      animatedLoading,
      animatedActive,
      animatedOpacity,
      animatedValue,
      beginRelease,
      loadingOpacity,
      textOpacity,
    ]
  );

  const abortProgress = useCallback(
    (run: ProgressRun) => {
      if (progressRunRef.current !== run || run.completionClaimed) {
        return;
      }
      run.completionClaimed = true;
      const onProgressEndSnapshot = liveRef.current.onProgressEnd;
      progressAnimationRef.current?.stop();
      progressAnimationRef.current = null;
      animatedLoading.setValue(0);
      loadingOpacity.setValue(0);
      textOpacity.setValue(1);
      activityOpacity.setValue(0);
      const finishRollback = () => {
        if (!mountedRef.current || progressRunRef.current !== run) return;
        busyRef.current = false;
        setActivity(false);
        onProgressEndSnapshot?.();
        if (!mountedRef.current || progressRunRef.current !== run) return;
        progressRunRef.current = null;
      };
      if (run.physicalLifecycle && pressedRef.current) {
        beginRelease(liveRef.current.onPressedOut, finishRollback);
      } else {
        pressedRef.current = false;
        animatedValue.setValue(0);
        animatedActive.setValue(0);
        animatedOpacity.setValue(1);
        finishRollback();
      }
    },
    [
      activityOpacity,
      animatedActive,
      animatedLoading,
      animatedOpacity,
      animatedValue,
      beginRelease,
      loadingOpacity,
      textOpacity,
    ]
  );

  const beginProgress = useCallback(
    (physicalLifecycle: boolean) => {
      progressSequenceRef.current += 1;
      const run: ProgressRun = {
        id: progressSequenceRef.current,
        completionClaimed: false,
        activationDelivered: false,
        physicalLifecycle,
      };
      progressRunRef.current = run;
      busyRef.current = true;
      cancelFrame(progressFallbackFrameRef.current);
      progressFallbackFrameRef.current = null;
      setActivity(true);

      liveRef.current.onProgressStart?.();
      if (!mountedRef.current || progressRunRef.current !== run) return null;
      if (liveRef.current.disabled || !liveRef.current.hasChildren) {
        abortProgress(run);
        return null;
      }

      const live = liveRef.current;
      if (live.reduceMotion) {
        animatedLoading.setValue(live.showProgressBar ? 1 : 0);
        loadingOpacity.setValue(live.showProgressBar ? 1 : 0);
        textOpacity.setValue(0);
        activityOpacity.setValue(1);
      } else {
        animatedLoading.setValue(0);
        loadingOpacity.setValue(1);
        progressAnimationRef.current = Animated.parallel([
          animateTiming({
            variable: animatedLoading,
            toValue: 1,
            duration: live.progressLoadingTime,
            easing: Easing.linear,
          }),
          animateElastic({ variable: textOpacity, toValue: 0 }),
          animateElastic({ variable: activityOpacity, toValue: 1 }),
        ]);
        progressAnimationRef.current.start();
      }

      const next: ProgressCompletionHandler = (completion) => {
        if (
          !mountedRef.current ||
          progressRunRef.current !== run ||
          run.completionClaimed
        ) {
          return;
        }
        run.completionClaimed = true;
        run.completionSnapshot = completion;
        run.onProgressEndSnapshot = liveRef.current.onProgressEnd;
        progressCompletionFrameRef.current = requestFrame(() => {
          progressCompletionFrameRef.current = null;
          finishProgress(run);
        });
      };

      return { next, run };
    },
    [
      activityOpacity,
      animatedLoading,
      abortProgress,
      finishProgress,
      loadingOpacity,
      textOpacity,
    ]
  );

  const dispatchOrdinaryActivation = useCallback(
    (physicalLifecycle: boolean) => {
      const live = liveRef.current;
      if (!isStructurallyEligible() || live.onPress === undefined) return false;
      if (!acceptDebounce()) return false;

      const progressOwnership = live.progress
        ? beginProgress(physicalLifecycle)
        : null;
      activationFrameOneRef.current = requestFrame(() => {
        activationFrameOneRef.current = null;
        activationFrameTwoRef.current = requestFrame(() => {
          activationFrameTwoRef.current = null;
          requestFrame(() => {
            const current = liveRef.current;
            if (
              !mountedRef.current ||
              current.disabled ||
              !current.hasChildren ||
              current.onPress === undefined
            ) {
              if (progressOwnership !== null) {
                abortProgress(progressOwnership.run);
              }
              return;
            }

            if (progressOwnership !== null) {
              current.onPress(progressOwnership.next);
              if (progressRunRef.current === progressOwnership.run) {
                progressOwnership.run.activationDelivered = true;
              }
            } else {
              current.onPress();
            }
          });
        });
      });
      return true;
    },
    [abortProgress, acceptDebounce, beginProgress, isStructurallyEligible]
  );

  useEffect(() => {
    const run = progressRunRef.current;
    if (
      run !== null &&
      run.activationDelivered &&
      !run.completionClaimed &&
      (options.disabled || !options.hasChildren)
    ) {
      abortProgress(run);
    }
  }, [abortProgress, options.disabled, options.hasChildren]);

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
      const active = activeGestureRef.current;
      if (active === null) return;

      activeGestureRef.current = null;
      rememberReleasedDisposition(active.disposition);
      const onPressedOutSnapshot = liveRef.current.onPressedOut;
      event.persist?.();
      pressOutFrameOneRef.current = requestFrame(() => {
        pressOutFrameOneRef.current = null;
        pressOutFrameTwoRef.current = requestFrame(() => {
          pressOutFrameTwoRef.current = null;
          requestFrame(() => {
            if (!mountedRef.current) return;
            liveRef.current.onPressOut?.(event);
            Promise.resolve().then(() => {
              if (!mountedRef.current) return;

              if (liveRef.current.progress && active.disposition === 'armed') {
                if (!busyRef.current && pressedRef.current) {
                  beginRelease(onPressedOutSnapshot);
                }
                return;
              }

              if (pressedRef.current) {
                beginRelease(onPressedOutSnapshot);
              }
            });
          });
        });
      });
    },
    [beginRelease, rememberReleasedDisposition]
  );

  const handlePress = useCallback(() => {
    cancelFrame(releasedDispositionFrameRef.current);
    releasedDispositionFrameRef.current = null;
    const disposition = releasedGestureRef.current;
    releasedGestureRef.current = null;
    if (disposition === 'blocked' || disposition === 'long') return;
    const physicalLifecycle =
      disposition !== null || activeGestureRef.current !== null;
    if (activeGestureRef.current !== null && !liveRef.current.progress) {
      activeGestureRef.current = null;
      if (pressedRef.current) beginRelease(liveRef.current.onPressedOut);
    }
    dispatchOrdinaryActivation(physicalLifecycle);
  }, [beginRelease, dispatchOrdinaryActivation]);

  const handleAtomicPress = useCallback(() => {
    dispatchOrdinaryActivation(false);
  }, [dispatchOrdinaryActivation]);

  const handleAtomicLongPress = useCallback(
    (callback?: () => void) => {
      if (!isStructurallyEligible() || callback === undefined) return false;
      callback();
      return true;
    },
    [isStructurallyEligible]
  );

  return {
    activity,
    handleAtomicLongPress,
    handleAtomicPress,
    handleLongPress,
    handlePress,
    handlePressIn,
    handlePressOut,
  };
};

export default usePressProgressController;
