/**
 * Single source of truth for language configuration
 * All language-specific parameters are centralized here
 */

// Language configuration type
interface LanguageConfig {
  code: string;
  speechLanguageCode: string;
  instruction: string;
  voiceRules: string[];
  fillers: string[];
  dateLocale: string;
}

// Main language configuration
export const LANGUAGES = {
  en: {
    code: "en",
    speechLanguageCode: "en-US",
    instruction: "",
    voiceRules: [
      "Speak naturally and conversationally",
      "Use appropriate pauses and intonation",
      "Avoid robotic or monotone delivery"
    ],
    fillers: ["um", "uh", "let me think", "so", "well", "you know"],
    dateLocale: "en-US"
  },
  es: {
    code: "es",
    speechLanguageCode: "es-US",
    instruction: `Respond in neutral Latin American Spanish. Keep code identifiers, API names, and JSON keys in English. Use "tú" form (not "usted"). Avoid Spain-specific vocabulary like "vale", "tío", "ordenador", "móvil". Use Latin American equivalents: "computadora" instead of "ordenador", "celular" instead of "móvil", "está bien" instead of "vale".`,
    voiceRules: [
      "Habla de manera natural y conversacional",
      "Usa pausas y entonación apropiadas",
      "Evita una entrega robótica o monótona",
      "Usa vocabulario latinoamericano neutral"
    ],
    fillers: ["eh", "este", "bueno", "pues", "o sea", "déjame pensar"],
    dateLocale: "es-MX"
  }
} as const satisfies Record<string, LanguageConfig>;

// Types
export type SupportedLanguage = keyof typeof LANGUAGES;
export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGES) as SupportedLanguage[];
export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

// Type guard
export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return value in LANGUAGES;
}

// UI locale resolution with documented precedence
export interface LocaleResolveOptions {
  urlLocale?: string;
  userPref?: string;
  cookieLocale?: string;
  acceptLanguage?: string;
}

/**
 * Resolves the UI locale based on precedence:
 * 1. URL locale (highest priority)
 * 2. User preference (from database)
 * 3. Cookie locale
 * 4. Accept-Language header
 * 5. Default language (fallback)
 */
export function resolveUiLocale(options: LocaleResolveOptions): SupportedLanguage {
  const { urlLocale, userPref, cookieLocale, acceptLanguage } = options;

  // 1. URL locale has highest priority
  if (urlLocale && isSupportedLanguage(urlLocale)) {
    return urlLocale;
  }

  // 2. User preference from database
  if (userPref && isSupportedLanguage(userPref)) {
    return userPref;
  }

  // 3. Cookie locale
  if (cookieLocale && isSupportedLanguage(cookieLocale)) {
    return cookieLocale;
  }

  // 4. Accept-Language header (parse first language)
  if (acceptLanguage) {
    const firstLang = acceptLanguage.split(",")[0]?.split("-")[0]?.trim();
    if (firstLang && isSupportedLanguage(firstLang)) {
      return firstLang;
    }
  }

  // 5. Fallback to default
  return DEFAULT_LANGUAGE;
}

/**
 * Builds language-specific instruction for AI prompts
 */
export function buildLanguageInstruction(lang: SupportedLanguage): string {
  return LANGUAGES[lang].instruction;
}