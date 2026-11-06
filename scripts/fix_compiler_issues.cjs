const fs = require('fs');

// 1. Fix server/src/services/files/files.service.ts
const filesServicePath = 'server/src/services/files/files.service.ts';
let fsContent = fs.readFileSync(filesServicePath, 'utf8');

if (!fsContent.includes('import { CertificateFolderService } from "./certificate-folder.service";')) {
  fsContent = 'import { CertificateFolderService } from "./certificate-folder.service";\r\n' + fsContent;
  fs.writeFileSync(filesServicePath, fsContent, 'utf8');
  console.log('Added CertificateFolderService import to files.service.ts');
}

// 2. Fix server/src/services/award-certificate.service.ts duplicate declarations
const awardCertPath = 'server/src/services/award-certificate.service.ts';
let acContent = fs.readFileSync(awardCertPath, 'utf8');

const dupBlock = `    // 7b. Legacy Storage fallback
    const uploadsRoot = getUploadsRoot();
    const relativeDir = path.join("tenants", tenantId, "awards", "certificates", certId);
    const absoluteDir = path.join(uploadsRoot, relativeDir);

    await fs.promises.mkdir(absoluteDir, { recursive: true });

    const fileName = \`certificate-\${certificateNumber}.pdf\`;
    const absoluteFilePath = path.join(absoluteDir, fileName);
    await fs.promises.writeFile(absoluteFilePath, pdfBuffer);

    const relativeStoragePath = path.join(relativeDir, fileName).replace(/\\\\/g, "/");`;

if (acContent.includes(dupBlock)) {
  acContent = acContent.replace(dupBlock, '');
  fs.writeFileSync(awardCertPath, acContent, 'utf8');
  console.log('Removed duplicate block in award-certificate.service.ts');
} else {
  // LF check
  const dupBlockLf = dupBlock.replace(/\r\n/g, '\n');
  if (acContent.includes(dupBlockLf)) {
    acContent = acContent.replace(dupBlockLf, '');
    fs.writeFileSync(awardCertPath, acContent, 'utf8');
    console.log('Removed duplicate block in award-certificate.service.ts (LF)');
  }
}
