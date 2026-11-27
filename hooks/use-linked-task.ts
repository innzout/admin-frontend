"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * The task open in a page's side panel: one picked on the page, or one named
 * by a ?task= link (from a notification). Closing clears the link so a
 * refresh or Back doesn't reopen it. Needs a Suspense boundary above it.
 */
export function useLinkedTask() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [picked, setPicked] = useState<string | null>(null);
  const linked = params.get("task");

  return {
    openId: picked ?? linked,
    open: (id: string) => setPicked(id),
    close: () => {
      setPicked(null);
      if (linked) router.replace(pathname, { scroll: false });
    },
  };
}
