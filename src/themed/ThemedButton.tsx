import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Easing } from 'react-native';
import AwesomeButton from '../Button';
import { ANIMATED_TIMING_IN } from '../constants';
import type {
  AwesomeButtonThemeDefinition,
  AwesomeButtonVariant,
  ThemeButtonStyle,
  ThemedButtonProps,
} from '../types';
import { interpolateThemeButtonStyle } from './colors';
import {
  areThemeButtonStylesEqual,
  getInterpolatablePalette,
  getThemeSourceDescriptor,
  resolveButtonType,
  TRANSPARENT_STYLES,
} from './resolution';
import { runTimedTransition } from './transition';
import getTheme from './themes';
import useReducedMotion from '../useReducedMotion';
import { normalizeOptionalNonNegative } from '../normalization';

const TYPE_TRANSITION_EASING = Easing.out(Easing.cubic);

/** Renders a theme-resolved Awesome Button while preserving the core contract. */
function ThemedButton({
  disabled,
  index = null,
  config,
  flat = false,
  name = null,
  transparent = false,
  type = 'primary',
  autoWidth,
  stretch = false,
  width,
  height,
  faceHeight,
  size = 'medium',
  ...extra
}: ThemedButtonProps) {
  const reduceMotion = useReducedMotion();
  const transitionControllerRef = useRef<{
    stop: () => void;
  } | null>(null);
  const snapStyleFrameRef = useRef(false);
  const mountedRef = useRef(false);
  const previousConfigRef = useRef<AwesomeButtonThemeDefinition | undefined>(
    undefined
  );
  const previousThemeSourceDescriptorRef = useRef<string | null>(null);
  const previousButtonTypeRef = useRef<AwesomeButtonVariant | null>(null);
  const previousTransparentRef = useRef<boolean | null>(null);

  const theme = useMemo(
    () => config || getTheme(index, name),
    [config, index, name]
  );
  const buttonType = useMemo(
    () => resolveButtonType(theme, disabled, flat, type),
    [theme, disabled, flat, type]
  );
  const themeSourceDescriptor = useMemo(
    () => getThemeSourceDescriptor(index, name, config),
    [index, name, config]
  );
  const buttonStyles = useMemo(
    () => theme.buttons[buttonType] ?? theme.buttons.primary ?? {},
    [theme, buttonType]
  );
  const sizeStyles = useMemo(
    () => theme.size[size] || theme.size.medium,
    [theme, size]
  );
  const transparentStyles = transparent ? TRANSPARENT_STYLES : undefined;
  const resolvedButtonStyles = useMemo(
    () => ({
      ...buttonStyles,
      ...transparentStyles,
    }),
    [buttonStyles, transparentStyles]
  );
  const targetPalette = useMemo(
    () => getInterpolatablePalette(resolvedButtonStyles),
    [resolvedButtonStyles]
  );
  const [displayedPalette, setDisplayedPalette] =
    useState<ThemeButtonStyle>(targetPalette);
  const displayedPaletteRef = useRef<ThemeButtonStyle>(targetPalette);

  const stopTransition = useCallback(() => {
    if (transitionControllerRef.current !== null) {
      transitionControllerRef.current.stop();
      transitionControllerRef.current = null;
    }
  }, []);

  const updateDisplayedPalette = useCallback(
    (nextPalette: ThemeButtonStyle, forceRender = false) => {
      if (
        !forceRender &&
        areThemeButtonStylesEqual(displayedPaletteRef.current, nextPalette)
      ) {
        return;
      }

      displayedPaletteRef.current = nextPalette;
      setDisplayedPalette(forceRender ? { ...nextPalette } : nextPalette);
    },
    []
  );

  useEffect(() => () => stopTransition(), [stopTransition]);

  useLayoutEffect(() => {
    snapStyleFrameRef.current = false;
  });

  useEffect(() => {
    const previousConfig = previousConfigRef.current;
    const previousThemeSourceDescriptor =
      previousThemeSourceDescriptorRef.current;
    const previousButtonType = previousButtonTypeRef.current;
    const previousTransparent = previousTransparentRef.current;
    const sameThemeSource = config
      ? previousConfig === config
      : previousConfig === undefined &&
        previousThemeSourceDescriptor === themeSourceDescriptor;
    const shouldAnimate =
      mountedRef.current &&
      !reduceMotion &&
      sameThemeSource &&
      previousTransparent === transparent &&
      previousButtonType !== null &&
      previousButtonType !== buttonType;

    if (!shouldAnimate) {
      stopTransition();
      if (
        !areThemeButtonStylesEqual(displayedPaletteRef.current, targetPalette)
      ) {
        snapStyleFrameRef.current = true;
      }
      updateDisplayedPalette(targetPalette);
    } else {
      const startPalette = displayedPaletteRef.current;

      if (areThemeButtonStylesEqual(startPalette, targetPalette)) {
        stopTransition();
        updateDisplayedPalette(targetPalette);
      } else {
        stopTransition();
        transitionControllerRef.current = runTimedTransition({
          duration: ANIMATED_TIMING_IN,
          easing: TYPE_TRANSITION_EASING,
          onUpdate: (progress) => {
            const nextPalette = interpolateThemeButtonStyle(
              startPalette,
              targetPalette,
              progress
            );

            updateDisplayedPalette(nextPalette);
          },
          onComplete: () => {
            // The last update and completion may be batched into one React
            // commit. Force one final wrapper-owned frame so the inner button
            // cannot start a second animation from the preceding palette.
            snapStyleFrameRef.current = true;
            transitionControllerRef.current = null;
            updateDisplayedPalette(targetPalette, true);
          },
        });
      }
    }

    mountedRef.current = true;
    previousConfigRef.current = config;
    previousThemeSourceDescriptorRef.current = themeSourceDescriptor;
    previousButtonTypeRef.current = buttonType;
    previousTransparentRef.current = transparent;
  }, [
    buttonType,
    config,
    stopTransition,
    targetPalette,
    themeSourceDescriptor,
    transparent,
    reduceMotion,
    updateDisplayedPalette,
  ]);

  const resolvedAwesomeButtonProps = useMemo(() => {
    const explicitNumericWidth =
      typeof width === 'number'
        ? normalizeOptionalNonNegative(width)
        : undefined;
    const variantWidth =
      typeof resolvedButtonStyles.width === 'number'
        ? normalizeOptionalNonNegative(resolvedButtonStyles.width)
        : undefined;
    const sizeWidth = normalizeOptionalNonNegative(sizeStyles.width);
    const resolvedHeight =
      normalizeOptionalNonNegative(height) ??
      normalizeOptionalNonNegative(resolvedButtonStyles.height) ??
      normalizeOptionalNonNegative(sizeStyles.height);
    let resolvedWidth: number | 'auto' | null | undefined;

    if (stretch) {
      resolvedWidth = explicitNumericWidth;
    } else if (explicitNumericWidth !== undefined) {
      resolvedWidth = explicitNumericWidth;
    } else if (autoWidth === true) {
      resolvedWidth = null;
    } else if (autoWidth === false) {
      resolvedWidth = variantWidth ?? sizeWidth;
    } else if (width === 'auto') {
      resolvedWidth = 'auto';
    } else {
      resolvedWidth = variantWidth ?? sizeWidth;
    }

    return {
      ...sizeStyles,
      ...resolvedButtonStyles,
      ...displayedPalette,
      disabled,
      ...extra,
      faceHeight: normalizeOptionalNonNegative(faceHeight),
      height: resolvedHeight,
      stretch,
      width: resolvedWidth,
    };
  }, [
    autoWidth,
    disabled,
    displayedPalette,
    extra,
    faceHeight,
    height,
    resolvedButtonStyles,
    sizeStyles,
    stretch,
    width,
  ]);

  return (
    <AwesomeButton
      {...resolvedAwesomeButtonProps}
      __styleFramesArePreInterpolated={
        snapStyleFrameRef.current || transitionControllerRef.current !== null
      }
    />
  );
}

export default ThemedButton;
