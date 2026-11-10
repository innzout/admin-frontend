"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRightLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/company/native-select";
import { FormField } from "@/components/common/form-field";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useAddLeadActivity, useConvertLead, useLeadActivities, useSaveLead } from "@/hooks/use-company";
import { useEmployees } from "@/hooks/use-employees";
import { timeAgo } from "@/lib/format";
import { LEAD_STAGES, leadStageLabel, type Lead } from "@/lib/company-types";
import { amount, optionalDate, optionalEmail, optionalPhone, optionalText, requiredText, showApiError, LIMITS } from "@/lib/validation";

const SOURCES: Record<string, string> = {
  website: "Website",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  referral: "Referral",
  cold_call: "Cold call",
  whatsapp: "WhatsApp",
  event: "Event",
  other: "Other",
};
const SERVICES = ["Web application", "Mobile app", "SaaS product", "AI / automation", "E-commerce", "UI/UX design", "Marketing", "Other"];
const NOTE_MAX = 2000;

const schema = z
  .object({
    name: requiredText("Contact name"),
    company: optionalText(),
    email: optionalEmail,
    phone: optionalPhone,
    source: z.string(),
    serviceInterest: z.string(),
    estimatedValue: amount("Estimated value", { allowZero: true }),
    stage: z.enum(LEAD_STAGES),
    ownerId: z.string(),
    nextFollowUp: optionalDate,
    lostReason: optionalText(500),
    notes: optionalText(LIMITS.text),
  })
  .superRefine((v, ctx) => {
    if (v.stage === "lost" && !v.lostReason) ctx.addIssue({ code: "custom", path: ["lostReason"], message: "Say why the lead was lost" });
    if (!v.email && !v.phone) ctx.addIssue({ code: "custom", path: ["phone"], message: "Add a phone number or an email so you can follow up" });
  });
type FormValues = z.infer<typeof schema>;

const EMPTY: z.input<typeof schema> = {
  name: "", company: "", email: "", phone: "", source: "website", serviceInterest: "", estimatedValue: 0,
  stage: "new", ownerId: "", nextFollowUp: "", lostReason: "", notes: "",
};

function toForm(lead: Lead | null): z.input<typeof schema> {
  if (!lead) return EMPTY;
  return {
    name: lead.name,
    company: lead.company ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    source: lead.source ?? "",
    serviceInterest: lead.serviceInterest ?? "",
    estimatedValue: lead.estimatedValue,
    stage: lead.stage,
    ownerId: lead.ownerId ?? "",
    nextFollowUp: lead.nextFollowUp?.slice(0, 10) ?? "",
    lostReason: lead.lostReason ?? "",
    notes: lead.notes ?? "",
  };
}

export function LeadDialog({ lead, open, onOpenChange }: { lead: Lead | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [note, setNote] = useState("");
  const [confirmConvert, setConfirmConvert] = useState(false);
  const save = useSaveLead();
  const convert = useConvertLead();
  const { data: employees } = useEmployees({ status: "active", limit: 100 });
  const { data: activities } = useLeadActivities(lead?.id);
  const addActivity = useAddLeadActivity(lead?.id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isDirty },
  } = useForm<z.input<typeof schema>, unknown, FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    reset(toForm(lead));
  }, [open, lead, reset]);

  // Clear the unsent activity note on close, so reopening starts fresh.
  const handleOpenChange = (next: boolean) => {
    if (!next) setNote("");
    onOpenChange(next);
  };

  const stage = useWatch({ control, name: "stage" });

  const onSubmit = (values: FormValues) => {
    save.mutate(
      { id: lead?.id, input: values },
      {
        onSuccess: () => {
          toast.success(lead ? "Lead updated" : "Lead added");
          handleOpenChange(false);
        },
        onError: (e) => showApiError(e, "Could not save lead", setError),
      },
    );
  };

  const doConvert = () => {
    if (!lead) return;
    convert.mutate(lead.id, {
      onSuccess: () => {
        toast.success(`${lead.company || lead.name} is now a client`);
        setConfirmConvert(false);
        handleOpenChange(false);
      },
      onError: (e) => showApiError(e, "Could not convert lead"),
    });
  };

  const submitNote = () => {
    const text = note.trim();
    if (!text || addActivity.isPending) return;
    addActivity.mutate(text, { onSuccess: () => setNote(""), onError: (e) => showApiError(e, "Could not add note") });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lead ? lead.name : "New lead"}</DialogTitle>
        </DialogHeader>
        <form id="lead-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
          <FormField label="Contact name" required error={errors.name?.message}>
            <Input autoComplete="name" maxLength={150} {...register("name")} />
          </FormField>
          <FormField label="Company" error={errors.company?.message}>
            <Input autoComplete="organization" maxLength={200} {...register("company")} />
          </FormField>
          <FormField label="Email" error={errors.email?.message}>
            <Input type="email" autoComplete="email" maxLength={254} {...register("email")} />
          </FormField>
          <FormField label="Phone" error={errors.phone?.message} hint="10-digit mobile, +91 optional">
            <Input type="tel" inputMode="tel" autoComplete="tel" maxLength={16} {...register("phone")} />
          </FormField>
          <FormField label="Source" error={errors.source?.message}>
            <NativeSelect {...register("source")}>
              <option value="">Not set</option>
              {Object.entries(SOURCES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Service interest" error={errors.serviceInterest?.message}>
            <NativeSelect {...register("serviceInterest")}>
              <option value="">Not set</option>
              {SERVICES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Estimated value (₹)" error={errors.estimatedValue?.message}>
            <Input type="number" inputMode="decimal" min={0} step="0.01" {...register("estimatedValue", { valueAsNumber: true })} />
          </FormField>
          <FormField label="Stage" required error={errors.stage?.message}>
            <NativeSelect {...register("stage")}>
              {LEAD_STAGES.map((s) => (
                <option key={s} value={s}>
                  {leadStageLabel[s]}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Owner" error={errors.ownerId?.message}>
            <NativeSelect {...register("ownerId")}>
              <option value="">Unassigned</option>
              {employees?.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Next follow-up" error={errors.nextFollowUp?.message}>
            <Input type="date" {...register("nextFollowUp")} />
          </FormField>
          {stage === "lost" && (
            <FormField label="Lost reason" required className="sm:col-span-2" error={errors.lostReason?.message}>
              <Input maxLength={500} {...register("lostReason")} />
            </FormField>
          )}
          <FormField label="Requirements / notes" className="sm:col-span-2" error={errors.notes?.message}>
            <Textarea rows={3} maxLength={LIMITS.text} {...register("notes")} />
          </FormField>
        </form>

        {lead && (
          <div className="flex flex-col gap-3 border-t pt-4">
            <p className="text-sm font-semibold">Activity</p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submitNote();
              }}
            >
              <Input
                aria-label="Activity note"
                placeholder="Log a call, meeting or note…"
                maxLength={NOTE_MAX}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button type="submit" size="icon" aria-label="Add note" disabled={!note.trim() || addActivity.isPending}>
                <Send className="size-4" />
              </Button>
            </form>
            <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto">
              {activities?.map((a) => (
                <li key={a.id} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <p className="break-words">{a.note}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.authorName ?? "System"} · {timeAgo(a.createdAt)}
                  </p>
                </li>
              ))}
              {activities?.length === 0 && <li className="text-sm text-muted-foreground">No activity yet.</li>}
            </ul>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {lead && !lead.clientId ? (
            <Button type="button" variant="outline" onClick={() => setConfirmConvert(true)} disabled={convert.isPending || save.isPending}>
              <ArrowRightLeft className="size-4" />
              Convert to client
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">{lead?.clientId ? "Converted to client ✓" : ""}</span>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="lead-form" disabled={save.isPending || (!!lead && !isDirty)}>
              {save.isPending ? "Saving…" : lead ? "Save changes" : "Add lead"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <ConfirmDialog
        open={confirmConvert}
        onOpenChange={setConfirmConvert}
        title="Convert this lead to a client?"
        description={`${lead?.company || lead?.name} will be added to Clients and the lead marked as won. This can't be undone.`}
        confirmLabel="Convert"
        onConfirm={doConvert}
        destructive={false}
        isPending={convert.isPending}
      />
    </Dialog>
  );
}
