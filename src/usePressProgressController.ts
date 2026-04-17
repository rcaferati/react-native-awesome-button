import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, type GestureResponderEvent } from 'react-native';
import { frameThrower } from '@rcaferati/wac';
import debounce from 'lodash.debounce';
import { animateElastic, animateSpring, animateTiming } from './helpers';
import { cancelFrame, requestFrame } from './frameLoop';
import { ANIMATED_TIMING_OFF, DEFAULT_DEBOUNCED_PRESS_TIME } from './constants';
import type { AwesomeButtonOnPress, ProgressCompletionHandler } from './types';

// WAC's frameThrower waits "future frames" plus one extra layout hop,
// so 1 gives us roughly two animation frames before running onPress.
const PRESS_ACTION_FRAME_THROW = 1;
const PRESS_OUT_OBSERVER_FRAME_THROW = 1;

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
  const progressEndFrameRef = useRef<ReturnType<typeof requestFrame> | null>(
    null
  );
  const releasedGestureClearTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const releaseFrameRef = useRef<ReturnType<typeof requestFrame> | null>(null);
  const progressStartFrameRef = useRef<ReturnType<typeof requestFrame> | null>(
    null
  );
  const activeGestureDispositionRef = useRef<PressGestureDisposition>('idle');
  const releasedGestureDispositionRef = useRef<PressGestureDisposition>('idle');
  const pressActionFrameTokenRef = useRef(0);
  const pressOutObserverFrameTokenRef = useRef(0);
  const pressAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const releaseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  const debouncedPress = useMemo<DebouncedPressHandler>(() => {
    if (debouncedPressTime === 0) {
      return (next) => onPress(next);
    }

    const handler = debounce(
      (next?: ProgressCompletionHandler) => onPress(next),
      debouncedPressTime,
      {
        trailing: false,
        leading: true,
      }
    );

    return handler as DebouncedPressHandler;
  }, [debouncedPressTime, onPress]);

  const cancelPendingFrames = useCallback(() => {
    cancelFrame(progressEndFrameRef.current);
    clearTimeout(releasedGestureClearTimeoutRef.current ?? undefined);
    cancelFrame(releaseFrameRef.current);
    cancelFrame(progressStartFrameRef.current);
    progressEndFrameRef.current = null;
    releasedGestureClearTimeoutRef.current = null;
    releaseFrameRef.current = null;
    progressStartFrameRef.current = null;
    activeGestureDispositionRef.current = 'idle';
    releasedGestureDispositionRef.current = 'idle';
    pressActionFrameTokenRef.current += 1;
    pressOutObserverFrameTokenRef.current += 1;
  }, []);

  useEffect(() => {
    return () => {
      cancelPendingFrames();
      pressAnimation.current?.stop();
      releaseAnimationRef.current?.stop();
      debouncedPress.cancel?.();
    };
  }, [cancelPendingFrames, debouncedPress]);

  const animatePressIn = useCallback(() => {
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
      pressed.current = true;
      onPressedIn();
    });
  }, [
    activeOpacity,
    animatedActive,
    animatedOpacity,
    animatedValue,
    onPressedIn,
    progress,
  ]);

  const animateLoadingStart = useCallback(() => {
    animatedLoading.setValue(0);
    animateTiming({
      variable: animatedLoading,
      toValue: 1,
      duration: progressLoadingTime,
    }).start();
  }, [animatedLoading, progressLoadingTime]);

  const animateContentOut = useCallback(() => {
    Animated.parallel([
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
    ]).start();
  }, [activityOpacity, loadingOpacity, textOpacity]);

  const animateRelease = useCallback(
    (callback?: () => void) => {
      if (releasing.current === true) {
        return;
      }

      releasing.current = true;
      pressAnimation.current?.stop();
      pressed.current = false;

      const finishRelease = () => {
        if (releasing.current === false) {
          return;
        }

        releasing.current = false;
        releaseAnimationRef.current = null;
        pressed.current = false;
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

    releaseAnimationRef.current?.stop();
    releaseAnimationRef.current = null;
    releasing.current = false;
    pressed.current = false;
    onPressedOut();
  }, [onPressedOut]);

  const animateProgressEnd = useCallback<ProgressCompletionHandler>(
    (callback) => {
      if (progress !== true) {
        callback?.();
        return;
      }

      cancelFrame(releaseFrameRef.current);
      releaseFrameRef.current = null;
      cancelFrame(progressEndFrameRef.current);
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
            animateRelease(() => {
              progressing.current = false;
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
    ]
  );

  const scheduleRelease = useCallback(() => {
    cancelFrame(releaseFrameRef.current);
    releaseFrameRef.current = requestFrame(() => {
      releaseFrameRef.current = null;

      if (progressing.current === true) {
        return;
      }

      animateRelease();
    });
  }, [animateRelease]);

  const startProgress = useCallback(() => {
    progressing.current = true;
    onProgressStart();
    setActivity(true);
    animateLoadingStart();
    animateContentOut();
  }, [animateContentOut, animateLoadingStart, onProgressStart]);

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
    (next?: ProgressCompletionHandler) => {
      const frameThrowToken = pressActionFrameTokenRef.current + 1;
      pressActionFrameTokenRef.current = frameThrowToken;

      frameThrower(PRESS_ACTION_FRAME_THROW).then(() => {
        if (pressActionFrameTokenRef.current !== frameThrowToken) {
          return;
        }

        if (disabled === true || hasChildren === false) {
          return;
        }

        debouncedPress(next);
      });
    },
    [debouncedPress, disabled, hasChildren]
  );

  const invokePressOutObserver = useCallback(
    (event: GestureResponderEvent) => {
      event.persist?.();
      const frameThrowToken = pressOutObserverFrameTokenRef.current + 1;
      pressOutObserverFrameTokenRef.current = frameThrowToken;

      frameThrower(PRESS_OUT_OBSERVER_FRAME_THROW).then(() => {
        if (pressOutObserverFrameTokenRef.current !== frameThrowToken) {
          return;
        }

        if (disabled === true || hasChildren === false) {
          return;
        }

        onPressOut(event);
      });
    },
    [disabled, hasChildren, onPressOut]
  );

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
      progressing.current = true;
      cancelFrame(progressStartFrameRef.current);
      progressStartFrameRef.current = requestFrame(() => {
        progressStartFrameRef.current = null;
        startProgress();
      });
      invokePressAction(animateProgressEnd);
      return;
    }

    invokePressAction();
  }, [
    consumeGestureDisposition,
    animateProgressEnd,
    disabled,
    hasChildren,
    invokePressAction,
    progress,
    startProgress,
  ]);

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      cancelFrame(releaseFrameRef.current);
      releaseFrameRef.current = null;

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
        progressing.current === true ||
        pressed.current === true
      ) {
        if (progressing.current === true || pressed.current === true) {
          setActiveGestureDisposition('blocked');
        }

        return;
      }

      setActiveGestureDisposition('armed');
      onPressIn(event);
      animatePressIn();
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

      invokePressOutObserver(event);
      finalizeGestureDisposition();

      if (releasing.current === true) {
        return;
      }

      if (progress === true && progressing.current === true) {
        return;
      }

      scheduleRelease();
    },
    [
      disabled,
      finalizeGestureDisposition,
      hasChildren,
      invokePressOutObserver,
      progress,
      scheduleRelease,
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
