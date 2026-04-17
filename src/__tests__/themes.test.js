import React from 'react';
import renderer, { act } from 'react-test-renderer';
import ThemedButton from '../themed/ThemedButton';
import {
  interpolateColors,
  interpolateThemeButtonStyle,
  default as blendColors,
} from '../themed/colors';
import { areThemeButtonStylesEqual } from '../themed/resolution';
import getTheme from '../themed/themes';
import { runTimedTransition } from '../themed/transition';

jest.mock('../themed/transition', () => ({
  runTimedTransition: jest.fn(() => ({
    stop: jest.fn(),
  })),
}));

const EXPECTED_THEME_NAMES = [
  'basic',
  'bojack',
  'cartman',
  'mysterion',
  'c137',
  'rick',
  'summer',
  'bruce',
];

const EXPECTED_VARIANTS = [
  'anchor',
  'danger',
  'disabled',
  'facebook',
  'flat',
  'github',
  'linkedin',
  'messenger',
  'pinterest',
  'primary',
  'reddit',
  'secondary',
  'twitter',
  'whatsapp',
  'youtube',
];

const EXPECTED_SIZES = ['icon', 'large', 'medium', 'small'];

const getFaceBackground = (component) =>
  component.root.findByProps({ testID: 'aws-btn-text' }).props.style[1]
    .backgroundColor;

const getBottomBackground = (component) =>
  component.root.findByProps({ testID: 'aws-btn-bottom' }).props.style[1]
    .backgroundColor;

const getTextColor = (component) =>
  component.root.findByProps({ testID: 'aws-btn-content-text' }).props.style[1]
    .color;

const getLatestTransitionOptions = () => {
  const calls = runTimedTransition.mock.calls;

  return calls[calls.length - 1]?.[0];
};

const createThemedButton = (element) => {
  let component;

  act(() => {
    component = renderer.create(element);
  });

  return component;
};

describe('theme helpers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    runTimedTransition.mockClear();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('blends colors without relying on shared parser state', () => {
    expect(blendColors(-0.5, '#4688C5')).toMatch(/^#/);
    expect(blendColors(-0.5, '#4688C5')).toEqual(blendColors(-0.5, '#4688C5'));
    expect(blendColors(0.25, 'rgb(70, 136, 197)')).toMatch(/^rgb/);
  });

  it('interpolates colors across hex and rgba values', () => {
    expect(interpolateColors('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(
      interpolateColors(
        'rgba(0, 0, 0, 0.2)',
        'rgba(255, 255, 255, 0.8)',
        0.5
      )
    ).toBe('rgba(128, 128, 128, 0.5)');
  });

  it('interpolates theme button styles while preserving non-color target fields', () => {
    expect(
      interpolateThemeButtonStyle(
        {
          backgroundColor: '#000000',
          textColor: '#ffffff',
          raiseLevel: 2,
          width: 100,
        },
        {
          backgroundColor: '#ffffff',
          textColor: '#000000',
          raiseLevel: 12,
          width: 200,
        },
        0.5
      )
    ).toEqual({
      backgroundColor: '#808080',
      textColor: '#808080',
      raiseLevel: 12,
      width: 200,
    });
  });

  it('compares theme button styles by resolved values instead of object identity', () => {
    expect(
      areThemeButtonStylesEqual(
        {
          backgroundColor: '#000000',
          textColor: '#ffffff',
        },
        {
          backgroundColor: '#000000',
          textColor: '#ffffff',
        }
      )
    ).toBe(true);
  });

  it('falls back to the target color when interpolation inputs cannot be parsed', () => {
    expect(
      interpolateThemeButtonStyle(
        {
          backgroundColor: 'var(--broken-color)',
          textColor: '#ffffff',
        },
        {
          backgroundColor: '#4688C5',
          textColor: '#1e88e5',
        },
        0.5
      )
    ).toMatchObject({
      backgroundColor: '#4688C5',
      textColor: '#8fc4f2',
    });
  });

  it('falls back to the basic theme for invalid theme lookups', () => {
    expect(getTheme(999).name).toBe('basic');
    expect(getTheme(null, 'does-not-exist').name).toBe('basic');
  });

  it('exposes the exact registered themes, variants, and sizes', () => {
    EXPECTED_THEME_NAMES.forEach((themeName, index) => {
      const theme = getTheme(index, themeName);

      expect(theme.name).toBe(themeName);
      expect(Object.keys(theme.buttons).sort()).toEqual(EXPECTED_VARIANTS);
      expect(Object.keys(theme.size).sort()).toEqual(EXPECTED_SIZES);
      expect(theme.buttons.github).toBeDefined();
      expect(theme.buttons.reddit).toBeDefined();
    });
  });

  it('falls back to the primary button variant when a themed variant is missing at runtime', () => {
    const component = createThemedButton(
      <ThemedButton type="instagram">Fallback</ThemedButton>
    );

    expect(getFaceBackground(component)).toBe('#4688C5');
  });

  it('makes themed transparent buttons visually transparent while keeping feedback layers', () => {
    const component = createThemedButton(
      <ThemedButton transparent>Transparent</ThemedButton>
    );

    expect(
      component.root.findByProps({ testID: 'aws-btn-shadow' }).props.style[1]
        .backgroundColor
    ).toBe('transparent');
    expect(getBottomBackground(component)).toBe('transparent');
    expect(getFaceBackground(component)).toBe('transparent');
    expect(
      component.root.findByProps({ testID: 'aws-btn-active-background' }).props
        .style[1].backgroundColor
    ).not.toBe('transparent');
  });

  it('animates between resolved variant palettes when the type changes within the same theme source', () => {
    const component = createThemedButton(
      <ThemedButton type="primary">Animated</ThemedButton>
    );

    act(() => {
      component.update(<ThemedButton type="secondary">Animated</ThemedButton>);
    });
    const transition = getLatestTransitionOptions();

    act(() => {
      transition.onUpdate(0.5);
    });

    expect(getFaceBackground(component)).not.toBe('#4688C5');
    expect(getFaceBackground(component)).not.toBe('#FFF');

    act(() => {
      transition.onUpdate(1);
      transition.onComplete?.();
    });

    expect(getFaceBackground(component)).toBe('#FFF');
  });

  it('updates text and face colors through the transition lifecycle', () => {
    const component = createThemedButton(
      <ThemedButton type="secondary">Animated</ThemedButton>
    );

    act(() => {
      component.update(<ThemedButton type="anchor">Animated</ThemedButton>);
    });
    const transition = getLatestTransitionOptions();

    act(() => {
      transition.onUpdate(0.5);
    });

    expect(getTextColor(component)).not.toBe('#1e88e5');
    expect(getTextColor(component)).not.toBe('#FFF');
    expect(getBottomBackground(component)).not.toBe('#abc7dc');
    expect(getBottomBackground(component)).not.toBe('#22633c');

    act(() => {
      transition.onUpdate(1);
      transition.onComplete?.();
    });

    expect(getTextColor(component)).toBe('#FFF');
    expect(getFaceBackground(component)).toBe('#46C578');
  });

  it('keeps theme source changes immediate instead of animating them', () => {
    const component = createThemedButton(
      <ThemedButton name="basic" type="primary">
        Theme
      </ThemedButton>
    );

    act(() => {
      component.update(
        <ThemedButton name="bojack" type="primary">
          Theme
        </ThemedButton>
      );
    });

    expect(getFaceBackground(component)).toBe('#6678C5');
  });

  it('keeps transparent toggles immediate even when the resolved type changes', () => {
    const component = createThemedButton(
      <ThemedButton type="primary">Transparent</ThemedButton>
    );

    act(() => {
      component.update(
        <ThemedButton transparent type="secondary">
          Transparent
        </ThemedButton>
      );
    });

    expect(getFaceBackground(component)).toBe('transparent');
    expect(getBottomBackground(component)).toBe('transparent');
  });

  it('finishes interrupted transitions at the latest requested variant', () => {
    const component = createThemedButton(
      <ThemedButton type="primary">Interrupted</ThemedButton>
    );

    act(() => {
      component.update(
        <ThemedButton type="secondary">Interrupted</ThemedButton>
      );
    });
    const firstTransition = getLatestTransitionOptions();

    act(() => {
      firstTransition.onUpdate(0.5);
    });

    act(() => {
      component.update(<ThemedButton type="anchor">Interrupted</ThemedButton>);
    });
    const secondTransition = getLatestTransitionOptions();

    act(() => {
      secondTransition.onUpdate(1);
      secondTransition.onComplete?.();
    });

    expect(getFaceBackground(component)).toBe('#46C578');
  });

  it('skips palette transition work when the resolved type stays the same on rerender', () => {
    const component = createThemedButton(
      <ThemedButton type="primary">Stable</ThemedButton>
    );

    runTimedTransition.mockClear();

    act(() => {
      component.update(<ThemedButton type="primary">Stable</ThemedButton>);
    });

    expect(runTimedTransition).not.toHaveBeenCalled();
    expect(getFaceBackground(component)).toBe('#4688C5');
  });
});
