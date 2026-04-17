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
