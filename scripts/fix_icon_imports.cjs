const fs = require('fs');

let cmsCode = fs.readFileSync('CMS/src/app/(workspace)/hr/organization/certificate-designer/[templateId]/page.tsx', 'utf8');

// Fix the import at top of CMS
cmsCode = cmsCode.replace(
  `import {
  FolderOpen,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter,
  Check,
  RefreshCw,
  Upload, useParams, useRouter } from "next/navigation";`,
  `import { useParams, useRouter } from "next/navigation";`
);

// Add icons to lucide-react in CMS
cmsCode = cmsCode.replace(
  `import {
  Type,`,
  `import {
  FolderOpen,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter,
  Check,
  RefreshCw,
  Upload,
  Type,`
);

fs.writeFileSync('CMS/src/app/(workspace)/hr/organization/certificate-designer/[templateId]/page.tsx', cmsCode, 'utf8');

// Check TanStack file as well
let tsCode = fs.readFileSync('src/routes/_authenticated/hr/organization/certificate-designer/$templateId.tsx', 'utf8');
tsCode = tsCode.replace(
  `import {
  FolderOpen,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter,
  Check,
  RefreshCw,
  Upload, createFileRoute, useNavigate } from "@tanstack/react-router";`,
  `import { createFileRoute, useNavigate } from "@tanstack/react-router";`
);
tsCode = tsCode.replace(
  `import {
  Type,`,
  `import {
  FolderOpen,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter,
  Check,
  RefreshCw,
  Upload,
  Type,`
);
fs.writeFileSync('src/routes/_authenticated/hr/organization/certificate-designer/$templateId.tsx', tsCode, 'utf8');

console.log('Fixed icon imports in CMS and TanStack');

