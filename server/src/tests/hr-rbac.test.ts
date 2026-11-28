import { describe, it, expect, vi } from "vitest";
import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import { isHrOrAdminUser, requireHrOrAdmin } from "../middleware/hr-rbac.middleware.js";

function makeReq(overrides: Partial<AuthRequest> & { method?: string; path?: string; user?: any } = {}): AuthRequest {
  return {
    method: "POST",
    path: "/",
    user: { userId: "u-1", tenantId: "t-1", roles: ["employee"], permissions: [] },
    ...overrides,
  } as AuthRequest;
}

function makeRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res as Response & { statusCode: number; body: any };
}

describe("DEFECT-041 / P22-SEC-002: HR RBAC Middleware", () => {
  it("recognizes HR, Manager, Tenant Admin, Workspace Admin, and Super Admin roles", () => {
    const privilegedRoles = [
      ["super_admin"],
      ["tenant_admin"],
      ["workspace_admin"],
      ["admin"],
      ["owner"],
      ["hr_admin"],
      ["hr_manager"],
      ["hr"],
      ["manager"],
      ["recruiter"],
      ["payroll_admin"],
    ];
    for (const roles of privilegedRoles) {
      expect(isHrOrAdminUser(makeReq({ user: { roles, permissions: [] } }))).toBe(true);
    }
    expect(isHrOrAdminUser(makeReq({ user: { roles: ["employee"], workspaceRole: "Workspace Admin" } }))).toBe(true);
    expect(isHrOrAdminUser(makeReq({ user: { roles: ["employee"], workspaceRole: "HR Manager" } }))).toBe(true);
    expect(
      isHrOrAdminUser(
        makeReq({ user: { roles: ["employee"], permissions: ["hrm.recruitment.manage"] } }),
        ["hrm.recruitment"]
      )
    ).toBe(true);
  });

  it("denies standard employee without HR role or permission", () => {
    expect(isHrOrAdminUser(makeReq({ user: { roles: ["employee"], workspaceRole: "Employee", permissions: [] } }))).toBe(false);
    expect(isHrOrAdminUser(makeReq({ user: undefined }))).toBe(false);
  });

  it("blocks standard employees on strict HR-only routers (mail-templates, dashboard, collaboration)", () => {
    const mw = requireHrOrAdmin({ allowReads: false });
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
      const next = vi.fn() as unknown as NextFunction;
      const res = makeRes();
      mw(makeReq({ method, path: "/" }), res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body?.code).toBe("HR_ROLE_REQUIRED");
    }

    const nextAllowed = vi.fn() as unknown as NextFunction;
    const resAllowed = makeRes();
    mw(makeReq({ method: "GET", user: { roles: ["hr_manager"], permissions: [] } }), resAllowed, nextAllowed);
    expect(nextAllowed).toHaveBeenCalledTimes(1);
  });

  it("allows GET reads and allowlisted self-service mutations while blocking HR admin mutations", () => {
    const recruitmentMw = requireHrOrAdmin({
      allowReads: true,
      allowSelfService: [
        { method: "POST", pattern: /^\/referrals\/?$/i },
        { method: "POST", pattern: /^\/interviews\/[^/]+\/(scorecard|feedback)\/?$/i },
        { method: "PUT", pattern: /^\/candidate-onboarding\/[^/]+\/tasks\/[^/]+\/?$/i },
      ],
    });

    // Allowed for standard employee
    for (const [method, path] of [
      ["GET", "/job-postings"],
      ["POST", "/referrals"],
      ["POST", "/interviews/int-1/scorecard"],
      ["POST", "/interviews/int-1/feedback"],
      ["PUT", "/candidate-onboarding/ob-1/tasks/task-9"],
    ]) {
      const next = vi.fn() as unknown as NextFunction;
      const res = makeRes();
      recruitmentMw(makeReq({ method, path }), res, next);
      expect(next, `${method} ${path} should be allowed for employee`).toHaveBeenCalledTimes(1);
    }

    // Blocked for standard employee
    for (const [method, path] of [
      ["POST", "/job-postings"],
      ["PUT", "/job-postings/job-1"],
      ["DELETE", "/candidates/cand-1"],
      ["POST", "/offers"],
      ["PUT", "/referrals/ref-1/status"],
    ]) {
      const next = vi.fn() as unknown as NextFunction;
      const res = makeRes();
      recruitmentMw(makeReq({ method, path }), res, next);
      expect(next, `${method} ${path} must be blocked for employee`).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body?.code).toBe("HR_ROLE_REQUIRED");
    }
  });

  it("enforces self-service allowlists on documents, performance, and training routers", () => {
    const docsMw = requireHrOrAdmin({
      allowReads: true,
      allowSelfService: [
        { method: "PATCH", pattern: /^\/acknowledgements\/[^/]+\/acknowledge\/?$/i },
        { method: "POST", pattern: /^\/[^/]+\/download\/?$/i },
      ],
    });
    const perfMw = requireHrOrAdmin({
      allowReads: true,
      allowSelfService: [{ method: "PATCH", pattern: /^\/goals\/[^/]+\/progress\/?$/i }],
    });
    const trainMw = requireHrOrAdmin({
      allowReads: true,
      allowSelfService: [
        { method: "POST", pattern: /^\/sessions\/[^/]+\/register\/?$/i },
        { method: "PATCH", pattern: /^\/employee-trainings\/[^/]+\/progress\/?$/i },
        { method: "PATCH", pattern: /^\/tasks\/[^/]+\/complete\/?$/i },
        { method: "POST", pattern: /^\/tasks\/[^/]+\/feedbacks\/?$/i },
      ],
    });

    const cases: Array<[ReturnType<typeof requireHrOrAdmin>, string, string, boolean]> = [
      [docsMw, "PATCH", "/acknowledgements/ack-1/acknowledge", true],
      [docsMw, "POST", "/doc-1/download", true],
      [docsMw, "POST", "/contracts", false],
      [docsMw, "DELETE", "/doc-1", false],
      [perfMw, "PATCH", "/goals/g-1/progress", true],
      [perfMw, "POST", "/goals", false],
      [perfMw, "POST", "/pip", false],
      [trainMw, "POST", "/sessions/s-1/register", true],
      [trainMw, "PATCH", "/employee-trainings/et-1/progress", true],
      [trainMw, "PATCH", "/tasks/t-1/complete", true],
      [trainMw, "POST", "/tasks/t-1/feedbacks", true],
      [trainMw, "POST", "/programs", false],
      [trainMw, "DELETE", "/sessions/s-1", false],
    ];

    for (const [mw, method, path, shouldAllow] of cases) {
      const next = vi.fn() as unknown as NextFunction;
      const res = makeRes();
      mw(makeReq({ method, path }), res, next);
      if (shouldAllow) {
        expect(next, `${method} ${path} should allow`).toHaveBeenCalledTimes(1);
      } else {
        expect(next, `${method} ${path} should block`).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
      }
    }
  });
});
