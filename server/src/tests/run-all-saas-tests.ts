import { execSync } from "child_process";

const testFiles = [
  "server/src/tests/saas-foundation.test.ts",
  "server/src/tests/saas-billing.test.ts",
  "server/src/tests/saas-crm-relational.test.ts",
  "server/src/tests/saas-super-admin-real.test.ts",
  "server/src/tests/saas-portals.test.ts",
  "server/src/tests/saas-hr-workflows.test.ts",
  "server/src/tests/maintenance-mode-workflow.test.ts",
];

console.log("=================================================");
console.log("🚀 MASTER HRMS: FULL SAAS TEST SUITE RUNNER");
console.log("=================================================\n");

let passedCount = 0;
let failedCount = 0;

for (const file of testFiles) {
  console.log(`\n-------------------------------------------------`);
  console.log(`Running suite: ${file}`);
  console.log(`-------------------------------------------------`);
  try {
    const output = execSync(`npx tsx ${file}`, {
      stdio: "inherit",
      encoding: "utf-8",
    });
    passedCount++;
  } catch (err: any) {
    console.error(`❌ Suite failed: ${file}`);
    failedCount++;
  }
}

console.log("\n=================================================");
console.log(`🏁 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED out of ${testFiles.length} suites`);
console.log("=================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
