import {
  ANIMATED_TIMING_LOADING,
  DEFAULT_ACTIVE_OPACITY,
  DEFAULT_BORDER_RADIUS,
  DEFAULT_BORDER_WIDTH,
  DEFAULT_DEBOUNCED_PRESS_TIME,
  DEFAULT_HEIGHT,
  DEFAULT_HORIZONTAL_PADDING,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_RAISE_LEVEL,
  DEFAULT_TEXT_SIZE,
  DEFAULT_WIDTH,
} from '../constants';
import {
  normalizeNonNegative,
  normalizeOpacity,
  normalizeOptionalNonNegative,
  normalizeOptionalNumber,
} from '../normalization';
import type { AwesomeButtonStyle, ButtonWidth } from '../types';

type NormalizeButtonInputsOptions = {
  activeOpacity: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
  borderLeftBottomRadius?: number;
  borderRadius: number;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderWidth: number;
  buttonStyle?: AwesomeButtonStyle;
  debouncedPressTime: number;
  faceHeight?: number;
  fontScale: number;
  hasPrimitiveTextChild: boolean;
  height: number;
  paddingBottom: number;
  paddingHorizontal: number;
  paddingTop: number;
  progressLoadingTime: number;
  raiseLevel: number;
  textLineHeight: number;
  textSize: number;
  width: ButtonWidth;
};

export type NormalizedButtonInputs = {
  activeOpacity: number;
  animationDuration?: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
  borderRadius: number;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderWidth: number;
  contentGap?: number;
  debouncedPressTime: number;
  geometryHeight: number;
  paddingBottom: number;
  paddingHorizontal: number;
  paddingTop: number;
  pressInAnimationDuration?: number;
  progressLoadingTime: number;
  raiseAmount: number;
  textLineHeight: number;
  textSize: number;
  width: number | null;
};

export const normalizeButtonInputs = ({
  activeOpacity,
  borderBottomLeftRadius,
  borderBottomRightRadius,
  borderLeftBottomRadius,
  borderRadius,
  borderTopLeftRadius,
  borderTopRightRadius,
  borderWidth,
  buttonStyle,
  debouncedPressTime,
  faceHeight,
  fontScale,
  hasPrimitiveTextChild,
  height,
  paddingBottom,
  paddingHorizontal,
  paddingTop,
  progressLoadingTime,
  raiseLevel,
  textLineHeight,
  textSize,
  width,
}: NormalizeButtonInputsOptions): NormalizedButtonInputs => {
  const normalizedLegacyHeight = normalizeNonNegative(height, DEFAULT_HEIGHT);
  const normalizedFaceHeight = normalizeOptionalNonNegative(faceHeight);
  const normalizedPaddingHorizontal =
    normalizeOptionalNonNegative(buttonStyle?.paddingHorizontal) ??
    normalizeNonNegative(paddingHorizontal, DEFAULT_HORIZONTAL_PADDING);
  const normalizedPaddingTop =
    normalizeOptionalNonNegative(buttonStyle?.paddingTop) ??
    normalizeNonNegative(paddingTop, 0);
  const normalizedPaddingBottom =
    normalizeOptionalNonNegative(buttonStyle?.paddingBottom) ??
    normalizeNonNegative(paddingBottom, 0);
  const normalizedRaiseAmount =
    normalizeOptionalNonNegative(buttonStyle?.raiseAmount) ??
    normalizeNonNegative(raiseLevel, DEFAULT_RAISE_LEVEL);
  const normalizedTextLineHeight =
    normalizeOptionalNonNegative(buttonStyle?.textLineHeight) ??
    normalizeNonNegative(textLineHeight, DEFAULT_LINE_HEIGHT);
  const bridgeGeometryHeight =
    normalizedFaceHeight === undefined
      ? normalizedLegacyHeight
      : Math.max(
          0,
          normalizedFaceHeight +
            normalizedRaiseAmount -
            normalizedPaddingTop -
            normalizedPaddingBottom
        );
  const accessibilityGrowthHeight =
    hasPrimitiveTextChild && fontScale > 1
      ? normalizedTextLineHeight * fontScale + normalizedRaiseAmount
      : 0;

  return {
    activeOpacity: normalizeOpacity(
      normalizeOptionalNumber(buttonStyle?.activeOpacity) ?? activeOpacity,
      DEFAULT_ACTIVE_OPACITY
    ),
    animationDuration: normalizeOptionalNonNegative(
      buttonStyle?.animationDuration
    ),
    borderBottomLeftRadius:
      normalizeOptionalNonNegative(buttonStyle?.borderBottomLeftRadius) ??
      normalizeOptionalNonNegative(borderBottomLeftRadius) ??
      normalizeOptionalNonNegative(borderLeftBottomRadius),
    borderBottomRightRadius:
      normalizeOptionalNonNegative(buttonStyle?.borderBottomRightRadius) ??
      normalizeOptionalNonNegative(borderBottomRightRadius),
    borderRadius:
      normalizeOptionalNonNegative(buttonStyle?.borderRadius) ??
      normalizeNonNegative(borderRadius, DEFAULT_BORDER_RADIUS),
    borderTopLeftRadius:
      normalizeOptionalNonNegative(buttonStyle?.borderTopLeftRadius) ??
      normalizeOptionalNonNegative(borderTopLeftRadius),
    borderTopRightRadius:
      normalizeOptionalNonNegative(buttonStyle?.borderTopRightRadius) ??
      normalizeOptionalNonNegative(borderTopRightRadius),
    borderWidth:
      normalizeOptionalNonNegative(buttonStyle?.borderWidth) ??
      normalizeNonNegative(borderWidth, DEFAULT_BORDER_WIDTH),
    contentGap: normalizeOptionalNonNegative(buttonStyle?.contentGap),
    debouncedPressTime: normalizeNonNegative(
      debouncedPressTime,
      DEFAULT_DEBOUNCED_PRESS_TIME
    ),
    geometryHeight: Math.max(bridgeGeometryHeight, accessibilityGrowthHeight),
    paddingBottom: normalizedPaddingBottom,
    paddingHorizontal: normalizedPaddingHorizontal,
    paddingTop: normalizedPaddingTop,
    pressInAnimationDuration: normalizeOptionalNonNegative(
      buttonStyle?.pressInAnimationDuration
    ),
    progressLoadingTime: normalizeNonNegative(
      progressLoadingTime,
      ANIMATED_TIMING_LOADING
    ),
    raiseAmount: normalizedRaiseAmount,
    textLineHeight: normalizedTextLineHeight,
    textSize:
      normalizeOptionalNonNegative(buttonStyle?.textSize) ??
      normalizeNonNegative(textSize, DEFAULT_TEXT_SIZE),
    width:
      width === 'auto' || width === null
        ? null
        : normalizeOptionalNonNegative(width) ?? DEFAULT_WIDTH,
  };
};
