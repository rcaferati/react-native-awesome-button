import Button from './Button';
import Themed from './themed/ThemedButton';
import themes from './themed/themes';
export type {
  AwesomeButtonOnPress,
  AwesomeButtonPressableProps,
  AwesomeButtonProps,
  ButtonSize,
  ButtonVariant,
  ProgressCompletionHandler,
  RegisteredThemeDefinition,
  ThemeButtonDefinitions,
  ThemeButtonStyle,
  ThemeDefinition,
  ThemeName,
  ThemeSizeDefinitions,
  ThemeSizeStyle,
  ThemedButtonProps,
} from './types';
export type { ButtonTypes } from './Button';

export const ThemedButton = Themed;
export const getTheme = themes;

export default Button;
