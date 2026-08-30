import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  I18nManager,
  Platform,
  Pressable,
  PressableProps,
  Text,
  View,
  useWindowDimensions,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
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
import {
  normalizeNonNegative,
  normalizeOpacity,
  normalizeOptionalNonNegative,
  normalizeOptionalNumber,
} from './normalization';
import useReducedMotion from './useReducedMotion';
import { getLongPressAccessibilityLabel } from './localization';
import useResolvedStyleTransition from './useResolvedStyleTransition';

/**
 * Compatibility alias for the core Awesome Button props.
 *
 * @deprecated Use AwesomeButtonProps instead.
 * @public
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

type AwesomeButtonInternalProps = AwesomeButtonProps & {
  /** The themed owner already supplies interpolated style frames. */
  __styleFramesArePreInterpolated?: boolean;
};

/**
 * Renders the core animated Awesome Button interaction surface.
 *
 * @public
 */
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
  borderLeftBottomRadius,
  borderTopLeftRadius,
  borderTopRightRadius,
  borderWidth = DEFAULT_BORDER_WIDTH,
  children = null,
  before = null,
  after = null,
  disabled = false,
  buttonStyle,
  containerStyle,
  faceHeight,
  height = DEFAULT_HEIGHT,
  hitSlop,
  debouncedPressTime = DEFAULT_DEBOUNCED_PRESS_TIME,
  paddingHorizontal = DEFAULT_HORIZONTAL_PADDING,
  onPress,
  onPressIn,
  onPressedIn,
  onPressOut,
  onPressedOut,
  onProgressStart,
  onProgressEnd,
  onLongPress,
  onLongPressAction,
  accessibilityLabel,
  accessibilityHint,
  accessibilityLongPressLabel,
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
  __styleFramesArePreInterpolated = false,
}: AwesomeButtonInternalProps) => {
  const reduceMotion = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const hasRenderableChildren = React.Children.toArray(children).length > 0;
  const hasPrimitiveTextChild =
    typeof children === 'string' || typeof children === 'number';
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
  const resolvedGeometryHeight = Math.max(
    bridgeGeometryHeight,
    accessibilityGrowthHeight
  );
  const width =
    rawWidth === 'auto' || rawWidth === null
      ? null
      : normalizeOptionalNonNegative(rawWidth) ?? DEFAULT_WIDTH;
  const resolvedActiveOpacity = normalizeOpacity(
    normalizeOptionalNumber(buttonStyle?.activeOpacity) ?? activeOpacity,
    DEFAULT_ACTIVE_OPACITY
  );
  const resolvedProgressLoadingTime = normalizeNonNegative(
    progressLoadingTime,
    ANIMATED_TIMING_LOADING
  );
  const resolvedDebouncedPressTime = normalizeNonNegative(
    debouncedPressTime,
    DEFAULT_DEBOUNCED_PRESS_TIME
  );
  const resolvedAnimationDuration = normalizeOptionalNonNegative(
    buttonStyle?.animationDuration
  );
  const resolvedPressInAnimationDuration = normalizeOptionalNonNegative(
    buttonStyle?.pressInAnimationDuration
  );
  const targetBackgroundColor = disabled
    ? buttonStyle?.disabledBackgroundColor ??
      buttonStyle?.backgroundColor ??
      backgroundColor
    : buttonStyle?.backgroundColor ?? backgroundColor;
  const targetBackgroundDarker = disabled
    ? buttonStyle?.disabledDepthColor ??
      buttonStyle?.depthColor ??
      backgroundDarker
    : buttonStyle?.depthColor ?? backgroundDarker;
  const targetBackgroundShadow = disabled
    ? buttonStyle?.disabledShadowColor ??
      buttonStyle?.shadowColor ??
      backgroundShadow
    : buttonStyle?.shadowColor ?? backgroundShadow;
  const targetTextColor = disabled
    ? buttonStyle?.disabledForegroundColor ??
      buttonStyle?.foregroundColor ??
      textColor
    : buttonStyle?.foregroundColor ?? textColor;
  const targetBorderColor = disabled
    ? buttonStyle?.disabledBorderColor ??
      buttonStyle?.borderColor ??
      borderColor
    : buttonStyle?.borderColor ?? borderColor;
  const targetBackgroundActive =
    buttonStyle?.backgroundActive ??
    buttonStyle?.pressedOverlayColor ??
    backgroundActive;
  const targetActivityColor = buttonStyle?.activityColor ?? activityColor;
  const targetBackgroundPlaceholder =
    buttonStyle?.backgroundPlaceholder ?? backgroundPlaceholder;
  const targetBackgroundProgress =
    buttonStyle?.backgroundProgress ?? backgroundProgress;
  const targetBorderRadius =
    normalizeOptionalNonNegative(buttonStyle?.borderRadius) ??
    normalizeNonNegative(borderRadius, DEFAULT_BORDER_RADIUS);
  const targetBorderBottomLeftRadius =
    normalizeOptionalNonNegative(buttonStyle?.borderBottomLeftRadius) ??
    normalizeOptionalNonNegative(borderBottomLeftRadius) ??
    normalizeOptionalNonNegative(borderLeftBottomRadius);
  const targetBorderBottomRightRadius =
    normalizeOptionalNonNegative(buttonStyle?.borderBottomRightRadius) ??
    normalizeOptionalNonNegative(borderBottomRightRadius);
  const targetBorderTopLeftRadius =
    normalizeOptionalNonNegative(buttonStyle?.borderTopLeftRadius) ??
    normalizeOptionalNonNegative(borderTopLeftRadius);
  const targetBorderTopRightRadius =
    normalizeOptionalNonNegative(buttonStyle?.borderTopRightRadius) ??
    normalizeOptionalNonNegative(borderTopRightRadius);
  const targetBorderWidth =
    normalizeOptionalNonNegative(buttonStyle?.borderWidth) ??
    normalizeNonNegative(borderWidth, DEFAULT_BORDER_WIDTH);
  const targetTextSize =
    normalizeOptionalNonNegative(buttonStyle?.textSize) ??
    normalizeNonNegative(textSize, DEFAULT_TEXT_SIZE);
  const targetContentGap = normalizeOptionalNonNegative(
    buttonStyle?.contentGap
  );
  const targetPalette = useMemo(
    () => ({
      activityColor: targetActivityColor,
      backgroundActive: targetBackgroundActive,
      backgroundColor: targetBackgroundColor,
      backgroundDarker: targetBackgroundDarker,
      backgroundPlaceholder: targetBackgroundPlaceholder,
      backgroundProgress: targetBackgroundProgress,
      backgroundShadow: targetBackgroundShadow,
      borderColor: targetBorderColor,
      borderRadius: targetBorderRadius,
      borderBottomLeftRadius: targetBorderBottomLeftRadius,
      borderBottomRightRadius: targetBorderBottomRightRadius,
      borderTopLeftRadius: targetBorderTopLeftRadius,
      borderTopRightRadius: targetBorderTopRightRadius,
      borderWidth: targetBorderWidth,
      contentGap: targetContentGap,
      textColor: targetTextColor,
      textSize: targetTextSize,
    }),
    [
      targetActivityColor,
      targetBackgroundActive,
      targetBackgroundColor,
      targetBackgroundDarker,
      targetBackgroundPlaceholder,
      targetBackgroundProgress,
      targetBackgroundShadow,
      targetBorderColor,
      targetBorderRadius,
      targetBorderBottomLeftRadius,
      targetBorderBottomRightRadius,
      targetBorderTopLeftRadius,
      targetBorderTopRightRadius,
      targetBorderWidth,
      targetContentGap,
      targetTextColor,
      targetTextSize,
    ]
  );
  const {
    activityColor: resolvedActivityColor,
    backgroundActive: resolvedBackgroundActive,
    backgroundColor: resolvedBackgroundColor,
    backgroundDarker: resolvedBackgroundDarker,
    backgroundPlaceholder: resolvedBackgroundPlaceholder,
    backgroundProgress: resolvedBackgroundProgress,
    backgroundShadow: resolvedBackgroundShadow,
    borderColor: resolvedBorderColor,
    borderRadius: resolvedBorderRadius,
    borderBottomLeftRadius: resolvedBorderBottomLeftRadius,
    borderBottomRightRadius: resolvedBorderBottomRightRadius,
    borderTopLeftRadius: resolvedBorderTopLeftRadius,
    borderTopRightRadius: resolvedBorderTopRightRadius,
    borderWidth: resolvedBorderWidth,
    contentGap: resolvedContentGap,
    textColor: resolvedTextColor,
    textSize: resolvedTextSize,
  } = useResolvedStyleTransition({
    target: targetPalette,
    duration: resolvedAnimationDuration ?? 140,
    curve: buttonStyle?.animationCurve,
    reduceMotion,
    skipAnimation: __styleFramesArePreInterpolated,
  });
  const longPressActionRef = useRef(onLongPressAction);
  const legacyLongPressRef = useRef(onLongPress);
  const longPressGestureActiveRef = useRef(false);
  const longPressArmedRef = useRef(false);
  const longPressDisarmedRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasEffectiveLongPress =
    onLongPressAction !== undefined || onLongPress !== undefined;

  useLayoutEffect(() => {
    longPressActionRef.current = onLongPressAction;
    legacyLongPressRef.current = onLongPress;

    if (
      longPressGestureActiveRef.current &&
      onLongPressAction === undefined &&
      onLongPress === undefined
    ) {
      longPressDisarmedRef.current = true;
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, [onLongPress, onLongPressAction]);

  useEffect(
    () => () => {
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current);
      }
    },
    []
  );

  const onPhysicalLongPress = useCallback((event: GestureResponderEvent) => {
    if (
      !longPressGestureActiveRef.current ||
      !longPressArmedRef.current ||
      longPressDisarmedRef.current
    ) {
      return false;
    }

    const canonical = longPressActionRef.current;
    if (canonical !== undefined) {
      canonical();
      return true;
    }

    const legacy = legacyLongPressRef.current;
    if (legacy != null) {
      legacy(event);
      return true;
    }

    return false;
  }, []);
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
    height: resolvedGeometryHeight,
    paddingBottom: normalizedPaddingBottom,
    paddingTop: normalizedPaddingTop,
    raiseLevel: normalizedRaiseAmount,
    reduceMotion,
    stretch,
    textTransition,
    width,
  });
  const {
    activity,
    handleAtomicLongPress,
    handleLongPress,
    handlePress,
    handlePressIn: controllerHandlePressIn,
    handlePressOut: controllerHandlePressOut,
  } = usePressProgressController({
    activeOpacity: resolvedActiveOpacity,
    animatedActive,
    animatedLoading,
    animatedOpacity,
    animatedValue,
    activityOpacity,
    disabled,
    hasChildren: hasRenderableChildren,
    hasLongPress: hasEffectiveLongPress,
    loadingOpacity,
    onPhysicalLongPress,
    onPress,
    onPressIn,
    onPressOut,
    onPressedIn,
    onPressedOut,
    onProgressEnd,
    onProgressStart,
    progress,
    progressLoadingTime: resolvedProgressLoadingTime,
    reduceMotion,
    showProgressBar,
    springRelease,
    textOpacity,
    debouncedPressTime: resolvedDebouncedPressTime,
    animationCurve: buttonStyle?.animationCurve,
    animationDuration: resolvedAnimationDuration,
    pressInAnimationDuration: resolvedPressInAnimationDuration,
  });

  const handlePressIn = useCallback(
    (event: Parameters<typeof controllerHandlePressIn>[0]) => {
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      longPressGestureActiveRef.current = true;
      longPressArmedRef.current = hasEffectiveLongPress;
      longPressDisarmedRef.current = !hasEffectiveLongPress;
      event.persist?.();
      controllerHandlePressIn(event);

      if (
        hasEffectiveLongPress &&
        !disabled &&
        hasRenderableChildren &&
        !activity
      ) {
        const configuredDelay = normalizeNonNegative(
          dangerouslySetPressableProps.delayLongPress,
          500
        );
        longPressTimerRef.current = setTimeout(() => {
          longPressTimerRef.current = null;
          handleLongPress(event);
        }, configuredDelay);
      }
    },
    [
      activity,
      controllerHandlePressIn,
      dangerouslySetPressableProps.delayLongPress,
      disabled,
      handleLongPress,
      hasRenderableChildren,
      hasEffectiveLongPress,
    ]
  );

  const handlePressOut = useCallback(
    (event: Parameters<typeof controllerHandlePressOut>[0]) => {
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      controllerHandlePressOut(event);
      longPressGestureActiveRef.current = false;
      longPressArmedRef.current = false;
    },
    [controllerHandlePressOut]
  );

  useEffect(() => {
    if (!disabled && hasRenderableChildren && !activity) return;
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressDisarmedRef.current = true;
  }, [activity, disabled, hasRenderableChildren]);

  const {
    accessibilityActions: dangerousAccessibilityActions,
    accessibilityHint: dangerousAccessibilityHint,
    accessibilityLabel: dangerousAccessibilityLabel,
    accessibilityRole: dangerousAccessibilityRole,
    accessibilityState: dangerousAccessibilityState,
    children: _ignoredDangerousChildren,
    hitSlop: dangerousHitSlop,
    onLongPress: _ignoredDangerousOnLongPress,
    onAccessibilityAction: dangerousOnAccessibilityAction,
    onPress: _ignoredDangerousOnPress,
    onPressIn: _ignoredDangerousOnPressIn,
    onPressOut: _ignoredDangerousOnPressOut,
    style: dangerousPressableStyle,
    ...safePressableProps
  } = dangerouslySetPressableProps as PressableProps & {
    children?: React.ReactNode;
  };
  const dynamicStyles = useMemo(
    () =>
      getStyles({
        backgroundActive: resolvedBackgroundActive,
        backgroundColor: resolvedBackgroundColor,
        backgroundDarker: resolvedBackgroundDarker,
        backgroundPlaceholder: resolvedBackgroundPlaceholder,
        backgroundProgress: resolvedBackgroundProgress,
        backgroundShadow: resolvedBackgroundShadow,
        borderColor: resolvedBorderColor,
        borderRadius: resolvedBorderRadius,
        borderBottomLeftRadius: resolvedBorderBottomLeftRadius,
        borderBottomRightRadius: resolvedBorderBottomRightRadius,
        borderTopLeftRadius: resolvedBorderTopLeftRadius,
        borderTopRightRadius: resolvedBorderTopRightRadius,
        borderWidth: resolvedBorderWidth,
        contentGap: resolvedContentGap,
        height: resolvedGeometryHeight,
        paddingBottom: normalizedPaddingBottom,
        paddingHorizontal: normalizedPaddingHorizontal,
        paddingTop: normalizedPaddingTop,
        raiseLevel: normalizedRaiseAmount,
        stateWidth: width === null && stretch !== true ? resolvedWidth : null,
        stretch,
        textColor: resolvedTextColor,
        textFontFamily: buttonStyle?.textFontFamily ?? textFontFamily,
        textLineHeight: normalizedTextLineHeight,
        textSize: resolvedTextSize,
        width,
      }),
    [
      buttonStyle?.textFontFamily,
      normalizedPaddingBottom,
      normalizedPaddingHorizontal,
      normalizedPaddingTop,
      normalizedRaiseAmount,
      normalizedTextLineHeight,
      resolvedBackgroundActive,
      resolvedBackgroundColor,
      resolvedBackgroundDarker,
      resolvedBackgroundPlaceholder,
      resolvedBackgroundProgress,
      resolvedBackgroundShadow,
      resolvedBorderBottomLeftRadius,
      resolvedBorderBottomRightRadius,
      resolvedBorderColor,
      resolvedBorderRadius,
      resolvedBorderTopLeftRadius,
      resolvedBorderTopRightRadius,
      resolvedBorderWidth,
      resolvedContentGap,
      resolvedGeometryHeight,
      resolvedTextColor,
      resolvedTextSize,
      resolvedWidth,
      stretch,
      textFontFamily,
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
              outputRange: [0, normalizedRaiseAmount],
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
              outputRange: [0, -normalizedRaiseAmount / 2],
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
    normalizedRaiseAmount,
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
          <ActivityIndicator color={resolvedActivityColor} />
        </Animated.View>
      </>
    );
  }, [
    activity,
    animatedValues.animatedActivity,
    animatedValues.animatedProgress,
    dynamicStyles.progress,
    resolvedActivityColor,
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
        borderWidth: resolvedBorderWidth,
        paddingBottom: normalizedPaddingBottom,
        paddingHorizontal: normalizedPaddingHorizontal,
        paddingTop: normalizedPaddingTop,
      }),
    [
      normalizedPaddingBottom,
      normalizedPaddingHorizontal,
      normalizedPaddingTop,
      resolvedBorderWidth,
    ]
  );

  const hiddenMeasurementTextStyle = useMemo(
    () =>
      getHiddenMeasurementTextStyle({
        textColor: resolvedTextColor,
        textFontFamily: buttonStyle?.textFontFamily ?? textFontFamily,
        textLineHeight: normalizedTextLineHeight,
        textSize: resolvedTextSize,
      }),
    [
      buttonStyle?.textFontFamily,
      normalizedTextLineHeight,
      resolvedTextColor,
      resolvedTextSize,
      textFontFamily,
    ]
  );

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
    hasRenderableChildren,
    hasPrimitiveTextChild,
    dynamicStyles.container__placeholder,
    dynamicStyles.container__text,
    dynamicStyles.container__view,
    reduceMotion,
  ]);

  const pressableHitSlop = hitSlop ?? dangerousHitSlop;
  const accessibilityRole = dangerousAccessibilityRole ?? 'button';
  const effectiveDisabled = disabled || activity || !hasRenderableChildren;
  const effectiveAccessibilityLabel =
    accessibilityLabel ??
    dangerousAccessibilityLabel ??
    (hasPrimitiveTextChild ? String(children) : undefined);
  const effectiveAccessibilityHint =
    accessibilityHint ?? dangerousAccessibilityHint;
  const longAccessibilityActionName =
    Platform.OS === 'ios' ? 'awesome-button-long-press' : 'longpress';
  const accessibilityActions = useMemo(() => {
    const reservedNames = new Set([
      'activate',
      'longpress',
      'awesome-button-long-press',
    ]);
    const consumerActions = (dangerousAccessibilityActions ?? []).filter(
      (action) => !reservedNames.has(action.name)
    );
    const ownedActions: Array<{ name: string; label?: string }> = [];

    if (!effectiveDisabled && onLongPressAction !== undefined) {
      ownedActions.push({
        name: longAccessibilityActionName,
        label:
          accessibilityLongPressLabel ??
          (Platform.OS === 'ios'
            ? getLongPressAccessibilityLabel()
            : undefined),
      });
    }

    return [...consumerActions, ...ownedActions];
  }, [
    accessibilityLongPressLabel,
    dangerousAccessibilityActions,
    effectiveDisabled,
    longAccessibilityActionName,
    onLongPressAction,
  ]);
  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const actionName = event.nativeEvent.actionName;
      if (actionName === 'activate') {
        // `Pressable.onPress` owns default assistive activation. Registering a
        // second package action handler can dispatch one request twice.
        return;
      }
      if (
        actionName === 'longpress' ||
        actionName === 'awesome-button-long-press'
      ) {
        handleAtomicLongPress(longPressActionRef.current);
        return;
      }
      dangerousOnAccessibilityAction?.(event);
    },
    [dangerousOnAccessibilityAction, handleAtomicLongPress]
  );
  const suppressProgressDarkening =
    progress === true && activity === true && showProgressBar === false;
  const accessibilityState = useMemo(
    () =>
      getMergedAccessibilityState(dangerousAccessibilityState, {
        busy: activity,
        disabled: effectiveDisabled,
      }),
    [activity, dangerousAccessibilityState, effectiveDisabled]
  );
  const minimumTarget = Platform.OS === 'android' ? 48 : 44;

  return (
    <Pressable
      testID="aws-btn-content-view"
      {...safePressableProps}
      accessible
      accessibilityActions={accessibilityActions}
      accessibilityHint={effectiveAccessibilityHint}
      accessibilityLabel={effectiveAccessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      disabled={effectiveDisabled}
      hitSlop={pressableHitSlop}
      onAccessibilityAction={onAccessibilityAction}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={(state) => [
        typeof dangerousPressableStyle === 'function'
          ? dangerousPressableStyle(state)
          : dangerousPressableStyle,
        styles.minimumTarget,
        { minHeight: minimumTarget, minWidth: minimumTarget },
      ]}
    >
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
    </Pressable>
  );
};

export default AwesomeButton;
