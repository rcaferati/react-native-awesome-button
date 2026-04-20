import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, type GestureResponderEvent } from 'react-native';
import { frameThrower } from '@rcaferati/wac';
import debounce from 'lodash.debounce';
import { animateElastic, animateSpring, animateTiming } from './helpers';
import { cancelFrame, requestFrame } from './frameLoop';
import { ANIMATED_TIMING_OFF, DEFAULT_DEBOUNCED_PRESS_TIME } from './constants';
import type { AwesomeButtonOnPress, ProgressCompletionHandler } from './types';

// WAC's frameThrower waits "future frames" plus one extra layout hop,
// so 1 gives us roughly two animation frames before running onPress.
const PRESS_ACTION_FRAME_THROW = 2;
const PRESS_OUT_OBSERVER_FRAME_THROW = 2;

type PressProgressControllerOptions = {
  activeOpacity: number;
  animatedActive: Animated.Value;
  animatedLoading: Animated.Value;
  animatedOpacity: Animated.Value;
  animatedValue: Animated.Value;
  activityOpacity: Animated.Value;
  disabled: boolean;
  hasChildren: boolean;
  loadingOpacity: Animated.Value;
  onPress: AwesomeButtonOnPress;
  onPressIn: (event: GestureResponderEvent) => void;
  onPressOut: (event: GestureResponderEvent) => void;
  onPressedIn: () => void;
  onPressedOut: () => void;
  onProgressEnd: () => void;
  onProgressStart: () => void;
  progress: boolean;
  progressLoadingTime: number;
  springRelease: boolean;
  textOpacity: Animated.Value;
  debouncedPressTime?: number;
};

type DebouncedPressHandler = AwesomeButtonOnPress & {
  cancel?: () => void;
};

type PressGestureDisposition = 'idle' | 'armed' | 'blocked';

const usePressProgressController = ({
  activeOpacity,
  animatedActive,
  animatedLoading,
  animatedOpacity,
  animatedValue,
  activityOpacity,
  disabled,
  hasChildren,
  loadingOpacity,
  onPress,
  onPressIn,
  onPressOut,
  onPressedIn,
  onPressedOut,
  onProgressEnd,
  onProgressStart,
  progress,
  progressLoadingTime,
  springRelease,
  textOpacity,
  debouncedPressTime = DEFAULT_DEBOUNCED_PRESS_TIME,
}: PressProgressControllerOptions) => {
  const [activity, setActivity] = useState(false);
  const progressing = useRef(false);
  const pressed = useRef(false);
  const releasing = useRef(false);
  const gestureIdRef = useRef(0);
  const activeGestureIdRef = useRef<number | null>(null);
  const pressingGestureIdRef = useRef<number | null>(null);
  const pressedGestureIdRef = useRef<number | null>(null);
  const releaseRequestedForGestureIdRef = useRef<number | null>(null);
  const progressEndFrameRef = useRef<ReturnType<typeof requestFrame> | null>(
    null
  );
  const progressReleaseFrameRef = useRef<ReturnType<
    typeof requestFrame
  > | null>(null);
  const releasedGestureClearTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const progressStartFrameRef = useRef<ReturnType<typeof requestFrame> | null>(
    null
  );
  const activeGestureDispositionRef = useRef<PressGestureDisposition>('idle');
  const releasedGestureDispositionRef = useRef<PressGestureDisposition>('idle');
  const pressActionLifecycleTokenRef = useRef(0);
  const pressOutObserverLifecycleTokenRef = useRef(0);
  const pressAnimationTokenRef = useRef(0);
  const releaseAnimationTokenRef = useRef(0);
  const pressAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const releaseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const progressLoadingAnimationRef =
    useRef<Animated.CompositeAnimation | null>(null);
  const progressContentOutAnimationRef =
    useRef<Animated.CompositeAnimation | null>(null);
  const progressStartedRef = useRef(false);
  const nonProgressReleaseReconcileFrameRef = useRef<ReturnType<
    typeof requestFrame
  > | null>(null);
  const onPressRef = useRef(onPress);
  const onPressOutRef = useRef(onPressOut);
  const disabledRef = useRef(disabled);
  const hasChildrenRef = useRef(hasChildren);

  useLayoutEffect(() => {
    onPressRef.current = onPress;
    onPressOutRef.current = onPressOut;
    disabledRef.current = disabled;
    hasChildrenRef.current = hasChildren;
  });

  const debouncedPress = useMemo<DebouncedPressHandler>(() => {
    if (debouncedPressTime === 0) {
      return (next) => onPressRef.current(next);
    }

    const handler = debounce(
      (next?: ProgressCompletionHandler) => onPressRef.current(next),
      debouncedPressTime,
      {
        trailing: false,
        leading: true,
      }
    );

    return handler as DebouncedPressHandler;
  }, [debouncedPressTime]);
  const debouncedPressRef = useRef<DebouncedPressHandler>(debouncedPress);

  useLayoutEffect(() => {
    debouncedPressRef.current = debouncedPress;
  }, [debouncedPress]);

  const stopProgressStartAnimations = useCallback(() => {
    progressLoadingAnimationRef.current?.stop();
    progressContentOutAnimationRef.current?.stop();
    progressLoadingAnimationRef.current = null;
    progressContentOutAnimationRef.current = null;
  }, []);

  const cancelPendingFrames = useCallback(() => {
    cancelFrame(progressEndFrameRef.current);
    cancelFrame(progressReleaseFrameRef.current);
    clearTimeout(releasedGestureClearTimeoutRef.current ?? undefined);
    cancelFrame(progressStartFrameRef.current);
    cancelFrame(nonProgressReleaseReconcileFrameRef.current);
    stopProgressStartAnimations();
    progressEndFrameRef.current = null;
    progressReleaseFrameRef.current = null;
    releasedGestureClearTimeoutRef.current = null;
    progressStartFrameRef.current = null;
    nonProgressReleaseReconcileFrameRef.current = null;
    activeGestureDispositionRef.current = 'idle';
    releasedGestureDispositionRef.current = 'idle';
    progressStartedRef.current = false;
    activeGestureIdRef.current = null;
    pressingGestureIdRef.current = null;
    pressedGestureIdRef.current = null;
    releaseRequestedForGestureIdRef.current = null;
    pressActionLifecycleTokenRef.current += 1;
    pressOutObserverLifecycleTokenRef.current += 1;
    pressAnimationTokenRef.current += 1;
    releaseAnimationTokenRef.current += 1;
  }, [stopProgressStartAnimations]);

  useEffect(() => {
    return () => {
      cancelPendingFrames();
      pressAnimation.current?.stop();
      releaseAnimationRef.current?.stop();
      debouncedPressRef.current.cancel?.();
    };
  }, [cancelPendingFrames]);

  const animatePressIn = useCallback(
    (gestureId: number) => {
      pressAnimationTokenRef.current += 1;
      const animationToken = pressAnimationTokenRef.current;
      pressAnimation.current?.stop();
      pressingGestureIdRef.current = gestureId;
      pressedGestureIdRef.current = null;
      pressed.current = false;
      pressAnimation.current = Animated.parallel([
        animateTiming({
          variable: animatedValue,
          toValue: 1,
          duration: ANIMATED_TIMING_OFF,
        }),
        animateTiming({
          variable: animatedActive,
          toValue: 1,
          duration: ANIMATED_TIMING_OFF,
        }),
        animateTiming({
          variable: animatedOpacity,
          toValue: progress ? 1 : activeOpacity,
          duration: ANIMATED_TIMING_OFF,
        }),
      ]);

      pressAnimation.current.start(() => {
        if (
          pressAnimationTokenRef.current !== animationToken ||
          activeGestureIdRef.current !== gestureId ||
          pressingGestureIdRef.current !== gestureId
        ) {
          return;
        }
        pressingGestureIdRef.current = null;
        pressedGestureIdRef.current = gestureId;
        pressed.current = true;
        onPressedIn();
      });
    },
    [
      activeOpacity,
      animatedActive,
      animatedOpacity,
      animatedValue,
      onPressedIn,
      progress,
    ]
  );

  const animateLoadingStart = useCallback(() => {
    progressLoadingAnimationRef.current?.stop();
    animatedLoading.setValue(0);
    const animation = animateTiming({
      variable: animatedLoading,
      toValue: 1,
      duration: progressLoadingTime,
    });

    progressLoadingAnimationRef.current = animation;
    animation.start(() => {
      if (progressLoadingAnimationRef.current === animation) {
        progressLoadingAnimationRef.current = null;
      }
    });
  }, [animatedLoading, progressLoadingTime]);

  const animateContentOut = useCallback(() => {
    progressContentOutAnimationRef.current?.stop();
    const animation = Animated.parallel([
      animateTiming({
        variable: loadingOpacity,
        toValue: 1,
      }),
      animateElastic({
        variable: textOpacity,
        toValue: 0,
      }),
      animateElastic({
        variable: activityOpacity,
        toValue: 1,
      }),
    ]);

    progressContentOutAnimationRef.current = animation;
    animation.start(() => {
      if (progressContentOutAnimationRef.current === animation) {
        progressContentOutAnimationRef.current = null;
      }
    });
  }, [activityOpacity, loadingOpacity, textOpacity]);

  const animateRelease = useCallback(
    (releaseGestureId: number | null, callback?: () => void) => {
      if (releasing.current === true) {
        return;
      }

      releaseAnimationTokenRef.current += 1;
      const animationToken = releaseAnimationTokenRef.current;
      releasing.current = true;
      pressAnimation.current?.stop();
      pressingGestureIdRef.current = null;
      pressedGestureIdRef.current = null;
      pressed.current = false;

      const finishRelease = () => {
        if (
          releasing.current === false ||
          releaseAnimationTokenRef.current !== animationToken
        ) {
          return;
        }

        releasing.current = false;
        releaseAnimationRef.current = null;
        pressed.current = false;
        pressingGestureIdRef.current = null;
        pressedGestureIdRef.current = null;
        if (
          releaseGestureId === null ||
          releaseRequestedForGestureIdRef.current === releaseGestureId
        ) {
          releaseRequestedForGestureIdRef.current = null;
        }
        callback?.();
        onPressedOut();
      };

      const releaseAnimation =
        springRelease === true
          ? Animated.parallel([
              animateSpring({
                variable: animatedActive,
                toValue: 0,
              }),
              animateSpring({
                variable: animatedValue,
                toValue: 0,
              }),
              animateTiming({
                variable: animatedOpacity,
                toValue: 1,
              }),
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
              animateTiming({
                variable: animatedOpacity,
                toValue: 1,
              }),
            ]);

      releaseAnimationRef.current = releaseAnimation;
      releaseAnimation.start(finishRelease);
    },
    [
      animatedActive,
      animatedOpacity,
      animatedValue,
      onPressedOut,
      springRelease,
    ]
  );

  const interruptRelease = useCallback(() => {
    if (releasing.current !== true) {
      return;
    }

    releaseAnimationTokenRef.current += 1;
    releaseAnimationRef.current?.stop();
    releaseAnimationRef.current = null;
    releasing.current = false;
    pressed.current = false;
  }, []);

  const requestNonProgressReleaseReconcile = useCallback(() => {
    if (progress === true) {
      return;
    }

    cancelFrame(nonProgressReleaseReconcileFrameRef.current);
    nonProgressReleaseReconcileFrameRef.current = requestFrame(() => {
      nonProgressReleaseReconcileFrameRef.current = null;

      if (
        progressing.current === true ||
        progressStartedRef.current === true ||
        activeGestureIdRef.current !== null ||
        releasing.current === true
      ) {
        return;
      }

      const releaseGestureId = releaseRequestedForGestureIdRef.current;
      const hasVisualPress =
        pressingGestureIdRef.current !== null ||
        pressedGestureIdRef.current !== null ||
        pressed.current === true;

      if (releaseGestureId === null && hasVisualPress === false) {
        return;
      }

      animateRelease(
        releaseGestureId ??
          pressedGestureIdRef.current ??
          pressingGestureIdRef.current ??
          gestureIdRef.current
      );
    });
  }, [animateRelease, progress]);

  const animateProgressEnd = useCallback<ProgressCompletionHandler>(
    (callback) => {
      if (progress !== true) {
        callback?.();
        return;
      }

      cancelFrame(progressEndFrameRef.current);
      stopProgressStartAnimations();
      progressEndFrameRef.current = requestFrame(() => {
        progressEndFrameRef.current = null;
        animateTiming({
          variable: animatedLoading,
          toValue: 1,
        }).start(() => {
          Animated.parallel([
            animateElastic({
              variable: textOpacity,
              toValue: 1,
            }),
            animateElastic({
              variable: activityOpacity,
              toValue: 0,
            }),
            animateTiming({
              variable: loadingOpacity,
              toValue: 0,
              delay: 100,
            }),
          ]).start(() => {
            animateRelease(null, () => {
              progressing.current = false;
              progressStartedRef.current = false;
              setActivity(false);
              callback?.();
              onProgressEnd();
            });
          });
        });
      });
    },
    [
      activityOpacity,
      animateRelease,
      animatedLoading,
      loadingOpacity,
      onProgressEnd,
      progress,
      textOpacity,
      stopProgressStartAnimations,
    ]
  );

  const startProgress = useCallback(() => {
    progressing.current = true;
    progressStartedRef.current = true;
    onProgressStart();
    setActivity(true);
    animateLoadingStart();
    animateContentOut();
  }, [animateContentOut, animateLoadingStart, onProgressStart]);

  const scheduleProgressFallbackRelease = useCallback(() => {
    cancelFrame(progressReleaseFrameRef.current);
    progressReleaseFrameRef.current = requestFrame(() => {
      progressReleaseFrameRef.current = null;

      if (progressing.current === true || progressStartedRef.current === true) {
        return;
      }

      animateRelease(null);
    });
  }, [animateRelease]);

  const rollbackProgressPress = useCallback(() => {
    if (
      progressStartFrameRef.current !== null &&
      progressStartedRef.current !== true
    ) {
      cancelFrame(progressStartFrameRef.current);
      progressStartFrameRef.current = null;
      progressing.current = false;
      progressStartedRef.current = false;
      return;
    }

    stopProgressStartAnimations();
    progressStartFrameRef.current = null;
    progressStartedRef.current = false;
    progressing.current = false;
    animatedLoading.setValue(0);
    textOpacity.setValue(1);
    activityOpacity.setValue(0);
    loadingOpacity.setValue(0);
    setActivity(false);
    animateRelease(null, () => {
      onProgressEnd();
    });
  }, [
    activityOpacity,
    animateRelease,
    animatedLoading,
    loadingOpacity,
    onProgressEnd,
    stopProgressStartAnimations,
    textOpacity,
  ]);

  const setActiveGestureDisposition = useCallback(
    (disposition: PressGestureDisposition) => {
      clearTimeout(releasedGestureClearTimeoutRef.current ?? undefined);
      releasedGestureClearTimeoutRef.current = null;
      releasedGestureDispositionRef.current = 'idle';
      activeGestureDispositionRef.current = disposition;
    },
    []
  );

  const consumeGestureDisposition = useCallback(() => {
    const disposition =
      releasedGestureDispositionRef.current !== 'idle'
        ? releasedGestureDispositionRef.current
        : activeGestureDispositionRef.current;

    activeGestureDispositionRef.current = 'idle';
    releasedGestureDispositionRef.current = 'idle';
    clearTimeout(releasedGestureClearTimeoutRef.current ?? undefined);
    releasedGestureClearTimeoutRef.current = null;

    return disposition;
  }, []);

  const finalizeGestureDisposition = useCallback(() => {
    const disposition = activeGestureDispositionRef.current;

    if (disposition === 'idle') {
      return;
    }

    activeGestureDispositionRef.current = 'idle';
    releasedGestureDispositionRef.current = disposition;
    clearTimeout(releasedGestureClearTimeoutRef.current ?? undefined);
    releasedGestureClearTimeoutRef.current = setTimeout(() => {
      releasedGestureClearTimeoutRef.current = null;
      releasedGestureDispositionRef.current = 'idle';
    }, 0);
  }, []);

  const invokePressAction = useCallback(
    (next?: ProgressCompletionHandler, onAbort?: () => void) => {
      const lifecycleToken = pressActionLifecycleTokenRef.current;

      frameThrower(PRESS_ACTION_FRAME_THROW).then(() => {
        if (pressActionLifecycleTokenRef.current !== lifecycleToken) {
          return;
        }

        if (disabledRef.current === true || hasChildrenRef.current === false) {
          onAbort?.();
          return;
        }

        debouncedPress(next);
      });
    },
    [debouncedPress]
  );

  const invokePressOutObserver = useCallback((event: GestureResponderEvent) => {
    event.persist?.();
    const lifecycleToken = pressOutObserverLifecycleTokenRef.current;

    frameThrower(PRESS_OUT_OBSERVER_FRAME_THROW).then(() => {
      if (pressOutObserverLifecycleTokenRef.current !== lifecycleToken) {
        return;
      }

      if (disabledRef.current === true || hasChildrenRef.current === false) {
        return;
      }

      onPressOutRef.current(event);
    });
  }, []);

  const handlePress = useCallback(() => {
    const gestureDisposition = consumeGestureDisposition();

    if (gestureDisposition === 'blocked') {
      return;
    }

    if (gestureDisposition === 'idle' && releasing.current === true) {
      return;
    }

    if (
      disabled === true ||
      hasChildren === false ||
      progressing.current === true
    ) {
      return;
    }

    if (progress === true) {
      cancelFrame(progressReleaseFrameRef.current);
      progressReleaseFrameRef.current = null;
      progressing.current = true;
      cancelFrame(progressStartFrameRef.current);
      progressStartFrameRef.current = requestFrame(() => {
        progressStartFrameRef.current = null;
        startProgress();
      });
      invokePressAction(animateProgressEnd, rollbackProgressPress);
      return;
    }

    if (activeGestureIdRef.current !== null) {
      releaseRequestedForGestureIdRef.current = activeGestureIdRef.current;
      activeGestureIdRef.current = null;
      requestNonProgressReleaseReconcile();
    }

    invokePressAction();
  }, [
    consumeGestureDisposition,
    animateProgressEnd,
    disabled,
    hasChildren,
    invokePressAction,
    progress,
    requestNonProgressReleaseReconcile,
    rollbackProgressPress,
    startProgress,
  ]);

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      cancelFrame(progressReleaseFrameRef.current);
      progressReleaseFrameRef.current = null;
      cancelFrame(nonProgressReleaseReconcileFrameRef.current);
      nonProgressReleaseReconcileFrameRef.current = null;

      if (
        disabled !== true &&
        hasChildren === true &&
        releasing.current === true &&
        progressing.current === false &&
        pressed.current === false
      ) {
        interruptRelease();
      }

      if (
        disabled === true ||
        hasChildren === false ||
        progressing.current === true
      ) {
        if (progressing.current === true) {
          setActiveGestureDisposition('blocked');
        }

        return;
      }

      setActiveGestureDisposition('armed');
      gestureIdRef.current += 1;
      activeGestureIdRef.current = gestureIdRef.current;
      releaseRequestedForGestureIdRef.current = null;
      onPressIn(event);
      animatePressIn(gestureIdRef.current);
    },
    [
      animatePressIn,
      disabled,
      hasChildren,
      interruptRelease,
      onPressIn,
      setActiveGestureDisposition,
    ]
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      if (disabled === true || hasChildren === false) {
        return;
      }

      const releaseGestureId =
        activeGestureIdRef.current ??
        (gestureIdRef.current > 0 ? gestureIdRef.current : null);

      activeGestureIdRef.current = null;
      invokePressOutObserver(event);
      finalizeGestureDisposition();

      if (releasing.current === true) {
        if (progress !== true && releaseGestureId !== null) {
          releaseRequestedForGestureIdRef.current = releaseGestureId;
          requestNonProgressReleaseReconcile();
        }
        return;
      }

      if (progress === true && progressing.current === true) {
        return;
      }

      if (progress === true) {
        scheduleProgressFallbackRelease();
        return;
      }

      if (releaseGestureId === null) {
        requestNonProgressReleaseReconcile();
        return;
      }

      releaseRequestedForGestureIdRef.current = releaseGestureId;
      animateRelease(releaseGestureId);
    },
    [
      animateRelease,
      disabled,
      finalizeGestureDisposition,
      hasChildren,
      invokePressOutObserver,
      progress,
      requestNonProgressReleaseReconcile,
      scheduleProgressFallbackRelease,
    ]
  );

  return {
    activity,
    handlePress,
    handlePressIn,
    handlePressOut,
  };
};

export default usePressProgressController;
