"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  DoorOpen,
  FolderKanban,
  Handshake,
  ListChecks,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { isLoggedIn } from "@/lib/session";

const features = [
  { icon: Users, label: "Employees", description: "Full employee directory, onboarding, and org structure." },
  { icon: CalendarCheck, label: "Attendance", description: "Check-in/out, breaks, late tracking, on-duty requests." },
  { icon: DoorOpen, label: "Leave Management", description: "Balances, approvals, and manager routing built in." },
  { icon: Wallet, label: "Payroll", description: "Salary structures, monthly runs, and downloadable payslips." },
  { icon: Handshake, label: "Clients", description: "Manage client accounts and relationship history." },
  { icon: FolderKanban, label: "Projects", description: "List and kanban views with team staffing." },
  { icon: ListChecks, label: "Tasks", description: "Assign, prioritize, and track work across projects." },
  { icon: ShieldCheck, label: "Role-based Access", description: "Admin, HR, manager, and employee views, scoped correctly." },
];

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn()) router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4 sm:px-10">
        <BrandLogo />
        <Button render={<Link href="/login" />} className="rounded-full">
          Sign in
        </Button>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-16 text-center sm:py-24">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            HR + CRM, in one place
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Run your whole team from a single dashboard
          </h1>
          <p className="max-w-2xl text-balance text-muted-foreground sm:text-lg">
            Employees, attendance, leave, payroll, clients, and projects — one system instead of five spreadsheets and
            three logins. Built for growing companies that need real workflows, not just a contact list.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" render={<Link href="/login" />} className="rounded-full px-6">
              Sign in to your workspace
            </Button>
          </div>

          <div className="mt-10 w-full max-w-4xl overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex items-center gap-1.5 border-b bg-muted/40 px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-red-400" />
              <span className="size-2.5 rounded-full bg-amber-400" />
              <span className="size-2.5 rounded-full bg-green-400" />
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-6">
              {features.slice(0, 4).map((f) => (
                <div key={f.label} className="flex flex-col items-start gap-2 rounded-xl border bg-background p-4 text-left">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="size-4" />
                  </div>
                  <p className="text-sm font-medium">{f.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight">Everything your team needs</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">Modules that actually talk to each other.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.label} className="flex flex-col gap-3 rounded-xl border bg-card p-5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="size-4.5" />
                </div>
                <p className="font-medium">{f.label}</p>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-6 text-center text-xs text-muted-foreground sm:px-10">
        © {new Date().getFullYear()} INNZOUT Technologies. All rights reserved.
      </footer>
    </div>
  );
}
