import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Easing } from 'react-native';
import type { ButtonWidth } from '../types';
import {
  getWidthMode,
  type WidthCommandPort,
  type WidthMode,
} from './contracts';

const SIZE_ANIMATION_DURATION = 175;
const SIZE_ANIMATION_EASING = Easing.bezier(0.3, 0.05, 0.2, 1);

type UseButtonWidthOwnerOptions = {
  animateSize: boolean;
  animatedOpacity: Animated.Value;
  reduceMotion: boolean;
  stretch?: boolean;
  width: ButtonWidth;
};

const useButtonWidthOwner = ({
  animateSize,
  animatedOpacity,
  reduceMotion,
  stretch,
  width,
}: UseButtonWidthOwnerOptions) => {
  const widthMode = getWidthMode(width, stretch);
  const initialWidth =
    widthMode === 'fixed' && typeof width === 'number' ? width : null;
  const [stateWidth, setStateWidth] = useState<number | null>(initialWidth);
  const [isAnimating, setIsAnimating] = useState(false);
  const modeRef = useRef<WidthMode>(widthMode);
  const currentValueRef = useRef<number | null>(initialWidth);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const animationTokenRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const didInitializeRef = useRef(false);
  const liveRef = useRef({ animateSize, reduceMotion });
  const animatedWidth = useRef(new Animated.Value(initialWidth ?? 0)).current;

  useLayoutEffect(() => {
    liveRef.current = { animateSize, reduceMotion };
  }, [animateSize, reduceMotion]);

  const setAnimatingFlag = useCallback((value: boolean) => {
    isAnimatingRef.current = value;
    setIsAnimating(value);
  }, []);

  const syncStateWidth = useCallback((value: number | null) => {
    currentValueRef.current = value;
    setStateWidth((currentValue) =>
      currentValue === value ? currentValue : value
    );
  }, []);

  const snapshot = useCallback(
    (callback: (value: number | null) => void) => {
      if (!isAnimatingRef.current) {
        callback(currentValueRef.current);
        return;
      }

      animatedWidth.stopAnimation((value) => {
        animationRef.current?.stop();
        animationRef.current = null;
        setAnimatingFlag(false);
        const resolvedValue =
          typeof value === 'number' ? value : currentValueRef.current;
        syncStateWidth(resolvedValue);
        callback(resolvedValue);
      });
    },
    [animatedWidth, setAnimatingFlag, syncStateWidth]
  );

  const setImmediately = useCallback(
    (nextWidth: number | null) => {
      animationTokenRef.current += 1;
      animationRef.current?.stop();
      animationRef.current = null;
      setAnimatingFlag(false);
      if (nextWidth !== null) animatedWidth.setValue(nextWidth);
      syncStateWidth(nextWidth);
    },
    [animatedWidth, setAnimatingFlag, syncStateWidth]
  );

  const animateTo = useCallback(
    (nextWidth: number, onComplete?: () => void) => {
      const live = liveRef.current;
      if (
        !live.animateSize ||
        live.reduceMotion ||
        currentValueRef.current === null ||
        currentValueRef.current === nextWidth
      ) {
        setImmediately(nextWidth);
        onComplete?.();
        return;
      }

      snapshot((snapshotWidth) => {
        if (snapshotWidth === null || snapshotWidth === nextWidth) {
          setImmediately(nextWidth);
          onComplete?.();
          return;
        }

        animationTokenRef.current += 1;
        const animationToken = animationTokenRef.current;
        animatedWidth.setValue(snapshotWidth);
        syncStateWidth(nextWidth);
        setAnimatingFlag(true);
        const animation = Animated.timing(animatedWidth, {
          duration: SIZE_ANIMATION_DURATION,
          easing: SIZE_ANIMATION_EASING,
          toValue: nextWidth,
          useNativeDriver: false,
        });
        animationRef.current = animation;
        animation.start(({ finished }) => {
          if (!finished || animationTokenRef.current !== animationToken) return;
          animationRef.current = null;
          setAnimatingFlag(false);
          syncStateWidth(nextWidth);
          onComplete?.();
        });
      });
    },
    [animatedWidth, setAnimatingFlag, setImmediately, snapshot, syncStateWidth]
  );

  const getCurrent = useCallback(() => currentValueRef.current, []);
  const commands = useMemo<WidthCommandPort>(
    () => ({ animateTo, getCurrent, setImmediately, snapshot }),
    [animateTo, getCurrent, setImmediately, snapshot]
  );

  useLayoutEffect(() => {
    const previousMode = modeRef.current;
    modeRef.current = widthMode;

    if (!didInitializeRef.current) {
      didInitializeRef.current = true;
      if (widthMode === 'fixed' && typeof width === 'number') {
        setImmediately(width);
      } else if (widthMode === 'auto') {
        setImmediately(null);
      }
      return;
    }

    if (previousMode !== widthMode) {
      if (widthMode === 'fixed' && typeof width === 'number') {
        animatedOpacity.setValue(1);
        setImmediately(width);
      } else if (widthMode === 'stretch') {
        animatedOpacity.setValue(1);
        setImmediately(null);
      } else {
        animatedOpacity.setValue(0);
        setImmediately(null);
      }
      return;
    }

    if (widthMode === 'fixed' && typeof width === 'number') animateTo(width);
  }, [animateTo, animatedOpacity, setImmediately, width, widthMode]);

  useLayoutEffect(() => {
    if (
      widthMode !== 'fixed' ||
      typeof width !== 'number' ||
      (animateSize && !reduceMotion)
    ) {
      return;
    }
    setImmediately(width);
  }, [animateSize, reduceMotion, setImmediately, width, widthMode]);

  useEffect(
    () => () => {
      animationTokenRef.current += 1;
      animationRef.current?.stop();
      animationRef.current = null;
    },
    []
  );

  return {
    animatedWidth,
    commands,
    isAnimating,
    resolvedWidth: stateWidth,
    widthMode,
  };
};

export default useButtonWidthOwner;
