import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Easing } from 'react-native';
import AwesomeButton from '../Button';
import { ANIMATED_TIMING_IN } from '../constants';
import type {
  ButtonVariant,
  ThemeButtonStyle,
  ThemeDefinition,
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

const TYPE_TRANSITION_EASING = Easing.out(Easing.cubic);

function ThemedButton({
  disabled,
  index = null,
  config,
  flat = false,
  name = null,
  transparent = false,
  type = 'primary',
  size = 'medium',
  ...extra
}: ThemedButtonProps) {
  const transitionControllerRef = useRef<{
    stop: () => void;
  } | null>(null);
  const mountedRef = useRef(false);
  const previousConfigRef = useRef<ThemeDefinition | undefined>(undefined);
  const previousThemeSourceDescriptorRef = useRef<string | null>(null);
  const previousButtonTypeRef = useRef<ButtonVariant | null>(null);
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
  const buttonStyles = theme.buttons[buttonType];
  const sizeStyles = theme.size[size] || theme.size.medium;
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
    (nextPalette: ThemeButtonStyle) => {
      if (areThemeButtonStylesEqual(displayedPaletteRef.current, nextPalette)) {
        return;
      }

      displayedPaletteRef.current = nextPalette;
      setDisplayedPalette(nextPalette);
    },
    []
  );

  useEffect(() => () => stopTransition(), [stopTransition]);

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
      sameThemeSource &&
      previousTransparent === transparent &&
      previousButtonType !== null &&
      previousButtonType !== buttonType;

    if (!shouldAnimate) {
      stopTransition();
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
            transitionControllerRef.current = null;
            updateDisplayedPalette(targetPalette);
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
    updateDisplayedPalette,
  ]);

  const resolvedAwesomeButtonProps = useMemo(
    () => ({
      ...resolvedButtonStyles,
      ...displayedPalette,
      ...sizeStyles,
      disabled,
      ...extra,
    }),
    [disabled, displayedPalette, extra, resolvedButtonStyles, sizeStyles]
  );

  return <AwesomeButton {...resolvedAwesomeButtonProps} />;
}

export default ThemedButton;
