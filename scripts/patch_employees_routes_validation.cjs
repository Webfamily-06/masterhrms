const fs = require('fs');
const file = 'server/src/routes/employees.routes.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('createEmployeeSchema')) {
  code = `import { createEmployeeSchema, updateEmployeeSchema } from "../schemas/employee.schema";\nimport { validateBody } from "../middleware/validate.middleware";\n` + code;
}

code = code.replace(
  'employeesRouter.post("/", requireAuth, requirePermission("hrm.employees.create"), requireWithinLimit("seats"), async',
  'employeesRouter.post("/", requireAuth, requirePermission("hrm.employees.create"), requireWithinLimit("seats"), validateBody(createEmployeeSchema), async'
);

code = code.replace(
  'employeesRouter.put("/:id", requireAuth, requirePermission("hrm.employees.edit"), async',
  'employeesRouter.put("/:id", requireAuth, requirePermission("hrm.employees.edit"), validateBody(updateEmployeeSchema), async'
);

fs.writeFileSync(file, code, 'utf8');
console.log('Successfully attached Zod validation to employees.routes.ts');

