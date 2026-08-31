import Button from './Button';
import Themed from './themed/ThemedButton';
import themes from './themed/themes';
import type { JSX } from 'react';
import type {
  AwesomeButtonProps,
  AwesomeButtonRegisteredThemeDefinition,
  ThemeName,
  ThemedButtonProps,
} from './types';
export type {
  AwesomeButtonAnimationCurve,
  AwesomeButtonOnPress,
  AwesomeButtonPressableProps,
  AwesomeButtonProps,
  AwesomeButtonStyle,
  AwesomeButtonThemeDefinition,
  AwesomeButtonThemeDefinitions,
  AwesomeButtonRegisteredThemeDefinition,
  AwesomeButtonVariant,
  ButtonSize,
  ButtonVariant,
  ButtonWidth,
  CoreButtonVariant,
  ProgressCompletionHandler,
  RegisteredThemeDefinition,
  SocialButtonVariant,
  ThemeButtonDefinitions,
  ThemeButtonStyle,
  ThemeDefinition,
  ThemeName,
  ThemeSizeDefinitions,
  ThemeSizeStyle,
  ThemedButtonProps,
} from './types';
export type { ButtonTypes } from './Button';

/**
 * Theme-aware Awesome Button component.
 *
 * @public
 */
export const ThemedButton: (props: ThemedButtonProps) => JSX.Element = Themed;
/**
 * Resolves a registered theme by index or name.
 *
 * @public
 */
export const getTheme: (
  index?: number | null,
  name?: ThemeName | null
) => AwesomeButtonRegisteredThemeDefinition = themes;

/**
 * Core Awesome Button component.
 *
 * @public
 */
const AwesomeButton: (props: AwesomeButtonProps) => JSX.Element = Button;

export default AwesomeButton;
