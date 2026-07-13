import {
  cancelAnimation,
  Easing,
  runOnJS,
  type EasingFunction,
  type EasingFunctionFactory,
  type SharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  ANIMATED_SPRING_TENSION,
  ANIMATED_SPRING_FRICTION,
  ANIMATED_ELASTIC_DURATION,
  ANIMATED_ELASTIC_BOUNCINESS,
  ANIMATED_TIMING_IN,
} from './constants';

type AnimationCompletionResult = {
  finished: boolean;
};

type AnimationCompletion = (result: AnimationCompletionResult) => void;

type ReanimatedAnimationHandle = {
  start: (callback?: AnimationCompletion) => void;
  stop: () => void;
};

type AnimationOptions = {
  variable: SharedValue<number>;
  toValue: number;
  duration?: number;
  delay?: number;
  easing?: EasingFunction | EasingFunctionFactory;
};

type SpringOptions = {
  variable: SharedValue<number>;
  toValue: number;
  delay?: number;
  tension?: number;
  friction?: number;
  stiffness?: number;
  damping?: number;
  mass?: number;
  velocity?: number;
  overshootClamping?: boolean;
};

const notifyCompletion = (
  callback: AnimationCompletion | undefined,
  finished?: boolean
) => {
  'worklet';

  if (callback) {
    runOnJS(callback)({ finished: finished === true });
  }
};

export function animateTiming({
  variable,
  toValue,
  duration = ANIMATED_TIMING_IN,
  delay = 0,
  easing = Easing.out(Easing.cubic),
}: AnimationOptions): ReanimatedAnimationHandle {
  return {
    start: (callback) => {
      cancelAnimation(variable);
      const animation =
        callback === undefined
          ? withTiming(toValue, {
              duration,
              easing,
            })
          : withTiming(
              toValue,
              {
                duration,
                easing,
              },
              (finished) => {
                'worklet';

                notifyCompletion(callback, finished);
              }
            );

      variable.value = delay > 0 ? withDelay(delay, animation) : animation;
    },
    stop: () => {
      cancelAnimation(variable);
    },
  };
}

export function animateLoop({
  variable,
  toValue,
  duration = 3223,
  easing = Easing.linear,
}: AnimationOptions): ReanimatedAnimationHandle {
  return {
    start: () => {
      cancelAnimation(variable);
      variable.value = withRepeat(
        withTiming(toValue, {
          duration,
          easing,
        }),
        -1,
        false
      );
    },
    stop: () => {
      cancelAnimation(variable);
    },
  };
}

export function animateSpring({
  variable,
  toValue,
  delay = 0,
  tension = ANIMATED_SPRING_TENSION,
  friction = ANIMATED_SPRING_FRICTION,
  stiffness,
  damping,
  mass = 1,
  velocity = 0,
  overshootClamping = false,
}: SpringOptions): ReanimatedAnimationHandle {
  return {
    start: (callback) => {
      cancelAnimation(variable);
      const animation =
        callback === undefined
          ? withSpring(toValue, {
              stiffness: stiffness ?? tension,
              damping: damping ?? friction,
              mass,
              velocity,
              overshootClamping,
            })
          : withSpring(
              toValue,
              {
                stiffness: stiffness ?? tension,
                damping: damping ?? friction,
                mass,
                velocity,
                overshootClamping,
              },
              (finished) => {
                'worklet';

                notifyCompletion(callback, finished);
              }
            );

      variable.value = delay > 0 ? withDelay(delay, animation) : animation;
    },
    stop: () => {
      cancelAnimation(variable);
    },
  };
}

export function animateElastic(params: AnimationOptions) {
  return animateTiming({
    duration: ANIMATED_ELASTIC_DURATION,
    easing: Easing.elastic(ANIMATED_ELASTIC_BOUNCINESS),
    ...params,
  });
}

export function animateParallel(
  animations: ReadonlyArray<ReanimatedAnimationHandle>
): ReanimatedAnimationHandle {
  return {
    start: (callback) => {
      if (animations.length === 0) {
        callback?.({ finished: true });
        return;
      }

      let remaining = animations.length;
      let allFinished = true;

      animations.forEach((animation) => {
        animation.start(({ finished }) => {
          allFinished = allFinished && finished;
          remaining -= 1;

          if (remaining === 0) {
            callback?.({ finished: allFinished });
          }
        });
      });
    },
    stop: () => {
      animations.forEach((animation) => animation.stop());
    },
  };
}

export function setAnimatedValue(variable: SharedValue<number>, value: number) {
  cancelAnimation(variable);
  variable.value = value;
}

export type { ReanimatedAnimationHandle };
