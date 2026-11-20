"use client";

import { useEffect } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTheme } from "next-themes";
import { z } from "zod";
import { KeyRound, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/common/page-header";
import { FormField } from "@/components/common/form-field";
import { useCompany, useUpdateCompany } from "@/hooks/use-settings";
import { readSession } from "@/lib/session";
import type { Company } from "@/lib/types";
import { optionalEmail, optionalGstin, optionalIfsc, optionalPhone, optionalText, optionalUrl, requiredText, showApiError } from "@/lib/validation";
import { digitsInput, phoneInput, upperCodeInput } from "@/lib/input-filters";

const BANK_ACCOUNT_RE = /^\d{9,18}$/;
const UPI_RE = /^[\w.-]{2,256}@[a-zA-Z]{2,64}$/;

const schema = z.object({
  name: requiredText("Company name"),
  businessEmail: optionalEmail,
  phone: optionalPhone,
  website: optionalUrl,
  gstNumber: optionalGstin,
  address: optionalText(300),
  tagline: optionalText(100),
  signatoryName: optionalText(100),
  signatoryTitle: optionalText(100),
  bankAccountName: optionalText(150),
  bankAccountNo: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, ""))
    .refine((v) => v === "" || BANK_ACCOUNT_RE.test(v), "Enter a valid account number (9–18 digits)"),
  bankIfsc: optionalIfsc,
  upiId: z
    .string()
    .trim()
    .refine((v) => v === "" || UPI_RE.test(v), "Enter a valid UPI ID (e.g. name@bank)"),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function toForm(c: Company): FormInput {
  return {
    name: c.name,
    businessEmail: c.businessEmail ?? "",
    phone: c.phone ?? "",
    website: c.website ?? "",
    gstNumber: c.gstNumber ?? "",
    address: c.address ?? "",
    tagline: c.tagline ?? "",
    signatoryName: c.signatoryName ?? "",
    signatoryTitle: c.signatoryTitle ?? "",
    bankAccountName: c.bankAccountName ?? "",
    bankAccountNo: c.bankAccountNo ?? "",
    bankIfsc: c.bankIfsc ?? "",
    upiId: c.upiId ?? "",
  };
}

export default function SettingsPage() {
  const { data: company, isLoading, isError, refetch } = useCompany();
  const updateCompany = useUpdateCompany();
  const { resolvedTheme, setTheme } = useTheme();
  const isAdmin = readSession().role === "admin";

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormInput, unknown, FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (company) reset(toForm(company));
  }, [company, reset]);

  const onSubmit = (values: FormValues) => {
    updateCompany.mutate(values, {
      onSuccess: (saved) => {
        reset(toForm(saved));
        toast.success("Settings saved");
      },
      onError: (err) => showApiError(err, "Could not save settings", setError),
    });
  };

  const field = (name: keyof FormInput, label: string, props: React.ComponentProps<typeof Input> = {}, hint?: string) => (
    <FormField label={label} required={name === "name"} error={errors[name]?.message} hint={hint}>
      <Input readOnly={!isAdmin} {...props} {...register(name)} />
    </FormField>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Settings" subtitle={isAdmin ? "Company profile and the details printed on your documents." : "Company profile (only admins can change it)."} />

      <div className="grid gap-4 lg:grid-cols-3">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 lg:col-span-2">
          {isError ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10">
                <p className="text-sm text-muted-foreground">Couldn&apos;t load company settings.</p>
                <Button variant="outline" size="sm" type="button" onClick={() => refetch()}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card>
              <CardContent className="flex flex-col gap-4 py-6">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-base">Company</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">{field("name", "Company name", { maxLength: 150 })}</div>
                  {field("businessEmail", "Business email", { type: "email", maxLength: 254 })}
                  {field("phone", "Phone", phoneInput)}
                  {field("website", "Website", { type: "url", placeholder: "https://innzout.com", maxLength: 254 })}
                  {field("gstNumber", "GSTIN", upperCodeInput(15))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-base">Letterhead</CardTitle>
                  <CardDescription>Printed in the footer and sign-off of every document.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Address" className="sm:col-span-2" error={errors.address?.message}>
                    <Textarea rows={2} maxLength={300} readOnly={!isAdmin} {...register("address")} />
                  </FormField>
                  {field("tagline", "Tagline", { maxLength: 100 })}
                  <div />
                  {field("signatoryName", "Signatory name", { maxLength: 100 })}
                  {field("signatoryTitle", "Signatory title", { maxLength: 100 })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-base">Bank & UPI</CardTitle>
                  <CardDescription>Shown on invoices, proformas and payment reminders.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {field("bankAccountName", "Account name", { maxLength: 150 })}
                  {field("bankAccountNo", "Account number", digitsInput(18))}
                  {field("bankIfsc", "IFSC", upperCodeInput(11))}
                  {field("upiId", "UPI ID", { maxLength: 100, placeholder: "innzout@upi" })}
                </CardContent>
              </Card>

              {isAdmin && (
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" disabled={!isDirty || updateCompany.isPending} onClick={() => company && reset(toForm(company))}>
                    Discard
                  </Button>
                  <Button type="submit" disabled={!isDirty || updateCompany.isPending}>
                    {updateCompany.isPending ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              )}
            </>
          )}
        </form>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Appearance</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  {resolvedTheme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
                  <span className="text-sm font-medium">Dark mode</span>
                </span>
                <Switch checked={resolvedTheme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
              </label>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Account</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full justify-start" render={<Link href="/change-password" />}>
                <KeyRound className="size-4" /> Change password
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
