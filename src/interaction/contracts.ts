import type { GestureResponderEvent, PressableProps } from 'react-native';
import type {
  AwesomeButtonAnimationCurve,
  AwesomeButtonOnPress,
} from '../types';

export type PressProgressLiveDependencies = {
  activeOpacity: number;
  animationCurve?: AwesomeButtonAnimationCurve;
  animationDuration?: number;
  debouncedPressTime?: number;
  delayLongPress?: PressableProps['delayLongPress'];
  disabled: boolean;
  hasChildren: boolean;
  onLongPress?: PressableProps['onLongPress'];
  onLongPressAction?: () => void;
  onPress?: AwesomeButtonOnPress;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
  onPressedIn?: () => void;
  onPressedOut?: () => void;
  onProgressEnd?: () => void;
  onProgressStart?: () => void;
  pressInAnimationDuration?: number;
  progress: boolean;
  progressLoadingTime: number;
  reduceMotion: boolean;
  showProgressBar: boolean;
  springRelease: boolean;
};

export type ProgressReleaseRequest = {
  generation: number;
  onPressedOutSnapshot?: () => void;
  onSettled: () => void;
  physicalLifecycle: boolean;
};

export type ProgressOwnership = {
  generation: number;
  next: (completion?: () => void) => void;
};
