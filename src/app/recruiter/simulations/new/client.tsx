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
import { FileText, ArrowRight, Loader2, X } from "lucide-react";
import type { ParseJDResponse, InferredSeniorityLevel, ConfidentField } from "@/types";

type Step = "entry" | "guided" | "generating" | "preview";

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

  const handleContinue = async () => {
    if (!jobDescription.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/recruiter/simulations/parse-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: jobDescription.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze job description");
      }

      const data = await response.json();

      // TODO: Navigate to preview step with parsed data (US-004)
      // For now, just log success
      console.log("Parsed data:", data);

      // Placeholder: would navigate to preview with data
      // router.push(`/recruiter/simulations/new/preview?data=${encodeURIComponent(JSON.stringify(data))}`);

    } catch (err) {
      console.error("Failed to parse job description:", err);
      setError(err instanceof Error ? err.message : "Failed to analyze job description");
    } finally {
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

      // TODO: Navigate to preview step with guided data (US-004)
      // For now, just log success
      console.log("Guided data:", guidedData);

      // Placeholder: would navigate to preview with data
      // router.push(`/recruiter/simulations/new/preview?data=${encodeURIComponent(JSON.stringify(guidedData))}`);

    } catch (err) {
      console.error("Failed to process guided form:", err);
      setError(err instanceof Error ? err.message : "Failed to process your input");
    } finally {
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

  // Placeholder for other steps
  return null;
}
