import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  Easing,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
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

type HiddenMeasurementRequest = {
  id: number;
  text: string;
};

type SizeAnimatedStyles = {
  container: StyleProp<ViewStyle> | null;
  shadow: StyleProp<ViewStyle> | null;
  bottom: StyleProp<ViewStyle> | null;
  progress: StyleProp<ViewStyle> | null;
  content: StyleProp<ViewStyle> | null;
  activeBackground: StyleProp<ViewStyle> | null;
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
  animatedOpacity: Animated.Value;
  after?: ReactNode;
  before?: ReactNode;
  children: ReactNode;
  extra?: ReactNode;
  height: number;
  paddingBottom: number;
  paddingTop: number;
  raiseLevel: number;
  stretch?: boolean;
  textTransition?: boolean;
  width: ButtonWidth;
};

type UseButtonSizeBehaviorResult = {
  displayedText: string | null;
  hiddenMeasurementKey: string | null;
  hiddenMeasurementText: string | null;
  onHiddenMeasurementLayout: (event: LayoutChangeEvent) => void;
  onVisibleContentLayout: (event: LayoutChangeEvent) => void;
  resolvedWidth: number | null;
  sizeAnimatedStyles: SizeAnimatedStyles;
};

const useButtonSizeBehavior = ({
  animateSize = true,
  animatedOpacity,
  after = null,
  before = null,
  children,
  extra = null,
  height,
  paddingBottom,
  paddingTop,
  raiseLevel,
  stretch,
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
  const initialHiddenMeasurementRequest =
    canChoreographAutoWidthText && stringChildren !== null
      ? {
          id: 0,
          text: stringChildren,
        }
      : null;
  const [displayedText, setDisplayedText] = useState<string | null>(
    stringChildren
  );
  const [stateWidth, setStateWidth] = useState<number | null>(
    widthMode === 'fixed' && typeof width === 'number' ? width : null
  );
  const [hiddenMeasurementRequest, setHiddenMeasurementRequest] =
    useState<HiddenMeasurementRequest | null>(initialHiddenMeasurementRequest);
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
  const widthAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const heightAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const widthAnimationTokenRef = useRef(0);
  const heightAnimationTokenRef = useRef(0);
  const hiddenMeasurementRequestRef = useRef<HiddenMeasurementRequest | null>(
    initialHiddenMeasurementRequest
  );
  const textRunIdRef = useRef(0);
  const didInitializeTextRef = useRef(false);
  const didInitializeSizeRef = useRef(false);
  const isWidthAnimatingRef = useRef(false);
  const isHeightAnimatingRef = useRef(false);
  const [isWidthAnimating, setIsWidthAnimating] = useState(false);
  const [isHeightAnimating, setIsHeightAnimating] = useState(false);
  const animatedWidth = useRef(
    new Animated.Value(
      widthMode === 'fixed' && typeof width === 'number' ? width : 0
    )
  ).current;
  const animatedContainerHeight = useRef(
    new Animated.Value(currentHeightDimensionsRef.current.container)
  ).current;
  const animatedFaceHeight = useRef(
    new Animated.Value(currentHeightDimensionsRef.current.face)
  ).current;
  const animatedShadowHeight = useRef(
    new Animated.Value(currentHeightDimensionsRef.current.shadow)
  ).current;

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

  const syncStateWidth = useCallback((value: number | null) => {
    currentWidthValueRef.current = value;

    if (widthModeRef.current === 'auto') {
      setStateWidth((currentValue) =>
        currentValue === value ? currentValue : value
      );
    }
  }, []);

  const snapshotWidthAnimation = useCallback(
    (callback: (value: number | null) => void) => {
      if (isWidthAnimatingRef.current !== true) {
        callback(currentWidthValueRef.current);
        return;
      }

      animatedWidth.stopAnimation((value) => {
        widthAnimationRef.current?.stop();
        widthAnimationRef.current = null;
        setWidthAnimatingFlag(false);
        const resolvedValue =
          typeof value === 'number' ? value : currentWidthValueRef.current;

        syncStateWidth(resolvedValue);
        callback(resolvedValue);
      });
    },
    [animatedWidth, setWidthAnimatingFlag, syncStateWidth]
  );

  const setWidthImmediately = useCallback(
    (nextWidth: number | null) => {
      widthAnimationTokenRef.current += 1;
      widthAnimationRef.current?.stop();
      widthAnimationRef.current = null;
      setWidthAnimatingFlag(false);

      if (nextWidth !== null) {
        animatedWidth.setValue(nextWidth);
      }

      syncStateWidth(nextWidth);
    },
    [animatedWidth, setWidthAnimatingFlag, syncStateWidth]
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

        animatedWidth.setValue(snapshotWidth);
        syncStateWidth(nextWidth);
        setWidthAnimatingFlag(true);

        const animation = Animated.timing(animatedWidth, {
          duration: SIZE_ANIMATION_DURATION,
          easing: SIZE_ANIMATION_EASING,
          toValue: nextWidth,
          useNativeDriver: false,
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
          syncStateWidth(nextWidth);
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
      syncStateWidth,
    ]
  );

  const snapshotHeightAnimation = useCallback(
    (callback: (value: HeightDimensions) => void) => {
      if (isHeightAnimatingRef.current !== true) {
        callback(currentHeightDimensionsRef.current);
        return;
      }

      animatedContainerHeight.stopAnimation((containerValue) => {
        animatedFaceHeight.stopAnimation((faceValue) => {
          animatedShadowHeight.stopAnimation((shadowValue) => {
            heightAnimationRef.current?.stop();
            heightAnimationRef.current = null;
            setHeightAnimatingFlag(false);

            const nextSnapshot = {
              container:
                typeof containerValue === 'number'
                  ? containerValue
                  : currentHeightDimensionsRef.current.container,
              face:
                typeof faceValue === 'number'
                  ? faceValue
                  : currentHeightDimensionsRef.current.face,
              shadow:
                typeof shadowValue === 'number'
                  ? shadowValue
                  : currentHeightDimensionsRef.current.shadow,
            };

            callback(nextSnapshot);
          });
        });
      });
    },
    [
      animatedContainerHeight,
      animatedFaceHeight,
      animatedShadowHeight,
      setHeightAnimatingFlag,
    ]
  );

  const setHeightImmediately = useCallback(
    (nextDimensions: HeightDimensions) => {
      heightAnimationTokenRef.current += 1;
      heightAnimationRef.current?.stop();
      heightAnimationRef.current = null;
      setHeightAnimatingFlag(false);
      currentHeightDimensionsRef.current = nextDimensions;
      animatedContainerHeight.setValue(nextDimensions.container);
      animatedFaceHeight.setValue(nextDimensions.face);
      animatedShadowHeight.setValue(nextDimensions.shadow);
    },
    [
      animatedContainerHeight,
      animatedFaceHeight,
      animatedShadowHeight,
      setHeightAnimatingFlag,
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
        currentHeightDimensionsRef.current = nextDimensions;
        animatedContainerHeight.setValue(snapshot.container);
        animatedFaceHeight.setValue(snapshot.face);
        animatedShadowHeight.setValue(snapshot.shadow);
        setHeightAnimatingFlag(true);

        const animation = Animated.parallel([
          Animated.timing(animatedContainerHeight, {
            duration: SIZE_ANIMATION_DURATION,
            easing: SIZE_ANIMATION_EASING,
            toValue: nextDimensions.container,
            useNativeDriver: false,
          }),
          Animated.timing(animatedFaceHeight, {
            duration: SIZE_ANIMATION_DURATION,
            easing: SIZE_ANIMATION_EASING,
            toValue: nextDimensions.face,
            useNativeDriver: false,
          }),
          Animated.timing(animatedShadowHeight, {
            duration: SIZE_ANIMATION_DURATION,
            easing: SIZE_ANIMATION_EASING,
            toValue: nextDimensions.shadow,
            useNativeDriver: false,
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
          currentHeightDimensionsRef.current = nextDimensions;
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

  const requestHiddenMeasurement = useCallback((text: string) => {
    const nextRequest = {
      id: textRunIdRef.current,
      text,
    };

    hiddenMeasurementRequestRef.current = nextRequest;
    setHiddenMeasurementRequest((currentValue) => {
      if (
        currentValue !== null &&
        currentValue.id === nextRequest.id &&
        currentValue.text === nextRequest.text
      ) {
        return currentValue;
      }

      return nextRequest;
    });
  }, []);

  const onHiddenMeasurementLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const request = hiddenMeasurementRequestRef.current;

      if (request === null) {
        return;
      }

      hiddenMeasurementRequestRef.current = null;
      setHiddenMeasurementRequest(null);

      const nextWidth = event.nativeEvent.layout.width;
      const flow = getAutoWidthTextFlow(
        currentWidthValueRef.current,
        nextWidth
      );
      const requestId = request.id;

      if (textRunIdRef.current !== requestId) {
        return;
      }

      animatedOpacity.setValue(1);

      if (flow === 'initial') {
        setWidthImmediately(nextWidth);
        syncDisplayedText(request.text);
        return;
      }

      if (flow === 'text-only') {
        runTextPhase(requestId, request.text);
        return;
      }

      if (flow === 'grow-first') {
        animateWidthTo(nextWidth, () => {
          if (textRunIdRef.current !== requestId) {
            return;
          }

          runTextPhase(requestId, request.text);
        });
        return;
      }

      runTextPhase(requestId, request.text, () => {
        if (textRunIdRef.current !== requestId) {
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

      animatedOpacity.setValue(1);

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

  useEffect(() => {
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
      currentHeightDimensionsRef.current = nextHeightDimensions;
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
        animatedOpacity.setValue(1);
        setWidthImmediately(width);
      } else if (widthMode === 'stretch') {
        animatedOpacity.setValue(1);
        setWidthImmediately(null);
      } else {
        animatedOpacity.setValue(0);
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
        requestHiddenMeasurement(nextText);
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
        requestHiddenMeasurement(nextText);
      });
      return;
    }

    hiddenMeasurementRequestRef.current = null;
    setHiddenMeasurementRequest(null);
    runTextPhase(nextRunId, nextText);
  }, [
    canChoreographAutoWidthText,
    requestHiddenMeasurement,
    runTextPhase,
    snapshotWidthAnimation,
    stopTextTransition,
    stringChildren,
    syncDisplayedText,
  ]);

  useEffect(() => {
    if (canChoreographAutoWidthText === true) {
      return;
    }

    hiddenMeasurementRequestRef.current = null;
    setHiddenMeasurementRequest(null);
  }, [canChoreographAutoWidthText]);

  useEffect(
    () => () => {
      stopTextTransition();
      widthAnimationRef.current?.stop();
      heightAnimationRef.current?.stop();
    },
    [stopTextTransition]
  );

  const sizeAnimatedStyles = useMemo<SizeAnimatedStyles>(
    () => ({
      container:
        isWidthAnimating === true || isHeightAnimating === true
          ? {
              ...(isWidthAnimating === true && widthMode !== 'stretch'
                ? { width: animatedWidth }
                : null),
              ...(isHeightAnimating === true
                ? { height: animatedContainerHeight }
                : null),
            }
          : null,
      shadow:
        isHeightAnimating === true
          ? {
              height: animatedShadowHeight,
            }
          : null,
      bottom:
        isWidthAnimating === true || isHeightAnimating === true
          ? {
              ...(isWidthAnimating === true && widthMode !== 'stretch'
                ? { width: animatedWidth }
                : null),
              ...(isHeightAnimating === true
                ? { height: animatedFaceHeight }
                : null),
            }
          : null,
      progress:
        isWidthAnimating === true || isHeightAnimating === true
          ? {
              ...(isWidthAnimating === true && widthMode !== 'stretch'
                ? { width: animatedWidth }
                : null),
              ...(isHeightAnimating === true
                ? { height: animatedFaceHeight }
                : null),
            }
          : null,
      content:
        isWidthAnimating === true || isHeightAnimating === true
          ? {
              ...(isWidthAnimating === true && widthMode !== 'stretch'
                ? { width: animatedWidth }
                : null),
              ...(isHeightAnimating === true
                ? { height: animatedFaceHeight }
                : null),
            }
          : null,
      activeBackground:
        isWidthAnimating === true || isHeightAnimating === true
          ? {
              ...(isWidthAnimating === true && widthMode !== 'stretch'
                ? { width: animatedWidth }
                : null),
              ...(isHeightAnimating === true
                ? { height: animatedFaceHeight }
                : null),
            }
          : null,
    }),
    [
      animatedContainerHeight,
      animatedFaceHeight,
      animatedShadowHeight,
      animatedWidth,
      isHeightAnimating,
      isWidthAnimating,
      widthMode,
    ]
  );

  return {
    displayedText,
    hiddenMeasurementKey:
      hiddenMeasurementRequest !== null
        ? `aws-btn-hidden-measure-${hiddenMeasurementRequest.id}`
        : null,
    hiddenMeasurementText: hiddenMeasurementRequest?.text ?? null,
    onHiddenMeasurementLayout,
    onVisibleContentLayout,
    resolvedWidth:
      widthMode === 'fixed' && typeof width === 'number' ? width : stateWidth,
    sizeAnimatedStyles,
  };
};

export default useButtonSizeBehavior;

export const getHiddenMeasurementTextStyle = ({
  textColor,
  textFontFamily,
  textLineHeight,
  textSize,
}: {
  textColor?: string;
  textFontFamily?: string;
  textLineHeight?: number;
  textSize?: number;
}): StyleProp<TextStyle> => ({
  color: textColor,
  fontFamily: textFontFamily,
  fontSize: textSize,
  fontWeight: 'bold',
  lineHeight: textLineHeight,
  textAlign: 'center',
});

export const getHiddenMeasurementContainerStyle = ({
  borderWidth,
  paddingBottom,
  paddingHorizontal,
  paddingTop,
}: {
  borderWidth: number;
  paddingBottom: number;
  paddingHorizontal: number;
  paddingTop: number;
}): StyleProp<ViewStyle> => ({
  alignSelf: 'flex-start',
  borderWidth,
  flexDirection: 'row',
  opacity: 0,
  paddingBottom,
  paddingHorizontal,
  paddingTop,
  position: 'absolute',
});
