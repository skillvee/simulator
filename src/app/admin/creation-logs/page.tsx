import { requireAdmin } from "@/lib/core";
import { db } from "@/server/db";
import { CreationLogsClient } from "./client";

export default async function CreationLogsPage() {
  await requireAdmin();

  const logs = await db.simulationCreationLog.findMany({
    include: {
      user: { select: { name: true, email: true } },
      scenario: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return <CreationLogsClient logs={logs} />;
}
