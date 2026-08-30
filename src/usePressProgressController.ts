import { useCallback, useLayoutEffect, useRef } from 'react';
import { Animated } from 'react-native';
import type {
  PressProgressLiveDependencies,
  ProgressReleaseRequest,
} from './interaction/contracts';
import useGestureReleaseOwner from './interaction/useGestureReleaseOwner';
import useProgressOwner from './interaction/useProgressOwner';

type PressProgressControllerOptions = PressProgressLiveDependencies & {
  animatedActive: Animated.Value;
  animatedLoading: Animated.Value;
  animatedOpacity: Animated.Value;
  animatedValue: Animated.Value;
  activityOpacity: Animated.Value;
  loadingOpacity: Animated.Value;
  textOpacity: Animated.Value;
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
  const liveRef = useRef<PressProgressLiveDependencies>(options);
  const mountedRef = useRef(true);
  const activationRouterRef = useRef<(physicalLifecycle: boolean) => boolean>(
    () => false
  );
  const releaseRouterRef = useRef<(request: ProgressReleaseRequest) => void>(
    () => undefined
  );
  const busyRouterRef = useRef<() => boolean>(() => false);

  useLayoutEffect(() => {
    liveRef.current = options;
  });

  useLayoutEffect(
    () => () => {
      mountedRef.current = false;
      activationRouterRef.current = () => false;
      releaseRouterRef.current = () => undefined;
      busyRouterRef.current = () => false;
    },
    []
  );

  const getLive = useCallback(() => liveRef.current, []);
  const isMounted = useCallback(() => mountedRef.current, []);
  const getBusy = useCallback(() => busyRouterRef.current(), []);
  const requestActivation = useCallback(
    (physicalLifecycle: boolean) =>
      activationRouterRef.current(physicalLifecycle),
    []
  );
  const requestRelease = useCallback(
    (request: ProgressReleaseRequest) => releaseRouterRef.current(request),
    []
  );

  const gestureOwner = useGestureReleaseOwner({
    animatedActive,
    animatedOpacity,
    animatedValue,
    getBusy,
    getLive,
    isMounted,
    requestActivation,
  });
  const progressOwner = useProgressOwner({
    activityOpacity,
    animatedLoading,
    getLive,
    isMounted,
    loadingOpacity,
    requestRelease,
    textOpacity,
  });
  const {
    acceptDebounce,
    deferActivation,
    handleAtomicLongPress,
    handleAtomicPress,
    handlePress,
    handlePressIn,
    handlePressOut,
    isStructurallyEligible,
    releaseForProgress,
  } = gestureOwner;
  const {
    abort: abortProgress,
    activity,
    begin: beginProgress,
    isBusy,
    markActivationDelivered,
    owns: ownsProgress,
  } = progressOwner;

  const dispatchOrdinaryActivation = useCallback(
    (physicalLifecycle: boolean) => {
      const live = getLive();
      if (
        !isStructurallyEligible() ||
        live.onPress === undefined ||
        !acceptDebounce()
      ) {
        return false;
      }

      const progressOwnership = live.progress
        ? beginProgress(physicalLifecycle)
        : null;
      if (live.progress && progressOwnership === null) return false;
      deferActivation(() => {
        const current = getLive();
        if (
          !isMounted() ||
          current.disabled ||
          !current.hasChildren ||
          current.onPress === undefined
        ) {
          if (progressOwnership !== null) {
            abortProgress(progressOwnership.generation);
          }
          return;
        }

        if (progressOwnership !== null) {
          current.onPress(progressOwnership.next);
          if (ownsProgress(progressOwnership.generation)) {
            markActivationDelivered(progressOwnership.generation);
          }
        } else {
          current.onPress();
        }
      });
      return true;
    },
    [
      abortProgress,
      acceptDebounce,
      beginProgress,
      deferActivation,
      getLive,
      isMounted,
      isStructurallyEligible,
      markActivationDelivered,
      ownsProgress,
    ]
  );

  const routeProgressRelease = useCallback(
    (request: ProgressReleaseRequest) => {
      if (!ownsProgress(request.generation)) return;
      releaseForProgress({
        onPressedOutSnapshot: request.onPressedOutSnapshot,
        onSettled: () => {
          if (ownsProgress(request.generation)) request.onSettled();
        },
        physicalLifecycle: request.physicalLifecycle,
      });
    },
    [ownsProgress, releaseForProgress]
  );

  useLayoutEffect(() => {
    activationRouterRef.current = dispatchOrdinaryActivation;
    releaseRouterRef.current = routeProgressRelease;
    busyRouterRef.current = isBusy;
  }, [dispatchOrdinaryActivation, isBusy, routeProgressRelease]);

  return {
    activity,
    handleAtomicLongPress,
    handleAtomicPress,
    handlePress,
    handlePressIn,
    handlePressOut,
  };
};

export default usePressProgressController;
