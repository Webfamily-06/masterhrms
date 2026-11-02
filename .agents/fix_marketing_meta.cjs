const fs = require('fs');

const updates = [
  {
    path: 'CMS/src/app/about/page.tsx',
    title: 'About Us — MasterHRMS Enterprise Workforce Platform',
    desc: 'Learn how MasterHRMS streamlines workforce management, payroll compliance, and biometric attendance for modern global enterprises.',
    canonical: 'https://www.masterhrms.com/about'
  },
  {
    path: 'CMS/src/app/contact/page.tsx',
    title: 'Contact Sales & Enterprise Support — MasterHRMS',
    desc: 'Get in touch with MasterHRMS for enterprise workforce demos, custom deployment consultations, and dedicated support.',
    canonical: 'https://www.masterhrms.com/contact'
  },
  {
    path: 'CMS/src/app/pricing/page.tsx',
    title: 'Pricing & Enterprise Plans — MasterHRMS',
    desc: 'Flexible, transparent pricing for teams of any size. Explore MasterHRMS plans for automated payroll, shift scheduling, and HR compliance.',
    canonical: 'https://www.masterhrms.com/pricing'
  },
  {
    path: 'CMS/src/app/services/page.tsx',
    title: 'Enterprise Services & Modules — MasterHRMS',
    desc: 'Discover the full suite of MasterHRMS solutions: automated payroll, biometric time tracking, employee self-service, and leave management.',
    canonical: 'https://www.masterhrms.com/services'
  },
  {
    path: 'CMS/src/app/team/page.tsx',
    title: 'Leadership & Engineering Team — MasterHRMS',
    desc: 'Meet the executive leadership, systems architects, and engineering team building MasterHRMS.',
    canonical: 'https://www.masterhrms.com/team'
  },
];

for (const u of updates) {
  let content = fs.readFileSync(u.path, 'utf8');
  const regex = /export const metadata: Metadata = \{[\s\S]*?\};/;
  const replacement = `export const metadata: Metadata = {\n  ...generateMetadata(\n    '${u.title}',\n    '${u.desc}',\n    '${u.canonical}'\n  ),\n};`;
  if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(u.path, content, 'utf8');
    console.log(`Updated metadata in ${u.path}`);
  } else {
    console.warn(`Regex did not match in ${u.path}`);
  }
}
