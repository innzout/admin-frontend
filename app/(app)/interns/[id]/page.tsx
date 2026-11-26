"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { InternProfile } from "@/components/interns/intern-profile";
import { useIntern } from "@/hooks/use-interns";
import { ApiError } from "@/lib/api";

export default function InternPage() {
  const { id } = useParams<{ id: string }>();
  const { data: intern, isLoading, error, refetch } = useIntern(id);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/interns" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        All interns
      </Link>
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : error instanceof ApiError && error.status === 404 ? (
        <EmptyState title="Intern not found" hint="They may have been removed, or you don't have access to this internship." />
      ) : error || !intern ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">Couldn&apos;t load this internship.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <InternProfile intern={intern} />
      )}
    </div>
  );
}
