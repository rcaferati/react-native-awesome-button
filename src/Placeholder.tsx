import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  type AnimatedStyle,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { animateLoop } from './helpers';
import { styles } from './styles';

type PlaceholderProps = {
  animated?: boolean;
  style?:
    | StyleProp<ViewStyle>
    | AnimatedStyle<ViewStyle>
    | ReadonlyArray<StyleProp<ViewStyle> | AnimatedStyle<ViewStyle>>;
};

const Placeholder = ({ animated = false, style }: PlaceholderProps) => {
  const loopAnimation = useRef<ReturnType<typeof animateLoop> | null>(null);
  const [width, setWidth] = useState(0);
  const animatedValue = useSharedValue(0);

  const stopLoop = useCallback(() => {
    if (loopAnimation.current) {
      loopAnimation.current.stop();
      loopAnimation.current = null;
    }

    animatedValue.value = 0;
  }, [animatedValue]);

  useEffect(() => {
    stopLoop();

    if (width > 0 && animated === true) {
      loopAnimation.current = animateLoop({
        variable: animatedValue,
        toValue: 1,
      });
      loopAnimation.current.start?.();
    }

    return stopLoop;
  }, [animated, animatedValue, stopLoop, width]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;

    setWidth((currentWidth) =>
      currentWidth === nextWidth ? currentWidth : nextWidth
    );
  }, []);

  const animatedStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          translateX: interpolate(
            animatedValue.value,
            [0, 0.2, 0.5, 0.7, 1],
            [width * -1, width * -1, width, width, width * -1]
          ),
        },
      ],
    }),
    [width]
  );

  return (
    <Animated.View
      style={[styles.container__placeholder, style]}
      onLayout={handleLayout}
    >
      {animated === true && (
        <Animated.View
          testID="aws-btn-content-placeholder"
          style={[styles.container__placeholder__bar, style, animatedStyle]}
        />
      )}
    </Animated.View>
  );
};

export default memo(Placeholder);
