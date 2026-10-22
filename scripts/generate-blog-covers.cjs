const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../CMS/public/images/blog');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const blogs = [
  {
    name: 'blog-1',
    category: 'GLOBAL PAYROLL & TAX',
    title: 'Automating Multi-Country Payroll in 2026',
    subtitle: 'Cross-border statutory compliance and automated multi-currency pay runs',
    gradient: ['#0f172a', '#1e293b', '#059669'],
    accent: '#10b981',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    icon: `<circle cx="680" cy="220" r="140" fill="none" stroke="#10b981" stroke-width="1.5" stroke-dasharray="6 6" opacity="0.4"/>
           <circle cx="680" cy="220" r="90" fill="none" stroke="#38bdf8" stroke-width="2" opacity="0.6"/>
           <rect x="620" y="160" width="120" height="120" rx="24" fill="#0f172a" stroke="#10b981" stroke-width="2"/>
           <path d="M650 220h60M680 190v60M660 200l40 40M660 240l40-40" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>`
  },
  {
    name: 'blog-2',
    category: 'ERP SYSTEMS',
    title: 'Next-Gen Payroll Engine 2027',
    subtitle: 'Sub-second pay run execution, real-time tax validation & cloud ledger settlement',
    gradient: ['#0f172a', '#1e1b4b', '#4338ca'],
    accent: '#6366f1',
    badgeBg: 'rgba(99, 102, 241, 0.15)',
    icon: `<circle cx="680" cy="220" r="140" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="8 8" opacity="0.4"/>
           <polygon points="680,120 780,220 680,320 580,220" fill="none" stroke="#818cf8" stroke-width="2" opacity="0.5"/>
           <rect x="630" y="170" width="100" height="100" rx="20" fill="#1e1b4b" stroke="#818cf8" stroke-width="2"/>
           <path d="M660 220l15 15 30-30" stroke="#a5b4fc" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`
  },
  {
    name: 'blog-3',
    category: 'WORKFORCE AI',
    title: '3 AI Skills You Need to Master in 2025',
    subtitle: 'Workflow automation, predictive decision modeling, and high-impact ops',
    gradient: ['#0f172a', '#2e1065', '#7c3aed'],
    accent: '#a855f7',
    badgeBg: 'rgba(168, 85, 247, 0.15)',
    icon: `<circle cx="680" cy="220" r="130" fill="none" stroke="#a855f7" stroke-width="2" opacity="0.4"/>
           <circle cx="680" cy="220" r="70" fill="#2e1065" stroke="#c084fc" stroke-width="2"/>
           <path d="M640 220a40 40 0 0 1 80 0a40 40 0 0 1-80 0" fill="none" stroke="#e9d5ff" stroke-width="3"/>
           <circle cx="680" cy="220" r="16" fill="#c084fc"/>
           <circle cx="610" cy="160" r="8" fill="#a855f7"/><circle cx="750" cy="160" r="8" fill="#a855f7"/><circle cx="680" cy="300" r="8" fill="#a855f7"/>`
  },
  {
    name: 'blog-4',
    category: 'AUTOMATION INSIGHTS',
    title: 'Automate Your Day with AI',
    subtitle: 'Practical playbooks to remove friction and save recurring operational hours',
    gradient: ['#0f172a', '#134e4a', '#0d9488'],
    accent: '#14b8a6',
    badgeBg: 'rgba(20, 184, 166, 0.15)',
    icon: `<circle cx="680" cy="220" r="140" fill="none" stroke="#14b8a6" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.5"/>
           <rect x="610" y="150" width="140" height="140" rx="28" fill="#134e4a" stroke="#2dd4bf" stroke-width="2"/>
           <path d="M680 180v45l30 20" stroke="#99f6e4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
           <circle cx="680" cy="220" r="6" fill="#5eead4"/>`
  },
  {
    name: 'blog-5',
    category: 'CULTURE & LEADERSHIP',
    title: 'Building an AI-Ready Culture in Your Team',
    subtitle: 'Enablement, psychological safety, and cross-functional automation habits',
    gradient: ['#0f172a', '#0c4a6e', '#0284c7'],
    accent: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    icon: `<circle cx="680" cy="220" r="130" fill="none" stroke="#38bdf8" stroke-width="1.5" opacity="0.4"/>
           <circle cx="680" cy="190" r="32" fill="#0c4a6e" stroke="#38bdf8" stroke-width="2"/>
           <path d="M635 270c0-25 20-45 45-45s45 20 45 45" fill="none" stroke="#7dd3fc" stroke-width="3" stroke-linecap="round"/>
           <circle cx="630" cy="210" r="20" fill="#0369a1" stroke="#38bdf8" stroke-width="1.5"/>
           <circle cx="730" cy="210" r="20" fill="#0369a1" stroke="#38bdf8" stroke-width="1.5"/>`
  },
  {
    name: 'blog-6',
    category: 'CONTENT & WORKFLOWS',
    title: 'The Future of AI Content Tools',
    subtitle: 'Connecting strategy, creation, and distribution with team guardrails built in',
    gradient: ['#0f172a', '#581c87', '#9333ea'],
    accent: '#c084fc',
    badgeBg: 'rgba(192, 132, 252, 0.15)',
    icon: `<rect x="610" y="150" width="140" height="140" rx="24" fill="#3b0764" stroke="#c084fc" stroke-width="2"/>
           <path d="M640 190h80M640 220h60M640 250h40" stroke="#e9d5ff" stroke-width="3.5" stroke-linecap="round"/>
           <polygon points="730,230 750,210 740,200 720,220" fill="#a855f7" stroke="#f3e8ff" stroke-width="1.5"/>`
  },
  {
    name: 'blog-7',
    category: 'CUSTOMER EXPERIENCE',
    title: 'Using AI to Personalize Customer Experiences at Scale',
    subtitle: 'Dynamic lifecycle messaging and real-time behavioral segmentation',
    gradient: ['#0f172a', '#831843', '#db2777'],
    accent: '#f472b6',
    badgeBg: 'rgba(244, 114, 182, 0.15)',
    icon: `<circle cx="680" cy="220" r="130" fill="none" stroke="#f472b6" stroke-width="1.5" stroke-dasharray="6 6" opacity="0.4"/>
           <rect x="620" y="160" width="120" height="120" rx="24" fill="#500724" stroke="#f472b6" stroke-width="2"/>
           <path d="M680 190c-15-20-40 0-40 20c0 25 40 45 40 45s40-20 40-45c0-20-25-20-40-20z" fill="#f43f5e" opacity="0.8"/>`
  },
  {
    name: 'blog-8',
    category: 'GOVERNANCE & TRUST',
    title: 'Why Responsible AI Matters for Your Business',
    subtitle: 'Data privacy, operational guardrails, and audit trails for scalable AI adoption',
    gradient: ['#0f172a', '#1e293b', '#475569'],
    accent: '#94a3b8',
    badgeBg: 'rgba(148, 163, 184, 0.15)',
    icon: `<circle cx="680" cy="220" r="130" fill="none" stroke="#94a3b8" stroke-width="1.5" opacity="0.4"/>
           <polygon points="680,150 740,180 740,240 680,280 620,240 620,180" fill="#1e293b" stroke="#cbd5e1" stroke-width="2"/>
           <path d="M660 215l15 15 30-30" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
  }
];

function xmlEscape(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

blogs.forEach(b => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 440" width="880" height="440">
  <defs>
    <linearGradient id="bg-${b.name}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${b.gradient[0]}" />
      <stop offset="50%" stop-color="${b.gradient[1]}" />
      <stop offset="100%" stop-color="${b.gradient[2]}" />
    </linearGradient>
    <radialGradient id="glow-${b.name}" cx="80%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${b.accent}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="${b.accent}" stop-opacity="0" />
    </radialGradient>
    <pattern id="grid-${b.name}" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.04)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="880" height="440" fill="url(#bg-${b.name})" />
  <rect width="880" height="440" fill="url(#grid-${b.name})" />
  <rect width="880" height="440" fill="url(#glow-${b.name})" />

  <!-- Accent glow orb -->
  <circle cx="700" cy="220" r="180" fill="${b.accent}" opacity="0.12" filter="blur(40px)" />

  <!-- Geometric Illustration -->
  ${b.icon}

  <!-- Content Group -->
  <g transform="translate(60, 80)">
    <!-- Category Badge -->
    <rect x="0" y="0" width="${b.category.length * 8.5 + 30}" height="32" rx="16" fill="${b.badgeBg}" stroke="${b.accent}" stroke-width="1"/>
    <text x="15" y="21" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="${b.accent}" letter-spacing="1">${xmlEscape(b.category)}</text>

    <!-- Title -->
    <text x="0" y="75" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800" fill="#ffffff" letter-spacing="-0.5">
      ${b.title.length > 32 ? `<tspan x="0" dy="0">${xmlEscape(b.title.substring(0, 32))}...</tspan>` : `<tspan x="0" dy="0">${xmlEscape(b.title)}</tspan>`}
    </text>

    <!-- Subtitle -->
    <text x="0" y="115" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="400" fill="#94a3b8">
      <tspan x="0" dy="0">${xmlEscape(b.subtitle.substring(0, 50))}</tspan>
      <tspan x="0" dy="22">${xmlEscape(b.subtitle.substring(50, 100))}</tspan>
    </text>

    <!-- Platform Brand Stamp -->
    <g transform="translate(0, 195)">
      <circle cx="10" cy="10" r="10" fill="#3b82f6"/>
      <path d="M6 10l3 3 5-6" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="28" y="14" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#cbd5e1">Master HRMS Editorial</text>
    </g>
  </g>
</svg>`;

  fs.writeFileSync(path.join(targetDir, `${b.name}.svg`), svg);
  // Also write as fallback if someone accesses .jpg
  fs.writeFileSync(path.join(targetDir, `${b.name}.jpg`), svg);
  fs.writeFileSync(path.join(targetDir, `${b.name}.png`), svg);
});

console.log('Successfully generated blog cover graphics in', targetDir);
