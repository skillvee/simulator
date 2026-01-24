"use client";

import { useEffect, useState, useCallback } from "react";
import type { AnalyticsData, TimePeriod, DailyCount } from "@/lib/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalyticsDashboardProps {
  initialData: AnalyticsData;
}

export function AnalyticsDashboard({ initialData }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData>(initialData);
  const [period, setPeriod] = useState<TimePeriod>(initialData.period);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAnalytics = useCallback(async (newPeriod: TimePeriod) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics?period=${newPeriod}`);
      if (response.ok) {
        const newData = await response.json();
        setData(newData);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (period !== initialData.period) {
      fetchAnalytics(period);
    }
  }, [period, initialData.period, fetchAnalytics]);

  return (
    <div className={isLoading ? "pointer-events-none opacity-60" : ""}>
      {/* Period Selector */}
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Analytics</h2>
        <div className="flex gap-2">
          {(
            [
              { value: "today", label: "Today" },
              { value: "last7days", label: "7 Days" },
              { value: "last30days", label: "30 Days" },
              { value: "last90days", label: "90 Days" },
              { value: "all", label: "All Time" },
            ] as const
          ).map((option) => (
            <Button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              variant={period === option.value ? "default" : "outline"}
              size="sm"
              className="text-xs transition-all"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard
          label="SIGNUPS"
          value={data.overview.totalUsers}
          highlight={false}
        />
        <StatCard
          label="ASSESSMENTS"
          value={data.overview.totalAssessments}
          highlight={false}
        />
        <StatCard
          label="COMPLETED"
          value={data.overview.completedAssessments}
          highlight={true}
        />
        <StatCard
          label="COMPLETION RATE"
          value={`${data.overview.completionRate}%`}
          highlight={false}
        />
        <StatCard
          label="AVG TIME"
          value={
            data.overview.avgCompletionTimeMinutes
              ? `${data.overview.avgCompletionTimeMinutes}m`
              : "-"
          }
          highlight={false}
        />
      </div>

      {/* Trends Charts */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <TrendChart
          title="Signups"
          data={data.trends.signups}
          color="bg-foreground"
        />
        <TrendChart
          title="Assessment Starts"
          data={data.trends.assessmentStarts}
          color="bg-foreground"
        />
        <TrendChart
          title="Completions"
          data={data.trends.assessmentCompletions}
          color="bg-primary"
        />
      </div>

      {/* Phase Durations and Funnel */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Phase Durations */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              TIME PER PHASE
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.phaseDurations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-4">
                {data.phaseDurations.map((phase) => (
                  <div key={phase.phase}>
                    <div className="mb-1 flex justify-between">
                      <span className="text-sm font-semibold">{phase.phase}</span>
                      <span className="text-sm">
                        {phase.avgDurationMinutes}m avg
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Min: {phase.minDurationMinutes}m</span>
                      <span>|</span>
                      <span>Max: {phase.maxDurationMinutes}m</span>
                      <span>|</span>
                      <span>n={phase.sampleSize}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completion Funnel */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              COMPLETION FUNNEL
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.completionFunnel.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-3">
                {data.completionFunnel.map((step, index) => (
                  <FunnelStep
                    key={step.step}
                    step={step.step}
                    count={step.count}
                    percentage={step.percentage}
                    dropoffRate={step.dropoffRate}
                    isFirst={index === 0}
                    isLast={index === data.completionFunnel.length - 1}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            STATUS DISTRIBUTION
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-8 gap-2">
            {data.statusDistribution.map((status) => (
              <div
                key={status.status}
                className={`relative h-full rounded-md transition-all ${
                  status.status === "COMPLETED" ? "bg-primary" : "bg-muted"
                }`}
                style={{
                  width: `${Math.max(status.percentage, 2)}%`,
                  minWidth: status.count > 0 ? "40px" : "0px",
                }}
                title={`${status.status}: ${status.count} (${status.percentage}%)`}
              >
                {status.percentage >= 10 && (
                  <span className={`absolute inset-0 flex items-center justify-center text-xs ${
                    status.status === "COMPLETED" ? "text-primary-foreground" : ""
                  }`}>
                    {status.count}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            {data.statusDistribution.map((status) => (
              <div key={status.status} className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-sm ${
                    status.status === "COMPLETED" ? "bg-primary" : "bg-muted"
                  }`}
                />
                <span className="text-xs">
                  {status.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight: boolean;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
        <p className={`text-2xl font-semibold ${highlight ? "text-primary" : ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function TrendChart({
  title,
  data,
  color,
}: {
  title: string;
  data: DailyCount[];
  color: string;
}) {
  // Only show last 7 days for readability
  const recentData = data.slice(-7);
  const maxCount = Math.max(...recentData.map((d) => d.count), 1);
  const total = recentData.reduce((sum, d) => sum + d.count, 0);

  // Use the provided color directly (all charts use bg-primary now)
  const barColor = color;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
          <span className="text-lg font-semibold">{total}</span>
        </div>
        <div className="flex h-16 items-end gap-1">
          {recentData.map((day) => (
            <div
              key={day.date}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div
                className={`w-full rounded-t-sm ${barColor}`}
                style={{
                  height: `${Math.max((day.count / maxCount) * 100, 4)}%`,
                  minHeight: day.count > 0 ? "4px" : "2px",
                  opacity: day.count > 0 ? 1 : 0.2,
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-xs text-muted-foreground">
            {recentData[0]?.date.slice(5) || ""}
          </span>
          <span className="text-xs text-muted-foreground">
            {recentData[recentData.length - 1]?.date.slice(5) || ""}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelStep({
  step,
  count,
  percentage,
  dropoffRate,
  isFirst,
  isLast,
}: {
  step: string;
  count: number;
  percentage: number;
  dropoffRate: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`h-6 rounded-md transition-all ${isLast ? "bg-primary" : "bg-muted"}`}
        style={{ width: `${Math.max(percentage, 10)}%` }}
      />
      <div className="flex flex-1 items-center justify-between">
        <span className="text-sm font-semibold">{step}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm">{count}</span>
          {!isFirst && dropoffRate > 0 && (
            <span className="text-xs text-muted-foreground">
              (-{dropoffRate}%)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
