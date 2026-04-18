import { db } from "@/server/db";
import { UsersClient } from "./client";

export default async function AdminUsersPage() {
  // Fetch all users with assessment counts
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { assessments: true },
      },
    },
  });

  // Calculate aggregate stats
  const totalUsers = users.length;
  const adminUsers = users.filter((u) => u.role === "ADMIN").length;
  const usersWithAssessments = users.filter(
    (u) => u._count.assessments > 0
  ).length;
  const totalAssessments = users.reduce(
    (sum, u) => sum + u._count.assessments,
    0
  );

  // Serialize dates to strings for client component
  const serializedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    deletedAt: u.deletedAt?.toISOString() ?? null,
    assessmentCount: u._count.assessments,
  }));

  return (
    <UsersClient
      users={serializedUsers}
      stats={{
        total: totalUsers,
        admins: adminUsers,
        withAssessments: usersWithAssessments,
        totalAssessments,
      }}
    />
  );
}
