import type { ReactNode } from 'react';
import type {
  GestureResponderEvent,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

export type ProgressCompletionHandler = (callback?: () => void) => void;

export type AwesomeButtonOnPress = (next?: ProgressCompletionHandler) => void;

export type AwesomeButtonPressableProps = Omit<
  PressableProps,
  'children' | 'onLongPress' | 'onPress' | 'onPressIn' | 'onPressOut'
>;

export type ButtonWidth = number | 'auto' | null;

export interface AwesomeButtonProps {
  activityColor?: string;
  activeOpacity?: number;
  animatedPlaceholder?: boolean;
  animateSize?: boolean;
  backgroundActive?: string;
  backgroundColor?: string;
  backgroundDarker?: string;
  backgroundPlaceholder?: string;
  backgroundProgress?: string;
  backgroundShadow?: string;
  borderColor?: string;
  borderRadius?: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  debouncedPressTime?: number;
  borderLeftBottomRadius?: number;
  borderWidth?: number;
  progressLoadingTime?: number;
  showProgressBar?: boolean;
  extra?: ReactNode;
  disabled?: boolean;
  height?: number;
  hitSlop?: PressableProps['hitSlop'];
  paddingHorizontal?: number;
  paddingTop?: number;
  progress?: boolean;
  before?: ReactNode;
  dangerouslySetPressableProps?: AwesomeButtonPressableProps;
  after?: ReactNode;
  paddingBottom?: number;
  raiseLevel?: number;
  springRelease?: boolean;
  stretch?: boolean;
  style?: StyleProp<ViewStyle>;
  textFontFamily?: string;
  textColor?: string;
  textLineHeight?: number;
  textSize?: number;
  textTransition?: boolean;
  width?: ButtonWidth;
  children?: ReactNode;
  onPress?: AwesomeButtonOnPress;
  onLongPress?: PressableProps['onLongPress'];
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
  onPressedIn?: () => void;
  onPressedOut?: () => void;
  onProgressStart?: () => void;
  onProgressEnd?: () => void;
}

export type ThemeName =
  | 'basic'
  | 'bojack'
  | 'cartman'
  | 'mysterion'
  | 'c137'
  | 'rick'
  | 'summer'
  | 'bruce';

export type CoreButtonVariant =
  | 'primary'
  | 'secondary'
  | 'anchor'
  | 'danger'
  | 'disabled'
  | 'flat';

export type SocialButtonVariant =
  | 'twitter'
  | 'messenger'
  | 'facebook'
  | 'github'
  | 'linkedin'
  | 'whatsapp'
  | 'reddit'
  | 'pinterest'
  | 'youtube';

export type ButtonVariant = CoreButtonVariant | SocialButtonVariant;

export type ButtonSize = 'icon' | 'small' | 'medium' | 'large';

export type ThemeButtonStyle = Pick<
  AwesomeButtonProps,
  | 'activityColor'
  | 'backgroundActive'
  | 'backgroundColor'
  | 'backgroundDarker'
  | 'backgroundPlaceholder'
  | 'backgroundProgress'
  | 'backgroundShadow'
  | 'borderColor'
  | 'borderRadius'
  | 'borderBottomLeftRadius'
  | 'borderBottomRightRadius'
  | 'borderTopLeftRadius'
  | 'borderTopRightRadius'
  | 'borderWidth'
  | 'height'
  | 'paddingBottom'
  | 'paddingHorizontal'
  | 'paddingTop'
  | 'raiseLevel'
  | 'textColor'
  | 'textFontFamily'
  | 'textLineHeight'
  | 'textSize'
  | 'width'
>;

export type ThemeSizeStyle = {
  width: number;
  height: number;
  textSize?: number;
  paddingHorizontal?: number;
};

export type ThemeButtonDefinitions = Record<ButtonVariant, ThemeButtonStyle>;

export type ThemeSizeDefinitions = Record<ButtonSize, ThemeSizeStyle>;

export type ThemeDefinition = {
  title: string;
  background: string;
  color: string;
  buttons: ThemeButtonDefinitions;
  size: ThemeSizeDefinitions;
};

export type RegisteredThemeDefinition = ThemeDefinition & {
  name: ThemeName;
  next: boolean;
  prev: boolean;
};

export interface ThemedButtonProps extends AwesomeButtonProps {
  config?: ThemeDefinition;
  flat?: boolean;
  index?: number | null;
  name?: ThemeName | null;
  size?: ButtonSize;
  transparent?: boolean;
  type?: ButtonVariant;
}
