"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck, Eye, EyeOff, FileText, ListChecks } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BrandLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";

const MAX_USERNAME = 50;
const MAX_PASSWORD = 128;

const schema = z.object({
  username: z.string().trim().min(1, "Enter your username").max(MAX_USERNAME, "Username is too long"),
  password: z.string().min(1, "Enter your password").max(MAX_PASSWORD, "Password is too long"),
});

type FormValues = z.infer<typeof schema>;

const HIGHLIGHTS = [
  { icon: ListChecks, text: "Projects, tasks and deadlines in one place" },
  { icon: CalendarCheck, text: "Attendance, leave and payslips for the whole team" },
  { icon: FileText, text: "Invoices, letters and documents on your letterhead" },
];

export default function LoginPage() {
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    if (!login.isPending) login.mutate(values);
  };

  const errorMessage =
    login.error instanceof ApiError ? login.error.message : login.error ? "Could not log in. Please try again." : null;

  return (
    <div className="grid flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Brand panel: wide screens only, so phones get the form straight away. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0b1b33] p-10 text-white lg:flex">
        <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-32 size-96 rounded-full bg-blue-600/25 blur-3xl" />
        <BrandLogo className="relative" />
        <div className="relative flex max-w-md flex-col gap-6">
          <h1 className="font-heading text-3xl leading-tight font-bold text-balance">Run the whole company from one desk.</h1>
          <ul className="flex flex-col gap-3">
            {HIGHLIGHTS.map((h) => (
              <li key={h.text} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <h.icon className="size-4" aria-hidden />
                </span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/50">INNZOUT Admin Portal</p>
      </aside>

      <main className="flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <BrandLogo className="lg:hidden" />
          <div className="flex flex-col gap-1.5">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-pretty text-muted-foreground">Use the username your admin gave you.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={MAX_USERNAME}
                placeholder="e.g. emp-0001"
                className="h-10"
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? "username-error" : undefined}
                {...register("username")}
              />
              {errors.username && (
                <p id="username-error" className="text-sm text-destructive">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  maxLength={MAX_PASSWORD}
                  className="h-10 pr-10"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {errorMessage && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </p>
            )}

            <Button type="submit" className="mt-1 h-10 w-full" disabled={login.isPending}>
              {login.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="text-xs text-pretty text-muted-foreground">Forgot your password? Ask your HR or admin to reset it from your employee profile.</p>
        </div>
      </main>
    </div>
  );
}
