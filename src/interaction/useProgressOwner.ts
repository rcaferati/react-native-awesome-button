import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Animated, Easing } from 'react-native';
import { cancelFrame, requestFrame } from '../frameLoop';
import { animateElastic, animateTiming } from '../helpers';
import type {
  PressProgressLiveDependencies,
  ProgressOwnership,
  ProgressReleaseRequest,
} from './contracts';

type ProgressRun = {
  activationDelivered: boolean;
  completionClaimed: boolean;
  completionSnapshot?: () => void;
  generation: number;
  onProgressEndSnapshot?: () => void;
  physicalLifecycle: boolean;
};

type UseProgressOwnerOptions = {
  activityOpacity: Animated.Value;
  animatedLoading: Animated.Value;
  getLive: () => PressProgressLiveDependencies;
  isMounted: () => boolean;
  loadingOpacity: Animated.Value;
  requestRelease: (request: ProgressReleaseRequest) => void;
  textOpacity: Animated.Value;
};

const useProgressOwner = ({
  activityOpacity,
  animatedLoading,
  getLive,
  isMounted,
  loadingOpacity,
  requestRelease,
  textOpacity,
}: UseProgressOwnerOptions) => {
  const [activity, setActivity] = useState(false);
  const busyRef = useRef(false);
  const sequenceRef = useRef(0);
  const runRef = useRef<ProgressRun | null>(null);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const completionFrameRef = useRef<ReturnType<typeof requestFrame> | null>(
    null
  );

  const owns = useCallback(
    (generation: number) => runRef.current?.generation === generation,
    []
  );
  const isBusy = useCallback(() => busyRef.current, []);

  const clearProgressVisuals = useCallback(() => {
    animatedLoading.setValue(0);
    loadingOpacity.setValue(0);
    textOpacity.setValue(1);
    activityOpacity.setValue(0);
  }, [activityOpacity, animatedLoading, loadingOpacity, textOpacity]);

  const completeAfterRelease = useCallback(
    (run: ProgressRun) => {
      if (!isMounted() || runRef.current !== run) return;
      busyRef.current = false;
      setActivity(false);
      run.completionSnapshot?.();
      Promise.resolve().then(() => {
        if (!isMounted() || runRef.current !== run) return;
        run.onProgressEndSnapshot?.();
        if (!isMounted() || runRef.current !== run) return;
        runRef.current = null;
      });
    },
    [isMounted]
  );

  const requestFinalRelease = useCallback(
    (run: ProgressRun, onSettled: () => void) => {
      if (!isMounted() || runRef.current !== run) return;
      requestRelease({
        generation: run.generation,
        onPressedOutSnapshot: getLive().onPressedOut,
        onSettled,
        physicalLifecycle: run.physicalLifecycle,
      });
    },
    [getLive, isMounted, requestRelease]
  );

  const finishProgress = useCallback(
    (run: ProgressRun) => {
      if (!isMounted() || runRef.current !== run) return;
      const beginFinalRelease = () =>
        requestFinalRelease(run, () => completeAfterRelease(run));
      const live = getLive();
      animationRef.current?.stop();
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
      animationRef.current = animation;
      animation.start(({ finished }) => {
        if (finished && animationRef.current === animation) {
          animationRef.current = null;
          beginFinalRelease();
        }
      });
    },
    [
      activityOpacity,
      animatedLoading,
      completeAfterRelease,
      getLive,
      isMounted,
      loadingOpacity,
      requestFinalRelease,
      textOpacity,
    ]
  );

  const abort = useCallback(
    (generation: number) => {
      const run = runRef.current;
      if (
        run === null ||
        run.generation !== generation ||
        run.completionClaimed
      ) {
        return;
      }
      run.completionClaimed = true;
      const onProgressEndSnapshot = getLive().onProgressEnd;
      animationRef.current?.stop();
      animationRef.current = null;
      clearProgressVisuals();
      requestFinalRelease(run, () => {
        if (!isMounted() || runRef.current !== run) return;
        busyRef.current = false;
        setActivity(false);
        onProgressEndSnapshot?.();
        if (!isMounted() || runRef.current !== run) return;
        runRef.current = null;
      });
    },
    [clearProgressVisuals, getLive, isMounted, requestFinalRelease]
  );

  const begin = useCallback(
    (physicalLifecycle: boolean): ProgressOwnership | null => {
      sequenceRef.current += 1;
      const run: ProgressRun = {
        activationDelivered: false,
        completionClaimed: false,
        generation: sequenceRef.current,
        physicalLifecycle,
      };
      runRef.current = run;
      busyRef.current = true;
      setActivity(true);
      getLive().onProgressStart?.();
      if (!isMounted() || runRef.current !== run) return null;
      if (getLive().disabled || !getLive().hasChildren) {
        abort(run.generation);
        return null;
      }
      const live = getLive();
      if (live.reduceMotion) {
        animatedLoading.setValue(live.showProgressBar ? 1 : 0);
        loadingOpacity.setValue(live.showProgressBar ? 1 : 0);
        textOpacity.setValue(0);
        activityOpacity.setValue(1);
      } else {
        animatedLoading.setValue(0);
        loadingOpacity.setValue(1);
        const animation = Animated.parallel([
          animateTiming({
            variable: animatedLoading,
            toValue: 1,
            duration: live.progressLoadingTime,
            easing: Easing.linear,
          }),
          animateElastic({ variable: textOpacity, toValue: 0 }),
          animateElastic({ variable: activityOpacity, toValue: 1 }),
        ]);
        animationRef.current = animation;
        animation.start();
      }

      const next = (completion?: () => void) => {
        if (!isMounted() || runRef.current !== run || run.completionClaimed) {
          return;
        }
        run.completionClaimed = true;
        run.completionSnapshot = completion;
        run.onProgressEndSnapshot = getLive().onProgressEnd;
        completionFrameRef.current = requestFrame(() => {
          completionFrameRef.current = null;
          finishProgress(run);
        });
      };
      return { generation: run.generation, next };
    },
    [
      abort,
      activityOpacity,
      animatedLoading,
      finishProgress,
      getLive,
      isMounted,
      loadingOpacity,
      textOpacity,
    ]
  );

  const markActivationDelivered = useCallback((generation: number) => {
    if (runRef.current?.generation === generation) {
      runRef.current.activationDelivered = true;
    }
  }, []);

  useEffect(() => {
    const run = runRef.current;
    const live = getLive();
    if (
      run !== null &&
      run.activationDelivered &&
      !run.completionClaimed &&
      (live.disabled || !live.hasChildren)
    ) {
      abort(run.generation);
    }
  });

  useEffect(() => {
    const live = getLive();
    if (!live.reduceMotion) return;
    animationRef.current?.stop();
    animationRef.current = null;
    if (busyRef.current) {
      animatedLoading.setValue(live.showProgressBar ? 1 : 0);
      loadingOpacity.setValue(live.showProgressBar ? 1 : 0);
      textOpacity.setValue(0);
      activityOpacity.setValue(1);
    } else {
      clearProgressVisuals();
    }
  });

  useLayoutEffect(
    () => () => {
      sequenceRef.current += 1;
      runRef.current = null;
      busyRef.current = false;
      animationRef.current?.stop();
      animationRef.current = null;
      cancelFrame(completionFrameRef.current);
      completionFrameRef.current = null;
    },
    []
  );

  return {
    abort,
    activity,
    begin,
    isBusy,
    markActivationDelivered,
    owns,
  };
};

export default useProgressOwner;
