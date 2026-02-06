"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp,
  Clock,
  Users,
  Bot,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import type { AssessmentReport, VideoSkillEvaluation, HiringRecommendation } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ResultsClientProps {
  assessmentId: string;
  scenarioName: string;
  companyName: string;
  userName: string;
  report: AssessmentReport | null;
}

/**
 * Display names for video evaluation dimensions
 */
const DIMENSION_LABELS: Record<string, string> = {
  COMMUNICATION: "Communication",
  PROBLEM_SOLVING: "Problem Solving",
  TECHNICAL_KNOWLEDGE: "Technical Knowledge",
  COLLABORATION: "Collaboration",
  ADAPTABILITY: "Adaptability",
  LEADERSHIP: "Leadership",
  CREATIVITY: "Creativity",
  TIME_MANAGEMENT: "Time Management",
};

/**
 * Score level based on 1-5 scale
 */
function getScoreLevel(score: number): string {
  if (score >= 4.5) return "exceptional";
  if (score >= 3.5) return "strong";
  if (score >= 2.5) return "adequate";
  if (score >= 1.5) return "developing";
  return "needs_improvement";
}

function SkillScoreBar({
  score,
  maxScore = 5,
}: {
  score: number;
  maxScore?: number;
}) {
  const segments = Array.from({ length: maxScore }, (_, i) => i + 1);

  return (
    <div className="flex gap-1">
      {segments.map((segment) => (
        <div
          key={segment}
          className={`h-3 flex-1 rounded-sm ${
            segment <= score ? "bg-primary" : "bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * New skill card for video evaluation skills (RF-025)
 */
function VideoSkillCard({
  skill,
  isExpanded,
  onToggle,
}: {
  skill: VideoSkillEvaluation;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const levelColors: Record<string, string> = {
    exceptional: "bg-primary text-primary-foreground",
    strong: "bg-green-100 text-green-800",
    adequate: "bg-blue-100 text-blue-800",
    developing: "bg-yellow-100 text-yellow-800",
    needs_improvement: "bg-red-100 text-red-800",
  };

  const score = skill.score ?? 0;
  const level = getScoreLevel(score);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 transition-colors hover:bg-muted/50"
      >
        <div className="flex flex-1 items-center gap-4">
          <div className="min-w-[180px] text-left font-semibold">
            {DIMENSION_LABELS[skill.dimension] || skill.dimension}
          </div>
          <div className="max-w-xs flex-1">
            <SkillScoreBar score={score} />
          </div>
          <div className="text-lg font-semibold text-primary">{score}/5</div>
          <span
            className={`rounded-md px-2 py-1 text-xs font-medium ${levelColors[level] || "bg-muted"}`}
          >
            {level.replace("_", " ").toUpperCase()}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t bg-muted/50 px-4 pb-4 pt-2">
          {/* Rationale */}
          <p className="mb-4 text-sm text-muted-foreground">{skill.rationale}</p>

          {/* Green Flags */}
          {skill.greenFlags.length > 0 && (
            <div className="mb-3">
              <h5 className="mb-2 flex items-center gap-2 text-xs font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Green Flags
              </h5>
              <ul className="space-y-1">
                {skill.greenFlags.map((flag, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-green-600">•</span>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Red Flags */}
          {skill.redFlags.length > 0 && (
            <div className="mb-3">
              <h5 className="mb-2 flex items-center gap-2 text-xs font-medium text-red-700">
                <AlertCircle className="h-4 w-4" />
                Red Flags
              </h5>
              <ul className="space-y-1">
                {skill.redFlags.map((flag, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-red-600">•</span>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timestamps */}
          {skill.timestamps.length > 0 && (
            <div>
              <h5 className="mb-2 text-xs font-medium text-muted-foreground">
                Evidence Timestamps
              </h5>
              <div className="flex flex-wrap gap-2">
                {skill.timestamps.map((ts, index) => (
                  <span
                    key={index}
                    className="rounded-md bg-muted px-2 py-1 text-xs font-mono text-muted-foreground"
                  >
                    [{ts}]
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * Hiring Signals Section (NEW - RF-025)
 */
function HiringSignalsSection({
  greenFlags,
  redFlags,
  recommendation,
  recommendationRationale,
}: {
  greenFlags: string[];
  redFlags: string[];
  recommendation: HiringRecommendation;
  recommendationRationale: string;
}) {
  const recommendationConfig: Record<
    HiringRecommendation,
    { label: string; color: string; bgColor: string; icon: React.ReactNode }
  > = {
    hire: {
      label: "HIRE",
      color: "text-green-700",
      bgColor: "bg-green-100",
      icon: <ThumbsUp className="h-5 w-5" />,
    },
    maybe: {
      label: "MAYBE",
      color: "text-yellow-700",
      bgColor: "bg-yellow-100",
      icon: <AlertCircle className="h-5 w-5" />,
    },
    no_hire: {
      label: "NO HIRE",
      color: "text-red-700",
      bgColor: "bg-red-100",
      icon: <ThumbsDown className="h-5 w-5" />,
    },
  };

  const config = recommendationConfig[recommendation];

  return (
    <Card className="overflow-hidden shadow-md">
      <div className="border-b bg-gradient-to-r from-primary/10 to-primary/5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-primary" />
            <h3 className="text-xl font-semibold">Hiring Recommendation</h3>
          </div>
          <div
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-bold ${config.bgColor} ${config.color}`}
          >
            {config.icon}
            {config.label}
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        {/* Recommendation Rationale */}
        <p className="mb-6 text-muted-foreground">{recommendationRationale}</p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Strengths */}
          <div className="rounded-lg bg-green-50 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              Top Strengths
            </h4>
            <ul className="space-y-2">
              {greenFlags.map((flag, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-green-600">•</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Areas to Probe */}
          <div className="rounded-lg bg-amber-50 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
              <AlertCircle className="h-4 w-4" />
              Areas to Probe
            </h4>
            <ul className="space-y-2">
              {redFlags.map((flag, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-amber-600">•</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverallScoreDisplay({
  score,
  level,
}: {
  score: number;
  level: string;
}) {
  const levelLabels: Record<string, { label: string; color: string }> = {
    exceptional: { label: "Exceptional", color: "text-primary" },
    strong: { label: "Strong", color: "text-green-600" },
    adequate: { label: "Adequate", color: "text-blue-600" },
    developing: { label: "Developing", color: "text-yellow-600" },
    needs_improvement: { label: "Needs Improvement", color: "text-red-600" },
  };

  const config = levelLabels[level] || {
    label: level,
    color: "text-foreground",
  };

  return (
    <div className="py-8 text-center">
      <div className="inline-flex h-32 w-32 items-center justify-center rounded-full border-4 border-primary bg-primary/10">
        <div>
          <div className="text-5xl font-semibold text-primary">{score.toFixed(1)}</div>
          <div className="text-sm text-muted-foreground">/5</div>
        </div>
      </div>
      <div className={`mt-4 text-2xl font-semibold ${config.color}`}>
        {config.label}
      </div>
    </div>
  );
}

function MetricsGrid({ metrics }: { metrics: AssessmentReport["metrics"] }) {
  const testStatusIcons: Record<string, React.ReactNode> = {
    passing: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    failing: <XCircle className="h-5 w-5 text-red-600" />,
    none: <AlertCircle className="h-5 w-5 text-muted-foreground" />,
    unknown: <AlertCircle className="h-5 w-5 text-muted-foreground" />,
  };

  if (!metrics) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {metrics.totalDurationMinutes !== null && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Total Time</span>
            </div>
            <div className="text-xl font-semibold">
              {metrics.totalDurationMinutes} min
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">Coworkers</span>
          </div>
          <div className="text-xl font-semibold">{metrics.coworkersContacted}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Bot className="h-4 w-4" />
            <span className="text-xs font-medium">AI Tools</span>
          </div>
          <div className="text-xl font-semibold">
            {metrics.aiToolsUsed ? "Yes" : "No"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            {testStatusIcons[metrics.testsStatus]}
            <span className="text-xs font-medium">CI Tests</span>
          </div>
          <div className="text-xl font-semibold capitalize">
            {metrics.testsStatus}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


function NoReportState({ onGenerate, isGenerating }: { onGenerate: () => void; isGenerating: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <Card className="max-w-md p-12 text-center shadow-lg">
        {isGenerating ? (
          <>
            <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <h2 className="mb-4 text-2xl font-semibold">Generating Report</h2>
            <p className="mb-6 text-muted-foreground">
              We&apos;re analyzing your performance and generating your personalized
              report. This may take a moment.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <AlertCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-4 text-2xl font-semibold">Report Not Ready</h2>
            <p className="mb-6 text-muted-foreground">
              Your assessment report hasn&apos;t been generated yet. Click below to
              generate it now.
            </p>
            <Button onClick={onGenerate}>
              Generate Report
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}

export function ResultsClient({
  assessmentId,
  scenarioName,
  companyName,
  userName,
  report: initialReport,
}: ResultsClientProps) {
  const [report, setReport] = useState<AssessmentReport | null>(initialReport);
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/assessment/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId }),
      });

      if (response.ok) {
        const data = await response.json();
        setReport(data.report);
      }
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSkill = (dimension: string) => {
    setExpandedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(dimension)) {
        next.delete(dimension);
      } else {
        next.add(dimension);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (report?.videoEvaluation) {
      setExpandedSkills(new Set(report.videoEvaluation.skills.map((s) => s.dimension)));
    } else if (report?.skillScores) {
      setExpandedSkills(new Set(report.skillScores.map((s) => s.category)));
    }
  };

  const collapseAll = () => {
    setExpandedSkills(new Set());
  };

  // Show no report state with generate option
  if (!report) {
    return <NoReportState onGenerate={handleGenerateReport} isGenerating={isGenerating} />;
  }

  // Check if this is a new video evaluation report
  const hasVideoEvaluation = !!report.videoEvaluation;

  const formattedDate = new Date(report.generatedAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  return (
    <div className="min-h-screen animate-page-enter bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Profile</span>
            </Link>
          </div>
          <div className="text-right">
            <h1 className="font-semibold">Assessment Results</h1>
            <p className="text-xs text-muted-foreground">
              {formattedDate}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Hero Section */}
        <Card className="mb-8 p-8 shadow-md">
          <div className="flex flex-col items-center gap-8 md:flex-row">
            <div className="flex-1">
              <div className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {companyName}
              </div>
              <h2 className="mb-2 text-3xl font-semibold">{scenarioName}</h2>
              <p className="text-muted-foreground">
                Great work, {userName}! Here&apos;s your detailed assessment
                breakdown.
              </p>
              {hasVideoEvaluation && report.videoEvaluation?.evaluationConfidence && (
                <div className="mt-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Evaluation confidence: <span className="font-medium capitalize">{report.videoEvaluation.evaluationConfidence}</span>
                  </span>
                </div>
              )}
            </div>
            <OverallScoreDisplay
              score={hasVideoEvaluation ? report.videoEvaluation!.overallScore : report.overallScore}
              level={hasVideoEvaluation ? getScoreLevel(report.videoEvaluation!.overallScore) : report.overallLevel}
            />
          </div>
        </Card>

        {/* Hiring Signals Section (NEW - prominent position for recruiters) */}
        {hasVideoEvaluation && report.videoEvaluation?.hiringSignals && (
          <section className="mb-8">
            <HiringSignalsSection
              greenFlags={report.videoEvaluation.hiringSignals.overallGreenFlags}
              redFlags={report.videoEvaluation.hiringSignals.overallRedFlags}
              recommendation={report.videoEvaluation.hiringSignals.recommendation}
              recommendationRationale={report.videoEvaluation.hiringSignals.recommendationRationale}
            />
          </section>
        )}

        {/* Session Metrics */}
        {report.metrics && (
          <section className="mb-8">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold">
              <Clock className="h-5 w-5 text-primary" />
              Session Metrics
            </h3>
            <MetricsGrid metrics={report.metrics} />
          </section>
        )}

        {/* Skill Breakdown - New Format */}
        {hasVideoEvaluation && report.videoEvaluation?.skills && (
          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-semibold">
                <TrendingUp className="h-5 w-5 text-primary" />
                Skill Breakdown
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={expandAll}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Expand All
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  onClick={collapseAll}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Collapse All
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {report.videoEvaluation.skills.map((skill) => (
                <VideoSkillCard
                  key={skill.dimension}
                  skill={skill}
                  isExpanded={expandedSkills.has(skill.dimension)}
                  onToggle={() => toggleSkill(skill.dimension)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Overall Summary */}
        {hasVideoEvaluation && report.videoEvaluation?.overallSummary && (
          <section className="mb-8">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold">
              <Award className="h-5 w-5 text-primary" />
              Summary
            </h3>
            <Card className="p-6">
              <p className="text-muted-foreground">{report.videoEvaluation.overallSummary}</p>
            </Card>
          </section>
        )}

        {/* Fallback: Old Format Display for legacy assessments */}
        {!hasVideoEvaluation && report.skillScores && report.skillScores.length > 0 && (
          <>
            {/* Old Skill Breakdown */}
            <section className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xl font-semibold">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Skill Breakdown
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={expandAll}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Expand All
                  </button>
                  <span className="text-muted-foreground">|</span>
                  <button
                    onClick={collapseAll}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Collapse All
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {report.skillScores.map((skill) => (
                  <LegacySkillCard
                    key={skill.category}
                    skill={skill}
                    isExpanded={expandedSkills.has(skill.category)}
                    onToggle={() => toggleSkill(skill.category)}
                  />
                ))}
              </div>
            </section>

            {/* Old Narrative Feedback */}
            {report.narrative && (
              <section className="mb-8">
                <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                  <Award className="h-5 w-5 text-primary" />
                  Narrative Feedback
                </h3>

                <Card className="overflow-hidden">
                  {/* Summary */}
                  <div className="border-b p-6">
                    <h4 className="mb-3 text-xs font-medium text-muted-foreground">
                      Overall Summary
                    </h4>
                    <div className="prose prose-sm max-w-none">
                      {report.narrative.overallSummary
                        .split("\n\n")
                        .map((paragraph, i) => (
                          <p key={i} className="mb-3 last:mb-0">
                            {paragraph}
                          </p>
                        ))}
                    </div>
                  </div>

                  {/* Strengths */}
                  <div className="border-b bg-green-50 p-6">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-medium text-green-800">
                      <CheckCircle2 className="h-4 w-4" />
                      Strengths
                    </h4>
                    <ul className="space-y-2">
                      {report.narrative.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="mt-1 text-green-600">+</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Areas for Improvement */}
                  <div className="border-b bg-yellow-50 p-6">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-medium text-yellow-800">
                      <TrendingUp className="h-4 w-4" />
                      Areas for Improvement
                    </h4>
                    <ul className="space-y-2">
                      {report.narrative.areasForImprovement.map((area, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="mt-1 text-yellow-600">•</span>
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Notable Observations */}
                  {report.narrative.notableObservations.length > 0 && (
                    <div className="bg-blue-50 p-6">
                      <h4 className="mb-3 flex items-center gap-2 text-xs font-medium text-blue-800">
                        <AlertCircle className="h-4 w-4" />
                        Notable Observations
                      </h4>
                      <ul className="space-y-2">
                        {report.narrative.notableObservations.map(
                          (observation, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="mt-1 text-blue-600">*</span>
                              <span>{observation}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </Card>
              </section>
            )}

            {/* Old Recommendations */}
            {report.recommendations && report.recommendations.length > 0 && (
              <section className="mb-8">
                <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                  <Target className="h-5 w-5 text-primary" />
                  Recommendations
                </h3>

                <div className="space-y-4">
                  {report.recommendations.map((rec, index) => {
                    const priorityColors: Record<string, string> = {
                      high: "bg-red-100 text-red-800",
                      medium: "bg-yellow-100 text-yellow-800",
                      low: "bg-green-100 text-green-800",
                    };

                    return (
                      <Card key={index} className="p-6">
                        <div className="mb-3 flex items-start justify-between gap-4">
                          <h4 className="text-lg font-semibold">{rec.title}</h4>
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-medium ${priorityColors[rec.priority]}`}
                          >
                            {rec.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="mb-4 text-muted-foreground">
                          {rec.description}
                        </p>
                        {rec.actionableSteps && rec.actionableSteps.length > 0 && (
                          <div>
                            <h5 className="mb-2 text-xs font-medium text-muted-foreground">
                              Action Steps
                            </h5>
                            <ol className="space-y-2">
                              {rec.actionableSteps.map((step, stepIndex) => (
                                <li key={stepIndex} className="flex items-start gap-3">
                                  <span className="text-sm font-semibold text-primary">
                                    {stepIndex + 1}.
                                  </span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* Footer Actions */}
        <section className="mt-8 border-t pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Assessment ID: <span className="font-mono">{assessmentId}</span>
            </p>
            <div className="flex gap-4">
              <Button variant="outline" asChild>
                <Link href="/profile">
                  Back to Profile
                </Link>
              </Button>
              <Button asChild>
                <Link href="/">
                  Start New Assessment
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/**
 * Legacy skill card for old report format (backward compatibility)
 */
import type { SkillScore } from "@/types";

function LegacySkillCard({
  skill,
  isExpanded,
  onToggle,
}: {
  skill: SkillScore;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const categoryLabels: Record<string, string> = {
    communication: "Communication",
    problem_decomposition: "Problem Decomposition",
    ai_leverage: "AI Leverage",
    code_quality: "Code Quality",
    xfn_collaboration: "XFN Collaboration",
    time_management: "Time Management",
    technical_decision_making: "Technical Decision-Making",
    presentation: "Presentation",
  };

  const levelColors: Record<string, string> = {
    exceptional: "bg-primary text-primary-foreground",
    strong: "bg-green-100 text-green-800",
    adequate: "bg-blue-100 text-blue-800",
    developing: "bg-yellow-100 text-yellow-800",
    needs_improvement: "bg-red-100 text-red-800",
  };

  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 transition-colors hover:bg-muted/50"
      >
        <div className="flex flex-1 items-center gap-4">
          <div className="min-w-[200px] text-left font-semibold">
            {categoryLabels[skill.category] || skill.category}
          </div>
          <div className="max-w-xs flex-1">
            <SkillScoreBar score={skill.score} />
          </div>
          <div className="text-lg font-semibold text-primary">{skill.score}/5</div>
          <span
            className={`rounded-md px-2 py-1 text-xs font-medium ${levelColors[skill.level] || "bg-muted"}`}
          >
            {skill.level.replace("_", " ").toUpperCase()}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t bg-muted/50 px-4 pb-4 pt-2">
          <p className="mb-3 text-sm text-muted-foreground">{skill.notes}</p>
          {skill.evidence.length > 0 && (
            <div>
              <h5 className="mb-2 text-xs font-medium text-muted-foreground">
                Evidence
              </h5>
              <ul className="space-y-1">
                {skill.evidence.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-primary">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
