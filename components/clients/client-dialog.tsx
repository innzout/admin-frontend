"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { useCreateClient, useUpdateClient } from "@/hooks/use-clients";
import { ApiError } from "@/lib/api";
import type { Client } from "@/lib/types";
import { requiredText, requiredEmail, optionalPhone, optionalGstin, optionalText } from "@/lib/validation";
import { phoneInput, upperCodeInput } from "@/lib/input-filters";

const schema = z.object({
  companyName: requiredText("Company name"),
  contactPerson: requiredText("Contact person"),
  email: requiredEmail,
  phone: optionalPhone.optional(),
  gstNumber: optionalGstin.optional(),
  address: optionalText(500).optional(),
  source: optionalText(50).optional(),
});
type FormValues = z.infer<typeof schema>;

export function ClientDialog({
  client,
  open,
  onOpenChange,
}: {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const isEdit = !!client;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    reset({
      companyName: client?.companyName ?? "",
      contactPerson: client?.contactPerson ?? "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      gstNumber: client?.gstNumber ?? "",
      address: client?.address ?? "",
      source: client?.source ?? "",
    });
  }, [open, client, reset]);

  const onSubmit = (values: FormValues) => {
    if (isEdit) {
      updateClient.mutate(
        {
          id: client.id,
          input: {
            companyName: values.companyName,
            contactPerson: values.contactPerson,
            phone: values.phone || undefined,
            gstNumber: values.gstNumber || undefined,
            address: values.address || undefined,
            source: values.source || undefined,
          },
        },
        {
          onSuccess: () => {
            toast.success(`${values.companyName} updated`);
            onOpenChange(false);
          },
          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update client"),
        },
      );
    } else {
      createClient.mutate(
        {
          companyName: values.companyName,
          contactPerson: values.contactPerson,
          email: values.email,
          phone: values.phone || undefined,
          gstNumber: values.gstNumber || undefined,
          address: values.address || undefined,
          source: values.source || undefined,
        },
        {
          onSuccess: () => {
            toast.success(`${values.companyName} added`);
            onOpenChange(false);
          },
          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not add client"),
        },
      );
    }
  };

  const isPending = createClient.isPending || updateClient.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Client" : "Add Client"}</DialogTitle>
          <DialogDescription>{isEdit ? client.email : "Add a new client account."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="cl-company">Company name</Label>
              <Input id="cl-company" maxLength={150} autoComplete="organization" {...register("companyName")} />
              {errors.companyName && <p className="text-sm text-destructive">{errors.companyName.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cl-contact">Contact person</Label>
              <Input id="cl-contact" maxLength={150} autoComplete="name" {...register("contactPerson")} />
              {errors.contactPerson && <p className="text-sm text-destructive">{errors.contactPerson.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cl-email">Email</Label>
              <Input id="cl-email" type="email" maxLength={254} autoComplete="email" disabled={isEdit} {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cl-phone">Phone</Label>
              <Input id="cl-phone" {...phoneInput} {...register("phone")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cl-gst">GST number</Label>
              <Input id="cl-gst" {...upperCodeInput(15)} {...register("gstNumber")} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="cl-address">Address</Label>
              <Input id="cl-address" maxLength={500} {...register("address")} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="cl-source">Source</Label>
              <Input id="cl-source" placeholder="Referral, website, outbound…" maxLength={100} {...register("source")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save Changes" : "Add Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
