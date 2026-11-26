"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";

/**
 * Shown in place of a list or panel whose data failed to load, so a failure
 * never looks like "nothing here yet".
 */
export function QueryError({ what, onRetry, retrying }: { what: string; onRetry: () => void; retrying?: boolean }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border bg-card px-4 py-12 text-center">
      <p className="text-sm text-muted-foreground">Couldn&apos;t load {what}.</p>
      <Button variant="outline" size="sm" disabled={retrying} onClick={onRetry}>
        {retrying ? "Retrying…" : "Retry"}
      </Button>
    </div>
  );
}

/**
 * A detail page whose record didn't load: "doesn't exist" for a 404 (a stale
 * link, a deleted record), otherwise a retry. Without it the page would keep
 * showing its loading skeleton forever.
 */
export function RecordLoadError({
  error,
  what,
  backHref,
  backLabel,
  onRetry,
}: {
  error: unknown;
  what: string;
  backHref: string;
  backLabel: string;
  onRetry: () => void;
}) {
  const missing = error instanceof ApiError && error.status === 404;
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-24 text-center">
      <p className="font-medium">{missing ? `This ${what} doesn't exist or was removed.` : `Couldn't load this ${what}.`}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" render={<Link href={backHref} />}>
          {backLabel}
        </Button>
        {!missing && <Button onClick={onRetry}>Retry</Button>}
      </div>
    </div>
  );
}
