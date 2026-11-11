const fs = require('fs');
const path = require('path');

const files = [
  path.resolve('src/routes/_authenticated/hr/organization/certificate-designer/$templateId.tsx'),
  path.resolve('CMS/src/app/(workspace)/hr/organization/certificate-designer/[templateId]/page.tsx')
];

for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('const [previewSampleData, setPreviewSampleData] = useState(false);')) {
    content = content.replace(
      'const [previewSampleData, setPreviewSampleData] = useState(false);',
      'const [previewSampleData, setPreviewSampleData] = useState(true);'
    );
    fs.writeFileSync(f, content, 'utf8');
    console.log(`[${path.basename(f)}] Defaulted previewSampleData to true`);
  } else {
    console.warn(`[${path.basename(f)}] Snippet not found`);
  }
}

