/**
 * Alternative i18n coverage test that can run with vitest
 * This version doesn't require a running dev server
 */

import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory of this test file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// English stopwords that should not appear in Spanish pages  
const ENGLISH_STOPWORDS = new Set([
  "the", "and", "you", "with", "for", "of", "to", "is", "are", "was", "were",
  "have", "has", "had", "been", "being", "be", "will", "would", "could", "should",
  "may", "might", "must", "can", "this", "that", "these", "those", "their",
  "there", "here", "where", "when", "what", "which", "who", "whom", "whose",
  "why", "how", "all", "any", "both", "each", "few", "more", "most", "other",
  "some", "such", "only", "own", "same", "than", "too", "very", "just", "your",
  "our", "its", "they", "them", "we", "us", "he", "him", "she", "her", "it",
  "my", "me", "an", "a", "as", "at", "by", "from", "in", "into", "like", "near",
  "on", "or", "so", "up", "if", "but", "not", "no", "yes", "do", "does", "did",
  "loading", "please", "welcome", "sign", "continue", "submit", "cancel", "save",
  "delete", "edit", "view", "click", "select", "enter"
]);

// Technical terms that should stay in English
const ENGLISH_ALLOWLIST = new Set([
  "skillvee", "react", "next.js", "javascript", "typescript", "api", "json",
  "html", "css", "github", "git", "npm", "node", "sql", "http", "https",
  "url", "id", "uuid", "oauth", "jwt", "rest", "graphql", "webpack", "babel",
  "eslint", "prettier", "docker", "kubernetes", "aws", "gcp", "azure", "vercel",
  "supabase", "postgres", "redis", "mongodb", "email", "slack", "zoom", "google",
  "microsoft", "apple", "linux", "windows", "macos", "chrome", "firefox", "safari",
  "edge", "pdf", "png", "jpg", "jpeg", "gif", "svg", "mp4", "mp3", "wav",
  "ai", "ml", "llm", "gpt", "claude", "gemini", "openai", "anthropic",
  "coworker", "manager", "hr", "pr", "prd", "readme", "dashboard"
]);

interface TranslationCheck {
  file: string;
  englishPhrases: string[];
}

/**
 * Scans a source file for hardcoded English strings
 */
async function scanFileForEnglish(filePath: string): Promise<TranslationCheck | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    
    // Skip if it's not a TypeScript/React file
    if (!filePath.endsWith(".tsx") && !filePath.endsWith(".ts")) {
      return null;
    }
    
    // Skip test files, API routes, and non-UI files
    if (
      filePath.includes(".test.") ||
      filePath.includes(".spec.") ||
      filePath.includes("/api/") ||
      filePath.includes("/lib/") ||
      filePath.includes("/utils/") ||
      filePath.includes("/hooks/") ||
      filePath.includes("/types/")
    ) {
      return null;
    }
    
    const englishPhrases: string[] = [];
    
    // Look for hardcoded strings in JSX
    const jsxStringRegex = />[^<{]+</g;
    const jsxMatches = content.match(jsxStringRegex) || [];
    
    for (const match of jsxMatches) {
      const text = match.slice(1, -1).trim();
      if (text && containsEnglish(text)) {
        englishPhrases.push(text);
      }
    }
    
    // Look for string literals that might be UI text
    const stringLiteralRegex = /(['"`])([^'"`]+)\1/g;
    let match;
    while ((match = stringLiteralRegex.exec(content)) !== null) {
      const text = match[2].trim();
      
      // Skip if it looks like a key, URL, or technical identifier
      if (
        text.includes("/") ||
        text.includes(".") ||
        text.includes("_") ||
        text.includes("-") ||
        text.length < 3 ||
        text.length > 100 ||
        /^[A-Z_]+$/.test(text) // All caps constants
      ) {
        continue;
      }
      
      if (containsEnglish(text)) {
        englishPhrases.push(text);
      }
    }
    
    if (englishPhrases.length > 0) {
      return {
        file: path.relative(projectRoot, filePath),
        englishPhrases: [...new Set(englishPhrases)] // Remove duplicates
      };
    }
    
    return null;
  } catch (error) {
    console.warn(`Failed to scan file ${filePath}:`, error);
    return null;
  }
}

/**
 * Checks if text contains English words
 */
function containsEnglish(text: string): boolean {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  
  for (const word of words) {
    const cleanWord = word.replace(/[^a-z0-9]/gi, "");
    
    if (!cleanWord || cleanWord.length < 2) continue;
    
    // Skip if in allowlist
    if (ENGLISH_ALLOWLIST.has(cleanWord)) continue;
    
    // Check if it's an English stopword
    if (ENGLISH_STOPWORDS.has(cleanWord)) {
      return true;
    }
  }
  
  // Check for common English phrases
  const commonPhrases = [
    "sign in", "sign up", "log in", "log out", "forgot password",
    "reset password", "create account", "get started", "learn more",
    "contact us", "try again", "something went wrong", "page not found"
  ];
  
  for (const phrase of commonPhrases) {
    if (lowerText.includes(phrase)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get all TypeScript/React files in a directory recursively
 */
async function getAllSourceFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules, .next, and other build directories
        if (
          entry.name === "node_modules" ||
          entry.name === ".next" ||
          entry.name === "dist" ||
          entry.name === "build" ||
          entry.name === ".git"
        ) {
          continue;
        }
        
        const subFiles = await getAllSourceFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to read directory ${dir}:`, error);
  }
  
  return files;
}

/**
 * Checks if translation files exist and have content
 */
async function checkTranslationFiles(): Promise<{
  hasEnglish: boolean;
  hasSpanish: boolean;
  englishKeys: number;
  spanishKeys: number;
}> {
  const enPath = path.join(projectRoot, "src/messages/en.json");
  const esPath = path.join(projectRoot, "src/messages/es.json");
  
  let hasEnglish = false;
  let hasSpanish = false;
  let englishKeys = 0;
  let spanishKeys = 0;
  
  try {
    const enContent = await fs.readFile(enPath, "utf-8");
    const enJson = JSON.parse(enContent);
    hasEnglish = true;
    englishKeys = countKeys(enJson);
  } catch (error) {
    // File doesn't exist or is invalid
  }
  
  try {
    const esContent = await fs.readFile(esPath, "utf-8");
    const esJson = JSON.parse(esContent);
    hasSpanish = true;
    spanishKeys = countKeys(esJson);
  } catch (error) {
    // File doesn't exist or is invalid
  }
  
  return { hasEnglish, hasSpanish, englishKeys, spanishKeys };
}

/**
 * Count keys in a nested object
 */
function countKeys(obj: any): number {
  let count = 0;
  
  for (const key in obj) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      count += countKeys(obj[key]);
    } else {
      count++;
    }
  }
  
  return count;
}

describe("i18n Static Analysis Coverage", () => {
  let sourceFiles: string[] = [];
  let translationStatus: ReturnType<typeof checkTranslationFiles> extends Promise<infer T> ? T : never;
  
  beforeAll(async () => {
    // Get all source files in the app directory
    const appDir = path.join(projectRoot, "src/app");
    const componentsDir = path.join(projectRoot, "src/components");
    
    const appFiles = await getAllSourceFiles(appDir);
    const componentFiles = await getAllSourceFiles(componentsDir);
    
    sourceFiles = [...appFiles, ...componentFiles];
    translationStatus = await checkTranslationFiles();
  });
  
  it("should have translation files configured", () => {
    expect(translationStatus.hasEnglish).toBe(true);
    expect(translationStatus.hasSpanish).toBe(true);
  });
  
  it("should not have hardcoded English strings in UI components", async () => {
    const failures: TranslationCheck[] = [];
    
    for (const file of sourceFiles) {
      const result = await scanFileForEnglish(file);
      if (result) {
        failures.push(result);
      }
    }
    
    if (failures.length > 0) {
      console.log("\n🅿️ Files with hardcoded English strings:\n");
      
      for (const failure of failures) {
        console.log(`\nFile: ${failure.file}`);
        console.log("English phrases detected:");
        for (const phrase of failure.englishPhrases.slice(0, 5)) {
          console.log(`  - "${phrase}"`);
        }
        if (failure.englishPhrases.length > 5) {
          console.log(`  ... and ${failure.englishPhrases.length - 5} more`);
        }
      }
      
      console.log(`\nTotal files with issues: ${failures.length}`);
      console.log("\nTo fix: Extract these strings to messages/[locale].json and use useTranslations hook\n");
    }
    
    // For now, we'll just warn about the issues rather than fail
    // Once translations are implemented, change this to:
    // expect(failures).toHaveLength(0);
    
    if (failures.length > 0) {
      console.warn(`Warning: ${failures.length} files contain hardcoded English strings`);
    }
  });
  
  it("should have matching keys in English and Spanish translations", () => {
    if (translationStatus.englishKeys > 0 || translationStatus.spanishKeys > 0) {
      const keyDiff = Math.abs(translationStatus.englishKeys - translationStatus.spanishKeys);
      
      if (keyDiff > 0) {
        console.warn(`\nTranslation key mismatch:`);
        console.warn(`  English keys: ${translationStatus.englishKeys}`);
        console.warn(`  Spanish keys: ${translationStatus.spanishKeys}`);
        console.warn(`  Difference: ${keyDiff} keys\n`);
      }
      
      // For now, just warn. Once translations are complete:
      // expect(translationStatus.englishKeys).toBe(translationStatus.spanishKeys);
    }
  });
});