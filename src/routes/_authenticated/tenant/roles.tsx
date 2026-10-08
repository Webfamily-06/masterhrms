import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Plus, CheckCircle2, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tenant/roles")({
  component: TenantRolesPage,
  head: () => ({
    meta: [{ title: "Roles & Permissions — Master HRMS" }],
  }),
});

function TenantRolesPage() {
  const roles = [
    {
      id: "role_tenant_admin",
      name: "Tenant Administrator (Owner)",
      description: "Complete authority over workspace configuration, subscriptions, HR operations, and billing.",
      usersCount: 2,
      isSystem: true,
      portals: ["Tenant", "HR", "Employee"],
      permissions: ["All Permissions Granted"],
    },
    {
      id: "role_hr_admin",
      name: "HR Operations Administrator",
      description: "Full management of employee records, biometric attendance, payroll runs, and recruitment pipelines.",
      usersCount: 3,
      isSystem: true,
      portals: ["HR", "Employee"],
      permissions: ["hr.employees.*", "hr.attendance.*", "hr.leave.*", "hr.payroll.*", "hr.recruitment.*"],
    },
    {
      id: "role_manager",
      name: "Line Manager",
      description: "Approval authority for team leave requests, timesheets, performance appraisals, and goals.",
      usersCount: 4,
      isSystem: false,
      portals: ["Employee (Manager Views)"],
      permissions: ["me.team.view", "me.leave.approve", "me.attendance.approve"],
    },
    {
      id: "role_employee",
      name: "Employee (Self-Service)",
      description: "Standard self-service profile access for clock-in/out, payslip downloads, and PTO requests.",
      usersCount: 15,
      isSystem: true,
      portals: ["Employee"],
      permissions: ["me.attendance.record", "me.leave.apply", "me.payroll.view"],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Roles & Access Permissions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hierarchical role definitions governing portal access and module-level authorization.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {roles.map((r) => (
          <Card key={r.id} className="border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">{r.name}</CardTitle>
                {r.isSystem && (
                  <Badge variant="outline" className="text-[10px] gap-1 bg-muted/50">
                    <Lock className="h-3 w-3" /> System Role
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs mt-1">{r.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Authorized Portals
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {r.portals.map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Assigned Scope
                </span>
                <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-md font-mono text-[11px]">
                  {r.permissions.join(", ")}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
