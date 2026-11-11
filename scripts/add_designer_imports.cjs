const fs = require('fs');

function addImports(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  if (!code.includes('import { resolveClientCertificateVerificationUrl }')) {
    code = code.replace(
      'import { toast } from "sonner";',
      'import { toast } from "sonner";\r\nimport { resolveClientCertificateVerificationUrl } from "@/lib/certificate-verification-resolver";\r\nimport { getCertificateAssetPreviewUrl } from "@/lib/certificate-asset-resolver";'
    );
    fs.writeFileSync(filePath, code, 'utf8');
    console.log(`Added resolvers to ${filePath}`);
  }
}

addImports('src/routes/_authenticated/hr/organization/certificate-designer/$templateId.tsx');
addImports('CMS/src/app/(workspace)/hr/organization/certificate-designer/[templateId]/page.tsx');

