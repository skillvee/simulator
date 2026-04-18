/**
 * Single source of truth for language configuration
 * All language-specific parameters are centralized here
 *
 * Spanish baseline (2024-12-18): 4.73/5.00
 * - naturalness: 4.70
 * - roleAccuracy: 4.35
 * - brevity: 4.91
 * - contextAwareness: 4.70
 * - infoDiscipline: 4.96
 * - aiIsms: 4.78
 * All dimensions meet English baseline - 0.2 threshold (≥4.32)
 */

import { VOICE_RULES_EN, VOICE_RULES_ES } from "@/prompts/coworker/persona";

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
    voiceRules: VOICE_RULES_EN,
    fillers: ["um", "uh", "let me think", "so", "well", "you know"],
    dateLocale: "en-US"
  },
  es: {
    code: "es",
    speechLanguageCode: "es-US",
    instruction: `Respond in natural Latin American Spanish. Use "tú" form. Technical terms, APIs, and code stay in English. Avoid Spain-specific words (vale→está bien, ordenador→computadora, móvil→celular).

CRITICAL - Maintain your exact role identity throughout:
- If you're the Manager, speak AS the manager ("nuestro equipo", "necesitamos")
- If you're a Developer, stay technical and code-focused
- If you're PM/QA/Designer, maintain that specific perspective

CRITICAL - Always acknowledge context:
- Colleague mentions: "Sí, [nombre] me comentó sobre eso..."
- Previous topics: "Como mencionaste antes..."
- React to their questions appropriately for your role`,
    voiceRules: VOICE_RULES_ES,
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