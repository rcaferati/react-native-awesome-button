import {
  getTheme,
  type AwesomeButtonThemeDefinitions,
  type AwesomeButtonVariant,
  type ButtonVariant,
  type ThemeButtonDefinitions,
  type ThemeDefinition,
} from '..';

const legacyButtons: ThemeButtonDefinitions = getTheme(0).buttons;
const legacyTheme: ThemeDefinition = {
  title: 'Legacy v3.1 theme',
  background: '#000000',
  color: '#ffffff',
  buttons: legacyButtons,
  size: getTheme(0).size,
};
const bridgeButtons: AwesomeButtonThemeDefinitions = {
  ...legacyButtons,
  x: { backgroundColor: '#000000' },
};

const exhaustLegacyVariant = (variant: ButtonVariant): string => {
  switch (variant) {
    case 'primary':
    case 'secondary':
    case 'anchor':
    case 'danger':
    case 'disabled':
    case 'flat':
    case 'twitter':
    case 'messenger':
    case 'facebook':
    case 'github':
    case 'linkedin':
    case 'whatsapp':
    case 'reddit':
    case 'pinterest':
    case 'youtube':
      return variant;
    default: {
      const neverVariant: never = variant;
      return neverVariant;
    }
  }
};

test('legacy closed types stay valid while the request bridge accepts x', () => {
  const request: AwesomeButtonVariant = 'x';
  expect(legacyTheme.buttons.twitter).toBeDefined();
  expect(bridgeButtons.x).toBeDefined();
  expect(request).toBe('x');
  expect(exhaustLegacyVariant('twitter')).toBe('twitter');
});
