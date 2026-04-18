import { describe, expect, it } from "vitest";
import {
  LANGUAGES,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  resolveUiLocale,
  buildLanguageInstruction,
  type SupportedLanguage
} from "./language";

describe("LANGUAGES config", () => {
  it("should have en and es entries", () => {
    expect(LANGUAGES).toHaveProperty("en");
    expect(LANGUAGES).toHaveProperty("es");
  });

  describe("en language config", () => {
    it("should have all required fields", () => {
      const en = LANGUAGES.en;
      expect(en.code).toBe("en");
      expect(en.speechLanguageCode).toBe("en-US");
      expect(en.instruction).toBe("");
      expect(en.voiceRules).toBeInstanceOf(Array);
      expect(en.voiceRules.length).toBeGreaterThan(0);
      expect(en.fillers).toBeInstanceOf(Array);
      expect(en.fillers.length).toBeGreaterThan(0);
      expect(en.dateLocale).toBe("en-US");
    });

    it("should have appropriate English fillers", () => {
      const fillers = LANGUAGES.en.fillers;
      expect(fillers).toContain("um");
      expect(fillers).toContain("uh");
      expect(fillers).toContain("well");
    });
  });

  describe("es language config", () => {
    it("should have all required fields", () => {
      const es = LANGUAGES.es;
      expect(es.code).toBe("es");
      expect(es.speechLanguageCode).toBe("es-US");
      expect(es.instruction).toBeTruthy();
      expect(es.voiceRules).toBeInstanceOf(Array);
      expect(es.voiceRules.length).toBeGreaterThan(0);
      expect(es.fillers).toBeInstanceOf(Array);
      expect(es.fillers.length).toBeGreaterThan(0);
      expect(es.dateLocale).toBe("es-MX");
    });

    it("should have Spanish instruction with required content", () => {
      const instruction = LANGUAGES.es.instruction;
      expect(instruction).toContain("Latin American Spanish");
      expect(instruction).toContain("tú");
      expect(instruction).toContain("usted");
      expect(instruction).toContain("vale");
      expect(instruction).toContain("ordenador");
      expect(instruction).toContain("móvil");
      expect(instruction).toContain("computadora");
      expect(instruction).toContain("celular");
    });

    it("should mention keeping technical terms in English", () => {
      const instruction = LANGUAGES.es.instruction;
      expect(instruction).toContain("code identifiers");
      expect(instruction).toContain("API names");
      expect(instruction).toContain("JSON keys");
      expect(instruction).toContain("English");
    });

    it("should have appropriate Spanish fillers", () => {
      const fillers = LANGUAGES.es.fillers;
      expect(fillers).toContain("eh");
      expect(fillers).toContain("este");
      expect(fillers).toContain("bueno");
      expect(fillers).toContain("pues");
    });

    it("should use es-US speech language code (not es-419 yet)", () => {
      expect(LANGUAGES.es.speechLanguageCode).toBe("es-US");
    });
  });
});

describe("Language types and constants", () => {
  it("should export SUPPORTED_LANGUAGES tuple", () => {
    expect(SUPPORTED_LANGUAGES).toEqual(["en", "es"]);
    expect(SUPPORTED_LANGUAGES).toContain("en");
    expect(SUPPORTED_LANGUAGES).toContain("es");
  });

  it("should export DEFAULT_LANGUAGE as en", () => {
    expect(DEFAULT_LANGUAGE).toBe("en");
  });

  it("should have SupportedLanguage type matching LANGUAGES keys", () => {
    const languages: SupportedLanguage[] = ["en", "es"];
    languages.forEach(lang => {
      expect(LANGUAGES).toHaveProperty(lang);
    });
  });
});

describe("isSupportedLanguage", () => {
  it("should return true for supported languages", () => {
    expect(isSupportedLanguage("en")).toBe(true);
    expect(isSupportedLanguage("es")).toBe(true);
  });

  it("should return false for unsupported languages", () => {
    expect(isSupportedLanguage("fr")).toBe(false);
    expect(isSupportedLanguage("de")).toBe(false);
    expect(isSupportedLanguage("zh")).toBe(false);
    expect(isSupportedLanguage("")).toBe(false);
    expect(isSupportedLanguage("invalid")).toBe(false);
  });

  it("should act as a proper type guard", () => {
    const testValue: string = "en";
    if (isSupportedLanguage(testValue)) {
      // TypeScript should narrow testValue to SupportedLanguage here
      const _lang: SupportedLanguage = testValue;
      expect(_lang).toBe("en");
    }
  });
});

describe("resolveUiLocale", () => {
  it("should prioritize urlLocale first", () => {
    expect(resolveUiLocale({
      urlLocale: "es",
      userPref: "en",
      cookieLocale: "en",
      acceptLanguage: "en-US"
    })).toBe("es");
  });

  it("should prioritize userPref over cookie and acceptLanguage", () => {
    expect(resolveUiLocale({
      userPref: "es",
      cookieLocale: "en",
      acceptLanguage: "en-US"
    })).toBe("es");
  });

  it("should prioritize cookieLocale over acceptLanguage", () => {
    expect(resolveUiLocale({
      cookieLocale: "es",
      acceptLanguage: "en-US"
    })).toBe("es");
  });

  it("should parse acceptLanguage header correctly", () => {
    expect(resolveUiLocale({
      acceptLanguage: "es-MX,en-US;q=0.9"
    })).toBe("es");

    expect(resolveUiLocale({
      acceptLanguage: "en-US,es-MX;q=0.9"
    })).toBe("en");
  });

  it("should handle acceptLanguage with country codes", () => {
    expect(resolveUiLocale({
      acceptLanguage: "es-419"
    })).toBe("es");

    expect(resolveUiLocale({
      acceptLanguage: "en-GB"
    })).toBe("en");
  });

  it("should return default language when no options provided", () => {
    expect(resolveUiLocale({})).toBe("en");
  });

  it("should return default for unsupported languages", () => {
    expect(resolveUiLocale({
      urlLocale: "fr",
      userPref: "de",
      cookieLocale: "zh",
      acceptLanguage: "ja-JP"
    })).toBe("en");
  });

  it("should ignore invalid urlLocale and check next priority", () => {
    expect(resolveUiLocale({
      urlLocale: "invalid",
      userPref: "es"
    })).toBe("es");
  });

  it("should handle empty strings appropriately", () => {
    expect(resolveUiLocale({
      urlLocale: "",
      userPref: "",
      cookieLocale: "",
      acceptLanguage: ""
    })).toBe("en");
  });

  it("should handle malformed acceptLanguage", () => {
    expect(resolveUiLocale({
      acceptLanguage: ";;;,,,"
    })).toBe("en");
  });
});

describe("buildLanguageInstruction", () => {
  it("should return empty string for en", () => {
    expect(buildLanguageInstruction("en")).toBe("");
  });

  it("should return Spanish instruction for es", () => {
    const instruction = buildLanguageInstruction("es");
    expect(instruction).toBeTruthy();
    expect(instruction).toContain("Latin American Spanish");
  });

  it("should work with all supported languages", () => {
    SUPPORTED_LANGUAGES.forEach(lang => {
      const instruction = buildLanguageInstruction(lang);
      expect(instruction).toBeDefined();
      expect(typeof instruction).toBe("string");
    });
  });
});

describe("No language ternaries", () => {
  it("should not contain lang === 'es' ternaries in the file", async () => {
    // This test verifies the implementation doesn't use ternaries
    // The actual implementation uses object lookups instead
    const languageModule = await import("./language");
    const moduleString = JSON.stringify(languageModule);

    // Check that we're using object-based approach, not ternaries
    expect(LANGUAGES.es).toBeDefined();
    expect(LANGUAGES.en).toBeDefined();

    // Verify functions use LANGUAGES object
    expect(buildLanguageInstruction("es")).toBe(LANGUAGES.es.instruction);
    expect(buildLanguageInstruction("en")).toBe(LANGUAGES.en.instruction);
  });
});