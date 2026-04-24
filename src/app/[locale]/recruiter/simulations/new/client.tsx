"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
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
import { FileText, ArrowRight, Loader2, X, Sparkles, Check, Pencil, Users, Eye, AlertTriangle, GraduationCap, ChevronDown, Clock } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { CoworkerAvatar } from "@/components/chat/coworker-avatar"; // eslint-disable-line no-restricted-imports -- Component import for UI
import type { ParseJDResponse, InferredSeniorityLevel, ScenarioResource, SimulationDepth } from "@/types";
import { SIMULATION_DEPTH_CONFIG } from "@/types";
import type { CoworkerBuilderData } from "@/lib/scenarios/scenario-builder";
import type { TaskOption } from "@/lib/scenarios/task-generator";
import { CandidateExperienceSummary } from "@/components/recruiter/candidate-experience-summary"; // eslint-disable-line no-restricted-imports -- Component import allowed for UI
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { createLogger } from "@/lib/core";

const logger = createLogger("client:recruiter:new-simulation");

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
  resources: ScenarioResource[];
  resourcesFailed?: boolean;
  language: "en" | "es";
};

// Progress messages shown during simulation generation
// Will be loaded from translations inside component

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
 * Look up the archetype database ID from a slug, using the fetched role families.
 * Returns the archetype ID or null if no match.
 */
function findArchetypeIdBySlug(
  slug: string,
  families: RoleFamilyWithArchetypes[]
): string | null {
  if (!slug || families.length === 0) return null;
  for (const family of families) {
    const match = family.archetypes.find((a) => a.slug === slug);
    if (match) return match.id;
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

interface RecruiterScenarioBuilderClientProps {
  uiLocale: "en" | "es";
}

export function RecruiterScenarioBuilderClient({ uiLocale }: RecruiterScenarioBuilderClientProps) {
  const router = useRouter();
  const t = useTranslations("recruiter.simulations.new");
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
  const [simulationDepth, setSimulationDepth] = useState<SimulationDepth>("medium");

  // Generating progress message
  const [generatingMessageIndex, setGeneratingMessageIndex] = useState(0);

  // Get generating steps from translations
  const GENERATING_STEPS = [
    t("generating.steps.0"),
    t("generating.steps.1"),
    t("generating.steps.2"),
    t("generating.steps.3"),
    t("generating.steps.4"),
    t("generating.steps.5"),
    t("generating.steps.6"),
    t("generating.steps.7"),
    t("generating.steps.8")
  ];

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
        logger.error("Failed to fetch archetypes", { err });
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

  // Creation log tracking — fire-and-forget logging of every attempt
  const creationLogIdRef = useRef<string | null>(null);

  const createLog = async (data: {
    roleTitle?: string;
    companyName?: string;
    techStack?: string[];
    seniorityLevel?: string;
    archetypeId?: string;
    source: "jd_paste" | "guided";
  }) => {
    try {
      const res = await fetch("/api/recruiter/simulations/creation-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const { data: result } = await res.json();
        creationLogIdRef.current = result.logId;
      }
    } catch (err) {
      logger.error("Failed to create creation log", { err });
    }
  };

  const updateLog = async (data: {
    status: "STARTED" | "GENERATING" | "SAVING" | "COMPLETED" | "FAILED";
    scenarioId?: string;
    failedStep?: string;
    errorMessage?: string;
    errorDetails?: unknown;
    roleTitle?: string;
    companyName?: string;
    techStack?: string[];
    seniorityLevel?: string;
    archetypeId?: string;
  }) => {
    const logId = creationLogIdRef.current;
    if (!logId) return;
    try {
      await fetch("/api/recruiter/simulations/creation-log", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, ...data }),
      });
    } catch (err) {
      logger.error("Failed to update creation log", { err });
    }
  };

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
    if (parsed.roleArchetype?.value) {
      const archetypeId = findArchetypeIdBySlug(parsed.roleArchetype.value, roleFamilies);
      if (archetypeId) setSelectedArchetypeId(archetypeId);
    }
  };

  const handleContinue = async () => {
    if (!jobDescription.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    // Log the creation attempt
    await createLog({ source: "jd_paste" });

    try {
      // Step 1: Parse the job description
      const parseResponse = await fetch("/api/recruiter/simulations/parse-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: jobDescription.trim(), creationLogId: creationLogIdRef.current }),
      });

      if (!parseResponse.ok) {
        const errorData = await parseResponse.json();
        throw new Error(errorData.error || "Failed to analyze job description");
      }

      const responseJson = await parseResponse.json();
      const parsedData = responseJson.data as ParseJDResponse;
      setParsedJDData(parsedData);

      // Update log with parsed data
      await updateLog({
        status: "GENERATING",
        roleTitle: parsedData.roleName.value || undefined,
        companyName: parsedData.companyName.value || undefined,
        techStack: parsedData.techStack.value || undefined,
        seniorityLevel: parsedData.seniorityLevel.value || undefined,
      });

      // Step 2: Check if we got enough data to generate directly
      if (!hasUsableData(parsedData)) {
        // Not enough info — redirect to guided form pre-filled with what we extracted
        prefillGuidedForm(parsedData);
        setIsLoading(false);
        setError(t("pasteJD.errors.notEnoughInfo"));
        setStep("guided");
        return;
      }

      // Step 3: Auto-select archetype from AI classification
      if (!selectedArchetypeId || selectedArchetypeId === "none") {
        if (parsedData.roleArchetype?.value) {
          const archetypeId = findArchetypeIdBySlug(parsedData.roleArchetype.value, roleFamilies);
          if (archetypeId) setSelectedArchetypeId(archetypeId);
        }
      }

      // Step 4: Transition to generating step
      setStep("generating");

      // Step 5: Generate preview content
      await generatePreviewContent(parsedData);

    } catch (err) {
      logger.error("Failed to parse job description", { err });
      const errorMsg = err instanceof Error ? err.message : "Failed to analyze job description";
      await updateLog({
        status: "FAILED",
        failedStep: "parse_jd",
        errorMessage: errorMsg,
      });
      setError(errorMsg);
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

    // Log the creation attempt (or update existing one if we fell back from JD parse)
    if (!creationLogIdRef.current) {
      await createLog({
        source: "guided",
        roleTitle: roleTitle.trim(),
        companyName: companyName.trim(),
        techStack: selectedTechStack,
        seniorityLevel: seniorityLevel || undefined,
        archetypeId: selectedArchetypeId || undefined,
      });
    } else {
      await updateLog({
        status: "GENERATING",
        roleTitle: roleTitle.trim(),
        companyName: companyName.trim(),
        techStack: selectedTechStack,
        seniorityLevel: seniorityLevel || undefined,
        archetypeId: selectedArchetypeId || undefined,
      });
    }

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
        roleArchetype: {
          value: null,
          confidence: "low",
        },
        language: {
          // Default to recruiter's current uiLocale when not parsing JD
          value: uiLocale,
          confidence: "high",
        },
      };

      setParsedJDData(guidedData);

      // Use archetype from guided form selection (user already picked one via dropdown)
      // No auto-inference needed — the guided form has the archetype dropdown

      // Transition to generating step
      setStep("generating");

      // Generate preview content
      await generatePreviewContent(guidedData);

    } catch (err) {
      logger.error("Failed to process guided form", { err });
      const errorMsg = err instanceof Error ? err.message : "Failed to process your input";
      await updateLog({
        status: "FAILED",
        failedStep: "generate_tasks",
        errorMessage: errorMsg,
      });
      setError(errorMsg);
      setIsLoading(false);
    }
  };

  // Save the complete simulation
  const handleSaveSimulation = async () => {
    if (!previewData || !previewData.selectedTask || isLoading) return;

    setIsLoading(true);
    setSaveError(null);
    setSaveProgress(t("preview.saveProgress.creating"));

    // Update log to saving state
    await updateLog({
      status: "SAVING",
      archetypeId: selectedArchetypeId || undefined,
    });

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
          simulationDepth,
          resources: previewData.resources.length > 0 ? previewData.resources : undefined,
          language: previewData.language,
          creationLogId: creationLogIdRef.current ?? undefined,
          // repoUrl is intentionally omitted - it will be set by repo provisioning
        }),
      });

      if (!scenarioResponse.ok) {
        const errorData = await scenarioResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create simulation");
      }

      const { data: { scenario } } = await scenarioResponse.json();

      setSaveProgress(t("preview.saveProgress.teamMembers"));

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
          const errorData = await response.json().catch(() => ({}));
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
        logger.warn("Some coworkers failed to create", { count: failedCoworkers.length, failedCoworkers });
      }

      setSaveProgress(t("preview.saveProgress.almostDone"));

      // Step 4: Trigger avatar generation (fire-and-forget)
      fetch("/api/avatar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: scenario.id }),
      }).catch((err) => {
        logger.error("Avatar generation failed (non-blocking)", { err });
      });

      // Step 5: Trigger repo provisioning (background — errors logged)
      fetch(`/api/recruiter/simulations/${scenario.id}/provision-repo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          logger.error("Repo provisioning failed", { status: res.status, details: data.details || data.error || "Unknown error" });
        }
      }).catch((err) => {
        logger.error("Repo provisioning network error", { err });
      });

      // Step 6: Mark log as completed and redirect
      await updateLog({
        status: "COMPLETED",
        scenarioId: scenario.id,
      });

      setSaveProgress(null);
      router.push(`/recruiter/simulations/${scenario.id}/settings?success=true`);

    } catch (err) {
      logger.error("Failed to save simulation", { err });
      const errorMsg = err instanceof Error ? err.message : "Failed to save simulation. Please try again.";
      await updateLog({
        status: "FAILED",
        failedStep: "save_scenario",
        errorMessage: errorMsg,
      });
      setSaveError(errorMsg);
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
      const language = parsedData.language?.value || "en";

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
          simulationDepth,
          language,
          creationLogId: creationLogIdRef.current,
        }),
      });

      if (!taskResponse.ok) {
        const errorBody = await taskResponse.json().catch(() => ({}));
        await updateLog({
          status: "FAILED",
          failedStep: "generate_tasks",
          errorMessage: errorBody.error || "Failed to generate tasks",
          errorDetails: errorBody,
        });
        throw new Error(errorBody.error || "Failed to generate tasks");
      }

      const taskJson = await taskResponse.json();
      const taskData = taskJson.data || taskJson;
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
          companyDescription: companyDesc || domain || `${companyNameValue} is a technology company.`,
          techStack,
          taskDescription,
          keyResponsibilities: responsibilities.length > 0 ? responsibilities : ["Build and maintain features"],
          language,
          creationLogId: creationLogIdRef.current,
        }),
      });

      if (!coworkersResponse2.ok) {
        const errorBody = await coworkersResponse2.json().catch(() => ({}));
        await updateLog({
          status: "FAILED",
          failedStep: "generate_coworkers",
          errorMessage: errorBody.message || errorBody.error || "Failed to generate coworkers",
          errorDetails: errorBody,
        });
        throw new Error(errorBody.message || errorBody.error || "Failed to generate coworkers");
      }

      const coworkersJson = await coworkersResponse2.json();
      const coworkersData = coworkersJson.data || coworkersJson;
      const coworkers: CoworkerBuilderData[] = coworkersData.coworkers || [];

      // Generate resources based on task + company context.
      // If the client-side fetch fails (timeout, network) the backend may still
      // complete the step — the server-side fallback in POST /api/recruiter/simulations
      // will recover the output by creationLogId. But we surface it as a warning
      // so the user knows to verify or retry rather than shipping empty.
      let resources: ScenarioResource[] = [];
      let resourceGenerationWarning = false;
      try {
        const resourcesResponse = await fetch("/api/recruiter/simulations/generate-resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: companyNameValue,
            taskDescription,
            techStack,
            roleName,
            seniorityLevel: seniority,
            language,
            creationLogId: creationLogIdRef.current,
          }),
        });

        if (resourcesResponse.ok) {
          const resourcesJson = await resourcesResponse.json();
          const resourcesData = resourcesJson.data || resourcesJson;
          resources = resourcesData.resources || [];
        } else {
          logger.error("Resource generation failed", { status: resourcesResponse.status });
          resourceGenerationWarning = true;
        }
      } catch (resourceErr) {
        logger.error("Resource generation error", { err: String(resourceErr) });
        resourceGenerationWarning = true;
      }

      // Set up preview data
      setPreviewData({
        simulationName: `${roleName} @ ${companyNameValue}`,
        companyName: companyNameValue,
        companyDescription: companyDesc || domain || `${companyNameValue} is a technology company.`,
        techStack,
        taskOptions,
        selectedTask: null, // User must select
        coworkers,
        resources,
        resourcesFailed: resourceGenerationWarning,
        language,
      });

      // Transition to preview
      setStep("preview");
      setIsLoading(false);
    } catch (err) {
      logger.error("Failed to generate preview content", { err: err instanceof Error ? err.message : String(err) });
      const errorMsg = err instanceof Error ? err.message : "Generation failed";
      // Only update log if it wasn't already updated by the specific failure handler above
      if (creationLogIdRef.current) {
        // Check if already marked as FAILED by the specific handler
        // Only update if error is generic (not already handled)
        const isSpecificError = errorMsg.includes("Failed to generate tasks") || errorMsg.includes("Failed to generate coworkers");
        if (!isSpecificError) {
          await updateLog({
            status: "FAILED",
            failedStep: "generate_preview",
            errorMessage: errorMsg,
          });
        }
      }
      // Instead of dumping back to entry, fall back to guided form so user can adjust and retry
      if (parsedJDData) {
        prefillGuidedForm(parsedJDData);
      }
      setError(t("errors.generationFailed"));
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
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>

          {/* Primary Path: Job Description */}
          <Card className="p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{t("pasteJD.title")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("pasteJD.subtitle")}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("pasteJD.placeholder")}
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
                    {t("pasteJD.tryAgain")}
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t("pasteJD.keyboardTip")}{" "}
                  <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                    {typeof navigator !== "undefined" &&
                    navigator.platform.toLowerCase().includes("mac")
                      ? "⌘"
                      : "Ctrl"}
                    +Enter
                  </kbd>{" "}
                  {t("pasteJD.toContine")}
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
                      {t("pasteJD.analyzing")}
                    </>
                  ) : (
                    <>
                      {t("pasteJD.continueButton")}
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
              {t("guidedPath.dontHaveJD")}{" "}
              <Button
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={handleGuidedPath}
                disabled={isLoading}
              >
                {t("guidedPath.link")}
              </Button>
            </p>
          </div>

          {/* Cancel Link */}
          <div className="text-center">
            <Button variant="ghost" asChild className="text-muted-foreground">
              <Link href="/recruiter/simulations">{t("cancel")}</Link>
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
            <h1 className="text-3xl font-bold">{t("guided.title")}</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {t("guided.subtitle")}
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
                  {t("guided.roleTitle")} <span className="text-destructive">*</span>
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
                    placeholder={t("guided.roleTitlePlaceholder")}
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
                  {t("guided.companyName")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t("guided.companyNamePlaceholder")}
                  disabled={isLoading}
                  className="text-base"
                  required
                />
              </div>

              {/* Question 3: Company Description */}
              <div className="space-y-2">
                <Label htmlFor="companyDescription" className="text-base font-semibold">
                  {t("guided.companyDescription")}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{t("guided.optional")}</span>
                </Label>
                <Textarea
                  id="companyDescription"
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  placeholder={t("guided.companyDescriptionPlaceholder")}
                  disabled={isLoading}
                  className="min-h-[80px] text-base"
                  rows={3}
                />
              </div>

              {/* Question 4: Tech Stack */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {t("guided.techStack")}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{t("guided.optional")}</span>
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
                    placeholder={t("guided.addCustomTech")}
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
                    {t("guided.addButton")}
                  </Button>
                </div>
              </div>

              {/* Question 5: Seniority Level */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {t("guided.seniorityLevel")}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{t("guided.optional")}</span>
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
                      {t("guided.junior")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mid" id="mid" />
                    <Label htmlFor="mid" className="cursor-pointer font-normal">
                      {t("guided.midLevel")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="senior" id="senior" />
                    <Label htmlFor="senior" className="cursor-pointer font-normal">
                      {t("guided.senior")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="staff" id="staff" />
                    <Label htmlFor="staff" className="cursor-pointer font-normal">
                      {t("guided.staffPlus")}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Question 6: Role Archetype */}
              {roleFamilies.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    {t("guided.roleArchetype")}{" "}
                    <span className="text-sm font-normal text-muted-foreground">{t("guided.roleArchetypeDescription")}</span>
                  </Label>
                  <Select
                    value={selectedArchetypeId}
                    onValueChange={setSelectedArchetypeId}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("guided.selectArchetype")} />
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
                      {t("guided.archetypeNote")}
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
                    {t("pasteJD.tryAgain")}
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
                  {t("guided.back")}
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
                      {t("guided.generating")}
                    </>
                  ) : (
                    <>
                      {t("guided.continue")}
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
              <Link href="/recruiter/simulations">{t("cancel")}</Link>
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
            <h2 className="text-2xl font-bold">{t("generating.title")}</h2>
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
            <h1 className="text-2xl font-bold">{t("preview.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("preview.subtitle")}
            </p>
          </div>
        </div>

        {previewData.resourcesFailed && previewData.resources.length === 0 && (
          <div className="border-b bg-amber-50 px-6 py-3 dark:bg-amber-950/30">
            <div className="mx-auto flex max-w-6xl items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-amber-900 dark:text-amber-200">
                Resource generation didn&apos;t finish in time. The simulation will be created without reference materials — you can retry by going back, or proceed and add them later.
              </p>
            </div>
          </div>
        )}

        {/* Two-column body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[340px_1fr]">

            {/* ===== LEFT COLUMN: Confirmed details ===== */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("preview.autoGeneratedDetails")}
              </p>

              {/* Simulation Name */}
              {editingField === "name" ? (
                <div className="rounded-lg border bg-background p-3 space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">{t("preview.simulationName")}</Label>
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
                    <p className="text-xs text-muted-foreground">{t("preview.simulationName")}</p>
                    <p className="truncate text-sm font-semibold">{previewData.simulationName}</p>
                  </div>
                  <Pencil className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              )}

              {/* Company */}
              {editingField === "company" ? (
                <div className="rounded-lg border bg-background p-3 space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">{t("preview.company")}</Label>
                  <Input
                    value={previewData.companyName}
                    onChange={(e) =>
                      setPreviewData({ ...previewData, companyName: e.target.value })
                    }
                    placeholder={t("preview.companyNamePlaceholder")}
                    className="text-sm font-semibold"
                    autoFocus
                  />
                  <Textarea
                    value={previewData.companyDescription}
                    onChange={(e) =>
                      setPreviewData({ ...previewData, companyDescription: e.target.value })
                    }
                    placeholder={t("preview.companyDescriptionPlaceholder")}
                    rows={2}
                    className="text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={() => setEditingField(null)}>
                    {t("preview.done")}
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
                    <p className="text-xs text-muted-foreground">{t("preview.company")}</p>
                    <p className="truncate text-sm font-semibold">{previewData.companyName}</p>
                    <p className="truncate text-xs text-muted-foreground">{previewData.companyDescription}</p>
                  </div>
                  <Pencil className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              )}

              {/* Language */}
              {editingField === "language" ? (
                <div className="rounded-lg border bg-background p-3 space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    {t("language")}
                  </Label>
                  <Select
                    value={previewData.language}
                    onValueChange={(value: "en" | "es") =>
                      setPreviewData({ ...previewData, language: value })
                    }
                  >
                    <SelectTrigger className="w-full text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t("english")}</SelectItem>
                      <SelectItem value="es">{t("spanish")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => setEditingField(null)}>
                    {t("preview.done")}
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="group flex w-full items-start gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary/40"
                  onClick={() => setEditingField("language")}
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      {t("language")}
                    </p>
                    <p className="text-sm font-semibold">
                      {previewData.language === "es" ? t("spanish") : t("english")}
                    </p>
                  </div>
                  <ChevronDown className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              )}

              {/* Tech Stack */}
              {editingField === "techStack" ? (
                <div className="rounded-lg border bg-background p-3 space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">{t("preview.techStack")}</Label>
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
                    placeholder={t("preview.addTechnology")}
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
                    {t("preview.done")}
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
                    <p className="text-xs text-muted-foreground">{t("preview.techStack")}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {previewData.techStack.slice(0, 6).map((tech) => (
                        <Badge key={tech} variant="secondary" className="px-1.5 py-0 text-[10px]">
                          {tech}
                        </Badge>
                      ))}
                      {previewData.techStack.length > 6 && (
                        <span className="text-xs text-muted-foreground">
                          {t("preview.more", { count: previewData.techStack.length - 6 })}
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
                      <p className="text-xs text-muted-foreground">{t("preview.teamMembers")}</p>
                      <p className="text-sm font-semibold">{t("preview.members", { count: previewData.coworkers.length })}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <div className="flex -space-x-1.5">
                          {previewData.coworkers.map((c, i) => (
                            <CoworkerAvatar key={i} name={c.name} gender={c.gender} ethnicity={c.ethnicity} size="sm" className="ring-2 ring-background" />
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
                    <SheetTitle>{t("teamSheet.title")}</SheetTitle>
                    <SheetDescription>
                      {t("teamSheet.description")}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-4 p-4">
                    {previewData.coworkers.map((coworker, index) => (
                      <div key={index} className="space-y-3 rounded-lg border p-4">
                        <div className="flex items-center gap-3">
                          <CoworkerAvatar name={coworker.name} gender={coworker.gender} ethnicity={coworker.ethnicity} size="md" />
                          <div>
                            <p className="font-semibold">{coworker.name}</p>
                            <p className="text-sm text-muted-foreground">{coworker.role}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">{t("teamSheet.personaStyle")}</p>
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
                          <p className="text-xs font-semibold text-muted-foreground">{t("teamSheet.knowledgeItems")}</p>
                          <ul className="mt-1 space-y-1">
                            {coworker.knowledge.map((k, kIndex) => (
                              <li key={kIndex} className="flex items-center text-sm">
                                <span className="font-medium">{k.topic}</span>
                                {k.isCritical && (
                                  <Badge className="ml-2 text-[10px] border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
                                    <AlertTriangle className="mr-0.5 h-2.5 w-2.5" />
                                    {t("teamSheet.critical")}
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
                  <Label className="text-xs font-medium text-muted-foreground">{t("preview.seniorityLevel")}</Label>
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
                      { value: "junior", label: t("guided.junior"), desc: t("preview.juniorDesc") },
                      { value: "mid", label: t("guided.midLevel"), desc: t("preview.midDesc") },
                      { value: "senior", label: t("guided.senior"), desc: t("preview.seniorDesc") },
                      { value: "staff", label: t("guided.staffPlus"), desc: t("preview.staffDesc") },
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
                    {t("preview.done")}
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
                    <p className="text-xs text-muted-foreground">{t("preview.seniorityLevel")}</p>
                    <p className="text-sm font-semibold">
                      {({ junior: t("guided.junior"), mid: t("guided.midLevel"), senior: t("guided.senior"), staff: t("guided.staffPlus") } as const)[
                        (parsedJDData?.seniorityLevel.value || "mid") as InferredSeniorityLevel
                      ]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {({ junior: t("preview.juniorExp"), mid: t("preview.midExp"), senior: t("preview.seniorExp"), staff: t("preview.staffExp") } as const)[
                        (parsedJDData?.seniorityLevel.value || "mid") as InferredSeniorityLevel
                      ]}
                    </p>
                  </div>
                  <Pencil className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              )}

              {/* Simulation Depth */}
              {editingField === "depth" ? (
                <div className="rounded-lg border bg-background p-3 space-y-3">
                  <Label className="text-xs font-medium text-muted-foreground">{t("preview.simulationDepth")}</Label>
                  <RadioGroup
                    value={simulationDepth}
                    onValueChange={(value: string) => setSimulationDepth(value as SimulationDepth)}
                    className="space-y-2"
                  >
                    {(["short", "medium", "long"] as const).map((depth) => {
                      const config = SIMULATION_DEPTH_CONFIG[depth];
                      return (
                        <label
                          key={depth}
                          htmlFor={`depth-${depth}`}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 transition-colors hover:border-primary/40 ${
                            simulationDepth === depth ? "border-primary bg-primary/5" : ""
                          }`}
                        >
                          <RadioGroupItem value={depth} id={`depth-${depth}`} className="mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">{config.label}</p>
                            <p className="text-[11px] text-muted-foreground">{config.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </RadioGroup>
                  <Button size="sm" variant="outline" onClick={() => setEditingField(null)}>
                    {t("preview.done")}
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="group flex w-full items-start gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary/40"
                  onClick={() => setEditingField("depth")}
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{t("preview.simulationDepth")}</p>
                    <p className="text-sm font-semibold">{SIMULATION_DEPTH_CONFIG[simulationDepth].label}</p>
                    <p className="text-xs text-muted-foreground">
                      {SIMULATION_DEPTH_CONFIG[simulationDepth].description}
                    </p>
                  </div>
                  <Clock className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              )}

              {/* Role Archetype (required) */}
              {roleFamilies.length > 0 && (
                <div className={`rounded-lg border bg-background p-3 space-y-2 ${!hasArchetype ? "border-amber-300" : ""}`}>
                  <div className="flex items-center gap-2">
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${hasArchetype ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                      {hasArchetype ? <Check className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("preview.roleArchetype")}</p>
                    {!hasArchetype && (
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-[10px]">
                        {t("preview.required")}
                      </Badge>
                    )}
                  </div>
                  <Select
                    value={selectedArchetypeId || ""}
                    onValueChange={setSelectedArchetypeId}
                  >
                    <SelectTrigger className={`w-full text-sm h-9 ${!hasArchetype ? "border-amber-300" : ""}`}>
                      <SelectValue placeholder={t("guided.selectArchetype")} />
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
                      {t("preview.scoringNote")}
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
                    {t("preview.previewCandidateExperience")}
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>{t("candidateExperienceSheet.title")}</SheetTitle>
                    <SheetDescription>
                      {t("candidateExperienceSheet.description")}
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
                    <h2 className="text-lg font-semibold">{t("preview.chooseChallenge")}</h2>
                    {!previewData.selectedTask && (
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-[10px]">
                        {t("preview.required")}
                      </Badge>
                    )}
                    {previewData.selectedTask && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("preview.selectChallenge")}
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
                                  {isExpanded ? t("preview.hideCandidateBrief") : t("preview.showCandidateBrief")}
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
                        <p className="text-sm font-medium">{t("preview.writeMyOwn")}</p>
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
                            placeholder={t("preview.describechallenge")}
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
              {t("guided.back")}
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
                    {t("pasteJD.tryAgain")}
                  </Button>
                </div>
              )}
              {!isReadyToCreate && !saveError && (
                <p className="text-sm text-muted-foreground">
                  {!previewData.selectedTask && !hasArchetype
                    ? t("preview.selectChallengeAndArchetype")
                    : !previewData.selectedTask
                      ? t("preview.selectChallengeOnly")
                      : t("preview.selectArchetypeOnly")}
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
                    {saveProgress || t("preview.creating")}
                  </>
                ) : (
                  t("preview.createSimulation")
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
