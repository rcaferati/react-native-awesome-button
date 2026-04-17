import {
  DEFAULT_ACTIVITY_COLOR,
  DEFAULT_BACKGROUND_ACTIVE,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_BACKGROUND_DARKER,
  DEFAULT_BACKGROUND_SHADOW,
  DEFAULT_TEXT_COLOR,
} from '../constants';
import type {
  ButtonVariant,
  ThemeButtonStyle,
  ThemeDefinition,
  ThemeName,
} from '../types';

const THEME_BUTTON_STYLE_KEYS = [
  'activityColor',
  'backgroundActive',
  'backgroundColor',
  'backgroundDarker',
  'backgroundPlaceholder',
  'backgroundProgress',
  'backgroundShadow',
  'borderColor',
  'borderRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderWidth',
  'height',
  'paddingBottom',
  'paddingHorizontal',
  'paddingTop',
  'raiseLevel',
  'textColor',
  'textFontFamily',
  'textLineHeight',
  'textSize',
  'width',
] as const satisfies ReadonlyArray<keyof ThemeButtonStyle>;

const TRANSPARENT_STYLES: ThemeButtonStyle = {
  backgroundColor: 'transparent',
  backgroundDarker: 'transparent',
  backgroundPlaceholder: 'transparent',
  backgroundShadow: 'transparent',
  borderColor: 'transparent',
};

const resolveButtonType = (
  theme: ThemeDefinition,
  disabled: boolean | undefined,
  flat: boolean,
  type: ButtonVariant
) => {
  const requestedType = disabled ? 'disabled' : flat === true ? 'flat' : type;

  return Object.prototype.hasOwnProperty.call(theme.buttons, requestedType)
    ? requestedType
    : 'primary';
};

const getThemeSourceDescriptor = (
  index: number | null,
  name: ThemeName | null,
  config?: ThemeDefinition
) => {
  if (config) {
    return 'config';
  }

  if (name !== null) {
    return `name:${name}`;
  }

  return `index:${index === null ? 'null' : index}`;
};

const getInterpolatablePalette = (
  buttonStyle: ThemeButtonStyle
): ThemeButtonStyle => ({
  ...buttonStyle,
  activityColor: buttonStyle.activityColor ?? DEFAULT_ACTIVITY_COLOR,
  backgroundActive: buttonStyle.backgroundActive ?? DEFAULT_BACKGROUND_ACTIVE,
  backgroundColor: buttonStyle.backgroundColor ?? DEFAULT_BACKGROUND_COLOR,
  backgroundDarker: buttonStyle.backgroundDarker ?? DEFAULT_BACKGROUND_DARKER,
  backgroundPlaceholder:
    buttonStyle.backgroundPlaceholder ?? DEFAULT_BACKGROUND_SHADOW,
  backgroundProgress:
    buttonStyle.backgroundProgress ?? DEFAULT_BACKGROUND_SHADOW,
  backgroundShadow: buttonStyle.backgroundShadow ?? DEFAULT_BACKGROUND_SHADOW,
  textColor: buttonStyle.textColor ?? DEFAULT_TEXT_COLOR,
});

const areThemeButtonStylesEqual = (
  left: ThemeButtonStyle,
  right: ThemeButtonStyle
) => THEME_BUTTON_STYLE_KEYS.every((key) => left[key] === right[key]);

export {
  areThemeButtonStylesEqual,
  getInterpolatablePalette,
  getThemeSourceDescriptor,
  resolveButtonType,
  TRANSPARENT_STYLES,
};
