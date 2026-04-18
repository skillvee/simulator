import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as "en" | "es")) {
    locale = routing.defaultLocale;
  }

  // Load messages for the requested locale and English for fallback
  const messages = (await import(`../messages/${locale}.json`)).default;
  const defaultMessages = locale !== 'en'
    ? (await import(`../messages/en.json`)).default
    : undefined;

  return {
    locale,
    messages,
    // Configure error handling and fallback behavior
    onError: (error) => {
      const isProduction = process.env.NODE_ENV === 'production';

      if (isProduction) {
        // In production: warn and continue with fallback
        console.warn(`[i18n] Translation error: ${error.message}`);
      } else {
        // In dev/test/CI: throw to catch issues early
        throw error;
      }
    },
    // Fallback to English when Spanish key is missing
    getMessageFallback: ({ namespace, key, error }) => {
      const isProduction = process.env.NODE_ENV === 'production';

      if (isProduction) {
        // Try to get the English translation as fallback
        if (defaultMessages) {
          const fallbackKey = namespace ? `${namespace}.${key}` : key;
          const keys = fallbackKey.split('.');
          let fallbackMessage: any = defaultMessages;

          for (const k of keys) {
            fallbackMessage = fallbackMessage?.[k];
            if (!fallbackMessage) break;
          }

          if (fallbackMessage && typeof fallbackMessage === 'string') {
            console.warn(`[i18n] Missing translation for "${fallbackKey}" in locale "${locale}", using English fallback`);
            return fallbackMessage;
          }
        }

        // If no English message found, return the key itself
        console.warn(`[i18n] Missing translation for "${namespace ? `${namespace}.${key}` : key}" with no English fallback`);
        return `${namespace ? `${namespace}.${key}` : key}`;
      } else {
        // In dev/test: return error message to make it visible
        return `[Missing: ${namespace ? `${namespace}.${key}` : key}]`;
      }
    }
  };
});