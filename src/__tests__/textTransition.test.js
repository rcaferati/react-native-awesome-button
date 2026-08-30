import React from 'react';
import { AccessibilityInfo, StyleSheet, Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import AwesomeButton from '../Button';
import {
  buildTextTransitionFrame,
  buildTextTransitionFrameWithStagger,
  getRandomTransitionCharacter,
  getTextTransitionCharset,
  getTextTransitionCollapseMs,
  getTextTransitionRandomizeStartMs,
  getTextTransitionTimeline,
  runTextTransition,
  splitTextGraphemes,
} from '../textTransition';

jest.mock('../helpers', () => {
  const actualHelpers = jest.requireActual('../helpers');
  const createAnimation = () => ({
    start: (callback) => callback?.({ finished: true }),
    stop: jest.fn(),
  });

  return {
    ...actualHelpers,
    animateElastic: jest.fn(() => createAnimation()),
    animateSpring: jest.fn(() => createAnimation()),
    animateTiming: jest.fn(() => createAnimation()),
  };
});

const getRenderedText = (component) =>
  component.root.findByProps({ testID: 'aws-btn-content-text' }).props.children;

const createButton = (element) => {
  let component;

  act(() => {
    component = renderer.create(element);
  });

  return component;
};

const measureHiddenText = (component, width = 200) => {
  const measurements = component.root.findAllByProps({
    testID: 'aws-btn-hidden-measure',
  });
  if (measurements.length === 0) return false;

  act(() => {
    measurements[0].props.onLayout({
      nativeEvent: { layout: { width } },
    });
  });

  return true;
};

const layoutVisibleFace = (component, width) => {
  act(() => {
    component.root.findByProps({ testID: 'aws-btn-text' }).props.onLayout({
      nativeEvent: { layout: { width } },
    });
  });
};

const settleInitialAutoLabel = (component, width) => {
  expect(measureHiddenText(component, width)).toBe(true);
  expect(measureHiddenText(component, width)).toBe(true);
  layoutVisibleFace(component, width);
};

const getRenderedWidth = (component) => {
  const style = component.root.findByProps({
    testID: 'aws-btn-content-2',
  }).props.style;
  const animatedStyle = style.find(
    (entry) => entry?.width && typeof entry.width.__getValue === 'function'
  );
  return animatedStyle
    ? animatedStyle.width.__getValue()
    : StyleSheet.flatten(style).width;
};

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

describe('text transition helpers', () => {
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

  it('uses the exact canonical pools and preserves unsupported graphemes', () => {
    const lowercasePools = ['iljtfr', 'acesuvxznhok', 'mwdbpqgy'];
    expect([...lowercasePools.join('')].sort().join('')).toBe(
      [...'abcdefghijklmnopqrstuvwxyz'].sort().join('')
    );
    expect(new Set(lowercasePools.join('')).size).toBe(26);
    expect(getTextTransitionCharset('k')).toBe('acesuvxznhok');
    expect(getTextTransitionCharset('K')).toBe('ACESUVXZNHOK');
    expect(buildTextTransitionFrame('A a0#', 'B b1?', 20, () => 0.5)[1]).toBe(
      ' '
    );
    expect(getRandomTransitionCharacter('A', () => 0.4)).toMatch(
      /[ACESUVXZNHOK]/
    );
    expect(getRandomTransitionCharacter('z', () => 0.4)).toMatch(
      /[acesuvxznhok]/
    );
    expect(getRandomTransitionCharacter('4', () => 0.4)).toMatch(/[0-9]/);
    expect(getRandomTransitionCharacter('#', () => 0.4)).toMatch(/[#%&^+=-]/);
    ['é', 'e\u0301', '?', 'م', 'ש', '👨‍👩‍👧‍👦'].forEach((grapheme) => {
      expect(getRandomTransitionCharacter(grapheme, () => 0.4)).toBe(grapheme);
    });
  });

  it('indexes Unicode grapheme clusters rather than UTF-16 code units', () => {
    expect(splitTextGraphemes('e\u0301👨‍👩‍👧‍👦🇧🇷')).toEqual(['e\u0301', '👨‍👩‍👧‍👦', '🇧🇷']);
    expect(getTextTransitionTimeline('🙂', '👨‍👩‍👧‍👦🇧🇷').targetLength).toBe(2);
  });

  it('uses the 7 ms timeline and logical growth collapse ordering', () => {
    const timeline = getTextTransitionTimeline('hello', 'welcome2');

    expect(timeline.lastSourceRandomizeStartMs).toBe(28);
    expect(timeline.lastRandomizeStartMs).toBe(49);
    expect(timeline.collapseStartMs).toBe(59);
    expect(timeline.totalDurationMs).toBe(108);
    expect(getTextTransitionRandomizeStartMs(4, 5, 8)).toBe(28);
    expect(getTextTransitionRandomizeStartMs(5, 5, 8)).toBe(35);
    expect(getTextTransitionRandomizeStartMs(7, 5, 8)).toBe(49);

    expect(
      buildTextTransitionFrame('hello', 'welcome2', 34, () => 0)
    ).toHaveLength(5);
    expect(
      buildTextTransitionFrame('hello', 'welcome2', 35, () => 0)
    ).toHaveLength(6);
    expect(
      buildTextTransitionFrame('hello', 'welcome2', 49, () => 0)
    ).toHaveLength(8);
    expect(
      buildTextTransitionFrame('hello', 'welcome2', 58, () => 0)[0]
    ).not.toBe('w');
    expect(buildTextTransitionFrame('hello', 'welcome2', 59, () => 0)[0]).toBe(
      'w'
    );
  });

  it('removes trailing shrink slots before resolving retained slots', () => {
    const timeline = getTextTransitionTimeline('welcome2', 'go');

    expect(timeline.collapseStartMs).toBe(59);
    expect(getTextTransitionCollapseMs(7, timeline)).toBe(59);
    expect(getTextTransitionCollapseMs(6, timeline)).toBe(66);
    expect(getTextTransitionCollapseMs(0, timeline)).toBe(101);
    expect(
      buildTextTransitionFrame('welcome2', 'go', 58, () => 0)
    ).toHaveLength(8);
    expect(
      buildTextTransitionFrame('welcome2', 'go', 59, () => 0)
    ).toHaveLength(7);
    expect(
      buildTextTransitionFrame(
        'welcome2',
        'go',
        timeline.totalDurationMs,
        () => 0
      )
    ).toBe('go');
  });

  it('supports a zero stagger without division or scheduling failure', () => {
    const timeline = getTextTransitionTimeline('Save', 'Open', 0);
    expect(timeline.collapseStartMs).toBe(10);
    expect(timeline.totalDurationMs).toBe(10);
    expect(
      buildTextTransitionFrameWithStagger({
        fromText: 'Save',
        targetText: 'Open',
        elapsedMs: 10,
        slotStaggerMs: 0,
      })
    ).toBe('Open');
  });

  it('stops a running transition when interrupted', () => {
    const updates = [];
    const transition = runTextTransition({
      fromText: 'hello',
      targetText: 'welcome2',
      onUpdate: (value) => updates.push(value),
      random: () => 0.25,
    });

    act(() => {
      jest.advanceTimersByTime(16);
    });

    transition.stop();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(updates).toHaveLength(1);
    expect(updates[0]).not.toBe('welcome2');
  });
});

describe('AwesomeButton textTransition', () => {
  let restoreAnimationFrame;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.25);
    restoreAnimationFrame = installAnimationFrameMock();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
    restoreAnimationFrame();
  });

  it('does not animate on initial mount', () => {
    const component = createButton(
      <AwesomeButton textTransition width={200}>
        Welcome
      </AwesomeButton>
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(getRenderedText(component)).toBe('Welcome');
  });

  it('animates on string text changes and expands longer targets before settling', () => {
    const component = createButton(
      <AwesomeButton textTransition width={200}>
        Go#3
      </AwesomeButton>
    );

    act(() => {
      component.update(
        <AwesomeButton textTransition width={200}>
          Mission#42
        </AwesomeButton>
      );
    });

    expect(
      component.root.findByProps({ testID: 'aws-btn-content-view' }).props
        .accessibilityLabel
    ).toBe('Mission#42');

    act(() => {
      jest.advanceTimersByTime(48);
    });
    expect(measureHiddenText(component)).toBe(true);

    expect(getRenderedText(component)).not.toBe('Go#3');
    expect(getRenderedText(component)).not.toBe('Mission#42');
    expect(
      splitTextGraphemes(getRenderedText(component)).length
    ).toBeGreaterThan(4);
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-text' }).props
    ).toEqual(
      expect.objectContaining({
        accessible: false,
        ellipsizeMode: 'clip',
        numberOfLines: 1,
      })
    );

    act(() => {
      jest.runAllTimers();
    });
    expect(measureHiddenText(component)).toBe(true);

    expect(getRenderedText(component)).toBe('Mission#42');
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-text' }).props
        .numberOfLines
    ).toBeUndefined();
  });

  it('does not hard truncate shorter targets before the collapse phase finishes', () => {
    const component = createButton(
      <AwesomeButton textTransition width={200}>
        Mission#42
      </AwesomeButton>
    );

    act(() => {
      component.update(
        <AwesomeButton textTransition width={200}>
          Go#3
        </AwesomeButton>
      );
    });

    act(() => {
      jest.advanceTimersByTime(48);
    });
    expect(measureHiddenText(component)).toBe(true);

    expect(getRenderedText(component)).toHaveLength(10);
    expect(
      component.root.findAll(
        (node) =>
          StyleSheet.flatten(node.props.style)?.justifyContent === 'flex-start'
      ).length
    ).toBeGreaterThan(0);

    act(() => {
      jest.runAllTimers();
    });
    expect(measureHiddenText(component)).toBe(true);

    expect(getRenderedText(component)).toBe('Go#3');
    expect(
      component.root.findAll(
        (node) =>
          StyleSheet.flatten(node.props.style)?.justifyContent === 'flex-start'
      )
    ).toHaveLength(0);
  });

  it('holds an auto-width candidate until the rendered face can fit it', () => {
    const component = createButton(
      <AwesomeButton textTransition width="auto">
        Go
      </AwesomeButton>
    );
    settleInitialAutoLabel(component, 80);

    act(() => {
      component.update(
        <AwesomeButton textTransition width="auto">
          Mission
        </AwesomeButton>
      );
    });
    expect(measureHiddenText(component, 160)).toBe(true);

    act(() => {
      jest.advanceTimersByTime(48);
    });
    expect(
      component.root.findAllByProps({ testID: 'aws-btn-hidden-measure-text' })
    ).toHaveLength(0);
    act(() => {
      jest.advanceTimersByTime(16);
    });
    const candidate = component.root.findByProps({
      testID: 'aws-btn-hidden-measure-text',
    }).props.children;
    expect(measureHiddenText(component, 120)).toBe(true);
    expect(getRenderedText(component)).toBe('Go');

    layoutVisibleFace(component, 160);
    act(() => {
      jest.advanceTimersByTime(64);
    });

    expect(getRenderedText(component)).toBe(candidate);
  });

  it('rejects an obsolete native measurement after target replacement', () => {
    const component = createButton(
      <AwesomeButton textTransition width={200}>
        Alpha
      </AwesomeButton>
    );

    act(() => {
      component.update(
        <AwesomeButton textTransition width={200}>
          Bravo
        </AwesomeButton>
      );
    });
    act(() => {
      jest.advanceTimersByTime(16);
    });
    const obsoleteOnLayout = component.root.findByProps({
      testID: 'aws-btn-hidden-measure',
    }).props.onLayout;

    act(() => {
      component.update(
        <AwesomeButton textTransition width={200}>
          Charlie
        </AwesomeButton>
      );
    });
    act(() => {
      obsoleteOnLayout({
        nativeEvent: { layout: { width: 999 } },
      });
    });
    act(() => {
      jest.advanceTimersByTime(16);
    });

    expect(getRenderedText(component)).toBe('Alpha');
    expect(
      component.root.findByProps({ testID: 'aws-btn-hidden-measure-text' })
        .props.children
    ).not.toBe('Bravo');

    expect(measureHiddenText(component)).toBe(true);
    act(() => {
      jest.runAllTimers();
    });
    expect(measureHiddenText(component)).toBe(true);
    expect(getRenderedText(component)).toBe('Charlie');
  });

  it('settles auto geometry before text when animateSize is disabled', () => {
    const component = createButton(
      <AwesomeButton animateSize={false} textTransition width="auto">
        Go
      </AwesomeButton>
    );
    settleInitialAutoLabel(component, 80);

    act(() => {
      component.update(
        <AwesomeButton animateSize={false} textTransition width="auto">
          Mission
        </AwesomeButton>
      );
    });
    expect(measureHiddenText(component, 160)).toBe(true);

    expect(getRenderedWidth(component)).toBe(160);
    expect(getRenderedText(component)).toBe('Go');
    layoutVisibleFace(component, 160);

    act(() => {
      jest.advanceTimersByTime(16);
    });
    expect(measureHiddenText(component, 150)).toBe(true);
    expect(getRenderedText(component)).not.toBe('Go');
  });

  it('never renders a shrinking auto width below the accepted frame floor', () => {
    const component = createButton(
      <AwesomeButton textTransition width="auto">
        Mission
      </AwesomeButton>
    );
    settleInitialAutoLabel(component, 200);

    act(() => {
      component.update(
        <AwesomeButton textTransition width="auto">
          Go
        </AwesomeButton>
      );
    });
    expect(measureHiddenText(component, 80)).toBe(true);
    act(() => {
      jest.advanceTimersByTime(16);
    });
    expect(measureHiddenText(component, 190)).toBe(true);

    act(() => {
      jest.advanceTimersByTime(160);
    });
    expect(getRenderedWidth(component)).toBeGreaterThanOrEqual(190);

    act(() => {
      jest.runAllTimers();
    });
    expect(measureHiddenText(component, 80)).toBe(true);
    expect(getRenderedText(component)).toBe('Go');
    expect(getRenderedWidth(component)).toBe(80);
  });

  it('uses clipped single-line fallback after an auto width is externally constrained', () => {
    const component = createButton(
      <AwesomeButton textTransition width="auto">
        Go
      </AwesomeButton>
    );
    settleInitialAutoLabel(component, 80);

    act(() => {
      component.update(
        <AwesomeButton textTransition width="auto">
          Mission control
        </AwesomeButton>
      );
    });
    expect(measureHiddenText(component, 240)).toBe(true);
    act(() => {
      jest.advanceTimersByTime(96);
    });
    const constrainedCandidate = component.root.findByProps({
      testID: 'aws-btn-hidden-measure-text',
    }).props.children;
    expect(measureHiddenText(component, 210)).toBe(true);
    expect(getRenderedText(component)).toBe('Go');

    act(() => {
      jest.runAllTimers();
    });

    expect(getRenderedText(component)).toBe(constrainedCandidate);
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-text' }).props
    ).toEqual(
      expect.objectContaining({ ellipsizeMode: 'clip', numberOfLines: 1 })
    );
  });

  it('keeps unchanged labels stable and swaps non-transition labels only after the width phase they require', () => {
    const component = createButton(
      <AwesomeButton textTransition width={200}>
        Welcome
      </AwesomeButton>
    );

    act(() => {
      component.update(
        <AwesomeButton textTransition width={200}>
          Welcome
        </AwesomeButton>
      );
      jest.advanceTimersByTime(80);
    });

    expect(getRenderedText(component)).toBe('Welcome');

    act(() => {
      component.update(<AwesomeButton width={200}>Ready#3</AwesomeButton>);
    });

    expect(getRenderedText(component)).toBe('Ready#3');
  });

  it('bypasses the effect for non-string children', () => {
    const component = createButton(
      <AwesomeButton textTransition width={200}>
        Welcome
      </AwesomeButton>
    );

    act(() => {
      component.update(
        <AwesomeButton textTransition width={200}>
          <Text>Node label</Text>
        </AwesomeButton>
      );
      jest.advanceTimersByTime(200);
    });

    expect(component.root.findByType(Text).props.children).toBe('Node label');
    expect(
      component.root.findAllByProps({ testID: 'aws-btn-content-text' })
    ).toHaveLength(0);
  });

  it('cleans up timers on unmount', () => {
    const component = createButton(
      <AwesomeButton textTransition width={200}>
        Welcome
      </AwesomeButton>
    );

    act(() => {
      component.update(
        <AwesomeButton textTransition width={200}>
          Level 2
        </AwesomeButton>
      );
    });

    expect(jest.getTimerCount()).toBeGreaterThan(0);

    act(() => {
      component.unmount();
    });

    expect(jest.getTimerCount()).toBe(0);
  });

  it('interrupts an in-flight transition and restarts from the current rendered text', () => {
    const component = createButton(
      <AwesomeButton textTransition width={200}>
        Go#3
      </AwesomeButton>
    );

    act(() => {
      component.update(
        <AwesomeButton textTransition width={200}>
          Mission#42
        </AwesomeButton>
      );
    });

    act(() => {
      jest.advanceTimersByTime(48);
    });
    expect(measureHiddenText(component)).toBe(true);

    const midTransitionText = getRenderedText(component);

    act(() => {
      component.update(
        <AwesomeButton textTransition width={200}>
          Go#3
        </AwesomeButton>
      );
    });

    act(() => {
      jest.advanceTimersByTime(16);
    });
    expect(measureHiddenText(component)).toBe(true);

    expect(splitTextGraphemes(midTransitionText).length).toBeGreaterThan(4);
    expect(splitTextGraphemes(getRenderedText(component))).toHaveLength(
      splitTextGraphemes(midTransitionText).length
    );

    act(() => {
      jest.runAllTimers();
    });
    expect(measureHiddenText(component)).toBe(true);

    expect(getRenderedText(component)).toBe('Go#3');
  });

  it('settles without random frames when Reduced Motion is enabled initially', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    const component = createButton(
      <AwesomeButton textTransition width={200}>
        Alpha
      </AwesomeButton>
    );
    await act(async () => Promise.resolve());

    act(() => {
      component.update(
        <AwesomeButton textTransition width={200}>
          Bravo
        </AwesomeButton>
      );
    });

    expect(getRenderedText(component)).toBe('Bravo');
    expect(
      component.root.findByProps({ testID: 'aws-btn-content-text' }).props
        .numberOfLines
    ).toBeUndefined();
  });

  it('invalidates an active generation when Reduced Motion changes', async () => {
    let reduceMotionListener;
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation((_eventName, listener) => {
        reduceMotionListener = listener;
        return { remove: jest.fn() };
      });
    const component = createButton(
      <AwesomeButton textTransition width={200}>
        Alpha
      </AwesomeButton>
    );
    await act(async () => Promise.resolve());

    act(() => {
      component.update(
        <AwesomeButton textTransition width={200}>
          Charlie
        </AwesomeButton>
      );
    });
    act(() => {
      jest.advanceTimersByTime(32);
    });
    expect(measureHiddenText(component)).toBe(true);
    expect(getRenderedText(component)).not.toBe('Charlie');

    act(() => {
      reduceMotionListener(true);
    });

    expect(getRenderedText(component)).toBe('Charlie');
    expect(jest.getTimerCount()).toBe(0);
  });
});
