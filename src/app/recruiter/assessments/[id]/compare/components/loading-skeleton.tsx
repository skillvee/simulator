"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-50 border-b border-stone-200 bg-white px-6 py-4">
        <Skeleton className="mb-4 h-4 w-32" />
        <div className="flex gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      <div className="border-b border-stone-200">
        <div className="grid grid-cols-1 gap-0 divide-x divide-stone-200 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4 p-6">
              <Skeleton className="mx-auto h-24 w-24 rounded-full" />
              <Skeleton className="mx-auto h-4 w-32" />
              <Skeleton className="mx-auto h-3 w-48" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
