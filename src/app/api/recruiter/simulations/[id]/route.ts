import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/recruiter/simulations/[id]
 * Delete a simulation owned by the current recruiter
 */
export async function DELETE(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  const { id } = await context.params;

  const scenario = await db.scenario.findUnique({
    where: { id },
  });

  if (!scenario) {
    return error("Simulation not found", 404);
  }

  // Recruiters can only delete their own simulations
  if (user.role === "RECRUITER" && scenario.createdById !== user.id) {
    return error("You can only delete your own simulations", 403);
  }

  await db.scenario.delete({
    where: { id },
  });

  return success({ message: "Simulation deleted" });
}
