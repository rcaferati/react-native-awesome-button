import { useEffect, useRef, useState } from 'react';
import { Easing, type ColorValue } from 'react-native';
import { interpolateColors } from './themed/colors';
import { runTimedTransition } from './themed/transition';
import type { AwesomeButtonAnimationCurve } from './types';

type ResolvedStylePalette = {
  activityColor: ColorValue;
  backgroundActive: ColorValue;
  backgroundColor: ColorValue;
  backgroundDarker: ColorValue;
  backgroundPlaceholder: ColorValue;
  backgroundProgress: ColorValue;
  backgroundShadow: ColorValue;
  borderColor?: ColorValue;
  borderRadius: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderWidth: number;
  contentGap?: number;
  textColor: ColorValue;
  textSize: number;
};

const interpolateColorValue = (
  from: ColorValue | undefined,
  to: ColorValue | undefined,
  progress: number
) => {
  if (typeof from !== 'string' || typeof to !== 'string') return to;
  return interpolateColors(from, to, progress) ?? to;
};

const interpolatePalette = (
  from: ResolvedStylePalette,
  to: ResolvedStylePalette,
  progress: number
): ResolvedStylePalette => {
  const interpolateNumber = (
    fromValue: number | undefined,
    toValue: number | undefined
  ) => {
    if (fromValue === undefined || toValue === undefined) return toValue;
    return fromValue + (toValue - fromValue) * progress;
  };

  return {
    activityColor: interpolateColorValue(
      from.activityColor,
      to.activityColor,
      progress
    )!,
    backgroundActive: interpolateColorValue(
      from.backgroundActive,
      to.backgroundActive,
      progress
    )!,
    backgroundColor: interpolateColorValue(
      from.backgroundColor,
      to.backgroundColor,
      progress
    )!,
    backgroundDarker: interpolateColorValue(
      from.backgroundDarker,
      to.backgroundDarker,
      progress
    )!,
    backgroundPlaceholder: interpolateColorValue(
      from.backgroundPlaceholder,
      to.backgroundPlaceholder,
      progress
    )!,
    backgroundProgress: interpolateColorValue(
      from.backgroundProgress,
      to.backgroundProgress,
      progress
    )!,
    backgroundShadow: interpolateColorValue(
      from.backgroundShadow,
      to.backgroundShadow,
      progress
    )!,
    borderColor: interpolateColorValue(
      from.borderColor,
      to.borderColor,
      progress
    ),
    borderRadius: interpolateNumber(from.borderRadius, to.borderRadius)!,
    borderBottomLeftRadius: interpolateNumber(
      from.borderBottomLeftRadius,
      to.borderBottomLeftRadius
    ),
    borderBottomRightRadius: interpolateNumber(
      from.borderBottomRightRadius,
      to.borderBottomRightRadius
    ),
    borderTopLeftRadius: interpolateNumber(
      from.borderTopLeftRadius,
      to.borderTopLeftRadius
    ),
    borderTopRightRadius: interpolateNumber(
      from.borderTopRightRadius,
      to.borderTopRightRadius
    ),
    borderWidth: interpolateNumber(from.borderWidth, to.borderWidth)!,
    contentGap: interpolateNumber(from.contentGap, to.contentGap),
    textColor: interpolateColorValue(from.textColor, to.textColor, progress)!,
    textSize: interpolateNumber(from.textSize, to.textSize)!,
  };
};

const palettesEqual = (
  left: ResolvedStylePalette,
  right: ResolvedStylePalette
) =>
  Object.keys(left).every(
    (key) =>
      left[key as keyof ResolvedStylePalette] ===
      right[key as keyof ResolvedStylePalette]
  );

const useResolvedStyleTransition = ({
  target,
  duration,
  curve,
  reduceMotion,
  skipAnimation,
}: {
  target: ResolvedStylePalette;
  duration: number;
  curve?: AwesomeButtonAnimationCurve;
  reduceMotion: boolean;
  skipAnimation: boolean;
}) => {
  const [displayed, setDisplayed] = useState(target);
  const displayedRef = useRef(target);

  useEffect(() => {
    if (palettesEqual(displayedRef.current, target)) return undefined;
    if (skipAnimation || reduceMotion || duration === 0) {
      displayedRef.current = target;
      setDisplayed(target);
      return undefined;
    }

    const from = displayedRef.current;
    const transition = runTimedTransition({
      duration,
      easing: curve ?? Easing.out(Easing.cubic),
      onUpdate: (progress) => {
        const next = interpolatePalette(from, target, progress);
        displayedRef.current = next;
        setDisplayed(next);
      },
      onComplete: () => {
        displayedRef.current = target;
        setDisplayed(target);
      },
    });

    return transition.stop;
  }, [curve, duration, reduceMotion, skipAnimation, target]);

  return displayed;
};

export default useResolvedStyleTransition;
export type { ResolvedStylePalette };
