/**
 * Validates PR URL format
 * Accepts GitHub and GitLab PR/MR URLs
 */
export function isValidPrUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Must be HTTPS
    if (parsed.protocol !== "https:") {
      return false;
    }

    // Check for common PR/MR patterns
    const validPatterns = [
      /github\.com\/[\w-]+\/[\w-]+\/pull\/\d+/, // GitHub PR
      /gitlab\.com\/[\w-]+\/[\w-]+\/-\/merge_requests\/\d+/, // GitLab MR
      /gitlab\.[\w.]+\/[\w-]+\/[\w-]+\/-\/merge_requests\/\d+/, // Self-hosted GitLab
      /bitbucket\.org\/[\w-]+\/[\w-]+\/pull-requests\/\d+/, // Bitbucket PR
    ];

    return validPatterns.some((pattern) => pattern.test(url));
  } catch {
    return false;
  }
}
