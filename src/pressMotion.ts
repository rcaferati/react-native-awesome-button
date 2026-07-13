import { Easing } from 'react-native-reanimated';
import { ANIMATED_TIMING_OFF } from './constants';

export const PRESS_IN_DURATION_MS = ANIMATED_TIMING_OFF;
export const PRESS_IN_EASING = Easing.out(Easing.cubic);
export const PRESS_IN_TIMING_CONFIG = {
  duration: PRESS_IN_DURATION_MS,
  easing: PRESS_IN_EASING,
} as const;

export const PRESS_RELEASE_TIMING_DURATION_MS = 100;
export const PRESS_RELEASE_TIMING_EASING = Easing.out(Easing.cubic);
export const PRESS_RELEASE_TIMING_CONFIG = {
  duration: PRESS_RELEASE_TIMING_DURATION_MS,
  easing: PRESS_RELEASE_TIMING_EASING,
} as const;

export const PRESS_RELEASE_ORIGAMI_TENSION = 100;
export const PRESS_RELEASE_ORIGAMI_FRICTION = 6.75;

export const origamiTensionToStiffness = (tension: number) =>
  (tension - 30) * 3.62 + 194;

export const origamiFrictionToDamping = (friction: number) =>
  (friction - 8) * 3 + 25;

export const PRESS_RELEASE_SPRING_CONFIG = {
  mass: 1,
  stiffness: origamiTensionToStiffness(PRESS_RELEASE_ORIGAMI_TENSION),
  damping: origamiFrictionToDamping(PRESS_RELEASE_ORIGAMI_FRICTION),
  velocity: 0,
  overshootClamping: false,
} as const;

export const clampPressProgress = (value: number) => {
  'worklet';

  return Math.max(0, Math.min(1, value));
};

export const getPressedOpacity = ({
  activeOpacity,
  pressProgress,
  progress,
}: {
  activeOpacity: number;
  pressProgress: number;
  progress: boolean;
}) => {
  'worklet';

  if (progress === true) {
    return 1;
  }

  return 1 - (1 - activeOpacity) * clampPressProgress(pressProgress);
};
