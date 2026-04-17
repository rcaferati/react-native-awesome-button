import type {
  ThemeButtonDefinitions,
  ThemeButtonStyle,
  ThemeDefinition,
  ThemeSizeDefinitions,
} from '../types';
import colors from './colors';
import SocialTypes from './social';

const primary = '#C77CB4';
const secondary = '#E6913E';
const anchor = '#FFF';
const beth = '#E36F5E';

const COMMON: ThemeButtonStyle = {
  borderRadius: 24,
  height: 55,
  activityColor: '#FFF',
  raiseLevel: 8,
};

const SOCIAL_TYPES = SocialTypes(COMMON);

const BUTTONS: ThemeButtonDefinitions = {
  primary: {
    ...COMMON,
    backgroundColor: primary,
    backgroundDarker: colors(-0.38, primary),
    backgroundProgress: colors(-0.62, primary),
    textColor: '#FFF',
    borderWidth: 0,
    borderColor: primary,
  },
  secondary: {
    ...COMMON,
    backgroundColor: anchor,
    backgroundDarker: colors(-0.6, primary),
    textColor: colors(-0.3, primary),
    borderWidth: 1,
    borderColor: colors(-0.3, primary),
    activityColor: colors(-0.3, primary),
  },
  anchor: {
    ...COMMON,
    backgroundColor: secondary,
    backgroundDarker: colors(-0.62, secondary),
    textColor: '#FFF',
    borderWidth: 0,
    borderColor: secondary,
  },
  danger: {
    ...COMMON,
    backgroundColor: beth,
    backgroundDarker: colors(-0.38, beth),
    backgroundProgress: colors(-0.62, beth),
    textColor: '#FFF',
    borderWidth: 0,
    borderColor: beth,
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

const summer: ThemeDefinition = {
  title: 'Summer Theme',
  background: primary,
  color: '#FFF',
  buttons: BUTTONS,
  size: SIZE,
};

export default summer;
