"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createLogger } from "@/lib/core";

const logger = createLogger("client:results:experience-feedback");

type Rating = "LIKE" | "DISLIKE";

interface ExperienceFeedbackProps {
  assessmentId: string;
  initialRating: Rating | null;
  initialComment: string;
}

export function ExperienceFeedback({
  assessmentId,
  initialRating,
  initialComment,
}: ExperienceFeedbackProps) {
  const t = useTranslations("results.experienceFeedback");

  const [rating, setRating] = useState<Rating | null>(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async (nextRating: Rating, nextComment: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/assessment/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId,
          rating: nextRating,
          comment: nextComment.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSavedAt(Date.now());
    } catch (err) {
      logger.error("Failed to save feedback", { err: String(err) });
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleRate = (next: Rating) => {
    setRating(next);
    void save(next, comment);
  };

  const handleCommentBlur = () => {
    if (!rating) return;
    if (comment === initialComment) return;
    void save(rating, comment);
  };

  const showSaved = savedAt !== null && Date.now() - savedAt < 3000;

  return (
    <Card className="border-border/70 shadow-sm">
      <div className="px-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("subtitle")}</p>
          </div>
          {showSaved && (
            <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary animate-fade-in">
              <Check className="h-3 w-3" />
              {t("saved")}
            </span>
          )}
          {error && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-destructive">
              {error}
            </span>
          )}
        </div>
      </div>

      <div className="px-6">
        <div className="flex gap-2">
          <RatingButton
            icon={<ThumbsUp className="h-4 w-4" />}
            label={t("like")}
            selected={rating === "LIKE"}
            variant="positive"
            disabled={saving}
            onClick={() => handleRate("LIKE")}
          />
          <RatingButton
            icon={<ThumbsDown className="h-4 w-4" />}
            label={t("dislike")}
            selected={rating === "DISLIKE"}
            variant="neutral"
            disabled={saving}
            onClick={() => handleRate("DISLIKE")}
          />
        </div>

        {rating && (
          <div className="mt-4 animate-slide-up">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onBlur={handleCommentBlur}
              placeholder={t("commentPlaceholder")}
              maxLength={2000}
              rows={3}
              className="resize-none text-sm"
            />
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("commentHelp")}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

function RatingButton({
  icon,
  label,
  selected,
  variant,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  variant: "positive" | "neutral";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        selected && variant === "positive"
          ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
          : selected && variant === "neutral"
          ? "border-foreground/40 bg-foreground/5 text-foreground"
          : "border-border bg-background text-foreground/70 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:text-foreground hover:shadow-sm"
      )}
    >
      <span
        className={cn(
          "transition-transform",
          !selected && "group-hover:scale-110"
        )}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}
