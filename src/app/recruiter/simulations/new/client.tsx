"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, ArrowRight, Loader2, X, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import type { ParseJDResponse, InferredSeniorityLevel, ConfidentField } from "@/types";
import type { CoworkerBuilderData } from "@/lib/scenarios/scenario-builder";
import type { TaskOption } from "@/lib/scenarios/task-generator";
import { CandidateExperienceSummary } from "@/components/recruiter/CandidateExperienceSummary";

type Step = "entry" | "guided" | "generating" | "preview";

// Task option with "write my own" flag
type TaskChoice = {
  type: "generated" | "custom";
  option?: TaskOption;
  customDescription?: string;
};

// Preview data state
type PreviewData = {
  simulationName: string;
  companyName: string;
  companyDescription: string;
  techStack: string[];
  taskOptions: TaskOption[];
  selectedTask: TaskChoice | null;
  coworkers: CoworkerBuilderData[];
};

// Common tech stacks for multi-select
const COMMON_TECH_STACKS = [
  "React",
  "Next.js",
  "Node.js",
  "TypeScript",
  "Python",
  "Go",
  "Java",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "AWS",
  "Docker",
  "Kubernetes",
  "GraphQL",
];

// Role title suggestions for autocomplete
const ROLE_SUGGESTIONS = [
  "Senior Backend Engineer",
  "Frontend Developer",
  "Full Stack Engineer",
  "DevOps Engineer",
  "ML Engineer",
  "Staff Engineer",
  "Engineering Manager",
  "Senior Frontend Engineer",
  "Backend Developer",
  "Data Engineer",
];

export function RecruiterScenarioBuilderClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("entry");
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guided form state
  const [roleTitle, setRoleTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [selectedTechStack, setSelectedTechStack] = useState<string[]>([]);
  const [customTech, setCustomTech] = useState("");
  const [seniorityLevel, setSeniorityLevel] = useState<InferredSeniorityLevel | "">("");
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);

  // Preview state
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [parsedJDData, setParsedJDData] = useState<ParseJDResponse | null>(null);
  const [expandedCoworker, setExpandedCoworker] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [customTaskInput, setCustomTaskInput] = useState("");

  const handleContinue = async () => {
    if (!jobDescription.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Parse the job description
      const parseResponse = await fetch("/api/recruiter/simulations/parse-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: jobDescription.trim() }),
      });

      if (!parseResponse.ok) {
        const errorData = await parseResponse.json();
        throw new Error(errorData.error || "Failed to analyze job description");
      }

      const parsedData = await parseResponse.json() as ParseJDResponse;
      setParsedJDData(parsedData);

      // Step 2: Transition to generating step
      setStep("generating");

      // Step 3: Generate preview content in parallel
      await generatePreviewContent(parsedData);

    } catch (err) {
      console.error("Failed to parse job description:", err);
      setError(err instanceof Error ? err.message : "Failed to analyze job description");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Cmd/Ctrl+Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleContinue();
    }
  };

  const handleGuidedPath = () => {
    // TODO: Navigate to guided questionnaire (US-003)
    setStep("guided");
  };

  const handleTryAgain = () => {
    setError(null);
  };

  // Guided form handlers
  const toggleTechStack = (tech: string) => {
    setSelectedTechStack((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
  };

  const addCustomTech = () => {
    const trimmed = customTech.trim();
    if (trimmed && !selectedTechStack.includes(trimmed)) {
      setSelectedTechStack((prev) => [...prev, trimmed]);
      setCustomTech("");
    }
  };

  const removeCustomTech = (tech: string) => {
    setSelectedTechStack((prev) => prev.filter((t) => t !== tech));
  };

  const isGuidedFormValid = roleTitle.trim() && companyName.trim();

  const handleGuidedSubmit = async () => {
    if (!isGuidedFormValid || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Transform guided form data to ParsedJDResponse shape
      const guidedData: ParseJDResponse = {
        roleName: { value: roleTitle.trim(), confidence: "high" },
        companyName: { value: companyName.trim(), confidence: "high" },
        companyDescription: {
          value: companyDescription.trim() || null,
          confidence: companyDescription.trim() ? "high" : "low",
        },
        techStack: {
          value: selectedTechStack.length > 0 ? selectedTechStack : null,
          confidence: selectedTechStack.length > 0 ? "high" : "low",
        },
        seniorityLevel: {
          value: seniorityLevel || null,
          confidence: seniorityLevel ? "high" : "low",
        },
        keyResponsibilities: {
          value: null,
          confidence: "low",
        },
        domainContext: {
          value: companyDescription.trim() || null,
          confidence: companyDescription.trim() ? "medium" : "low",
        },
      };

      setParsedJDData(guidedData);

      // Transition to generating step
      setStep("generating");

      // Generate preview content
      await generatePreviewContent(guidedData);

    } catch (err) {
      console.error("Failed to process guided form:", err);
      setError(err instanceof Error ? err.message : "Failed to process your input");
      setIsLoading(false);
    }
  };

  // Generate preview content (tasks and coworkers) from parsed data
  const generatePreviewContent = async (parsedData: ParseJDResponse) => {
    try {
      // Extract values with fallbacks
      const roleName = parsedData.roleName.value || "Software Engineer";
      const companyNameValue = parsedData.companyName.value || "Acme Inc";
      const companyDesc = parsedData.companyDescription.value || "";
      const techStack = parsedData.techStack.value || [];
      const seniority = parsedData.seniorityLevel.value || "mid";
      const responsibilities = parsedData.keyResponsibilities.value || [];
      const domain = parsedData.domainContext.value || companyDesc;

      // Call both APIs in parallel
      const [taskResponse, coworkersResponse] = await Promise.all([
        fetch("/api/recruiter/simulations/generate-task", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roleName,
            seniorityLevel: seniority,
            techStack,
            keyResponsibilities: responsibilities.length > 0 ? responsibilities : ["Build and maintain features"],
            domainContext: domain || "a technology company",
            companyName: companyNameValue,
          }),
        }),
        // We need a task description first, so let's use a placeholder
        Promise.resolve(null), // Will generate coworkers after task
      ]);

      if (!taskResponse.ok) {
        throw new Error("Failed to generate tasks");
      }

      const taskData = await taskResponse.json();
      const taskOptions = taskData.taskOptions || [];

      // Now generate coworkers with the first task option
      const taskDescription = taskOptions[0]?.description || "Complete a coding task";

      const coworkersResponse2 = await fetch("/api/recruiter/simulations/generate-coworkers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleName,
          seniorityLevel: seniority,
          companyName: companyNameValue,
          companyDescription: companyDesc || `${companyNameValue} is a technology company.`,
          techStack,
          taskDescription,
          keyResponsibilities: responsibilities.length > 0 ? responsibilities : ["Build and maintain features"],
        }),
      });

      if (!coworkersResponse2.ok) {
        throw new Error("Failed to generate coworkers");
      }

      const coworkersData = await coworkersResponse2.json();

      // Set up preview data
      setPreviewData({
        simulationName: `${roleName} @ ${companyNameValue}`,
        companyName: companyNameValue,
        companyDescription: companyDesc || `${companyNameValue} is a technology company.`,
        techStack,
        taskOptions,
        selectedTask: null, // User must select
        coworkers: coworkersData.coworkers || [],
      });

      // Transition to preview
      setStep("preview");
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to generate preview content:", err);
      setError(err instanceof Error ? err.message : "Failed to generate simulation content");
      setStep("entry");
      setIsLoading(false);
    }
  };

  if (step === "entry") {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-3xl space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold">Create a New Simulation</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Start with a job description or answer a few questions
            </p>
          </div>

          {/* Primary Path: Job Description */}
          <Card className="p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Paste a Job Description</h2>
                <p className="text-sm text-muted-foreground">
                  Recommended — we'll extract everything automatically
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste your job description here...

Example:
Senior Frontend Engineer at Acme Corp

We're looking for an experienced frontend developer to join our team. You'll be working on our React-based dashboard, building new features for our analytics platform..."
                className="min-h-[300px] resize-y"
                disabled={isLoading}
              />

              {error && (
                <div className="flex items-center justify-between rounded-lg border border-destructive bg-destructive/10 p-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">
                      {error}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTryAgain}
                    className="text-destructive hover:text-destructive"
                  >
                    Try again
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Tip: Press{" "}
                  <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                    {typeof navigator !== "undefined" &&
                    navigator.platform.toLowerCase().includes("mac")
                      ? "⌘"
                      : "Ctrl"}
                    +Enter
                  </kbd>{" "}
                  to continue
                </p>
                <Button
                  onClick={handleContinue}
                  disabled={!jobDescription.trim() || isLoading}
                  size="lg"
                  className="gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing your job description...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Secondary Path: Guided */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have a job description?{" "}
              <Button
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={handleGuidedPath}
                disabled={isLoading}
              >
                Answer a few questions instead
              </Button>
            </p>
          </div>

          {/* Cancel Link */}
          <div className="text-center">
            <Button variant="ghost" asChild className="text-muted-foreground">
              <Link href="/recruiter/simulations">Cancel</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "guided") {
    const filteredRoleSuggestions = ROLE_SUGGESTIONS.filter((role) =>
      role.toLowerCase().includes(roleTitle.toLowerCase())
    );

    return (
      <div className="flex h-full flex-col items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-2xl space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold">Tell Us About Your Role</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Answer a few questions to create your simulation
            </p>
          </div>

          <Card className="p-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGuidedSubmit();
              }}
              className="space-y-6"
            >
              {/* Question 1: Role Title */}
              <div className="space-y-2">
                <Label htmlFor="roleTitle" className="text-base font-semibold">
                  What's the role title? <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="roleTitle"
                    value={roleTitle}
                    onChange={(e) => {
                      setRoleTitle(e.target.value);
                      setShowRoleSuggestions(true);
                    }}
                    onFocus={() => setShowRoleSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowRoleSuggestions(false), 200)}
                    placeholder="e.g., Senior Backend Engineer"
                    disabled={isLoading}
                    className="text-base"
                    required
                  />
                  {showRoleSuggestions && roleTitle && filteredRoleSuggestions.length > 0 && (
                    <div className="absolute top-full z-10 mt-1 w-full rounded-lg border bg-background shadow-lg">
                      {filteredRoleSuggestions.slice(0, 5).map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            setRoleTitle(suggestion);
                            setShowRoleSuggestions(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Question 2: Company Name */}
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-base font-semibold">
                  What's the company name? <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., Acme Corp"
                  disabled={isLoading}
                  className="text-base"
                  required
                />
              </div>

              {/* Question 3: Company Description */}
              <div className="space-y-2">
                <Label htmlFor="companyDescription" className="text-base font-semibold">
                  What does your company do?{" "}
                  <span className="text-sm font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="companyDescription"
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  placeholder="e.g., We're a fintech startup building payment infrastructure for small businesses"
                  disabled={isLoading}
                  className="min-h-[80px] text-base"
                  rows={3}
                />
              </div>

              {/* Question 4: Tech Stack */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  What technologies does this role use?{" "}
                  <span className="text-sm font-normal text-muted-foreground">(optional)</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_TECH_STACKS.map((tech) => (
                    <Badge
                      key={tech}
                      variant={selectedTechStack.includes(tech) ? "default" : "outline"}
                      className="cursor-pointer select-none px-3 py-1.5 text-sm transition-colors hover:bg-primary/90"
                      onClick={() => !isLoading && toggleTechStack(tech)}
                    >
                      {tech}
                    </Badge>
                  ))}
                </div>
                {selectedTechStack.some((t) => !COMMON_TECH_STACKS.includes(t)) && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedTechStack
                      .filter((t) => !COMMON_TECH_STACKS.includes(t))
                      .map((tech) => (
                        <Badge
                          key={tech}
                          variant="default"
                          className="cursor-pointer select-none px-3 py-1.5 text-sm"
                        >
                          {tech}
                          <X
                            className="ml-1.5 h-3 w-3"
                            onClick={() => !isLoading && removeCustomTech(tech)}
                          />
                        </Badge>
                      ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={customTech}
                    onChange={(e) => setCustomTech(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomTech();
                      }
                    }}
                    placeholder="Add other technology..."
                    disabled={isLoading}
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCustomTech}
                    disabled={!customTech.trim() || isLoading}
                    className="shrink-0"
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Question 5: Seniority Level */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  What seniority level?{" "}
                  <span className="text-sm font-normal text-muted-foreground">(optional)</span>
                </Label>
                <RadioGroup
                  value={seniorityLevel}
                  onValueChange={(value: string) => setSeniorityLevel(value as InferredSeniorityLevel)}
                  disabled={isLoading}
                  className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="junior" id="junior" />
                    <Label htmlFor="junior" className="cursor-pointer font-normal">
                      Junior
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mid" id="mid" />
                    <Label htmlFor="mid" className="cursor-pointer font-normal">
                      Mid-level
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="senior" id="senior" />
                    <Label htmlFor="senior" className="cursor-pointer font-normal">
                      Senior
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="staff" id="staff" />
                    <Label htmlFor="staff" className="cursor-pointer font-normal">
                      Staff+
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center justify-between rounded-lg border border-destructive bg-destructive/10 p-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">{error}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTryAgain}
                    className="text-destructive hover:text-destructive"
                  >
                    Try again
                  </Button>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("entry")}
                  disabled={isLoading}
                  className="gap-2"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={!isGuidedFormValid || isLoading}
                  size="lg"
                  className="gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating your simulation...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>

          {/* Cancel Link */}
          <div className="text-center">
            <Button variant="ghost" asChild className="text-muted-foreground">
              <Link href="/recruiter/simulations">Cancel</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Generating step - loading state
  if (step === "generating") {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-2xl space-y-6 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Building your simulation...</h2>
            <p className="text-muted-foreground">
              Generating coding tasks and team members based on your requirements
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Preview step
  if (step === "preview" && previewData) {
    const isReadyToCreate = previewData.selectedTask !== null && previewData.coworkers.length > 0;

    // Get role name from simulation name (e.g., "Senior Backend Engineer @ Acme" -> "Senior Backend Engineer")
    const roleName = previewData.simulationName.split(" @ ")[0] || "Software Engineer";

    // Get task summary for the candidate experience card
    const taskSummary = previewData.selectedTask?.type === "custom"
      ? previewData.selectedTask.customDescription || "complete a coding task"
      : previewData.selectedTask?.option?.summary || "complete a coding task";

    return (
      <div className="h-full overflow-y-auto bg-background px-4 py-8">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Preview Your Simulation</h1>
            <p className="text-lg text-muted-foreground">
              Review and customize the auto-generated content before creating
            </p>
          </div>

          {/* Candidate Experience Summary Card */}
          <CandidateExperienceSummary
            roleName={roleName}
            companyName={previewData.companyName}
            coworkers={previewData.coworkers}
            taskSummary={taskSummary}
          />

          {/* Section 1: Simulation Name */}
          <Card className="p-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-base font-semibold">Simulation Name</Label>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </div>
              {editingField === "name" ? (
                <Input
                  value={previewData.simulationName}
                  onChange={(e) =>
                    setPreviewData({ ...previewData, simulationName: e.target.value })
                  }
                  onBlur={() => setEditingField(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setEditingField(null);
                    if (e.key === "Escape") setEditingField(null);
                  }}
                  autoFocus
                  className="text-xl font-semibold"
                />
              ) : (
                <h2
                  className="cursor-pointer text-xl font-semibold hover:text-primary"
                  onClick={() => setEditingField("name")}
                >
                  {previewData.simulationName}
                </h2>
              )}
            </div>
          </Card>

          {/* Section 2: Company */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-base font-semibold">Company</Label>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </div>
              {editingField === "company" ? (
                <div className="space-y-2">
                  <Input
                    value={previewData.companyName}
                    onChange={(e) =>
                      setPreviewData({ ...previewData, companyName: e.target.value })
                    }
                    placeholder="Company name"
                    className="font-semibold"
                  />
                  <Textarea
                    value={previewData.companyDescription}
                    onChange={(e) =>
                      setPreviewData({ ...previewData, companyDescription: e.target.value })
                    }
                    placeholder="Company description"
                    rows={3}
                  />
                  <Button size="sm" onClick={() => setEditingField(null)}>
                    Done
                  </Button>
                </div>
              ) : (
                <div
                  className="cursor-pointer space-y-2 hover:text-primary"
                  onClick={() => setEditingField("company")}
                >
                  <p className="font-semibold">{previewData.companyName}</p>
                  <p className="text-sm text-muted-foreground">
                    {previewData.companyDescription}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Section 3: Coding Task */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-base font-semibold">Coding Task</Label>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </div>
              <RadioGroup
                value={
                  previewData.selectedTask?.type === "custom"
                    ? "custom"
                    : previewData.selectedTask?.option?.summary || ""
                }
                onValueChange={(value) => {
                  if (value === "custom") {
                    setPreviewData({
                      ...previewData,
                      selectedTask: { type: "custom", customDescription: customTaskInput },
                    });
                  } else {
                    const option = previewData.taskOptions.find((t) => t.summary === value);
                    if (option) {
                      setPreviewData({
                        ...previewData,
                        selectedTask: { type: "generated", option },
                      });
                    }
                  }
                }}
                className="space-y-3"
              >
                {previewData.taskOptions.map((task) => (
                  <div key={task.summary} className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem value={task.summary} id={task.summary} className="mt-1" />
                      <Label htmlFor={task.summary} className="cursor-pointer flex-1">
                        <div className="font-medium">{task.summary}</div>
                      </Label>
                    </div>
                    {previewData.selectedTask?.option?.summary === task.summary && (
                      <div className="ml-6 rounded-lg bg-muted p-4 text-sm">
                        {task.description}
                      </div>
                    )}
                  </div>
                ))}
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="custom" id="custom" className="mt-1" />
                    <Label htmlFor="custom" className="cursor-pointer flex-1 font-medium">
                      Write my own
                    </Label>
                  </div>
                  {previewData.selectedTask?.type === "custom" && (
                    <div className="ml-6">
                      <Textarea
                        value={customTaskInput}
                        onChange={(e) => {
                          setCustomTaskInput(e.target.value);
                          setPreviewData({
                            ...previewData,
                            selectedTask: { type: "custom", customDescription: e.target.value },
                          });
                        }}
                        placeholder="Describe the coding task..."
                        rows={5}
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>
              </RadioGroup>
            </div>
          </Card>

          {/* Section 4: Team Members */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-base font-semibold">Team Members</Label>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-3">
                {previewData.coworkers.map((coworker, index) => (
                  <Card key={index} className="p-4">
                    <div
                      className="flex cursor-pointer items-center justify-between"
                      onClick={() =>
                        setExpandedCoworker(expandedCoworker === index ? null : index)
                      }
                    >
                      <div>
                        <p className="font-semibold">{coworker.name}</p>
                        <p className="text-sm text-muted-foreground">{coworker.role}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {coworker.knowledge.length} knowledge item(s)
                        </p>
                      </div>
                      {expandedCoworker === index ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    {expandedCoworker === index && (
                      <div className="mt-4 space-y-3 border-t pt-4">
                        <div>
                          <Label className="text-xs font-semibold">Persona Style</Label>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {coworker.personaStyle}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Knowledge Items</Label>
                          <ul className="mt-2 space-y-2">
                            {coworker.knowledge.map((k, kIndex) => (
                              <li key={kIndex} className="text-sm">
                                <span className="font-medium">{k.topic}</span>
                                {k.isCritical && (
                                  <Badge variant="destructive" className="ml-2 text-xs">
                                    Critical
                                  </Badge>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </Card>

          {/* Section 5: Tech Stack */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-base font-semibold">Tech Stack</Label>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-wrap gap-2">
                {previewData.techStack.map((tech) => (
                  <Badge key={tech} variant="outline" className="px-3 py-1.5 text-sm">
                    {tech}
                    <X
                      className="ml-2 h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() =>
                        setPreviewData({
                          ...previewData,
                          techStack: previewData.techStack.filter((t) => t !== tech),
                        })
                      }
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add technology..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const value = e.currentTarget.value.trim();
                      if (value && !previewData.techStack.includes(value)) {
                        setPreviewData({
                          ...previewData,
                          techStack: [...previewData.techStack, value],
                        });
                        e.currentTarget.value = "";
                      }
                    }
                  }}
                  className="text-sm"
                />
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between border-t pt-6">
            <Button variant="ghost" onClick={() => setStep("entry")} disabled={isLoading}>
              Back
            </Button>
            <Button
              size="lg"
              disabled={!isReadyToCreate || isLoading}
              onClick={() => {
                // TODO: Implement save flow (US-011)
                console.log("Create simulation:", previewData);
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Simulation"
              )}
            </Button>
          </div>

          {!isReadyToCreate && (
            <p className="text-center text-sm text-muted-foreground">
              Please select a coding task to continue
            </p>
          )}

          {/* Cancel Link */}
          <div className="text-center">
            <Button variant="ghost" asChild className="text-muted-foreground">
              <Link href="/recruiter/simulations">Cancel</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
