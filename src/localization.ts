type AwesomeButtonStrings = {
  longPressAction: string;
};

const stringsByLanguage: Record<string, AwesomeButtonStrings> = {
  de: { longPressAction: 'Lange drücken' },
  en: { longPressAction: 'Long press' },
  es: { longPressAction: 'Mantener pulsado' },
  fr: { longPressAction: 'Appui prolongé' },
  it: { longPressAction: 'Pressione prolungata' },
  ja: { longPressAction: '長押し' },
  ko: { longPressAction: '길게 누르기' },
  pt: { longPressAction: 'Manter pressionado' },
  zh: { longPressAction: '长按' },
};

const resolveLanguage = () => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale.split(/[-_]/, 1)[0]?.toLowerCase() ?? 'en';
  } catch {
    return 'en';
  }
};

/** Package-owned fallback for iOS custom accessibility actions. */
const getLongPressAccessibilityLabel = () =>
  (stringsByLanguage[resolveLanguage()] ?? stringsByLanguage.en)!
    .longPressAction;

export { getLongPressAccessibilityLabel };
