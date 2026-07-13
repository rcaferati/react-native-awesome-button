import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { PRESS_IN_TIMING_CONFIG, PRESS_RELEASE_TIMING_DURATION_MS } from '../pressMotion';
import usePressProgressController from '../usePressProgressController';

const createPressEvent = () => ({
  nativeEvent: {},
  persist: jest.fn(),
});

const flushMicrotasks = async () => Promise.resolve();

let latestController = null;

const ControllerHarness = ({
  activeOpacity = 0.75,
  disabled = false,
  hasChildren = true,
  onPress,
  onPressIn = () => undefined,
  onPressedIn = () => undefined,
  onPressOut = () => undefined,
  onPressedOut = () => undefined,
  onProgressEnd = () => undefined,
  onProgressStart = () => undefined,
  progress = false,
  progressLoadingTime = 3000,
  springRelease = true,
}) => {
  latestController = usePressProgressController({
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
  });

  return null;
};

const createHarness = (props = {}) => {
  let component;

  act(() => {
    component = renderer.create(<ControllerHarness {...props} />);
  });

  return component;
};

describe('usePressProgressController press lifecycle', () => {
  const originalRequestAnimationFrame = global.requestAnimationFrame;
  const originalCancelAnimationFrame = global.cancelAnimationFrame;
  const originalWindow = global.window;

  beforeEach(() => {
    jest.useFakeTimers();
    global.window = global;
    global.requestAnimationFrame = (callback) =>
      setTimeout(() => {
        callback(16);
      }, 16);
    global.cancelAnimationFrame = (handle) => clearTimeout(handle);
    latestController = null;
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
      await flushMicrotasks();
    });
    jest.useRealTimers();
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
    global.window = originalWindow;
  });

  it('marks the button visually pressed at press start and defers onPressedIn until the press-in timing completes', () => {
    const onPressedIn = jest.fn();

    createHarness({
      onPressedIn,
    });

    act(() => {
      latestController.handlePressIn(createPressEvent());
    });

    expect(latestController.visualPressed).toBe(true);
    expect(onPressedIn).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(PRESS_IN_TIMING_CONFIG.duration);
    });

    expect(onPressedIn).toHaveBeenCalledTimes(1);
    expect(latestController.visualPressed).toBe(true);
  });

  it('does not start common-button release from handlePress before handlePressOut arrives', async () => {
    const onPress = jest.fn();

    createHarness({
      onPress,
    });

    act(() => {
      latestController.handlePressIn(createPressEvent());
    });

    await act(async () => {
      latestController.handlePress();
      jest.advanceTimersByTime(48);
      await flushMicrotasks();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(latestController.visualPressed).toBe(true);
    expect(latestController.releaseSpringActive).toBe(false);
  });

  it('suppresses onPressedIn when the press is released before the press-in timing completes', () => {
    const onPressedIn = jest.fn();
    const onPressedOut = jest.fn();

    createHarness({
      onPressedIn,
      onPressedOut,
      springRelease: false,
    });

    act(() => {
      latestController.handlePressIn(createPressEvent());
      latestController.handlePressOut(createPressEvent());
    });

    act(() => {
      jest.advanceTimersByTime(PRESS_IN_TIMING_CONFIG.duration);
      jest.advanceTimersByTime(PRESS_RELEASE_TIMING_DURATION_MS);
    });

    expect(onPressedIn).not.toHaveBeenCalled();
    expect(onPressedOut).toHaveBeenCalledTimes(1);
    expect(latestController.visualPressed).toBe(false);
  });

  it('keeps springRelease as a release-only visual override and emits onPressedOut on spring completion', () => {
    const onPressedOut = jest.fn();

    createHarness({
      onPressedOut,
      springRelease: true,
    });

    act(() => {
      latestController.handlePressIn(createPressEvent());
      jest.advanceTimersByTime(PRESS_IN_TIMING_CONFIG.duration);
      latestController.handlePressOut(createPressEvent());
    });

    expect(latestController.releaseSpringActive).toBe(true);
    expect(onPressedOut).not.toHaveBeenCalled();

    act(() => {
      latestController.handleSpringReleaseComplete(
        latestController.releaseSpringToken
      );
    });

    expect(onPressedOut).toHaveBeenCalledTimes(1);
    expect(latestController.releaseSpringActive).toBe(false);
  });

  it('uses timing-based release completion when springRelease is disabled', () => {
    const onPressedOut = jest.fn();

    createHarness({
      onPressedOut,
      springRelease: false,
    });

    act(() => {
      latestController.handlePressIn(createPressEvent());
      jest.advanceTimersByTime(PRESS_IN_TIMING_CONFIG.duration);
      latestController.handlePressOut(createPressEvent());
    });

    expect(onPressedOut).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(PRESS_RELEASE_TIMING_DURATION_MS);
    });

    expect(onPressedOut).toHaveBeenCalledTimes(1);
    expect(latestController.releaseSpringActive).toBe(false);
  });

  it('does not emit duplicate onPressedOut callbacks when a spring release is interrupted by a new press', () => {
    const onPressedIn = jest.fn();
    const onPressedOut = jest.fn();

    createHarness({
      onPressedIn,
      onPressedOut,
      springRelease: true,
    });

    act(() => {
      latestController.handlePressIn(createPressEvent());
      jest.advanceTimersByTime(PRESS_IN_TIMING_CONFIG.duration);
      latestController.handlePressOut(createPressEvent());
    });

    const staleReleaseToken = latestController.releaseSpringToken;

    expect(latestController.releaseSpringActive).toBe(true);

    act(() => {
      latestController.handlePressIn(createPressEvent());
    });

    expect(latestController.releaseSpringActive).toBe(false);

    act(() => {
      latestController.handleSpringReleaseComplete(staleReleaseToken);
      jest.advanceTimersByTime(PRESS_IN_TIMING_CONFIG.duration);
    });

    expect(onPressedOut).not.toHaveBeenCalled();
    expect(onPressedIn).toHaveBeenCalledTimes(2);
  });
});
