const fs = require('fs');

const pages = [
  {
    path: 'CMS/src/app/auth/page.tsx',
    title: 'Sign In — MasterHRMS Enterprise Portal',
    desc: 'Sign in to your enterprise MasterHRMS workforce workspace.'
  },
  {
    path: 'CMS/src/app/login/page.tsx',
    title: 'Sign In — MasterHRMS Enterprise Portal',
    desc: 'Sign in to your enterprise MasterHRMS workforce workspace.'
  },
  {
    path: 'CMS/src/app/signup/page.tsx',
    title: 'Create Account — MasterHRMS Enterprise Portal',
    desc: 'Sign up for your MasterHRMS enterprise workspace account.'
  },
  {
    path: 'CMS/src/app/register/page.tsx',
    title: 'Create Account — MasterHRMS Enterprise Portal',
    desc: 'Sign up for your MasterHRMS enterprise workspace account.'
  },
  {
    path: 'CMS/src/app/reset-password/page.tsx',
    title: 'Reset Password — MasterHRMS Enterprise Portal',
    desc: 'Enter your new workspace account password.'
  },
  {
    path: 'CMS/src/app/verify-2fa/page.tsx',
    title: 'Two-Factor Authentication — MasterHRMS',
    desc: 'Enter your 6-digit verification code to complete sign in.'
  },
  {
    path: 'CMS/src/app/verify-email/page.tsx',
    title: 'Verify Email — MasterHRMS',
    desc: 'Confirm your work email with the 6-digit verification code.'
  },
  {
    path: 'CMS/src/app/lock-screen/page.tsx',
    title: 'Session Locked — MasterHRMS',
    desc: 'Workspace session temporarily locked for security.'
  }
];

for (const p of pages) {
  if (!fs.existsSync(p.path)) continue;
  let c = fs.readFileSync(p.path, 'utf8');
  const metaRegex = /export const metadata: Metadata = \{[\s\S]*?\};/;
  const replacement = `export const metadata: Metadata = {\n  title: '${p.title}',\n  description: '${p.desc}',\n  robots: {\n    index: false,\n    follow: false,\n  },\n};`;
  if (metaRegex.test(c)) {
    c = c.replace(metaRegex, replacement);
    fs.writeFileSync(p.path, c, 'utf8');
    console.log(`Updated auth metadata in ${p.path}`);
  } else {
    console.warn(`No metadata found in ${p.path}`);
  }
}

