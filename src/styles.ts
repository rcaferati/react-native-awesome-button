import { StyleSheet, type ColorValue, type ViewStyle } from 'react-native';
import type { ButtonWidth } from './types';

type DynamicStyles = {
  backgroundActive?: ColorValue;
  backgroundColor?: ColorValue;
  backgroundDarker?: ColorValue;
  backgroundPlaceholder?: ColorValue;
  backgroundProgress?: ColorValue;
  backgroundShadow?: ColorValue;
  borderColor?: ColorValue;
  borderRadius?: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderWidth?: number;
  height: number;
  paddingHorizontal: number;
  paddingTop: number;
  paddingBottom: number;
  contentGap?: number;
  raiseLevel: number;
  stretch?: boolean;
  textFontFamily?: string;
  textColor?: ColorValue;
  textLineHeight?: number;
  textSize?: number;
  width?: ButtonWidth;
  stateWidth?: number | null;
};

export const getStyles = ({
  backgroundActive,
  backgroundColor,
  backgroundDarker,
  backgroundPlaceholder,
  backgroundProgress,
  backgroundShadow,
  borderColor,
  borderRadius,
  borderBottomLeftRadius,
  borderBottomRightRadius,
  borderTopLeftRadius,
  borderTopRightRadius,
  borderWidth,
  height,
  paddingBottom,
  contentGap,
  paddingHorizontal,
  paddingTop,
  raiseLevel,
  stateWidth,
  stretch,
  textColor,
  textFontFamily,
  textLineHeight,
  textSize,
  width,
}: DynamicStyles) => {
  const calcHeight = height + paddingBottom + paddingTop;
  const calcWidth: ViewStyle['width'] = stretch
    ? '100%'
    : width ?? stateWidth ?? undefined;
  const borderRadiusObject: Pick<
    ViewStyle,
    | 'borderRadius'
    | 'borderBottomLeftRadius'
    | 'borderBottomRightRadius'
    | 'borderTopLeftRadius'
    | 'borderTopRightRadius'
  > = {
    borderRadius,
    borderBottomLeftRadius,
    borderBottomRightRadius,
    borderTopLeftRadius,
    borderTopRightRadius,
  };

  const dimensionsDiff: Pick<ViewStyle, 'width' | 'height'> = {
    width: calcWidth,
    height: calcHeight - raiseLevel,
  };

  const value = {
    container: {
      height: calcHeight,
      width: calcWidth,
    },
    container__text: {
      color: textColor,
      fontSize: textSize,
      fontFamily: textFontFamily,
      lineHeight: textLineHeight,
    },
    container__placeholder: {
      height: textLineHeight,
      backgroundColor: backgroundPlaceholder,
    },
    container__view: {
      paddingBottom,
      paddingTop,
      paddingHorizontal,
      gap: contentGap,
    },
    shadow: {
      bottom: -raiseLevel / 2,
      height: height - raiseLevel,
      ...borderRadiusObject,
      backgroundColor: backgroundShadow,
    },
    bottom: {
      ...borderRadiusObject,
      backgroundColor: backgroundDarker,
      ...dimensionsDiff,
    },
    progress: {
      ...dimensionsDiff,
      backgroundColor: backgroundProgress,
    },
    content: {
      ...dimensionsDiff,
      ...borderRadiusObject,
    },
    activeBackground: {
      ...dimensionsDiff,
      backgroundColor: backgroundActive,
    },
    text: {
      borderColor,
      borderWidth,
      ...borderRadiusObject,
      backgroundColor,
    },
  };

  return value;
};

export const styles = StyleSheet.create({
  stretchTarget: {
    width: '100%',
  },
  minimumTarget: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBackgroundSuppressed: {
    opacity: 0,
  },
  hiddenMeasurementViewport: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
  motionLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  container__text: {
    fontWeight: 'bold',
    zIndex: 10,
    textAlign: 'center',
  },
  container__view: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container__viewLogicalLeading: {
    justifyContent: 'flex-start',
  },
  container__placeholder: {
    width: '55%',
    overflow: 'hidden',
  },
  container__placeholder__bar: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    width: '100%',
  },
  container__activity: {
    position: 'absolute',
    zIndex: 5,
  },
  shadow: {
    width: '98%',
    position: 'absolute',
    left: '1%',
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  progress: {
    zIndex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  activeBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  text: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    overflow: 'hidden',
  },
});
