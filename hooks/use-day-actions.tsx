"use client";

import { toast } from "sonner";
import { useConfirm } from "@/components/common/use-confirm";
import { useCheckIn, useCheckOut } from "@/hooks/use-attendance";
import { ApiError } from "@/lib/api";

const errorMessage = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

/**
 * Check-in and check-out for the signed-in user. Check-out asks first: it
 * closes the day and cannot be undone. Render `confirmDialog` once.
 */
export function useDayActions() {
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const { confirm, confirmDialog } = useConfirm();

  const doCheckIn = () => {
    if (checkIn.isPending) return;
    checkIn.mutate(false, {
      onSuccess: () => toast.success("Checked in"),
      onError: (err) => toast.error(errorMessage(err, "Could not check in")),
    });
  };

  const requestCheckOut = () =>
    confirm({
      title: "Check out for today?",
      description: "Your working hours for today are final once you check out. You can't check in again until tomorrow.",
      confirmLabel: "Check out",
      destructive: false,
      onConfirm: () =>
        checkOut.mutate(undefined, {
          onSuccess: () => toast.success("Checked out"),
          onError: (err) => toast.error(errorMessage(err, "Could not check out")),
        }),
    });

  return { doCheckIn, requestCheckOut, checkInPending: checkIn.isPending, checkOutPending: checkOut.isPending, confirmDialog };
}
