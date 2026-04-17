import bojack from './bojack';
import c137 from './c137';
import bruce from './bruce';
import cartman from './cartman';
import mysterion from './mysterion';
import summer from './summer';
import rick from './rick';
import basic from './basic';
import type {
  RegisteredThemeDefinition,
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
): RegisteredThemeDefinition => {
  const keys = getThemeKeys();
  const safeIndex = index === null || !keys[index] ? 0 : index;
  const themeName = keys[safeIndex] ?? DEFAULT_THEME_NAME;

  return {
    ...themes[themeName],
    next: !!keys[safeIndex + 1],
    prev: !!keys[safeIndex - 1],
    name: themeName,
  };
};

const getThemeByName = (name: string): RegisteredThemeDefinition => {
  const keys = getThemeKeys();
  const index = keys.findIndex((key) => key === name);
  if (index === -1) {
    return getThemeByIndex(0);
  }
  return getThemeByIndex(index);
};

function getTheme(
  index?: number | null,
  name?: ThemeName | null
): RegisteredThemeDefinition;
function getTheme(
  index: number | null = 0,
  name: string | null = null
): RegisteredThemeDefinition {
  if (name) {
    return getThemeByName(name);
  }

  if (index === null) {
    return getThemeByName(DEFAULT_THEME_NAME);
  }

  return getThemeByIndex(index);
}

export default getTheme;
