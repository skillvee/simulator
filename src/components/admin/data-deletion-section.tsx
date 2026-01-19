"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api-client";

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

      <div className="border-2 border-border p-6">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center bg-secondary">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="mb-1 font-bold">Your Data Rights</h3>
            <p className="text-sm text-muted-foreground">
              You can request deletion of all your data at any time. This
              includes your account, assessments, recordings, and all associated
              information.
            </p>
          </div>
        </div>

        {/* Privacy Policy Link */}
        <div className="mb-6 border-b border-border pb-6">
          <Link
            href="/privacy"
            className="inline-flex items-center gap-2 border-b-2 border-secondary font-semibold text-foreground hover:text-secondary"
          >
            <span>Read our Privacy Policy</span>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="square" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-destructive/10 mb-4 border-2 border-destructive p-4 font-mono text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="mb-4 border-2 border-green-600 bg-green-50 p-4 font-mono text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Pending deletion request */}
        {hasPendingRequest && requestDate && (
          <div className="mb-6 border-2 border-yellow-500 bg-yellow-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center bg-yellow-500 text-white">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-yellow-800">
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
              <button
                onClick={handleCancelRequest}
                disabled={isCancelling}
                className="border-2 border-yellow-700 px-4 py-2 text-sm font-semibold text-yellow-800 hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCancelling ? "Cancelling..." : "Cancel Deletion Request"}
              </button>
            </div>
          </div>
        )}

        {/* Request deletion button */}
        {!hasPendingRequest && !showConfirmation && (
          <button
            onClick={() => setShowConfirmation(true)}
            className="border-2 border-destructive px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive hover:text-white"
          >
            Request Data Deletion
          </button>
        )}

        {/* Confirmation dialog */}
        {!hasPendingRequest && showConfirmation && (
          <div className="bg-destructive/5 border-2 border-destructive p-4">
            <h4 className="mb-2 font-bold text-destructive">
              Are you sure you want to delete your data?
            </h4>
            <p className="mb-4 text-sm text-muted-foreground">
              This action will delete your account, all assessments, recordings,
              and reports. This cannot be undone after the 30-day grace period.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRequestDeletion}
                disabled={isRequesting}
                className="hover:bg-destructive/90 border-2 border-destructive bg-destructive px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRequesting ? "Requesting..." : "Yes, Delete My Data"}
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                className="border-2 border-border px-4 py-2 text-sm font-semibold hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
