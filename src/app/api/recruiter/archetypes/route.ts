import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";

/**
 * GET /api/recruiter/archetypes
 * Returns all archetypes grouped by role family.
 * Used in simulation creation to let recruiters pick a role archetype.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const roleFamilies = await db.roleFamily.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      archetypes: {
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return success({ roleFamilies });
}
