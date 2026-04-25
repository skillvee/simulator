"use client";

import { useState } from "react";
import { CheckCircle2, Network, Check, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createLogger } from "@/lib/core";

const logger = createLogger("client:results:next-steps");

interface NextStepsSectionProps {
  assessmentId: string;
  companyName: string;
  initialIsSearchable: boolean;
  canOptIn: boolean;
}

export function NextStepsSection({
  assessmentId,
  companyName,
  initialIsSearchable,
  canOptIn,
}: NextStepsSectionProps) {
  const t = useTranslations("results.nextSteps");
  const [isSearchable, setIsSearchable] = useState(initialIsSearchable);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const handleToggle = async (next: boolean) => {
    setSaving(true);
    const prev = isSearchable;
    setIsSearchable(next);
    try {
      const res = await fetch("/api/assessment/visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, isSearchable: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } catch (err) {
      logger.error("Failed to update visibility", { err: String(err) });
      setIsSearchable(prev);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/70 shadow-sm">
      <div className="px-6">
        <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
      </div>

      <div className="px-6">
        <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="pt-0.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-primary">
              {t("sentLabel")}
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-foreground/85">
              {t("companyNotified", { company: companyName })}
            </p>
          </div>
        </div>
      </div>

      {canOptIn && (
        <div className="px-6 pb-2">
          <div
            className={cn(
              "relative overflow-hidden rounded-xl border p-4 transition-colors",
              isSearchable
                ? "border-primary/30 bg-primary/5"
                : "border-border/70 bg-background"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors",
                  isSearchable
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Network className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("marketplaceTitle")}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">
                      {t("marketplaceBody")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    {justSaved && (
                      <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary">
                        <Check className="h-3 w-3" />
                        {t("saved")}
                      </span>
                    )}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isSearchable}
                      aria-label={t("marketplaceToggleLabel")}
                      disabled={saving}
                      onClick={() => handleToggle(!isSearchable)}
                      className={cn(
                        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
                        isSearchable
                          ? "bg-primary shadow-sm shadow-primary/30"
                          : "bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200",
                          isSearchable ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  {t("marketplaceDisclosure")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
