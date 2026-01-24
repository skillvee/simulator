"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
        throw new Error(data.error || "Failed to request deletion");
      }

      setHasPendingRequest(true);
      setRequestDate(new Date(data.requestedAt));
      setSuccess(data.message);
      setShowConfirmation(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleImmediateDeletion = async () => {
    if (confirmText !== "DELETE MY ACCOUNT") {
      setError('Please type "DELETE MY ACCOUNT" to confirm');
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
        throw new Error(data.error || "Failed to delete account");
      }

      // Account deleted - redirect to sign-out
      setSuccess("Account deleted successfully. Redirecting to homepage...");
      setTimeout(() => {
        router.push("/api/auth/signout");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
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
        throw new Error(data.error || "Failed to cancel request");
      }

      setHasPendingRequest(false);
      setRequestDate(null);
      setSuccess(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <section className="mb-12">
      <h2 className="mb-6 text-2xl font-semibold text-destructive">Danger Zone</h2>

      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 font-semibold">Delete Account</h3>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data. This
                includes your profile, all assessments, recordings, uploaded CVs,
                and reports.
              </p>
            </div>
          </div>

          {/* Privacy Policy Link */}
          <div className="mb-6 border-b border-border pb-6">
            <Link
              href="/privacy"
              className="inline-flex items-center gap-2 text-primary transition-colors hover:text-primary/80"
            >
              <span className="font-medium">Read our Privacy Policy</span>
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
                    Deletion Scheduled
                  </h4>
                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                    Requested on {formatDate(requestDate)}. Your account and all
                    data will be permanently deleted within 30 days.
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
                  {isCancelling ? "Cancelling..." : "Cancel Deletion"}
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
              Delete Account
            </Button>
          )}

          {/* Confirmation dialog */}
          {!hasPendingRequest && showConfirmation && (
            <div className="rounded-lg border border-destructive bg-destructive/5 p-6">
              <h4 className="mb-4 font-semibold text-destructive">
                Choose Deletion Method
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
                    <p className="font-medium">Schedule Deletion (30 days)</p>
                    <p className="text-sm text-muted-foreground">
                      Your account will be marked for deletion. You have 30 days
                      to change your mind before data is permanently removed.
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
                    <p className="font-medium">Delete Immediately</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all data right now. This
                      action cannot be undone.
                    </p>
                  </div>
                </label>
              </div>

              {/* What will be deleted */}
              <Card className="mb-6">
                <CardContent className="p-4">
                  <p className="mb-2 font-medium">What will be deleted:</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive"></span>
                      Your profile information
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive"></span>
                      All assessments and reports
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive"></span>
                      Screen recordings and screenshots
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive"></span>
                      Uploaded CVs and resumes
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive"></span>
                      Conversation transcripts
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Immediate deletion confirmation */}
              {deletionMode === "immediate" && (
                <div className="mb-6">
                  <label className="mb-2 block text-sm font-medium">
                    Type{" "}
                    <span className="rounded bg-muted px-1 py-0.5 font-mono">
                      DELETE MY ACCOUNT
                    </span>{" "}
                    to confirm:
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
                    {isRequesting ? "Scheduling..." : "Schedule Deletion"}
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={handleImmediateDeletion}
                    disabled={isDeleting || confirmText !== "DELETE MY ACCOUNT"}
                  >
                    {isDeleting ? "Deleting..." : "Delete Now"}
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
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
