const jwt = require("jsonwebtoken");
const http = require("http");

const secret = "master-hrms-jwt-super-secret-key-change-this-in-production";
const token = jwt.sign({
  userId: "user-hr-001",
  email: "hr@masterhrms.com",
  tenantId: "tenant-default-001",
  roles: ["HR_MANAGER", "ADMIN"],
  sessionId: "850fb32a-0ced-4ebe-9220-3273f653f3fb"
}, secret, { algorithm: "HS256", expiresIn: "1h" });

const req = http.request({
  hostname: "localhost",
  port: 4000,
  path: "/api/certificate-studio/preview-context",
  method: "GET",
  headers: {
    "Authorization": "Bearer " + token,
    "x-tenant-id": "tenant-default-001"
  }
}, res => {
  let body = "";
  res.on("data", d => body += d);
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Raw body:", body);
    try {
      const parsed = JSON.parse(body);
      console.log("Success:", parsed.success);
      console.log("Org:", parsed.context?.organization);
      console.log("Employees count:", parsed.context?.employees?.length);
      console.log("Sample employee:", parsed.context?.employees?.[0]);
      console.log("Awards count:", parsed.context?.awards?.length);
      console.log("Branding:", parsed.context?.branding);
      console.log("Signatories:", parsed.context?.signatories);
      console.log("Sample Certificate:", parsed.context?.sampleCertificate);
    } catch (e) {}
  });
});
req.on("error", e => console.error(e));
req.end();
