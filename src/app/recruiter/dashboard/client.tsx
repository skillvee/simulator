"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  CheckCircle,
  TrendingUp,
  Plus,
  ArrowRight,
} from "lucide-react";

interface DashboardStats {
  scenarioCount: number;
  candidateCount: number;
  completedCount: number;
  completionRate: number;
}

interface RecentAssessment {
  id: string;
  status: string;
  createdAt: string;
  user: {
    name: string | null;
    email: string | null;
  };
  scenario: {
    name: string;
  };
}

interface RecruiterDashboardClientProps {
  stats: DashboardStats;
  recentAssessments: RecentAssessment[];
}

export function RecruiterDashboardClient({
  stats,
  recentAssessments,
}: RecruiterDashboardClientProps) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Overview of your scenarios and candidate activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Scenarios
            </CardTitle>
            <FileText className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.scenarioCount}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Active assessment scenarios
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Candidates
            </CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.candidateCount}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Unique candidates assessed
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completed
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.completedCount}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Assessments completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completion Rate
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.completionRate}%
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Of started assessments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-4">
          <Button
            asChild
            className="bg-blue-600 hover:bg-blue-700 shadow-sm"
          >
            <Link href="/recruiter/scenarios/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Scenario
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-gray-200 shadow-sm"
          >
            <Link href="/recruiter/scenarios">
              View All Scenarios
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-gray-200 shadow-sm"
          >
            <Link href="/recruiter/candidates">
              View All Candidates
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Recent Activity
          </h2>
          {recentAssessments.length > 0 && (
            <Button
              asChild
              variant="link"
              className="text-blue-600 hover:text-blue-700"
            >
              <Link href="/recruiter/candidates">View All</Link>
            </Button>
          )}
        </div>
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-0">
            {recentAssessments.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No activity yet
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Create a scenario and share it with candidates to see
                  activity here.
                </p>
                <Button
                  asChild
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  <Link href="/recruiter/scenarios/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Scenario
                  </Link>
                </Button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="p-4 text-left text-xs font-medium uppercase text-gray-500">
                      Candidate
                    </th>
                    <th className="p-4 text-left text-xs font-medium uppercase text-gray-500">
                      Scenario
                    </th>
                    <th className="p-4 text-left text-xs font-medium uppercase text-gray-500">
                      Status
                    </th>
                    <th className="p-4 text-left text-xs font-medium uppercase text-gray-500">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentAssessments.map((assessment) => (
                    <tr
                      key={assessment.id}
                      className="border-b border-gray-100 last:border-b-0 transition-colors hover:bg-gray-50"
                    >
                      <td className="p-4">
                        <p className="font-medium text-gray-900">
                          {assessment.user.name || "Anonymous"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {assessment.user.email}
                        </p>
                      </td>
                      <td className="p-4 text-sm text-gray-700">
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
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : assessment.status === "WORKING"
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                          }
                        >
                          {assessment.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(assessment.createdAt))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
