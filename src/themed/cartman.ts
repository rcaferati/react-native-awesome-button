import type {
  ThemeButtonDefinitions,
  ThemeButtonStyle,
  ThemeDefinition,
  ThemeSizeDefinitions,
} from '../types';
import colors from './colors';
import SocialTypes from './social';

const COMMON: ThemeButtonStyle = {
  borderRadius: 8,
  height: 55,
  activityColor: '#FFE11D',
  raiseLevel: 8,
};

const SOCIAL_TYPES = SocialTypes(COMMON);

const blue = '#00B8C4';
const red = '#DB4557';
const yellow = '#FDF353';
const brown = '#876753';
const dark = '#2D2D3A';

const BUTTONS: ThemeButtonDefinitions = {
  primary: {
    ...COMMON,
    backgroundColor: blue,
    backgroundDarker: colors(-0.35, yellow),
    textColor: yellow,
    borderWidth: 2,
    borderColor: yellow,
  },
  secondary: {
    ...COMMON,
    backgroundColor: red,
    backgroundDarker: colors(-0.35, yellow),
    textColor: yellow,
    borderWidth: 2,
    borderColor: colors(-0.1, yellow),
  },
  anchor: {
    ...COMMON,
    backgroundColor: dark,
    backgroundDarker: colors(-0.3, brown),
    textColor: colors(0.1, brown),
    backgroundProgress: colors(0.025, dark),
    borderWidth: 2,
    borderColor: brown,
    activityColor: colors(0.1, brown),
  },
  danger: {
    ...COMMON,
    backgroundColor: colors(-0.1, dark),
    backgroundDarker: colors(-0.5, red),
    backgroundProgress: colors(0.025, dark),
    textColor: red,
    borderColor: red,
    borderWidth: 2,
    activityColor: colors(0.1, red),
  },
  disabled: {
    ...COMMON,
    backgroundColor: '#DFDFDF',
    backgroundDarker: '#CACACA',
    textColor: '#B6B6B6',
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
    width: 55,
    height: 55,
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
    height: 55,
  },
  large: {
    width: 250,
    height: 60,
    textSize: 16,
  },
};

const cartman: ThemeDefinition = {
  title: 'Cartman Theme',
  background: '#EE3253',
  color: '#FFE11D',
  buttons: BUTTONS,
  size: SIZE,
};

export default cartman;
