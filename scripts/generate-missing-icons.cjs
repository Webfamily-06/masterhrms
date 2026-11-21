const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const OUTPUT_DIRS = [
  path.resolve(__dirname, '../public/addons-icons'),
  path.resolve(__dirname, '../CMS/public/addons-icons'),
  path.resolve(__dirname, '../server/public/addons-icons'),
];

// Ensure all target directories exist
OUTPUT_DIRS.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Helper to wrap SVG in standard 128x128 canvas
function createSvg(bgGrad, content) {
  return `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity="0.18"/>
    </filter>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    ${bgGrad}
  </defs>
  <rect x="8" y="8" width="112" height="112" rx="28" fill="url(#bg)" filter="url(#shadow)"/>
  ${content}
</svg>`;
}

const iconsDef = [
  // 1. Free Addons (WorkDo Parity - Dark Teal Squircles with vivid accents)
  {
    filename: 'AIBusinessAdvisor.png',
    slug: 'ai-business-advisor',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#093e32"/><stop offset="100%" stop-color="#04201a"/></linearGradient>`,
      `<g stroke="#34d399" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <rect x="34" y="44" width="60" height="46" rx="10" stroke="#34d399"/>
        <path d="M64 26v18"/>
        <circle cx="64" cy="22" r="4" fill="#34d399"/>
        <circle cx="50" cy="62" r="3" fill="#34d399" stroke="none"/>
        <circle cx="78" cy="62" r="3" fill="#34d399" stroke="none"/>
        <path d="M52 76c4 4 20 4 24 0"/>
        <path d="M26 62h8M94 62h8"/>
      </g>`
    )
  },
  {
    filename: 'SmartDashboardAnalytics.png',
    slug: 'smart-dashboard',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0a3539"/><stop offset="100%" stop-color="#041b1d"/></linearGradient>`,
      `<g>
        <rect x="36" y="36" width="24" height="24" rx="6" fill="#2dd4bf"/>
        <rect x="68" y="36" width="24" height="24" rx="6" fill="#38bdf8"/>
        <rect x="36" y="68" width="24" height="24" rx="6" fill="#fbbf24"/>
        <rect x="68" y="68" width="24" height="24" rx="6" fill="#34d399"/>
      </g>`
    )
  },
  {
    filename: 'SmartReports.png',
    slug: 'smart-reports',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#082a39"/><stop offset="100%" stop-color="#03151c"/></linearGradient>`,
      `<g stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M42 28h30l20 20v52a6 6 0 0 1-6 6H42a6 6 0 0 1-6-6V34a6 6 0 0 1 6-6z"/>
        <path d="M72 28v20h20"/>
        <path d="M50 86v-12" stroke="#22d3ee" stroke-width="6"/>
        <path d="M64 86v-22" stroke="#34d399" stroke-width="6"/>
        <path d="M78 86v-30" stroke="#a78bfa" stroke-width="6"/>
      </g>`
    )
  },
  {
    filename: 'SuggestionBox.png',
    slug: 'suggestion-box',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#07382c"/><stop offset="100%" stop-color="#021c16"/></linearGradient>`,
      `<g stroke="#34d399" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M96 46L64 28 32 46v36l32 18 32-18V46z"/>
        <path d="M33 47l31 17 31-17"/>
        <path d="M64 64v35"/>
        <path d="M48 38l32 18" stroke="#a7f3d0" stroke-width="3"/>
      </g>`
    )
  },
  {
    filename: 'NoticeBoard.png',
    slug: 'notice-board',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#08352b"/><stop offset="100%" stop-color="#031a15"/></linearGradient>`,
      `<g stroke="#34d399" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <rect x="36" y="34" width="56" height="66" rx="8"/>
        <path d="M52 26h24v12H52z" fill="#0d4e41"/>
        <path d="M50 56h28M50 70h28M50 84h18" stroke="#6ee7b7" stroke-width="4"/>
      </g>`
    )
  },

  // 2. Google Calendar (Authentic Google palette)
  {
    filename: 'GoogleCalendar.png',
    slug: 'google-calendar',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f8fafc"/></linearGradient>`,
      `<g>
        <rect x="28" y="28" width="72" height="72" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
        <path d="M28 42c0-7.732 6.268-14 14-14h44c7.732 0 14 6.268 14 14v10H28V42z" fill="#1a73e8"/>
        <text x="64" y="82" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="34" font-weight="900" fill="#1a73e8" text-anchor="middle">31</text>
        <circle cx="44" cy="35" r="3" fill="#ffffff"/>
        <circle cx="84" cy="35" r="3" fill="#ffffff"/>
      </g>`
    )
  },

  // 3. TallyPrime (Gold & Navy Enterprise look)
  {
    filename: 'TallyPrime.png',
    slug: 'tally-importer',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffb300"/><stop offset="100%" stop-color="#e65100"/></linearGradient>`,
      `<g>
        <circle cx="64" cy="64" r="42" fill="#1e293b"/>
        <path d="M46 50h36v10H69v30H59V60H46V50z" fill="#ffb300"/>
        <path d="M76 68l10-10v20l-10-10z" fill="#38bdf8"/>
      </g>`
    )
  },

  // 4. AI Suite (AI Assistant, AI Document, Neural AI OCR)
  {
    filename: 'AIAssistant.png',
    slug: 'ai-assistant',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#4c1d95"/></linearGradient>`,
      `<g fill="none" stroke="#ede9fe" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M64 26l8 18 18 8-18 8-8 18-8-18-18-8 18-8 8-18z" fill="#c4b5fd" stroke="#ede9fe"/>
        <path d="M88 78l4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9z" fill="#a78bfa" stroke="#ede9fe"/>
        <path d="M38 74l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z" fill="#ddd6fe" stroke="#ede9fe"/>
      </g>`
    )
  },
  {
    filename: 'AIDocument.png',
    slug: 'ai-document',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#312e81"/></linearGradient>`,
      `<g fill="none" stroke="#e0e7ff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M42 26h30l22 22v50a6 6 0 0 1-6 6H42a6 6 0 0 1-6-6V32a6 6 0 0 1 6-6z"/>
        <path d="M72 26v22h22"/>
        <path d="M52 64h24M52 76h16M52 88h20"/>
        <circle cx="82" cy="78" r="14" fill="#a855f7" stroke="#ffffff" stroke-width="3"/>
        <path d="M82 70l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" fill="#ffffff" stroke="none"/>
      </g>`
    )
  },
  {
    filename: 'NeuralAIOCR.png',
    slug: 'ai-ocr',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#0369a1"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M36 46V36h10M82 36h10v10M92 82v10H82M46 92H36V82"/>
        <rect x="46" y="46" width="36" height="36" rx="4" stroke="#bae6fd" stroke-width="3"/>
        <path d="M30 64h68" stroke="#38bdf8" stroke-width="5" filter="url(#glow)"/>
        <circle cx="64" cy="64" r="6" fill="#38bdf8"/>
      </g>`
    )
  },

  // 5. HR Module Addons
  {
    filename: 'BiometricAttendance.png',
    slug: 'biometric-sync',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#14b8a6"/><stop offset="100%" stop-color="#0f766e"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round">
        <path d="M64 32c-15 0-26 11-26 26 0 13 8 26 18 36"/>
        <path d="M52 58c0-8 6-14 12-14s12 6 12 14c0 14-8 24-14 34"/>
        <path d="M64 70c2 5 2 11 0 18"/>
        <path d="M76 44c6 5 10 12 10 20 0 14-6 24-12 32"/>
        <path d="M64 52c-3 0-6 3-6 6 0 6 3 12 6 16"/>
      </g>`
    )
  },
  {
    filename: 'TimeTracker.png',
    slug: 'time-tracker',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#b45309"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="64" cy="68" r="32"/>
        <path d="M64 24v8M54 24h20M64 52v16l12 6"/>
        <path d="M86 38l6-6"/>
      </g>`
    )
  },
  {
    filename: 'TrainingModule.png',
    slug: 'training',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#1d4ed8"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M64 32L24 50l40 18 40-18L64 32z"/>
        <path d="M38 58v22c0 10 12 18 26 18s26-8 26-18V58"/>
        <path d="M104 53v28"/>
        <circle cx="104" cy="84" r="3" fill="#ffffff"/>
      </g>`
    )
  },
  {
    filename: 'TeamWorkload.png',
    slug: 'team-workload',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#0e7490"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="64" cy="42" r="12"/>
        <path d="M42 74c0-10 10-16 22-16s22 6 22 16"/>
        <circle cx="34" cy="50" r="8"/>
        <path d="M20 74c0-7 7-11 15-11"/>
        <circle cx="94" cy="50" r="8"/>
        <path d="M93 63c8 0 15 4 15 11"/>
        <path d="M30 92h68M48 92v-8M80 92v-8"/>
      </g>`
    )
  },
  {
    filename: 'PettyCash.png',
    slug: 'petty-cash',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#047857"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="28" y="42" width="72" height="44" rx="8"/>
        <circle cx="64" cy="64" r="12"/>
        <circle cx="42" cy="64" r="3" fill="#ffffff"/>
        <circle cx="86" cy="64" r="3" fill="#ffffff"/>
      </g>`
    )
  },
  {
    filename: 'RecruitmentATS.png',
    slug: 'recruitment-ats',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#4338ca"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="30" y="40" width="68" height="52" rx="10"/>
        <path d="M48 40V30a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v10"/>
        <circle cx="56" cy="66" r="10"/>
        <path d="M44 86c0-6 6-10 12-10"/>
        <circle cx="78" cy="64" r="8" stroke="#38bdf8" stroke-width="4"/>
        <path d="M84 70l10 10" stroke="#38bdf8" stroke-width="5"/>
      </g>`
    )
  },
  {
    filename: 'eBook.png',
    slug: 'ebook',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#c2410c"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M32 34a8 8 0 0 1 8-8h48v72H40a8 8 0 0 1-8-8V34z"/>
        <path d="M32 90h56"/>
        <path d="M46 44h28M46 56h28M46 68h16"/>
        <path d="M72 26v20l8-6 8 6V26" fill="#fde047" stroke="none"/>
      </g>`
    )
  },
  {
    filename: 'Procurement.png',
    slug: 'procurement',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#64748b"/><stop offset="100%" stop-color="#334155"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M26 44l38-16 38 16v40l-38 16-38-16V44z"/>
        <path d="M26 44l38 16 38-16"/>
        <path d="M64 60v40"/>
        <path d="M50 34l38 16M40 76l24 10 24-10"/>
      </g>`
    )
  },
  {
    filename: 'LearningLMS.png',
    slug: 'learning-lms',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#5b21b6"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="26" y="32" width="76" height="52" rx="8"/>
        <polygon points="56,46 76,58 56,70" fill="#ffffff" stroke="none"/>
        <path d="M44 94h40M64 84v10"/>
      </g>`
    )
  },
  {
    filename: 'PerformanceManagement.png',
    slug: 'okr-performance',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e11d48"/><stop offset="100%" stop-color="#9f1239"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="64" cy="64" r="36"/>
        <circle cx="64" cy="64" r="24"/>
        <circle cx="64" cy="64" r="10" fill="#ffffff"/>
        <path d="M96 32L64 64" stroke="#fecdd3" stroke-width="6"/>
      </g>`
    )
  },
  {
    filename: 'JobSearch.png',
    slug: 'job-search',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0284c7"/><stop offset="100%" stop-color="#0369a1"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="32" y="36" width="64" height="60" rx="8"/>
        <path d="M46 50h20M46 62h16M46 74h24"/>
        <circle cx="78" cy="68" r="16" fill="#0284c7" stroke="#38bdf8" stroke-width="5"/>
        <path d="M89 79l14 14" stroke="#38bdf8" stroke-width="6"/>
      </g>`
    )
  },

  // 6. Finance & Accounting Addons
  {
    filename: 'FinancialGoal.png',
    slug: 'financial-goal',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#059669"/><stop offset="100%" stop-color="#064e3b"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M42 34h44v24c0 14-10 24-22 24s-22-10-22-24V34z"/>
        <path d="M42 42H30c-4 0-6 4-6 8s4 12 12 12h6"/>
        <path d="M86 42h12c4 0 6 4 6 8s-4 12-12 12h-6"/>
        <path d="M64 82v14M48 96h32"/>
        <polygon points="64,44 68,52 76,52 70,58 72,66 64,60 56,66 58,58 52,52 60,52" fill="#fbbf24" stroke="none"/>
      </g>`
    )
  },
  {
    filename: 'MultiCurrencyFinancials.png',
    slug: 'multi-currency',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d97706"/><stop offset="100%" stop-color="#92400e"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="64" cy="64" r="36"/>
        <path d="M64 36v56M48 48h28c4 0 6 3 6 7s-3 7-8 7H52c-5 0-8 3-8 7s3 7 8 7h28"/>
        <path d="M96 46l6-6-6-6M32 82l-6 6 6 6"/>
      </g>`
    )
  },
  {
    filename: 'Assets.png',
    slug: 'asset-management',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#475569"/><stop offset="100%" stop-color="#1e293b"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="30" y="32" width="68" height="44" rx="6"/>
        <path d="M22 84h84a4 4 0 0 1 4 4v2H18v-2a4 4 0 0 1 4-4z"/>
        <line x1="58" y1="84" x2="70" y2="84" stroke="#94a3b8" stroke-width="4"/>
      </g>`
    )
  },
  {
    filename: 'BudgetPlanner.png',
    slug: 'budget-planner',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fb7185"/><stop offset="100%" stop-color="#be123c"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="64" cy="64" r="36"/>
        <path d="M64 28v36l26 26" stroke-width="5"/>
        <circle cx="64" cy="64" r="8" fill="#ffffff"/>
      </g>`
    )
  },
  {
    filename: 'EuropeanEInvoice.png',
    slug: 'einvoice-eu',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1d4ed8"/><stop offset="100%" stop-color="#1e3a8a"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="34" y="28" width="60" height="72" rx="8"/>
        <circle cx="64" cy="50" r="14" stroke="#fbbf24" stroke-width="3.5"/>
        <path d="M48 76h32M48 84h20" stroke="#93c5fd" stroke-width="4"/>
        <path d="M58 50h12M58 46h10M58 54h10" stroke="#fbbf24" stroke-width="2.5"/>
      </g>`
    )
  },
  {
    filename: 'ContactManagement.png',
    slug: 'contact-management',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#3730a3"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="32" y="28" width="68" height="72" rx="8"/>
        <circle cx="64" cy="52" r="12"/>
        <path d="M46 80c0-8 8-12 18-12s18 4 18 12"/>
        <path d="M26 40h6M26 54h6M26 68h6" stroke-width="5"/>
      </g>`
    )
  },
  {
    filename: 'AssetBorrowRent.png',
    slug: 'asset-borrow-rent',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0d9488"/><stop offset="100%" stop-color="#115e59"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="30" y="38" width="68" height="46" rx="8"/>
        <circle cx="50" cy="61" r="8"/>
        <path d="M58 61h22M72 53l8 8-8 8"/>
        <path d="M44 38V28a4 4 0 0 1 4-4h32a4 4 0 0 1 4 4v10"/>
      </g>`
    )
  },
  {
    filename: 'Retainer.png',
    slug: 'retainer',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#b45309"/><stop offset="100%" stop-color="#78350f"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M64 26L32 40v26c0 22 18 34 32 38 14-4 32-16 32-38V40L64 26z"/>
        <path d="M52 62l8 8 16-16" stroke="#fef08a" stroke-width="5"/>
      </g>`
    )
  },
  {
    filename: 'RecurringInvoiceBill.png',
    slug: 'recurring-invoice-bill',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#059669"/><stop offset="100%" stop-color="#047857"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="36" y="28" width="56" height="72" rx="6"/>
        <path d="M48 46h32M48 58h20M48 70h16"/>
        <circle cx="78" cy="74" r="16" fill="#059669" stroke="#6ee7b7" stroke-width="4"/>
        <path d="M72 70a6 6 0 1 1-1 7l-3-2M84 78a6 6 0 1 1 1-7l3 2" stroke="#6ee7b7" stroke-width="3"/>
      </g>`
    )
  },
  {
    filename: 'Timesheet.png',
    slug: 'timesheet',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2563eb"/><stop offset="100%" stop-color="#1e40af"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="28" y="32" width="72" height="66" rx="8"/>
        <path d="M28 48h72M46 32v16M82 32v16"/>
        <path d="M44 64h8M60 64h8M76 64h8M44 78h8M60 78h8"/>
      </g>`
    )
  },
  {
    filename: 'Quotation.png',
    slug: 'quotation',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9333ea"/><stop offset="100%" stop-color="#6b21a8"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M40 32h48v64H40z"/>
        <path d="M50 48h28M50 60h28M50 72h18"/>
        <circle cx="76" cy="76" r="14" fill="#9333ea" stroke="#d8b4fe" stroke-width="3"/>
        <text x="76" y="82" font-family="sans-serif" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle">%</text>
      </g>`
    )
  },
  {
    filename: 'DoubleEntryAccounting.png',
    slug: 'accounting',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1e40af"/><stop offset="100%" stop-color="#172554"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M64 26v74M40 98h48M34 42l30-8 30 8"/>
        <path d="M34 42L22 66h24L34 42zM94 42L82 66h24L94 42z"/>
      </g>`
    )
  },
  {
    filename: 'ContractTemplate.png',
    slug: 'contract-billing',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#be123c"/><stop offset="100%" stop-color="#881337"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M36 28h42l18 18v54H36V28z"/>
        <path d="M78 28v18h18M48 50h24M48 62h32M48 74h20"/>
        <circle cx="76" cy="80" r="10" fill="#f43f5e" stroke="#ffffff" stroke-width="2.5"/>
      </g>`
    )
  },
  {
    filename: 'ContractLifecycle.png',
    slug: 'contracts',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e293b"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M42 36h32l16 16v40H42V36z"/>
        <path d="M74 36v16h16M52 56h18M52 68h24"/>
        <path d="M26 64a38 38 0 0 1 68-20M102 64a38 38 0 0 1-68 20" stroke="#38bdf8" stroke-width="4"/>
      </g>`
    )
  },

  // 7. Operations & Communication Addons
  {
    filename: 'RoadmapCentral.png',
    slug: 'roadmap-central',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a855f7"/><stop offset="100%" stop-color="#6b21a8"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M32 94C48 94 48 70 64 70s16-36 32-36" stroke-width="6"/>
        <circle cx="32" cy="94" r="8" fill="#a855f7" stroke="#ffffff" stroke-width="4"/>
        <circle cx="64" cy="70" r="8" fill="#a855f7" stroke="#ffffff" stroke-width="4"/>
        <circle cx="96" cy="34" r="8" fill="#a855f7" stroke="#ffffff" stroke-width="4"/>
        <path d="M96 26l8-6v16l-8-4" fill="#fbbf24" stroke="none"/>
      </g>`
    )
  },
  {
    filename: 'BusinessProcessMapping.png',
    slug: 'fbp',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0d9488"/><stop offset="100%" stop-color="#042f2e"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="28" y="28" width="28" height="24" rx="4"/>
        <polygon points="84,40 98,52 84,64 70,52"/>
        <rect x="28" y="76" width="28" height="24" rx="4"/>
        <path d="M56 40h14M84 64v24H56"/>
      </g>`
    )
  },
  {
    filename: 'CustomField.png',
    slug: 'custom-fields',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4f46e5"/><stop offset="100%" stop-color="#312e81"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="28" y="32" width="72" height="26" rx="6"/>
        <rect x="28" y="68" width="72" height="26" rx="6"/>
        <path d="M40 45h20M40 81h32"/>
        <circle cx="84" cy="45" r="4" fill="#818cf8"/>
        <circle cx="84" cy="81" r="4" fill="#818cf8"/>
      </g>`
    )
  },
  {
    filename: 'SidebarMenuBuilder.png',
    slug: 'sidebar-menu-builder',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#334155"/><stop offset="100%" stop-color="#0f172a"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="26" y="28" width="76" height="72" rx="8"/>
        <line x1="50" y1="28" x2="50" y2="100"/>
        <circle cx="38" cy="42" r="3" fill="#38bdf8"/>
        <circle cx="38" cy="56" r="3" fill="#38bdf8"/>
        <circle cx="38" cy="70" r="3" fill="#38bdf8"/>
        <path d="M60 42h26M60 56h18"/>
      </g>`
    )
  },
  {
    filename: 'RequestManagement.png',
    slug: 'request-management',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ea580c"/><stop offset="100%" stop-color="#9a3412"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M30 42h68M30 42l10 40h48l10-40"/>
        <path d="M48 62h32"/>
        <path d="M64 26v16M56 34l8 8 8-8"/>
      </g>`
    )
  },
  {
    filename: 'FormBuilder.png',
    slug: 'form-builder',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#065f46"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="30" y="26" width="68" height="76" rx="8"/>
        <rect x="42" y="38" width="44" height="12" rx="3" fill="#34d399" stroke="none"/>
        <circle cx="48" cy="62" r="5"/>
        <path d="M58 62h28"/>
        <circle cx="48" cy="78" r="5"/>
        <path d="M58 78h20"/>
      </g>`
    )
  },
  {
    filename: 'Portfolio.png',
    slug: 'portfolio',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f43f5e"/><stop offset="100%" stop-color="#9f1239"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="28" y="42" width="72" height="50" rx="8"/>
        <path d="M46 42V32a4 4 0 0 1 4-4h28a4 4 0 0 1 4 4v10"/>
        <circle cx="64" cy="64" r="8"/>
        <path d="M28 64h28M72 64h28"/>
      </g>`
    )
  },
  {
    filename: 'Diagram.png',
    slug: 'diagram',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#6d28d9"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="42" cy="42" r="12"/>
        <circle cx="86" cy="42" r="12"/>
        <circle cx="64" cy="86" r="12"/>
        <path d="M54 42h20M48 52l12 24M80 52L68 76"/>
      </g>`
    )
  },
  {
    filename: 'KnowledgeBase.png',
    slug: 'knowledge-base',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0284c7"/><stop offset="100%" stop-color="#075985"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M64 40c-10-8-22-8-34-8v58c12 0 24 2 34 8 10-6 22-8 34-8V32c-12 0-24 0-34 8z"/>
        <path d="M64 40v58"/>
      </g>`
    )
  },
  {
    filename: 'ResumeBuilder.png',
    slug: 'resume-builder',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1e3a8a"/><stop offset="100%" stop-color="#172554"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="32" y="26" width="64" height="76" rx="6"/>
        <circle cx="50" cy="44" r="8"/>
        <path d="M64 40h20M64 48h14M42 62h44M42 72h44M42 82h24"/>
      </g>`
    )
  },
  {
    filename: 'MarketingPlan.png',
    slug: 'marketing-plan',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#991b1b"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M34 68V48l36-14v48L34 68z"/>
        <path d="M70 42h16a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H70"/>
        <path d="M44 68v18a6 6 0 0 0 6 6h4"/>
      </g>`
    )
  },
  {
    filename: 'DigitalCertificate.png',
    slug: 'certificate-studio',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ca8a04"/><stop offset="100%" stop-color="#854d0e"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="28" y="28" width="72" height="56" rx="6"/>
        <path d="M42 44h44M42 54h30M42 64h22"/>
        <circle cx="76" cy="74" r="14" fill="#eab308" stroke="#ffffff" stroke-width="3"/>
        <path d="M72 86l-4 14 8-4 8 4-4-14"/>
      </g>`
    )
  },
  {
    filename: 'InnovationCenter.png',
    slug: 'innovation-center',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#eab308"/><stop offset="100%" stop-color="#a16207"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M64 28a24 24 0 0 0-16 42v10h32V70a24 24 0 0 0-16-42z"/>
        <path d="M52 86h24M56 94h16"/>
        <path d="M64 42v12M56 48l16 0"/>
      </g>`
    )
  },
  {
    filename: 'BusinessModelCanvas.png',
    slug: 'business-model',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#475569"/><stop offset="100%" stop-color="#1e293b"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
        <rect x="26" y="28" width="76" height="72" rx="6"/>
        <line x1="48" y1="28" x2="48" y2="76"/>
        <line x1="78" y1="28" x2="78" y2="76"/>
        <line x1="26" y1="76" x2="102" y2="76"/>
        <line x1="64" y1="76" x2="64" y2="100"/>
      </g>`
    )
  },
  {
    filename: 'Planning.png',
    slug: 'planning',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0284c7"/><stop offset="100%" stop-color="#0369a1"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="28" y="32" width="72" height="68" rx="8"/>
        <path d="M28 48h72M46 26v12M82 26v12"/>
        <circle cx="64" cy="72" r="14"/>
        <path d="M64 64v8l6 4"/>
      </g>`
    )
  },
  {
    filename: 'Inventory.png',
    slug: 'inventory-stock',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#b45309"/><stop offset="100%" stop-color="#78350f"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="30" y="52" width="32" height="32" rx="4"/>
        <rect x="66" y="52" width="32" height="32" rx="4"/>
        <rect x="48" y="26" width="32" height="32" rx="4"/>
        <path d="M48 42h32M30 68h32M66 68h32"/>
      </g>`
    )
  },
  {
    filename: 'RestaurantMenu.png',
    slug: 'restaurant-menu',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ea580c"/><stop offset="100%" stop-color="#9a3412"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M38 32v24a8 8 0 0 0 16 0V32M46 56v40M82 32v64M74 32c0 14 8 20 8 20"/>
      </g>`
    )
  },
  {
    filename: 'Feedback.png',
    slug: 'feedback',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ec4899"/><stop offset="100%" stop-color="#be185d"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M30 36h68a8 8 0 0 1 8 8v34a8 8 0 0 1-8 8H54l-18 14v-14h-6a8 8 0 0 1-8-8V44a8 8 0 0 1 8-8z"/>
        <path d="M48 58l6 6 16-16" stroke="#fbcfe8" stroke-width="5"/>
      </g>`
    )
  },
  {
    filename: 'Signature.png',
    slug: 'signature',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e293b"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M30 84c16-18 20-36 20-46 0-8-6-8-8 0s8 32 18 36c12 4 24-14 30-22 4-6 10-6 10 2s-10 18-20 22" stroke="#38bdf8" stroke-width="5"/>
        <line x1="26" y1="94" x2="102" y2="94" stroke="#64748b" stroke-width="4"/>
      </g>`
    )
  },
  {
    filename: 'Rotas.png',
    slug: 'shifts',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0284c7"/><stop offset="100%" stop-color="#0369a1"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="28" y="32" width="72" height="66" rx="8"/>
        <path d="M28 48h72M52 48v50M76 48v50"/>
      </g>`
    )
  },
  {
    filename: 'Reminder.png',
    slug: 'internal-reminders',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#eab308"/><stop offset="100%" stop-color="#ca8a04"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M64 30a20 20 0 0 0-20 20v18l-8 8v6h56v-6l-8-8V50a20 20 0 0 0-20-20z"/>
        <path d="M54 88a10 10 0 0 0 20 0"/>
      </g>`
    )
  },
  {
    filename: 'ActivityLog.png',
    slug: 'activity-logs',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#475569"/><stop offset="100%" stop-color="#1e293b"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="64" cy="64" r="34"/>
        <path d="M64 42v22l14 10"/>
        <path d="M30 64a34 34 0 0 1 6-18l-8-2"/>
      </g>`
    )
  },
  {
    filename: 'APIModule.png',
    slug: 'public-api',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#059669"/><stop offset="100%" stop-color="#064e3b"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M46 44L28 64l18 20M82 44l18 20-18 20M68 36l-8 56"/>
      </g>`
    )
  },
  {
    filename: 'Notes.png',
    slug: 'notes',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#facc15"/><stop offset="100%" stop-color="#ca8a04"/></linearGradient>`,
      `<g fill="none" stroke="#713f12" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M34 28h44l16 16v56H34V28z" fill="#fef08a"/>
        <path d="M78 28v16h16"/>
        <path d="M46 52h32M46 66h32M46 80h18"/>
      </g>`
    )
  },
  {
    filename: 'CustomAlert.png',
    slug: 'custom-alert',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#dc2626"/><stop offset="100%" stop-color="#991b1b"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M64 28L24 96h80L64 28z"/>
        <line x1="64" y1="50" x2="64" y2="72" stroke-width="5"/>
        <circle cx="64" cy="84" r="3" fill="#ffffff"/>
      </g>`
    )
  },
  {
    filename: 'EnterpriseBusinessPlan.png',
    slug: 'business-plan',
    svg: createSvg(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1e3a8a"/><stop offset="100%" stop-color="#0f172a"/></linearGradient>`,
      `<g fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M32 94V48l32-16 32 16v46"/>
        <path d="M46 94V62h36v32"/>
        <circle cx="64" cy="48" r="6" fill="#fbbf24"/>
      </g>`
    )
  }
];

async function generateAll() {
  console.log(`Generating ${iconsDef.length} professional 128x128 PNG icons...`);

  for (const item of iconsDef) {
    const pngBuffer = await sharp(Buffer.from(item.svg))
      .resize(128, 128)
      .png()
      .toBuffer();

    // Write to all 3 public icon directories
    for (const outDir of OUTPUT_DIRS) {
      fs.writeFileSync(path.join(outDir, item.filename), pngBuffer);
    }

    // Update database record
    const iconPath = `/addons-icons/${item.filename}`;
    await prisma.addon.updateMany({
      where: { slug: item.slug },
      data: { icon: iconPath }
    });

    console.log(`✓ Generated & updated DB: ${item.slug} -> ${iconPath}`);
  }

  const totalWithIcons = await prisma.addon.count({
    where: { icon: { startsWith: '/addons-icons/' } }
  });

  console.log(`\nAll icons generated! Addons with /addons-icons/ in DB: ${totalWithIcons}/140`);
}

generateAll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
