/**
 * Candidate Search Page
 *
 * Chat-centric search interface for hiring managers to describe
 * the profile they're looking for in natural language.
 *
 * @since 2026-01-17
 * @see Issue #72: US-007
 */

import { CandidateSearchClient } from "./client";

export const metadata = {
  title: "Search Candidates | Skillvee",
  description: "Find the right candidate with natural language search",
};

export default function CandidateSearchPage() {
  return <CandidateSearchClient />;
}
