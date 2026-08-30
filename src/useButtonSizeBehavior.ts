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
  paddingBottom: number;
  paddingTop: number;
  raiseLevel: number;
  reduceMotion?: boolean;
  stretch?: boolean;
  textTransition?: boolean;
  width: ButtonWidth;
};

type UseButtonSizeBehaviorResult = {
  displayedText: string | null;
  hiddenMeasurementKey: string | null;
  hiddenMeasurementText: string | null;
  onHiddenMeasurementLayout: (event: LayoutChangeEvent) => void;
  onVisibleContentLayout: (event: LayoutChangeEvent) => void;
  resolvedWidth: number | null;
  sizeAnimatedStyles: SizeAnimatedStyles;
};

const useButtonSizeBehavior = ({
  animateSize = true,
  animatedOpacity,
  after = null,
  before = null,
  children,
  extra = null,
  height,
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
    reduceMotion,
    textTransition,
    widthCommands: widthOwner.commands,
    widthMode: widthOwner.widthMode,
  });
  const sizeAnimatedStyles = useMemo<SizeAnimatedStyles>(
    () => ({
      container:
        widthOwner.isAnimating || heightOwner.isAnimating
          ? {
              ...(widthOwner.isAnimating && widthOwner.widthMode !== 'stretch'
                ? { width: widthOwner.animatedWidth }
                : null),
              ...(heightOwner.isAnimating
                ? { height: heightOwner.animatedContainerHeight }
                : null),
            }
          : null,
      shadow: heightOwner.isAnimating
        ? { height: heightOwner.animatedShadowHeight }
        : null,
      bottom:
        widthOwner.isAnimating || heightOwner.isAnimating
          ? {
              ...(widthOwner.isAnimating && widthOwner.widthMode !== 'stretch'
                ? { width: widthOwner.animatedWidth }
                : null),
              ...(heightOwner.isAnimating
                ? { height: heightOwner.animatedFaceHeight }
                : null),
            }
          : null,
      progress:
        widthOwner.isAnimating || heightOwner.isAnimating
          ? {
              ...(widthOwner.isAnimating && widthOwner.widthMode !== 'stretch'
                ? { width: widthOwner.animatedWidth }
                : null),
              ...(heightOwner.isAnimating
                ? { height: heightOwner.animatedFaceHeight }
                : null),
            }
          : null,
      content:
        widthOwner.isAnimating || heightOwner.isAnimating
          ? {
              ...(widthOwner.isAnimating && widthOwner.widthMode !== 'stretch'
                ? { width: widthOwner.animatedWidth }
                : null),
              ...(heightOwner.isAnimating
                ? { height: heightOwner.animatedFaceHeight }
                : null),
            }
          : null,
      activeBackground:
        widthOwner.isAnimating || heightOwner.isAnimating
          ? {
              ...(widthOwner.isAnimating && widthOwner.widthMode !== 'stretch'
                ? { width: widthOwner.animatedWidth }
                : null),
              ...(heightOwner.isAnimating
                ? { height: heightOwner.animatedFaceHeight }
                : null),
            }
          : null,
    }),
    [
      heightOwner.animatedContainerHeight,
      heightOwner.animatedFaceHeight,
      heightOwner.animatedShadowHeight,
      heightOwner.isAnimating,
      widthOwner.animatedWidth,
      widthOwner.isAnimating,
      widthOwner.widthMode,
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
  paddingBottom,
  paddingHorizontal,
  paddingTop,
}: {
  borderWidth: number;
  paddingBottom: number;
  paddingHorizontal: number;
  paddingTop: number;
}): StyleProp<ViewStyle> => ({
  alignSelf: 'flex-start',
  borderWidth,
  flexDirection: 'row',
  paddingBottom,
  paddingHorizontal,
  paddingTop,
});
