import AwesomeButton, {
  ThemedButton,
  getTheme,
  type AwesomeButtonProps,
  type ButtonSize,
  type ButtonTypes,
  type ButtonVariant,
  type RegisteredThemeDefinition,
  type ThemeDefinition,
  type ThemeName,
  type ThemedButtonProps,
} from 'react-native-really-awesome-button';

const themeName: ThemeName = 'basic';
const buttonVariant: ButtonVariant = 'github';
const buttonSize: ButtonSize = 'icon';

const awesomeButtonProps: AwesomeButtonProps = {
  children: 'Press',
  onPress: (next) => next?.(),
};

const legacyButtonProps: ButtonTypes = awesomeButtonProps;

const themedButtonProps: ThemedButtonProps = {
  children: 'Themed',
  name: themeName,
  type: buttonVariant,
  size: buttonSize,
};

const theme: RegisteredThemeDefinition = getTheme(0, themeName);
const themeDefinition: ThemeDefinition = theme;

export const publicApiSmoke = {
  AwesomeButton,
  ThemedButton,
  awesomeButtonProps,
  legacyButtonProps,
  themedButtonProps,
  theme,
  themeDefinition,
};
