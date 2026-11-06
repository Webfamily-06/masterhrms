import { getTenantDb } from "../context/tenant-context";

export interface OrgTreeNode {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  email: string;
  phone: string | null;
  position: string | null;
  status: string;
  joinedAt: Date | null;
  avatarUrl?: string | null;
  departmentId: string | null;
  branchId: string | null;
  designationId: string | null;
  managerId: string | null;
  department?: { id: string; name: string } | null;
  branch?: { id: string; name: string; code?: string | null } | null;
  designation?: { id: string; name: string } | null;
  directReportsCount: number;
  totalTeamSize: number;
  depth: number;
  isMatchingSearch?: boolean;
  subordinates: OrgTreeNode[];
}

export interface DepartmentTreeNode {
  id: string;
  name: string;
  description: string | null;
  status: string;
  branch: { id: string; name: string; code?: string | null } | null;
  head: string; // Strictly "Department head not assigned" if not configured
  totalEmployees: number;
  activeEmployees: number;
  designations: Array<{ id: string; name: string; count: number }>;
  employees: Array<{
    id: string;
    name: string;
    employeeCode: string;
    position: string | null;
    designationName: string;
    status: string;
    managerId: string | null;
    managerName?: string | null;
  }>;
}

export class OrganizationTreeService {
  /**
   * Fetches the complete employee reporting hierarchy for a tenant.
   * Supports filtering while preserving the ancestor navigation path.
   */
  static async getEmployeeHierarchy(
    tenantId: string,
    options: {
      search?: string;
      departmentId?: string;
      designationId?: string;
      branchId?: string;
      status?: string;
      includeInactive?: boolean;
    } = {},
    dbOverride?: any
  ) {
    const db = dbOverride || getTenantDb();

    // 1. Fetch all tenant employees with only non-sensitive physical columns
    const whereClause: any = { tenantId };
    if (!options.includeInactive && !options.status) {
      whereClause.status = "active";
    } else if (options.status && options.status !== "all") {
      whereClause.status = options.status;
    }

    const employees = await db.employee.findMany({
      where: whereClause,
      select: {
        id: true,
        tenantId: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        position: true,
        status: true,
        joinedAt: true,
        departmentId: true,
        branchId: true,
        designationId: true,
        managerId: true,
        department: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true, code: true } },
        designation: { select: { id: true, name: true } },
        user: {
          select: {
            profile: {
              select: {
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    // 2. Index all employees into a map
    const nodeMap = new Map<string, OrgTreeNode>();
    employees.forEach((emp: any) => {
      nodeMap.set(emp.id, {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`.trim(),
        firstName: emp.firstName,
        lastName: emp.lastName,
        employeeCode: emp.employeeCode,
        email: emp.email,
        phone: emp.phone,
        position: emp.position || emp.designation?.name || "Team Member",
        status: emp.status,
        joinedAt: emp.joinedAt,
        avatarUrl: emp.user?.profile?.avatarUrl || null,
        departmentId: emp.departmentId,
        branchId: emp.branchId,
        designationId: emp.designationId,
        managerId: emp.managerId,
        department: emp.department,
        branch: emp.branch,
        designation: emp.designation,
        directReportsCount: 0,
        totalTeamSize: 0,
        depth: 0,
        subordinates: [],
      });
    });

    // 3. Build parent-child links and identify roots
    const rootNodes: OrgTreeNode[] = [];
    const orphanNodes: OrgTreeNode[] = [];

    employees.forEach((emp: any) => {
      const node = nodeMap.get(emp.id)!;
      if (emp.managerId && nodeMap.has(emp.managerId)) {
        const managerNode = nodeMap.get(emp.managerId)!;
        managerNode.subordinates.push(node);
      } else {
        // No manager assigned, or manager is outside filtered set / tenant
        if (!emp.managerId) {
          rootNodes.push(node);
        } else {
          orphanNodes.push(node);
        }
      }
    });

    // 4. Calculate direct reports and recursive team sizes
    function calculateMetrics(node: OrgTreeNode, currentDepth: number): number {
      node.depth = currentDepth;
      node.directReportsCount = node.subordinates.length;
      let subtreeSize = node.subordinates.length;
      for (const sub of node.subordinates) {
        subtreeSize += calculateMetrics(sub, currentDepth + 1);
      }
      node.totalTeamSize = subtreeSize;
      return subtreeSize;
    }

    rootNodes.forEach((root) => calculateMetrics(root, 0));
    orphanNodes.forEach((orphan) => calculateMetrics(orphan, 0));

    // 5. Handle search and filtering with ancestor preservation
    const searchFilter = (options.search || "").toLowerCase().trim();
    const deptFilter = options.departmentId && options.departmentId !== "all" ? options.departmentId : null;
    const desigFilter = options.designationId && options.designationId !== "all" ? options.designationId : null;
    const branchFilter = options.branchId && options.branchId !== "all" ? options.branchId : null;

    const hasFilters = Boolean(searchFilter || deptFilter || desigFilter || branchFilter);

    if (!hasFilters) {
      return {
        orgChart: rootNodes,
        unassigned: orphanNodes,
        totalEmployees: employees.length,
        activeEmployees: employees.filter((e: any) => e.status === "active").length,
      };
    }

    // Identify which nodes directly match the criteria
    const matchingIds = new Set<string>();
    employees.forEach((emp: any) => {
      const node = nodeMap.get(emp.id)!;
      let matches = true;

      if (searchFilter) {
        const matchesName = node.name.toLowerCase().includes(searchFilter);
        const matchesCode = node.employeeCode.toLowerCase().includes(searchFilter);
        const matchesPos = (node.position || "").toLowerCase().includes(searchFilter);
        const matchesDept = (node.department?.name || "").toLowerCase().includes(searchFilter);
        if (!matchesName && !matchesCode && !matchesPos && !matchesDept) {
          matches = false;
        }
      }

      if (deptFilter && node.departmentId !== deptFilter) matches = false;
      if (desigFilter && node.designationId !== desigFilter) matches = false;
      if (branchFilter && node.branchId !== branchFilter) matches = false;

      if (matches) {
        matchingIds.add(node.id);
        node.isMatchingSearch = true;
      }
    });

    // Collect all ancestors of matching nodes to preserve tree paths
    const requiredNodeIds = new Set<string>(matchingIds);
    matchingIds.forEach((id) => {
      let curr = nodeMap.get(id);
      while (curr && curr.managerId && nodeMap.has(curr.managerId)) {
        requiredNodeIds.add(curr.managerId);
        curr = nodeMap.get(curr.managerId);
      }
    });

    // Prune tree so only required nodes (matches + their ancestors) remain
    function pruneTree(nodes: OrgTreeNode[]): OrgTreeNode[] {
      const result: OrgTreeNode[] = [];
      for (const node of nodes) {
        if (requiredNodeIds.has(node.id)) {
          const filteredSubordinates = pruneTree(node.subordinates);
          result.push({
            ...node,
            subordinates: filteredSubordinates,
          });
        }
      }
      return result;
    }

    const filteredRoots = pruneTree(rootNodes);
    const filteredOrphans = pruneTree(orphanNodes);

    return {
      orgChart: filteredRoots,
      unassigned: filteredOrphans,
      totalEmployees: employees.length,
      matchingCount: matchingIds.size,
    };
  }

  /**
   * Fetches the department-wise organizational hierarchy.
   * Matches Reference Image 2: Department cards, employee counts, department heads fallback, and teams.
   */
  static async getDepartmentHierarchy(tenantId: string, dbOverride?: any) {
    const db = dbOverride || getTenantDb();

    // 1. Fetch departments, branches, and active employees
    const [departments, employees, designations] = await Promise.all([
      db.department.findMany({
        where: { tenantId },
        include: {
          branch: { select: { id: true, name: true, code: true } },
          _count: {
            select: { employees: true, designations: true },
          },
        },
        orderBy: { name: "asc" },
      }),
      db.employee.findMany({
        where: { tenantId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          position: true,
          status: true,
          departmentId: true,
          branchId: true,
          designationId: true,
          managerId: true,
          designation: { select: { id: true, name: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
      db.designation.findMany({
        where: { tenantId },
        select: { id: true, name: true, departmentId: true },
      }),
    ]);

    // 2. Group employees by department
    const deptEmployeesMap = new Map<string, any[]>();
    employees.forEach((emp: any) => {
      const dId = emp.departmentId || "unassigned";
      if (!deptEmployeesMap.has(dId)) {
        deptEmployeesMap.set(dId, []);
      }
      deptEmployeesMap.get(dId)!.push({
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`.trim(),
        employeeCode: emp.employeeCode,
        position: emp.position || emp.designation?.name || "Team Member",
        designationName: emp.designation?.name || "Unassigned Designation",
        status: emp.status,
        managerId: emp.managerId,
        managerName: emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}`.trim() : null,
      });
    });

    // 3. Build Department tree nodes
    const departmentNodes: DepartmentTreeNode[] = departments.map((dept: any) => {
      const deptEmps = deptEmployeesMap.get(dept.id) || [];
      const activeCount = deptEmps.filter((e) => e.status === "active").length;

      // Group designations within this department
      const desigCountMap = new Map<string, number>();
      deptEmps.forEach((e) => {
        const dName = e.designationName;
        desigCountMap.set(dName, (desigCountMap.get(dName) || 0) + 1);
      });

      const desigBreakdown = Array.from(desigCountMap.entries()).map(([name, count]) => ({
        id: name,
        name,
        count,
      }));

      return {
        id: dept.id,
        name: dept.name,
        description: dept.description,
        status: dept.status,
        branch: dept.branch,
        // Mandatory rule: If no explicit head column exists, use clear fallback
        head: "Department head not assigned",
        totalEmployees: deptEmps.length,
        activeEmployees: activeCount,
        designations: desigBreakdown,
        employees: deptEmps,
      };
    });

    // Handle employees without a department
    const unassignedEmps = deptEmployeesMap.get("unassigned") || [];
    if (unassignedEmps.length > 0) {
      departmentNodes.push({
        id: "unassigned",
        name: "General / Cross-Departmental",
        description: "Employees without a designated organizational department",
        status: "active",
        branch: null,
        head: "Not assigned",
        totalEmployees: unassignedEmps.length,
        activeEmployees: unassignedEmps.filter((e) => e.status === "active").length,
        designations: [],
        employees: unassignedEmps,
      });
    }

    return {
      departments: departmentNodes,
      totalDepartments: departments.length,
      totalEmployees: employees.length,
    };
  }

  /**
   * Summary overview metrics for top KPI cards.
   */
  static async getHierarchySummary(tenantId: string, dbOverride?: any) {
    const db = dbOverride || getTenantDb();

    const [branches, departments, designations, employees] = await Promise.all([
      db.branch.count({ where: { tenantId } }),
      db.department.count({ where: { tenantId } }),
      db.designation.count({ where: { tenantId } }),
      db.employee.findMany({
        where: { tenantId },
        select: { id: true, status: true, managerId: true },
      }),
    ]);

    const activeEmployees = employees.filter((e: any) => e.status === "active").length;
    const managers = new Set(employees.filter((e: any) => e.managerId).map((e: any) => e.managerId));
    const topExecutives = employees.filter((e: any) => !e.managerId && e.status === "active").length;

    // Calculate max depth
    const parentMap = new Map<string, string | null>();
    employees.forEach((e: any) => parentMap.set(e.id, e.managerId));

    let maxDepth = 0;
    employees.forEach((e: any) => {
      let d = 0;
      let curr = e.managerId;
      const visited = new Set<string>();
      while (curr && !visited.has(curr) && d < 50) {
        visited.add(curr);
        curr = parentMap.get(curr) || null;
        d++;
      }
      if (d > maxDepth) maxDepth = d;
    });

    return {
      totalEmployees: employees.length,
      activeEmployees,
      totalDepartments: departments,
      totalBranches: branches,
      totalDesignations: designations,
      totalManagers: managers.size,
      topExecutivesCount: topExecutives,
      maxHierarchyDepth: maxDepth + 1, // 1-based level count
    };
  }

  /**
   * Retrieves safe detailed profile for the Employee Slide-Over Drawer.
   * Strips all sensitive financial and statutory fields.
   */
  static async getEmployeeTreeDetail(tenantId: string, employeeId: string, dbOverride?: any) {
    const db = dbOverride || getTenantDb();

    const employee = await db.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: {
        id: true,
        tenantId: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        position: true,
        status: true,
        joinedAt: true,
        employmentType: true,
        department: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true, code: true, address: true } },
        designation: { select: { id: true, name: true } },
        user: {
          select: {
            profile: {
              select: {
                avatarUrl: true,
              },
            },
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            position: true,
            email: true,
            department: { select: { id: true, name: true } },
            designation: { select: { id: true, name: true } },
            user: {
              select: {
                profile: {
                  select: {
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        subordinates: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            position: true,
            status: true,
            email: true,
            designation: { select: { id: true, name: true } },
            user: {
              select: {
                profile: {
                  select: {
                    avatarUrl: true,
                  },
                },
              },
            },
          },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        },
      },
    });

    if (!employee) {
      return null;
    }

    // Build manager chain (ancestors up to CEO)
    const managerChain: Array<{ id: string; name: string; position: string; employeeCode: string }> = [];
    let currentManager = employee.manager;
    let depth = 0;
    const visited = new Set<string>();

    while (currentManager && depth < 20 && !visited.has(currentManager.id)) {
      visited.add(currentManager.id);
      managerChain.push({
        id: currentManager.id,
        name: `${currentManager.firstName} ${currentManager.lastName}`.trim(),
        position: currentManager.position || currentManager.designation?.name || "Manager",
        employeeCode: currentManager.employeeCode,
      });

      const nextMgr = await db.employee.findFirst({
        where: { id: currentManager.id, tenantId },
        select: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              position: true,
              designation: { select: { id: true, name: true } },
            },
          },
        },
      });

      currentManager = nextMgr?.manager as any;
      depth++;
    }

    return {
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeCode: employee.employeeCode,
      email: employee.email,
      phone: employee.phone,
      position: employee.position || employee.designation?.name || "Team Member",
      status: employee.status,
      joinedAt: employee.joinedAt,
      avatarUrl: employee.user?.profile?.avatarUrl || null,
      employmentType: employee.employmentType,
      department: employee.department,
      branch: employee.branch,
      designation: employee.designation,
      manager: employee.manager
        ? {
            id: employee.manager.id,
            name: `${employee.manager.firstName} ${employee.manager.lastName}`.trim(),
            employeeCode: employee.manager.employeeCode,
            position: employee.manager.position || employee.manager.designation?.name || "Manager",
            email: employee.manager.email,
            avatarUrl: employee.manager.user?.profile?.avatarUrl || null,
            department: employee.manager.department,
            designation: employee.manager.designation,
          }
        : null,
      managerChain,
      subordinates: (employee.subordinates || []).map((sub: any) => ({
        id: sub.id,
        name: `${sub.firstName} ${sub.lastName}`.trim(),
        employeeCode: sub.employeeCode,
        position: sub.position || sub.designation?.name || "Team Member",
        status: sub.status,
        email: sub.email,
        avatarUrl: sub.user?.profile?.avatarUrl || null,
        designation: sub.designation?.name || "General",
      })),
      directReportsCount: (employee.subordinates || []).length,
    };
  }
}
