/**
 * Repository provisioning for simulation repos (US-007)
 *
 * Two-layer architecture:
 * 1. Scenario-level: AI-generates a full repo from a scaffold + RepoSpec
 * 2. Assessment-level: Clones from the scenario repo (one per candidate)
 *
 * The AI pipeline (repo-spec-generator → repo-builder) creates domain-specific
 * repos with realistic code, git history, docs, and GitHub Issues tailored to
 * each scenario's company, tech stack, and task.
 *
 * Scaffolds (clean starter repos) provide working build infrastructure.
 * AI generates all domain-specific content on top.
 */

import { createLogger } from "@/lib/core";
import { generateRepoSpec } from "./repo-spec-generator";
import { buildRepoFromSpec } from "./repo-builder";
import {
  needsRepo as needsRepoCheck,
  type ScenarioMetadata,
} from "./repo-spec";

const logger = createLogger("lib:scenarios:repo-templates");

// Re-export for backward compatibility with existing imports
export { needsRepoCheck as needsRepo };

// ---------------------------------------------------------------------------
// Scenario-level provisioning (AI-generated)
// ---------------------------------------------------------------------------

/**
 * Provision a new GitHub repository using AI-generated content (scenario-level).
 *
 * 1. Generates a RepoSpec from scenario metadata via Gemini Flash
 * 2. Builds the repo on GitHub from a scaffold + spec
 * 3. Marks it as a template for per-assessment forking
 *
 * @param scenarioId - The scenario ID (used for repo naming)
 * @param metadata - Full scenario context (company, task, tech stack, coworkers)
 * @returns Object with repoUrl (or null) and the generated repoSpec for caching
 */
export async function provisionRepo(
  scenarioId: string,
  metadata: ScenarioMetadata
): Promise<{ repoUrl: string; repoSpec: unknown }> {
  const githubToken = process.env.GITHUB_ORG_TOKEN;

  if (!githubToken) {
    const error = "GITHUB_ORG_TOKEN not set. Add it to .env.local to enable repo provisioning.";
    logger.error("GITHUB_ORG_TOKEN not set", { error });
    throw new Error(error);
  }

  try {
    // Phase 1: Generate repo spec from scenario metadata
    logger.info("Starting provisioning", { scenarioId, companyName: metadata.companyName });
    const { spec } = await generateRepoSpec(metadata);
    logger.info("Generated spec", { projectName: spec.projectName, fileCount: spec.files.length, commitCount: spec.commitHistory.length });

    // Phase 2: Build the repo on GitHub
    logger.info("Creating GitHub repository", { scenarioId });
    const repoUrl = await buildRepoFromSpec(scenarioId, spec, githubToken);

    if (!repoUrl) {
      const error = "GitHub repo creation failed — check GITHUB_ORG_TOKEN permissions and GitHub API status";
      logger.error("GitHub repo creation failed", { scenarioId, error });
      throw new Error(error);
    }

    logger.info("Repository provisioned", { repoUrl });
    return { repoUrl, repoSpec: spec };
  } catch (error) {
    logger.error("Fatal error", { scenarioId, error: String(error) });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Assessment-level provisioning (clones from scenario repo)
// ---------------------------------------------------------------------------

const GITHUB_API_HEADERS = (token: string) => ({
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
});

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  const url = new URL(repoUrl);
  const [, owner, repo] = url.pathname.split("/");
  return { owner, repo };
}

/**
 * Replay git commit history from a source repo into a target repo.
 *
 * GitHub's "generate from template" squashes all history into one "Initial commit".
 * This function fetches the commit history from the source and replays it on the
 * target so candidates see a realistic git log with multiple authors and messages.
 *
 * Non-throwing: logs warnings on failure, never blocks provisioning.
 */
async function replayCommitHistory(
  sourceOwnerRepo: string,
  targetRepoUrl: string,
  githubToken: string
): Promise<void> {
  const headers = GITHUB_API_HEADERS(githubToken);

  try {
    const { owner: targetOwner, repo: targetRepo } =
      parseRepoUrl(targetRepoUrl);

    const commitsRes = await fetch(
      `https://api.github.com/repos/${sourceOwnerRepo}/commits?per_page=100`,
      { headers }
    );

    if (!commitsRes.ok) {
      logger.warn("Failed to fetch commits", { sourceOwnerRepo, status: commitsRes.status });
      return;
    }

    const commits = (await commitsRes.json()).reverse(); // Oldest first

    if (commits.length < 2) {
      logger.info("Source has few commits, nothing to replay", { commitCount: commits.length });
      return;
    }

    // Skip the first commit (initial setup) — target already has those files
    const commitsToReplay = commits.slice(1);

    logger.info("Replaying commits", { commitCount: commitsToReplay.length, sourceOwnerRepo, targetOwner, targetRepo });

    const headRefRes = await fetch(
      `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/ref/heads/main`,
      { headers }
    );

    if (!headRefRes.ok) {
      logger.warn("Failed to get HEAD ref", { status: headRefRes.status });
      return;
    }

    let currentCommitSha = (await headRefRes.json()).object.sha;

    const headCommitRes = await fetch(
      `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/commits/${currentCommitSha}`,
      { headers }
    );

    if (!headCommitRes.ok) {
      logger.warn("Failed to get HEAD commit", { status: headCommitRes.status });
      return;
    }

    let currentTreeSha = (await headCommitRes.json()).tree.sha;

    for (const commit of commitsToReplay) {
      const diffRes = await fetch(
        `https://api.github.com/repos/${sourceOwnerRepo}/commits/${commit.sha}`,
        { headers }
      );

      if (!diffRes.ok) {
        logger.warn("Failed to fetch commit diff", { commitSha: commit.sha.slice(0, 7), status: diffRes.status });
        continue;
      }

      const commitDetail = await diffRes.json();
      const files = commitDetail.files || [];

      if (files.length === 0) {
        const createCommitRes = await fetch(
          `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/commits`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              message: commit.commit.message,
              tree: currentTreeSha,
              parents: [currentCommitSha],
              author: commit.commit.author,
              committer: commit.commit.committer,
            }),
          }
        );

        if (createCommitRes.ok) {
          currentCommitSha = (await createCommitRes.json()).sha;
        }
        continue;
      }

      const treeItems: Array<{
        path: string;
        mode: string;
        type: string;
        sha?: string;
      }> = [];

      for (const file of files) {
        if (file.status === "removed") {
          treeItems.push({
            path: file.filename,
            mode: "100644",
            type: "blob",
            sha: undefined,
          });
          continue;
        }

        if (!file.sha) continue;

        const blobRes = await fetch(
          `https://api.github.com/repos/${sourceOwnerRepo}/git/blobs/${file.sha}`,
          { headers }
        );

        if (!blobRes.ok) continue;
        const blobData = await blobRes.json();

        const createBlobRes = await fetch(
          `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/blobs`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              content: blobData.content,
              encoding: "base64",
            }),
          }
        );

        if (!createBlobRes.ok) continue;
        const newBlob = await createBlobRes.json();

        treeItems.push({
          path: file.filename,
          mode: "100644",
          type: "blob",
          sha: newBlob.sha,
        });
      }

      if (treeItems.length === 0) continue;

      const createTreeRes = await fetch(
        `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/trees`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            base_tree: currentTreeSha,
            tree: treeItems,
          }),
        }
      );

      if (!createTreeRes.ok) {
        logger.warn("Failed to create tree", { commitMessage: commit.commit.message.split("\n")[0], status: createTreeRes.status });
        continue;
      }

      const newTree = await createTreeRes.json();

      const createCommitRes = await fetch(
        `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/commits`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: commit.commit.message,
            tree: newTree.sha,
            parents: [currentCommitSha],
            author: commit.commit.author,
            committer: commit.commit.committer,
          }),
        }
      );

      if (!createCommitRes.ok) {
        logger.warn("Failed to create commit", { commitMessage: commit.commit.message.split("\n")[0], status: createCommitRes.status });
        continue;
      }

      const newCommit = await createCommitRes.json();
      currentCommitSha = newCommit.sha;
      currentTreeSha = newTree.sha;
    }

    const updateRefRes = await fetch(
      `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/refs/heads/main`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ sha: currentCommitSha, force: true }),
      }
    );

    if (updateRefRes.ok) {
      logger.info("Successfully replayed commits", { commitCount: commitsToReplay.length, targetOwner, targetRepo });
    } else {
      logger.warn("Failed to update ref", { status: updateRefRes.status });
    }
  } catch (err) {
    logger.warn("Error replaying commit history", { error: String(err) });
  }
}

/**
 * Copy GitHub Issues (with comments) from one repo to another.
 * Non-throwing: logs warnings on failure, never blocks provisioning.
 */
async function copyIssuesFromTemplate(
  sourceOwnerRepo: string,
  targetRepoUrl: string,
  githubToken: string
): Promise<void> {
  try {
    const { owner: targetOwner, repo: targetRepo } =
      parseRepoUrl(targetRepoUrl);

    const issuesRes = await fetch(
      `https://api.github.com/repos/${sourceOwnerRepo}/issues?state=all&sort=created&direction=asc&per_page=100`,
      { headers: GITHUB_API_HEADERS(githubToken) }
    );

    if (!issuesRes.ok) {
      logger.warn("Failed to fetch issues", { sourceOwnerRepo, status: issuesRes.status });
      return;
    }

    const issues = await issuesRes.json();
    const realIssues = issues.filter(
      (issue: { pull_request?: unknown }) => !issue.pull_request
    );

    logger.info("Copying issues", { issueCount: realIssues.length, sourceOwnerRepo, targetOwner, targetRepo });

    for (const issue of realIssues) {
      const createRes = await fetch(
        `https://api.github.com/repos/${targetOwner}/${targetRepo}/issues`,
        {
          method: "POST",
          headers: GITHUB_API_HEADERS(githubToken),
          body: JSON.stringify({
            title: issue.title,
            body: issue.body || "",
            labels:
              issue.labels?.map((l: { name: string }) => l.name) || [],
          }),
        }
      );

      if (!createRes.ok) {
        logger.warn("Failed to create issue", { issueTitle: issue.title, status: createRes.status });
        continue;
      }

      const createdIssue = await createRes.json();

      if (issue.comments > 0) {
        const commentsRes = await fetch(
          `https://api.github.com/repos/${sourceOwnerRepo}/issues/${issue.number}/comments?per_page=100`,
          { headers: GITHUB_API_HEADERS(githubToken) }
        );

        if (commentsRes.ok) {
          const comments = await commentsRes.json();
          for (const comment of comments) {
            await fetch(
              `https://api.github.com/repos/${targetOwner}/${targetRepo}/issues/${createdIssue.number}/comments`,
              {
                method: "POST",
                headers: GITHUB_API_HEADERS(githubToken),
                body: JSON.stringify({ body: comment.body }),
              }
            );
          }
        }
      }

      if (issue.state === "closed") {
        await fetch(
          `https://api.github.com/repos/${targetOwner}/${targetRepo}/issues/${createdIssue.number}`,
          {
            method: "PATCH",
            headers: GITHUB_API_HEADERS(githubToken),
            body: JSON.stringify({ state: "closed" }),
          }
        );
      }
    }

    logger.info("Successfully copied issues", { issueCount: realIssues.length, targetOwner, targetRepo });
  } catch (err) {
    logger.warn("Error copying issues", { error: String(err) });
  }
}

/**
 * Provision a per-assessment GitHub repository from the scenario's template repo.
 * Each candidate gets their own isolated repo.
 *
 * @param assessmentId - The assessment ID (used for repo naming)
 * @param scenarioRepoUrl - The scenario's template repo URL to generate from
 * @returns The new repository URL, or null if provisioning failed
 */
export async function provisionAssessmentRepo(
  assessmentId: string,
  scenarioRepoUrl: string
): Promise<string | null> {
  const githubToken = process.env.GITHUB_ORG_TOKEN;

  if (!githubToken) {
    logger.error("GITHUB_ORG_TOKEN not set, cannot provision repo", { assessmentId });
    return null;
  }

  try {
    const url = new URL(scenarioRepoUrl);
    const [, owner, templateRepo] = url.pathname.split("/");

    const repoName = `assessment-${assessmentId.slice(0, 12)}`;

    logger.info("Creating repo from template", { repoName, owner, templateRepo });

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${templateRepo}/generate`,
      {
        method: "POST",
        headers: GITHUB_API_HEADERS(githubToken),
        body: JSON.stringify({
          owner,
          name: repoName,
          description: `Assessment repository for ${assessmentId}`,
          private: false,
          include_all_branches: false,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      logger.error("GitHub API error", { status: response.status, errorData: JSON.stringify(errorData) });
      return null;
    }

    const data = await response.json();
    const repoUrl = data.html_url;

    logger.info("Successfully created repo", { repoUrl });

    // Replay commit history (template generation squashes to one commit)
    await replayCommitHistory(
      `${owner}/${templateRepo}`,
      repoUrl,
      githubToken
    );

    // Copy GitHub Issues (template generation doesn't copy issues)
    await copyIssuesFromTemplate(
      `${owner}/${templateRepo}`,
      repoUrl,
      githubToken
    );

    return repoUrl;
  } catch (error) {
    logger.error("Failed to provision repo", { assessmentId, error: String(error) });
    return null;
  }
}
