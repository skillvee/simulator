"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, ArrowRight, Loader2, X, Sparkles, Check, Pencil, Users, Eye, AlertTriangle, GraduationCap, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { CoworkerAvatar } from "@/components/chat/coworker-avatar"; // eslint-disable-line no-restricted-imports -- Component import for UI
import type { ParseJDResponse, InferredSeniorityLevel } from "@/types";
import type { CoworkerBuilderData } from "@/lib/scenarios/scenario-builder";
import type { TaskOption } from "@/lib/scenarios/task-generator";
import { CandidateExperienceSummary } from "@/components/recruiter/CandidateExperienceSummary"; // eslint-disable-line no-restricted-imports -- Component import allowed for UI
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type Step = "entry" | "guided" | "generating" | "preview";

interface ArchetypeOption {
  id: string;
  slug: string;
  name: string;
  description: string;
}

interface RoleFamilyWithArchetypes {
  id: string;
  slug: string;
  name: string;
  archetypes: ArchetypeOption[];
}

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

// Progress messages shown during simulation generation
const GENERATING_STEPS = [
  "Extracting key job description insights...",
  "Identifying required technical skills...",
  "Analyzing seniority expectations...",
  "Crafting realistic work challenges...",
  "Designing team dynamics and personalities...",
  "Calibrating difficulty to match role level...",
  "Building authentic work scenarios...",
  "Assembling your simulation team...",
  "Finalizing simulation details...",
];

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

/**
 * Infer the best-matching archetype from a role name.
 * Returns the archetype ID or null if no match.
 */
function inferArchetype(
  roleName: string,
  families: RoleFamilyWithArchetypes[]
): string | null {
  if (!roleName || families.length === 0) return null;

  const lower = roleName.toLowerCase();

  // Keyword map: substring → archetype slug
  const keywords: [string[], string][] = [
    // Engineering
    [["frontend", "front-end", "front end", "ui engineer", "ui developer"], "frontend_engineer"],
    [["backend", "back-end", "back end", "server engineer", "api engineer"], "backend_engineer"],
    [["full stack", "fullstack", "full-stack"], "fullstack_engineer"],
    [["tech lead", "architect", "staff engineer", "principal engineer", "engineering manager"], "tech_lead"],
    [["devops", "sre", "site reliability", "infrastructure", "platform engineer"], "devops_sre"],
    // Product Management
    [["growth pm", "growth product"], "growth_pm"],
    [["platform pm", "platform product"], "platform_pm"],
    [["product manager", "product owner", "pm"], "core_pm"],
    // Data Science
    [["analytics engineer", "data engineer"], "analytics_engineer"],
    [["data analyst", "business analyst", "bi analyst"], "data_analyst"],
    [["ml engineer", "machine learning", "ai engineer", "data scientist"], "ml_engineer"],
    // Program Management
    [["technical program", "tpm"], "technical_program_manager"],
    [["program manager", "pgm"], "business_program_manager"],
    // Sales
    [["account executive", "ae ", "account manager"], "account_executive"],
    [["sdr", "sales development", "bdr", "business development rep"], "sales_development_rep"],
    [["solutions engineer", "sales engineer", "se ", "pre-sales"], "solutions_engineer"],
    // Customer Success
    [["onboarding specialist", "implementation specialist"], "onboarding_specialist"],
    [["customer success manager", "csm"], "customer_success_manager"],
    [["renewals manager", "renewal"], "renewals_manager"],
  ];

  for (const [terms, slug] of keywords) {
    if (terms.some((term) => lower.includes(term))) {
      for (const family of families) {
        const match = family.archetypes.find((a) => a.slug === slug);
        if (match) return match.id;
      }
    }
  }
  return null;
}

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
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<string>("");
  const [roleFamilies, setRoleFamilies] = useState<RoleFamilyWithArchetypes[]>([]);
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);

  // Generating progress message
  const [generatingMessageIndex, setGeneratingMessageIndex] = useState(0);

  const resetGeneratingProgress = useCallback(() => {
    setGeneratingMessageIndex(0);
  }, []);

  useEffect(() => {
    if (step !== "generating") return;
    resetGeneratingProgress();
    const interval = setInterval(() => {
      setGeneratingMessageIndex((prev) =>
        prev < GENERATING_STEPS.length - 1 ? prev + 1 : prev
      );
    }, 2800);
    return () => clearInterval(interval);
  }, [step, resetGeneratingProgress]);

  // Fetch archetypes on mount
  useEffect(() => {
    fetch("/api/recruiter/archetypes")
      .then((res) => res.json())
      .then((data) => {
        if (data.data?.roleFamilies) {
          setRoleFamilies(data.data.roleFamilies);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch archetypes:", err);
      });
  }, []);

  // Preview state
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [parsedJDData, setParsedJDData] = useState<ParseJDResponse | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [customTaskInput, setCustomTaskInput] = useState("");
  const [saveProgress, setSaveProgress] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandedTaskIndex, setExpandedTaskIndex] = useState<number | null>(null);

  // Check if parsed JD data has enough usable info to proceed directly to generation.
  // Only require a role name — everything else has robust fallbacks in generatePreviewContent.
  const hasUsableData = (parsed: ParseJDResponse): boolean => {
    const hasRole = !!parsed.roleName.value && parsed.roleName.confidence !== "low";
    return hasRole;
  };

  // Pre-fill the guided form with whatever was extracted from the JD
  const prefillGuidedForm = (parsed: ParseJDResponse) => {
    if (parsed.roleName.value) setRoleTitle(parsed.roleName.value);
    if (parsed.companyName.value) setCompanyName(parsed.companyName.value);
    if (parsed.companyDescription.value) setCompanyDescription(parsed.companyDescription.value);
    if (parsed.techStack.value && parsed.techStack.value.length > 0) {
      setSelectedTechStack(parsed.techStack.value);
    }
    if (parsed.seniorityLevel.value) {
      setSeniorityLevel(parsed.seniorityLevel.value);
    }
  };

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

      // Step 2: Check if we got enough data to generate directly
      if (!hasUsableData(parsedData)) {
        // Not enough info — redirect to guided form pre-filled with what we extracted
        prefillGuidedForm(parsedData);
        setIsLoading(false);
        setError("We couldn\u2019t extract enough details. Please fill in the missing fields below.");
        setStep("guided");
        return;
      }

      // Step 3: Auto-infer archetype from role name
      if (!selectedArchetypeId || selectedArchetypeId === "none") {
        const inferred = inferArchetype(parsedData.roleName.value || "", roleFamilies);
        if (inferred) setSelectedArchetypeId(inferred);
      }

      // Step 4: Transition to generating step
      setStep("generating");

      // Step 5: Generate preview content
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

      // Auto-infer archetype from role title if not already set
      if (!selectedArchetypeId || selectedArchetypeId === "none") {
        const inferred = inferArchetype(roleTitle.trim(), roleFamilies);
        if (inferred) setSelectedArchetypeId(inferred);
      }

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

  // Save the complete simulation
  const handleSaveSimulation = async () => {
    if (!previewData || !previewData.selectedTask || isLoading) return;

    setIsLoading(true);
    setSaveError(null);
    setSaveProgress("Creating simulation...");

    try {
      // Step 1: Auto-generate simulation name if not edited
      const simulationName = previewData.simulationName ||
        `${parsedJDData?.roleName.value || "Software Engineer"} @ ${previewData.companyName}`;

      // Get task description based on selection
      const taskDescription = previewData.selectedTask.type === "custom"
        ? previewData.selectedTask.customDescription || "Complete a work challenge"
        : previewData.selectedTask.option?.description || "Complete a work challenge";

      // Step 2: Create scenario (repoUrl omitted - will be set by provisioning)
      const scenarioResponse = await fetch("/api/recruiter/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: simulationName,
          companyName: previewData.companyName,
          companyDescription: previewData.companyDescription,
          taskDescription,
          techStack: previewData.techStack,
          targetLevel: parsedJDData?.seniorityLevel.value || "mid",
          archetypeId: selectedArchetypeId,
          // repoUrl is intentionally omitted - it will be set by repo provisioning
        }),
      });

      if (!scenarioResponse.ok) {
        const errorData = await scenarioResponse.json();
        throw new Error(errorData.error || "Failed to create simulation");
      }

      const { data: { scenario } } = await scenarioResponse.json();

      setSaveProgress("Setting up team members...");

      // Step 3: Create coworkers
      const coworkerPromises = previewData.coworkers.map(async (coworker) => {
        const response = await fetch(`/api/recruiter/simulations/${scenario.id}/coworkers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: coworker.name,
            role: coworker.role,
            personaStyle: coworker.personaStyle,
            personality: coworker.personality,
            knowledge: coworker.knowledge,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to create coworker ${coworker.name}: ${errorData.error || "Unknown error"}`);
        }

        return response.json();
      });

      // Wait for all coworkers to be created
      const coworkerResults = await Promise.allSettled(coworkerPromises);

      // Check if any coworker creation failed
      const failedCoworkers = coworkerResults.filter(r => r.status === "rejected");
      if (failedCoworkers.length > 0 && failedCoworkers.length === coworkerResults.length) {
        // All coworkers failed
        throw new Error("Failed to create team members");
      } else if (failedCoworkers.length > 0) {
        // Partial success - show warning but continue
        console.warn(`${failedCoworkers.length} coworker(s) failed to create:`, failedCoworkers);
      }

      setSaveProgress("Almost done...");

      // Step 4: Trigger avatar generation (fire-and-forget)
      fetch("/api/avatar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: scenario.id }),
      }).catch((err) => {
        console.error("Avatar generation failed (non-blocking):", err);
      });

      // Step 5: Trigger repo provisioning (fire-and-forget)
      fetch(`/api/recruiter/simulations/${scenario.id}/provision-repo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch((err) => {
        console.error("Repo provisioning failed (non-blocking):", err);
      });

      // Step 6: Redirect to simulation detail page
      setSaveProgress(null);
      router.push(`/recruiter/simulations/${scenario.id}/settings?success=true`);

    } catch (err) {
      console.error("Failed to save simulation:", err);
      setSaveError(err instanceof Error ? err.message : "Failed to save simulation. Please try again.");
      setSaveProgress(null);
      setIsLoading(false);
    }
  };

  // Generate preview content (tasks and coworkers) from parsed data
  const generatePreviewContent = async (parsedData: ParseJDResponse) => {
    try {
      // Extract values with robust fallbacks that satisfy downstream API requirements
      const roleName = parsedData.roleName.value || "Software Engineer";
      const companyNameValue = parsedData.companyName.value || "Acme Inc";
      const companyDesc = parsedData.companyDescription.value || "";
      // Downstream APIs require at least 1 tech stack item
      const techStack = (parsedData.techStack.value && parsedData.techStack.value.length > 0)
        ? parsedData.techStack.value
        : ["JavaScript", "TypeScript"];
      const seniority = parsedData.seniorityLevel.value || "mid";
      const responsibilities = parsedData.keyResponsibilities.value || [];
      const domain = parsedData.domainContext.value || companyDesc;

      // Generate tasks
      const taskResponse = await fetch("/api/recruiter/simulations/generate-task", {
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
      });

      if (!taskResponse.ok) {
        const errorBody = await taskResponse.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to generate tasks");
      }

      const taskData = await taskResponse.json();
      const taskOptions = taskData.taskOptions || [];

      // Now generate coworkers with the first task option
      const taskDescription = taskOptions[0]?.description || "Complete a work challenge";

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
        const errorBody = await coworkersResponse2.json().catch(() => ({}));
        throw new Error(errorBody.message || errorBody.error || "Failed to generate coworkers");
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
      // Instead of dumping back to entry, fall back to guided form so user can adjust and retry
      if (parsedJDData) {
        prefillGuidedForm(parsedJDData);
      }
      setError("Generation failed \u2014 please review the details below and try again.");
      setStep("guided");
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
                  Recommended — we&apos;ll extract everything automatically
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
              Don&apos;t have a job description?{" "}
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
                  What&apos;s the role title? <span className="text-destructive">*</span>
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
                  What&apos;s the company name? <span className="text-destructive">*</span>
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
                  placeholder="e.g., We&apos;re a fintech startup building payment infrastructure for small businesses"
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

              {/* Question 6: Role Archetype */}
              {roleFamilies.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    Role archetype{" "}
                    <span className="text-sm font-normal text-muted-foreground">(adjusts scoring expectations per dimension)</span>
                  </Label>
                  <Select
                    value={selectedArchetypeId}
                    onValueChange={setSelectedArchetypeId}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a role archetype..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roleFamilies.map((family) => (
                        <SelectGroup key={family.id}>
                          <SelectLabel>{family.name}</SelectLabel>
                          {family.archetypes.map((arch) => (
                            <SelectItem key={arch.id} value={arch.id}>
                              {arch.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedArchetypeId && selectedArchetypeId !== "none" && (
                    <p className="text-xs text-muted-foreground">
                      Scoring expectations will be adjusted for this role — different dimensions will have different expected scores based on seniority.
                    </p>
                  )}
                </div>
              )}

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

  // Generating step - loading state with progress messages
  if (step === "generating") {
    const progress = ((generatingMessageIndex + 1) / GENERATING_STEPS.length) * 100;

    return (
      <div className="flex h-full flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <Sparkles className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <div className="space-y-3">
            <h2 className="text-2xl font-bold">Building your simulation</h2>
            <p
              key={generatingMessageIndex}
              className="text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500"
            >
              {GENERATING_STEPS[generatingMessageIndex]}
            </p>
          </div>
          {/* Progress bar */}
          <div className="mx-auto w-64">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {/* Completed steps */}
          <div className="mx-auto max-w-xs space-y-2">
            {GENERATING_STEPS.slice(0, generatingMessageIndex).map((msg, i) => (
              <p key={i} className="text-xs text-muted-foreground/50">
                {msg.replace("...", "")} &#10003;
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Preview step — two-column "Confirm & Create" layout
  if (step === "preview" && previewData) {
    const hasArchetype = !!selectedArchetypeId && selectedArchetypeId !== "none";
    const isReadyToCreate = previewData.selectedTask !== null && previewData.coworkers.length > 0 && hasArchetype;

    // Get role name from simulation name (e.g., "Senior Backend Engineer @ Acme" -> "Senior Backend Engineer")
    const roleName = previewData.simulationName.split(" @ ")[0] || "Software Engineer";

    // Get task summary for the candidate experience card
    const taskSummary = previewData.selectedTask?.type === "custom"
      ? previewData.selectedTask.customDescription || "complete a work challenge"
      : previewData.selectedTask?.option?.summary || "complete a work challenge";

    return (
      <div className="flex h-full flex-col bg-background">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="mx-auto max-w-6xl">
            <h1 className="text-2xl font-bold">Confirm Your Simulation</h1>
            <p className="text-sm text-muted-foreground">
              Pick a challenge, then review the auto-generated details
            </p>
          </div>
        </div>

        {/* Two-column body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[340px_1fr]">

            {/* ===== LEFT COLUMN: Confirmed details ===== */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Auto-generated details
              </p>

              {/* Simulation Name */}
              {editingField === "name" ? (
                <div className="rounded-lg border bg-background p-3 space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Simulation Name</Label>
                  <Input
                    value={previewData.simulationName}
                    onChange={(e) =>
                      setPreviewData({ ...previewData, simulationName: e.target.value })
                    }
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") setEditingField(null);
                    }}
                    autoFocus
                    className="text-sm font-semibold"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="group flex w-full items-start gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary/40"
                  onClick={() => setEditingField("name")}
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Simulation Name</p>
                    <p className="truncate text-sm font-semibold">{previewData.simulationName}</p>
                  </div>
                  <Pencil className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              )}

              {/* Company */}
              {editingField === "company" ? (
                <div className="rounded-lg border bg-background p-3 space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Company</Label>
                  <Input
                    value={previewData.companyName}
                    onChange={(e) =>
                      setPreviewData({ ...previewData, companyName: e.target.value })
                    }
                    placeholder="Company name"
                    className="text-sm font-semibold"
                    autoFocus
                  />
                  <Textarea
                    value={previewData.companyDescription}
                    onChange={(e) =>
                      setPreviewData({ ...previewData, companyDescription: e.target.value })
                    }
                    placeholder="Company description"
                    rows={2}
                    className="text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={() => setEditingField(null)}>
                    Done
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="group flex w-full items-start gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary/40"
                  onClick={() => setEditingField("company")}
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="truncate text-sm font-semibold">{previewData.companyName}</p>
                    <p className="truncate text-xs text-muted-foreground">{previewData.companyDescription}</p>
                  </div>
                  <Pencil className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              )}

              {/* Tech Stack */}
              {editingField === "techStack" ? (
                <div className="rounded-lg border bg-background p-3 space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Tech Stack</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {previewData.techStack.map((tech) => (
                      <Badge key={tech} variant="outline" className="gap-1 px-2 py-0.5 text-xs">
                        {tech}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
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
                  <Input
                    placeholder="Add technology + Enter"
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
                  <Button size="sm" variant="outline" onClick={() => setEditingField(null)}>
                    Done
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="group flex w-full items-start gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary/40"
                  onClick={() => setEditingField("techStack")}
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Tech Stack</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {previewData.techStack.slice(0, 6).map((tech) => (
                        <Badge key={tech} variant="secondary" className="px-1.5 py-0 text-[10px]">
                          {tech}
                        </Badge>
                      ))}
                      {previewData.techStack.length > 6 && (
                        <span className="text-xs text-muted-foreground">
                          +{previewData.techStack.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                  <Pencil className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              )}

              {/* Team Members — opens Sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="group flex w-full items-start gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary/40"
                  >
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check className="h-3 w-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Team Members</p>
                      <p className="text-sm font-semibold">{previewData.coworkers.length} members</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <div className="flex -space-x-1.5">
                          {previewData.coworkers.map((c, i) => (
                            <CoworkerAvatar key={i} name={c.name} size="sm" className="ring-2 ring-background" />
                          ))}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {previewData.coworkers.map((c) => c.name.split(" ")[0]).join(", ")}
                        </p>
                      </div>
                    </div>
                    <Users className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Team Members</SheetTitle>
                    <SheetDescription>
                      AI-generated team that will interact with the candidate
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-4 p-4">
                    {previewData.coworkers.map((coworker, index) => (
                      <div key={index} className="space-y-3 rounded-lg border p-4">
                        <div className="flex items-center gap-3">
                          <CoworkerAvatar name={coworker.name} size="md" />
                          <div>
                            <p className="font-semibold">{coworker.name}</p>
                            <p className="text-sm text-muted-foreground">{coworker.role}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Persona Style</p>
                          <p className="mt-0.5 text-sm">{coworker.personaStyle}</p>
                        </div>
                        {coworker.personality && (
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="outline" className="text-[10px]">{coworker.personality.warmth}</Badge>
                            <Badge variant="outline" className="text-[10px]">{coworker.personality.helpfulness}</Badge>
                            <Badge variant="outline" className="text-[10px]">{coworker.personality.verbosity}</Badge>
                            <Badge variant="outline" className="text-[10px]">{coworker.personality.opinionStrength}</Badge>
                            <Badge variant="outline" className="text-[10px]">{coworker.personality.mood}</Badge>
                            <Badge variant="outline" className="text-[10px]">{coworker.personality.relationshipDynamic}</Badge>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Knowledge Items</p>
                          <ul className="mt-1 space-y-1">
                            {coworker.knowledge.map((k, kIndex) => (
                              <li key={kIndex} className="flex items-center text-sm">
                                <span className="font-medium">{k.topic}</span>
                                {k.isCritical && (
                                  <Badge className="ml-2 text-[10px] border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
                                    <AlertTriangle className="mr-0.5 h-2.5 w-2.5" />
                                    Critical
                                  </Badge>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>

              {/* Seniority Level */}
              {editingField === "seniority" ? (
                <div className="rounded-lg border bg-background p-3 space-y-3">
                  <Label className="text-xs font-medium text-muted-foreground">Seniority Level</Label>
                  <RadioGroup
                    value={parsedJDData?.seniorityLevel.value || "mid"}
                    onValueChange={(value: string) => {
                      if (parsedJDData) {
                        setParsedJDData({
                          ...parsedJDData,
                          seniorityLevel: { value: value as InferredSeniorityLevel, confidence: "high" },
                        });
                      }
                    }}
                    className="space-y-2"
                  >
                    {([
                      { value: "junior", label: "Junior", desc: "0-2 years — can do the work with guidance, learning-focused" },
                      { value: "mid", label: "Mid-Level", desc: "2-5 years — independent contributor, solid fundamentals" },
                      { value: "senior", label: "Senior", desc: "5-8 years — works independently, mentors others, owns systems" },
                      { value: "staff", label: "Staff+", desc: "8+ years — sets technical direction, cross-team impact" },
                    ] as const).map((level) => (
                      <label
                        key={level.value}
                        htmlFor={`preview-${level.value}`}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 transition-colors hover:border-primary/40 ${
                          (parsedJDData?.seniorityLevel.value || "mid") === level.value
                            ? "border-primary bg-primary/5"
                            : ""
                        }`}
                      >
                        <RadioGroupItem value={level.value} id={`preview-${level.value}`} className="mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{level.label}</p>
                          <p className="text-[11px] text-muted-foreground">{level.desc}</p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                  <Button size="sm" variant="outline" onClick={() => setEditingField(null)}>
                    Done
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="group flex w-full items-start gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary/40"
                  onClick={() => setEditingField("seniority")}
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Seniority Level</p>
                    <p className="text-sm font-semibold">
                      {({ junior: "Junior", mid: "Mid-Level", senior: "Senior", staff: "Staff+" } as const)[
                        (parsedJDData?.seniorityLevel.value || "mid") as InferredSeniorityLevel
                      ]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {({ junior: "0-2 years experience", mid: "2-5 years experience", senior: "5-8 years experience", staff: "8+ years experience" } as const)[
                        (parsedJDData?.seniorityLevel.value || "mid") as InferredSeniorityLevel
                      ]}
                    </p>
                  </div>
                  <Pencil className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              )}

              {/* Role Archetype (required) */}
              {roleFamilies.length > 0 && (
                <div className={`rounded-lg border bg-background p-3 space-y-2 ${!hasArchetype ? "border-amber-300" : ""}`}>
                  <div className="flex items-center gap-2">
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${hasArchetype ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                      {hasArchetype ? <Check className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
                    </div>
                    <p className="text-xs text-muted-foreground">Role Archetype</p>
                    {!hasArchetype && (
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-[10px]">
                        Required
                      </Badge>
                    )}
                  </div>
                  <Select
                    value={selectedArchetypeId || ""}
                    onValueChange={setSelectedArchetypeId}
                  >
                    <SelectTrigger className={`w-full text-sm h-9 ${!hasArchetype ? "border-amber-300" : ""}`}>
                      <SelectValue placeholder="Select a role archetype..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roleFamilies.map((family) => (
                        <SelectGroup key={family.id}>
                          <SelectLabel>{family.name}</SelectLabel>
                          {family.archetypes.map((arch) => (
                            <SelectItem key={arch.id} value={arch.id}>
                              {arch.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  {hasArchetype && (
                    <p className="text-[10px] text-muted-foreground">
                      Scoring expectations will vary by dimension for this role
                    </p>
                  )}
                </div>
              )}

              {/* Candidate Experience — opens Sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview candidate experience
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Candidate Experience</SheetTitle>
                    <SheetDescription>
                      This is what candidates will see when they start the simulation
                    </SheetDescription>
                  </SheetHeader>
                  <div className="p-4">
                    <CandidateExperienceSummary
                      roleName={roleName}
                      companyName={previewData.companyName}
                      coworkers={previewData.coworkers}
                      taskSummary={taskSummary}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* ===== RIGHT COLUMN: Task selection (the one required action) ===== */}
            <div className="flex flex-col">
              <Card className="flex flex-1 flex-col border-primary/30 p-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Choose a Challenge</h2>
                    {!previewData.selectedTask && (
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-[10px]">
                        Required
                      </Badge>
                    )}
                    {previewData.selectedTask && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Select the challenge candidates will work on during the assessment
                  </p>
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
                  className="mt-5 space-y-3"
                >
                  {previewData.taskOptions.map((task, index) => {
                    const isSelected = previewData.selectedTask?.option?.summary === task.summary;
                    const isExpanded = expandedTaskIndex === index;

                    return (
                      <div key={task.summary}>
                        <label
                          htmlFor={task.summary}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:border-primary/40 ${
                            isSelected ? "border-primary bg-primary/5" : ""
                          }`}
                        >
                          <RadioGroupItem value={task.summary} id={task.summary} className="mt-0.5" />
                          <div className="flex-1 space-y-1.5">
                            <p className="text-sm font-medium leading-tight">{task.summary}</p>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              {task.recruiterSummary}
                            </p>
                            <Collapsible
                              open={isExpanded}
                              onOpenChange={(open) => setExpandedTaskIndex(open ? index : null)}
                            >
                              <CollapsibleTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  {isExpanded ? "Hide candidate brief" : "Show candidate brief"}
                                  <ChevronDown
                                    className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                  />
                                </button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="mt-2 rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                                  {task.description}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        </label>
                      </div>
                    );
                  })}

                  {/* Write my own */}
                  <div>
                    <label
                      htmlFor="custom"
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:border-primary/40 ${
                        previewData.selectedTask?.type === "custom"
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                    >
                      <RadioGroupItem value="custom" id="custom" className="mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-medium">Write my own</p>
                        {previewData.selectedTask?.type === "custom" && (
                          <Textarea
                            value={customTaskInput}
                            onChange={(e) => {
                              setCustomTaskInput(e.target.value);
                              setPreviewData({
                                ...previewData,
                                selectedTask: { type: "custom", customDescription: e.target.value },
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Describe the challenge..."
                            rows={4}
                            className="text-sm"
                          />
                        )}
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </Card>
            </div>
          </div>
        </div>

        {/* Fixed bottom bar */}
        <div className="border-t bg-background px-6 py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <Button variant="ghost" onClick={() => setStep("entry")} disabled={isLoading}>
              Back
            </Button>
            <div className="flex items-center gap-4">
              {saveError && (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-destructive">{saveError}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSaveError(null);
                      handleSaveSimulation();
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    Try again
                  </Button>
                </div>
              )}
              {!isReadyToCreate && !saveError && (
                <p className="text-sm text-muted-foreground">
                  {!previewData.selectedTask && !hasArchetype
                    ? "Select a challenge and role archetype to continue"
                    : !previewData.selectedTask
                      ? "Select a challenge to continue"
                      : "Select a role archetype to continue"}
                </p>
              )}
              <Button
                size="lg"
                disabled={!isReadyToCreate || isLoading}
                onClick={handleSaveSimulation}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {saveProgress || "Creating..."}
                  </>
                ) : (
                  "Create Simulation"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
