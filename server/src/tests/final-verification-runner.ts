import { rawPrisma } from "../prisma";

async function runAudit() {
  console.log("=== STEP 1: DATABASE IDENTITIES & SEED RECONCILIATION ===");
  const superAdmin = await rawPrisma.user.findFirst({
    where: { email: "admin@masterhrms.com" },
    include: { roles: true, employees: true },
  });
  console.log("Super Admin Record:", {
    id: superAdmin?.id,
    email: superAdmin?.email,
    roles: superAdmin?.roles.map((r) => ({ role: r.role, tenantId: r.tenantId })),
    employeesLinked: superAdmin?.employees.length,
  });

  const tenantAdmin = await rawPrisma.user.findFirst({
    where: { email: "tenantadmin@masterhrms.com" },
    include: { roles: true, employees: true },
  });
  console.log("Tenant Admin Record:", {
    id: tenantAdmin?.id,
    email: tenantAdmin?.email,
    roles: tenantAdmin?.roles.map((r) => ({ role: r.role, tenantId: r.tenantId })),
  });

  const hrUser = await rawPrisma.user.findFirst({
    where: { email: "hr@masterhrms.com" },
    include: { roles: true, employees: true },
  });
  console.log("HR Admin Record:", {
    id: hrUser?.id,
    email: hrUser?.email,
    roles: hrUser?.roles.map((r) => ({ role: r.role, tenantId: r.tenantId })),
  });

  const employeeUser = await rawPrisma.user.findFirst({
    where: { email: "employee@masterhrms.com" },
    include: { roles: true, employees: true },
  });
  console.log("Employee Record:", {
    id: employeeUser?.id,
    email: employeeUser?.email,
    roles: employeeUser?.roles.map((r) => ({ role: r.role, tenantId: r.tenantId })),
    employeeCode: employeeUser?.employees[0]?.employeeCode,
  });

  const defaultTenant = await rawPrisma.tenant.findUnique({
    where: { id: "tenant-default-001" },
  });
  console.log("Default Tenant Record:", {
    id: defaultTenant?.id,
    name: defaultTenant?.name,
    slug: defaultTenant?.slug,
    currency: defaultTenant?.currency,
  });

  console.log("\n=== STEP 2: LIVE HTTP AUTHENTICATION TESTING ===");
  const BASE = "http://localhost:4000/api/auth";

  // 1. /login with Super Admin
  const r1 = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@masterhrms.com", password: "Password123!" }),
  });
  const b1 = await r1.json();
  console.log("POST /api/auth/login (admin@masterhrms.com):", r1.status, b1);

  // 2. /super-login with Super Admin
  const r2 = await fetch(`${BASE}/super-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@masterhrms.com", password: "Password123!" }),
  });
  const b2 = await r2.json();
  console.log("POST /api/auth/super-login (admin@masterhrms.com):", r2.status, {
    tokenReceived: Boolean(b2.token),
    role: b2.user?.roles?.[0]?.role,
  });

  // 3. /login with Tenant Admin
  const r3 = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "tenantadmin@masterhrms.com", password: "Password123!" }),
  });
  const b3 = await r3.json();
  console.log("POST /api/auth/login (tenantadmin@masterhrms.com):", r3.status, {
    tokenReceived: Boolean(b3.token),
    role: b3.user?.roles?.[0]?.role,
    tenantId: b3.user?.roles?.[0]?.tenantId,
  });

  // 4. /login with HR
  const r4 = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "hr@masterhrms.com", password: "Password123!" }),
  });
  const b4 = await r4.json();
  console.log("POST /api/auth/login (hr@masterhrms.com):", r4.status, {
    tokenReceived: Boolean(b4.token),
    role: b4.user?.roles?.[0]?.role,
  });

  // 5. /login with Employee
  const r5 = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "employee@masterhrms.com", password: "Password123!" }),
  });
  const b5 = await r5.json();
  console.log("POST /api/auth/login (employee@masterhrms.com):", r5.status, {
    tokenReceived: Boolean(b5.token),
    role: b5.user?.roles?.[0]?.role,
  });

  console.log("\n=== STEP 3: SUPER ADMIN RUN AS COMPANY / IMPERSONATION ===");
  if (b2.token) {
    const rImp = await fetch("http://localhost:4000/api/super/tenants/tenant-default-001/impersonate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${b2.token}`,
        "Content-Type": "application/json",
      },
    });
    const bImp = await rImp.json();
    console.log("POST /api/super/tenants/:id/impersonate:", rImp.status, bImp);
  }

  // Verify non-superadmin cannot impersonate
  if (b3.token) {
    const rTamper = await fetch("http://localhost:4000/api/super/tenants/tenant-default-001/impersonate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${b3.token}`,
        "Content-Type": "application/json",
      },
    });
    console.log("POST /api/super/tenants/:id/impersonate by TenantAdmin:", rTamper.status);
  }
}

runAudit()
  .catch(console.error)
  .finally(() => process.exit(0));
