import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type GestureResponderEvent } from 'react-native';
import debounce from 'lodash.debounce';
import { cancelFrame, requestFrame, waitForFutureFrames } from './frameLoop';
import {
  ANIMATED_ELASTIC_DURATION,
  ANIMATED_TIMING_IN,
  DEFAULT_DEBOUNCED_PRESS_TIME,
} from './constants';
import {
  PRESS_IN_TIMING_CONFIG,
  PRESS_RELEASE_TIMING_DURATION_MS,
} from './pressMotion';
import type { AwesomeButtonOnPress, ProgressCompletionHandler } from './types';

// Stable progress dispatch waits "future frames" plus one extra layout hop,
// so 1 gives us roughly two animation frames before running onPress.
const PRESS_ACTION_FRAME_THROW = 2;
const PRESS_OUT_OBSERVER_FRAME_THROW = 2;
const PROGRESS_LOADING_END_DELAY_MS = 100;
const PROGRESS_TRAVEL_COMPLETE_TARGET = 0.999;
const PROGRESS_TRAVEL_FINISH_DURATION_MS = ANIMATED_TIMING_IN;
const PROGRESS_RESTORE_FALLBACK_DURATION_MS = Math.max(
  ANIMATED_ELASTIC_DURATION,
  PROGRESS_LOADING_END_DELAY_MS + ANIMATED_TIMING_IN
);
const SPRING_RELEASE_FALLBACK_DURATION_MS = 500;

const logControllerDebug = (
  message: string,
  payload?: Record<string, unknown> | undefined
) => {
  if (__DEV__) {
    console.log('[aws-btn-controller]', message, payload ?? {});
  }
};

type PressProgressControllerOptions = {
  activeOpacity: number;
  disabled: boolean;
  hasChildren: boolean;
  onPress?: AwesomeButtonOnPress;
  onPressIn: (event: GestureResponderEvent) => void;
  onPressedIn: () => void;
  onPressOut: (event: GestureResponderEvent) => void;
  onPressedOut: () => void;
  onProgressEnd: () => void;
  onProgressStart: () => void;
  progress: boolean;
  progressLoadingTime: number;
  springRelease: boolean;
  debouncedPressTime?: number;
  onPressVisualStart?: (options: PressVisualStartOptions) => void;
  onPressVisualReset?: () => void;
  onReleaseVisualStart?: (options: ReleaseVisualStartOptions) => void;
};

type PressGestureDisposition = 'idle' | 'armed' | 'blocked';

type DebouncedPressHandler = AwesomeButtonOnPress & {
  cancel?: () => void;
};

type QueuedProgressCompletion = {
  callback?: () => void;
  flowId: number;
};

type ReleaseSpringState = {
  active: boolean;
  token: number;
};

type PressVisualStartOptions = {
  progress: boolean;
};

type ReleaseVisualStartOptions = {
  releaseToken: number;
  springRelease: boolean;
};

const usePressProgressController = ({
  activeOpacity,
  disabled,
  hasChildren,
  onPress,
  onPressIn,
  onPressedIn,
  onPressOut,
  onPressedOut,
  onProgressEnd,
  onProgressStart,
  progress,
  progressLoadingTime,
  springRelease,
  debouncedPressTime = DEFAULT_DEBOUNCED_PRESS_TIME,
  onPressVisualStart = () => undefined,
  onPressVisualReset = () => undefined,
  onReleaseVisualStart = () => undefined,
}: PressProgressControllerOptions) => {
  const [activity, setActivity] = useState(false);
  const visualPressedRef = useRef(false);
  const [contentVisible, setContentVisible] = useState(true);
  const [activityVisible, setActivityVisible] = useState(false);
  const [progressVisible, setProgressVisible] = useState(false);
  const [progressTravelTarget, setProgressTravelTarget] = useState(0);
  const [progressTravelDurationMs, setProgressTravelDurationMs] =
    useState(progressLoadingTime);
  const progressing = useRef(false);
  const pressed = useRef(false);
  const releasing = useRef(false);
  const gestureIdRef = useRef(0);
  const activeGestureIdRef = useRef<number | null>(null);
  const pressingGestureIdRef = useRef<number | null>(null);
  const pressedGestureIdRef = useRef<number | null>(null);
  const progressStartFrameRef = useRef<ReturnType<typeof requestFrame> | null>(
    null
  );
  const progressEndFrameRef = useRef<ReturnType<typeof requestFrame> | null>(
    null
  );
  const progressReleaseFrameRef = useRef<ReturnType<
    typeof requestFrame
  > | null>(null);
  const progressTravelFrameRef = useRef<ReturnType<typeof requestFrame> | null>(
    null
  );
  const releasedGestureClearTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const activeGestureDispositionRef = useRef<PressGestureDisposition>('idle');
  const releasedGestureDispositionRef = useRef<PressGestureDisposition>('idle');
  const pressActionLifecycleTokenRef = useRef(0);
  const pressOutObserverLifecycleTokenRef = useRef(0);
  const pressAnimationTokenRef = useRef(0);
  const releaseAnimationTokenRef = useRef(0);
  const pressInCompletionTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const releaseCompletionTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const springReleaseFallbackTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const progressFillTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const progressFadeDelayTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const progressRestoreTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const releaseCompletionCallbackRef = useRef<(() => void) | undefined>(
    undefined
  );
  const onPressRef = useRef(onPress);
  const onPressOutRef = useRef(onPressOut);
  const disabledRef = useRef(disabled);
  const hasChildrenRef = useRef(hasChildren);
  const cancelPendingFramesRef = useRef<() => void>(() => undefined);
  const pendingPressOutEventRef = useRef<GestureResponderEvent | null>(null);
  const progressFlowIdRef = useRef(0);
  const activeProgressFlowIdRef = useRef<number | null>(null);
  const progressNextConsumedRef = useRef(false);
  const progressStartedRef = useRef(false);
  const queuedProgressCompletionRef = useRef<QueuedProgressCompletion | null>(
    null
  );
  const releaseSpringRef = useRef<ReleaseSpringState>({
    active: false,
    token: 0,
  });
  const debouncedPress = useMemo<DebouncedPressHandler>(() => {
    if (debouncedPressTime === 0) {
      return (next) => onPressRef.current?.(next);
    }

    const handler = debounce(
      (next?: ProgressCompletionHandler) => onPressRef.current?.(next),
      debouncedPressTime,
      {
        trailing: false,
        leading: true,
      }
    );

    return handler as DebouncedPressHandler;
  }, [debouncedPressTime]);
  const debouncedPressRef = useRef<DebouncedPressHandler>(debouncedPress);

  const syncReleaseSpring = useCallback((nextState: ReleaseSpringState) => {
    releaseSpringRef.current = nextState;
  }, []);

  const getDebugSnapshot = useCallback(
    () => ({
      activity,
      activeOpacity,
      activityVisible,
      contentVisible,
      disabled,
      hasChildren,
      progress,
      progressVisible,
      progressTravelDurationMs,
      progressTravelTarget,
      releasing: releasing.current,
      releaseSpringActive: releaseSpringRef.current.active,
      releaseSpringToken: releaseSpringRef.current.token,
      gestureId: gestureIdRef.current,
      activeGestureId: activeGestureIdRef.current,
      pressingGestureId: pressingGestureIdRef.current,
      pressedGestureId: pressedGestureIdRef.current,
      activeDisposition: activeGestureDispositionRef.current,
      releasedDisposition: releasedGestureDispositionRef.current,
      progressing: progressing.current,
      progressStarted: progressStartedRef.current,
      activeProgressFlowId: activeProgressFlowIdRef.current,
      progressNextConsumed: progressNextConsumedRef.current,
      queuedProgressCompletion: queuedProgressCompletionRef.current,
      pressed: pressed.current,
      visualPressed: visualPressedRef.current,
    }),
    [
      activeOpacity,
      activity,
      activityVisible,
      contentVisible,
      disabled,
      hasChildren,
      progress,
      progressTravelDurationMs,
      progressTravelTarget,
      progressVisible,
    ]
  );

  const debugLog = useCallback(
    (message: string, payload?: Record<string, unknown>) => {
      logControllerDebug(message, {
        ...getDebugSnapshot(),
        ...(payload ?? {}),
      });
    },
    [getDebugSnapshot]
  );

  useLayoutEffect(() => {
    onPressRef.current = onPress;
    onPressOutRef.current = onPressOut;
    disabledRef.current = disabled;
    hasChildrenRef.current = hasChildren;
  });

  useLayoutEffect(() => {
    debouncedPressRef.current = debouncedPress;
  }, [debouncedPress]);

  useEffect(() => {
    debugLog('render-state-change');
  }, [
    activity,
    activityVisible,
    contentVisible,
    debugLog,
    disabled,
    hasChildren,
    progress,
    progressTravelDurationMs,
    progressTravelTarget,
    progressVisible,
  ]);

  const clearReleaseTimers = useCallback(() => {
    clearTimeout(releaseCompletionTimeoutRef.current ?? undefined);
    clearTimeout(springReleaseFallbackTimeoutRef.current ?? undefined);
    releaseCompletionTimeoutRef.current = null;
    springReleaseFallbackTimeoutRef.current = null;
  }, []);

  const clearProgressTimers = useCallback(() => {
    cancelFrame(progressStartFrameRef.current);
    cancelFrame(progressEndFrameRef.current);
    cancelFrame(progressReleaseFrameRef.current);
    cancelFrame(progressTravelFrameRef.current);
    clearTimeout(progressFillTimeoutRef.current ?? undefined);
    clearTimeout(progressFadeDelayTimeoutRef.current ?? undefined);
    clearTimeout(progressRestoreTimeoutRef.current ?? undefined);
    progressStartFrameRef.current = null;
    progressEndFrameRef.current = null;
    progressReleaseFrameRef.current = null;
    progressTravelFrameRef.current = null;
    progressFillTimeoutRef.current = null;
    progressFadeDelayTimeoutRef.current = null;
    progressRestoreTimeoutRef.current = null;
  }, []);

  const resetProgressVisualState = useCallback(() => {
    setContentVisible(true);
    setActivityVisible(false);
    setProgressVisible(false);
    setProgressTravelTarget(0);
    setProgressTravelDurationMs(progressLoadingTime);
  }, [progressLoadingTime]);

  const cancelPendingFrames = useCallback(() => {
    debugLog('cancelPendingFrames:start');
    clearTimeout(releasedGestureClearTimeoutRef.current ?? undefined);
    clearTimeout(pressInCompletionTimeoutRef.current ?? undefined);
    releasedGestureClearTimeoutRef.current = null;
    pressInCompletionTimeoutRef.current = null;
    clearReleaseTimers();
    clearProgressTimers();
    pendingPressOutEventRef.current = null;
    releaseCompletionCallbackRef.current = undefined;
    activeGestureDispositionRef.current = 'idle';
    releasedGestureDispositionRef.current = 'idle';
    visualPressedRef.current = false;
    pressed.current = false;
    progressing.current = false;
    progressNextConsumedRef.current = false;
    progressStartedRef.current = false;
    activeProgressFlowIdRef.current = null;
    queuedProgressCompletionRef.current = null;
    gestureIdRef.current = 0;
    activeGestureIdRef.current = null;
    pressingGestureIdRef.current = null;
    pressedGestureIdRef.current = null;
    releasing.current = false;
    onPressVisualReset();
    syncReleaseSpring({
      active: false,
      token: releaseSpringRef.current.token,
    });
    resetProgressVisualState();
    setActivity(false);
    pressActionLifecycleTokenRef.current += 1;
    pressOutObserverLifecycleTokenRef.current += 1;
    pressAnimationTokenRef.current += 1;
    releaseAnimationTokenRef.current += 1;
    debugLog('cancelPendingFrames:complete');
  }, [
    clearProgressTimers,
    clearReleaseTimers,
    debugLog,
    onPressVisualReset,
    resetProgressVisualState,
    syncReleaseSpring,
  ]);

  cancelPendingFramesRef.current = cancelPendingFrames;

  useEffect(() => {
    return () => {
      cancelPendingFramesRef.current();
      debouncedPressRef.current.cancel?.();
    };
  }, []);

  const animatePressIn = useCallback(
    (gestureId: number) => {
      debugLog('animatePressIn:start', {
        gestureId,
      });
      pressAnimationTokenRef.current += 1;
      const animationToken = pressAnimationTokenRef.current;
      clearTimeout(pressInCompletionTimeoutRef.current ?? undefined);
      pressInCompletionTimeoutRef.current = null;
      pressingGestureIdRef.current = gestureId;
      pressedGestureIdRef.current = null;
      pressed.current = false;
      onPressVisualStart({
        progress,
      });
      visualPressedRef.current = true;
      debugLog('animatePressIn:state-pressed', {
        gestureId,
        animationToken,
      });

      pressInCompletionTimeoutRef.current = setTimeout(() => {
        pressInCompletionTimeoutRef.current = null;
        debugLog('animatePressIn:fallback-timeout-fired', {
          gestureId,
          animationToken,
        });

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
      }, PRESS_IN_TIMING_CONFIG.duration);
    },
    [debugLog, onPressedIn, onPressVisualStart, progress]
  );

  const finishRelease = useCallback(
    (releaseToken: number) => {
      debugLog('animateRelease:finish-callback', {
        releaseToken,
      });
      if (
        releasing.current !== true ||
        releaseAnimationTokenRef.current !== releaseToken
      ) {
        return;
      }

      clearReleaseTimers();
      releasing.current = false;
      syncReleaseSpring({
        active: false,
        token: releaseSpringRef.current.token,
      });
      pressed.current = false;
      pressingGestureIdRef.current = null;
      pressedGestureIdRef.current = null;
      const callback = releaseCompletionCallbackRef.current;
      releaseCompletionCallbackRef.current = undefined;
      callback?.();
      onPressedOut();
    },
    [clearReleaseTimers, debugLog, onPressedOut, syncReleaseSpring]
  );

  const handleSpringReleaseComplete = useCallback(
    (releaseToken: number) => {
      debugLog('handleSpringReleaseComplete', {
        releaseToken,
      });
      finishRelease(releaseToken);
    },
    [debugLog, finishRelease]
  );

  const animateRelease = useCallback(
    (releaseGestureId: number | null, callback?: () => void) => {
      debugLog('animateRelease:start', {
        releaseGestureId,
      });
      if (releasing.current === true) {
        debugLog('animateRelease:skipped-already-releasing', {
          releaseGestureId,
        });
        return;
      }

      releaseAnimationTokenRef.current += 1;
      const releaseToken = releaseAnimationTokenRef.current;
      clearTimeout(pressInCompletionTimeoutRef.current ?? undefined);
      pressInCompletionTimeoutRef.current = null;
      clearReleaseTimers();
      releasing.current = true;
      pressed.current = false;
      pressingGestureIdRef.current = null;
      pressedGestureIdRef.current = null;
      releaseCompletionCallbackRef.current = callback;
      onReleaseVisualStart({
        releaseToken,
        springRelease,
      });

      if (springRelease === true) {
        syncReleaseSpring({
          active: true,
          token: releaseToken,
        });
        visualPressedRef.current = false;
        springReleaseFallbackTimeoutRef.current = setTimeout(() => {
          springReleaseFallbackTimeoutRef.current = null;
          debugLog('animateRelease:spring-fallback-timeout-fired', {
            releaseGestureId,
            releaseToken,
          });

          onPressVisualReset();
          finishRelease(releaseToken);
        }, SPRING_RELEASE_FALLBACK_DURATION_MS);
        return;
      }

      visualPressedRef.current = false;
      syncReleaseSpring({
        active: false,
        token: releaseSpringRef.current.token,
      });
      releaseCompletionTimeoutRef.current = setTimeout(() => {
        releaseCompletionTimeoutRef.current = null;
        debugLog('animateRelease:timing-timeout-fired', {
          releaseGestureId,
          releaseToken,
        });
        finishRelease(releaseToken);
      }, PRESS_RELEASE_TIMING_DURATION_MS);
    },
    [
      clearReleaseTimers,
      debugLog,
      finishRelease,
      onPressVisualReset,
      onReleaseVisualStart,
      springRelease,
      syncReleaseSpring,
    ]
  );

  const interruptRelease = useCallback(() => {
    debugLog('interruptRelease:requested');
    if (releasing.current !== true) {
      debugLog('interruptRelease:skipped-not-releasing');
      return;
    }

    releaseAnimationTokenRef.current += 1;
    clearReleaseTimers();
    releaseCompletionCallbackRef.current = undefined;
    syncReleaseSpring({
      active: false,
      token: releaseSpringRef.current.token,
    });
    releasing.current = false;
    pressed.current = false;
    pressingGestureIdRef.current = null;
    pressedGestureIdRef.current = null;
    debugLog('interruptRelease:complete');
  }, [clearReleaseTimers, debugLog, syncReleaseSpring]);

  const requestProgressTravelStart = useCallback((flowId: number) => {
    cancelFrame(progressTravelFrameRef.current);
    progressTravelFrameRef.current = requestFrame(() => {
      progressTravelFrameRef.current = null;

      if (
        activeProgressFlowIdRef.current !== flowId ||
        progressStartedRef.current !== true
      ) {
        return;
      }

      setProgressTravelTarget(PROGRESS_TRAVEL_COMPLETE_TARGET);
    });
  }, []);

  const finishProgressFlow = useCallback(
    (flowId: number) => {
      debugLog('finishProgressFlow:start', {
        flowId,
      });
      if (activeProgressFlowIdRef.current !== flowId) {
        debugLog('finishProgressFlow:skipped-stale-flow', {
          flowId,
        });
        return;
      }

      const completion = queuedProgressCompletionRef.current;
      queuedProgressCompletionRef.current = null;

      animateRelease(null, () => {
        debugLog('finishProgressFlow:release-complete', {
          flowId,
        });
        if (activeProgressFlowIdRef.current !== flowId) {
          return;
        }

        progressing.current = false;
        progressStartedRef.current = false;
        activeProgressFlowIdRef.current = null;
        setActivity(false);
        resetProgressVisualState();
        if (completion?.flowId === flowId) {
          completion.callback?.();
        }
        onProgressEnd();
      });
    },
    [animateRelease, debugLog, onProgressEnd, resetProgressVisualState]
  );

  const animateProgressContentRestore = useCallback(
    (flowId: number) => {
      debugLog('animateProgressContentRestore:start', {
        flowId,
      });
      if (activeProgressFlowIdRef.current !== flowId) {
        debugLog('animateProgressContentRestore:skipped-stale-flow', {
          flowId,
        });
        return;
      }

      clearTimeout(progressFadeDelayTimeoutRef.current ?? undefined);
      clearTimeout(progressRestoreTimeoutRef.current ?? undefined);
      progressFadeDelayTimeoutRef.current = null;
      progressRestoreTimeoutRef.current = null;

      setContentVisible(true);
      setActivityVisible(false);
      progressFadeDelayTimeoutRef.current = setTimeout(() => {
        progressFadeDelayTimeoutRef.current = null;

        if (activeProgressFlowIdRef.current !== flowId) {
          return;
        }

        setProgressVisible(false);
      }, PROGRESS_LOADING_END_DELAY_MS);
      progressRestoreTimeoutRef.current = setTimeout(() => {
        progressRestoreTimeoutRef.current = null;
        debugLog('animateProgressContentRestore:fallback-timeout-fired', {
          flowId,
        });
        finishProgressFlow(flowId);
      }, PROGRESS_RESTORE_FALLBACK_DURATION_MS);
    },
    [debugLog, finishProgressFlow]
  );

  const animateProgressEndForFlow = useCallback(
    (flowId: number) => {
      debugLog('animateProgressEndForFlow:start', {
        flowId,
      });
      if (
        activeProgressFlowIdRef.current !== flowId ||
        progressing.current !== true
      ) {
        debugLog('animateProgressEndForFlow:skipped', {
          flowId,
        });
        return;
      }

      cancelFrame(progressEndFrameRef.current);
      clearTimeout(progressFillTimeoutRef.current ?? undefined);
      progressFillTimeoutRef.current = null;
      progressEndFrameRef.current = requestFrame(() => {
        progressEndFrameRef.current = null;
        debugLog('animateProgressEndForFlow:frame-fired', {
          flowId,
        });

        if (activeProgressFlowIdRef.current !== flowId) {
          return;
        }

        setProgressTravelDurationMs(PROGRESS_TRAVEL_FINISH_DURATION_MS);
        setProgressTravelTarget(1);
        progressFillTimeoutRef.current = setTimeout(() => {
          progressFillTimeoutRef.current = null;
          debugLog('animateProgressEndForFlow:fill-timeout-fired', {
            flowId,
          });
          animateProgressContentRestore(flowId);
        }, PROGRESS_TRAVEL_FINISH_DURATION_MS);
      });
    },
    [animateProgressContentRestore, debugLog]
  );

  const requestProgressCompletion = useCallback(
    (flowId: number, callback?: () => void) => {
      debugLog('requestProgressCompletion:start', {
        flowId,
        hasCallback: Boolean(callback),
      });
      if (
        progress !== true ||
        activeProgressFlowIdRef.current !== flowId ||
        progressing.current !== true ||
        progressNextConsumedRef.current === true
      ) {
        debugLog('requestProgressCompletion:skipped', {
          flowId,
        });
        return;
      }

      progressNextConsumedRef.current = true;
      queuedProgressCompletionRef.current = {
        callback,
        flowId,
      };

      if (progressStartedRef.current !== true) {
        debugLog('requestProgressCompletion:queued-until-progress-started', {
          flowId,
        });
        return;
      }

      animateProgressEndForFlow(flowId);
    },
    [animateProgressEndForFlow, debugLog, progress]
  );

  const startProgress = useCallback(
    (flowId: number) => {
      debugLog('startProgress:start', {
        flowId,
      });
      if (activeProgressFlowIdRef.current !== flowId) {
        debugLog('startProgress:skipped-stale-flow', {
          flowId,
        });
        return;
      }

      visualPressedRef.current = true;
      progressStartedRef.current = true;
      onProgressStart();
      setActivity(true);
      setContentVisible(false);
      setActivityVisible(true);
      setProgressVisible(true);
      setProgressTravelDurationMs(progressLoadingTime);
      setProgressTravelTarget(0);
      requestProgressTravelStart(flowId);

      if (queuedProgressCompletionRef.current?.flowId === flowId) {
        animateProgressEndForFlow(flowId);
      }
    },
    [
      animateProgressEndForFlow,
      debugLog,
      onProgressStart,
      progressLoadingTime,
      requestProgressTravelStart,
    ]
  );

  const scheduleProgressFallbackRelease = useCallback(() => {
    debugLog('scheduleProgressFallbackRelease:scheduled');
    cancelFrame(progressReleaseFrameRef.current);
    progressReleaseFrameRef.current = requestFrame(() => {
      progressReleaseFrameRef.current = null;
      debugLog('scheduleProgressFallbackRelease:frame-fired');

      if (progressing.current === true || progressStartedRef.current === true) {
        return;
      }

      animateRelease(null);
    });
  }, [animateRelease, debugLog]);

  const rollbackProgressPress = useCallback(
    (flowId: number) => {
      debugLog('rollbackProgressPress:start', {
        flowId,
      });
      if (activeProgressFlowIdRef.current !== flowId) {
        debugLog('rollbackProgressPress:skipped-stale-flow', {
          flowId,
        });
        return;
      }

      queuedProgressCompletionRef.current = null;
      clearProgressTimers();

      if (progressStartedRef.current !== true) {
        debugLog('rollbackProgressPress:before-start-branch', {
          flowId,
        });
        progressNextConsumedRef.current = false;
        progressStartedRef.current = false;
        progressing.current = false;
        activeProgressFlowIdRef.current = null;
        resetProgressVisualState();
        setActivity(false);
        animateRelease(null);
        return;
      }

      debugLog('rollbackProgressPress:after-start-branch', {
        flowId,
      });
      progressing.current = false;
      progressNextConsumedRef.current = false;
      progressStartedRef.current = false;
      activeProgressFlowIdRef.current = null;
      resetProgressVisualState();
      setActivity(false);
      animateRelease(null, () => {
        onProgressEnd();
      });
    },
    [
      animateRelease,
      clearProgressTimers,
      debugLog,
      onProgressEnd,
      resetProgressVisualState,
    ]
  );

  const setActiveGestureDisposition = useCallback(
    (disposition: PressGestureDisposition) => {
      debugLog('setActiveGestureDisposition', {
        disposition,
      });
      clearTimeout(releasedGestureClearTimeoutRef.current ?? undefined);
      releasedGestureClearTimeoutRef.current = null;
      releasedGestureDispositionRef.current = 'idle';
      activeGestureDispositionRef.current = disposition;
    },
    [debugLog]
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

    debugLog('consumeGestureDisposition', {
      disposition,
    });
    return disposition;
  }, [debugLog]);

  const finalizeGestureDisposition = useCallback(() => {
    const disposition = activeGestureDispositionRef.current;

    if (disposition === 'idle') {
      debugLog('finalizeGestureDisposition:skipped-idle');
      return;
    }

    debugLog('finalizeGestureDisposition', {
      disposition,
    });
    activeGestureDispositionRef.current = 'idle';
    releasedGestureDispositionRef.current = disposition;
    clearTimeout(releasedGestureClearTimeoutRef.current ?? undefined);
    releasedGestureClearTimeoutRef.current = setTimeout(() => {
      releasedGestureClearTimeoutRef.current = null;
      releasedGestureDispositionRef.current = 'idle';
    }, 0);
  }, [debugLog]);

  const invokePressAction = useCallback(
    (next?: ProgressCompletionHandler, onAbort?: () => void) => {
      const lifecycleToken = pressActionLifecycleTokenRef.current + 1;
      pressActionLifecycleTokenRef.current = lifecycleToken;
      debugLog('invokePressAction:scheduled', {
        lifecycleToken,
        hasNext: Boolean(next),
        hasAbort: Boolean(onAbort),
      });

      waitForFutureFrames(PRESS_ACTION_FRAME_THROW).then(() => {
        debugLog('invokePressAction:dispatch', {
          lifecycleToken,
        });
        if (pressActionLifecycleTokenRef.current !== lifecycleToken) {
          debugLog('invokePressAction:skipped-stale-token', {
            lifecycleToken,
          });
          return;
        }

        if (disabledRef.current === true || hasChildrenRef.current === false) {
          debugLog('invokePressAction:aborted', {
            lifecycleToken,
          });
          onAbort?.();
          return;
        }

        debouncedPressRef.current?.(next);
      });
    },
    [debugLog]
  );

  const invokePressOutObserver = useCallback(
    (event: GestureResponderEvent) => {
      event.persist?.();
      pendingPressOutEventRef.current = event;
      pressOutObserverLifecycleTokenRef.current += 1;
      const lifecycleToken = pressOutObserverLifecycleTokenRef.current;
      debugLog('invokePressOutObserver:scheduled', {
        lifecycleToken,
      });

      waitForFutureFrames(PRESS_OUT_OBSERVER_FRAME_THROW).then(() => {
        debugLog('invokePressOutObserver:dispatch', {
          lifecycleToken,
        });
        if (pressOutObserverLifecycleTokenRef.current !== lifecycleToken) {
          debugLog('invokePressOutObserver:skipped-stale-token', {
            lifecycleToken,
          });
          return;
        }

        if (pendingPressOutEventRef.current !== event) {
          debugLog('invokePressOutObserver:skipped-replaced-event', {
            lifecycleToken,
          });
          return;
        }

        pendingPressOutEventRef.current = null;

        if (disabledRef.current === true || hasChildrenRef.current === false) {
          debugLog('invokePressOutObserver:skipped-disabled-or-empty', {
            lifecycleToken,
          });
          return;
        }

        onPressOutRef.current(event);
      });
    },
    [debugLog]
  );

  const dispatchAcceptedPress = useCallback(() => {
    debugLog('dispatchAcceptedPress:start');
    const gestureDisposition = consumeGestureDisposition();

    if (gestureDisposition === 'blocked') {
      debugLog('dispatchAcceptedPress:blocked');
      return;
    }

    if (gestureDisposition === 'idle' && releasing.current === true) {
      debugLog('dispatchAcceptedPress:skipped-release-in-progress');
      return;
    }

    if (disabled === true || hasChildren === false) {
      debugLog('dispatchAcceptedPress:skipped-disabled-or-empty');
      return;
    }

    if (progressing.current === true) {
      debugLog('dispatchAcceptedPress:skipped-already-progressing');
      return;
    }

    if (progress === true) {
      const flowId = progressFlowIdRef.current + 1;
      debugLog('dispatchAcceptedPress:progress-branch', {
        flowId,
      });
      progressFlowIdRef.current = flowId;
      activeProgressFlowIdRef.current = flowId;
      progressNextConsumedRef.current = false;
      progressStartedRef.current = false;
      queuedProgressCompletionRef.current = null;
      cancelFrame(progressReleaseFrameRef.current);
      progressReleaseFrameRef.current = null;
      progressing.current = true;
      cancelFrame(progressStartFrameRef.current);
      progressStartFrameRef.current = requestFrame(() => {
        progressStartFrameRef.current = null;

        if (
          activeProgressFlowIdRef.current !== flowId ||
          disabledRef.current === true ||
          hasChildrenRef.current === false
        ) {
          debugLog('dispatchAcceptedPress:progress-start-aborted', {
            flowId,
          });
          progressStartedRef.current = false;
          progressNextConsumedRef.current = false;
          progressing.current = false;
          queuedProgressCompletionRef.current = null;
          activeProgressFlowIdRef.current = null;
          resetProgressVisualState();
          animateRelease(null);
          return;
        }

        debugLog('dispatchAcceptedPress:progress-start-frame-fired', {
          flowId,
        });
        startProgress(flowId);
      });
      invokePressAction(
        (callback) => requestProgressCompletion(flowId, callback),
        () => rollbackProgressPress(flowId)
      );
      return;
    }

    debugLog('dispatchAcceptedPress:invoke-non-progress-onPress');
    invokePressAction();
  }, [
    animateRelease,
    consumeGestureDisposition,
    debugLog,
    disabled,
    hasChildren,
    invokePressAction,
    progress,
    requestProgressCompletion,
    resetProgressVisualState,
    rollbackProgressPress,
    startProgress,
  ]);

  const handlePress = useCallback(() => {
    debugLog('handlePress');
    dispatchAcceptedPress();
  }, [debugLog, dispatchAcceptedPress]);

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      debugLog('handlePressIn:start');
      cancelFrame(progressReleaseFrameRef.current);
      progressReleaseFrameRef.current = null;

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
        debugLog('handlePressIn:blocked', {
          disabled,
          hasChildren,
          progressing: progressing.current,
        });
        if (progressing.current === true) {
          setActiveGestureDisposition('blocked');
        }

        return;
      }

      setActiveGestureDisposition('armed');
      gestureIdRef.current += 1;
      activeGestureIdRef.current = gestureIdRef.current;
      onPressIn(event);
      animatePressIn(gestureIdRef.current);
    },
    [
      animatePressIn,
      debugLog,
      disabled,
      hasChildren,
      interruptRelease,
      onPressIn,
      setActiveGestureDisposition,
    ]
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      debugLog('handlePressOut:start');
      if (disabled === true || hasChildren === false) {
        debugLog('handlePressOut:skipped-disabled-or-empty');
        return;
      }

      const releaseGestureId =
        activeGestureIdRef.current ??
        (gestureIdRef.current > 0 ? gestureIdRef.current : null);

      activeGestureIdRef.current = null;
      invokePressOutObserver(event);
      finalizeGestureDisposition();

      if (releasing.current === true) {
        debugLog('handlePressOut:release-already-in-progress', {
          releaseGestureId,
        });
        return;
      }

      if (progress === true && progressing.current === true) {
        debugLog('handlePressOut:held-by-progress', {
          releaseGestureId,
        });
        return;
      }

      if (progress === true) {
        debugLog('handlePressOut:schedule-progress-fallback-release', {
          releaseGestureId,
        });
        scheduleProgressFallbackRelease();
        return;
      }

      if (releaseGestureId === null) {
        debugLog('handlePressOut:no-release-gesture-id');
        if (
          visualPressedRef.current === false &&
          pressed.current === false &&
          pressingGestureIdRef.current === null
        ) {
          return;
        }
      }

      animateRelease(releaseGestureId);
    },
    [
      animateRelease,
      debugLog,
      disabled,
      finalizeGestureDisposition,
      hasChildren,
      invokePressOutObserver,
      progress,
      scheduleProgressFallbackRelease,
    ]
  );

  return {
    activity,
    activityVisible,
    contentVisible,
    handlePress,
    handlePressIn,
    handlePressOut,
    handleSpringReleaseComplete,
    progressTravelDurationMs,
    progressTravelTarget,
    progressVisible,
    get releaseSpringActive() {
      return releaseSpringRef.current.active;
    },
    get releaseSpringToken() {
      return releaseSpringRef.current.token;
    },
    get visualPressed() {
      return visualPressedRef.current;
    },
  };
};

export default usePressProgressController;
