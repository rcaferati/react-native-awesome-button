import type {
  ThemeButtonDefinitions,
  ThemeButtonStyle,
  ThemeDefinition,
  ThemeSizeDefinitions,
} from '../types';
import colors from './colors';
import SocialTypes from './social';

const dark = '#3a3a3a';
const white = '#FBFBFB';
const purple = '#733086';
const green = '#77CD38';
const yellow = '#FFE727';

const COMMON: ThemeButtonStyle = {
  borderRadius: 8,
  height: 62,
  raiseLevel: 10,
  borderWidth: 2,
};

const SOCIAL_TYPES = SocialTypes(COMMON);

const BUTTONS: ThemeButtonDefinitions = {
  primary: {
    ...COMMON,
    backgroundColor: dark,
    backgroundDarker: colors(-0.38, dark),
    backgroundProgress: colors(-0.62, dark),
    borderColor: colors(-0.38, dark),
    textColor: white,
    activityColor: white,
  },
  secondary: {
    ...COMMON,
    backgroundColor: white,
    backgroundDarker: dark,
    backgroundProgress: colors(-0.38, white),
    backgroundPlaceholder: dark,
    textColor: dark,
    borderColor: colors(-0.38, dark),
    activityColor: dark,
  },
  anchor: {
    ...COMMON,
    backgroundColor: yellow,
    backgroundDarker: colors(-0.38, dark),
    backgroundProgress: '#404040',
    textColor: colors(-0.38, dark),
    borderColor: dark,
    borderWidth: 2,
    activityColor: dark,
  },
  danger: {
    ...COMMON,
    backgroundColor: purple,
    backgroundDarker: colors(-0.62, purple),
    backgroundProgress: colors(-0.62, purple),
    textColor: green,

    borderColor: colors(-0.62, purple),
    activityColor: green,
  },
  disabled: {
    ...COMMON,
    backgroundColor: colors(0.38, dark),
    backgroundDarker: colors(0.13, dark),
    textColor: colors(0.13, dark),
    borderColor: colors(0.13, dark),
  },
  flat: {
    backgroundColor: 'rgba(0, 0, 0, 0)',
    backgroundDarker: 'rgba(0, 0, 0, 0)',
    backgroundShadow: 'rgba(0, 0, 0, 0)',
    raiseLevel: 0,
    borderRadius: 0,
  },
  ...SOCIAL_TYPES,
};

const SIZE: ThemeSizeDefinitions = {
  icon: {
    width: 60,
    height: 60,
    textSize: 12,
    paddingHorizontal: 4,
  },
  small: {
    width: 120,
    height: 42,
    textSize: 12,
  },
  medium: {
    width: 200,
    height: 60,
  },
  large: {
    width: 250,
    height: 60,
    textSize: 16,
  },
};

const bruce: ThemeDefinition = {
  title: 'Bruce Theme',
  background: '#2f2f2f',
  color: '#FFF',
  buttons: BUTTONS,
  size: SIZE,
};

export default bruce;
