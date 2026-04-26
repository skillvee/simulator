import "dotenv/config";
import { PrismaClient } from "@prisma/client";

async function main() {
  const id = process.argv[2];
  const mode = process.argv[3] || "summary"; // "summary" | "full" | "repo" | "docs"
  if (!id) throw new Error("Usage: read-sim <scenarioId> [summary|full|repo|docs]");
  const prisma = new PrismaClient();
  const s = await prisma.scenario.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      docs: true,
      plan: true,
      repoUrl: true,
      resourcePipelineMeta: true,
      repoSpec: true,
      coworkers: { select: { name: true, role: true, knowledge: true } },
      dataFiles: { select: { filename: true, rowCount: true, byteSize: true, storagePath: true } },
    },
  });
  if (!s) throw new Error(`Scenario ${id} not found`);
  if (mode === "full") {
    console.log(JSON.stringify(s, null, 2));
  } else if (mode === "repo") {
    const spec = s.repoSpec as { files?: Array<{ path: string; purpose?: string; content?: string }>; readmeContent?: string } | null;
    console.log("README:");
    console.log(spec?.readmeContent ?? "(no README)");
    console.log("\n\nFiles:");
    for (const f of spec?.files ?? []) {
      console.log(`  - ${f.path} (${f.purpose ?? "n/a"})`);
    }
  } else if (mode === "repofile") {
    const filename = process.argv[4];
    const spec = s.repoSpec as { files?: Array<{ path: string; content?: string }> } | null;
    const f = spec?.files?.find((x) => x.path === filename);
    console.log(f?.content ?? "(file not found or no content)");
  } else if (mode === "docs") {
    const docs = s.docs as Array<{ name: string; filename: string; markdown: string }> | null;
    for (const d of docs ?? []) {
      console.log(`### ${d.name} (${d.filename})\n`);
      console.log(d.markdown);
      console.log("\n---\n");
    }
  } else {
    // summary
    const meta = s.resourcePipelineMeta as Record<string, unknown> | null;
    const docs = s.docs as Array<{ name: string; filename: string; markdown: string }> | null;
    const plan = s.plan as { resources?: Array<{ filename: string; label: string }>; qualityCriteria?: string[] } | null;
    const spec = s.repoSpec as { files?: Array<{ path: string }>; readmeContent?: string } | null;
    console.log({
      id: s.id,
      name: s.name,
      status: meta?.status,
      attempts: meta?.attempts,
      docCount: docs?.length,
      docFilenames: docs?.map((d) => d.filename),
      planResources: plan?.resources?.map((r) => r.filename),
      repoUrl: s.repoUrl,
      repoFileCount: spec?.files?.length,
      repoFiles: spec?.files?.map((f) => f.path),
      hasReadme: !!spec?.readmeContent,
      coworkers: s.coworkers.map((c) => ({ name: c.name, role: c.role })),
      dataFiles: s.dataFiles?.map((f) => ({ name: f.filename, rows: f.rowCount, bytes: f.byteSize })),
    });
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
