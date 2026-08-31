import {
  ANIMATED_TIMING_LOADING,
  DEFAULT_ACTIVE_OPACITY,
  DEFAULT_BACKGROUND_ACTIVE,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_BACKGROUND_DARKER,
  DEFAULT_BACKGROUND_SHADOW,
  DEFAULT_BORDER_RADIUS,
  DEFAULT_BORDER_WIDTH,
  DEFAULT_DEBOUNCED_PRESS_TIME,
  DEFAULT_HEIGHT,
  DEFAULT_HORIZONTAL_PADDING,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_RAISE_LEVEL,
  DEFAULT_TEXT_SIZE,
} from '../constants';
import { normalizeButtonInputs } from '../button/normalizeButtonInputs';
import { resolveButtonPresentationTargets } from '../button/resolveButtonPresentationTargets';

const normalize = (
  overrides: Partial<Parameters<typeof normalizeButtonInputs>[0]> = {}
) =>
  normalizeButtonInputs({
    activeOpacity: DEFAULT_ACTIVE_OPACITY,
    borderRadius: DEFAULT_BORDER_RADIUS,
    borderWidth: DEFAULT_BORDER_WIDTH,
    debouncedPressTime: DEFAULT_DEBOUNCED_PRESS_TIME,
    fontScale: 1,
    hasPrimitiveTextChild: true,
    height: DEFAULT_HEIGHT,
    paddingBottom: 0,
    paddingHorizontal: DEFAULT_HORIZONTAL_PADDING,
    paddingTop: 0,
    progressLoadingTime: ANIMATED_TIMING_LOADING,
    raiseLevel: DEFAULT_RAISE_LEVEL,
    textLineHeight: DEFAULT_LINE_HEIGHT,
    textSize: DEFAULT_TEXT_SIZE,
    width: null,
    ...overrides,
  });

const resolve = (
  overrides: Partial<
    Parameters<typeof resolveButtonPresentationTargets>[0]
  > = {}
) =>
  resolveButtonPresentationTargets({
    activityColor: '#fff',
    backgroundActive: DEFAULT_BACKGROUND_ACTIVE,
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
    backgroundDarker: DEFAULT_BACKGROUND_DARKER,
    backgroundPlaceholder: DEFAULT_BACKGROUND_SHADOW,
    backgroundProgress: DEFAULT_BACKGROUND_SHADOW,
    backgroundShadow: DEFAULT_BACKGROUND_SHADOW,
    disabled: false,
    normalized: normalize(),
    platform: 'ios',
    textColor: '#fff',
    ...overrides,
  });

describe('button input and presentation resolution', () => {
  it('preserves the package defaults', () => {
    expect(normalize()).toEqual({
      activeOpacity: 1,
      animationDuration: undefined,
      borderBottomLeftRadius: undefined,
      borderBottomRightRadius: undefined,
      borderRadius: 4,
      borderTopLeftRadius: undefined,
      borderTopRightRadius: undefined,
      borderWidth: 0,
      contentGap: undefined,
      debouncedPressTime: 0,
      geometryHeight: 60,
      paddingBottom: 0,
      paddingHorizontal: 16,
      paddingTop: 0,
      pressInAnimationDuration: undefined,
      progressLoadingTime: 3000,
      raiseAmount: 4,
      textLineHeight: 20,
      textSize: 14,
      width: null,
    });
  });

  it('preserves face-height bridging and large-text growth', () => {
    expect(
      normalize({
        buttonStyle: {
          paddingBottom: 3,
          paddingTop: 2,
          raiseAmount: 6,
        },
        faceHeight: 50,
      }).geometryHeight
    ).toBe(51);

    expect(
      normalize({
        fontScale: 2,
        height: 10,
      }).geometryHeight
    ).toBe(44);
  });

  it('normalizes unsafe values and preserves canonical precedence', () => {
    expect(
      normalize({
        activeOpacity: -1,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: -2,
        borderLeftBottomRadius: 7,
        borderRadius: Number.NaN,
        borderTopLeftRadius: 9,
        borderTopRightRadius: Number.POSITIVE_INFINITY,
        borderWidth: -3,
        buttonStyle: {
          activeOpacity: Number.POSITIVE_INFINITY,
          animationDuration: Number.NaN,
          borderBottomLeftRadius: 12,
          contentGap: -4,
          paddingHorizontal: -5,
          pressInAnimationDuration: -8,
          textSize: -10,
        },
        debouncedPressTime: -1,
        height: Number.NaN,
        progressLoadingTime: Number.POSITIVE_INFINITY,
        width: -20,
      })
    ).toMatchObject({
      activeOpacity: 0,
      animationDuration: undefined,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 0,
      borderRadius: 4,
      borderTopLeftRadius: 9,
      borderTopRightRadius: undefined,
      borderWidth: 0,
      contentGap: 0,
      debouncedPressTime: 0,
      geometryHeight: 60,
      paddingHorizontal: 0,
      pressInAnimationDuration: 0,
      progressLoadingTime: 3000,
      textSize: 0,
      width: 0,
    });

    expect(
      normalize({
        borderBottomLeftRadius: undefined,
        borderLeftBottomRadius: 7,
      }).borderBottomLeftRadius
    ).toBe(7);
  });

  it('preserves disabled and explicit visual precedence', () => {
    const targets = resolve({
      borderColor: '#legacy-border',
      buttonStyle: {
        activityColor: '#activity',
        backgroundActive: '#active',
        backgroundColor: '#base',
        backgroundPlaceholder: '#placeholder',
        backgroundProgress: '#progress',
        borderColor: '#border',
        depthColor: '#depth',
        disabledBackgroundColor: '#disabled-base',
        disabledBorderColor: '#disabled-border',
        disabledDepthColor: '#disabled-depth',
        disabledForegroundColor: '#disabled-text',
        disabledShadowColor: '#disabled-shadow',
        foregroundColor: '#text',
        shadowColor: '#shadow',
        textFontFamily: 'Inter',
      },
      disabled: true,
      platform: 'android',
      textFontFamily: 'Legacy',
    });

    expect(targets.accessibility.minimumTarget).toBe(48);
    expect(targets.content.textFontFamily).toBe('Inter');
    expect(targets.palette).toMatchObject({
      activityColor: '#activity',
      backgroundActive: '#active',
      backgroundColor: '#disabled-base',
      backgroundDarker: '#disabled-depth',
      backgroundPlaceholder: '#placeholder',
      backgroundProgress: '#progress',
      backgroundShadow: '#disabled-shadow',
      borderColor: '#disabled-border',
      textColor: '#disabled-text',
    });
  });

  it('uses pressed-overlay fallback without overriding backgroundActive', () => {
    expect(
      resolve({
        buttonStyle: { pressedOverlayColor: '#overlay' },
      }).palette.backgroundActive
    ).toBe('#overlay');
    expect(
      resolve({
        buttonStyle: {
          backgroundActive: '#active',
          pressedOverlayColor: '#overlay',
        },
      }).palette.backgroundActive
    ).toBe('#active');
  });
});
