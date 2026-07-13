import { StyleSheet, ViewStyle } from 'react-native';
import type { ButtonWidth } from './types';

type DynamicStyles = {
  backgroundActive?: string;
  backgroundColor?: string;
  backgroundDarker?: string;
  backgroundPlaceholder?: string;
  backgroundProgress?: string;
  backgroundShadow?: string;
  borderColor?: string;
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
  raiseLevel: number;
  stretch?: boolean;
  textFontFamily?: string;
  textColor?: string;
  textLineHeight?: number;
  textSize?: number;
  width?: ButtonWidth;
  resolvedWidth?: number | null;
  resolvedContainerHeight?: number;
  resolvedFaceHeight?: number;
  resolvedShadowHeight?: number;
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
  paddingHorizontal,
  paddingTop,
  raiseLevel,
  resolvedWidth,
  resolvedContainerHeight,
  resolvedFaceHeight,
  resolvedShadowHeight,
  stretch,
  textColor,
  textFontFamily,
  textLineHeight,
  textSize,
  width,
}: DynamicStyles) => {
  const calcHeight =
    resolvedContainerHeight ?? height + paddingBottom + paddingTop;
  const calcWidth: ViewStyle['width'] = stretch
    ? '100%'
    : resolvedWidth ?? width ?? undefined;
  const faceHeight = resolvedFaceHeight ?? calcHeight - raiseLevel;
  const shadowHeight = resolvedShadowHeight ?? height - raiseLevel;
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
    height: faceHeight,
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
    },
    container__placeholder: {
      height: textLineHeight,
      backgroundColor: backgroundPlaceholder,
    },
    container__view: {
      paddingBottom,
      paddingTop,
      paddingHorizontal,
    },
    shadow: {
      bottom: -raiseLevel / 2,
      height: shadowHeight,
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
  container: {
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  container__inner: {
    width: '100%',
    height: '100%',
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
  shadow__host: {
    position: 'absolute',
    left: '1%',
    width: '98%',
  },
  shadow__inner: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
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
  content__inner: {
    width: '100%',
    height: '100%',
  },
  activeBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  activeBackground__hidden: {
    opacity: 0,
  },
  text: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    overflow: 'hidden',
  },
});
