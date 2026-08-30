import React, { useState } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import AwesomeButton from '../Button';
import ThemedButton from '../themed/ThemedButton';
import getTheme from '../themed/themes';

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

const createPressEvent = () => ({ nativeEvent: {}, persist: jest.fn() });
const flush = async () => Promise.resolve();

describe('Pass 4 React Native bridge', () => {
  const originalRequestAnimationFrame = global.requestAnimationFrame;
  const originalCancelAnimationFrame = global.cancelAnimationFrame;

  beforeEach(() => {
    jest.useFakeTimers();
    global.requestAnimationFrame = (callback) =>
      setTimeout(() => callback(Date.now()), 16);
    global.cancelAnimationFrame = (handle) => clearTimeout(handle);
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
      await flush();
    });
    jest.restoreAllMocks();
    jest.useRealTimers();
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  it('uses the latest callback for an event not yet dispatched', async () => {
    const callbackA = jest.fn();
    const callbackB = jest.fn();
    const component = renderer.create(
      <AwesomeButton onPress={callbackA}>Tap</AwesomeButton>
    );
    component.root
      .findByProps({ testID: 'aws-btn-content-view' })
      .props.onPress();

    act(() => {
      component.update(<AwesomeButton onPress={callbackB}>Tap</AwesomeButton>);
    });
    await act(async () => {
      jest.advanceTimersByTime(48);
      await flush();
    });

    expect(callbackA).not.toHaveBeenCalled();
    expect(callbackB).toHaveBeenCalledTimes(1);
  });

  it('treats numeric zero as renderable content and keeps activation eligible', async () => {
    const onPress = jest.fn();
    const component = renderer.create(
      <AwesomeButton onPress={onPress}>{0}</AwesomeButton>
    );

    expect(
      component.root.findAllByProps({
        testID: 'aws-btn-content-placeholder',
      })
    ).toHaveLength(0);
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-view' }).props
        .disabled
    ).toBe(false);
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-text' }).props
        .children
    ).toBe(0);
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-view' }).props
        .accessibilityLabel
    ).toBe('0');

    act(() => {
      component.root
        .findByProps({ testID: 'aws-btn-content-view' })
        .props.onPress();
    });
    await act(async () => {
      jest.advanceTimersByTime(48);
      await flush();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('revalidates after onPressIn before committing onPressedIn', async () => {
    const onPressedIn = jest.fn();
    function Harness() {
      const [disabled, setDisabled] = useState(false);
      return (
        <AwesomeButton
          disabled={disabled}
          onPress={() => undefined}
          onPressIn={() => setDisabled(true)}
          onPressedIn={onPressedIn}
        >
          Tap
        </AwesomeButton>
      );
    }
    const component = renderer.create(<Harness />);

    await act(async () => {
      component.root
        .findByProps({ testID: 'aws-btn-content-view' })
        .props.onPressIn(createPressEvent());
      await flush();
    });

    expect(onPressedIn).not.toHaveBeenCalled();
  });

  it('stops post-release callbacks when onPressOut tears the view down', async () => {
    const onPressedOut = jest.fn();
    let component;
    component = renderer.create(
      <AwesomeButton
        onPress={() => undefined}
        onPressOut={() => component.unmount()}
        onPressedOut={onPressedOut}
      >
        Tap
      </AwesomeButton>
    );
    const pressable = component.root.findByProps({
      testID: 'aws-btn-content-view',
    });
    act(() => {
      pressable.props.onPressIn(createPressEvent());
      pressable.props.onPressOut(createPressEvent());
    });
    await act(async () => {
      jest.advanceTimersByTime(48);
      await flush();
    });

    expect(onPressedOut).not.toHaveBeenCalled();
  });

  it('captures progress completion callbacks and stops after teardown', async () => {
    const onProgressEnd = jest.fn();
    let component;
    component = renderer.create(
      <AwesomeButton
        progress
        onPress={(next) => next?.(() => component.unmount())}
        onProgressEnd={onProgressEnd}
      >
        Save
      </AwesomeButton>
    );
    act(() => {
      component.root
        .findByProps({ testID: 'aws-btn-content-view' })
        .props.onPress();
    });
    await act(async () => {
      jest.runAllTimers();
      await flush();
      jest.runAllTimers();
    });

    expect(onProgressEnd).not.toHaveBeenCalled();
  });

  it('keeps atomic progress free of fabricated physical release callbacks', async () => {
    const order = [];
    const component = renderer.create(
      <AwesomeButton
        progress
        onPress={(next) => next?.(() => order.push('completion'))}
        onPressedOut={() => order.push('pressed-out')}
        onProgressEnd={() => order.push('progress-end')}
      >
        Save
      </AwesomeButton>
    );

    act(() => {
      component.root
        .findByProps({ testID: 'aws-btn-content-view' })
        .props.onPress();
    });
    await act(async () => {
      jest.runAllTimers();
      await flush();
      jest.runAllTimers();
      await flush();
    });

    expect(order).toEqual(['completion', 'progress-end']);
  });

  it('settles a held progress release before completion callbacks', async () => {
    const order = [];
    const component = renderer.create(
      <AwesomeButton
        progress
        onPress={(next) => next?.(() => order.push('completion'))}
        onPressedOut={() => order.push('pressed-out')}
        onProgressEnd={() => order.push('progress-end')}
      >
        Save
      </AwesomeButton>
    );
    const pressable = component.root.findByProps({
      testID: 'aws-btn-content-view',
    });

    act(() => {
      pressable.props.onPressIn(createPressEvent());
      pressable.props.onPressOut(createPressEvent());
      pressable.props.onPress();
    });
    await act(async () => {
      jest.runAllTimers();
      await flush();
      jest.runAllTimers();
      await flush();
    });

    expect(order).toEqual(['pressed-out', 'completion', 'progress-end']);
  });

  it('rolls back an atomic delivered progress run without physical callbacks', async () => {
    const onPressedOut = jest.fn();
    const onProgressEnd = jest.fn();
    function Harness() {
      const [disabled, setDisabled] = useState(false);
      return (
        <AwesomeButton
          disabled={disabled}
          progress
          onPress={() => setDisabled(true)}
          onPressedOut={onPressedOut}
          onProgressEnd={onProgressEnd}
        >
          Save
        </AwesomeButton>
      );
    }
    const component = renderer.create(<Harness />);

    act(() => {
      component.root
        .findByProps({ testID: 'aws-btn-content-view' })
        .props.onPress();
    });
    await act(async () => {
      jest.runAllTimers();
      await flush();
      jest.runAllTimers();
      await flush();
    });

    expect(onPressedOut).not.toHaveBeenCalled();
    expect(onProgressEnd).toHaveBeenCalledTimes(1);
  });

  it('uses the replacement long action but permanently disarms remove-then-add', () => {
    const actionA = jest.fn();
    const actionB = jest.fn();
    const ordinary = jest.fn();
    const component = renderer.create(
      <AwesomeButton onPress={ordinary} onLongPressAction={actionA}>
        Hold
      </AwesomeButton>
    );
    let pressable = component.root.findByProps({
      testID: 'aws-btn-content-view',
    });

    act(() => {
      pressable.props.onPressIn(createPressEvent());
      component.update(
        <AwesomeButton onPress={ordinary} onLongPressAction={actionB}>
          Hold
        </AwesomeButton>
      );
    });
    act(() => jest.advanceTimersByTime(500));
    expect(actionA).not.toHaveBeenCalled();
    expect(actionB).toHaveBeenCalledTimes(1);

    pressable = component.root.findByProps({ testID: 'aws-btn-content-view' });
    act(() => pressable.props.onPressOut(createPressEvent()));
    act(() => {
      pressable = component.root.findByProps({
        testID: 'aws-btn-content-view',
      });
      pressable.props.onPressIn(createPressEvent());
      component.update(<AwesomeButton onPress={ordinary}>Hold</AwesomeButton>);
    });
    act(() => {
      component.update(
        <AwesomeButton onPress={ordinary} onLongPressAction={actionB}>
          Hold
        </AwesomeButton>
      );
    });
    act(() => jest.advanceTimersByTime(500));
    expect(actionB).toHaveBeenCalledTimes(1);
  });

  it('keeps legacy long press physical-only and routes atomic long to the bridge', () => {
    const legacy = jest.fn();
    const canonical = jest.fn();
    const component = renderer.create(
      <AwesomeButton
        onLongPress={legacy}
        onLongPressAction={canonical}
        accessibilityLongPressLabel="More options"
      >
        Hold
      </AwesomeButton>
    );
    const pressable = component.root.findByProps({
      testID: 'aws-btn-content-view',
    });

    act(() => {
      pressable.props.onAccessibilityAction({
        nativeEvent: { actionName: 'longpress' },
      });
    });
    expect(canonical).toHaveBeenCalledTimes(1);
    expect(legacy).not.toHaveBeenCalled();
  });

  it('reserves activate for Pressable and merges unowned consumer actions', async () => {
    const consumer = jest.fn();
    const onPress = jest.fn();
    const component = renderer.create(
      <AwesomeButton
        onPress={onPress}
        onLongPressAction={() => undefined}
        dangerouslySetPressableProps={{
          accessibilityActions: [
            { name: 'activate', label: 'Wrong' },
            { name: 'magic', label: 'Magic' },
          ],
          onAccessibilityAction: consumer,
        }}
      >
        Tap
      </AwesomeButton>
    );
    const pressable = component.root.findByProps({
      testID: 'aws-btn-content-view',
    });

    expect(
      pressable.props.accessibilityActions.filter(
        (action) => action.name === 'activate'
      )
    ).toHaveLength(0);
    expect(
      pressable.props.accessibilityActions.some(
        (action) => action.name === 'magic'
      )
    ).toBe(true);
    act(() => {
      pressable.props.onAccessibilityAction({
        nativeEvent: { actionName: 'activate' },
      });
      pressable.props.onAccessibilityAction({
        nativeEvent: { actionName: 'magic' },
      });
      pressable.props.onPress();
    });
    await act(async () => {
      jest.runAllTimers();
      await flush();
    });
    expect(consumer).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('applies bridge precedence and normalizes unsafe numeric values', () => {
    const component = renderer.create(
      <AwesomeButton
        backgroundColor="red"
        height={90}
        faceHeight={40}
        raiseLevel={12}
        style={{ margin: 1 }}
        containerStyle={{ margin: 2 }}
        buttonStyle={{
          backgroundColor: 'blue',
          borderWidth: -2,
          activeOpacity: 4,
        }}
      >
        Tap
      </AwesomeButton>
    );
    const face = StyleSheet.flatten(
      component.root.findByProps({ testID: 'aws-btn-text' }).props.style
    );
    const content = StyleSheet.flatten(
      component.root.findByProps({ testID: 'aws-btn-content' }).props.style
    );
    const outer = StyleSheet.flatten(
      component.root.findByProps({ testID: 'aws-btn-content-2' }).props.style
    );

    expect(face.backgroundColor).toBe('blue');
    expect(face.borderWidth).toBe(0);
    expect(content.height).toBe(40);
    expect(outer.margin).toBe(2);
  });

  it('treats non-finite optional bridge values as absent', () => {
    const component = renderer.create(
      <AwesomeButton
        borderRadius={22}
        textSize={17}
        width={Number.NaN}
        buttonStyle={{
          borderRadius: Infinity,
          textSize: Number.NaN,
        }}
      >
        Safe fallback
      </AwesomeButton>
    );
    const face = StyleSheet.flatten(
      component.root.findByProps({ testID: 'aws-btn-text' }).props.style
    );
    const text = StyleSheet.flatten(
      component.root.findByProps({ testID: 'aws-btn-content-text' }).props.style
    );

    expect(face.borderRadius).toBe(22);
    expect(text.fontSize).toBe(17);
  });

  it('uses animationDuration for direct resolved-style changes', async () => {
    const component = renderer.create(
      <AwesomeButton
        buttonStyle={{ backgroundColor: '#000000', animationDuration: 140 }}
      >
        Styled
      </AwesomeButton>
    );

    act(() => {
      component.update(
        <AwesomeButton
          buttonStyle={{ backgroundColor: '#ffffff', animationDuration: 140 }}
        >
          Styled
        </AwesomeButton>
      );
    });
    await act(async () => {
      jest.advanceTimersByTime(80);
      await flush();
    });
    const midpoint = StyleSheet.flatten(
      component.root.findByProps({ testID: 'aws-btn-text' }).props.style
    ).backgroundColor;
    expect(midpoint).not.toBe('#000000');
    expect(midpoint).not.toBe('#ffffff');

    await act(async () => {
      jest.runAllTimers();
      await flush();
    });
    expect(
      StyleSheet.flatten(
        component.root.findByProps({ testID: 'aws-btn-text' }).props.style
      ).backgroundColor
    ).toBe('#ffffff');
  });

  it('resolves x overrides independently from legacy twitter requests', () => {
    const base = getTheme(0);
    const config = {
      ...base,
      buttons: {
        ...base.buttons,
        twitter: { ...base.buttons.twitter, backgroundColor: 'orange' },
        x: { ...base.buttons.twitter, backgroundColor: 'black' },
      },
    };
    const component = renderer.create(
      <ThemedButton config={config} type="x">
        X
      </ThemedButton>
    );
    expect(
      StyleSheet.flatten(
        component.root.findByProps({ testID: 'aws-btn-text' }).props.style
      ).backgroundColor
    ).toBe('black');

    act(() => {
      component.update(
        <ThemedButton config={{ ...config }} type="twitter">
          Twitter
        </ThemedButton>
      );
    });
    expect(
      StyleSheet.flatten(
        component.root.findByProps({ testID: 'aws-btn-text' }).props.style
      ).backgroundColor
    ).toBe('orange');
  });

  it('resolves themed dimensions as explicit then variant then size', () => {
    const base = getTheme(0);
    const config = {
      ...base,
      buttons: {
        ...base.buttons,
        primary: {
          ...base.buttons.primary,
          height: 73,
          width: 181,
          textSize: 19,
        },
      },
      size: {
        ...base.size,
        medium: {
          ...base.size.medium,
          height: 41,
          width: 121,
          textSize: 11,
        },
      },
    };
    const component = renderer.create(
      <ThemedButton config={config}>Variant</ThemedButton>
    );

    expect(component.root.findByType(AwesomeButton).props.height).toBe(73);
    expect(
      StyleSheet.flatten(
        component.root.findByProps({ testID: 'aws-btn-content-text' }).props
          .style
      ).fontSize
    ).toBe(19);

    act(() => {
      component.update(
        <ThemedButton config={config} height={88} width={205}>
          Explicit
        </ThemedButton>
      );
    });
    expect(component.root.findByType(AwesomeButton).props.height).toBe(88);

    act(() => {
      component.update(
        <ThemedButton config={config} height={Number.NaN} width={Infinity}>
          Invalid explicit values
        </ThemedButton>
      );
    });
    expect(component.root.findByType(AwesomeButton).props.height).toBe(73);
    expect(component.root.findByType(AwesomeButton).props.width).toBe(181);
  });

  it('snaps progress to a static full-face layer under Reduced Motion', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    const component = renderer.create(
      <AwesomeButton progress onPress={() => undefined}>
        Save
      </AwesomeButton>
    );
    await act(async () => flush());
    act(() => {
      component.root
        .findByProps({ testID: 'aws-btn-content-view' })
        .props.onPress();
    });
    const progress = component.root.findByProps({ testID: 'aws-btn-progress' });
    const transform = progress.props.style[2].transform[0].translateX;
    expect(transform.__getValue()).toBe(0);
  });
});
