import type {
  ThemeButtonDefinitions,
  ThemeButtonStyle,
  ThemeDefinition,
  ThemeSizeDefinitions,
} from '../types';
import colors from './colors';
import SocialTypes from './social';

const blue = '#49536F';
const yellow = '#FEFC81';
const green = '#3DB64B';
const skin = '#ECCAB1';
const radioactive = '#D2E054';
const brown = '#6D4B29';

const COMMON: ThemeButtonStyle = {
  borderRadius: 25,
  height: 55,
  activityColor: '#b3e5e1',
  raiseLevel: 6,
};

const SOCIAL_TYPES = SocialTypes(COMMON);

const BUTTONS: ThemeButtonDefinitions = {
  primary: {
    ...COMMON,
    backgroundColor: blue,
    backgroundDarker: colors(-0.3, blue),
    backgroundProgress: colors(-0.62, blue),
    textColor: colors(0.75, blue),
    activityColor: colors(0.75, blue),
  },
  secondary: {
    ...COMMON,
    backgroundColor: yellow,
    backgroundDarker: colors(-0.3, yellow),
    backgroundProgress: colors(-0.62, yellow),
    textColor: colors(-0.9, yellow),
    activityColor: colors(-0.9, yellow),
  },
  anchor: {
    ...COMMON,
    backgroundColor: skin,
    backgroundDarker: brown,
    backgroundProgress: colors(-0.5, skin),
    textColor: brown,
    activityColor: brown,
  },
  danger: {
    ...COMMON,
    backgroundColor: green,
    backgroundDarker: radioactive,
    backgroundProgress: colors(-0.62, green),
    textColor: radioactive,
    borderColor: radioactive,
    activityColor: radioactive,
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

const c137: ThemeDefinition = {
  title: 'C-137 Theme',
  background: '#fffa82',
  color: '#535015',
  buttons: BUTTONS,
  size: SIZE,
};

export default c137;
