import type {
  ThemeButtonDefinitions,
  ThemeButtonStyle,
  ThemeDefinition,
  ThemeSizeDefinitions,
} from '../types';
import colors from './colors';
import SocialTypes from './social';

const COMMON: ThemeButtonStyle = {
  borderRadius: 24,
  height: 55,
  activityColor: '#FFF',
  raiseLevel: 8,
};

const primary = '#463856';
const secondary = '#9A8C9D';
const anchor = '#749743';
const anchorBorder = '#678A37';
const danger = '#DB4557';
const yellow = '#FDF353';

const SOCIAL_TYPES = SocialTypes(COMMON);

const BUTTONS: ThemeButtonDefinitions = {
  primary: {
    ...COMMON,
    backgroundColor: primary,
    backgroundDarker: colors(-0.85, primary),
    textColor: '#FFF',
    borderWidth: 1,
    borderColor: primary,
  },
  secondary: {
    ...COMMON,
    backgroundColor: secondary,
    backgroundDarker: colors(-0.6218, secondary),
    textColor: '#FFF',
    borderWidth: 1,
    borderColor: secondary,
  },
  anchor: {
    ...COMMON,
    backgroundColor: anchor,
    backgroundDarker: colors(-0.6218, anchor),
    textColor: '#FFF',
    borderWidth: 1,
    borderColor: anchorBorder,
  },
  danger: {
    ...COMMON,
    backgroundColor: danger,
    backgroundDarker: colors(-0.5, danger),
    backgroundProgress: colors(-0.65, danger),
    textColor: yellow,
    activityColor: yellow,
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

const mysterion: ThemeDefinition = {
  title: 'Mysterion Theme',
  background: primary,
  color: '#FFF',
  buttons: BUTTONS,
  size: SIZE,
};

export default mysterion;
