"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  User,
  Shield,
  Calendar,
  FileText,
  RotateCcw,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ImageMinus,
} from "lucide-react";
import type { UserRole } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { LucideIcon } from "lucide-react";

// Serialized types from server (dates as strings)
interface SerializedUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  assessmentCount: number;
}

interface Stats {
  total: number;
  admins: number;
  withAssessments: number;
  totalAssessments: number;
}

interface UsersClientProps {
  users: SerializedUser[];
  stats: Stats;
}

type DateRange = "24h" | "7d" | "30d" | "all";

const ROLE_OPTIONS: UserRole[] = ["USER", "ADMIN"];

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

export function UsersClient({ users, stats }: UsersClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [resetTarget, setResetTarget] = useState<SerializedUser | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [deleteImageTarget, setDeleteImageTarget] =
    useState<SerializedUser | null>(null);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: Toast["type"]) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const handleReset = async () => {
    if (!resetTarget) return;
    setIsResetting(true);
    try {
      const response = await fetch("/api/admin/user/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resetTarget.id }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to reset user");
      }
      addToast(data.message, "success");
      setResetTarget(null);
      router.refresh();
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : "Failed to reset user",
        "error"
      );
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!deleteImageTarget) return;
    setIsDeletingImage(true);
    try {
      const response = await fetch("/api/admin/user/delete-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteImageTarget.id }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete image");
      }
      addToast(data.message, "success");
      setDeleteImageTarget(null);
      router.refresh();
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : "Failed to delete image",
        "error"
      );
    } finally {
      setIsDeletingImage(false);
    }
  };

  // Filter users based on criteria
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter (name or email)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = user.name?.toLowerCase().includes(query);
        const matchesEmail = user.email?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail) {
          return false;
        }
      }

      // Role filter
      if (roleFilter !== "all" && user.role !== roleFilter) {
        return false;
      }

      // Date range filter (member since)
      if (dateRange !== "all") {
        const createdAt = new Date(user.createdAt);
        const now = new Date();
        const hoursDiff =
          (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

        if (dateRange === "24h" && hoursDiff > 24) return false;
        if (dateRange === "7d" && hoursDiff > 24 * 7) return false;
        if (dateRange === "30d" && hoursDiff > 24 * 30) return false;
      }

      return true;
    });
  }, [users, searchQuery, roleFilter, dateRange]);

  return (
    <div className="px-8 py-10">
      <h1 className="mb-8 text-3xl font-semibold">Users</h1>

      {/* Aggregate Stats */}
      <div
        className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4"
        data-testid="stats-grid"
      >
        <StatCard label="TOTAL USERS" value={stats.total} icon={User} />
        <StatCard label="ADMINS" value={stats.admins} icon={Shield} highlight />
        <StatCard
          label="WITH ASSESSMENTS"
          value={stats.withAssessments}
          icon={FileText}
        />
        <StatCard
          label="TOTAL ASSESSMENTS"
          value={stats.totalAssessments}
          icon={Calendar}
        />
      </div>

      {/* Filters */}
      <div
        className="mb-6 flex flex-wrap items-center gap-4"
        data-testid="filters"
      >
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
            data-testid="search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          data-testid="role-filter"
        >
          <option value="all">All Roles</option>
          {ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>

        {/* Date Range Filter */}
        <div className="flex gap-1" data-testid="date-range-filter">
          {DATE_RANGE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              onClick={() => setDateRange(option.value)}
              variant={dateRange === option.value ? "default" : "outline"}
              size="sm"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-muted-foreground">
        Showing {filteredUsers.length} of {users.length} users
      </p>

      {/* Users Table */}
      <Card data-testid="users-table">
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No users found matching your criteria
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground">
                    USER
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground">
                    ROLE
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground">
                    MEMBER SINCE
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground">
                    ASSESSMENTS
                  </th>
                  <th className="p-4 text-right text-xs font-medium text-muted-foreground">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onReset={() => setResetTarget(user)}
                    onDeleteImage={() => setDeleteImageTarget(user)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      {resetTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => !isResetting && setResetTarget(null)}
        >
          <Card
            className="mx-4 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-6">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h2 className="mb-2 text-xl font-semibold">
                    Reset Candidate Data
                  </h2>
                  <p className="text-muted-foreground">
                    This will delete{" "}
                    <strong>
                      all {resetTarget.assessmentCount} assessment(s)
                    </strong>{" "}
                    for{" "}
                    <strong>
                      {resetTarget.name || resetTarget.email}
                    </strong>
                    , including conversations, recordings, scores, and reports.
                  </p>
                </div>
              </div>

              <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm text-destructive">
                  <strong>Warning:</strong> This action cannot be undone. The
                  user account will be preserved, but they will start fresh from
                  the introduction screen on their next assessment.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setResetTarget(null)}
                  disabled={isResetting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReset}
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset All Data
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Image Confirmation Dialog */}
      {deleteImageTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => !isDeletingImage && setDeleteImageTarget(null)}
        >
          <Card
            className="mx-4 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-6">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <ImageMinus className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h2 className="mb-2 text-xl font-semibold">
                    Delete Profile Image
                  </h2>
                  <p className="text-muted-foreground">
                    This will delete the profile image for{" "}
                    <strong>
                      {deleteImageTarget.name || deleteImageTarget.email}
                    </strong>
                    . The image will be removed from storage and the user will
                    see a default avatar.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDeleteImageTarget(null)}
                  disabled={isDeletingImage}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteImage}
                  disabled={isDeletingImage}
                >
                  {isDeletingImage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <ImageMinus className="mr-2 h-4 w-4" />
                      Delete Image
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex max-w-md flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg ${
                toast.type === "success"
                  ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
                  : "border-destructive/30 bg-destructive/5 text-destructive"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <p className="text-sm">{toast.message}</p>
              <button
                onClick={() =>
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id))
                }
                className="ml-2 flex-shrink-0 opacity-60 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
        </div>
        <p className={`text-2xl font-semibold ${highlight ? "text-primary" : ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function UserRow({
  user,
  onReset,
  onDeleteImage,
}: {
  user: SerializedUser;
  onReset: () => void;
  onDeleteImage: () => void;
}) {
  return (
    <tr
      className="border-b border-border transition-colors hover:bg-muted/50"
      data-testid={`user-row-${user.id}`}
    >
      <td className="p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            {user.image && (
              <AvatarImage src={user.image} alt={user.name || "User"} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{user.name || "Anonymous"}</p>
            <p className="text-xs text-muted-foreground">
              {user.email || "No email"}
            </p>
          </div>
        </div>
      </td>
      <td className="p-4">
        <Badge
          variant={user.role === "ADMIN" ? "default" : "secondary"}
          className={
            user.role === "ADMIN"
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : ""
          }
        >
          {user.role}
        </Badge>
      </td>
      <td className="p-4 text-sm text-muted-foreground">
        {formatDate(user.createdAt)}
      </td>
      <td className="p-4">
        <span
          className={`text-sm ${
            user.assessmentCount > 0 ? "font-semibold" : "text-muted-foreground"
          }`}
        >
          {user.assessmentCount}
        </span>
      </td>
      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-1">
          {user.image && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeleteImage}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <ImageMinus className="mr-1.5 h-3.5 w-3.5" />
              Delete Image
            </Button>
          )}
          {user.assessmentCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  if (email) {
    const localPart = email.split("@")[0];
    return localPart.substring(0, 2).toUpperCase();
  }
  return "??";
}
