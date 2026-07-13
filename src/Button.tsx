import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Pressable, PressableProps } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SharedAutoWidthMeasurementHost } from './autoWidthMeasurement';
import {
  clampPressProgress,
  PRESS_IN_TIMING_CONFIG,
  PRESS_RELEASE_SPRING_CONFIG,
  PRESS_RELEASE_TIMING_CONFIG,
} from './pressMotion';
import { getStyles, styles } from './styles';
import usePressProgressController from './usePressProgressController';
import useButtonSizeBehavior from './useButtonSizeBehavior';
import {
  ANIMATED_ELASTIC_DURATION,
  ANIMATED_TIMING_LOADING,
  ANIMATED_TIMING_IN,
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

type ButtonColorPalette = {
  backgroundActive: string;
  backgroundColor: string;
  backgroundDarker: string;
  backgroundPlaceholder: string;
  backgroundProgress: string;
  backgroundShadow: string;
  borderColor?: string;
  textColor: string;
};

const areColorPalettesEqual = (
  left: ButtonColorPalette,
  right: ButtonColorPalette
) =>
  left.backgroundActive === right.backgroundActive &&
  left.backgroundColor === right.backgroundColor &&
  left.backgroundDarker === right.backgroundDarker &&
  left.backgroundPlaceholder === right.backgroundPlaceholder &&
  left.backgroundProgress === right.backgroundProgress &&
  left.backgroundShadow === right.backgroundShadow &&
  left.borderColor === right.borderColor &&
  left.textColor === right.textColor;

const interpolatePaletteColor = (
  progress: number,
  fromColor?: string,
  toColor?: string
) => {
  'worklet';

  if (typeof toColor !== 'string') {
    return toColor;
  }

  if (typeof fromColor !== 'string' || fromColor === toColor) {
    return toColor;
  }

  return interpolateColor(progress, [0, 1], [fromColor, toColor]);
};

const logButtonDebug = (
  instanceId: string,
  message: string,
  payload?: Record<string, unknown> | undefined
) => {
  if (__DEV__) {
    console.log('[aws-btn-view]', instanceId, message, payload ?? {});
  }
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
  onPress,
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
  const hasChildren = Boolean(children);
  const debugInstanceIdRef = useRef(
    `btn-${Math.random().toString(36).slice(2, 8)}`
  );
  const debugLabel = useMemo(() => {
    if (typeof children === 'string' && children.length > 0) {
      return children;
    }

    if (progress === true && showProgressBar === false) {
      return 'progress-spinner-only';
    }

    if (progress === true) {
      return 'progress-button';
    }

    if (children === null) {
      return 'placeholder-button';
    }

    return 'custom-content-button';
  }, [children, progress, showProgressBar]);
  const animatedOpacity = useSharedValue(
    width === null && stretch !== true ? 0 : 1
  );
  const colorTransitionProgress = useSharedValue(1);
  const pressProgress = useSharedValue(0);
  const pressOpacity = useSharedValue(1);
  const handleSpringReleaseCompleteRef = useRef<(releaseToken: number) => void>(
    () => undefined
  );
  const targetColorPalette = useMemo<ButtonColorPalette>(
    () => ({
      backgroundActive,
      backgroundColor,
      backgroundDarker,
      backgroundPlaceholder,
      backgroundProgress,
      backgroundShadow,
      borderColor,
      textColor,
    }),
    [
      backgroundActive,
      backgroundColor,
      backgroundDarker,
      backgroundPlaceholder,
      backgroundProgress,
      backgroundShadow,
      borderColor,
      textColor,
    ]
  );
  const colorPaletteRef = useRef<ButtonColorPalette>(targetColorPalette);
  const [colorTransition, setColorTransition] = useState(() => ({
    from: targetColorPalette,
    to: targetColorPalette,
  }));

  useLayoutEffect(() => {
    const previousPalette = colorPaletteRef.current;

    if (areColorPalettesEqual(previousPalette, targetColorPalette)) {
      return;
    }

    colorPaletteRef.current = targetColorPalette;
    setColorTransition({
      from: previousPalette,
      to: targetColorPalette,
    });
    colorTransitionProgress.value = 0;
    colorTransitionProgress.value = withTiming(1, {
      duration: ANIMATED_TIMING_IN,
      easing: Easing.out(Easing.cubic),
    });
  }, [colorTransitionProgress, targetColorPalette]);
  const {
    displayedText,
    measurementHostEnabled,
    onVisibleContentLayout,
    resolvedHeightDimensions,
    resolvedWidth,
    sizeAnimatedStyles,
  } = useButtonSizeBehavior({
    after,
    animatedOpacity,
    animateSize,
    before,
    borderWidth,
    children,
    extra,
    height,
    paddingBottom,
    paddingHorizontal,
    paddingTop,
    raiseLevel,
    stretch,
    textColor,
    textFontFamily,
    textLineHeight,
    textSize,
    textTransition,
    width,
  });
  const notifySpringReleaseComplete = useCallback((releaseToken: number) => {
    handleSpringReleaseCompleteRef.current(releaseToken);
  }, []);
  const startPressVisual = useCallback(
    ({ progress: isProgress }: { progress: boolean }) => {
      logButtonDebug(debugInstanceIdRef.current, 'startPressVisual', {
        label: debugLabel,
        progress: isProgress,
        activeOpacity,
        raiseLevel,
      });
      cancelAnimation(pressProgress);
      cancelAnimation(pressOpacity);
      pressProgress.value = withTiming(1, PRESS_IN_TIMING_CONFIG);
      pressOpacity.value = withTiming(
        isProgress === true ? 1 : activeOpacity,
        PRESS_IN_TIMING_CONFIG
      );
    },
    [activeOpacity, debugLabel, pressOpacity, pressProgress, raiseLevel]
  );
  const startReleaseVisual = useCallback(
    ({
      releaseToken,
      springRelease: shouldSpringRelease,
    }: {
      releaseToken: number;
      springRelease: boolean;
    }) => {
      logButtonDebug(debugInstanceIdRef.current, 'startReleaseVisual', {
        label: debugLabel,
        releaseToken,
        springRelease: shouldSpringRelease,
      });
      cancelAnimation(pressProgress);
      cancelAnimation(pressOpacity);
      pressOpacity.value = withTiming(1, PRESS_RELEASE_TIMING_CONFIG);

      if (shouldSpringRelease === true) {
        pressProgress.value = withSpring(
          0,
          PRESS_RELEASE_SPRING_CONFIG,
          (finished) => {
            'worklet';

            if (finished === true) {
              runOnJS(notifySpringReleaseComplete)(releaseToken);
            }
          }
        );
        return;
      }

      pressProgress.value = withTiming(0, PRESS_RELEASE_TIMING_CONFIG);
    },
    [debugLabel, notifySpringReleaseComplete, pressOpacity, pressProgress]
  );
  const resetPressVisual = useCallback(() => {
    logButtonDebug(debugInstanceIdRef.current, 'resetPressVisual', {
      label: debugLabel,
    });
    cancelAnimation(pressProgress);
    cancelAnimation(pressOpacity);
    pressProgress.value = 0;
    pressOpacity.value = 1;
  }, [debugLabel, pressOpacity, pressProgress]);
  const pressController = usePressProgressController({
    activeOpacity,
    disabled,
    hasChildren,
    onPress,
    onPressIn,
    onPressedIn,
    onPressOut,
    onPressedOut,
    onProgressEnd,
    onProgressStart,
    progress,
    progressLoadingTime,
    springRelease,
    debouncedPressTime,
    onPressVisualStart: startPressVisual,
    onPressVisualReset: resetPressVisual,
    onReleaseVisualStart: startReleaseVisual,
  });
  const {
    activity,
    activityVisible = false,
    contentVisible = true,
    handlePress,
    handlePressIn,
    handlePressOut,
    handleSpringReleaseComplete,
    progressTravelDurationMs = progressLoadingTime,
    progressTravelTarget = 0,
    progressVisible = false,
    releaseSpringActive = false,
    releaseSpringToken = 0,
    visualPressed = false,
  } = pressController;
  handleSpringReleaseCompleteRef.current = handleSpringReleaseComplete;
  const debugLog = useCallback(
    (message: string, payload?: Record<string, unknown>) => {
      logButtonDebug(debugInstanceIdRef.current, message, {
        label: debugLabel,
        progress,
        progressVisible,
        progressTravelDurationMs,
        progressTravelTarget,
        contentVisible,
        activityVisible,
        releaseSpringActive,
        releaseSpringToken,
        showProgressBar,
        disabled,
        activity,
        visualPressed,
        raiseLevel,
        resolvedWidth,
        resolvedContainerHeight: resolvedHeightDimensions.container,
        resolvedFaceHeight: resolvedHeightDimensions.face,
        resolvedShadowHeight: resolvedHeightDimensions.shadow,
        ...(payload ?? {}),
      });
    },
    [
      activity,
      activityVisible,
      contentVisible,
      debugLabel,
      disabled,
      progress,
      progressTravelDurationMs,
      progressTravelTarget,
      progressVisible,
      raiseLevel,
      releaseSpringActive,
      releaseSpringToken,
      resolvedHeightDimensions.container,
      resolvedHeightDimensions.face,
      resolvedHeightDimensions.shadow,
      resolvedWidth,
      showProgressBar,
      visualPressed,
    ]
  );

  useEffect(() => {
    debugLog('render-state-change');
  }, [debugLog]);

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
        resolvedWidth: stretch !== true ? resolvedWidth : null,
        resolvedContainerHeight: resolvedHeightDimensions.container,
        resolvedFaceHeight: resolvedHeightDimensions.face,
        resolvedShadowHeight: resolvedHeightDimensions.shadow,
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
      resolvedHeightDimensions.container,
      resolvedHeightDimensions.face,
      resolvedHeightDimensions.shadow,
      resolvedWidth,
      stretch,
      textColor,
      textFontFamily,
      textLineHeight,
      textSize,
      width,
    ]
  );

  const offsetWidth = resolvedWidth ? resolvedWidth * -1 : 0;
  const contentOpacityTarget = contentVisible === true ? 1 : 0;
  const contentScaleTarget = contentVisible === true ? 1 : 0;
  const activityOpacityTarget = activityVisible === true ? 1 : 0;
  const activityScaleTarget = activityVisible === true ? 1 : 0;
  const progressOpacityTarget = progressVisible === true ? 1 : 0;
  const progressTranslateX = offsetWidth * (1 - progressTravelTarget);
  const animatedSizeOpacityStyle = useAnimatedStyle(
    () => ({
      opacity: animatedOpacity.value,
    }),
    []
  );
  const animatedPressedOpacityStyle = useAnimatedStyle(
    () => ({
      opacity: pressOpacity.value,
    }),
    []
  );
  const animatedPressFaceStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          translateY: interpolate(pressProgress.value, [0, 1], [0, raiseLevel]),
        },
      ],
    }),
    [raiseLevel]
  );
  const animatedPressShadowStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          translateY: interpolate(
            pressProgress.value,
            [0, 1],
            [0, -raiseLevel / 2]
          ),
        },
      ],
    }),
    [raiseLevel]
  );
  const animatedPressActiveStyle = useAnimatedStyle(() => ({
    opacity: clampPressProgress(pressProgress.value),
  }));
  const animatedPlaceholderColorStyle = useAnimatedStyle(
    () => ({
      backgroundColor: interpolatePaletteColor(
        colorTransitionProgress.value,
        colorTransition.from.backgroundPlaceholder,
        colorTransition.to.backgroundPlaceholder
      ),
    }),
    [colorTransition]
  );
  const animatedShadowColorStyle = useAnimatedStyle(
    () => ({
      backgroundColor: interpolatePaletteColor(
        colorTransitionProgress.value,
        colorTransition.from.backgroundShadow,
        colorTransition.to.backgroundShadow
      ),
    }),
    [colorTransition]
  );
  const animatedBottomColorStyle = useAnimatedStyle(
    () => ({
      backgroundColor: interpolatePaletteColor(
        colorTransitionProgress.value,
        colorTransition.from.backgroundDarker,
        colorTransition.to.backgroundDarker
      ),
    }),
    [colorTransition]
  );
  const animatedProgressColorStyle = useAnimatedStyle(
    () => ({
      backgroundColor: interpolatePaletteColor(
        colorTransitionProgress.value,
        colorTransition.from.backgroundProgress,
        colorTransition.to.backgroundProgress
      ),
    }),
    [colorTransition]
  );
  const animatedActiveColorStyle = useAnimatedStyle(
    () => ({
      backgroundColor: interpolatePaletteColor(
        colorTransitionProgress.value,
        colorTransition.from.backgroundActive,
        colorTransition.to.backgroundActive
      ),
    }),
    [colorTransition]
  );
  const animatedFaceColorStyle = useAnimatedStyle(
    () => ({
      backgroundColor: interpolatePaletteColor(
        colorTransitionProgress.value,
        colorTransition.from.backgroundColor,
        colorTransition.to.backgroundColor
      ),
      borderColor: interpolatePaletteColor(
        colorTransitionProgress.value,
        colorTransition.from.borderColor,
        colorTransition.to.borderColor
      ),
    }),
    [colorTransition]
  );
  const contentVisibilityStyle = useMemo(
    () => ({
      opacity: contentOpacityTarget,
      transform: [
        {
          scale: contentScaleTarget,
        },
      ],
      transitionProperty: ['opacity', 'transform'],
      transitionDuration: ANIMATED_ELASTIC_DURATION,
      transitionTimingFunction: 'ease-out',
    }),
    [contentOpacityTarget, contentScaleTarget]
  );
  const activityVisibilityStyle = useMemo(
    () => ({
      opacity: activityOpacityTarget,
      transform: [
        {
          scale: activityScaleTarget,
        },
      ],
      transitionProperty: ['opacity', 'transform'],
      transitionDuration: ANIMATED_ELASTIC_DURATION,
      transitionTimingFunction: 'ease-out',
    }),
    [activityOpacityTarget, activityScaleTarget]
  );
  const progressVisibilityStyle = useMemo(
    () => ({
      opacity: progressOpacityTarget,
      transform: [
        {
          translateX: progressTranslateX,
        },
      ],
      transitionProperty: ['opacity', 'transform'],
      transitionDuration: [ANIMATED_TIMING_IN, progressTravelDurationMs],
      transitionTimingFunction: ['ease-out', 'ease-out'],
    }),
    [progressOpacityTarget, progressTranslateX, progressTravelDurationMs]
  );
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
              animatedProgressColorStyle,
              progressVisibilityStyle,
            ]}
          />
        ) : null}
        <Animated.View
          testID="aws-btn-activity-indicator"
          style={[styles.container__activity, activityVisibilityStyle]}
        >
          <ActivityIndicator color={activityColor} />
        </Animated.View>
      </>
    );
  }, [
    activity,
    activityColor,
    animatedProgressColorStyle,
    activityVisibilityStyle,
    dynamicStyles.progress,
    progressVisibilityStyle,
    showProgressBar,
  ]);

  const renderContent = useMemo(() => {
    if (!children) {
      return (
        <Placeholder
          animated={animatedPlaceholder}
          style={[
            dynamicStyles.container__placeholder,
            animatedPlaceholderColorStyle,
          ]}
        />
      );
    }

    const content =
      typeof children === 'string' ? (
        <Animated.Text
          testID="aws-btn-content-text"
          style={[styles.container__text, dynamicStyles.container__text]}
        >
          {displayedText ?? children}
        </Animated.Text>
      ) : (
        children
      );

    return (
      <Animated.View
        style={[
          styles.container__view,
          dynamicStyles.container__view,
          contentVisibilityStyle,
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
    animatedPlaceholderColorStyle,
    before,
    children,
    contentVisibilityStyle,
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
    <>
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
            animatedSizeOpacityStyle,
            sizeAnimatedStyles.container,
            style,
          ]}
        >
          <Animated.View
            testID="aws-btn-pressed-opacity"
            style={[styles.container__inner, animatedPressedOpacityStyle]}
          >
            <Animated.View
              testID="aws-btn-shadow"
              style={[
                styles.shadow__host,
                {
                  bottom: dynamicStyles.shadow.bottom,
                  height: dynamicStyles.shadow.height,
                },
                sizeAnimatedStyles.shadow,
              ]}
            >
              <Animated.View
                testID="aws-btn-shadow-inner"
                style={[
                  dynamicStyles.shadow,
                  styles.shadow__inner,
                  animatedShadowColorStyle,
                  animatedPressShadowStyle,
                ]}
              />
            </Animated.View>
            <Animated.View
              testID="aws-btn-bottom"
              style={[
                styles.bottom,
                dynamicStyles.bottom,
                animatedBottomColorStyle,
                sizeAnimatedStyles.bottom,
              ]}
            />
            <Animated.View
              testID="aws-btn-content"
              style={[
                styles.content,
                dynamicStyles.content,
                sizeAnimatedStyles.content,
              ]}
            >
              <Animated.View
                testID="aws-btn-face-transform"
                style={[styles.content__inner, animatedPressFaceStyle]}
              >
                <Animated.View
                  testID="aws-btn-text"
                  style={[
                    styles.text,
                    dynamicStyles.text,
                    animatedFaceColorStyle,
                  ]}
                  onLayout={onVisibleContentLayout}
                >
                  {extra}
                  <Animated.View
                    testID="aws-btn-active-background"
                    style={[
                      styles.activeBackground,
                      dynamicStyles.activeBackground,
                      animatedActiveColorStyle,
                      animatedPressActiveStyle,
                      suppressProgressDarkening
                        ? styles.activeBackground__hidden
                        : null,
                    ]}
                  />
                  {renderContent}
                  {renderActivity}
                </Animated.View>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Pressable>
      <SharedAutoWidthMeasurementHost enabled={measurementHostEnabled} />
    </>
  );
};

export default AwesomeButton;
