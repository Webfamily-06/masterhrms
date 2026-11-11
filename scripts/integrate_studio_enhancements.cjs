const fs = require('fs');

function enhanceFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Add import for resolveClientCertificateVerificationUrl
  if (!code.includes('resolveClientCertificateVerificationUrl')) {
    code = code.replace(
      'import { getCertificateAssetPreviewUrl',
      'import { resolveClientCertificateVerificationUrl } from "@/lib/certificate-verification-resolver";\nimport { getCertificateAssetPreviewUrl'
    );
  }

  // 2. Add replace dialog state & text edit state if not present
  if (!code.includes('isReplaceLogoModalOpen')) {
    const targetState = 'const [clipboardElement, setClipboardElement] = useState<any | null>(null);';
    const addedState = `const [clipboardElement, setClipboardElement] = useState<any | null>(null);
  const [editingTextElementId, setEditingTextElementId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState("");
  const [isReplaceLogoModalOpen, setIsReplaceLogoModalOpen] = useState(false);
  const [primaryLogoAsset, setPrimaryLogoAsset] = useState<any | null>(null);`;
    code = code.replace(targetState, addedState);
  }

  // 3. Update SAMPLE_DATA verificationUrl dynamically
  if (code.includes('"https://masterhrms.io/verify-certificate?code=VERIFY-9C81B27D8310E476A841"')) {
    code = code.replace(
      '"https://masterhrms.io/verify-certificate?code=VERIFY-9C81B27D8310E476A841"',
      'resolveClientCertificateVerificationUrl("VERIFY-9C81B27D8310E476A841")'
    );
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`Updated initial states in ${filePath}`);
}

enhanceFile('src/routes/_authenticated/hr/organization/certificate-designer/$templateId.tsx');
enhanceFile('CMS/src/app/(workspace)/hr/organization/certificate-designer/[templateId]/page.tsx');

