const fs = require('fs');

let code = fs.readFileSync('CMS/src/components/layout/AppShell.tsx', 'utf8');
if (!code.includes("'/verify-certificate'")) {
  code = code.replace(
    "  '/p',",
    "  '/p',\n  '/verify-certificate',"
  );
  fs.writeFileSync('CMS/src/components/layout/AppShell.tsx', code, 'utf8');
  console.log('Successfully updated AppShell.tsx with /verify-certificate');
}

