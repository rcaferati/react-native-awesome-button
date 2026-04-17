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
  height: 60,
  raiseLevel: 12,
};

const SOCIAL_TYPES = SocialTypes(COMMON);
const primary = '#4688C5';
const anchor = '#46C578';
const danger = '#B13A3A';

const BUTTONS: ThemeButtonDefinitions = {
  primary: {
    ...COMMON,
    backgroundColor: primary,
    backgroundDarker: colors(-0.5, primary),
    backgroundActive: colors(-0.3, primary),
    backgroundProgress: colors(-0.65, primary),
    textColor: '#FFF',
    activityColor: '#b3e5e1',
  },
  secondary: {
    ...COMMON,
    backgroundColor: '#FFF',
    backgroundDarker: colors(-0.1, primary),
    backgroundActive: colors(0.85, primary),
    backgroundProgress: '#c8e3f5',
    backgroundPlaceholder: '#1e88e5',
    textColor: '#1e88e5',
    borderWidth: 1,
    borderColor: '#1e88e5',
    activityColor: '#1e88e5',
  },
  anchor: {
    ...COMMON,
    backgroundColor: anchor,
    backgroundDarker: colors(-0.5, anchor),
    backgroundProgress: colors(-0.65, anchor),
    textColor: '#FFF',
    activityColor: '#FFF',
  },
  danger: {
    ...COMMON,
    backgroundColor: danger,
    backgroundDarker: colors(-0.5, danger),
    backgroundProgress: colors(-0.65, danger),
    textColor: '#FFF',
    activityColor: '#FFF',
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
    width: 60,
    height: 60,
    textSize: 12,
    paddingHorizontal: 4,
  },
  small: {
    width: 120,
    height: 44,
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

const basic: ThemeDefinition = {
  title: 'Basic Theme',
  background: '#1775c8',
  color: '#FFF',
  buttons: BUTTONS,
  size: SIZE,
};

export default basic;
