import { useMemo, type ReactNode } from 'react';
import {
  Animated,
  type ColorValue,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { getAutoWidthTextFlow, getHeightDimensions } from './size/contracts';
import useAutoWidthTextCoordinator from './size/useAutoWidthTextCoordinator';
import type { HiddenMeasurementRequest } from './size/useAutoWidthTextCoordinator';
import useButtonHeightOwner from './size/useButtonHeightOwner';
import useButtonWidthOwner from './size/useButtonWidthOwner';
import type { ButtonWidth } from './types';

export type SizeAnimatedStyles = {
  container: StyleProp<ViewStyle> | null;
  shadow: StyleProp<ViewStyle> | null;
  bottom: StyleProp<ViewStyle> | null;
  progress: StyleProp<ViewStyle> | null;
  content: StyleProp<ViewStyle> | null;
  activeBackground: StyleProp<ViewStyle> | null;
};

type UseButtonSizeBehaviorParams = {
  animateSize?: boolean;
  animatedOpacity: Animated.Value;
  after?: ReactNode;
  before?: ReactNode;
  children: ReactNode;
  extra?: ReactNode;
  height: number;
  measurementSignature: string;
  paddingBottom: number;
  paddingTop: number;
  raiseLevel: number;
  reduceMotion?: boolean;
  stretch?: boolean;
  textTransition?: boolean;
  width: ButtonWidth;
};

type UseButtonSizeBehaviorResult = {
  alignTextLogicalLeading: boolean;
  displayedText: string | null;
  measurementRequest: HiddenMeasurementRequest | null;
  onAfterLayout: (event: LayoutChangeEvent) => void;
  onBeforeLayout: (event: LayoutChangeEvent) => void;
  onHiddenMeasurementLayout: (
    request: HiddenMeasurementRequest,
    event: LayoutChangeEvent
  ) => void;
  onVisibleContentLayout: (event: LayoutChangeEvent) => void;
  resolvedWidth: number | null;
  sizeAnimatedStyles: SizeAnimatedStyles;
  transientTextFrame: boolean;
};

const useButtonSizeBehavior = ({
  animateSize = true,
  animatedOpacity,
  after = null,
  before = null,
  children,
  extra = null,
  height,
  measurementSignature,
  paddingBottom,
  paddingTop,
  raiseLevel,
  reduceMotion = false,
  stretch,
  textTransition = false,
  width,
}: UseButtonSizeBehaviorParams): UseButtonSizeBehaviorResult => {
  const widthOwner = useButtonWidthOwner({
    animateSize,
    animatedOpacity,
    reduceMotion,
    stretch,
    width,
  });
  const heightDimensions = useMemo(
    () => getHeightDimensions(height, paddingTop, paddingBottom, raiseLevel),
    [height, paddingBottom, paddingTop, raiseLevel]
  );
  const heightOwner = useButtonHeightOwner({
    animateSize,
    dimensions: heightDimensions,
    reduceMotion,
    widthMode: widthOwner.widthMode,
  });
  const textCoordinator = useAutoWidthTextCoordinator({
    after,
    animatedOpacity,
    animateSize,
    before,
    children,
    extra,
    measurementSignature,
    reduceMotion,
    textTransition,
    widthCommands: widthOwner.commands,
    widthMode: widthOwner.widthMode,
  });
  const preservesFixedWidth =
    animateSize && !reduceMotion && widthOwner.widthMode === 'fixed';
  const usesAnimatedWidth =
    animateSize &&
    !reduceMotion &&
    widthOwner.widthMode !== 'stretch' &&
    widthOwner.isAnimating;
  const usesWidthOverride = preservesFixedWidth || usesAnimatedWidth;
  const preservesHeight = animateSize && !reduceMotion;
  const widthOverride = usesAnimatedWidth
    ? widthOwner.animatedWidth
    : widthOwner.resolvedWidth;
  const containerHeightOverride = heightOwner.isAnimating
    ? heightOwner.animatedContainerHeight
    : heightOwner.renderedDimensions.container;
  const faceHeightOverride = heightOwner.isAnimating
    ? heightOwner.animatedFaceHeight
    : heightOwner.renderedDimensions.face;
  const shadowHeightOverride = heightOwner.isAnimating
    ? heightOwner.animatedShadowHeight
    : heightOwner.renderedDimensions.shadow;
  const sizeAnimatedStyles = useMemo<SizeAnimatedStyles>(
    () => ({
      container:
        usesWidthOverride || preservesHeight
          ? {
              ...(usesWidthOverride ? { width: widthOverride } : null),
              ...(preservesHeight ? { height: containerHeightOverride } : null),
            }
          : null,
      shadow: preservesHeight ? { height: shadowHeightOverride } : null,
      bottom:
        usesWidthOverride || preservesHeight
          ? {
              ...(usesWidthOverride ? { width: widthOverride } : null),
              ...(preservesHeight ? { height: faceHeightOverride } : null),
            }
          : null,
      progress:
        usesWidthOverride || preservesHeight
          ? {
              ...(usesWidthOverride ? { width: widthOverride } : null),
              ...(preservesHeight ? { height: faceHeightOverride } : null),
            }
          : null,
      content:
        usesWidthOverride || preservesHeight
          ? {
              ...(usesWidthOverride ? { width: widthOverride } : null),
              ...(preservesHeight ? { height: faceHeightOverride } : null),
            }
          : null,
      activeBackground:
        usesWidthOverride || preservesHeight
          ? {
              ...(usesWidthOverride ? { width: widthOverride } : null),
              ...(preservesHeight ? { height: faceHeightOverride } : null),
            }
          : null,
    }),
    [
      containerHeightOverride,
      faceHeightOverride,
      preservesHeight,
      shadowHeightOverride,
      usesWidthOverride,
      widthOverride,
    ]
  );

  return {
    ...textCoordinator,
    resolvedWidth: widthOwner.resolvedWidth,
    sizeAnimatedStyles,
  };
};

export default useButtonSizeBehavior;
export { getAutoWidthTextFlow };

export const getHiddenMeasurementTextStyle = ({
  textColor,
  textFontFamily,
  textLineHeight,
  textSize,
}: {
  textColor?: ColorValue;
  textFontFamily?: string;
  textLineHeight?: number;
  textSize?: number;
}): StyleProp<TextStyle> => ({
  color: textColor,
  fontFamily: textFontFamily,
  fontSize: textSize,
  fontWeight: 'bold',
  lineHeight: textLineHeight,
  textAlign: 'center',
});

export const getHiddenMeasurementContainerStyle = ({
  borderWidth,
  contentGap,
  paddingBottom,
  paddingHorizontal,
  paddingTop,
}: {
  borderWidth: number;
  contentGap?: number;
  paddingBottom: number;
  paddingHorizontal: number;
  paddingTop: number;
}): StyleProp<ViewStyle> => ({
  alignSelf: 'flex-start',
  borderWidth,
  gap: contentGap,
  flexDirection: 'row',
  paddingBottom,
  paddingHorizontal,
  paddingTop,
});
