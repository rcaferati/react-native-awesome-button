import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import { animateLoop } from './helpers';
import { styles } from './styles';

type PlaceholderProps = {
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
};

const Placeholder = ({ animated = false, style }: PlaceholderProps) => {
  const loopAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const [width, setWidth] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;

  const stopLoop = useCallback(() => {
    if (loopAnimation.current) {
      loopAnimation.current.stop();
      loopAnimation.current = null;
    }

    animatedValue.stopAnimation();
    animatedValue.setValue(0);
  }, [animatedValue]);

  useEffect(() => {
    stopLoop();

    if (width > 0 && animated === true) {
      loopAnimation.current = animateLoop({
        variable: animatedValue,
        toValue: 1,
      });
    }

    return stopLoop;
  }, [animated, animatedValue, stopLoop, width]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;

    setWidth((currentWidth) =>
      currentWidth === nextWidth ? currentWidth : nextWidth
    );
  }, []);

  return (
    <View
      style={[styles.container__placeholder, style]}
      onLayout={handleLayout}
    >
      {animated === true && (
        <Animated.View
          testID="aws-btn-content-placeholder"
          style={[
            styles.container__placeholder__bar,
            style,
            {
              transform: [
                {
                  translateX: animatedValue.interpolate({
                    inputRange: [0, 0.2, 0.5, 0.7, 1],
                    outputRange: [
                      width * -1,
                      width * -1,
                      width,
                      width,
                      width * -1,
                    ],
                  }),
                },
              ],
            },
          ]}
        />
      )}
    </View>
  );
};

export default memo(Placeholder);
