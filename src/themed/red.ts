import type { ButtonTypes } from '../Button';
import SocialTypes from './social';

const COMMON: ButtonTypes = {
  borderRadius: 4,
  height: 55,
  activityColor: '#FFFFFF',
  raiseLevel: 5,
};

const SOCIAL_TYPES = SocialTypes(COMMON);

const BUTTONS = {
  primary: {
    ...COMMON,
    backgroundColor: '#E82F3A',
    backgroundDarker: '#a41b1b',
    backgroundProgress: '#a41b1b',
    textColor: '#FFFFFF',
  },
  secondary: {
    ...COMMON,
    backgroundColor: '#404C60',
    backgroundDarker: '#242f41',
    backgroundProgress: '#242f41',
    textColor: '#FFFFFF',
  },
  anchor: {
    ...COMMON,
    backgroundColor: '#af2831',
    backgroundDarker: '#8b1e25',
    backgroundProgress: '#8b1e25',
    textColor: '#FFFFFF',
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

const SIZE = {
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

export default {
  title: 'Red Theme',
  background: '#EE3253',
  color: '#FFE11D',
  buttons: BUTTONS,
  size: SIZE,
};
