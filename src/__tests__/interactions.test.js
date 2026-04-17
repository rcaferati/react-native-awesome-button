import React from 'react';
import renderer, { act } from 'react-test-renderer';
import AwesomeButton from '../Button';

jest.mock('../helpers', () => {
  const actualHelpers = jest.requireActual('../helpers');
  const createAnimation = () => ({
    start: (callback) => callback && callback({ finished: true }),
    stop: jest.fn(),
  });

  return {
    ...actualHelpers,
    animateElastic: jest.fn(() => createAnimation()),
    animateSpring: jest.fn(() => createAnimation()),
    animateTiming: jest.fn(() => createAnimation()),
  };
});

const mockedHelpers = jest.requireMock('../helpers');
const defaultAnimateSpringImplementation =
  mockedHelpers.animateSpring.getMockImplementation();

const createPressEvent = () => ({
  nativeEvent: {},
});

const flushMicrotasks = async () => Promise.resolve();

describe('AwesomeButton interactions', () => {
  const originalRequestAnimationFrame = global.requestAnimationFrame;
  const originalCancelAnimationFrame = global.cancelAnimationFrame;
  const originalWindow = global.window;

  beforeEach(() => {
    jest.useFakeTimers();
    global.window = global;
    global.requestAnimationFrame = (callback) => {
      callback();
      return 0;
    };
    global.cancelAnimationFrame = jest.fn();
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

  it('dispatches onPress from the press handler without requiring a hold gesture', async () => {
    const onPress = jest.fn();
    const component = renderer.create(
      <AwesomeButton onPress={onPress}>Tap</AwesomeButton>
    );
    const pressable = component.root.findByProps({
      testID: 'aws-btn-content-view',
    });

    await act(async () => {
      pressable.props.onPress();
      await flushMicrotasks();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('defers onPress until the configured release frames have passed', async () => {
    const onPress = jest.fn();
    let timestamp = 0;

    global.requestAnimationFrame = (callback) =>
      setTimeout(() => {
        timestamp += 16;
        callback(timestamp);
      }, 16);
    global.cancelAnimationFrame = (handle) => clearTimeout(handle);

    const component = renderer.create(
      <AwesomeButton onPress={onPress}>Tap</AwesomeButton>
    );
    const pressable = component.root.findByProps({
      testID: 'aws-btn-content-view',
    });

    await act(async () => {
      pressable.props.onPress();
    });

    expect(onPress).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(16);
      await flushMicrotasks();
    });

    expect(onPress).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(16);
      await flushMicrotasks();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch onPress when the press is released without a successful press action', () => {
    const onPress = jest.fn();
    const component = renderer.create(
      <AwesomeButton onPress={onPress}>Tap</AwesomeButton>
    );
    const pressable = component.root.findByProps({
      testID: 'aws-btn-content-view',
    });

    act(() => {
      pressable.props.onPressIn(createPressEvent());
      pressable.props.onPressOut(createPressEvent());
      jest.runAllTimers();
    });

    expect(onPress).not.toHaveBeenCalled();
  });

  it('defers onPressOut observers until the release frames have passed', async () => {
    const onPressOut = jest.fn();
    let timestamp = 0;

    global.requestAnimationFrame = (callback) =>
      setTimeout(() => {
        timestamp += 16;
        callback(timestamp);
      }, 16);
    global.cancelAnimationFrame = (handle) => clearTimeout(handle);

    const component = renderer.create(
      <AwesomeButton onPressOut={onPressOut}>Tap</AwesomeButton>
    );
    const pressable = component.root.findByProps({
      testID: 'aws-btn-content-view',
    });

    await act(async () => {
      pressable.props.onPressOut(createPressEvent());
    });

    expect(onPressOut).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(16);
      await flushMicrotasks();
    });

    expect(onPressOut).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(16);
      await flushMicrotasks();
    });

    expect(onPressOut).toHaveBeenCalledTimes(1);
  });

  it('does not allow dangerouslySetPressableProps to override core press handlers', async () => {
    const onPress = jest.fn();
    const dangerousOnPress = jest.fn();
    const dangerousOnPressIn = jest.fn();
    const dangerousOnPressOut = jest.fn();
    const component = renderer.create(
      <AwesomeButton
        onPress={onPress}
        dangerouslySetPressableProps={{
          onPress: dangerousOnPress,
          onPressIn: dangerousOnPressIn,
          onPressOut: dangerousOnPressOut,
        }}
      >
        Tap
      </AwesomeButton>
    );
    const pressable = component.root.findByProps({
      testID: 'aws-btn-content-view',
    });

    await act(async () => {
      pressable.props.onPressIn(createPressEvent());
      pressable.props.onPress();
      pressable.props.onPressOut(createPressEvent());
      jest.runAllTimers();
      await flushMicrotasks();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(dangerousOnPress).not.toHaveBeenCalled();
    expect(dangerousOnPressIn).not.toHaveBeenCalled();
    expect(dangerousOnPressOut).not.toHaveBeenCalled();
  });

  it('defaults accessibilityRole to button and merges internal accessibility state', () => {
    const component = renderer.create(
      <AwesomeButton
        disabled
        dangerouslySetPressableProps={{
          accessibilityState: {
            selected: true,
          },
        }}
      >
        Disabled
      </AwesomeButton>
    );
    const pressable = component.root.findByProps({
      testID: 'aws-btn-content-view',
    });

    expect(pressable.props.accessibilityRole).toBe('button');
    expect(pressable.props.accessibilityState).toMatchObject({
      disabled: true,
      selected: true,
    });
  });

  it('marks progress buttons as busy while the loading flow is active', () => {
    const component = renderer.create(
      <AwesomeButton progress onPress={() => undefined}>
        Progress
      </AwesomeButton>
    );
    const pressable = component.root.findByProps({
      testID: 'aws-btn-content-view',
    });

    act(() => {
      pressable.props.onPress();
    });

    expect(
      component.root.findByProps({ testID: 'aws-btn-content-view' }).props
        .accessibilityState
    ).toMatchObject({
      busy: true,
    });
  });

  it('starts and completes progress button flows through the onPress callback contract', async () => {
    const onProgressStart = jest.fn();
    const onProgressEnd = jest.fn();
    const onPress = jest.fn((next) => next && next());
    const component = renderer.create(
      <AwesomeButton
        progress
        onPress={onPress}
        onProgressStart={onProgressStart}
        onProgressEnd={onProgressEnd}
      >
        Progress
      </AwesomeButton>
    );
    const pressable = component.root.findByProps({
      testID: 'aws-btn-content-view',
    });

    await act(async () => {
      pressable.props.onPress();
      jest.runAllTimers();
      await flushMicrotasks();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(typeof onPress.mock.calls[0][0]).toBe('function');
    expect(onProgressStart).toHaveBeenCalledTimes(1);
    expect(onProgressEnd).toHaveBeenCalledTimes(1);
  });

  it('still dispatches onPress when the parent rerenders during the deferred progress window', async () => {
    const consumerOnPress = jest.fn((next) => next && next());
    let timestamp = 0;

    global.requestAnimationFrame = (callback) =>
      setTimeout(() => {
        timestamp += 16;
        callback(timestamp);
      }, 16);
    global.cancelAnimationFrame = (handle) => clearTimeout(handle);

    function Wrapper() {
      const [tick, setTick] = React.useState(0);

      return (
        <AwesomeButton
          progress
          onProgressStart={() => {
            setTick((value) => value + 1);
          }}
          onPress={(next) => {
            consumerOnPress(next);
          }}
        >
          {`Progress ${tick}`}
        </AwesomeButton>
      );
    }

    const component = renderer.create(<Wrapper />);
    const pressable = component.root.findByProps({
      testID: 'aws-btn-content-view',
    });

    await act(async () => {
      pressable.props.onPress();
    });

    await act(async () => {
      jest.advanceTimersByTime(16);
      await flushMicrotasks();
    });

    expect(consumerOnPress).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(16);
      await flushMicrotasks();
    });

    expect(consumerOnPress).toHaveBeenCalledTimes(1);
    expect(typeof consumerOnPress.mock.calls[0][0]).toBe('function');
  });

  it('rolls back a deferred progress press when the button becomes disabled mid-flight', async () => {
    const consumerOnPress = jest.fn();
    let timestamp = 0;

    global.requestAnimationFrame = (callback) =>
      setTimeout(() => {
        timestamp += 16;
        callback(timestamp);
      }, 16);
    global.cancelAnimationFrame = (handle) => clearTimeout(handle);

    function Wrapper() {
      const [disabled, setDisabled] = React.useState(false);

      return (
        <AwesomeButton
          disabled={disabled}
          progress
          onProgressStart={() => {
            setDisabled(true);
          }}
          onPress={(next) => {
            consumerOnPress(next);
          }}
        >
          Progress
        </AwesomeButton>
      );
    }

    const component = renderer.create(<Wrapper />);
    const pressable = component.root.findByProps({
      testID: 'aws-btn-content-view',
    });

    await act(async () => {
      pressable.props.onPress();
    });

    await act(async () => {
      jest.advanceTimersByTime(16);
      await flushMicrotasks();
    });

    expect(
      component.root.findByProps({ testID: 'aws-btn-content-view' }).props
        .accessibilityState
    ).toMatchObject({
      busy: true,
      disabled: true,
    });

    await act(async () => {
      jest.advanceTimersByTime(16);
      await flushMicrotasks();
      jest.runAllTimers();
      await flushMicrotasks();
    });

    expect(consumerOnPress).not.toHaveBeenCalled();
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-view' }).props
        .accessibilityState
    ).toMatchObject({
      disabled: true,
    });
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-view' }).props
        .accessibilityState?.busy
    ).not.toBe(true);
  });

  it('does not emit duplicate release callbacks when progress is interrupted by press-out', async () => {
    const onPressedOut = jest.fn();
    const onPress = jest.fn((next) => next && next());
    let timestamp = 0;

    global.requestAnimationFrame = (callback) =>
      setTimeout(() => {
        timestamp += 16;
        callback(timestamp);
      }, 16);
    global.cancelAnimationFrame = (handle) => clearTimeout(handle);

    const component = renderer.create(
      <AwesomeButton
        progress
        onPress={onPress}
        onPressedOut={onPressedOut}
      >
        Progress
      </AwesomeButton>
    );
    const pressable = component.root.findByProps({
      testID: 'aws-btn-content-view',
    });

    await act(async () => {
      pressable.props.onPressIn(createPressEvent());
      pressable.props.onPress();
      pressable.props.onPressOut(createPressEvent());
      jest.runAllTimers();
      await flushMicrotasks();
      jest.runAllTimers();
      await flushMicrotasks();
    });

    expect(onPressedOut).toHaveBeenCalledTimes(1);
  });

  it('does not restart progress when a blocked loading touch is released after loading ends', async () => {
    let finishProgress;
    const onPress = jest.fn((next) => {
      finishProgress = next;
    });
    const component = renderer.create(
      <AwesomeButton progress onPress={onPress}>
        Progress
      </AwesomeButton>
    );
    const pressable = component.root.findByProps({
      testID: 'aws-btn-content-view',
    });

    await act(async () => {
      pressable.props.onPressIn(createPressEvent());
      pressable.props.onPressOut(createPressEvent());
      pressable.props.onPress();
      jest.runAllTimers();
      await flushMicrotasks();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(typeof finishProgress).toBe('function');

    await act(async () => {
      pressable.props.onPressIn(createPressEvent());
    });

    await act(async () => {
      finishProgress();
      jest.runAllTimers();
      await flushMicrotasks();
      jest.runAllTimers();
      await flushMicrotasks();
    });

    await act(async () => {
      pressable.props.onPressOut(createPressEvent());
      pressable.props.onPress();
      jest.runAllTimers();
      await flushMicrotasks();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('allows a new tap to interrupt the release animation lock on non-progress buttons', async () => {
    const onPress = jest.fn();
    const lockedAnimation = {
      start: () => undefined,
      stop: jest.fn(),
    };

    mockedHelpers.animateSpring.mockImplementation(() => lockedAnimation);

    try {
      const component = renderer.create(
        <AwesomeButton springRelease onPress={onPress}>
          Tap
        </AwesomeButton>
      );
      const pressable = component.root.findByProps({
        testID: 'aws-btn-content-view',
      });

      await act(async () => {
        pressable.props.onPressIn(createPressEvent());
        pressable.props.onPressOut(createPressEvent());
        pressable.props.onPressIn(createPressEvent());
        pressable.props.onPressOut(createPressEvent());
        pressable.props.onPress();
        await flushMicrotasks();
      });

      expect(onPress).toHaveBeenCalledTimes(1);
    } finally {
      mockedHelpers.animateSpring.mockImplementation(
        defaultAnimateSpringImplementation
      );
    }
  });
});
