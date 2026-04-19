"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Clock, ChevronRight } from "lucide-react";

interface AccountDeletionSectionProps {
  deletionRequestedAt: Date | null;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

type DeletionMode = "schedule" | "immediate";

export function AccountDeletionSection({
  deletionRequestedAt,
}: AccountDeletionSectionProps) {
  const t = useTranslations("settings.accountDeletion");
  const router = useRouter();
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] =
    useState(!!deletionRequestedAt);
  const [requestDate, setRequestDate] = useState<Date | null>(
    deletionRequestedAt
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [deletionMode, setDeletionMode] = useState<DeletionMode>("schedule");
  const [confirmText, setConfirmText] = useState("");

  const handleScheduleDeletion = async () => {
    setIsRequesting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/user/delete-request", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("errors.requestFailed"));
      }

      setHasPendingRequest(true);
      setRequestDate(new Date(data.data.requestedAt));
      setSuccess(data.data.message);
      setShowConfirmation(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setIsRequesting(false);
    }
  };

  const handleImmediateDeletion = async () => {
    if (confirmText !== "DELETE MY ACCOUNT") {
      setError(t("modal.confirm.errorMustType"));
      return;
    }

    setIsDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/user/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE MY ACCOUNT" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("errors.deleteFailed"));
      }

      // Account deleted - redirect to sign-out
      setSuccess(t("successDeleted"));
      setTimeout(() => {
        router.push("/api/auth/signout");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelRequest = async () => {
    setIsCancelling(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/user/delete-request", {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("errors.cancelFailed"));
      }

      setHasPendingRequest(false);
      setRequestDate(null);
      setSuccess(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <section className="mb-12">
      <h2 className="mb-6 text-2xl font-semibold text-destructive">{t("dangerZone")}</h2>

      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 font-semibold">{t("deleteAccount.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("deleteAccount.description")}
              </p>
            </div>
          </div>

          {/* Privacy Policy Link */}
          <div className="mb-6 border-b border-border pb-6">
            <Link
              href="/privacy"
              className="inline-flex items-center gap-2 text-primary transition-colors hover:text-primary/80"
            >
              <span className="font-medium">{t("privacyPolicyLink")}</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="mb-4 rounded-lg bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400">
              {success}
            </div>
          )}

          {/* Pending deletion request */}
          {hasPendingRequest && requestDate && (
            <div className="mb-6 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-yellow-500/20">
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                    {t("pending.title")}
                  </h4>
                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                    {t("pending.description", { date: formatDate(requestDate) })}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelRequest}
                  disabled={isCancelling}
                  className="border-yellow-600 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-400 dark:text-yellow-200 dark:hover:bg-yellow-900"
                >
                  {isCancelling ? t("pending.cancelling") : t("pending.cancel")}
                </Button>
              </div>
            </div>
          )}

          {/* Delete options */}
          {!hasPendingRequest && !showConfirmation && (
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(true)}
              className="border-destructive text-destructive hover:bg-destructive hover:text-white"
            >
              {t("actions.delete")}
            </Button>
          )}

          {/* Confirmation dialog */}
          {!hasPendingRequest && showConfirmation && (
            <div className="rounded-lg border border-destructive bg-destructive/5 p-6">
              <h4 className="mb-4 font-semibold text-destructive">
                {t("modal.title")}
              </h4>

              {/* Deletion mode selector */}
              <div className="mb-6 space-y-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                  <input
                    type="radio"
                    name="deletionMode"
                    checked={deletionMode === "schedule"}
                    onChange={() => setDeletionMode("schedule")}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">{t("modal.method.schedule.title")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("modal.method.schedule.description")}
                    </p>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                  <input
                    type="radio"
                    name="deletionMode"
                    checked={deletionMode === "immediate"}
                    onChange={() => setDeletionMode("immediate")}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">{t("modal.method.immediate.title")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("modal.method.immediate.description")}
                    </p>
                  </div>
                </label>
              </div>

              {/* What will be deleted */}
              <Card className="mb-6">
                <CardContent className="p-4">
                  <p className="mb-2 font-medium">{t("whatWillBeDeleted.title")}</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive"></span>
                      {t("whatWillBeDeleted.items.profile")}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive"></span>
                      {t("whatWillBeDeleted.items.assessments")}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive"></span>
                      {t("whatWillBeDeleted.items.recordings")}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive"></span>
                      {t("whatWillBeDeleted.items.cvs")}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive"></span>
                      {t("whatWillBeDeleted.items.transcripts")}
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Immediate deletion confirmation */}
              {deletionMode === "immediate" && (
                <div className="mb-6">
                  <label className="mb-2 block text-sm font-medium">
                    {t("modal.confirm.labelPrefix")}{" "}
                    <span className="rounded bg-muted px-1 py-0.5 font-mono">
                      DELETE MY ACCOUNT
                    </span>{" "}
                    {t("modal.confirm.labelSuffix")}
                  </label>
                  <Input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE MY ACCOUNT"
                    className="font-mono"
                  />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                {deletionMode === "schedule" ? (
                  <Button
                    variant="destructive"
                    onClick={handleScheduleDeletion}
                    disabled={isRequesting}
                  >
                    {isRequesting ? t("modal.buttons.scheduling") : t("modal.buttons.schedule")}
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={handleImmediateDeletion}
                    disabled={isDeleting || confirmText !== "DELETE MY ACCOUNT"}
                  >
                    {isDeleting ? t("modal.buttons.deleting") : t("modal.buttons.deleteNow")}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmation(false);
                    setConfirmText("");
                    setDeletionMode("schedule");
                  }}
                >
                  {t("actions.cancel")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
