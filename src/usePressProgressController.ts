import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, type GestureResponderEvent } from 'react-native';
import debounce from 'lodash.debounce';
import { animateElastic, animateSpring, animateTiming } from './helpers';
import { cancelFrame, requestFrame } from './frameLoop';
import { ANIMATED_TIMING_OFF, DEFAULT_DEBOUNCED_PRESS_TIME } from './constants';
import type { AwesomeButtonOnPress, ProgressCompletionHandler } from './types';

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
  const releaseFrameRef = useRef<ReturnType<typeof requestFrame> | null>(null);
  const progressStartFrameRef = useRef<ReturnType<typeof requestFrame> | null>(
    null
  );
  const pressAnimation = useRef<Animated.CompositeAnimation | null>(null);

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
    cancelFrame(releaseFrameRef.current);
    cancelFrame(progressStartFrameRef.current);
    progressEndFrameRef.current = null;
    releaseFrameRef.current = null;
    progressStartFrameRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cancelPendingFrames();
      pressAnimation.current?.stop();
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

  const invokePressAction = useCallback(
    (next?: ProgressCompletionHandler) => {
      debouncedPress(next);
    },
    [debouncedPress]
  );

  const handlePress = useCallback(() => {
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
        disabled === true ||
        hasChildren === false ||
        progressing.current === true ||
        pressed.current === true
      ) {
        return;
      }

      onPressIn(event);
      animatePressIn();
    },
    [animatePressIn, disabled, hasChildren, onPressIn]
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      if (disabled === true || hasChildren === false) {
        return;
      }

      onPressOut(event);

      if (progress === true && progressing.current === true) {
        return;
      }

      scheduleRelease();
    },
    [disabled, hasChildren, onPressOut, progress, scheduleRelease]
  );

  return {
    activity,
    handlePress,
    handlePressIn,
    handlePressOut,
  };
};

export default usePressProgressController;
