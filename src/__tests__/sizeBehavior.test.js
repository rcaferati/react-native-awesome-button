import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import AwesomeButton from '../Button';
import {
  hasPhysicalPixelFit,
  roundRequiredWidthToPhysicalPixel,
} from '../size/useAutoWidthTextCoordinator';
import ThemedButton from '../themed/ThemedButton';

const isAnimatedValue = (value) =>
  value !== null &&
  typeof value === 'object' &&
  typeof value.setValue === 'function';

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

const getContainerStyles = (component) =>
  component.root.findByProps({ testID: 'aws-btn-content-2' }).props.style;

const getLayerStyles = (component, testID) =>
  component.root.findByProps({ testID }).props.style;

const getRenderedText = (component) =>
  component.root.findByProps({ testID: 'aws-btn-content-text' }).props.children;

const measureHiddenWidth = (component, width) => {
  const hiddenMeasure = component.root.findByProps({
    testID: 'aws-btn-hidden-measure',
  });

  act(() => {
    hiddenMeasure.props.onLayout({
      nativeEvent: {
        layout: {
          width,
        },
      },
    });
  });
};

const layoutVisibleFace = (component, width) => {
  act(() => {
    component.root.findByProps({ testID: 'aws-btn-text' }).props.onLayout({
      nativeEvent: { layout: { width } },
    });
  });
};

const acknowledgeVisibleText = (component) => {
  act(() => {
    component.root
      .findByProps({ testID: 'aws-btn-content-text' })
      .props.onTextLayout({
        nativeEvent: { lines: [{}] },
      });
  });
};

describe('AwesomeButton size behavior', () => {
  let restoreAnimationFrame;

  beforeEach(() => {
    jest.useFakeTimers();
    restoreAnimationFrame = installAnimationFrameMock();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    restoreAnimationFrame();
  });

  it.each([1, 2, 3])(
    'requires a full physical-pixel fit at %sx scale',
    (scale) => {
      expect(hasPhysicalPixelFit(100, 100 - 1 / scale, scale)).toBe(false);
      expect(hasPhysicalPixelFit(100, 100, scale)).toBe(true);
      expect(
        roundRequiredWidthToPhysicalPixel(100 + 0.1 / scale, scale)
      ).toBeCloseTo(100 + 1 / scale, 8);
    }
  );

  it('keeps committed geometry attached across fixed-size updates', () => {
    const component = createComponent(
      <AwesomeButton width={120} height={60}>
        Fixed
      </AwesomeButton>
    );

    const initialCommittedStyle = getContainerStyles(component)[3];

    expect(initialCommittedStyle).toEqual({ height: 60, width: 120 });

    act(() => {
      component.update(
        <AwesomeButton width={200} height={72}>
          Fixed
        </AwesomeButton>
      );
    });

    const animatedStyle = getContainerStyles(component).find(
      (style) =>
        style && (isAnimatedValue(style.width) || isAnimatedValue(style.height))
    );

    expect(animatedStyle).toBeDefined();
    expect(isAnimatedValue(animatedStyle.width)).toBe(true);
    expect(isAnimatedValue(animatedStyle.height)).toBe(true);
    expect(animatedStyle.width.__getValue()).toBe(120);
    expect(animatedStyle.height.__getValue()).toBe(60);

    const depthAnimatedStyle = getLayerStyles(component, 'aws-btn-bottom').find(
      (style) => style && isAnimatedValue(style.width)
    );
    const faceAnimatedStyle = getLayerStyles(component, 'aws-btn-content').find(
      (style) => style && isAnimatedValue(style.width)
    );

    expect(depthAnimatedStyle.width).toBe(animatedStyle.width);
    expect(faceAnimatedStyle.width).toBe(animatedStyle.width);

    act(() => {
      jest.runAllTimers();
    });

    const settledAnimatedStyle = getContainerStyles(component)[3];

    expect(settledAnimatedStyle).toEqual({ height: 72, width: 200 });
  });

  it('keeps fixed-size changes instant when animateSize is disabled', () => {
    const component = createComponent(
      <AwesomeButton animateSize={false} width={120} height={60}>
        Fixed
      </AwesomeButton>
    );

    act(() => {
      component.update(
        <AwesomeButton animateSize={false} width={200} height={72}>
          Fixed
        </AwesomeButton>
      );
    });

    expect(
      getContainerStyles(component).find(
        (style) => style && isAnimatedValue(style.width)
      )
    ).toBeUndefined();
    expect(getContainerStyles(component)[1].width).toBe(200);
    expect(getContainerStyles(component)[1].height).toBe(72);
  });

  it('snaps an in-flight fixed-size transition when animation is disabled', () => {
    const component = createComponent(
      <AwesomeButton width={120}>Fixed</AwesomeButton>
    );

    act(() => {
      component.update(<AwesomeButton width={200}>Fixed</AwesomeButton>);
    });
    expect(
      getContainerStyles(component).some(
        (style) => style && isAnimatedValue(style.width)
      )
    ).toBe(true);

    act(() => {
      component.update(
        <AwesomeButton animateSize={false} width={200}>
          Fixed
        </AwesomeButton>
      );
    });

    expect(
      getContainerStyles(component).some(
        (style) => style && isAnimatedValue(style.width)
      )
    ).toBe(false);
    expect(
      getContainerStyles(component).some((style) => style?.width === 200)
    ).toBe(true);
  });

  it('fit-gates growth and swaps before shrink without text transition', () => {
    const component = createComponent(<AwesomeButton>Open</AwesomeButton>);
    measureHiddenWidth(component, 76);
    measureHiddenWidth(component, 76);
    layoutVisibleFace(component, 76);

    act(() => {
      component.update(<AwesomeButton>Open analytics dashboard</AwesomeButton>);
    });

    measureHiddenWidth(component, 212);
    expect(getRenderedText(component)).toBe('Open');
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-text' }).props
        .numberOfLines
    ).toBe(1);
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-view' }).props
        .accessibilityLabel
    ).toBe('Open analytics dashboard');

    act(() => {
      jest.advanceTimersByTime(96);
    });

    expect(getRenderedText(component)).toBe('Open');

    layoutVisibleFace(component, 212);
    act(() => {
      jest.advanceTimersByTime(128);
    });

    expect(getRenderedText(component)).toBe('Open analytics dashboard');
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-text' }).props
        .numberOfLines
    ).toBe(1);

    layoutVisibleFace(component, 211.75);
    acknowledgeVisibleText(component);
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-text' }).props
        .numberOfLines
    ).toBe(1);

    layoutVisibleFace(component, 212);
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-text' }).props
        .numberOfLines
    ).toBeUndefined();

    act(() => {
      component.update(<AwesomeButton>Open</AwesomeButton>);
    });

    measureHiddenWidth(component, 76);
    expect(getRenderedText(component)).toBe('Open');
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-text' }).props
        .numberOfLines
    ).toBe(1);
    acknowledgeVisibleText(component);

    act(() => {
      jest.runAllTimers();
    });

    expect(getRenderedText(component)).toBe('Open');
  });

  it('suppresses a stale pending growth handoff after replacement', () => {
    const component = createComponent(<AwesomeButton>Open</AwesomeButton>);
    measureHiddenWidth(component, 76);
    measureHiddenWidth(component, 76);
    layoutVisibleFace(component, 76);

    act(() => {
      component.update(<AwesomeButton>Open analytics dashboard</AwesomeButton>);
    });
    measureHiddenWidth(component, 212);
    expect(getRenderedText(component)).toBe('Open');

    act(() => {
      component.update(<AwesomeButton>Save report</AwesomeButton>);
    });
    measureHiddenWidth(component, 132);
    layoutVisibleFace(component, 132);

    act(() => {
      jest.advanceTimersByTime(256);
    });

    expect(getRenderedText(component)).toBe('Save report');
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-text' }).props
        .numberOfLines
    ).toBe(1);
    acknowledgeVisibleText(component);
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-text' }).props
        .numberOfLines
    ).toBeUndefined();
  });

  it('rejects a stale native target acknowledgement after replacement', () => {
    const component = createComponent(<AwesomeButton>Open</AwesomeButton>);
    measureHiddenWidth(component, 76);
    measureHiddenWidth(component, 76);
    layoutVisibleFace(component, 76);

    act(() => {
      component.update(<AwesomeButton>Open analytics dashboard</AwesomeButton>);
    });
    measureHiddenWidth(component, 212);
    layoutVisibleFace(component, 212);
    act(() => {
      jest.advanceTimersByTime(256);
    });
    const staleAcknowledgement = component.root.findByProps({
      testID: 'aws-btn-content-text',
    }).props.onTextLayout;

    act(() => {
      component.update(<AwesomeButton>Save report</AwesomeButton>);
    });
    measureHiddenWidth(component, 132);
    expect(getRenderedText(component)).toBe('Save report');

    act(() => {
      staleAcknowledgement({ nativeEvent: { lines: [{}] } });
    });
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-text' }).props
        .numberOfLines
    ).toBe(1);

    acknowledgeVisibleText(component);
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-text' }).props
        .numberOfLines
    ).toBeUndefined();
  });

  it('measures auto-width text on an unconstrained hidden horizontal axis', () => {
    const component = createComponent(
      <AwesomeButton
        borderWidth={2}
        paddingHorizontal={20}
        textFontFamily="Example Font"
        textLineHeight={24}
        textSize={16}
      >
        Open
      </AwesomeButton>
    );
    const viewport = component.root.findByProps({
      testID: 'aws-btn-hidden-measure-viewport',
    });
    const measurement = component.root.findByProps({
      testID: 'aws-btn-hidden-measure',
    });
    const measurementText = component.root.findByProps({
      testID: 'aws-btn-hidden-measure-text',
    });

    expect(viewport.props).toEqual(
      expect.objectContaining({
        accessible: false,
        accessibilityElementsHidden: true,
        horizontal: true,
        importantForAccessibility: 'no-hide-descendants',
        pointerEvents: 'none',
        scrollEnabled: false,
        showsHorizontalScrollIndicator: false,
      })
    );
    expect(viewport.props.style).toEqual(
      expect.objectContaining({ opacity: 0, position: 'absolute' })
    );
    expect(measurement.props.style).toEqual(
      expect.objectContaining({
        borderWidth: 2,
        flexDirection: 'row',
        paddingHorizontal: 20,
      })
    );
    expect(measurement.props.style).not.toEqual(
      expect.objectContaining({ position: 'absolute' })
    );
    expect(measurementText.props).toEqual(
      expect.objectContaining({
        allowFontScaling: true,
        children: 'Open',
      })
    );
    expect(measurementText.props.style).toEqual(
      expect.objectContaining({
        fontFamily: 'Example Font',
        fontSize: 16,
        fontWeight: 'bold',
        lineHeight: 24,
      })
    );
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-text' }).props.style
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ lineHeight: 24 })])
    );

    measureHiddenWidth(component, 84);

    act(() => {
      component.update(
        <AwesomeButton
          borderWidth={2}
          paddingHorizontal={20}
          textFontFamily="Example Font"
          textLineHeight={24}
          textSize={16}
        >
          Open analytics dashboard
        </AwesomeButton>
      );
    });

    expect(
      component.root.findByProps({ testID: 'aws-btn-hidden-measure-text' })
        .props.children
    ).toBe('Open analytics dashboard');
  });

  it('measures auxiliary slots once and reuses numeric widths in hidden rows', () => {
    const component = createComponent(
      <AwesomeButton
        buttonStyle={{ contentGap: 6 }}
        before={<Text testID="before-slot">Before</Text>}
        after={<Text testID="after-slot">After</Text>}
        extra={<Text testID="extra-slot">Extra</Text>}
        width="auto"
      >
        Open
      </AwesomeButton>
    );

    expect(
      component.root.findAllByProps({ testID: 'aws-btn-hidden-measure' })
    ).toHaveLength(0);

    act(() => {
      component.root
        .findByProps({ testID: 'before-slot' })
        .parent.props.onLayout({
          nativeEvent: { layout: { width: 18 } },
        });
      component.root
        .findByProps({ testID: 'after-slot' })
        .parent.props.onLayout({
          nativeEvent: { layout: { width: 24 } },
        });
    });

    const measurement = component.root.findByProps({
      testID: 'aws-btn-hidden-measure',
    });
    expect(measurement.props.style).toEqual(
      expect.objectContaining({ gap: 6 })
    );
    expect(
      component.root.findByProps({ testID: 'aws-btn-hidden-measure-before' })
        .props.style
    ).toEqual({ width: 18 });
    expect(
      component.root.findByProps({ testID: 'aws-btn-hidden-measure-after' })
        .props.style
    ).toEqual({ width: 24 });
    expect(
      component.root.findByProps({ testID: 'aws-btn-hidden-measure-before' })
        .props.children
    ).toBeUndefined();
    expect(
      component.root.findByProps({ testID: 'aws-btn-hidden-measure-after' })
        .props.children
    ).toBeUndefined();
  });

  it('keeps auto-width changes instant when animateSize is disabled', () => {
    const component = createComponent(
      <AwesomeButton animateSize={false}>Open</AwesomeButton>
    );
    measureHiddenWidth(component, 76);

    act(() => {
      component.update(
        <AwesomeButton animateSize={false}>
          Open analytics dashboard
        </AwesomeButton>
      );
    });

    measureHiddenWidth(component, 212);

    expect(getRenderedText(component)).toBe('Open analytics dashboard');
    expect(
      getContainerStyles(component).find(
        (style) => style && isAnimatedValue(style.width)
      )
    ).toBeUndefined();
  });

  it.each([
    ['fixed', { width: 160 }],
    ['stretch', { stretch: true }],
  ])(
    'remeasures unchanged primitive text when switching from %s to auto width',
    (_mode, initialProps) => {
      const component = createComponent(
        <AwesomeButton {...initialProps}>Open</AwesomeButton>
      );

      act(() => {
        component.update(<AwesomeButton width="auto">Open</AwesomeButton>);
      });

      expect(
        component.root.findByProps({ testID: 'aws-btn-hidden-measure' })
      ).toBeDefined();

      measureHiddenWidth(component, 84);
      measureHiddenWidth(component, 84);

      expect(
        getContainerStyles(component).some((style) => style?.width === 84)
      ).toBe(true);
    }
  );

  it('assigns stretch width to both the interaction surface and visual layers', () => {
    const component = createComponent(
      <AwesomeButton stretch>Full width</AwesomeButton>
    );
    const interactionStyle = component.root.findByProps({
      testID: 'aws-btn-content-view',
    }).props.style;
    const interactionStyles =
      typeof interactionStyle === 'function'
        ? interactionStyle({ pressed: false })
        : interactionStyle;

    expect(interactionStyles).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: '100%' })])
    );
    expect(getContainerStyles(component)).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: '100%' })])
    );
  });

  it('remeasures changing custom content through the visible layout owner', () => {
    const component = createComponent(
      <AwesomeButton>
        <Text>Compact</Text>
      </AwesomeButton>
    );
    let content = component.root.findByProps({ testID: 'aws-btn-text' });

    act(() => {
      content.props.onLayout({ nativeEvent: { layout: { width: 92 } } });
    });
    expect(
      getContainerStyles(component).some((style) => style?.width === 92)
    ).toBe(true);

    act(() => {
      component.update(
        <AwesomeButton>
          <Text>A much wider custom label</Text>
        </AwesomeButton>
      );
    });
    content = component.root.findByProps({ testID: 'aws-btn-text' });
    act(() => {
      content.props.onLayout({ nativeEvent: { layout: { width: 188 } } });
      jest.runAllTimers();
    });

    expect(
      getContainerStyles(component).some((style) => style?.width === 188)
    ).toBe(true);
  });

  it('animates themed size changes when animateSize is enabled and snaps them when disabled', () => {
    const animatedComponent = createComponent(
      <ThemedButton name="rick" size="small">
        Rick
      </ThemedButton>
    );

    act(() => {
      animatedComponent.update(
        <ThemedButton name="rick" size="large">
          Rick
        </ThemedButton>
      );
    });

    expect(
      getContainerStyles(animatedComponent).find(
        (style) =>
          style &&
          (isAnimatedValue(style.width) || isAnimatedValue(style.height))
      )
    ).toBeDefined();

    const instantComponent = createComponent(
      <ThemedButton animateSize={false} name="rick" size="small">
        Rick
      </ThemedButton>
    );

    act(() => {
      instantComponent.update(
        <ThemedButton animateSize={false} name="rick" size="large">
          Rick
        </ThemedButton>
      );
    });

    expect(
      getContainerStyles(instantComponent).find(
        (style) =>
          style &&
          (isAnimatedValue(style.width) || isAnimatedValue(style.height))
      )
    ).toBeUndefined();
  });
});
