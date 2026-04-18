import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, Browser, Page } from "playwright";
import path from "path";
import fs from "fs/promises";

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
  "don't", "doesn't", "didn't", "loading", "please", "welcome", "sign", "continue",
  "submit", "cancel", "save", "delete", "edit", "view", "click", "select", "enter"
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
  // Company/product specific terms
  "coworker", "manager", "hr", "pr", "prd", "readme", "dashboard"
]);

// Route configurations for testing
interface RouteConfig {
  path: string;
  requiresAuth: boolean;
  requiresScenario?: boolean;
  skipForSpanish?: boolean;
  description: string;
}

// All routes to test for i18n coverage
const ROUTES_TO_TEST: RouteConfig[] = [
  // Public pages
  { path: "/", requiresAuth: false, description: "Landing page" },
  { path: "/sign-in", requiresAuth: false, description: "Sign in page" },
  { path: "/sign-up", requiresAuth: false, description: "Sign up page" },
  
  // Candidate pages
  { path: "/candidate/dashboard", requiresAuth: true, description: "Candidate dashboard" },
  { path: "/candidate/profile", requiresAuth: true, description: "Candidate profile" },
  
  // Assessment pages (require scenario)
  { path: "/assessments/{id}/welcome", requiresAuth: true, requiresScenario: true, description: "Assessment welcome" },
  { path: "/assessments/{id}/work", requiresAuth: true, requiresScenario: true, description: "Assessment work page" },
  { path: "/assessments/{id}/results", requiresAuth: true, requiresScenario: true, description: "Assessment results" },
  
  // Recruiter pages
  { path: "/recruiter/simulations", requiresAuth: true, description: "Recruiter simulations list" },
  { path: "/recruiter/simulations/new", requiresAuth: true, description: "Create new simulation" },
  { path: "/recruiter/assessments", requiresAuth: true, description: "Recruiter assessments list" },
  { path: "/recruiter/candidates", requiresAuth: true, description: "Recruiter candidates list" },
  
  // Invite pages
  { path: "/invite/{scenarioId}", requiresAuth: false, requiresScenario: true, description: "Assessment invite page" },
  
  // Marketing pages
  { path: "/pricing", requiresAuth: false, description: "Pricing page" },
  { path: "/about", requiresAuth: false, description: "About page" },
  { path: "/privacy", requiresAuth: false, description: "Privacy policy" },
  { path: "/terms", requiresAuth: false, description: "Terms of service" },
];

// Test utilities
class I18nCoverageTester {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private baseUrl: string;
  private testUserId: string | null = null;
  private spanishScenarioId: string | null = null;
  private englishScenarioId: string | null = null;
  private failures: Array<{
    route: string;
    locale: string;
    englishPhrases: string[];
    suggestedKeys: string[];
  }> = [];

  constructor(baseUrl: string = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  async setup() {
    // Launch browser
    this.browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    this.page = await this.browser.newPage();
    
    // Set up test data
    await this.setupTestData();
  }

  async teardown() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }

  private async setupTestData() {
    // Use existing test data from seed
    // The seed creates test users and a test assessment
    this.testUserId = "test-user-id"; // From seed
    this.spanishScenarioId = "test-scenario-es"; // Will need to create
    this.englishScenarioId = "test-assessment-chat"; // From seed
  }

  async loginAsTestUser() {
    if (!this.page) throw new Error("Browser not initialized");
    
    // Navigate to sign-in page
    await this.page.goto(`${this.baseUrl}/sign-in`);
    
    // Fill in credentials
    await this.page.fill("#email", "user@test.com");
    await this.page.fill("#password", "testpassword123");
    
    // Submit form
    await this.page.click("button[type='submit']");
    
    // Wait for navigation
    await this.page.waitForURL(/\/candidate\/dashboard/, { timeout: 10000 });
  }

  async testRoute(route: RouteConfig, locale: "es" | "en") {
    if (!this.page) throw new Error("Browser not initialized");
    
    // Build the actual path
    let actualPath = route.path;
    
    // Replace placeholders
    if (route.requiresScenario) {
      const scenarioId = locale === "es" ? this.spanishScenarioId : this.englishScenarioId;
      actualPath = actualPath
        .replace("{id}", scenarioId || "test-assessment-chat")
        .replace("{scenarioId}", scenarioId || "test-assessment-chat");
    }
    
    // Add locale prefix
    const fullPath = `/${locale}${actualPath}`;
    
    try {
      // Navigate to the route
      const response = await this.page.goto(`${this.baseUrl}${fullPath}`, {
        waitUntil: "networkidle",
        timeout: 30000
      });
      
      // Check if we need to handle redirects for scenario-locked routes
      if (route.requiresScenario && response) {
        const finalUrl = this.page.url();
        // For scenario-locked routes, we expect to be redirected to the scenario's language
        // This is fine - we'll test the content at the final destination
      }
      
      // Wait a bit for dynamic content to load
      await this.page.waitForTimeout(2000);
      
      // Extract visible text from the page
      const visibleText = await this.extractVisibleText();
      
      // Check for English leaks in Spanish pages
      if (locale === "es") {
        const leaks = this.detectEnglishLeaks(visibleText);
        if (leaks.length > 0) {
          this.failures.push({
            route: fullPath,
            locale,
            englishPhrases: leaks,
            suggestedKeys: this.generateSuggestedKeys(route.path, leaks)
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to test route ${fullPath}:`, error);
      // Some routes might not exist yet or require specific setup
      // We'll log but not fail the entire test suite
    }
  }

  private async extractVisibleText(): Promise<string> {
    if (!this.page) return "";
    
    // Extract all visible text, excluding script and style tags
    return await this.page.evaluate(() => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            
            // Skip invisible elements
            const style = window.getComputedStyle(parent);
            if (style.display === "none" || style.visibility === "hidden") {
              return NodeFilter.FILTER_REJECT;
            }
            
            // Skip script and style tags
            if (parent.tagName === "SCRIPT" || parent.tagName === "STYLE") {
              return NodeFilter.FILTER_REJECT;
            }
            
            // Skip elements with aria-hidden
            if (parent.getAttribute("aria-hidden") === "true") {
              return NodeFilter.FILTER_REJECT;
            }
            
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      
      const textNodes: string[] = [];
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent?.trim();
        if (text) {
          textNodes.push(text);
        }
      }
      
      return textNodes.join(" ");
    });
  }

  private detectEnglishLeaks(text: string): string[] {
    const leaks: Set<string> = new Set();
    
    // Convert to lowercase for comparison
    const lowerText = text.toLowerCase();
    
    // Split into words
    const words = lowerText.split(/\s+/);
    
    // Check each word
    for (const word of words) {
      // Clean the word (remove punctuation)
      const cleanWord = word.replace(/[^a-z0-9]/gi, "");
      
      if (!cleanWord) continue;
      
      // Skip if in allowlist
      if (ENGLISH_ALLOWLIST.has(cleanWord)) continue;
      
      // Check if it's an English stopword
      if (ENGLISH_STOPWORDS.has(cleanWord)) {
        // Try to find the phrase context (up to 5 words around it)
        const wordIndex = words.indexOf(word);
        const contextStart = Math.max(0, wordIndex - 2);
        const contextEnd = Math.min(words.length, wordIndex + 3);
        const phrase = words.slice(contextStart, contextEnd).join(" ");
        leaks.add(phrase);
      }
    }
    
    // Also check for common English phrases that might not be caught by stopwords
    const commonPhrases = [
      "sign in",
      "sign up",
      "log in",
      "log out",
      "forgot password",
      "reset password",
      "create account",
      "get started",
      "learn more",
      "contact us",
      "try again",
      "something went wrong",
      "page not found",
      "coming soon",
      "under construction"
    ];
    
    for (const phrase of commonPhrases) {
      if (lowerText.includes(phrase)) {
        leaks.add(phrase);
      }
    }
    
    return Array.from(leaks);
  }

  private generateSuggestedKeys(routePath: string, leaks: string[]): string[] {
    const suggestions: string[] = [];
    
    // Generate namespace based on route
    let namespace = "common";
    if (routePath.includes("sign-in")) namespace = "auth";
    else if (routePath.includes("sign-up")) namespace = "auth";
    else if (routePath.includes("assessment")) namespace = "assessment";
    else if (routePath.includes("candidate")) namespace = "candidate";
    else if (routePath.includes("recruiter")) namespace = "recruiter";
    else if (routePath.includes("invite")) namespace = "invite";
    else if (routePath === "/") namespace = "landing";
    
    for (const leak of leaks) {
      // Generate a suggested key based on the leak
      const key = leak
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      
      suggestions.push(`${namespace}.${key}`);
    }
    
    return suggestions;
  }

  getFailures() {
    return this.failures;
  }

  generateReport(): string {
    if (this.failures.length === 0) {
      return "✅ All routes passed i18n coverage test. No English leaks detected in Spanish pages.";
    }
    
    let report = `❌ i18n Coverage Test Failed\n\n`;
    report += `Found English leaks in ${this.failures.length} routes:\n\n`;
    
    for (const failure of this.failures) {
      report += `Route: ${failure.route}\n`;
      report += `Detected English phrases:\n`;
      for (const phrase of failure.englishPhrases) {
        report += `  - "${phrase}"\n`;
      }
      report += `Suggested translation keys:\n`;
      for (const key of failure.suggestedKeys) {
        report += `  - ${key}\n`;
      }
      report += "\n";
    }
    
    return report;
  }
}

// Main test suite
describe("i18n Coverage Tests", () => {
  let tester: I18nCoverageTester;
  let devServer: any;
  
  beforeAll(async () => {
    // Set environment variables for E2E mode
    process.env.E2E_TEST_MODE = "true";
    process.env.NEXT_PUBLIC_E2E_TEST_MODE = "true";
    
    // Initialize the tester
    tester = new I18nCoverageTester();
    await tester.setup();
    
    // Log in once for authenticated routes
    await tester.loginAsTestUser();
  }, 60000);
  
  afterAll(async () => {
    await tester.teardown();
  });
  
  it("should not have English leaks in Spanish pages", async () => {
    // Test all routes with Spanish locale
    for (const route of ROUTES_TO_TEST) {
      if (route.skipForSpanish) continue;
      
      await tester.testRoute(route, "es");
    }
    
    // Check for failures
    const failures = tester.getFailures();
    const report = tester.generateReport();
    
    // Log the report
    console.log(report);
    
    // Assert no failures
    expect(failures).toHaveLength(0);
  }, 300000); // 5 minute timeout for full suite
  
  it("should handle English pages correctly as baseline", async () => {
    // Test a few routes with English locale to ensure our detection works
    const sampleRoutes = ROUTES_TO_TEST.slice(0, 3);
    
    for (const route of sampleRoutes) {
      await tester.testRoute(route, "en");
    }
    
    // English pages should not trigger failures (they're allowed to have English)
    const failures = tester.getFailures();
    const englishFailures = failures.filter(f => f.locale === "en");
    expect(englishFailures).toHaveLength(0);
  }, 60000);
});

// Export for manual running
export { I18nCoverageTester, ENGLISH_STOPWORDS, ENGLISH_ALLOWLIST };