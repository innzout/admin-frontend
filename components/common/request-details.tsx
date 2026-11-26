/**
 * The "why" and the decision for a leave or on-duty request: the employee's
 * reason, and once decided, who decided and their note. Shared by both lists
 * so approvers and employees always see the same information.
 */
export function RequestDetails({
  reasonLabel,
  reason,
  status,
  approverName,
  decisionNote,
}: {
  reasonLabel: string;
  reason?: string;
  status: string;
  approverName?: string;
  decisionNote?: string;
}) {
  const decided = status === "approved" || status === "rejected";
  return (
    <div className="mt-1 flex flex-col gap-0.5 text-sm">
      {reason && (
        <p className="break-words text-foreground/80">
          <span className="font-medium text-muted-foreground">{reasonLabel}: </span>
          {reason}
        </p>
      )}
      {decided && (approverName || decisionNote) && (
        <p className="break-words text-xs text-muted-foreground">
          {status === "approved" ? "Approved" : "Rejected"}
          {approverName ? ` by ${approverName}` : ""}
          {decisionNote ? `: ${decisionNote}` : ""}
        </p>
      )}
    </div>
  );
}
