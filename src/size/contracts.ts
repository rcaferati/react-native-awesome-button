import type { ButtonWidth } from '../types';

export type WidthMode = 'auto' | 'fixed' | 'stretch';

export type HeightDimensions = {
  container: number;
  face: number;
  shadow: number;
};

export type WidthCommandPort = {
  animateTo: (nextWidth: number, onComplete?: () => void) => void;
  animateTextTransitionTo: (
    nextWidth: number,
    options: {
      durationMs: number;
      floor: () => number | null;
      onComplete?: () => void;
      onProgress?: (progress: number) => void;
    }
  ) => void;
  cancel: () => void;
  getCurrent: () => number | null;
  setImmediately: (nextWidth: number | null) => void;
  snapshot: (callback: (value: number | null) => void) => void;
};

export const getWidthMode = (
  width: ButtonWidth,
  stretch?: boolean
): WidthMode => {
  if (stretch === true) return 'stretch';
  if (width === null) return 'auto';
  return 'fixed';
};

export const getHeightDimensions = (
  height: number,
  paddingTop: number,
  paddingBottom: number,
  raiseLevel: number
): HeightDimensions => ({
  container: height + paddingTop + paddingBottom,
  face: height + paddingTop + paddingBottom - raiseLevel,
  shadow: height - raiseLevel,
});

export const areHeightDimensionsEqual = (
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
  if (currentWidth === null) return 'initial';
  if (Math.abs(currentWidth - nextWidth) <= 0.5) return 'text-only';
  if (nextWidth > currentWidth) return 'grow-first';
  return 'shrink-last';
};
