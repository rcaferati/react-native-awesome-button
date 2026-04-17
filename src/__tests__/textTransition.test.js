import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import AwesomeButton from '../Button';
import {
  buildTextTransitionFrame,
  getRandomTransitionCharacter,
  getTextTransitionRandomizeStartMs,
  getTextTransitionTimeline,
  runTextTransition,
} from '../textTransition';

jest.mock('../helpers', () => {
  const createAnimation = () => ({
    start: (callback) => callback?.({ finished: true }),
    stop: jest.fn(),
  });

  return {
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

  it('preserves spaces while scrambling and uses the correct character pools', () => {
    expect(buildTextTransitionFrame('A a0#', 'B b1?', 20, () => 0.5)[1]).toBe(
      ' '
    );
    expect(getRandomTransitionCharacter('A', () => 0.4)).toMatch(/[A-Z]/);
    expect(getRandomTransitionCharacter('z', () => 0.4)).toMatch(/[a-z]/);
    expect(getRandomTransitionCharacter('4', () => 0.4)).toMatch(/[0-9]/);
    expect(getRandomTransitionCharacter('#', () => 0.4)).toMatch(/[#%&^+=-]/);
  });

  it('randomizes current slots first, expands, then collapses left-to-right', () => {
    const timeline = getTextTransitionTimeline('hello', 'welcome2');

    expect(timeline.lastSourceRandomizeStartMs).toBe(20);
    expect(timeline.lastRandomizeStartMs).toBe(35);
    expect(timeline.collapseStartMs).toBe(45);
    expect(getTextTransitionRandomizeStartMs(4, 5, 8)).toBe(20);
    expect(getTextTransitionRandomizeStartMs(5, 5, 8)).toBe(25);
    expect(getTextTransitionRandomizeStartMs(7, 5, 8)).toBe(35);

    expect(buildTextTransitionFrame('hello', 'welcome2', 24, () => 0)).toHaveLength(
      5
    );
    expect(buildTextTransitionFrame('hello', 'welcome2', 25, () => 0)).toHaveLength(
      6
    );
    expect(buildTextTransitionFrame('hello', 'welcome2', 35, () => 0)).toHaveLength(
      8
    );
    expect(buildTextTransitionFrame('hello', 'welcome2', 44, () => 0)[0]).not.toBe(
      'w'
    );
    expect(buildTextTransitionFrame('hello', 'welcome2', 45, () => 0)[0]).toBe(
      'w'
    );
  });

  it('keeps trailing source slots until they collapse when the target is shorter', () => {
    const timeline = getTextTransitionTimeline('welcome2', 'go');

    expect(timeline.collapseStartMs).toBe(45);
    expect(buildTextTransitionFrame('welcome2', 'go', 32, () => 0)).toHaveLength(8);
    expect(buildTextTransitionFrame('welcome2', 'go', 54, () => 0)).toHaveLength(8);
    expect(
      buildTextTransitionFrame(
        'welcome2',
        'go',
        timeline.totalDurationMs,
        () => 0
      )
    ).toBe('go');
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
      <AwesomeButton textTransition>Welcome</AwesomeButton>
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(getRenderedText(component)).toBe('Welcome');
  });

  it('animates on string text changes and expands longer targets before settling', () => {
    const component = createButton(<AwesomeButton textTransition>Go#3</AwesomeButton>);

    act(() => {
      component.update(
        <AwesomeButton textTransition>Mission#42</AwesomeButton>
      );
    });

    act(() => {
      jest.advanceTimersByTime(48);
    });

    expect(getRenderedText(component)).not.toBe('Go#3');
    expect(getRenderedText(component)).not.toBe('Mission#42');
    expect(getRenderedText(component)).toHaveLength(7);

    act(() => {
      jest.runAllTimers();
    });

    expect(getRenderedText(component)).toBe('Mission#42');
  });

  it('does not hard truncate shorter targets before the collapse phase finishes', () => {
    const component = createButton(
      <AwesomeButton textTransition>Mission#42</AwesomeButton>
    );

    act(() => {
      component.update(<AwesomeButton textTransition>Go#3</AwesomeButton>);
    });

    act(() => {
      jest.advanceTimersByTime(48);
    });

    expect(getRenderedText(component)).toHaveLength(10);

    act(() => {
      jest.runAllTimers();
    });

    expect(getRenderedText(component)).toBe('Go#3');
  });

  it('swaps immediately when textTransition is disabled or the text is unchanged', () => {
    const component = createButton(
      <AwesomeButton textTransition>Welcome</AwesomeButton>
    );

    act(() => {
      component.update(<AwesomeButton textTransition>Welcome</AwesomeButton>);
      jest.advanceTimersByTime(80);
    });

    expect(getRenderedText(component)).toBe('Welcome');

    act(() => {
      component.update(<AwesomeButton>Ready#3</AwesomeButton>);
    });

    expect(getRenderedText(component)).toBe('Ready#3');
  });

  it('bypasses the effect for non-string children', () => {
    const component = createButton(
      <AwesomeButton textTransition>Welcome</AwesomeButton>
    );

    act(() => {
      component.update(
        <AwesomeButton textTransition>
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
      <AwesomeButton textTransition>Welcome</AwesomeButton>
    );

    act(() => {
      component.update(<AwesomeButton textTransition>Level 2</AwesomeButton>);
    });

    expect(jest.getTimerCount()).toBeGreaterThan(0);

    act(() => {
      component.unmount();
    });

    expect(jest.getTimerCount()).toBe(0);
  });

  it('interrupts an in-flight transition and restarts from the current rendered text', () => {
    const component = createButton(<AwesomeButton textTransition>Go#3</AwesomeButton>);

    act(() => {
      component.update(<AwesomeButton textTransition>Mission#42</AwesomeButton>);
    });

    act(() => {
      jest.advanceTimersByTime(48);
    });

    const midTransitionText = getRenderedText(component);

    act(() => {
      component.update(<AwesomeButton textTransition>Go#3</AwesomeButton>);
    });

    act(() => {
      jest.advanceTimersByTime(16);
    });

    expect(midTransitionText).toHaveLength(7);
    expect(getRenderedText(component)).toHaveLength(7);

    act(() => {
      jest.runAllTimers();
    });

    expect(getRenderedText(component)).toBe('Go#3');
  });
});
