import React, { useMemo, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  I18nManager,
  Text,
  View,
  type ColorValue,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Placeholder from '../Placeholder';
import { getStyles, styles } from '../styles';
import {
  getHiddenMeasurementContainerStyle,
  getHiddenMeasurementTextStyle,
  type SizeAnimatedStyles,
} from '../useButtonSizeBehavior';

type ButtonVisualLayersProps = {
  activity: boolean;
  activityColor: ColorValue;
  activityOpacity: Animated.Value;
  after: ReactNode;
  animatedActive: Animated.Value;
  animatedLoading: Animated.Value;
  animatedOpacity: Animated.Value;
  animatedPlaceholder: boolean;
  animatedValue: Animated.Value;
  backgroundActive: ColorValue;
  backgroundColor: ColorValue;
  backgroundDarker: ColorValue;
  backgroundPlaceholder: ColorValue;
  backgroundProgress: ColorValue;
  backgroundShadow: ColorValue;
  before: ReactNode;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
  borderColor?: ColorValue;
  borderRadius: number;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderWidth: number;
  children: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  contentGap?: number;
  displayedText: string | null;
  extra: ReactNode;
  hasPrimitiveTextChild: boolean;
  hasRenderableChildren: boolean;
  height: number;
  hiddenMeasurementKey: string | null;
  hiddenMeasurementText: string | null;
  loadingOpacity: Animated.Value;
  onHiddenMeasurementLayout: (event: LayoutChangeEvent) => void;
  onVisibleContentLayout: (event: LayoutChangeEvent) => void;
  paddingBottom: number;
  paddingHorizontal: number;
  paddingTop: number;
  progress: boolean;
  raiseAmount: number;
  reduceMotion: boolean;
  resolvedWidth: number | null;
  showProgressBar: boolean;
  sizeAnimatedStyles: SizeAnimatedStyles;
  stretch: boolean;
  style?: StyleProp<ViewStyle>;
  textColor: ColorValue;
  textFontFamily?: string;
  textLineHeight: number;
  textOpacity: Animated.Value;
  textSize: number;
  width: number | null;
};

const ButtonVisualLayers = ({
  activity,
  activityColor,
  activityOpacity,
  after,
  animatedActive,
  animatedLoading,
  animatedOpacity,
  animatedPlaceholder,
  animatedValue,
  backgroundActive,
  backgroundColor,
  backgroundDarker,
  backgroundPlaceholder,
  backgroundProgress,
  backgroundShadow,
  before,
  borderBottomLeftRadius,
  borderBottomRightRadius,
  borderColor,
  borderRadius,
  borderTopLeftRadius,
  borderTopRightRadius,
  borderWidth,
  children,
  containerStyle,
  contentGap,
  displayedText,
  extra,
  hasPrimitiveTextChild,
  hasRenderableChildren,
  height,
  hiddenMeasurementKey,
  hiddenMeasurementText,
  loadingOpacity,
  onHiddenMeasurementLayout,
  onVisibleContentLayout,
  paddingBottom,
  paddingHorizontal,
  paddingTop,
  progress,
  raiseAmount,
  reduceMotion,
  resolvedWidth,
  showProgressBar,
  sizeAnimatedStyles,
  stretch,
  style,
  textColor,
  textFontFamily,
  textLineHeight,
  textOpacity,
  textSize,
  width,
}: ButtonVisualLayersProps) => {
  const dynamicStyles = useMemo(
    () =>
      getStyles({
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
        contentGap,
        height,
        paddingBottom,
        paddingHorizontal,
        paddingTop,
        raiseLevel: raiseAmount,
        stateWidth: width === null && stretch !== true ? resolvedWidth : null,
        stretch,
        textColor,
        textFontFamily,
        textLineHeight,
        textSize,
        width,
      }),
    [
      backgroundActive,
      backgroundColor,
      backgroundDarker,
      backgroundPlaceholder,
      backgroundProgress,
      backgroundShadow,
      borderBottomLeftRadius,
      borderBottomRightRadius,
      borderColor,
      borderRadius,
      borderTopLeftRadius,
      borderTopRightRadius,
      borderWidth,
      contentGap,
      height,
      paddingBottom,
      paddingHorizontal,
      paddingTop,
      raiseAmount,
      resolvedWidth,
      stretch,
      textColor,
      textFontFamily,
      textLineHeight,
      textSize,
      width,
    ]
  );
  const animatedValues = useMemo(() => {
    const offsetWidth = resolvedWidth
      ? resolvedWidth * (I18nManager.isRTL ? 1 : -1)
      : 0;

    return {
      animatedActivity: {
        opacity: activityOpacity,
        transform: [{ scale: activityOpacity }],
      },
      animatedActive: { opacity: animatedActive },
      animatedContainer: { opacity: animatedOpacity },
      animatedContent: {
        transform: [
          {
            translateY: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0, raiseAmount],
            }),
          },
        ],
      },
      animatedProgress: {
        opacity: loadingOpacity,
        transform: [
          {
            translateX: animatedLoading.interpolate({
              inputRange: [0, 1],
              outputRange: [offsetWidth, 0],
            }),
          },
        ],
      },
      animatedShadow: {
        transform: [
          {
            translateY: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -raiseAmount / 2],
            }),
          },
        ],
      },
    };
  }, [
    activityOpacity,
    animatedActive,
    animatedLoading,
    animatedOpacity,
    animatedValue,
    loadingOpacity,
    raiseAmount,
    resolvedWidth,
  ]);
  const animatedTextStyle = useMemo(
    () => ({
      opacity: textOpacity,
      transform: [{ scale: textOpacity }],
    }),
    [textOpacity]
  );
  const hiddenMeasurementContainerStyle = useMemo(
    () =>
      getHiddenMeasurementContainerStyle({
        borderWidth,
        paddingBottom,
        paddingHorizontal,
        paddingTop,
      }),
    [borderWidth, paddingBottom, paddingHorizontal, paddingTop]
  );
  const hiddenMeasurementTextStyle = useMemo(
    () =>
      getHiddenMeasurementTextStyle({
        textColor,
        textFontFamily,
        textLineHeight,
        textSize,
      }),
    [textColor, textFontFamily, textLineHeight, textSize]
  );
  const renderActivity = useMemo(() => {
    if (!activity) return null;

    return (
      <>
        {showProgressBar ? (
          <Animated.View
            testID="aws-btn-progress"
            style={[
              styles.progress,
              dynamicStyles.progress,
              animatedValues.animatedProgress,
            ]}
          />
        ) : null}
        <Animated.View
          testID="aws-btn-activity-indicator"
          style={[styles.container__activity, animatedValues.animatedActivity]}
        >
          <ActivityIndicator color={activityColor} />
        </Animated.View>
      </>
    );
  }, [
    activity,
    activityColor,
    animatedValues.animatedActivity,
    animatedValues.animatedProgress,
    dynamicStyles.progress,
    showProgressBar,
  ]);
  const renderContent = useMemo(() => {
    if (!hasRenderableChildren) {
      return (
        <Placeholder
          animated={animatedPlaceholder && !reduceMotion}
          style={dynamicStyles.container__placeholder}
        />
      );
    }

    const content = hasPrimitiveTextChild ? (
      <Text
        testID="aws-btn-content-text"
        style={[styles.container__text, dynamicStyles.container__text]}
        allowFontScaling
      >
        {typeof children === 'string' ? displayedText ?? children : children}
      </Text>
    ) : (
      children
    );

    return (
      <Animated.View
        style={[
          styles.container__view,
          dynamicStyles.container__view,
          animatedTextStyle,
        ]}
      >
        {before}
        {content}
        {after}
      </Animated.View>
    );
  }, [
    after,
    animatedPlaceholder,
    animatedTextStyle,
    before,
    children,
    displayedText,
    dynamicStyles.container__placeholder,
    dynamicStyles.container__text,
    dynamicStyles.container__view,
    hasPrimitiveTextChild,
    hasRenderableChildren,
    reduceMotion,
  ]);
  const suppressProgressDarkening = progress && activity && !showProgressBar;

  return (
    <Animated.View
      testID="aws-btn-content-2"
      style={[
        styles.container,
        dynamicStyles.container,
        animatedValues.animatedContainer,
        sizeAnimatedStyles.container,
        style,
        containerStyle,
      ]}
    >
      <Animated.View
        testID="aws-btn-shadow"
        style={[
          styles.shadow,
          dynamicStyles.shadow,
          animatedValues.animatedShadow,
          sizeAnimatedStyles.shadow,
        ]}
      />
      <View
        testID="aws-btn-bottom"
        style={[styles.bottom, dynamicStyles.bottom, sizeAnimatedStyles.bottom]}
      />
      <Animated.View
        testID="aws-btn-content"
        style={[
          styles.content,
          dynamicStyles.content,
          animatedValues.animatedContent,
          sizeAnimatedStyles.content,
        ]}
      >
        <View
          testID="aws-btn-text"
          style={[styles.text, dynamicStyles.text]}
          onLayout={onVisibleContentLayout}
        >
          {extra}
          <Animated.View
            testID="aws-btn-active-background"
            style={[
              styles.activeBackground,
              dynamicStyles.activeBackground,
              animatedValues.animatedActive,
              sizeAnimatedStyles.activeBackground,
              suppressProgressDarkening
                ? styles.activeBackgroundSuppressed
                : null,
            ]}
          />
          {renderContent}
          {renderActivity}
        </View>
      </Animated.View>
      {hiddenMeasurementText !== null ? (
        <View
          key={hiddenMeasurementKey ?? undefined}
          testID="aws-btn-hidden-measure"
          pointerEvents="none"
          style={hiddenMeasurementContainerStyle}
          onLayout={onHiddenMeasurementLayout}
        >
          <Text
            testID="aws-btn-hidden-measure-text"
            style={hiddenMeasurementTextStyle}
          >
            {hiddenMeasurementText}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
};

export default ButtonVisualLayers;
