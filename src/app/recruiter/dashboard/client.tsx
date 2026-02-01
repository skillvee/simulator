"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  FileText,
  CheckCircle,
  TrendingUp,
  Plus,
  ChevronRight,
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
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Dashboard</h1>
          <p className="mt-1 text-sm text-stone-500">
            Overview of your simulations and candidate activity
          </p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link href="/recruiter/simulations/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Simulation
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Simulations",
            value: stats.scenarioCount,
            icon: FileText,
            subtitle: "Active simulations",
          },
          {
            title: "Candidates",
            value: stats.candidateCount,
            icon: Users,
            subtitle: "Total assessed",
          },
          {
            title: "Completed",
            value: stats.completedCount,
            icon: CheckCircle,
            subtitle: "Assessments done",
          },
          {
            title: "Completion Rate",
            value: `${stats.completionRate}%`,
            icon: TrendingUp,
            subtitle: "Of started",
          },
        ].map((stat) => (
          <Card key={stat.title} className="border-stone-200 bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-stone-900">{stat.value}</p>
                  <p className="text-xs text-stone-400 mt-1">{stat.subtitle}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="border-stone-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          {recentAssessments.length > 0 && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700"
            >
              <Link href="/recruiter/candidates">
                View all
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {recentAssessments.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-stone-300" />
              <h3 className="mt-4 text-lg font-medium text-stone-900">
                No activity yet
              </h3>
              <p className="mt-2 text-sm text-stone-500">
                Create a simulation and share it with candidates to see activity
                here.
              </p>
              <Button
                asChild
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                <Link href="/recruiter/simulations/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Simulation
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-stone-50 hover:bg-stone-50">
                  <TableHead>Candidate</TableHead>
                  <TableHead>Simulation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAssessments.map((assessment) => (
                  <TableRow key={assessment.id} className="hover:bg-stone-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-medium">
                          {assessment.user.name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="font-medium text-stone-900">
                            {assessment.user.name || "Anonymous"}
                          </p>
                          <p className="text-sm text-stone-500">
                            {assessment.user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-stone-600">
                      {assessment.scenario.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          assessment.status === "COMPLETED"
                            ? "bg-blue-100 text-blue-700 border-0"
                            : "bg-stone-100 text-stone-600 border-0"
                        }
                      >
                        {assessment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-stone-500">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(assessment.createdAt))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
