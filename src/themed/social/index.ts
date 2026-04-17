import { SOCIAL_BUTTONS } from './constants';
import type { SocialButtonVariant, ThemeButtonStyle } from '../../types';

export default function createSocialTypes(
  common: ThemeButtonStyle
): Record<SocialButtonVariant, ThemeButtonStyle> {
  return {
    twitter: {
      ...common,
      ...SOCIAL_BUTTONS.twitter,
    },
    messenger: {
      ...common,
      ...SOCIAL_BUTTONS.messenger,
    },
    facebook: {
      ...common,
      ...SOCIAL_BUTTONS.facebook,
    },
    github: {
      ...common,
      ...SOCIAL_BUTTONS.github,
    },
    linkedin: {
      ...common,
      ...SOCIAL_BUTTONS.linkedin,
    },
    whatsapp: {
      ...common,
      ...SOCIAL_BUTTONS.whatsapp,
    },
    reddit: {
      ...common,
      ...SOCIAL_BUTTONS.reddit,
    },
    pinterest: {
      ...common,
      ...SOCIAL_BUTTONS.pinterest,
    },
    youtube: {
      ...common,
      ...SOCIAL_BUTTONS.youtube,
    },
  };
}
