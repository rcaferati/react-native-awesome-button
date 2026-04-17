import type {
  ThemeButtonDefinitions,
  ThemeButtonStyle,
  ThemeDefinition,
  ThemeSizeDefinitions,
} from '../types';
import colors from './colors';
import SocialTypes from './social';

const blue = '#6678C5';
const grey = '#848289';
const pink = '#EBA0BD';
const teal = '#3eb7b9';
const white = '#FFFFFF';

const COMMON: ThemeButtonStyle = {
  borderRadius: 4,
  height: 55,
  activityColor: white,
  textColor: white,
  raiseLevel: 6,
  paddingHorizontal: 20,
};

const SOCIAL_TYPES = SocialTypes(COMMON);

const BUTTONS: ThemeButtonDefinitions = {
  primary: {
    ...COMMON,
    backgroundColor: blue,
    backgroundDarker: colors(-0.3, blue),
    backgroundProgress: '#2a4284',
  },
  secondary: {
    ...COMMON,
    backgroundColor: grey,
    backgroundDarker: colors(-0.3, grey),
    backgroundProgress: '#3f3f3f',
  },
  anchor: {
    ...COMMON,
    backgroundColor: teal,
    backgroundDarker: colors(-0.3, teal),
    backgroundProgress: colors(-0.6, teal),
  },
  danger: {
    ...COMMON,
    backgroundColor: colors(-0.1, pink),
    backgroundDarker: colors(-0.3, pink),
    backgroundProgress: colors(-0.5, pink),
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

const bojack: ThemeDefinition = {
  title: 'Bojack Theme',
  background: '#4f6fc4',
  color: '#fff',
  buttons: BUTTONS,
  size: SIZE,
};

export default bojack;
