import { db } from "@/server/db";
import Link from "next/link";
import { getAnalytics } from "@/lib/core";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminDashboard() {
  // Fetch analytics data with 30-day default
  const [analyticsData, scenarioCount, recentAssessments] = await Promise.all([
    getAnalytics("last30days"),
    db.scenario.count(),
    db.assessment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        scenario: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="px-8 py-10">
      <h1 className="mb-8 text-3xl font-semibold">Admin Dashboard</h1>

      {/* Analytics Dashboard */}
      <section className="mb-12">
        <AnalyticsDashboard initialData={analyticsData} />
      </section>

      {/* Quick Actions */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Button asChild className="shadow-sm hover:shadow-md transition-shadow">
            <Link href="/admin/scenarios/new">Create Simulation</Link>
          </Button>
          <Button asChild variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
            <Link href="/admin/scenarios">Manage Simulations ({scenarioCount})</Link>
          </Button>
          <Button asChild variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
            <Link href="/admin/users">Manage Users</Link>
          </Button>
        </div>
      </section>

      {/* Recent Assessments */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Assessments</h2>
          <Button asChild variant="link" className="text-primary hover:text-primary/80 transition-colors">
            <Link href="/admin/assessments">View All</Link>
          </Button>
        </div>
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {recentAssessments.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No assessments yet
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-4 text-left text-xs font-medium text-muted-foreground">
                      USER
                    </th>
                    <th className="p-4 text-left text-xs font-medium text-muted-foreground">
                      SCENARIO
                    </th>
                    <th className="p-4 text-left text-xs font-medium text-muted-foreground">
                      STATUS
                    </th>
                    <th className="p-4 text-left text-xs font-medium text-muted-foreground">
                      DATE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentAssessments.map((assessment) => (
                    <tr
                      key={assessment.id}
                      className="border-b border-border last:border-b-0 transition-colors hover:bg-muted/50"
                    >
                      <td className="p-4">
                        <p className="font-semibold">
                          {assessment.user.name || "Anonymous"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {assessment.user.email}
                        </p>
                      </td>
                      <td className="p-4 text-sm">
                        {assessment.scenario.name}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            assessment.status === "COMPLETED"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            assessment.status === "COMPLETED"
                              ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                              : ""
                          }
                        >
                          {assessment.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(assessment.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
