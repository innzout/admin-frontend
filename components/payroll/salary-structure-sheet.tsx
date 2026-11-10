"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateSalaryStructure, useSalaryStructures } from "@/hooks/use-payroll";
import { useEmployees } from "@/hooks/use-employees";
import { ApiError } from "@/lib/api";
import { formatInrFull } from "@/lib/format";
import { requiredSelect, amount, percent, requiredDate } from "@/lib/validation";

const schema = z.object({
  employeeId: requiredSelect("an employee"),
  basic: amount("Basic"),
  hra: amount("HRA", { allowZero: true }),
  conveyance: amount("Conveyance", { allowZero: true }),
  medical: amount("Medical", { allowZero: true }),
  special: amount("Special allowance", { allowZero: true }),
  pfPercent: percent("PF"),
  taxPercent: percent("Tax"),
  effectiveFrom: requiredDate("Effective date"),
});

type FormValues = z.infer<typeof schema>;

export function SalaryStructureSheet() {
  const [open, setOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const { data: employeePage } = useEmployees({ limit: 100 });
  const { data: history, isLoading: historyLoading } = useSalaryStructures(selectedEmployeeId || undefined);
  const createStructure = useCreateSalaryStructure();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { basic: 0, hra: 0, conveyance: 0, medical: 0, special: 0, pfPercent: 12, taxPercent: 0 },
  });

  const onSubmit = (values: FormValues) => {
    createStructure.mutate(
      {
        employeeId: values.employeeId,
        basic: values.basic,
        hra: values.hra,
        allowances: { conveyance: values.conveyance, medical: values.medical, special: values.special },
        pfPercent: values.pfPercent,
        taxPercent: values.taxPercent,
        effectiveFrom: values.effectiveFrom,
      },
      {
        onSuccess: () => {
          toast.success("Salary structure saved");
          setSelectedEmployeeId(values.employeeId);
          reset({ basic: 0, hra: 0, conveyance: 0, medical: 0, special: 0, pfPercent: 12, taxPercent: 0, employeeId: values.employeeId, effectiveFrom: "" });
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not save salary structure"),
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" />}>
        <Wallet className="size-4" />
        Salary Structures
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Salary Structures</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 px-4 pb-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label>Employee</Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={(v) => {
                if (!v) return;
                setSelectedEmployeeId(v);
                setValue("employeeId", v, { shouldValidate: true });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {(employeePage?.employees ?? [])
                  .filter((e) => e.status === "active")
                  .map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.fullName} — {e.designation}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.employeeId && <p className="text-xs text-destructive">{errors.employeeId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ss-basic">Basic</Label>
              <Input id="ss-basic" type="number" step="0.01" {...register("basic", { valueAsNumber: true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ss-hra">HRA</Label>
              <Input id="ss-hra" type="number" step="0.01" {...register("hra", { valueAsNumber: true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ss-conveyance">Conveyance</Label>
              <Input id="ss-conveyance" type="number" step="0.01" {...register("conveyance", { valueAsNumber: true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ss-medical">Medical</Label>
              <Input id="ss-medical" type="number" step="0.01" {...register("medical", { valueAsNumber: true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ss-special">Special allowance</Label>
              <Input id="ss-special" type="number" step="0.01" {...register("special", { valueAsNumber: true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ss-effective">Effective from</Label>
              <Input id="ss-effective" type="date" {...register("effectiveFrom")} />
              {errors.effectiveFrom && <p className="text-xs text-destructive">{errors.effectiveFrom.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ss-pf">PF %</Label>
              <Input id="ss-pf" type="number" step="0.01" {...register("pfPercent", { valueAsNumber: true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ss-tax">Tax %</Label>
              <Input id="ss-tax" type="number" step="0.01" {...register("taxPercent", { valueAsNumber: true })} />
            </div>
          </div>

          <Button type="submit" disabled={createStructure.isPending}>
            {createStructure.isPending ? "Saving…" : "Save Structure"}
          </Button>
        </form>

        <div className="flex-1 space-y-2 border-t p-4">
          <p className="text-sm font-medium">History</p>
          {!selectedEmployeeId && <p className="text-sm text-muted-foreground">Select an employee to see their salary history.</p>}
          {selectedEmployeeId && historyLoading && <Skeleton className="h-16 w-full" />}
          {selectedEmployeeId && !historyLoading && (history ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No salary structure recorded yet.</p>
          )}
          {(history ?? []).map((s) => (
            <div key={s.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium">Effective {s.effectiveFrom.slice(0, 10)}</p>
                <p className="font-medium">{formatInrFull(s.basic + s.hra + s.allowances.conveyance + s.allowances.medical + s.allowances.special)}/mo</p>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Basic {formatInrFull(s.basic)} · HRA {formatInrFull(s.hra)} · PF {s.pfPercent}% · Tax {s.taxPercent}%
              </p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
