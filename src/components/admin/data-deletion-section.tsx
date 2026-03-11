"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api";
import {
  Card,
  CardContent,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui";

interface DataDeletionSectionProps {
  deletionRequestedAt: Date | null;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function DataDeletionSection({
  deletionRequestedAt,
}: DataDeletionSectionProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] =
    useState(!!deletionRequestedAt);
  const [requestDate, setRequestDate] = useState<Date | null>(
    deletionRequestedAt
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleRequestDeletion = async () => {
    setIsRequesting(true);
    setError("");
    setSuccess("");

    try {
      const data = await api<{ requestedAt: string; message: string }>(
        "/api/user/delete-request",
        { method: "POST" }
      );

      setHasPendingRequest(true);
      setRequestDate(new Date(data.requestedAt));
      setSuccess(data.message);
      setShowConfirmation(false);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("An error occurred");
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCancelRequest = async () => {
    setIsCancelling(true);
    setError("");
    setSuccess("");

    try {
      const data = await api<{ message: string }>("/api/user/delete-request", {
        method: "DELETE",
      });

      setHasPendingRequest(false);
      setRequestDate(null);
      setSuccess(data.message);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("An error occurred");
      }
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <section className="mb-12">
      <h2 className="mb-6 text-2xl font-bold">Data & Privacy</h2>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="mb-1 font-semibold">Your Data Rights</h3>
              <p className="text-sm text-muted-foreground">
                You can request deletion of all your data at any time. This
                includes your account, assessments, recordings, and all
                associated information.
              </p>
            </div>
          </div>

          {/* Privacy Policy Link */}
          <div className="mb-6 border-b border-border pb-6">
            <Link
              href="/privacy"
              className="inline-flex items-center gap-2 font-medium text-primary transition-colors hover:text-primary/80"
            >
              <span>Read our Privacy Policy</span>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
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
            <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-700">
              {success}
            </div>
          )}

          {/* Pending deletion request */}
          {hasPendingRequest && requestDate && (
            <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-yellow-500 text-white">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-800">
                    Deletion Request Pending
                  </h4>
                  <p className="mt-1 text-sm text-yellow-700">
                    Requested on {formatDate(requestDate)}. Your data will be
                    deleted within 30 days. You can cancel this request if you
                    change your mind.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelRequest}
                  disabled={isCancelling}
                  className="border-yellow-600 text-yellow-800 hover:bg-yellow-100"
                >
                  {isCancelling ? "Cancelling..." : "Cancel Deletion Request"}
                </Button>
              </div>
            </div>
          )}

          {/* Request deletion button */}
          {!hasPendingRequest && (
            <Button
              variant="destructive"
              onClick={() => setShowConfirmation(true)}
            >
              Request Data Deletion
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Are you sure you want to delete your data?
            </DialogTitle>
            <DialogDescription>
              This action will delete your account, all assessments, recordings,
              and reports. This cannot be undone after the 30-day grace period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRequestDeletion}
              disabled={isRequesting}
            >
              {isRequesting ? "Requesting..." : "Yes, Delete My Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
