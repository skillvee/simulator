/**
 * Repository template registry for simulation starter repos (US-007)
 *
 * Maps tech stacks to GitHub template repositories that will be provisioned
 * for each simulation. Templates are minimal starter projects with just enough
 * scaffolding to get a candidate started on coding.
 */

export interface RepoTemplate {
  id: string;
  name: string;
  repoTemplate: string; // GitHub org/repo-name (e.g., "skillvee/nextjs-typescript-starter")
  matchesTechStack: string[]; // Tech keywords that trigger this template
  description: string; // Short description shown in UI
}

/**
 * Template registry
 *
 * Each template points to a GitHub repo in the SkillVee org that can be used
 * as a template. Templates should be minimal:
 * - Basic project structure (src/, tests/, config files)
 * - README with setup instructions
 * - Package manager config (package.json or requirements.txt)
 * - Simple test setup (Jest/pytest)
 * - Placeholder files indicating where to add code
 */
export const REPO_TEMPLATES: RepoTemplate[] = [
  {
    id: "nextjs-typescript",
    name: "Next.js + TypeScript Starter",
    repoTemplate: "skillvee/nextjs-typescript-starter",
    matchesTechStack: [
      "nextjs",
      "next.js",
      "next",
      "react",
      "typescript",
      "ts",
      "frontend",
    ],
    description: "React + TypeScript + Next.js starter with basic setup",
  },
  {
    id: "express-typescript",
    name: "Express + TypeScript Starter",
    repoTemplate: "skillvee/express-typescript-starter",
    matchesTechStack: [
      "express",
      "node",
      "nodejs",
      "node.js",
      "typescript",
      "ts",
      "backend",
      "api",
    ],
    description: "Node.js + Express + TypeScript starter with API setup",
  },
  {
    id: "python-fastapi",
    name: "Python + FastAPI Starter",
    repoTemplate: "skillvee/python-fastapi-starter",
    matchesTechStack: ["python", "fastapi", "api", "backend", "py"],
    description: "Python + FastAPI starter with basic API setup",
  },
  {
    id: "fullstack-monorepo",
    name: "Full Stack Monorepo",
    repoTemplate: "skillvee/fullstack-monorepo-starter",
    matchesTechStack: [
      "fullstack",
      "full-stack",
      "monorepo",
      "react",
      "node",
      "frontend",
      "backend",
    ],
    description: "React + Node.js full stack monorepo with shared types",
  },
];

/**
 * Select the best template based on tech stack overlap
 *
 * @param techStack - Array of tech keywords from the scenario
 * @returns The template with the most keyword matches, or the fallback template
 */
export function selectTemplate(techStack: string[]): RepoTemplate {
  if (!techStack || techStack.length === 0) {
    console.warn("[selectTemplate] No tech stack provided, using fallback");
    return REPO_TEMPLATES.find((t) => t.id === "fullstack-monorepo")!;
  }

  // Normalize tech stack to lowercase for case-insensitive matching
  const normalizedStack = techStack.map((tech) => tech.toLowerCase().trim());

  // Calculate match scores for each template
  const scores = REPO_TEMPLATES.map((template) => {
    const matchCount = template.matchesTechStack.filter((keyword) =>
      normalizedStack.some((tech) => tech.includes(keyword) || keyword.includes(tech))
    ).length;

    return {
      template,
      matchCount,
    };
  });

  // Sort by match count (descending)
  scores.sort((a, b) => b.matchCount - a.matchCount);

  // If no matches found, use fallback
  if (scores[0].matchCount === 0) {
    console.warn(
      `[selectTemplate] No template matches for tech stack: ${techStack.join(", ")}. Using fallback.`
    );
    return REPO_TEMPLATES.find((t) => t.id === "fullstack-monorepo")!;
  }

  console.log(
    `[selectTemplate] Selected ${scores[0].template.name} (${scores[0].matchCount} matches) for tech stack: ${techStack.join(", ")}`
  );

  return scores[0].template;
}

/**
 * Provision a new GitHub repository from a template
 *
 * @param scenarioId - The scenario ID (used for repo naming)
 * @param templateId - The template ID to use
 * @returns The new repository URL, or null if provisioning failed
 */
export async function provisionRepo(
  scenarioId: string,
  templateId: string
): Promise<string | null> {
  const template = REPO_TEMPLATES.find((t) => t.id === templateId);

  if (!template) {
    console.error(`[provisionRepo] Template not found: ${templateId}`);
    return null;
  }

  const githubToken = process.env.GITHUB_ORG_TOKEN;

  if (!githubToken) {
    console.error(
      "[provisionRepo] GITHUB_ORG_TOKEN not set. Cannot provision repo."
    );
    return null;
  }

  const repoName = `simulation-${scenarioId}`;
  const [owner, templateRepo] = template.repoTemplate.split("/");

  try {
    console.log(
      `[provisionRepo] Creating repo ${repoName} from template ${template.repoTemplate}`
    );

    // GitHub API: Create repository from template
    // https://docs.github.com/en/rest/repos/repos#create-a-repository-using-a-template
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${templateRepo}/generate`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${githubToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner, // Create under the same org
          name: repoName,
          description: `Simulation repository for scenario ${scenarioId}`,
          private: true, // Simulations are private by default
          include_all_branches: false, // Only include default branch
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error(
        `[provisionRepo] GitHub API error: ${response.status}`,
        errorData
      );
      return null;
    }

    const data = await response.json();
    const repoUrl = data.html_url;

    console.log(`[provisionRepo] Successfully created repo: ${repoUrl}`);

    return repoUrl;
  } catch (error) {
    console.error("[provisionRepo] Failed to provision repo:", error);
    return null;
  }
}
