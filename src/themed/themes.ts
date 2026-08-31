import bojack from './bojack';
import c137 from './c137';
import bruce from './bruce';
import cartman from './cartman';
import mysterion from './mysterion';
import summer from './summer';
import rick from './rick';
import basic from './basic';
import type {
  AwesomeButtonRegisteredThemeDefinition,
  ThemeDefinition,
  ThemeName,
} from '../types';

const DEFAULT_THEME_NAME: ThemeName = 'basic';

const themes: Record<ThemeName, ThemeDefinition> = {
  basic,
  bojack,
  cartman,
  mysterion,
  c137,
  rick,
  summer,
  bruce,
};

const getThemeKeys = (): ThemeName[] => Object.keys(themes) as ThemeName[];

const getThemeByIndex = (
  index: number | null = 0
): AwesomeButtonRegisteredThemeDefinition => {
  const keys = getThemeKeys();
  const safeIndex = index === null || !keys[index] ? 0 : index;
  const themeName = keys[safeIndex] ?? DEFAULT_THEME_NAME;

  const selectedTheme = themes[themeName];
  return {
    ...selectedTheme,
    buttons: {
      ...selectedTheme.buttons,
      x: selectedTheme.buttons.twitter,
    },
    next: !!keys[safeIndex + 1],
    prev: !!keys[safeIndex - 1],
    name: themeName,
  };
};

const getThemeByName = (
  name: string
): AwesomeButtonRegisteredThemeDefinition => {
  const keys = getThemeKeys();
  const index = keys.findIndex((key) => key === name);
  if (index === -1) {
    return getThemeByIndex(0);
  }
  return getThemeByIndex(index);
};

/** Resolves a built-in Awesome Button theme by index or stable theme name. */
function getTheme(
  index?: number | null,
  name?: ThemeName | null
): AwesomeButtonRegisteredThemeDefinition;
function getTheme(
  index: number | null = 0,
  name: string | null = null
): AwesomeButtonRegisteredThemeDefinition {
  if (name) {
    return getThemeByName(name);
  }

  if (index === null) {
    return getThemeByName(DEFAULT_THEME_NAME);
  }

  return getThemeByIndex(index);
}

export default getTheme;
