export const defaultLocale = 'en' as const;
export const locales = ['en'] as const;

export type Locale = typeof locales[number];

// Function to get messages for a locale
export async function getMessages(locale: Locale = defaultLocale) {
  try {
    const messages = await import(`./locales/${locale}/translations.json`);
    return messages.default;
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error);
    return {};
  }
}
