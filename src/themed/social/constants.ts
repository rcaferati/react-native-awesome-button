import type { SocialButtonVariant, ThemeButtonStyle } from '../../types';

export const SOCIAL_BUTTONS: Record<SocialButtonVariant, ThemeButtonStyle> = {
  twitter: {
    backgroundColor: '#00aced',
    backgroundDarker: '#0096cf',
  },
  messenger: {
    backgroundColor: '#3186f6',
    backgroundDarker: '#2566bc',
  },
  facebook: {
    backgroundColor: '#4868ad',
    backgroundDarker: '#325194',
  },
  github: {
    backgroundColor: '#2c3036',
    backgroundDarker: '#060708',
  },
  linkedin: {
    backgroundColor: '#0077b5',
    backgroundDarker: '#005885',
  },
  whatsapp: {
    backgroundColor: '#25d366',
    backgroundDarker: '#14a54b',
  },
  reddit: {
    backgroundColor: '#fc461e',
    backgroundDarker: '#d52802',
  },
  pinterest: {
    backgroundColor: '#bd091c',
    backgroundDarker: '#980313',
  },
  youtube: {
    backgroundColor: '#cc181e',
    backgroundDarker: '#ab0d12',
  },
};
