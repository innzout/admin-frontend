"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployees, useUpdateEmployee } from "@/hooks/use-employees";
import { useDepartments } from "@/hooks/use-departments";
import { ApiError } from "@/lib/api";
import type { Employee } from "@/lib/types";
import {
  requiredText,
  optionalPhone,
  optionalDate,
  optionalText,
} from "@/lib/validation";
import { phoneInput } from "@/lib/input-filters";
import { useConfirm } from "@/components/common/use-confirm";

const NO_MANAGER = "none";

const schema = z.object({
  fullName: requiredText("Full name"),
  phone: optionalPhone.optional(),
  departmentId: z.string().optional(),
  designation: requiredText("Designation", 100),
  employmentType: z.enum(["full_time", "part_time", "contract", "intern"]),
  reportingManagerId: z.string().optional(),
  dob: optionalDate
    .optional()
    .refine(
      (v) => !v || v <= new Date().toISOString().slice(0, 10),
      "Date of birth can't be in the future",
    ),
  address: optionalText(500).optional(),
  status: z.enum(["active", "on_notice", "exited"]),
});

type FormValues = z.infer<typeof schema>;

export function EditEmployeeDialog({
  employee,
  open,
  onOpenChange,
}: {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: departments } = useDepartments();
  const { data: candidateManagers } = useEmployees({ limit: 100 });
  const updateEmployee = useUpdateEmployee();
  const { confirm, confirmDialog } = useConfirm();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Re-seed the form every time a different employee is opened for editing.
  useEffect(() => {
    if (!employee) return;
    reset({
      fullName: employee.fullName,
      phone: employee.phone ?? "",
      departmentId: employee.departmentId,
      designation: employee.designation,
      employmentType: employee.employmentType,
      reportingManagerId: employee.reportingManagerId ?? NO_MANAGER,
      dob: employee.dob?.slice(0, 10) ?? "",
      address: employee.address ?? "",
      status: employee.status,
    });
  }, [employee, reset]);

  if (!employee) return null;

  const managerOptions = (candidateManagers?.employees ?? []).filter(
    (m) => m.id !== employee.id && m.status !== "exited",
  );

  // Leaving or rejoining changes whether they can sign in, so ask first.
  const onSubmit = (values: FormValues) => {
    const exiting = values.status === "exited" && employee.status !== "exited";
    const rejoining =
      values.status !== "exited" && employee.status === "exited";
    if (!exiting && !rejoining) return save(values);
    confirm({
      title: exiting
        ? `Mark ${employee.fullName} as exited?`
        : `Restore ${employee.fullName}?`,
      description: exiting
        ? "Their portal login is revoked straight away and they are signed out of every device."
        : "Their portal login, if they had one, is turned back on with the same username and password.",
      confirmLabel: exiting ? "Mark exited" : "Restore",
      destructive: exiting,
      onConfirm: () => save(values),
    });
  };

  const save = (values: FormValues) => {
    updateEmployee.mutate(
      {
        id: employee.id,
        input: {
          fullName: values.fullName,
          // Optional fields are always sent: "" tells the API to clear them
          // (an omitted field would be left unchanged).
          phone: values.phone ?? "",
          departmentId: values.departmentId || undefined,
          designation: values.designation,
          employmentType: values.employmentType,
          reportingManagerId:
            !values.reportingManagerId || values.reportingManagerId === NO_MANAGER
              ? ""
              : values.reportingManagerId,
          dob: values.dob ?? "",
          address: values.address ?? "",
          status: values.status,
        },
      },
      {
        onSuccess: () => {
          toast.success(`${values.fullName} updated`);
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Could not update employee",
          ),
      },
    );
  };

  return (
    <>
      {confirmDialog}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              {employee.employeeCode} · {employee.email}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="edit-fullName">Full name</Label>
                <Input
                  id="edit-fullName"
                  maxLength={150}
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">
                    {errors.fullName.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" aria-invalid={!!errors.phone} {...phoneInput} {...register("phone")} />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-dob">Date of birth</Label>
                <Input id="edit-dob" type="date" aria-invalid={!!errors.dob} {...register("dob")} />
                {errors.dob && <p className="text-sm text-destructive">{errors.dob.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-designation">Designation</Label>
                <Input
                  id="edit-designation"
                  maxLength={100}
                  {...register("designation")}
                />
                {errors.designation && (
                  <p className="text-sm text-destructive">
                    {errors.designation.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Employment type</Label>
                <Controller
                  control={control}
                  name="employmentType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Full-time</SelectItem>
                        <SelectItem value="part_time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Department</Label>
                <Controller
                  control={control}
                  name="departmentId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        {(departments ?? []).map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Reporting manager</Label>
                <Controller
                  control={control}
                  name="reportingManagerId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_MANAGER}>No manager</SelectItem>
                        {managerOptions.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.fullName} — {m.designation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  maxLength={500}
                  {...register("address")}
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_notice">On notice</SelectItem>
                        <SelectItem value="exited">
                          Exited (revokes login)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateEmployee.isPending}>
                {updateEmployee.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
