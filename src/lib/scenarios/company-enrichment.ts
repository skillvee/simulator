/**
 * Company Context Enrichment
 *
 * Enriches sparse company descriptions with public web information
 * to make simulations feel more authentic.
 */

import { gemini } from "@/lib/ai/gemini";

/**
 * Input for company enrichment
 */
export interface EnrichCompanyInput {
  companyName: string;
  existingDescription?: string;
}

/**
 * Result of company enrichment
 */
export interface EnrichCompanyResult {
  companyDescription: string;
  wasEnriched: boolean;
  enrichmentSource?: "web" | "none";
  error?: string;
}

/**
 * Minimum description length to skip enrichment
 * If description is >= this length, we assume it's detailed enough
 */
const MIN_DESCRIPTION_LENGTH = 50;

/**
 * Timeout for web fetch operations (5 seconds)
 */
const FETCH_TIMEOUT_MS = 5000;

/**
 * Enrich company context from public web sources
 *
 * Only enriches if:
 * - Existing description is sparse (< 50 characters)
 * - Web fetch succeeds within 5 seconds
 *
 * If enrichment fails or times out, returns original description unchanged.
 * This is best-effort and never blocks the main flow.
 */
export async function enrichCompanyContext(
  input: EnrichCompanyInput
): Promise<EnrichCompanyResult> {
  const { companyName, existingDescription = "" } = input;

  // Don't overwrite detailed descriptions
  if (existingDescription.length >= MIN_DESCRIPTION_LENGTH) {
    return {
      companyDescription: existingDescription,
      wasEnriched: false,
      enrichmentSource: "none",
    };
  }

  try {
    // Fetch company information from the web
    const webInfo = await fetchCompanyInfoWithTimeout(companyName);

    if (!webInfo) {
      // Web fetch failed or returned nothing useful
      return {
        companyDescription: existingDescription,
        wasEnriched: false,
        enrichmentSource: "none",
      };
    }

    // Use Gemini Flash to synthesize a concise company description
    try {
      const enrichedDescription = await synthesizeCompanyDescription(
        companyName,
        webInfo,
        existingDescription
      );

      return {
        companyDescription: enrichedDescription,
        wasEnriched: true,
        enrichmentSource: "web",
      };
    } catch (geminiError) {
      // If Gemini fails, we still got web info but couldn't summarize it
      // Fall back to existing description
      return {
        companyDescription: existingDescription,
        wasEnriched: false,
        enrichmentSource: "none",
        error:
          geminiError instanceof Error
            ? geminiError.message
            : "Unknown Gemini error",
      };
    }
  } catch (err) {
    // Best-effort: if anything fails, return original description
    return {
      companyDescription: existingDescription,
      wasEnriched: false,
      enrichmentSource: "none",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Fetch company information from the web with timeout
 * Returns null if fetch fails or times out
 */
async function fetchCompanyInfoWithTimeout(
  companyName: string
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // Try to fetch company's about page or website
    // Start with a simple web search query
    const searchQuery = encodeURIComponent(`${companyName} company about`);
    const searchUrl = `https://www.google.com/search?q=${searchQuery}`;

    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Extract text from HTML (simple extraction, not comprehensive)
    // Remove script and style tags
    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Return first 2000 characters for summarization
    return textContent.slice(0, 2000) || null;
  } catch {
    // Timeout, network error, or any other issue
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Use Gemini Flash to synthesize a concise company description
 * from web content and existing description
 */
async function synthesizeCompanyDescription(
  companyName: string,
  webInfo: string,
  existingDescription: string
): Promise<string> {
  const prompt = `You are helping create a realistic simulation for a coding assessment. You need to create a concise company description (2-3 sentences) for ${companyName}.

${existingDescription ? `Existing description: "${existingDescription}"` : "No existing description provided."}

Here's some information found on the web about this company:
"""
${webInfo}
"""

Create a 2-3 sentence company description that includes:
- What the company does (products/services)
- Industry/sector
- Company stage or size (if available)

Be factual and concise. Don't hallucinate details not present in the web content. If the web content doesn't provide useful information, just improve the existing description or return "${companyName} is a company" if you have nothing to work with.

Return ONLY the company description, nothing else.`;

  const result = await gemini.models.generateContent({
    model: "gemini-3-flash-preview", // Using Flash for quick summarization
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  });

  const description = (result.text ?? "").trim();

  // Fallback to existing description if AI returns empty or very short response
  if (description.length < 20) {
    return existingDescription || `${companyName} is a company.`;
  }

  return description;
}
