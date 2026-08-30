import React, { useMemo, useRef } from 'react';
import { Animated, Platform, useWindowDimensions } from 'react-native';
import usePressProgressController from './usePressProgressController';
import useButtonSizeBehavior from './useButtonSizeBehavior';
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
import type { AwesomeButtonProps } from './types';
import useReducedMotion from './useReducedMotion';
import useResolvedStyleTransition from './useResolvedStyleTransition';
import ButtonInteractionSurface from './button/ButtonInteractionSurface';
import ButtonVisualLayers from './button/ButtonVisualLayers';
import { normalizeButtonInputs } from './button/normalizeButtonInputs';
import { resolveButtonPresentationTargets } from './button/resolveButtonPresentationTargets';

/**
 * Compatibility alias for the core Awesome Button props.
 *
 * @deprecated Use AwesomeButtonProps instead.
 * @public
 */
export type ButtonTypes = AwesomeButtonProps;

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
  const normalizedInputs = normalizeButtonInputs({
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
    width: rawWidth,
  });
  const presentationTargets = resolveButtonPresentationTargets({
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
    normalized: normalizedInputs,
    platform: Platform.OS,
    textColor,
    textFontFamily,
  });
  const {
    activeOpacity: resolvedActiveOpacity,
    animationDuration: resolvedAnimationDuration,
    debouncedPressTime: resolvedDebouncedPressTime,
    pressInAnimationDuration: resolvedPressInAnimationDuration,
    progressLoadingTime: resolvedProgressLoadingTime,
  } = presentationTargets.interaction;
  const {
    height: resolvedGeometryHeight,
    paddingBottom: normalizedPaddingBottom,
    paddingHorizontal: normalizedPaddingHorizontal,
    paddingTop: normalizedPaddingTop,
    raiseAmount: normalizedRaiseAmount,
    width,
  } = presentationTargets.geometry;
  const {
    textFontFamily: resolvedTextFontFamily,
    textLineHeight: normalizedTextLineHeight,
  } = presentationTargets.content;
  const { minimumTarget } = presentationTargets.accessibility;
  const target = presentationTargets.palette;
  const targetPalette = useMemo(
    () => ({
      activityColor: target.activityColor,
      backgroundActive: target.backgroundActive,
      backgroundColor: target.backgroundColor,
      backgroundDarker: target.backgroundDarker,
      backgroundPlaceholder: target.backgroundPlaceholder,
      backgroundProgress: target.backgroundProgress,
      backgroundShadow: target.backgroundShadow,
      borderColor: target.borderColor,
      borderRadius: target.borderRadius,
      borderBottomLeftRadius: target.borderBottomLeftRadius,
      borderBottomRightRadius: target.borderBottomRightRadius,
      borderTopLeftRadius: target.borderTopLeftRadius,
      borderTopRightRadius: target.borderTopRightRadius,
      borderWidth: target.borderWidth,
      contentGap: target.contentGap,
      textColor: target.textColor,
      textSize: target.textSize,
    }),
    [
      target.activityColor,
      target.backgroundActive,
      target.backgroundColor,
      target.backgroundDarker,
      target.backgroundPlaceholder,
      target.backgroundProgress,
      target.backgroundShadow,
      target.borderColor,
      target.borderRadius,
      target.borderBottomLeftRadius,
      target.borderBottomRightRadius,
      target.borderTopLeftRadius,
      target.borderTopRightRadius,
      target.borderWidth,
      target.contentGap,
      target.textColor,
      target.textSize,
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
    handlePress,
    handlePressIn,
    handlePressOut,
  } = usePressProgressController({
    activeOpacity: resolvedActiveOpacity,
    animatedActive,
    animatedLoading,
    animatedOpacity,
    animatedValue,
    activityOpacity,
    animationCurve: buttonStyle?.animationCurve,
    animationDuration: resolvedAnimationDuration,
    debouncedPressTime: resolvedDebouncedPressTime,
    delayLongPress: dangerouslySetPressableProps.delayLongPress,
    disabled,
    hasChildren: hasRenderableChildren,
    loadingOpacity,
    onLongPress,
    onLongPressAction,
    onPress,
    onPressIn,
    onPressOut,
    onPressedIn,
    onPressedOut,
    onProgressEnd,
    onProgressStart,
    pressInAnimationDuration: resolvedPressInAnimationDuration,
    progress,
    progressLoadingTime: resolvedProgressLoadingTime,
    reduceMotion,
    showProgressBar,
    springRelease,
    textOpacity,
  });

  return (
    <ButtonInteractionSurface
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityLongPressLabel={accessibilityLongPressLabel}
      activity={activity}
      dangerouslySetPressableProps={dangerouslySetPressableProps}
      disabled={disabled}
      fallbackAccessibilityLabel={
        hasPrimitiveTextChild ? String(children) : undefined
      }
      hasAccessibleLongPress={onLongPressAction !== undefined}
      hasRenderableChildren={hasRenderableChildren}
      hitSlop={hitSlop}
      minimumTarget={minimumTarget}
      onAtomicLongPress={handleAtomicLongPress}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <ButtonVisualLayers
        activity={activity}
        activityColor={resolvedActivityColor}
        activityOpacity={activityOpacity}
        after={after}
        animatedActive={animatedActive}
        animatedLoading={animatedLoading}
        animatedOpacity={animatedOpacity}
        animatedPlaceholder={animatedPlaceholder}
        animatedValue={animatedValue}
        backgroundActive={resolvedBackgroundActive}
        backgroundColor={resolvedBackgroundColor}
        backgroundDarker={resolvedBackgroundDarker}
        backgroundPlaceholder={resolvedBackgroundPlaceholder}
        backgroundProgress={resolvedBackgroundProgress}
        backgroundShadow={resolvedBackgroundShadow}
        before={before}
        borderBottomLeftRadius={resolvedBorderBottomLeftRadius}
        borderBottomRightRadius={resolvedBorderBottomRightRadius}
        borderColor={resolvedBorderColor}
        borderRadius={resolvedBorderRadius}
        borderTopLeftRadius={resolvedBorderTopLeftRadius}
        borderTopRightRadius={resolvedBorderTopRightRadius}
        borderWidth={resolvedBorderWidth}
        containerStyle={containerStyle}
        contentGap={resolvedContentGap}
        displayedText={displayedText}
        extra={extra}
        hasPrimitiveTextChild={hasPrimitiveTextChild}
        hasRenderableChildren={hasRenderableChildren}
        height={resolvedGeometryHeight}
        hiddenMeasurementKey={hiddenMeasurementKey}
        hiddenMeasurementText={hiddenMeasurementText}
        loadingOpacity={loadingOpacity}
        onHiddenMeasurementLayout={onHiddenMeasurementLayout}
        onVisibleContentLayout={onVisibleContentLayout}
        paddingBottom={normalizedPaddingBottom}
        paddingHorizontal={normalizedPaddingHorizontal}
        paddingTop={normalizedPaddingTop}
        progress={progress}
        raiseAmount={normalizedRaiseAmount}
        reduceMotion={reduceMotion}
        resolvedWidth={resolvedWidth}
        showProgressBar={showProgressBar}
        sizeAnimatedStyles={sizeAnimatedStyles}
        stretch={stretch}
        style={style}
        textColor={resolvedTextColor}
        textFontFamily={resolvedTextFontFamily}
        textLineHeight={normalizedTextLineHeight}
        textOpacity={textOpacity}
        textSize={resolvedTextSize}
        width={width}
      >
        {children}
      </ButtonVisualLayers>
    </ButtonInteractionSurface>
  );
};

export default AwesomeButton;
