jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const Reanimated = require('react-native-reanimated/lib/module/mock');

  const interpolate = (value, input, output) => {
    const progress = (value - input[0]) / (input[1] - input[0]);
    return output[0] + (output[1] - output[0]) * progress;
  };

  return {
    ...Reanimated,
    cancelAnimation: jest.fn(),
    runOnJS: (callback) => callback,
    useSharedValue: (value) => {
      const ref = React.useRef(null);

      if (ref.current === null) {
        ref.current = {
          value,
        };
      }

      return ref.current;
    },
    useAnimatedStyle: (updater) => updater(),
    withSpring: (toValue, _config, callback) => {
      callback?.(true);
      return toValue;
    },
    withTiming: (toValue, _config, callback) => {
      callback?.(true);
      return toValue;
    },
    interpolate,
    interpolateColor: (value, _input, output) =>
      value < 1 ? output[0] : output[output.length - 1],
  };
});

let capturedControllerOptions = null;
let mockCapturedControllerOptionsList = [];
let mockControllerState = null;

jest.mock('../usePressProgressController', () => ({
  __esModule: true,
  default: jest.fn((options) => {
    capturedControllerOptions = options;
    mockCapturedControllerOptionsList.push(options);

    return mockControllerState;
  }),
}));

import React from 'react';
import { StyleSheet } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import AwesomeButton from '../Button';

const baseControllerState = () => ({
  activity: false,
  activityVisible: false,
  contentVisible: true,
  handlePress: jest.fn(),
  handlePressIn: jest.fn(),
  handlePressOut: jest.fn(),
  handleSpringReleaseComplete: jest.fn(),
  progressTravelDurationMs: 3000,
  progressTravelTarget: 0,
  progressVisible: false,
  releaseSpringActive: false,
  releaseSpringToken: 0,
  visualPressed: false,
});

const createComponent = (element) => {
  let component;

  act(() => {
    component = renderer.create(element);
  });

  return component;
};

const rerender = (component, element) => {
  act(() => {
    component.update(element);
  });
};

const getContainerStyle = (component) =>
  StyleSheet.flatten(
    component.root.findByProps({ testID: 'aws-btn-pressed-opacity' }).props
      .style
  );

const getActiveBackgroundStyle = (component) =>
  StyleSheet.flatten(
    component.root.findByProps({ testID: 'aws-btn-active-background' }).props
      .style
  );

const getShadowStyle = (component) =>
  StyleSheet.flatten(
    component.root.findByProps({ testID: 'aws-btn-shadow-inner' }).props.style
  );

const getFaceTransformStyle = (component) =>
  StyleSheet.flatten(
    component.root.findByProps({ testID: 'aws-btn-face-transform' }).props.style
  );

const getContentStyle = (component) =>
  StyleSheet.flatten(
    component.root.findByProps({ testID: 'aws-btn-content-text' }).parent.props
      .style
  );

const getActivityStyle = (component) =>
  StyleSheet.flatten(
    component.root.findByProps({ testID: 'aws-btn-activity-indicator' }).props
      .style
  );

const getProgressStyle = (component) =>
  StyleSheet.flatten(
    component.root.findByProps({ testID: 'aws-btn-progress' }).props.style
  );

describe('AwesomeButton press visuals', () => {
  beforeEach(() => {
    capturedControllerOptions = null;
    mockCapturedControllerOptionsList = [];
    mockControllerState = baseControllerState();
  });

  it('drives face movement, shadow movement, active background, and pressed opacity through per-button shared values', () => {
    const renderElement = () => (
      <AwesomeButton activeOpacity={0.75} raiseLevel={8} width={160}>
        Motion
      </AwesomeButton>
    );
    const component = createComponent(renderElement());

    expect(getContainerStyle(component).opacity).toBe(1);
    expect(getActiveBackgroundStyle(component).opacity).toBe(0);
    expect(getFaceTransformStyle(component).transform[0].translateY).toBe(0);
    expect(getShadowStyle(component).transform[0].translateY).toBe(0);

    act(() => {
      capturedControllerOptions.onPressVisualStart({ progress: false });
    });
    rerender(component, renderElement());

    expect(getContainerStyle(component).opacity).toBe(0.75);
    expect(getActiveBackgroundStyle(component).opacity).toBe(1);
    expect(getFaceTransformStyle(component).transform[0].translateY).toBe(8);
    expect(getShadowStyle(component).transform[0].translateY).toBe(-4);
  });

  it('keeps overall opacity pinned during progress presses', () => {
    const renderElement = () => (
      <AwesomeButton activeOpacity={0.4} progress width={160}>
        Progress
      </AwesomeButton>
    );
    const component = createComponent(renderElement());

    act(() => {
      capturedControllerOptions.onPressVisualStart({ progress: true });
    });
    rerender(component, renderElement());

    expect(getContainerStyle(component).opacity).toBe(1);
    expect(getActiveBackgroundStyle(component).opacity).toBe(1);
  });

  it('creates isolated press visual drivers for sibling buttons', () => {
    const renderElement = () => (
      <>
        <AwesomeButton activeOpacity={0.75} raiseLevel={8} width={160}>
          One
        </AwesomeButton>
        <AwesomeButton activeOpacity={0.75} raiseLevel={8} width={160}>
          Two
        </AwesomeButton>
      </>
    );
    createComponent(renderElement());

    expect(mockCapturedControllerOptionsList).toHaveLength(2);
    expect(mockCapturedControllerOptionsList[0].onPressVisualStart).not.toBe(
      mockCapturedControllerOptionsList[1].onPressVisualStart
    );
    expect(mockCapturedControllerOptionsList[0].onReleaseVisualStart).not.toBe(
      mockCapturedControllerOptionsList[1].onReleaseVisualStart
    );
  });

  it('derives content fade, activity fade, and progress travel from semantic progress state', () => {
    const renderElement = () => (
      <AwesomeButton progress width={160}>
        Progress
      </AwesomeButton>
    );
    const component = createComponent(renderElement());

    mockControllerState = {
      ...mockControllerState,
      activity: true,
      activityVisible: true,
      contentVisible: false,
      progressVisible: true,
      progressTravelDurationMs: 3000,
      progressTravelTarget: 0.999,
      visualPressed: true,
    };
    rerender(component, renderElement());

    expect(getContentStyle(component).opacity).toBe(0);
    expect(getContentStyle(component).transform[0].scale).toBe(0);
    expect(getContentStyle(component).transitionProperty).toEqual([
      'opacity',
      'transform',
    ]);
    expect(getActivityStyle(component).opacity).toBe(1);
    expect(getActivityStyle(component).transform[0].scale).toBe(1);
    expect(getProgressStyle(component).opacity).toBe(1);
    expect(getProgressStyle(component).transitionDuration).toEqual([200, 3000]);
    expect(getProgressStyle(component).transform[0].translateX).toBeCloseTo(
      -0.16,
      2
    );
  });

  it('wires the spring release completion handler through the controller boundary', () => {
    const handleSpringReleaseComplete = jest.fn();
    mockControllerState = {
      ...mockControllerState,
      handleSpringReleaseComplete,
    };
    createComponent(
      <AwesomeButton activeOpacity={0.75} raiseLevel={8} width={160}>
        Motion
      </AwesomeButton>
    );

    expect(typeof capturedControllerOptions.onPress).toBe('undefined');
    act(() => {
      capturedControllerOptions.onReleaseVisualStart({
        releaseToken: 7,
        springRelease: true,
      });
    });
    expect(handleSpringReleaseComplete).toHaveBeenCalledWith(7);
  });
});
