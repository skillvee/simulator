/**
 * Builds a compact summary of the generated artifacts for the LLM judge.
 *
 * The judge can't ingest a whole repo or all CSVs verbatim — both would blow
 * the context window for nothing. Instead we send:
 *
 *   - repos: file tree, README contents, 3 sample source files (code-heavy ones).
 *   - data: per-file schema, row count, first 20 rows of preview data.
 *
 * GitHub reads use the existing `getGitHubHeaders` helper.
 */

import { db } from "@/server/db";
import { createLogger } from "@/lib/core";
import { getGitHubHeaders } from "@/lib/external/github/client";

const logger = createLogger("lib:scenarios:artifact-summary");

export interface RepoArtifactSummary {
  kind: "repo";
  repoUrl: string;
  fileTree: string[];
  readme: string;
  sampleFiles: Array<{ path: string; content: string }>;
}

export interface DataArtifactSummary {
  kind: "data";
  files: Array<{
    filename: string;
    rowCount: number | null;
    byteSize: number | null;
    columns: Array<{ name: string; type: string; sample?: unknown }>;
    previewRows: Record<string, unknown>[];
  }>;
}

export type ArtifactSummary = RepoArtifactSummary | DataArtifactSummary;

export async function buildRepoArtifactSummary(
  scenarioId: string
): Promise<RepoArtifactSummary | null> {
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
    select: { repoUrl: true, repoSpec: true },
  });

  if (!scenario?.repoUrl) return null;

  const spec = scenario.repoSpec as
    | { files?: Array<{ path: string; content: string; purpose?: string }>; readmeContent?: string }
    | null;

  // Always fetch the live file tree from GitHub. The repoSpec only contains
  // AI-generated files, but the actual repo also has the scaffold base
  // (package.json, tsconfig.json, etc.) — the judge needs to see both,
  // otherwise it flags missing scaffold files as bugs.
  const live = await fetchRepoSummaryFromGitHub(scenario.repoUrl);

  if (!live) {
    if (spec?.files?.length) {
      return {
        kind: "repo",
        repoUrl: scenario.repoUrl,
        fileTree: spec.files.map((f) => f.path).sort(),
        readme: spec.readmeContent ?? "",
        sampleFiles: pickSampleFiles(spec.files),
      };
    }
    return null;
  }

  // Sample files: prefer inline content from the spec when available
  // (avoids extra GitHub blob reads), fall back to whatever the live read
  // returned.
  const sampleFiles = spec?.files?.length
    ? pickSampleFiles(spec.files)
    : live.sampleFiles;

  return {
    ...live,
    sampleFiles,
  };
}

export async function buildDataArtifactSummary(
  scenarioId: string
): Promise<DataArtifactSummary> {
  const files = await db.scenarioDataFile.findMany({
    where: { scenarioId },
    select: {
      filename: true,
      rowCount: true,
      byteSize: true,
      schemaJson: true,
      previewRows: true,
    },
  });

  return {
    kind: "data",
    files: files.map((f) => {
      const schema = f.schemaJson as
        | { columns: Array<{ name: string; type: string; sample?: unknown }> }
        | null;
      return {
        filename: f.filename,
        rowCount: f.rowCount,
        byteSize: f.byteSize,
        columns: schema?.columns ?? [],
        previewRows: (f.previewRows as Record<string, unknown>[] | null) ?? [],
      };
    }),
  };
}

function pickSampleFiles(
  files: Array<{ path: string; content: string; purpose?: string }>
): Array<{ path: string; content: string }> {
  // Prefer "working" code files; cap to 3 totaling ≤6 KB.
  const working = files.filter((f) => f.purpose === "working" || /\.(ts|tsx|js|py|go)$/.test(f.path));
  const ranked = working.length > 0 ? working : files.slice(0, 5);
  const picked: Array<{ path: string; content: string }> = [];
  let totalBytes = 0;
  const MAX_TOTAL = 6 * 1024;
  for (const file of ranked) {
    const truncated = file.content.length > 2000 ? file.content.slice(0, 2000) + "\n…[truncated]" : file.content;
    if (totalBytes + truncated.length > MAX_TOTAL) break;
    picked.push({ path: file.path, content: truncated });
    totalBytes += truncated.length;
    if (picked.length >= 3) break;
  }
  return picked;
}

async function fetchRepoSummaryFromGitHub(
  repoUrl: string
): Promise<RepoArtifactSummary | null> {
  const url = new URL(repoUrl);
  const [, owner, repo] = url.pathname.split("/");
  const headers = getGitHubHeaders();

  try {
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
      { headers }
    );
    if (!treeRes.ok) return null;

    const treeData = (await treeRes.json()) as {
      tree: Array<{ path: string; type: string }>;
    };
    const fileTree = treeData.tree
      .filter((t) => t.type === "blob")
      .map((t) => t.path);

    const readmeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
      { headers }
    );
    let readme = "";
    if (readmeRes.ok) {
      const readmeData = (await readmeRes.json()) as { content: string; encoding: string };
      if (readmeData.encoding === "base64") {
        readme = Buffer.from(readmeData.content, "base64").toString("utf-8");
      }
    }

    return {
      kind: "repo",
      repoUrl,
      fileTree,
      readme,
      sampleFiles: [],
    };
  } catch (err) {
    logger.warn("Failed to fetch repo summary from GitHub", { repoUrl, err: String(err) });
    return null;
  }
}
