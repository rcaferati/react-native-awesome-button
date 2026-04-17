import React from 'react';
import renderer, { act } from 'react-test-renderer';
import AwesomeButton from '../Button';

jest.mock('../helpers', () => {
  const createAnimation = () => ({
    start: (callback) => callback && callback({ finished: true }),
    stop: jest.fn(),
  });

  return {
    animateElastic: jest.fn(() => createAnimation()),
    animateSpring: jest.fn(() => createAnimation()),
    animateTiming: jest.fn(() => createAnimation()),
  };
});

const createPressEvent = () => ({
  nativeEvent: {},
});

describe('AwesomeButton interactions', () => {
  const originalRequestAnimationFrame = global.requestAnimationFrame;
  const originalCancelAnimationFrame = global.cancelAnimationFrame;

  beforeEach(() => {
    jest.useFakeTimers();
    global.requestAnimationFrame = (callback) => {
      callback();
      return 0;
    };
    global.cancelAnimationFrame = jest.fn();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  it('dispatches onPress from the press handler without requiring a hold gesture', () => {
    const onPress = jest.fn();
    const component = renderer.create(
      <AwesomeButton onPress={onPress}>Tap</AwesomeButton>
    );
    const pressable = component.root.findByProps({
      testID: 'aws-btn-content-view',
    });

    act(() => {
      pressable.props.onPress();
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

  it('does not allow dangerouslySetPressableProps to override core press handlers', () => {
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

    act(() => {
      pressable.props.onPressIn(createPressEvent());
      pressable.props.onPress();
      pressable.props.onPressOut(createPressEvent());
      jest.runAllTimers();
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

  it('starts and completes progress button flows through the onPress callback contract', () => {
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

    act(() => {
      pressable.props.onPress();
      jest.runAllTimers();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(typeof onPress.mock.calls[0][0]).toBe('function');
    expect(onProgressStart).toHaveBeenCalledTimes(1);
    expect(onProgressEnd).toHaveBeenCalledTimes(1);
  });

  it('does not emit duplicate release callbacks when progress is interrupted by press-out', () => {
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

    act(() => {
      pressable.props.onPressIn(createPressEvent());
      pressable.props.onPress();
      pressable.props.onPressOut(createPressEvent());
      jest.runAllTimers();
    });

    expect(onPressedOut).toHaveBeenCalledTimes(1);
  });
});
