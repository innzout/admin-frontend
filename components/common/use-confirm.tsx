"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

interface ConfirmRequest {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

/**
 * Imperative "are you sure?" for one-off actions:
 *   const { confirm, confirmDialog } = useConfirm();
 *   confirm({ title, description, onConfirm: () => mutation.mutate(id) });
 * Render `confirmDialog` once anywhere in the component.
 */
export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const confirmDialog = (
    <ConfirmDialog
      open={request !== null}
      onOpenChange={(open) => !open && setRequest(null)}
      title={request?.title ?? ""}
      description={request?.description ?? ""}
      confirmLabel={request?.confirmLabel}
      destructive={request?.destructive ?? false}
      onConfirm={() => {
        request?.onConfirm();
        setRequest(null);
      }}
    />
  );

  return { confirm: setRequest, confirmDialog };
}
