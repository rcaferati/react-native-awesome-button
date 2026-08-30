import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import {
  areHeightDimensionsEqual,
  type HeightDimensions,
  type WidthMode,
} from './contracts';

const SIZE_ANIMATION_DURATION = 175;
const SIZE_ANIMATION_EASING = Easing.bezier(0.3, 0.05, 0.2, 1);

type UseButtonHeightOwnerOptions = {
  animateSize: boolean;
  dimensions: HeightDimensions;
  reduceMotion: boolean;
  widthMode: WidthMode;
};

const useButtonHeightOwner = ({
  animateSize,
  dimensions,
  reduceMotion,
  widthMode,
}: UseButtonHeightOwnerOptions) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const currentRef = useRef(dimensions);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const animationTokenRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const didInitializeRef = useRef(false);
  const widthModeRef = useRef(widthMode);
  const animatedContainerHeight = useRef(
    new Animated.Value(dimensions.container)
  ).current;
  const animatedFaceHeight = useRef(
    new Animated.Value(dimensions.face)
  ).current;
  const animatedShadowHeight = useRef(
    new Animated.Value(dimensions.shadow)
  ).current;

  const setAnimatingFlag = useCallback((value: boolean) => {
    isAnimatingRef.current = value;
    setIsAnimating(value);
  }, []);

  const snapshot = useCallback(
    (callback: (value: HeightDimensions) => void) => {
      if (!isAnimatingRef.current) {
        callback(currentRef.current);
        return;
      }

      animatedContainerHeight.stopAnimation((containerValue) => {
        animatedFaceHeight.stopAnimation((faceValue) => {
          animatedShadowHeight.stopAnimation((shadowValue) => {
            animationRef.current?.stop();
            animationRef.current = null;
            setAnimatingFlag(false);
            callback({
              container:
                typeof containerValue === 'number'
                  ? containerValue
                  : currentRef.current.container,
              face:
                typeof faceValue === 'number'
                  ? faceValue
                  : currentRef.current.face,
              shadow:
                typeof shadowValue === 'number'
                  ? shadowValue
                  : currentRef.current.shadow,
            });
          });
        });
      });
    },
    [
      animatedContainerHeight,
      animatedFaceHeight,
      animatedShadowHeight,
      setAnimatingFlag,
    ]
  );

  const setImmediately = useCallback(
    (next: HeightDimensions) => {
      animationTokenRef.current += 1;
      animationRef.current?.stop();
      animationRef.current = null;
      setAnimatingFlag(false);
      currentRef.current = next;
      animatedContainerHeight.setValue(next.container);
      animatedFaceHeight.setValue(next.face);
      animatedShadowHeight.setValue(next.shadow);
    },
    [
      animatedContainerHeight,
      animatedFaceHeight,
      animatedShadowHeight,
      setAnimatingFlag,
    ]
  );

  const animateTo = useCallback(
    (next: HeightDimensions) => {
      if (
        !animateSize ||
        reduceMotion ||
        areHeightDimensionsEqual(currentRef.current, next)
      ) {
        setImmediately(next);
        return;
      }

      snapshot((current) => {
        if (areHeightDimensionsEqual(current, next)) {
          setImmediately(next);
          return;
        }
        animationTokenRef.current += 1;
        const animationToken = animationTokenRef.current;
        currentRef.current = next;
        animatedContainerHeight.setValue(current.container);
        animatedFaceHeight.setValue(current.face);
        animatedShadowHeight.setValue(current.shadow);
        setAnimatingFlag(true);
        const animation = Animated.parallel([
          Animated.timing(animatedContainerHeight, {
            duration: SIZE_ANIMATION_DURATION,
            easing: SIZE_ANIMATION_EASING,
            toValue: next.container,
            useNativeDriver: false,
          }),
          Animated.timing(animatedFaceHeight, {
            duration: SIZE_ANIMATION_DURATION,
            easing: SIZE_ANIMATION_EASING,
            toValue: next.face,
            useNativeDriver: false,
          }),
          Animated.timing(animatedShadowHeight, {
            duration: SIZE_ANIMATION_DURATION,
            easing: SIZE_ANIMATION_EASING,
            toValue: next.shadow,
            useNativeDriver: false,
          }),
        ]);
        animationRef.current = animation;
        animation.start(({ finished }) => {
          if (!finished || animationTokenRef.current !== animationToken) return;
          animationRef.current = null;
          setAnimatingFlag(false);
          currentRef.current = next;
        });
      });
    },
    [
      animateSize,
      animatedContainerHeight,
      animatedFaceHeight,
      animatedShadowHeight,
      reduceMotion,
      setAnimatingFlag,
      setImmediately,
      snapshot,
    ]
  );

  useEffect(() => {
    const previousWidthMode = widthModeRef.current;
    widthModeRef.current = widthMode;
    if (!didInitializeRef.current) {
      didInitializeRef.current = true;
      setImmediately(dimensions);
      return;
    }
    if (previousWidthMode !== widthMode) {
      setImmediately(dimensions);
      return;
    }
    animateTo(dimensions);
  }, [animateTo, dimensions, setImmediately, widthMode]);

  useEffect(
    () => () => {
      animationTokenRef.current += 1;
      animationRef.current?.stop();
      animationRef.current = null;
    },
    []
  );

  return {
    animatedContainerHeight,
    animatedFaceHeight,
    animatedShadowHeight,
    isAnimating,
  };
};

export default useButtonHeightOwner;
