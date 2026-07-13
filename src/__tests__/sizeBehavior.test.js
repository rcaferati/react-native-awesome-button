import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Modal, StyleSheet, View } from 'react-native';
import { __autoWidthMeasurementTesting } from '../autoWidthMeasurement';
import AwesomeButton from '../Button';
import ThemedButton from '../themed/ThemedButton';

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

const createComponent = (element) => {
  let component;

  act(() => {
    component = renderer.create(element);
  });

  return component;
};

const flushMicrotasks = async () => Promise.resolve();

const getContainerStyles = (component) =>
  component.root.findByProps({ testID: 'aws-btn-content-2' }).props.style;
const getFlattenedContainerStyle = (component) =>
  StyleSheet.flatten(getContainerStyles(component));
const getContainerWidth = (component) =>
  getFlattenedContainerStyle(component).width;

const getRenderedText = (component) =>
  component.root.findByProps({ testID: 'aws-btn-content-text' }).props.children;

const measureHiddenWidth = async (_component, width) => {
  await act(async () => {
    __autoWidthMeasurementTesting.resolveActiveMeasurement(width);
    await flushMicrotasks();
  });
};

const createRowWrappedButton = (label, extraProps = {}) => (
  <View style={{ flexDirection: 'row' }}>
    <AwesomeButton {...extraProps}>{label}</AwesomeButton>
    <View style={{ width: 24 }} />
  </View>
);

describe('AwesomeButton size behavior', () => {
  let restoreAnimationFrame;
  let mountedComponents;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    restoreAnimationFrame = installAnimationFrameMock();
    mountedComponents = [];
    __autoWidthMeasurementTesting.reset();
  });

  afterEach(async () => {
    act(() => {
      jest.runOnlyPendingTimers();
    });

    mountedComponents.forEach((component) => {
      act(() => {
        component.unmount();
      });
    });

    mountedComponents = [];
    __autoWidthMeasurementTesting.reset();
    jest.restoreAllMocks();
    jest.useRealTimers();
    restoreAnimationFrame();
  });

  it('applies fixed-size updates when animateSize is enabled', () => {
    const component = createComponent(
      <AwesomeButton width={120} height={60}>
        Fixed
      </AwesomeButton>
    );
    mountedComponents.push(component);

    act(() => {
      component.update(
        <AwesomeButton width={200} height={72}>
          Fixed
        </AwesomeButton>
      );
    });

    expect(getFlattenedContainerStyle(component).width).toBe(200);
    expect(getFlattenedContainerStyle(component).height).toBe(72);
  });

  it('keeps fixed-size changes instant when animateSize is disabled', () => {
    const component = createComponent(
      <AwesomeButton animateSize={false} width={120} height={60}>
        Fixed
      </AwesomeButton>
    );
    mountedComponents.push(component);

    act(() => {
      component.update(
        <AwesomeButton animateSize={false} width={200} height={72}>
          Fixed
        </AwesomeButton>
      );
    });

    expect(getFlattenedContainerStyle(component).width).toBe(200);
    expect(getFlattenedContainerStyle(component).height).toBe(72);
  });

  it('updates auto-width string labels without text transition', async () => {
    const component = createComponent(<AwesomeButton>Open</AwesomeButton>);
    mountedComponents.push(component);
    await measureHiddenWidth(component, 76);

    act(() => {
      component.update(<AwesomeButton>Open analytics dashboard</AwesomeButton>);
    });

    await measureHiddenWidth(component, 212);

    expect(getRenderedText(component)).toBe('Open analytics dashboard');

    act(() => {
      component.update(<AwesomeButton>Open</AwesomeButton>);
    });

    await measureHiddenWidth(component, 76);

    expect(getRenderedText(component)).toBe('Open');
  });

  it('keeps auto-width changes instant when animateSize is disabled', async () => {
    const component = createComponent(
      <AwesomeButton animateSize={false}>Open</AwesomeButton>
    );
    mountedComponents.push(component);
    await measureHiddenWidth(component, 76);

    act(() => {
      component.update(
        <AwesomeButton animateSize={false}>
          Open analytics dashboard
        </AwesomeButton>
      );
    });

    await measureHiddenWidth(component, 212);

    expect(getRenderedText(component)).toBe('Open analytics dashboard');
    expect(getFlattenedContainerStyle(component).width).toBe(212);
  });

  it('starts text and width together when growing with textTransition', async () => {
    const component = createComponent(
      <AwesomeButton textTransition>Open</AwesomeButton>
    );
    mountedComponents.push(component);
    await measureHiddenWidth(component, 76);

    act(() => {
      component.update(
        <AwesomeButton textTransition>Open analytics dashboard</AwesomeButton>
      );
    });

    await measureHiddenWidth(component, 212);

    act(() => {
      jest.advanceTimersByTime(16);
    });

    expect(getRenderedText(component)).not.toBe('Open');
    expect(getRenderedText(component)).not.toBe('Open analytics dashboard');
  });

  it('measures auto-width growth correctly inside a constrained row layout', async () => {
    const component = createComponent(
      createRowWrappedButton('Open', { textTransition: true })
    );
    mountedComponents.push(component);
    await measureHiddenWidth(component, 76);

    act(() => {
      component.update(
        createRowWrappedButton('Open analytics dashboard', {
          textTransition: true,
        })
      );
    });

    await measureHiddenWidth(component, 212);

    act(() => {
      jest.advanceTimersByTime(16);
    });

    expect(getRenderedText(component)).not.toBe('Open');
  });

  it('keeps shrink-last text transitions running before the button width changes', async () => {
    const component = createComponent(
      <AwesomeButton textTransition>Open analytics dashboard</AwesomeButton>
    );
    mountedComponents.push(component);
    await measureHiddenWidth(component, 212);
    expect(getContainerWidth(component)).toBe(212);

    act(() => {
      component.update(<AwesomeButton textTransition>Open</AwesomeButton>);
    });

    await measureHiddenWidth(component, 76);
    expect(getContainerWidth(component)).toBe(212);

    act(() => {
      jest.advanceTimersByTime(16);
    });

    expect(getRenderedText(component)).not.toBe('Open analytics dashboard');
    expect(getRenderedText(component)).not.toBe('Open');

    expect(getContainerWidth(component)).toBe(212);

    await act(async () => {
      jest.runAllTimers();
      await flushMicrotasks();
    });

    expect(getRenderedText(component)).toBe('Open');
    expect(getContainerWidth(component)).toBe(76);
  });

  it('applies themed size changes for both animated and instant modes', () => {
    const animatedComponent = createComponent(
      <ThemedButton name="rick" size="small">
        Rick
      </ThemedButton>
    );
    mountedComponents.push(animatedComponent);

    act(() => {
      animatedComponent.update(
        <ThemedButton name="rick" size="large">
          Rick
        </ThemedButton>
      );
    });

    expect(getFlattenedContainerStyle(animatedComponent).width).toBe(250);
    expect(getFlattenedContainerStyle(animatedComponent).height).toBe(60);

    const instantComponent = createComponent(
      <ThemedButton animateSize={false} name="rick" size="small">
        Rick
      </ThemedButton>
    );
    mountedComponents.push(instantComponent);

    act(() => {
      instantComponent.update(
        <ThemedButton animateSize={false} name="rick" size="large">
          Rick
        </ThemedButton>
      );
    });

    expect(getFlattenedContainerStyle(instantComponent).width).toBe(250);
    expect(getFlattenedContainerStyle(instantComponent).height).toBe(60);
  });

  it('keeps a single detached measurement host active when multiple auto-width buttons are mounted', () => {
    const component = createComponent(
      <View>
        <AwesomeButton>Open</AwesomeButton>
        <AwesomeButton>Close</AwesomeButton>
      </View>
    );
    mountedComponents.push(component);

    expect(component.root.findAllByType(Modal).length).toBe(1);
    expect(__autoWidthMeasurementTesting.getState().hostCount).toBe(2);
    expect(
      __autoWidthMeasurementTesting.getState().activeHostId
    ).not.toBeNull();
  });

  it('unmounts the shared modal after measurement completes so it cannot block touches', async () => {
    const component = createComponent(<AwesomeButton>Open</AwesomeButton>);
    mountedComponents.push(component);

    expect(component.root.findAllByType(Modal).length).toBe(1);

    await measureHiddenWidth(component, 76);

    expect(component.root.findAllByType(Modal).length).toBe(0);
  });

  it('resolves repeated identical measurements from cache without scheduling another detached measurement', async () => {
    const firstComponent = createComponent(<AwesomeButton>Open</AwesomeButton>);
    mountedComponents.push(firstComponent);
    await measureHiddenWidth(firstComponent, 76);

    expect(__autoWidthMeasurementTesting.getState().cacheSize).toBe(1);

    act(() => {
      firstComponent.unmount();
    });

    mountedComponents = mountedComponents.filter(
      (component) => component !== firstComponent
    );

    const secondComponent = createComponent(
      <AwesomeButton>Open</AwesomeButton>
    );
    mountedComponents.push(secondComponent);

    await act(async () => {
      await flushMicrotasks();
    });

    expect(
      secondComponent.root.findAllByProps({ testID: 'aws-btn-hidden-measure' })
        .length
    ).toBe(0);
    expect(
      getContainerStyles(secondComponent).some((style) => style?.width === 76)
    ).toBe(true);
  });

  it('dedupes concurrent identical measurement requests across buttons', async () => {
    const component = createComponent(
      <View>
        <AwesomeButton textTransition>Open</AwesomeButton>
        <AwesomeButton textTransition>Open</AwesomeButton>
      </View>
    );
    mountedComponents.push(component);
    await measureHiddenWidth(component, 76);

    act(() => {
      component.update(
        <View>
          <AwesomeButton textTransition>Open analytics dashboard</AwesomeButton>
          <AwesomeButton textTransition>Open analytics dashboard</AwesomeButton>
        </View>
      );
    });

    expect(__autoWidthMeasurementTesting.getState().pendingCount).toBe(0);
    expect(
      __autoWidthMeasurementTesting.getState().activeRequestId
    ).not.toBeNull();

    await measureHiddenWidth(component, 212);

    await act(async () => {
      jest.runAllTimers();
      await flushMicrotasks();
    });

    const renderedTexts = component.root
      .findAllByProps({ testID: 'aws-btn-content-text' })
      .map((element) => element.props.children);

    expect(
      renderedTexts.every((text) => text === 'Open analytics dashboard')
    ).toBe(true);
  });

  it('ignores stale async measurement results when a newer label supersedes them', async () => {
    const component = createComponent(
      <AwesomeButton textTransition>Open</AwesomeButton>
    );
    mountedComponents.push(component);
    await measureHiddenWidth(component, 76);

    act(() => {
      component.update(
        <AwesomeButton textTransition>Open analytics dashboard</AwesomeButton>
      );
    });

    await act(async () => {
      await flushMicrotasks();
    });

    act(() => {
      component.update(
        <AwesomeButton textTransition>Open reports</AwesomeButton>
      );
    });

    await measureHiddenWidth(component, 212);
    expect(getRenderedText(component)).toBe('Open');

    await measureHiddenWidth(component, 132);

    act(() => {
      jest.advanceTimersByTime(16);
    });

    expect(getRenderedText(component)).not.toBe('Open');
  });
});
