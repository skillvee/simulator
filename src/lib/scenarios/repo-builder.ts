/**
 * Repo Builder
 *
 * Deterministic builder that materializes a RepoSpec into a GitHub repository.
 *
 * Pipeline:
 * 1. Create repo from scaffold template (GitHub "generate from template" API)
 * 2. Update README.md and package.json with project-specific content
 * 3. Create all spec files grouped by commit
 * 4. Build git history via Git Data API (create blob → tree → commit → update ref)
 * 5. Create GitHub Issues with comments
 * 6. Mark repo as template (for per-assessment forking)
 *
 * Non-throwing by design: logs warnings on partial failures, never blocks provisioning.
 */

import type { RepoSpec, FileSpec, Scaffold } from "./repo-spec";
import { SCAFFOLDS } from "./repo-spec";

const LOG_PREFIX = "[RepoBuilder]";

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

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Build a GitHub repository from a RepoSpec.
 *
 * @param scenarioId - Used for repo naming (simulation-{scenarioId})
 * @param spec - The AI-generated repo specification
 * @param githubToken - GitHub org token with repo creation permissions
 * @returns The new repository URL, or null if creation failed
 */
export async function buildRepoFromSpec(
  scenarioId: string,
  spec: RepoSpec,
  githubToken: string
): Promise<string | null> {
  const scaffold = SCAFFOLDS.find((s) => s.id === spec.scaffoldId);
  if (!scaffold) {
    console.error(
      `${LOG_PREFIX} Unknown scaffold: ${spec.scaffoldId}`
    );
    return null;
  }

  // Step 1: Create repo from scaffold template
  const repoUrl = await createRepoFromScaffold(
    scenarioId,
    scaffold,
    spec,
    githubToken
  );
  if (!repoUrl) return null;

  // Wait for GitHub to finish populating template files
  await sleep(5000);

  const { owner, repo } = parseRepoUrl(repoUrl);

  // Step 2: Update scaffold files with project-specific content
  await updateScaffoldFiles(owner, repo, spec, scaffold, githubToken);

  // Step 3: Create all spec files and build commit history
  await createFilesWithHistory(owner, repo, spec, githubToken);

  // Step 4: Create GitHub Issues with comments
  await createIssues(owner, repo, spec, githubToken);

  // Step 5: Mark repo as template for per-assessment forking
  await markRepoAsTemplate(owner, repo, githubToken);

  console.log(
    `${LOG_PREFIX} Successfully built repo: ${repoUrl} (${spec.files.length} files, ${spec.commitHistory.length} commits, ${spec.issues.length} issues)`
  );

  return repoUrl;
}

// ---------------------------------------------------------------------------
// Step 1: Create repo from scaffold
// ---------------------------------------------------------------------------

async function createRepoFromScaffold(
  scenarioId: string,
  scaffold: Scaffold,
  spec: RepoSpec,
  githubToken: string
): Promise<string | null> {
  const [owner, templateRepo] = scaffold.repoTemplate.split("/");
  const repoName = `simulation-${scenarioId}`;

  console.log(
    `${LOG_PREFIX} Creating repo ${repoName} from scaffold ${scaffold.repoTemplate}`
  );

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${templateRepo}/generate`,
      {
        method: "POST",
        headers: GITHUB_API_HEADERS(githubToken),
        body: JSON.stringify({
          owner,
          name: repoName,
          description: spec.projectDescription,
          private: true,
          include_all_branches: false,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error(
        `${LOG_PREFIX} GitHub API error creating repo: ${response.status}`,
        errorData
      );
      return null;
    }

    const data = await response.json();
    console.log(`${LOG_PREFIX} Created repo: ${data.html_url}`);
    return data.html_url;
  } catch (err) {
    console.error(`${LOG_PREFIX} Failed to create repo:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Step 2: Update scaffold files (README.md, package.json name)
// ---------------------------------------------------------------------------

async function updateScaffoldFiles(
  owner: string,
  repo: string,
  spec: RepoSpec,
  scaffold: Scaffold,
  githubToken: string
): Promise<void> {
  // Update README.md
  await updateFile(
    owner,
    repo,
    "README.md",
    spec.readmeContent,
    `docs: update README for ${spec.projectName}`,
    githubToken
  );

  // Update package.json name field
  try {
    const pkgContent = await fetchFileContent(owner, repo, "package.json", githubToken);
    if (pkgContent) {
      const pkg = JSON.parse(pkgContent.content);
      pkg.name = spec.projectName;
      pkg.description = spec.projectDescription;
      await updateFile(
        owner,
        repo,
        "package.json",
        JSON.stringify(pkg, null, 2) + "\n",
        `chore: rename project to ${spec.projectName}`,
        githubToken,
        pkgContent.sha
      );
    }
  } catch (err) {
    console.warn(`${LOG_PREFIX} Failed to update package.json:`, err);
  }
}

// ---------------------------------------------------------------------------
// Step 3: Create files with git history
// ---------------------------------------------------------------------------

/**
 * Create all spec files and build realistic git history.
 *
 * Groups files by addedInCommit, then for each commit:
 * 1. Creates blobs for all files in that commit
 * 2. Builds an incremental tree
 * 3. Creates a commit with the proper author/message/date
 * 4. Updates the main branch ref
 */
async function createFilesWithHistory(
  owner: string,
  repo: string,
  spec: RepoSpec,
  githubToken: string
): Promise<void> {
  const headers = GITHUB_API_HEADERS(githubToken);

  try {
    // Get current HEAD
    const headRefRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`,
      { headers }
    );
    if (!headRefRes.ok) {
      console.warn(`${LOG_PREFIX} Failed to get HEAD ref: ${headRefRes.status}`);
      return;
    }
    let currentCommitSha = (await headRefRes.json()).object.sha;

    // Get current tree SHA
    const headCommitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits/${currentCommitSha}`,
      { headers }
    );
    if (!headCommitRes.ok) {
      console.warn(
        `${LOG_PREFIX} Failed to get HEAD commit: ${headCommitRes.status}`
      );
      return;
    }
    let currentTreeSha = (await headCommitRes.json()).tree.sha;

    // Group files by commit index
    const filesByCommit = new Map<number, FileSpec[]>();
    for (const file of spec.files) {
      const existing = filesByCommit.get(file.addedInCommit) || [];
      existing.push(file);
      filesByCommit.set(file.addedInCommit, existing);
    }

    // Process each commit in order
    for (let i = 0; i < spec.commitHistory.length; i++) {
      const commit = spec.commitHistory[i];
      const files = filesByCommit.get(i) || [];

      if (files.length === 0) {
        // Commit with no new files (e.g., doc-only or config change)
        // Create an empty commit to preserve history
        const now = new Date();
        const commitDate = new Date(
          now.getTime() - commit.daysAgo * 24 * 60 * 60 * 1000
        );

        const createCommitRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/commits`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              message: commit.message,
              tree: currentTreeSha,
              parents: [currentCommitSha],
              author: {
                name: commit.authorName,
                email: commit.authorEmail,
                date: commitDate.toISOString(),
              },
              committer: {
                name: commit.authorName,
                email: commit.authorEmail,
                date: commitDate.toISOString(),
              },
            }),
          }
        );

        if (createCommitRes.ok) {
          currentCommitSha = (await createCommitRes.json()).sha;
        }
        continue;
      }

      // Create blobs for each file
      const treeItems: Array<{
        path: string;
        mode: string;
        type: string;
        sha: string;
      }> = [];

      for (const file of files) {
        const blobRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              content: file.content,
              encoding: "utf-8",
            }),
          }
        );

        if (!blobRes.ok) {
          console.warn(
            `${LOG_PREFIX} Failed to create blob for ${file.path}: ${blobRes.status}`
          );
          continue;
        }

        const blob = await blobRes.json();
        treeItems.push({
          path: file.path,
          mode: "100644",
          type: "blob",
          sha: blob.sha,
        });
      }

      if (treeItems.length === 0) continue;

      // Create incremental tree
      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            base_tree: currentTreeSha,
            tree: treeItems,
          }),
        }
      );

      if (!treeRes.ok) {
        console.warn(
          `${LOG_PREFIX} Failed to create tree for commit "${commit.message}": ${treeRes.status}`
        );
        continue;
      }

      const newTree = await treeRes.json();

      // Create commit with realistic date
      const now = new Date();
      const commitDate = new Date(
        now.getTime() - commit.daysAgo * 24 * 60 * 60 * 1000
      );

      const commitRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/commits`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: commit.message,
            tree: newTree.sha,
            parents: [currentCommitSha],
            author: {
              name: commit.authorName,
              email: commit.authorEmail,
              date: commitDate.toISOString(),
            },
            committer: {
              name: commit.authorName,
              email: commit.authorEmail,
              date: commitDate.toISOString(),
            },
          }),
        }
      );

      if (!commitRes.ok) {
        console.warn(
          `${LOG_PREFIX} Failed to create commit "${commit.message}": ${commitRes.status}`
        );
        continue;
      }

      const newCommit = await commitRes.json();
      currentCommitSha = newCommit.sha;
      currentTreeSha = newTree.sha;
    }

    // Update main branch ref to latest commit
    const updateRefRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ sha: currentCommitSha, force: true }),
      }
    );

    if (updateRefRes.ok) {
      console.log(
        `${LOG_PREFIX} Successfully created ${spec.commitHistory.length} commits with ${spec.files.length} files`
      );
    } else {
      console.warn(
        `${LOG_PREFIX} Failed to update ref: ${updateRefRes.status}`
      );
    }
  } catch (err) {
    console.warn(`${LOG_PREFIX} Error creating files with history:`, err);
  }
}

// ---------------------------------------------------------------------------
// Step 4: Create GitHub Issues
// ---------------------------------------------------------------------------

async function createIssues(
  owner: string,
  repo: string,
  spec: RepoSpec,
  githubToken: string
): Promise<void> {
  const headers = GITHUB_API_HEADERS(githubToken);

  try {
    // Create labels first
    const allLabels = new Set(spec.issues.flatMap((i) => i.labels));
    for (const label of allLabels) {
      await fetch(
        `https://api.github.com/repos/${owner}/${repo}/labels`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: label,
            color: generateLabelColor(label),
          }),
        }
      );
      // Ignore errors — label may already exist
    }

    // Create issues in order
    for (const issue of spec.issues) {
      const createRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            title: issue.title,
            body: issue.body,
            labels: issue.labels,
          }),
        }
      );

      if (!createRes.ok) {
        console.warn(
          `${LOG_PREFIX} Failed to create issue "${issue.title}": ${createRes.status}`
        );
        continue;
      }

      const createdIssue = await createRes.json();

      // Add comments
      for (const comment of issue.comments) {
        // Attribute the comment to the author in the body
        const commentBody = `**${comment.authorName}:**\n\n${comment.body}`;
        await fetch(
          `https://api.github.com/repos/${owner}/${repo}/issues/${createdIssue.number}/comments`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ body: commentBody }),
          }
        );
      }

      // Close the issue if it should be closed
      if (issue.state === "closed") {
        await fetch(
          `https://api.github.com/repos/${owner}/${repo}/issues/${createdIssue.number}`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify({ state: "closed" }),
          }
        );
      }
    }

    console.log(
      `${LOG_PREFIX} Created ${spec.issues.length} issues`
    );
  } catch (err) {
    console.warn(`${LOG_PREFIX} Error creating issues:`, err);
  }
}

// ---------------------------------------------------------------------------
// Step 5: Mark repo as template
// ---------------------------------------------------------------------------

async function markRepoAsTemplate(
  owner: string,
  repo: string,
  githubToken: string
): Promise<void> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        method: "PATCH",
        headers: GITHUB_API_HEADERS(githubToken),
        body: JSON.stringify({ is_template: true }),
      }
    );

    if (response.ok) {
      console.log(`${LOG_PREFIX} Marked ${owner}/${repo} as template`);
    } else {
      console.warn(
        `${LOG_PREFIX} Failed to mark as template: ${response.status}`
      );
    }
  } catch (err) {
    console.warn(`${LOG_PREFIX} Error marking as template:`, err);
  }
}

// ---------------------------------------------------------------------------
// GitHub file helpers
// ---------------------------------------------------------------------------

async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  githubToken: string
): Promise<{ content: string; sha: string } | null> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    { headers: GITHUB_API_HEADERS(githubToken) }
  );

  if (!res.ok) return null;

  const data = await res.json();
  if (data.content && data.encoding === "base64") {
    return {
      content: Buffer.from(data.content, "base64").toString("utf-8"),
      sha: data.sha,
    };
  }

  return null;
}

async function updateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  githubToken: string,
  sha?: string
): Promise<boolean> {
  // If no SHA provided, fetch current file to get it
  if (!sha) {
    const existing = await fetchFileContent(owner, repo, path, githubToken);
    sha = existing?.sha;
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: GITHUB_API_HEADERS(githubToken),
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString("base64"),
        ...(sha && { sha }),
      }),
    }
  );

  if (!res.ok) {
    console.warn(
      `${LOG_PREFIX} Failed to update ${path}: ${res.status}`
    );
  }

  return res.ok;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a deterministic label color based on label name.
 */
function generateLabelColor(label: string): string {
  const colors: Record<string, string> = {
    bug: "d73a4a",
    feature: "0075ca",
    enhancement: "a2eeef",
    documentation: "0075ca",
    "priority:high": "e11d48",
    "priority:medium": "fbbd23",
    "priority:low": "0ea5e9",
    "good first issue": "7057ff",
    help: "008672",
    wontfix: "ffffff",
  };

  return colors[label.toLowerCase()] || "ededed";
}
