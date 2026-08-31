import type { ColorValue } from 'react-native';
import type { ResolvedStylePalette } from '../useResolvedStyleTransition';
import type { AwesomeButtonStyle } from '../types';
import type { NormalizedButtonInputs } from './normalizeButtonInputs';

type ResolveButtonPresentationTargetsOptions = {
  activityColor: ColorValue;
  backgroundActive: ColorValue;
  backgroundColor: ColorValue;
  backgroundDarker: ColorValue;
  backgroundPlaceholder: ColorValue;
  backgroundProgress: ColorValue;
  backgroundShadow: ColorValue;
  borderColor?: ColorValue;
  buttonStyle?: AwesomeButtonStyle;
  disabled: boolean;
  normalized: NormalizedButtonInputs;
  platform: string;
  textColor: ColorValue;
  textFontFamily?: string;
};

export type ButtonPresentationTargets = {
  accessibility: {
    minimumTarget: number;
  };
  content: {
    textFontFamily?: string;
    textLineHeight: number;
  };
  geometry: {
    height: number;
    paddingBottom: number;
    paddingHorizontal: number;
    paddingTop: number;
    raiseAmount: number;
    width: number | null;
  };
  interaction: {
    activeOpacity: number;
    animationDuration?: number;
    debouncedPressTime: number;
    pressInAnimationDuration?: number;
    progressLoadingTime: number;
  };
  palette: ResolvedStylePalette;
};

export const resolveButtonPresentationTargets = ({
  activityColor,
  backgroundActive,
  backgroundColor,
  backgroundDarker,
  backgroundPlaceholder,
  backgroundProgress,
  backgroundShadow,
  borderColor,
  buttonStyle,
  disabled,
  normalized,
  platform,
  textColor,
  textFontFamily,
}: ResolveButtonPresentationTargetsOptions): ButtonPresentationTargets => ({
  accessibility: {
    minimumTarget: platform === 'android' ? 48 : 44,
  },
  content: {
    textFontFamily: buttonStyle?.textFontFamily ?? textFontFamily,
    textLineHeight: normalized.textLineHeight,
  },
  geometry: {
    height: normalized.geometryHeight,
    paddingBottom: normalized.paddingBottom,
    paddingHorizontal: normalized.paddingHorizontal,
    paddingTop: normalized.paddingTop,
    raiseAmount: normalized.raiseAmount,
    width: normalized.width,
  },
  interaction: {
    activeOpacity: normalized.activeOpacity,
    animationDuration: normalized.animationDuration,
    debouncedPressTime: normalized.debouncedPressTime,
    pressInAnimationDuration: normalized.pressInAnimationDuration,
    progressLoadingTime: normalized.progressLoadingTime,
  },
  palette: {
    activityColor: buttonStyle?.activityColor ?? activityColor,
    backgroundActive:
      buttonStyle?.backgroundActive ??
      buttonStyle?.pressedOverlayColor ??
      backgroundActive,
    backgroundColor: disabled
      ? buttonStyle?.disabledBackgroundColor ??
        buttonStyle?.backgroundColor ??
        backgroundColor
      : buttonStyle?.backgroundColor ?? backgroundColor,
    backgroundDarker: disabled
      ? buttonStyle?.disabledDepthColor ??
        buttonStyle?.depthColor ??
        backgroundDarker
      : buttonStyle?.depthColor ?? backgroundDarker,
    backgroundPlaceholder:
      buttonStyle?.backgroundPlaceholder ?? backgroundPlaceholder,
    backgroundProgress: buttonStyle?.backgroundProgress ?? backgroundProgress,
    backgroundShadow: disabled
      ? buttonStyle?.disabledShadowColor ??
        buttonStyle?.shadowColor ??
        backgroundShadow
      : buttonStyle?.shadowColor ?? backgroundShadow,
    borderBottomLeftRadius: normalized.borderBottomLeftRadius,
    borderBottomRightRadius: normalized.borderBottomRightRadius,
    borderColor: disabled
      ? buttonStyle?.disabledBorderColor ??
        buttonStyle?.borderColor ??
        borderColor
      : buttonStyle?.borderColor ?? borderColor,
    borderRadius: normalized.borderRadius,
    borderTopLeftRadius: normalized.borderTopLeftRadius,
    borderTopRightRadius: normalized.borderTopRightRadius,
    borderWidth: normalized.borderWidth,
    contentGap: normalized.contentGap,
    textColor: disabled
      ? buttonStyle?.disabledForegroundColor ??
        buttonStyle?.foregroundColor ??
        textColor
      : buttonStyle?.foregroundColor ?? textColor,
    textSize: normalized.textSize,
  },
});
