import { useCallback, useState } from 'react';
import type { LayoutChangeEvent, Animated } from 'react-native';
import type { ButtonWidth } from './types';

const getNextStateWidth = (currentWidth: number | null, nextWidth: number) => {
  if (currentWidth === nextWidth) {
    return currentWidth;
  }

  if (currentWidth === null || currentWidth < nextWidth) {
    return nextWidth;
  }

  return currentWidth;
};

const useAutoWidth = ({
  animatedOpacity,
  stretch,
  width,
}: {
  animatedOpacity: Animated.Value;
  stretch?: boolean;
  width?: ButtonWidth;
}) => {
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const [stateWidth, setStateWidth] = useState<number | null>(null);

  const onTextLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextWidth = event.nativeEvent.layout.width;

      animatedOpacity.setValue(1);
      setMeasuredWidth((currentWidth) =>
        currentWidth === nextWidth ? currentWidth : nextWidth
      );

      if (width !== null && stretch !== true) {
        return;
      }

      setStateWidth((currentWidth) =>
        getNextStateWidth(currentWidth, nextWidth)
      );
    },
    [animatedOpacity, stretch, width]
  );

  return {
    measuredWidth,
    onTextLayout,
    stateWidth,
  };
};

export default useAutoWidth;
export { getNextStateWidth };
