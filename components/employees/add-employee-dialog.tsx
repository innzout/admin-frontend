"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Plus } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateEmployee } from "@/hooks/use-employees";
import { useDepartments } from "@/hooks/use-departments";
import { ApiError } from "@/lib/api";
import { requiredText, requiredEmail, optionalPhone, requiredDate } from "@/lib/validation";

const schema = z.object({
  fullName: requiredText("Full name"),
  email: requiredEmail,
  phone: optionalPhone.optional(),
  departmentId: z.string().optional(),
  designation: requiredText("Designation", 100),
  employmentType: z.enum(["full_time", "part_time", "contract", "intern"]),
  joinDate: requiredDate("Join date"),
  createLogin: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function AddEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const { data: departments } = useDepartments();
  const createEmployee = useCreateEmployee();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { employmentType: "full_time", createLogin: false },
  });

  const onSubmit = (values: FormValues) => {
    createEmployee.mutate(
      {
        ...values,
        departmentId: values.departmentId || undefined,
        phone: values.phone || undefined,
      },
      {
        onSuccess: (res) => {
          toast.success(`${res.employee.fullName} was added (${res.employee.employeeCode})`);
          if (res.tempPassword) {
            toast.info(`Username: ${res.employee.employeeCode} · Temporary password: ${res.tempPassword}`, {
              description: "Share both with the employee securely — the password won't be shown again.",
              duration: 20000,
            });
          }
          if (res.warning) toast.warning(res.warning);
          reset();
          setOpen(false);
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Could not add employee");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            Add Employee
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
          <DialogDescription>Creates the HR record. Optionally provisions a portal login.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" {...register("fullName")} />
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="joinDate">Join date</Label>
              <Input id="joinDate" type="date" {...register("joinDate")} />
              {errors.joinDate && <p className="text-sm text-destructive">{errors.joinDate.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="designation">Designation</Label>
              <Input id="designation" placeholder="e.g. React Developer" {...register("designation")} />
              {errors.designation && <p className="text-sm text-destructive">{errors.designation.message}</p>}
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
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 rounded border-input" {...register("createLogin")} />
            Create a portal login for this employee
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEmployee.isPending}>
              {createEmployee.isPending ? "Adding…" : "Add Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
