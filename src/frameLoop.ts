type FrameHandle =
  | {
      type: 'raf';
      id: number;
    }
  | {
      type: 'timeout';
      id: ReturnType<typeof setTimeout>;
    };

const DEFAULT_FRAME_DURATION = 16;

const getCurrentTimestamp = () => {
  if (
    typeof performance !== 'undefined' &&
    typeof performance.now === 'function'
  ) {
    return performance.now();
  }

  return Date.now();
};

export const requestFrame = (
  callback: (timestamp: number) => void
): FrameHandle => {
  if (typeof requestAnimationFrame === 'function') {
    return {
      type: 'raf',
      id: requestAnimationFrame(callback),
    };
  }

  return {
    type: 'timeout',
    id: setTimeout(() => {
      callback(getCurrentTimestamp());
    }, DEFAULT_FRAME_DURATION),
  };
};

const normalizeFutureFrames = (frames: number) => {
  if (Number.isFinite(frames) !== true || frames <= 0) {
    return 0;
  }

  return Math.floor(frames);
};

export const waitForFutureFrames = (frames: number): Promise<void> => {
  const remainingFrames = normalizeFutureFrames(frames) + 1;

  return new Promise((resolve) => {
    const step = (remaining: number) => {
      if (remaining <= 0) {
        resolve();
        return;
      }

      requestFrame(() => {
        step(remaining - 1);
      });
    };

    step(remainingFrames);
  });
};

export const cancelFrame = (handle: FrameHandle | null) => {
  if (!handle) {
    return;
  }

  if (handle.type === 'raf') {
    if (typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(handle.id);
    }
    return;
  }

  clearTimeout(handle.id);
};

export const getFrameTimestamp = getCurrentTimestamp;

export type { FrameHandle };
