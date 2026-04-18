"use client";

import { User, Mail, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "./utils";

interface CandidateInfoCardProps {
  userName: string | null;
  userEmail: string | null;
  completedAt: string | null;
}

export function CandidateInfoCard({
  userName,
  userEmail,
  completedAt,
}: CandidateInfoCardProps) {
  return (
    <Card className="mb-8" data-testid="candidate-info">
      <CardContent className="p-6">
        <h2 className="mb-4 text-xs font-medium text-muted-foreground">
          CANDIDATE INFO
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold" data-testid="candidate-name">
                {userName || "Anonymous"}
              </p>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="text-xs" data-testid="candidate-email">
                  {userEmail || "No email"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                SIMULATION COMPLETED
              </p>
              <p className="text-sm" data-testid="completion-date">
                {completedAt ? formatDate(completedAt) : "In Progress"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
