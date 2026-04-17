import type {
  ThemeButtonDefinitions,
  ThemeButtonStyle,
  ThemeDefinition,
  ThemeSizeDefinitions,
} from '../types';
import colors from './colors';
import SocialTypes from './social';

const green = '#3DB64B';
const radioactive = '#D2E054';
const unity_light = '#8B3357';
const unity_dark = '#531849';
const unity_eyes = '#E4E994';

const COMMON: ThemeButtonStyle = {
  borderRadius: 25,
  height: 55,
  activityColor: '#FFFFFF',
  raiseLevel: 6,
};

const SOCIAL_TYPES = SocialTypes(COMMON);

const BUTTONS: ThemeButtonDefinitions = {
  primary: {
    ...COMMON,
    backgroundColor: '#aad3ea',
    backgroundDarker: '#57a9d4',
    backgroundPlaceholder: '#8dbdd9',
    textColor: '#2e84b1',
    backgroundProgress: '#57a9d4',
  },
  secondary: {
    ...COMMON,
    backgroundColor: '#FAFAFA',
    backgroundDarker: '#67cbc3',
    backgroundActive: '#e7fcfb',
    backgroundPlaceholder: '#b3e5e1',
    textColor: '#349890',
    backgroundProgress: '#c5ece8',
    borderWidth: 2,
    borderColor: '#b3e5e1',
    activityColor: '#349890',
  },
  anchor: {
    ...COMMON,
    backgroundColor: green,
    backgroundDarker: radioactive,
    backgroundProgress: colors(-0.62, green),
    textColor: radioactive,
    borderColor: radioactive,
    activityColor: radioactive,
    borderWidth: 2,
  },
  danger: {
    ...COMMON,
    backgroundColor: unity_light,
    backgroundDarker: unity_dark,
    backgroundProgress: unity_dark,
    textColor: unity_eyes,
    borderColor: unity_dark,
    borderWidth: 2,
    activityColor: unity_eyes,
  },
  disabled: {
    ...COMMON,
    backgroundColor: '#e8fcda',
    backgroundDarker: '#bde1a2',
    textColor: '#c7f2a9',
    borderWidth: 2,
    borderColor: '#c7e8ae',
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

const rick: ThemeDefinition = {
  title: 'Rick Theme',
  background: '#aad3ea',
  color: '#2e84b1',
  buttons: BUTTONS,
  size: SIZE,
};

export default rick;
