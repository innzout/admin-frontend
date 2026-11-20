"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/company/native-select";
import { FormField } from "@/components/common/form-field";
import { useCompany } from "@/hooks/use-settings";
import { useEmployees } from "@/hooks/use-employees";
import { useClients } from "@/hooks/use-clients";
import { useInvoice, useInvoices } from "@/hooks/use-invoices";
import { useCreateDocument } from "@/hooks/use-documents";
import { TEMPLATES, type TemplateDef, type TemplateGroup } from "@/lib/documents/templates";
import { showApiError } from "@/lib/validation";
import { cn } from "@/lib/utils";

const GROUPS: TemplateGroup[] = ["HR", "Sales", "Finance", "General"];
const LINK_LABEL = { employee: "Employee", intern: "Intern", client: "Client", invoice: "Invoice", none: "" } as const;
const PICKER_LIMIT = 100;

export function NewDocumentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateDef | null>(null);
  const [recordId, setRecordId] = useState("");
  const [touched, setTouched] = useState(false);

  const link = template?.link ?? "none";
  const { data: company } = useCompany();
  const { data: employees } = useEmployees({ limit: PICKER_LIMIT });
  const { data: clients } = useClients({ limit: PICKER_LIMIT });
  const { data: invoices } = useInvoices({ limit: PICKER_LIMIT });
  const { data: invoice, isFetching: invoiceLoading } = useInvoice(link === "invoice" && recordId ? recordId : undefined);
  const create = useCreateDocument();

  const options = (() => {
    switch (link) {
      case "employee":
        return (employees?.employees ?? []).filter((e) => e.employmentType !== "intern").map((e) => ({ id: e.id, label: `${e.fullName} — ${e.designation}` }));
      case "intern":
        return (employees?.employees ?? []).filter((e) => e.employmentType === "intern").map((e) => ({ id: e.id, label: `${e.fullName} — ${e.designation}` }));
      case "client":
        return (clients?.clients ?? []).map((c) => ({ id: c.id, label: c.companyName }));
      case "invoice":
        return (invoices?.invoices ?? [])
          .filter((i) => !template?.invoiceStatuses || template.invoiceStatuses.includes(i.status))
          .map((i) => ({ id: i.id, label: `${i.invoiceNumber} — ${i.clientName} (${i.status})` }));
      default:
        return [];
    }
  })();

  // Invoice documents need a real invoice; people/client links are optional
  // (you can start from a blank template and type the details in).
  const recordRequired = link === "invoice";
  const recordError = touched && recordRequired && !recordId ? "Select an invoice" : undefined;

  const close = (next: boolean) => {
    if (!next) {
      setTemplate(null);
      setRecordId("");
      setTouched(false);
    }
    onOpenChange(next);
  };

  const submit = () => {
    setTouched(true);
    if (!template || (recordRequired && !recordId) || create.isPending) return;
    if (link === "invoice" && (invoiceLoading || !invoice)) return;
    const employee = link === "employee" || link === "intern" ? employees?.employees.find((e) => e.id === recordId) : undefined;
    const client = link === "client" ? clients?.clients.find((c) => c.id === recordId) : clients?.clients.find((c) => c.id === invoice?.clientId);
    const { title, content } = template.build({ company, employee, client, invoice: link === "invoice" ? invoice : undefined, today: new Date().toISOString().slice(0, 10) });
    create.mutate(
      {
        type: template.type,
        title,
        content,
        employeeId: employee?.id,
        clientId: client?.id,
        invoiceId: link === "invoice" ? recordId : undefined,
      },
      {
        onSuccess: (doc) => {
          close(false);
          router.push(`/documents/${doc.id}`);
        },
        onError: (err) => showApiError(err, "Could not create the document"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template ? template.label : "New document"}</DialogTitle>
          <DialogDescription>{template ? template.description : "Pick a template. You can edit every line before issuing it."}</DialogDescription>
        </DialogHeader>

        {!template ? (
          <div className="flex flex-col gap-4">
            {GROUPS.map((group) => (
              <div key={group}>
                <p className="eyebrow mb-2">{group}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TEMPLATES.filter((t) => t.group === group).map((t) => (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setTemplate(t)}
                      className="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>
                        <span className="block text-sm font-medium">{t.label}</span>
                        <span className="block text-xs text-muted-foreground">{t.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {link !== "none" && (
              <FormField
                label={LINK_LABEL[link]}
                required={recordRequired}
                error={recordError}
                hint={recordRequired ? undefined : `Optional — fills in the ${LINK_LABEL[link].toLowerCase()}'s details for you.`}
              >
                <NativeSelect value={recordId} onChange={(e) => setRecordId(e.target.value)}>
                  <option value="">{recordRequired ? "Select…" : "None — I'll type the details"}</option>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
            )}
            {link === "invoice" && options.length === 0 && (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                No {template.invoiceStatuses?.join(" / ")} invoices yet. Create and send one from Billing first.
              </p>
            )}
            {link === "none" && <p className="text-sm text-muted-foreground">This template starts with sample text for you to edit.</p>}
          </div>
        )}

        <DialogFooter className={cn(template && "sm:justify-between")}>
          {template && (
            <Button type="button" variant="ghost" onClick={() => setTemplate(null)} disabled={create.isPending}>
              <ArrowLeft className="size-4" /> All templates
            </Button>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => close(false)} disabled={create.isPending}>
              Cancel
            </Button>
            {template && (
              <Button type="button" onClick={submit} disabled={create.isPending || (link === "invoice" && !!recordId && invoiceLoading)}>
                {create.isPending ? "Creating…" : "Create draft"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
