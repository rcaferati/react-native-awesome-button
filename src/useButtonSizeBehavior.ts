import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  type AnimatedStyle,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {
  getAutoWidthMeasurementSignature,
  requestAutoWidthMeasurement,
} from './autoWidthMeasurement';
import {
  animateParallel,
  animateTiming,
  setAnimatedValue,
  type ReanimatedAnimationHandle,
} from './helpers';
import { runTextTransition } from './textTransition';
import type { ButtonWidth } from './types';

const SIZE_ANIMATION_DURATION = 125;
const SIZE_ANIMATION_EASING = Easing.bezier(0.3, 0.05, 0.2, 1);

type WidthMode = 'auto' | 'fixed' | 'stretch';

type HeightDimensions = {
  container: number;
  face: number;
  shadow: number;
};

type SizeAnimatedStyles = {
  container: StyleProp<ViewStyle> | AnimatedStyle<ViewStyle> | null;
  shadow: StyleProp<ViewStyle> | AnimatedStyle<ViewStyle> | null;
  bottom: StyleProp<ViewStyle> | AnimatedStyle<ViewStyle> | null;
  progress: StyleProp<ViewStyle> | AnimatedStyle<ViewStyle> | null;
  content: StyleProp<ViewStyle> | AnimatedStyle<ViewStyle> | null;
  activeBackground: StyleProp<ViewStyle> | AnimatedStyle<ViewStyle> | null;
};

const isNonEmptyString = (value: ReactNode): value is string =>
  typeof value === 'string' && value.length > 0;

const getWidthMode = (width: ButtonWidth, stretch?: boolean): WidthMode => {
  if (stretch === true) {
    return 'stretch';
  }

  if (width === null) {
    return 'auto';
  }

  return 'fixed';
};

const getHeightDimensions = (
  height: number,
  paddingTop: number,
  paddingBottom: number,
  raiseLevel: number
): HeightDimensions => ({
  container: height + paddingTop + paddingBottom,
  face: height + paddingTop + paddingBottom - raiseLevel,
  shadow: height - raiseLevel,
});

const areHeightDimensionsEqual = (
  currentValue: HeightDimensions,
  nextValue: HeightDimensions
) =>
  currentValue.container === nextValue.container &&
  currentValue.face === nextValue.face &&
  currentValue.shadow === nextValue.shadow;

export const getAutoWidthTextFlow = (
  currentWidth: number | null,
  nextWidth: number
) => {
  if (currentWidth === null) {
    return 'initial';
  }

  if (currentWidth === nextWidth) {
    return 'text-only';
  }

  if (nextWidth > currentWidth) {
    return 'grow-first';
  }

  return 'shrink-last';
};

type UseButtonSizeBehaviorParams = {
  animateSize?: boolean;
  animatedOpacity: SharedValue<number>;
  after?: ReactNode;
  before?: ReactNode;
  borderWidth: number;
  children: ReactNode;
  extra?: ReactNode;
  height: number;
  paddingBottom: number;
  paddingHorizontal: number;
  paddingTop: number;
  raiseLevel: number;
  stretch?: boolean;
  textColor?: string;
  textFontFamily?: string;
  textLineHeight?: number;
  textSize?: number;
  textTransition?: boolean;
  width: ButtonWidth;
};

type UseButtonSizeBehaviorResult = {
  displayedText: string | null;
  measurementHostEnabled: boolean;
  onVisibleContentLayout: (event: LayoutChangeEvent) => void;
  resolvedWidth: number | null;
  resolvedHeightDimensions: HeightDimensions;
  sizeAnimatedStyles: SizeAnimatedStyles;
};

const useButtonSizeBehavior = ({
  animateSize = true,
  animatedOpacity,
  after = null,
  before = null,
  borderWidth,
  children,
  extra = null,
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
  textTransition = false,
  width,
}: UseButtonSizeBehaviorParams): UseButtonSizeBehaviorResult => {
  const stringChildren = isNonEmptyString(children) ? children : null;
  const widthMode = getWidthMode(width, stretch);
  const canChoreographAutoWidthText =
    widthMode === 'auto' &&
    stringChildren !== null &&
    before === null &&
    after === null &&
    extra === null;
  const [displayedText, setDisplayedText] = useState<string | null>(
    stringChildren
  );
  const [resolvedWidth, setResolvedWidth] = useState<number | null>(
    widthMode === 'fixed' && typeof width === 'number' ? width : null
  );
  const [resolvedHeightDimensions, setResolvedHeightDimensions] =
    useState<HeightDimensions>(
      getHeightDimensions(height, paddingTop, paddingBottom, raiseLevel)
    );
  const displayedTextRef = useRef<string | null>(stringChildren);
  const currentTargetTextRef = useRef<string | null>(stringChildren);
  const widthModeRef = useRef<WidthMode>(widthMode);
  const currentWidthValueRef = useRef<number | null>(
    widthMode === 'fixed' && typeof width === 'number' ? width : null
  );
  const currentHeightDimensionsRef = useRef<HeightDimensions>(
    getHeightDimensions(height, paddingTop, paddingBottom, raiseLevel)
  );
  const textTransitionControllerRef = useRef<{
    stop: () => void;
  } | null>(null);
  const widthAnimationRef = useRef<ReanimatedAnimationHandle | null>(null);
  const heightAnimationRef = useRef<ReanimatedAnimationHandle | null>(null);
  const widthAnimationTokenRef = useRef(0);
  const heightAnimationTokenRef = useRef(0);
  const textRunIdRef = useRef(0);
  const didInitializeTextRef = useRef(false);
  const didInitializeSizeRef = useRef(false);
  const isMountedRef = useRef(true);
  const isWidthAnimatingRef = useRef(false);
  const isHeightAnimatingRef = useRef(false);
  const [isWidthAnimating, setIsWidthAnimating] = useState(false);
  const [isHeightAnimating, setIsHeightAnimating] = useState(false);
  const animatedWidth = useSharedValue(
    widthMode === 'fixed' && typeof width === 'number' ? width : 0
  );
  const animatedContainerHeight = useSharedValue(
    currentHeightDimensionsRef.current.container
  );
  const animatedFaceHeight = useSharedValue(
    currentHeightDimensionsRef.current.face
  );
  const animatedShadowHeight = useSharedValue(
    currentHeightDimensionsRef.current.shadow
  );

  const setWidthAnimatingFlag = useCallback((value: boolean) => {
    isWidthAnimatingRef.current = value;
    setIsWidthAnimating(value);
  }, []);

  const setHeightAnimatingFlag = useCallback((value: boolean) => {
    isHeightAnimatingRef.current = value;
    setIsHeightAnimating(value);
  }, []);

  const syncDisplayedText = useCallback((value: string | null) => {
    displayedTextRef.current = value;
    setDisplayedText((currentValue) =>
      currentValue === value ? currentValue : value
    );
  }, []);

  const stopTextTransition = useCallback(() => {
    if (textTransitionControllerRef.current !== null) {
      textTransitionControllerRef.current.stop();
      textTransitionControllerRef.current = null;
    }
  }, []);

  const syncResolvedWidth = useCallback((value: number | null) => {
    currentWidthValueRef.current = value;
    setResolvedWidth((currentValue) =>
      currentValue === value ? currentValue : value
    );
  }, []);

  const syncResolvedHeight = useCallback((value: HeightDimensions) => {
    currentHeightDimensionsRef.current = value;
    setResolvedHeightDimensions((currentValue) =>
      areHeightDimensionsEqual(currentValue, value) ? currentValue : value
    );
  }, []);

  const snapshotWidthAnimation = useCallback(
    (callback: (value: number | null) => void) => {
      if (isWidthAnimatingRef.current !== true) {
        callback(currentWidthValueRef.current);
        return;
      }

      widthAnimationRef.current?.stop();
      widthAnimationRef.current = null;
      setWidthAnimatingFlag(false);
      const resolvedValue =
        typeof animatedWidth.value === 'number'
          ? animatedWidth.value
          : currentWidthValueRef.current;

      syncResolvedWidth(resolvedValue);
      callback(resolvedValue);
    },
    [animatedWidth, setWidthAnimatingFlag, syncResolvedWidth]
  );

  const setWidthImmediately = useCallback(
    (nextWidth: number | null) => {
      widthAnimationTokenRef.current += 1;
      widthAnimationRef.current?.stop();
      widthAnimationRef.current = null;
      setWidthAnimatingFlag(false);

      setAnimatedValue(animatedWidth, nextWidth ?? 0);

      syncResolvedWidth(nextWidth);
    },
    [animatedWidth, setWidthAnimatingFlag, syncResolvedWidth]
  );

  const animateWidthTo = useCallback(
    (nextWidth: number, onComplete?: () => void) => {
      if (
        animateSize !== true ||
        currentWidthValueRef.current === null ||
        currentWidthValueRef.current === nextWidth
      ) {
        setWidthImmediately(nextWidth);
        onComplete?.();
        return;
      }

      snapshotWidthAnimation((snapshotWidth) => {
        if (snapshotWidth === null || snapshotWidth === nextWidth) {
          setWidthImmediately(nextWidth);
          onComplete?.();
          return;
        }

        widthAnimationTokenRef.current += 1;
        const animationToken = widthAnimationTokenRef.current;

        setAnimatedValue(animatedWidth, snapshotWidth);
        setWidthAnimatingFlag(true);

        const animation = animateTiming({
          variable: animatedWidth,
          duration: SIZE_ANIMATION_DURATION,
          easing: SIZE_ANIMATION_EASING,
          toValue: nextWidth,
        });

        widthAnimationRef.current = animation;
        animation.start(({ finished }) => {
          if (
            finished !== true ||
            widthAnimationTokenRef.current !== animationToken
          ) {
            return;
          }

          widthAnimationRef.current = null;
          setWidthAnimatingFlag(false);
          syncResolvedWidth(nextWidth);
          onComplete?.();
        });
      });
    },
    [
      animateSize,
      animatedWidth,
      setWidthAnimatingFlag,
      setWidthImmediately,
      snapshotWidthAnimation,
      syncResolvedWidth,
    ]
  );

  const snapshotHeightAnimation = useCallback(
    (callback: (value: HeightDimensions) => void) => {
      if (isHeightAnimatingRef.current !== true) {
        callback(currentHeightDimensionsRef.current);
        return;
      }

      heightAnimationRef.current?.stop();
      heightAnimationRef.current = null;
      setHeightAnimatingFlag(false);

      const nextSnapshot = {
        container:
          typeof animatedContainerHeight.value === 'number'
            ? animatedContainerHeight.value
            : currentHeightDimensionsRef.current.container,
        face:
          typeof animatedFaceHeight.value === 'number'
            ? animatedFaceHeight.value
            : currentHeightDimensionsRef.current.face,
        shadow:
          typeof animatedShadowHeight.value === 'number'
            ? animatedShadowHeight.value
            : currentHeightDimensionsRef.current.shadow,
      };

      syncResolvedHeight(nextSnapshot);
      callback(nextSnapshot);
    },
    [
      animatedContainerHeight,
      animatedFaceHeight,
      animatedShadowHeight,
      setHeightAnimatingFlag,
      syncResolvedHeight,
    ]
  );

  const setHeightImmediately = useCallback(
    (nextDimensions: HeightDimensions) => {
      heightAnimationTokenRef.current += 1;
      heightAnimationRef.current?.stop();
      heightAnimationRef.current = null;
      setHeightAnimatingFlag(false);
      syncResolvedHeight(nextDimensions);
      setAnimatedValue(animatedContainerHeight, nextDimensions.container);
      setAnimatedValue(animatedFaceHeight, nextDimensions.face);
      setAnimatedValue(animatedShadowHeight, nextDimensions.shadow);
    },
    [
      animatedContainerHeight,
      animatedFaceHeight,
      animatedShadowHeight,
      setHeightAnimatingFlag,
      syncResolvedHeight,
    ]
  );

  const animateHeightTo = useCallback(
    (nextDimensions: HeightDimensions) => {
      if (
        animateSize !== true ||
        areHeightDimensionsEqual(
          currentHeightDimensionsRef.current,
          nextDimensions
        )
      ) {
        setHeightImmediately(nextDimensions);
        return;
      }

      snapshotHeightAnimation((snapshot) => {
        if (areHeightDimensionsEqual(snapshot, nextDimensions)) {
          setHeightImmediately(nextDimensions);
          return;
        }

        heightAnimationTokenRef.current += 1;
        const animationToken = heightAnimationTokenRef.current;
        setAnimatedValue(animatedContainerHeight, snapshot.container);
        setAnimatedValue(animatedFaceHeight, snapshot.face);
        setAnimatedValue(animatedShadowHeight, snapshot.shadow);
        setHeightAnimatingFlag(true);

        const animation = animateParallel([
          animateTiming({
            variable: animatedContainerHeight,
            duration: SIZE_ANIMATION_DURATION,
            easing: SIZE_ANIMATION_EASING,
            toValue: nextDimensions.container,
          }),
          animateTiming({
            variable: animatedFaceHeight,
            duration: SIZE_ANIMATION_DURATION,
            easing: SIZE_ANIMATION_EASING,
            toValue: nextDimensions.face,
          }),
          animateTiming({
            variable: animatedShadowHeight,
            duration: SIZE_ANIMATION_DURATION,
            easing: SIZE_ANIMATION_EASING,
            toValue: nextDimensions.shadow,
          }),
        ]);

        heightAnimationRef.current = animation;
        animation.start(({ finished }) => {
          if (
            finished !== true ||
            heightAnimationTokenRef.current !== animationToken
          ) {
            return;
          }

          heightAnimationRef.current = null;
          setHeightAnimatingFlag(false);
          syncResolvedHeight(nextDimensions);
        });
      });
    },
    [
      animateSize,
      animatedContainerHeight,
      animatedFaceHeight,
      animatedShadowHeight,
      setHeightAnimatingFlag,
      setHeightImmediately,
      snapshotHeightAnimation,
      syncResolvedHeight,
    ]
  );

  const runTextPhase = useCallback(
    (nextRunId: number, targetText: string | null, onComplete?: () => void) => {
      stopTextTransition();

      if (
        textTransition !== true ||
        !isNonEmptyString(targetText) ||
        !isNonEmptyString(displayedTextRef.current) ||
        displayedTextRef.current === targetText
      ) {
        syncDisplayedText(targetText);
        onComplete?.();
        return;
      }

      const fromText = displayedTextRef.current;

      textTransitionControllerRef.current = runTextTransition({
        fromText,
        targetText,
        onUpdate: syncDisplayedText,
        onComplete: () => {
          textTransitionControllerRef.current = null;

          if (textRunIdRef.current !== nextRunId) {
            return;
          }

          syncDisplayedText(targetText);
          onComplete?.();
        },
      });
    },
    [stopTextTransition, syncDisplayedText, textTransition]
  );

  const resolveMeasuredTextWidth = useCallback(
    (requestId: number, targetText: string, nextWidth: number) => {
      const flow = getAutoWidthTextFlow(
        currentWidthValueRef.current,
        nextWidth
      );

      if (isMountedRef.current !== true || textRunIdRef.current !== requestId) {
        return;
      }

      setAnimatedValue(animatedOpacity, 1);

      if (flow === 'initial') {
        setWidthImmediately(nextWidth);
        syncDisplayedText(targetText);
        return;
      }

      if (flow === 'text-only') {
        runTextPhase(requestId, targetText);
        return;
      }

      if (flow === 'grow-first') {
        if (textTransition === true) {
          animateWidthTo(nextWidth);
          runTextPhase(requestId, targetText);
          return;
        }

        animateWidthTo(nextWidth, () => {
          if (
            isMountedRef.current !== true ||
            textRunIdRef.current !== requestId
          ) {
            return;
          }

          runTextPhase(requestId, targetText);
        });
        return;
      }

      runTextPhase(requestId, targetText, () => {
        if (
          isMountedRef.current !== true ||
          textRunIdRef.current !== requestId
        ) {
          return;
        }

        animateWidthTo(nextWidth);
      });
    },
    [
      animateWidthTo,
      animatedOpacity,
      runTextPhase,
      setWidthImmediately,
      syncDisplayedText,
      textTransition,
    ]
  );

  const requestMeasuredTextWidth = useCallback(
    (requestId: number, targetText: string) => {
      requestAutoWidthMeasurement({
        borderWidth,
        paddingBottom,
        paddingHorizontal,
        paddingTop,
        signature: getAutoWidthMeasurementSignature({
          borderWidth,
          paddingHorizontal,
          text: targetText,
          textFontFamily,
          textSize,
        }),
        text: targetText,
        textColor,
        textFontFamily,
        textLineHeight,
        textSize,
      }).then((measuredWidth) => {
        resolveMeasuredTextWidth(requestId, targetText, measuredWidth);
      });
    },
    [
      borderWidth,
      paddingBottom,
      paddingHorizontal,
      paddingTop,
      resolveMeasuredTextWidth,
      textColor,
      textFontFamily,
      textLineHeight,
      textSize,
    ]
  );

  const onVisibleContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (
        widthModeRef.current !== 'auto' ||
        canChoreographAutoWidthText === true
      ) {
        return;
      }

      const nextWidth = event.nativeEvent.layout.width;

      setAnimatedValue(animatedOpacity, 1);

      if (currentWidthValueRef.current === null || animateSize !== true) {
        setWidthImmediately(nextWidth);
        return;
      }

      animateWidthTo(nextWidth);
    },
    [
      animateSize,
      animateWidthTo,
      animatedOpacity,
      canChoreographAutoWidthText,
      setWidthImmediately,
    ]
  );

  useLayoutEffect(() => {
    const nextHeightDimensions = getHeightDimensions(
      height,
      paddingTop,
      paddingBottom,
      raiseLevel
    );
    const previousWidthMode = widthModeRef.current;

    widthModeRef.current = widthMode;

    if (didInitializeSizeRef.current !== true) {
      didInitializeSizeRef.current = true;
      setHeightImmediately(nextHeightDimensions);

      if (widthMode === 'fixed' && typeof width === 'number') {
        setWidthImmediately(width);
      } else if (widthMode === 'auto') {
        setWidthImmediately(null);
      }

      return;
    }

    if (previousWidthMode !== widthMode) {
      stopTextTransition();
      textRunIdRef.current += 1;
      setHeightImmediately(nextHeightDimensions);

      if (widthMode === 'fixed' && typeof width === 'number') {
        setAnimatedValue(animatedOpacity, 1);
        setWidthImmediately(width);
      } else if (widthMode === 'stretch') {
        setAnimatedValue(animatedOpacity, 1);
        setWidthImmediately(null);
      } else {
        setAnimatedValue(animatedOpacity, 0);
        setWidthImmediately(null);
      }

      return;
    }

    if (widthMode === 'fixed' && typeof width === 'number') {
      animateWidthTo(width);
    }

    animateHeightTo(nextHeightDimensions);
  }, [
    animateHeightTo,
    animateWidthTo,
    animatedOpacity,
    height,
    paddingBottom,
    paddingTop,
    raiseLevel,
    setHeightImmediately,
    setWidthImmediately,
    stopTextTransition,
    width,
    widthMode,
  ]);

  useEffect(() => {
    const nextText = stringChildren;
    const nextRunId = textRunIdRef.current + 1;

    if (didInitializeTextRef.current !== true) {
      didInitializeTextRef.current = true;
      currentTargetTextRef.current = nextText;
      textRunIdRef.current = nextRunId;
      syncDisplayedText(nextText);

      if (canChoreographAutoWidthText === true && nextText !== null) {
        requestMeasuredTextWidth(nextRunId, nextText);
      }

      return;
    }

    if (nextText === currentTargetTextRef.current) {
      return;
    }

    currentTargetTextRef.current = nextText;
    textRunIdRef.current = nextRunId;
    stopTextTransition();

    if (canChoreographAutoWidthText === true && nextText !== null) {
      snapshotWidthAnimation(() => {
        requestMeasuredTextWidth(nextRunId, nextText);
      });
      return;
    }

    runTextPhase(nextRunId, nextText);
  }, [
    canChoreographAutoWidthText,
    requestMeasuredTextWidth,
    runTextPhase,
    snapshotWidthAnimation,
    stopTextTransition,
    stringChildren,
    syncDisplayedText,
  ]);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      stopTextTransition();
      widthAnimationRef.current?.stop();
      heightAnimationRef.current?.stop();
    },
    [stopTextTransition]
  );

  const animatedContainerStyle = useAnimatedStyle(
    () => ({
      ...(isWidthAnimating === true && widthMode !== 'stretch'
        ? { width: animatedWidth.value }
        : null),
      ...(isHeightAnimating === true
        ? { height: animatedContainerHeight.value }
        : null),
    }),
    [isHeightAnimating, isWidthAnimating, widthMode]
  );
  const animatedShadowStyle = useAnimatedStyle(
    () => ({
      ...(isHeightAnimating === true
        ? { height: animatedShadowHeight.value }
        : null),
    }),
    [isHeightAnimating]
  );
  const animatedFaceStyle = useAnimatedStyle(
    () => ({
      ...(isWidthAnimating === true && widthMode !== 'stretch'
        ? { width: animatedWidth.value }
        : null),
      ...(isHeightAnimating === true
        ? { height: animatedFaceHeight.value }
        : null),
    }),
    [isHeightAnimating, isWidthAnimating, widthMode]
  );

  const sizeAnimatedStyles = useMemo<SizeAnimatedStyles>(
    () => ({
      container:
        isWidthAnimating === true || isHeightAnimating === true
          ? animatedContainerStyle
          : null,
      shadow: isHeightAnimating === true ? animatedShadowStyle : null,
      bottom:
        isWidthAnimating === true || isHeightAnimating === true
          ? animatedFaceStyle
          : null,
      progress:
        isWidthAnimating === true || isHeightAnimating === true
          ? animatedFaceStyle
          : null,
      content:
        isWidthAnimating === true || isHeightAnimating === true
          ? animatedFaceStyle
          : null,
      activeBackground:
        isWidthAnimating === true || isHeightAnimating === true
          ? animatedFaceStyle
          : null,
    }),
    [
      animatedContainerStyle,
      animatedFaceStyle,
      animatedShadowStyle,
      isHeightAnimating,
      isWidthAnimating,
    ]
  );

  return {
    displayedText,
    measurementHostEnabled: canChoreographAutoWidthText,
    onVisibleContentLayout,
    resolvedWidth,
    resolvedHeightDimensions,
    sizeAnimatedStyles,
  };
};

export default useButtonSizeBehavior;
