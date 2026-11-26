"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { InternProfile } from "@/components/interns/intern-profile";
import { useIntern } from "@/hooks/use-interns";
import { ApiError } from "@/lib/api";

/** The signed-in intern's own internship: mentor, progress, feedback, certificate. */
export default function MyInternshipPage() {
  const { data: intern, isLoading, error, refetch } = useIntern("me");

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
    return <EmptyState title="No internship details yet" hint="HR will add your internship details soon." />;
  }
  if (error || !intern) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load your internship.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }
  return <InternProfile intern={intern} self />;
}
