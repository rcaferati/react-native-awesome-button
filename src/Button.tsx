import React, { useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  PressableProps,
  Text,
  View,
} from 'react-native';
import { getStyles, styles } from './styles';
import usePressProgressController from './usePressProgressController';
import useButtonSizeBehavior, {
  getHiddenMeasurementContainerStyle,
  getHiddenMeasurementTextStyle,
} from './useButtonSizeBehavior';
import {
  ANIMATED_TIMING_LOADING,
  DEFAULT_ACTIVITY_COLOR,
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
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_SIZE,
  DEFAULT_WIDTH,
} from './constants';
import Placeholder from './Placeholder';
import type { AwesomeButtonProps } from './types';

/**
 * @deprecated Use AwesomeButtonProps instead.
 */
export type ButtonTypes = AwesomeButtonProps;

const getMergedAccessibilityState = (
  accessibilityState: PressableProps['accessibilityState'],
  {
    busy,
    disabled,
  }: {
    busy: boolean;
    disabled: boolean;
  }
) => {
  const nextState = {
    ...accessibilityState,
  };

  if (disabled || nextState.disabled !== undefined) {
    nextState.disabled = Boolean(disabled || nextState.disabled);
  }

  if (busy || nextState.busy !== undefined) {
    nextState.busy = Boolean(busy || nextState.busy);
  }

  return Object.keys(nextState).length > 0 ? nextState : undefined;
};

const AwesomeButton = ({
  activityColor = DEFAULT_ACTIVITY_COLOR,
  activeOpacity = DEFAULT_ACTIVE_OPACITY,
  animatedPlaceholder = true,
  animateSize = true,
  backgroundActive = DEFAULT_BACKGROUND_ACTIVE,
  backgroundColor = DEFAULT_BACKGROUND_COLOR,
  backgroundDarker = DEFAULT_BACKGROUND_DARKER,
  backgroundPlaceholder = DEFAULT_BACKGROUND_SHADOW,
  backgroundProgress = DEFAULT_BACKGROUND_SHADOW,
  backgroundShadow = DEFAULT_BACKGROUND_SHADOW,
  borderColor,
  borderRadius = DEFAULT_BORDER_RADIUS,
  borderBottomLeftRadius,
  borderBottomRightRadius,
  borderTopLeftRadius,
  borderTopRightRadius,
  borderWidth = DEFAULT_BORDER_WIDTH,
  children = null,
  before = null,
  after = null,
  disabled = false,
  height = DEFAULT_HEIGHT,
  hitSlop,
  debouncedPressTime = DEFAULT_DEBOUNCED_PRESS_TIME,
  paddingHorizontal = DEFAULT_HORIZONTAL_PADDING,
  onPress = () => undefined,
  onPressIn = () => undefined,
  onPressedIn = () => undefined,
  onPressOut = () => undefined,
  onPressedOut = () => undefined,
  onProgressStart = () => undefined,
  onProgressEnd = () => undefined,
  onLongPress,
  dangerouslySetPressableProps = {},
  progress = false,
  showProgressBar = true,
  paddingBottom = 0,
  paddingTop = 0,
  progressLoadingTime = ANIMATED_TIMING_LOADING,
  raiseLevel = DEFAULT_RAISE_LEVEL,
  springRelease = true,
  stretch = false,
  style,
  textColor = DEFAULT_TEXT_COLOR,
  textLineHeight = DEFAULT_LINE_HEIGHT,
  textSize = DEFAULT_TEXT_SIZE,
  textTransition = false,
  textFontFamily,
  width: rawWidth = DEFAULT_WIDTH,
  extra = null,
}: AwesomeButtonProps) => {
  const width = rawWidth === 'auto' ? null : rawWidth;
  const loadingOpacity = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const activityOpacity = useRef(new Animated.Value(0)).current;
  const animatedActive = useRef(new Animated.Value(0)).current;
  const animatedValue = useRef(new Animated.Value(0)).current;
  const animatedLoading = useRef(new Animated.Value(0)).current;
  const animatedOpacity = useRef(
    new Animated.Value(width === null && stretch !== true ? 0 : 1)
  ).current;
  const {
    displayedText,
    hiddenMeasurementKey,
    hiddenMeasurementText,
    onHiddenMeasurementLayout,
    onVisibleContentLayout,
    resolvedWidth,
    sizeAnimatedStyles,
  } = useButtonSizeBehavior({
    after,
    animatedOpacity,
    animateSize,
    before,
    children,
    extra,
    height,
    paddingBottom,
    paddingTop,
    raiseLevel,
    stretch,
    textTransition,
    width,
  });
  const { activity, handlePress, handlePressIn, handlePressOut } =
    usePressProgressController({
      activeOpacity,
      animatedActive,
      animatedLoading,
      animatedOpacity,
      animatedValue,
      activityOpacity,
      disabled,
      hasChildren: Boolean(children),
      loadingOpacity,
      onPress,
      onPressIn,
      onPressOut,
      onPressedIn,
      onPressedOut,
      onProgressEnd,
      onProgressStart,
      progress,
      progressLoadingTime,
      springRelease,
      textOpacity,
      debouncedPressTime,
    });

  const {
    accessibilityRole: dangerousAccessibilityRole,
    accessibilityState: dangerousAccessibilityState,
    children: _ignoredDangerousChildren,
    hitSlop: dangerousHitSlop,
    onLongPress: _ignoredDangerousOnLongPress,
    onPress: _ignoredDangerousOnPress,
    onPressIn: _ignoredDangerousOnPressIn,
    onPressOut: _ignoredDangerousOnPressOut,
    ...safePressableProps
  } = dangerouslySetPressableProps as PressableProps & {
    children?: React.ReactNode;
  };
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
        height,
        paddingBottom,
        paddingHorizontal,
        paddingTop,
        raiseLevel,
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
      stretch,
      textColor,
      textFontFamily,
      textLineHeight,
      textSize,
      width,
    ]
  );

  const animatedValues = useMemo(() => {
    const offsetWidth = resolvedWidth ? resolvedWidth * -1 : 0;

    return {
      animatedActivity: {
        opacity: activityOpacity,
        transform: [
          {
            scale: activityOpacity,
          },
        ],
      },
      animatedActive: {
        opacity: animatedActive,
      },
      animatedContainer: {
        opacity: animatedOpacity,
      },
      animatedContent: {
        transform: [
          {
            translateY: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0, raiseLevel],
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
              outputRange: [0, -raiseLevel / 2],
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
    resolvedWidth,
    raiseLevel,
  ]);

  const renderActivity = useMemo(() => {
    if (activity === false) {
      return null;
    }

    return (
      <>
        {showProgressBar === true ? (
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

  const animatedStyles = useMemo(
    () => ({
      opacity: textOpacity,
      transform: [
        {
          scale: textOpacity,
        },
      ],
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

  const renderContent = useMemo(() => {
    if (!children) {
      return (
        <Placeholder
          animated={animatedPlaceholder}
          style={dynamicStyles.container__placeholder}
        />
      );
    }

    const content =
      typeof children === 'string' ? (
        <Text
          testID="aws-btn-content-text"
          style={[styles.container__text, dynamicStyles.container__text]}
        >
          {displayedText ?? children}
        </Text>
      ) : (
        children
      );

    return (
      <Animated.View
        style={[
          styles.container__view,
          dynamicStyles.container__view,
          animatedStyles,
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
    animatedStyles,
    before,
    children,
    displayedText,
    dynamicStyles.container__placeholder,
    dynamicStyles.container__text,
    dynamicStyles.container__view,
  ]);

  const pressableHitSlop = hitSlop ?? dangerousHitSlop;
  const accessibilityRole = dangerousAccessibilityRole ?? 'button';
  const suppressProgressDarkening =
    progress === true && activity === true && showProgressBar === false;
  const accessibilityState = useMemo(
    () =>
      getMergedAccessibilityState(dangerousAccessibilityState, {
        busy: activity,
        disabled,
      }),
    [activity, dangerousAccessibilityState, disabled]
  );

  return (
    <Pressable
      testID="aws-btn-content-view"
      {...safePressableProps}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      hitSlop={pressableHitSlop}
      onLongPress={onLongPress}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        testID="aws-btn-content-2"
        style={[
          styles.container,
          dynamicStyles.container,
          animatedValues.animatedContainer,
          sizeAnimatedStyles.container,
          style,
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
          style={[
            styles.bottom,
            dynamicStyles.bottom,
            sizeAnimatedStyles.bottom,
          ]}
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
                suppressProgressDarkening ? { opacity: 0 } : null,
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
    </Pressable>
  );
};

export default AwesomeButton;
