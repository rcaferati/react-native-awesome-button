import { cancelFrame, requestFrame, type FrameHandle } from '../frameLoop';

type TimedTransitionOptions = {
  duration: number;
  easing: (progress: number) => number;
  onUpdate: (progress: number) => void;
  onComplete?: () => void;
};

type TimedTransitionController = {
  stop: () => void;
};

export const runTimedTransition = ({
  duration,
  easing,
  onUpdate,
  onComplete,
}: TimedTransitionOptions): TimedTransitionController => {
  if (duration === 0) {
    onUpdate(easing(1));
    onComplete?.();

    return {
      stop: () => undefined,
    };
  }

  let frameHandle: FrameHandle | null = null;
  let startTimestamp: number | null = null;
  let lastPublishedProgress: number | null = null;

  const tick = (timestamp: number) => {
    if (startTimestamp === null) {
      startTimestamp = timestamp;
    }

    const progress = Math.min(1, (timestamp - startTimestamp) / duration);
    const nextProgress = easing(progress);

    if (nextProgress !== lastPublishedProgress) {
      lastPublishedProgress = nextProgress;
      onUpdate(nextProgress);
    }

    if (progress >= 1) {
      frameHandle = null;
      onComplete?.();
      return;
    }

    frameHandle = requestFrame(tick);
  };

  frameHandle = requestFrame(tick);

  return {
    stop: () => {
      cancelFrame(frameHandle);
      frameHandle = null;
    },
  };
};

export type { TimedTransitionController, TimedTransitionOptions };
