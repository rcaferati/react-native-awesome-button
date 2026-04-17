import { act } from 'react-test-renderer';
import { runTimedTransition } from '../themed/transition';

const installAnimationFrameMock = () => {
  const originalRequestAnimationFrame = global.requestAnimationFrame;
  const originalCancelAnimationFrame = global.cancelAnimationFrame;
  let timestamp = 0;

  global.requestAnimationFrame = (callback) =>
    setTimeout(() => {
      timestamp += 16;
      callback(timestamp);
    }, 16);
  global.cancelAnimationFrame = (handle) => clearTimeout(handle);

  return () => {
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
  };
};

describe('runTimedTransition', () => {
  let restoreAnimationFrame;

  beforeEach(() => {
    jest.useFakeTimers();
    restoreAnimationFrame = installAnimationFrameMock();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    restoreAnimationFrame();
  });

  it('publishes progress on animation frames and completes at 1', () => {
    const updates = [];
    const onComplete = jest.fn();

    runTimedTransition({
      duration: 48,
      easing: (value) => value,
      onUpdate: (value) => updates.push(value),
      onComplete,
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(updates[0]).toBe(0);
    expect(updates[updates.length - 1]).toBe(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('cancels scheduled frames when stopped', () => {
    const updates = [];
    const onComplete = jest.fn();
    const transition = runTimedTransition({
      duration: 96,
      easing: (value) => value,
      onUpdate: (value) => updates.push(value),
      onComplete,
    });

    act(() => {
      jest.advanceTimersByTime(16);
    });

    transition.stop();

    act(() => {
      jest.runAllTimers();
    });

    expect(updates).toHaveLength(1);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
