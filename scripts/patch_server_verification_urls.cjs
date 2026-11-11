const fs = require('fs');

// 1. Update server/src/routes/certificate-studio.routes.ts
let studioRoutes = fs.readFileSync('server/src/routes/certificate-studio.routes.ts', 'utf8');
if (!studioRoutes.includes('resolveCertificateVerificationUrl')) {
  studioRoutes = studioRoutes.replace(
    'import { CertificateFolderService } from "../services/files/certificate-folder.service";',
    'import { CertificateFolderService } from "../services/files/certificate-folder.service";\nimport { resolveCertificateVerificationUrl } from "../lib/certificate-verification-resolver";'
  );
  studioRoutes = studioRoutes.replace(
    '"{{certificate.verificationUrl}}": "https://masterhrms.io/verify-certificate?code=PREVIEW"',
    '"{{certificate.verificationUrl}}": resolveCertificateVerificationUrl("PREVIEW")'
  );
  fs.writeFileSync('server/src/routes/certificate-studio.routes.ts', studioRoutes, 'utf8');
  console.log('Updated server/src/routes/certificate-studio.routes.ts');
}

// 2. Update server/src/services/award-certificate.service.ts
let awardService = fs.readFileSync('server/src/services/award-certificate.service.ts', 'utf8');
if (!awardService.includes('resolveCertificateVerificationUrl')) {
  awardService = awardService.replace(
    'import { CertificateStudioService } from "./certificate-studio.service";',
    'import { CertificateStudioService } from "./certificate-studio.service";\nimport { resolveCertificateVerificationUrl } from "../lib/certificate-verification-resolver";'
  );
  awardService = awardService.replace(
    'const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";\n    const verificationUrl = `${baseUrl}/verify-certificate?code=${verificationCode}`;',
    'const verificationUrl = resolveCertificateVerificationUrl(verificationCode);'
  );
  // Also check CRLF version
  awardService = awardService.replace(
    'const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";\r\n    const verificationUrl = `${baseUrl}/verify-certificate?code=${verificationCode}`;',
    'const verificationUrl = resolveCertificateVerificationUrl(verificationCode);'
  );
  fs.writeFileSync('server/src/services/award-certificate.service.ts', awardService, 'utf8');
  console.log('Updated server/src/services/award-certificate.service.ts');
}

// 3. Update server/src/services/certificate-studio.service.ts
let studioService = fs.readFileSync('server/src/services/certificate-studio.service.ts', 'utf8');
if (!studioService.includes('resolveCertificateVerificationUrl')) {
  studioService = studioService.replace(
    'import PDFDocument from "pdfkit";',
    'import PDFDocument from "pdfkit";\nimport { resolveCertificateVerificationUrl } from "../lib/certificate-verification-resolver";'
  );
  studioService = studioService.replace(
    'sample: "https://masterhrms.io/verify-certificate?code=VERIFY-9C81B27D8310E476A841"',
    'sample: resolveCertificateVerificationUrl("VERIFY-9C81B27D8310E476A841")'
  );
  studioService = studioService.replace(
    'const qrText = context["{{certificate.verificationUrl}}"] || "https://masterhrms.io/verify";',
    'const qrText = context["{{certificate.verificationUrl}}"] || resolveCertificateVerificationUrl("VERIFY-CODE");'
  );
  fs.writeFileSync('server/src/services/certificate-studio.service.ts', studioService, 'utf8');
  console.log('Updated server/src/services/certificate-studio.service.ts');
}

