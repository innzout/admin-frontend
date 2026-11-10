"use client";

import Link from "next/link";
import {
  Area,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Briefcase,
  CheckCircle2,
  Circle,
  DollarSign,
  FileText,
  FolderKanban,
  Handshake,
  Plus,
  Receipt,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KpiCard } from "@/components/common/kpi-card";
import { PanelCard } from "@/components/common/panel-card";
import { ProgressListRow } from "@/components/common/progress-list-row";
import { AvatarInitials } from "@/components/common/avatar-initials";
import { StatusBadge } from "@/components/common/status-badge";
import { useEmployees } from "@/hooks/use-employees";
import { useCompanyName } from "@/hooks/use-settings";
import { useAttendanceList } from "@/hooks/use-attendance";
import { useClients } from "@/hooks/use-clients";
import { useProjects } from "@/hooks/use-projects";
import { useMe } from "@/hooks/use-auth";
import { readSession } from "@/lib/session";
import { formatInr } from "@/lib/format";
import { useLeadSummary, useLedgerSummary } from "@/hooks/use-company";
import { useTasks } from "@/hooks/use-tasks";
import { useInvoices } from "@/hooks/use-invoices";
import { invoiceStatusTone } from "@/lib/status";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { AttentionStrip } from "@/components/dashboard/attention-strip";

const STAGE_COLORS = ["#1565c0", "#42a5f5", "#16a34a", "#fb923c", "#a855f7", "#ef4444", "#64748b"];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const session = readSession();
  const { data: me } = useMe();
  const companyName = useCompanyName() || "your company";
  const { data: employeePage } = useEmployees({ limit: 1 });
  const todayIso = new Date().toISOString().slice(0, 10);
  const { data: todayAttendance } = useAttendanceList({ date: todayIso });
  const { data: clientsResult } = useClients({ limit: 100 });
  const { data: projectsResult } = useProjects({ limit: 100 });
  const { data: taskResult } = useTasks({ limit: 100 });
  const { data: invoicesResult } = useInvoices({ limit: 100 });
  const isMgmt = session.role === "admin" || session.role === "hr" || session.role === "manager";
  const { data: leadSummary } = useLeadSummary(isMgmt);
  const { data: ledger } = useLedgerSummary(isMgmt);
  const clients = clientsResult?.clients ?? [];
  const projects = projectsResult?.projects ?? [];
  const tasks = taskResult?.tasks ?? [];
  const invoices = invoicesResult?.invoices ?? [];

  if (!me) return null;
  if (me.role !== "admin" && me.role !== "hr") {
    return <EmployeeDashboard session={session} employeeId={me.employeeId} />;
  }

  // Every KPI below that has a real detail page is derived from that page's
  // own data source — never a second, independently-typed number that can
  // silently drift out of sync with what the linked page actually shows.
  const activeClients = clients.filter((c) => c.status !== "inactive");
  const activeProjects = projects.filter((p) => p.status !== "completed");
  const openLeadCount = (leadSummary?.stages ?? []).filter((st) => st.stage !== "won" && st.stage !== "lost").reduce((n, st) => n + st.count, 0);
  const pipelineValue = leadSummary?.openValue ?? 0;
  const monthly = ledger?.monthly ?? [];
  const revenueTrend = monthly.map((m) => ({
    month: new Date(m.month + "-01").toLocaleString("en-IN", { month: "short" }),
    revenue: m.in,
    target: m.out,
  }));
  const lastTwo = monthly.slice(-2);
  const growthPct = lastTwo.length === 2 && lastTwo[0].in > 0 ? ((lastTwo[1].in - lastTwo[0].in) / lastTwo[0].in) * 100 : null;
  const unpaidInvoices = invoices.filter((i) => i.status === "sent" || i.status === "overdue");
  const unpaidTotal = unpaidInvoices.reduce((sum, i) => sum + i.balanceDue, 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;
  const leadStages = (leadSummary?.stages ?? [])
    .filter((st) => st.count > 0)
    .map((st, i) => ({ name: st.stage.replace(/_/g, " "), value: st.count, color: STAGE_COLORS[i % STAGE_COLORS.length] }));
  const hasCashFlow = monthly.some((m) => m.in > 0 || m.out > 0);
  const openTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  const onLeaveToday = (todayAttendance ?? []).filter((a) => a.status === "on_leave").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()}
            {session.name ? `, ${session.name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-sm text-muted-foreground">Here&apos;s what is happening at {companyName} today.</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button className="rounded-full" />}>
            <Plus className="size-4" />
            Quick Add
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href="/employees" />}>Add Employee</DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/clients" />}>Add Client</DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/projects" />}>New Project</DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/billing" />}>New Invoice</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AttentionStrip />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          icon={DollarSign}
          iconClassName="bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400"
          label="Revenue (this month)"
          href="/payments"
          value={ledger ? formatInr(ledger.thisMonthIn) : undefined}
          trend={{ direction: "neutral", text: ledger ? `${formatInr(ledger.thisMonthOut)} spent · net ${formatInr(ledger.net)}` : "" }}
        />
        <KpiCard
          icon={Handshake}
          iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
          label="Active Clients"
          href="/clients"
          value={activeClients.length}
          trend={{ direction: "neutral", text: `${clientsResult?.total ?? clients.length} total on record` }}
        />
        <KpiCard
          icon={FolderKanban}
          iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"
          label="Active Projects"
          href="/projects"
          value={activeProjects.length}
          trend={{ direction: "neutral", text: `${projects.length - activeProjects.length} completed` }}
        />
        <KpiCard
          icon={Users}
          iconClassName="bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
          label="Team Members"
          href="/employees"
          value={employeePage?.total}
          trend={{ direction: "neutral", text: `${onLeaveToday} on leave today` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          iconClassName="bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400"
          label="Open Leads"
          href="/leads"
          value={leadSummary ? openLeadCount : undefined}
          trend={{ direction: "neutral", text: `${formatInr(pipelineValue)} pipeline · ${leadSummary?.followUpsDue ?? 0} follow-ups due` }}
        />
        <KpiCard
          icon={FileText}
          iconClassName="bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
          label="Pending Invoices"
          href="/billing"
          value={formatInr(unpaidTotal)}
          trend={{ direction: overdueCount > 0 ? "down" : "neutral", text: `${overdueCount} overdue` }}
        />
        <KpiCard
          icon={BarChart3}
          iconClassName="bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400"
          label="Monthly Growth"
          href="/payments"
          value={growthPct === null ? "—" : `${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(0)}%`}
          trend={{ direction: growthPct === null ? "neutral" : growthPct >= 0 ? "up" : "down", text: "money in vs last month" }}
        />
        <KpiCard
          icon={Target}
          iconClassName="bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
          label="Lead Win Rate"
          href="/leads"
          value={leadSummary ? `${leadSummary.conversionPct.toFixed(0)}%` : undefined}
          trend={{ direction: "neutral", text: `${formatInr(leadSummary?.wonValue ?? 0)} won` }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <PanelCard
          title="Cash Flow"
          subtitle="Money in (area) vs out (dashed), last 6 months"
          className="lg:col-span-3"
          viewAllHref="/payments"
          empty={!hasCashFlow && { icon: BarChart3, message: "Record a payment to see money in and out over time." }}
        >
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={revenueTrend}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1565c0" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#1565c0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={formatInr}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)" }}
                contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "var(--border)" }}
                formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`}
              />
              <Area type="monotone" dataKey="revenue" stroke="#1565c0" strokeWidth={2} fill="url(#revenueFill)" />
              <Line type="monotone" dataKey="target" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </PanelCard>

        <PanelCard
          title="Leads by Stage"
          subtitle="Current pipeline"
          className="lg:col-span-2"
          viewAllHref="/leads"
          empty={leadStages.length === 0 && { icon: TrendingUp, message: "No leads yet. Add your first enquiry in Leads." }}
        >
          <div className="flex flex-col items-center gap-4">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={leadStages} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                  {leadStages.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "var(--border)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-2">
              {leadStages.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 capitalize text-muted-foreground">
                    <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                  <span className="font-medium tabular-nums">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </PanelCard>
      </div>

      <div className="grid gap-4">
        <PanelCard
          title="Active Projects"
          viewAllHref="/projects"
          contentClassName="flex flex-col gap-5"
          empty={activeProjects.length === 0 && { icon: FolderKanban, message: "No active projects. Create one from Projects." }}
        >
          {activeProjects.map((p) => (
            <ProgressListRow
              key={p.id}
              icon={Briefcase}
              title={p.name}
              subtitle={`${p.clientName ?? "No client"} · Due ${p.deadline?.slice(0, 10) ?? "—"}`}
              percent={p.taskCounts.total === 0 ? 0 : Math.round((p.taskCounts.completed / p.taskCounts.total) * 100)}
            />
          ))}
        </PanelCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard
          title="Open Tasks"
          viewAllHref="/tasks"
          contentClassName="flex flex-col gap-4"
          empty={openTasks.length === 0 && { icon: CheckCircle2, message: "No open tasks." }}
        >
          {openTasks.slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center gap-3">
              {t.status === "completed" ? (
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground/40" />
              )}
              <p className={`min-w-0 flex-1 truncate text-sm ${t.status === "completed" ? "text-muted-foreground line-through" : ""}`}>
                {t.title}
              </p>
              {t.assigneeName && <AvatarInitials name={t.assigneeName} className="size-6" fallbackClassName="text-[10px]" />}
            </div>
          ))}
        </PanelCard>

        <PanelCard
          title="Recent Invoices"
          viewAllHref="/billing"
          contentClassName="flex flex-col gap-4"
          empty={invoices.length === 0 && { icon: Receipt, message: "No invoices yet." }}
        >
          {invoices.slice(0, 5).map((inv) => (
            <div key={inv.id} className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Receipt className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{inv.clientName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {inv.invoiceNumber} · {inv.issueDate.slice(0, 10)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums">₹{inv.total.toLocaleString("en-IN")}</p>
                <StatusBadge tone={invoiceStatusTone[inv.status]} className="mt-0.5">
                  {inv.status}
                </StatusBadge>
              </div>
            </div>
          ))}
        </PanelCard>
      </div>
    </div>
  );
}
