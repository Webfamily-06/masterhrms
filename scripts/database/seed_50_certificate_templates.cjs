const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CATEGORIES = {
  APPRECIATION: 'Employee Appreciation',
  EXCELLENCE: 'Employee Excellence',
  LEADERSHIP: 'Leadership & Performance',
  LONG_SERVICE: 'Long Service Recognition',
  TRAINING: 'Training & Development Completion',
  INNOVATION: 'Innovation & Special Recognition',
  TEAM: 'Team Achievement',
  CORPORATE: 'Corporate / Special Achievement'
};

// 50 Genuinely Distinct Template Definitions
const TEMPLATES_SPEC = [
  // 1-8: Employee Appreciation (8)
  {
    id: 'sys-tpl-apprec-01',
    name: 'Executive Sapphire Appreciation',
    category: CATEGORIES.APPRECIATION,
    orientation: 'LANDSCAPE',
    style: 'Blue corporate',
    primaryColor: '#1E3A8A',
    secondaryColor: '#D97706',
    bgColor: '#FFFFFF',
    fontTitle: 'Cinzel',
    fontBody: 'Inter',
    tags: ['corporate', 'sapphire', 'formal', 'appreciation']
  },
  {
    id: 'sys-tpl-apprec-02',
    name: 'Emerald Heritage Recognition',
    category: CATEGORIES.APPRECIATION,
    orientation: 'LANDSCAPE',
    style: 'Elegant classic',
    primaryColor: '#065F46',
    secondaryColor: '#B45309',
    bgColor: '#FDFBF7',
    fontTitle: 'Playfair Display',
    fontBody: 'Georgia',
    tags: ['classic', 'emerald', 'heritage', 'appreciation']
  },
  {
    id: 'sys-tpl-apprec-03',
    name: 'Modern Minimalist Gratitude',
    category: CATEGORIES.APPRECIATION,
    orientation: 'LANDSCAPE',
    style: 'Minimal corporate',
    primaryColor: '#18181B',
    secondaryColor: '#71717A',
    bgColor: '#FFFFFF',
    fontTitle: 'Inter',
    fontBody: 'Inter',
    tags: ['minimal', 'clean', 'modern', 'appreciation']
  },
  {
    id: 'sys-tpl-apprec-04',
    name: 'Imperial Gold Certificate of Thanks',
    category: CATEGORIES.APPRECIATION,
    orientation: 'LANDSCAPE',
    style: 'Luxury gold',
    primaryColor: '#92400E',
    secondaryColor: '#D97706',
    bgColor: '#FFFBEB',
    fontTitle: 'Cinzel',
    fontBody: 'Playfair Display',
    tags: ['gold', 'luxury', 'imperial', 'appreciation']
  },
  {
    id: 'sys-tpl-apprec-05',
    name: 'Nordic Clean Recognition',
    category: CATEGORIES.APPRECIATION,
    orientation: 'LANDSCAPE',
    style: 'Clean white',
    primaryColor: '#0F172A',
    secondaryColor: '#38BDF8',
    bgColor: '#F8FAFC',
    fontTitle: 'Montserrat',
    fontBody: 'Inter',
    tags: ['clean', 'nordic', 'contemporary']
  },
  {
    id: 'sys-tpl-apprec-06',
    name: 'Regal Crest Appreciation',
    category: CATEGORIES.APPRECIATION,
    orientation: 'PORTRAIT',
    style: 'Formal institutional',
    primaryColor: '#312E81',
    secondaryColor: '#C084FC',
    bgColor: '#FAF5FF',
    fontTitle: 'Playfair Display',
    fontBody: 'Georgia',
    tags: ['portrait', 'regal', 'formal', 'appreciation']
  },
  {
    id: 'sys-tpl-apprec-07',
    name: 'Crimson Velvet Gratitude',
    category: CATEGORIES.APPRECIATION,
    orientation: 'LANDSCAPE',
    style: 'Ornamental border',
    primaryColor: '#881337',
    secondaryColor: '#F59E0B',
    bgColor: '#FFF1F2',
    fontTitle: 'Cinzel',
    fontBody: 'Georgia',
    tags: ['crimson', 'ornamental', 'prestige']
  },
  {
    id: 'sys-tpl-apprec-08',
    name: 'Geometric Slate Distinction',
    category: CATEGORIES.APPRECIATION,
    orientation: 'LANDSCAPE',
    style: 'Modern geometric',
    primaryColor: '#334155',
    secondaryColor: '#0EA5E9',
    bgColor: '#FFFFFF',
    fontTitle: 'Montserrat',
    fontBody: 'Inter',
    tags: ['geometric', 'slate', 'modern']
  },

  // 9-16: Employee Excellence (8)
  {
    id: 'sys-tpl-excell-01',
    name: 'Presidential Gold Excellence',
    category: CATEGORIES.EXCELLENCE,
    orientation: 'LANDSCAPE',
    style: 'Luxury gold',
    primaryColor: '#78350F',
    secondaryColor: '#F59E0B',
    bgColor: '#FFFFFF',
    fontTitle: 'Cinzel',
    fontBody: 'Playfair Display',
    tags: ['gold', 'presidential', 'excellence']
  },
  {
    id: 'sys-tpl-excell-02',
    name: 'Midnight Black & Gold Star',
    category: CATEGORIES.EXCELLENCE,
    orientation: 'LANDSCAPE',
    style: 'Premium black and gold',
    primaryColor: '#09090B',
    secondaryColor: '#EAB308',
    bgColor: '#18181B',
    fontTitle: 'Cinzel',
    fontBody: 'Inter',
    tags: ['dark', 'black-gold', 'premium', 'excellence']
  },
  {
    id: 'sys-tpl-excell-03',
    name: 'Crown Royal Distinction',
    category: CATEGORIES.EXCELLENCE,
    orientation: 'LANDSCAPE',
    style: 'Executive formal',
    primaryColor: '#1E1B4B',
    secondaryColor: '#A855F7',
    bgColor: '#FDF4FF',
    fontTitle: 'Playfair Display',
    fontBody: 'Georgia',
    tags: ['crown', 'royal', 'distinction', 'excellence']
  },
  {
    id: 'sys-tpl-excell-04',
    name: 'Titanium Pinnacle Merit',
    category: CATEGORIES.EXCELLENCE,
    orientation: 'LANDSCAPE',
    style: 'Minimal corporate',
    primaryColor: '#1E293B',
    secondaryColor: '#64748B',
    bgColor: '#F1F5F9',
    fontTitle: 'Montserrat',
    fontBody: 'Inter',
    tags: ['titanium', 'modern', 'excellence']
  },
  {
    id: 'sys-tpl-excell-05',
    name: 'Artisan Bordered Honor',
    category: CATEGORIES.EXCELLENCE,
    orientation: 'PORTRAIT',
    style: 'Ornamental border',
    primaryColor: '#14532D',
    secondaryColor: '#CA8A04',
    bgColor: '#FEFCE8',
    fontTitle: 'Cinzel',
    fontBody: 'Georgia',
    tags: ['portrait', 'artisan', 'ornamental']
  },
  {
    id: 'sys-tpl-excell-06',
    name: 'Apex Horizon Achievement',
    category: CATEGORIES.EXCELLENCE,
    orientation: 'LANDSCAPE',
    style: 'Modern geometric',
    primaryColor: '#0C4A6E',
    secondaryColor: '#0284C7',
    bgColor: '#F0F9FF',
    fontTitle: 'Inter',
    fontBody: 'Inter',
    tags: ['apex', 'horizon', 'clean']
  },
  {
    id: 'sys-tpl-excell-07',
    name: 'Obsidian Prestige Honor',
    category: CATEGORIES.EXCELLENCE,
    orientation: 'LANDSCAPE',
    style: 'Dark premium',
    primaryColor: '#18181B',
    secondaryColor: '#F43F5E',
    bgColor: '#27272A',
    fontTitle: 'Montserrat',
    fontBody: 'Inter',
    tags: ['dark', 'obsidian', 'prestige']
  },
  {
    id: 'sys-tpl-excell-08',
    name: 'Grand Laurels Citation',
    category: CATEGORIES.EXCELLENCE,
    orientation: 'LANDSCAPE',
    style: 'Academic-inspired',
    primaryColor: '#451A03',
    secondaryColor: '#D97706',
    bgColor: '#FFFBEB',
    fontTitle: 'Cinzel',
    fontBody: 'Georgia',
    tags: ['laurels', 'academic', 'excellence']
  },

  // 17-22: Leadership & Performance (6)
  {
    id: 'sys-tpl-leader-01',
    name: 'Executive Vanguard Leadership',
    category: CATEGORIES.LEADERSHIP,
    orientation: 'LANDSCAPE',
    style: 'Executive formal',
    primaryColor: '#0F172A',
    secondaryColor: '#D97706',
    bgColor: '#FFFFFF',
    fontTitle: 'Cinzel',
    fontBody: 'Inter',
    tags: ['executive', 'vanguard', 'leadership']
  },
  {
    id: 'sys-tpl-leader-02',
    name: 'Director Sovereign Merit',
    category: CATEGORIES.LEADERSHIP,
    orientation: 'LANDSCAPE',
    style: 'Formal institutional',
    primaryColor: '#172554',
    secondaryColor: '#3B82F6',
    bgColor: '#EFF6FF',
    fontTitle: 'Playfair Display',
    fontBody: 'Georgia',
    tags: ['director', 'sovereign', 'performance']
  },
  {
    id: 'sys-tpl-leader-03',
    name: 'Strategic Visionary Award',
    category: CATEGORIES.LEADERSHIP,
    orientation: 'PORTRAIT',
    style: 'Modern typography',
    primaryColor: '#042F2E',
    secondaryColor: '#14B8A6',
    bgColor: '#F0FDFA',
    fontTitle: 'Montserrat',
    fontBody: 'Inter',
    tags: ['portrait', 'visionary', 'leadership']
  },
  {
    id: 'sys-tpl-leader-04',
    name: 'High Performance Mastery',
    category: CATEGORIES.LEADERSHIP,
    orientation: 'LANDSCAPE',
    style: 'Blue corporate',
    primaryColor: '#1D4ED8',
    secondaryColor: '#F59E0B',
    bgColor: '#FFFFFF',
    fontTitle: 'Inter',
    fontBody: 'Inter',
    tags: ['performance', 'mastery', 'kpi']
  },
  {
    id: 'sys-tpl-leader-05',
    name: 'Sterling Commander Distinction',
    category: CATEGORIES.LEADERSHIP,
    orientation: 'LANDSCAPE',
    style: 'Luxury gold',
    primaryColor: '#713F12',
    secondaryColor: '#EAB308',
    bgColor: '#FEF08A',
    fontTitle: 'Cinzel',
    fontBody: 'Playfair Display',
    tags: ['commander', 'sterling', 'leadership']
  },
  {
    id: 'sys-tpl-leader-06',
    name: 'Empowerment Catalyst Honor',
    category: CATEGORIES.LEADERSHIP,
    orientation: 'LANDSCAPE',
    style: 'Contemporary abstract',
    primaryColor: '#3B0764',
    secondaryColor: '#C026D3',
    bgColor: '#FAF5FF',
    fontTitle: 'Montserrat',
    fontBody: 'Inter',
    tags: ['catalyst', 'empowerment', 'abstract']
  },

  // 23-28: Long Service Recognition (6)
  {
    id: 'sys-tpl-service-01',
    name: 'Golden Jubilee Tenure of Honor',
    category: CATEGORIES.LONG_SERVICE,
    orientation: 'LANDSCAPE',
    style: 'Luxury gold',
    primaryColor: '#854D0E',
    secondaryColor: '#FACC15',
    bgColor: '#FEFCE8',
    fontTitle: 'Cinzel',
    fontBody: 'Playfair Display',
    tags: ['tenure', 'golden', 'jubilee', 'years']
  },
  {
    id: 'sys-tpl-service-02',
    name: 'Silver Pillar Decennial Service',
    category: CATEGORIES.LONG_SERVICE,
    orientation: 'LANDSCAPE',
    style: 'Executive formal',
    primaryColor: '#334155',
    secondaryColor: '#94A3B8',
    bgColor: '#F8FAFC',
    fontTitle: 'Playfair Display',
    fontBody: 'Georgia',
    tags: ['silver', 'pillar', '10years', 'service']
  },
  {
    id: 'sys-tpl-service-03',
    name: 'Centennial Foundation Tribute',
    category: CATEGORIES.LONG_SERVICE,
    orientation: 'LANDSCAPE',
    style: 'Formal institutional',
    primaryColor: '#1E293B',
    secondaryColor: '#D97706',
    bgColor: '#FFFFFF',
    fontTitle: 'Cinzel',
    fontBody: 'Georgia',
    tags: ['foundation', 'loyalty', 'loyalty-award']
  },
  {
    id: 'sys-tpl-service-04',
    name: 'Milestone Horizon Citation',
    category: CATEGORIES.LONG_SERVICE,
    orientation: 'PORTRAIT',
    style: 'Elegant classic',
    primaryColor: '#0F766E',
    secondaryColor: '#F59E0B',
    bgColor: '#F0FDFA',
    fontTitle: 'Playfair Display',
    fontBody: 'Georgia',
    tags: ['portrait', 'milestone', 'service']
  },
  {
    id: 'sys-tpl-service-05',
    name: 'Beacon of Dedication Award',
    category: CATEGORIES.LONG_SERVICE,
    orientation: 'LANDSCAPE',
    style: 'Blue corporate',
    primaryColor: '#1E40AF',
    secondaryColor: '#60A5FA',
    bgColor: '#EFF6FF',
    fontTitle: 'Cinzel',
    fontBody: 'Inter',
    tags: ['dedication', 'beacon', 'loyalty']
  },
  {
    id: 'sys-tpl-service-06',
    name: 'Legacy & Commitment Distinction',
    category: CATEGORIES.LONG_SERVICE,
    orientation: 'LANDSCAPE',
    style: 'Academic-inspired',
    primaryColor: '#581C87',
    secondaryColor: '#E9D5FF',
    bgColor: '#FAF5FF',
    fontTitle: 'Playfair Display',
    fontBody: 'Georgia',
    tags: ['legacy', 'commitment', 'honored']
  },

  // 29-34: Training & Development Completion (6)
  {
    id: 'sys-tpl-train-01',
    name: 'Professional Diploma of Completion',
    category: CATEGORIES.TRAINING,
    orientation: 'LANDSCAPE',
    style: 'Academic-inspired',
    primaryColor: '#1E3A8A',
    secondaryColor: '#CA8A04',
    bgColor: '#FFFFFF',
    fontTitle: 'Playfair Display',
    fontBody: 'Georgia',
    tags: ['diploma', 'completion', 'academic', 'training']
  },
  {
    id: 'sys-tpl-train-02',
    name: 'Mastery Certification of Skill',
    category: CATEGORIES.TRAINING,
    orientation: 'LANDSCAPE',
    style: 'Modern geometric',
    primaryColor: '#0284C7',
    secondaryColor: '#0D9488',
    bgColor: '#F0FDF4',
    fontTitle: 'Montserrat',
    fontBody: 'Inter',
    tags: ['skill', 'certification', 'mastery']
  },
  {
    id: 'sys-tpl-train-03',
    name: 'Academy Fellow Credential',
    category: CATEGORIES.TRAINING,
    orientation: 'PORTRAIT',
    style: 'Formal institutional',
    primaryColor: '#18181B',
    secondaryColor: '#D97706',
    bgColor: '#FFFBEB',
    fontTitle: 'Cinzel',
    fontBody: 'Georgia',
    tags: ['portrait', 'academy', 'fellow', 'credential']
  },
  {
    id: 'sys-tpl-train-04',
    name: 'Technical Competency Attestation',
    category: CATEGORIES.TRAINING,
    orientation: 'LANDSCAPE',
    style: 'Minimal corporate',
    primaryColor: '#0F172A',
    secondaryColor: '#38BDF8',
    bgColor: '#F8FAFC',
    fontTitle: 'Inter',
    fontBody: 'Inter',
    tags: ['competency', 'technical', 'attestation']
  },
  {
    id: 'sys-tpl-train-05',
    name: 'Executive Leadership Seminar Certificate',
    category: CATEGORIES.TRAINING,
    orientation: 'LANDSCAPE',
    style: 'Executive formal',
    primaryColor: '#312E81',
    secondaryColor: '#F59E0B',
    bgColor: '#EEF2FF',
    fontTitle: 'Cinzel',
    fontBody: 'Playfair Display',
    tags: ['seminar', 'executive', 'leadership']
  },
  {
    id: 'sys-tpl-train-06',
    name: 'Continuous Learning Badge of Merit',
    category: CATEGORIES.TRAINING,
    orientation: 'LANDSCAPE',
    style: 'Clean white',
    primaryColor: '#047857',
    secondaryColor: '#34D399',
    bgColor: '#FFFFFF',
    fontTitle: 'Montserrat',
    fontBody: 'Inter',
    tags: ['learning', 'upskilling', 'merit']
  },

  // 35-40: Innovation & Special Recognition (6)
  {
    id: 'sys-tpl-innov-01',
    name: 'Pioneer Horizon Innovation Award',
    category: CATEGORIES.INNOVATION,
    orientation: 'LANDSCAPE',
    style: 'Creative recognition',
    primaryColor: '#4338CA',
    secondaryColor: '#EC4899',
    bgColor: '#EEF2FF',
    fontTitle: 'Montserrat',
    fontBody: 'Inter',
    tags: ['pioneer', 'horizon', 'innovation']
  },
  {
    id: 'sys-tpl-innov-02',
    name: 'Breakthrough Creator Citation',
    category: CATEGORIES.INNOVATION,
    orientation: 'LANDSCAPE',
    style: 'Contemporary abstract',
    primaryColor: '#0E7490',
    secondaryColor: '#F97316',
    bgColor: '#FFFFFF',
    fontTitle: 'Inter',
    fontBody: 'Inter',
    tags: ['breakthrough', 'creator', 'technology']
  },
  {
    id: 'sys-tpl-innov-03',
    name: 'Cyber Luminary Special Honor',
    category: CATEGORIES.INNOVATION,
    orientation: 'LANDSCAPE',
    style: 'Dark premium',
    primaryColor: '#09090B',
    secondaryColor: '#06B6D4',
    bgColor: '#18181B',
    fontTitle: 'Montserrat',
    fontBody: 'Inter',
    tags: ['dark', 'cyber', 'luminary', 'special']
  },
  {
    id: 'sys-tpl-innov-04',
    name: 'Disruptive Thinker Distinction',
    category: CATEGORIES.INNOVATION,
    orientation: 'PORTRAIT',
    style: 'Modern typography',
    primaryColor: '#6D28D9',
    secondaryColor: '#A855F7',
    bgColor: '#FAF5FF',
    fontTitle: 'Montserrat',
    fontBody: 'Inter',
    tags: ['portrait', 'disruptive', 'thinker']
  },
  {
    id: 'sys-tpl-innov-05',
    name: 'Inventor Guild Laureate',
    category: CATEGORIES.INNOVATION,
    orientation: 'LANDSCAPE',
    style: 'Luxury gold',
    primaryColor: '#78350F',
    secondaryColor: '#F59E0B',
    bgColor: '#FEF3C7',
    fontTitle: 'Cinzel',
    fontBody: 'Georgia',
    tags: ['inventor', 'patent', 'laureate']
  },
  {
    id: 'sys-tpl-innov-06',
    name: 'Quantum Leap Initiative Award',
    category: CATEGORIES.INNOVATION,
    orientation: 'LANDSCAPE',
    style: 'Modern geometric',
    primaryColor: '#1E293B',
    secondaryColor: '#6366F1',
    bgColor: '#FFFFFF',
    fontTitle: 'Inter',
    fontBody: 'Inter',
    tags: ['quantum', 'leap', 'initiative']
  },

  // 41-45: Team Achievement (5)
  {
    id: 'sys-tpl-team-01',
    name: 'Synergy Champions Team Award',
    category: CATEGORIES.TEAM,
    orientation: 'LANDSCAPE',
    style: 'Blue corporate',
    primaryColor: '#1E3A8A',
    secondaryColor: '#38BDF8',
    bgColor: '#F0F9FF',
    fontTitle: 'Montserrat',
    fontBody: 'Inter',
    tags: ['team', 'synergy', 'champions']
  },
  {
    id: 'sys-tpl-team-02',
    name: 'Unified Triumph Collective Citation',
    category: CATEGORIES.TEAM,
    orientation: 'LANDSCAPE',
    style: 'Elegant classic',
    primaryColor: '#14532D',
    secondaryColor: '#D97706',
    bgColor: '#FDFBF7',
    fontTitle: 'Cinzel',
    fontBody: 'Georgia',
    tags: ['triumph', 'collective', 'team']
  },
  {
    id: 'sys-tpl-team-03',
    name: 'Sprint Victorious Squad Honor',
    category: CATEGORIES.TEAM,
    orientation: 'LANDSCAPE',
    style: 'Modern geometric',
    primaryColor: '#B91C1C',
    secondaryColor: '#F59E0B',
    bgColor: '#FEF2F2',
    fontTitle: 'Inter',
    fontBody: 'Inter',
    tags: ['sprint', 'squad', 'victorious']
  },
  {
    id: 'sys-tpl-team-04',
    name: 'Cross-Functional Vanguard Award',
    category: CATEGORIES.TEAM,
    orientation: 'PORTRAIT',
    style: 'Clean white',
    primaryColor: '#0F172A',
    secondaryColor: '#10B981',
    bgColor: '#FFFFFF',
    fontTitle: 'Montserrat',
    fontBody: 'Inter',
    tags: ['portrait', 'cross-functional', 'team']
  },
  {
    id: 'sys-tpl-team-05',
    name: 'Summit Collaboration Laurels',
    category: CATEGORIES.TEAM,
    orientation: 'LANDSCAPE',
    style: 'Luxury gold',
    primaryColor: '#78350F',
    secondaryColor: '#D97706',
    bgColor: '#FFFBEB',
    fontTitle: 'Cinzel',
    fontBody: 'Playfair Display',
    tags: ['summit', 'collaboration', 'laurels']
  },

  // 46-50: Corporate / Special Achievement (5)
  {
    id: 'sys-tpl-corp-01',
    name: 'Enterprise Chairman Medal of Honor',
    category: CATEGORIES.CORPORATE,
    orientation: 'LANDSCAPE',
    style: 'Executive formal',
    primaryColor: '#0A0A0A',
    secondaryColor: '#D97706',
    bgColor: '#FFFFFF',
    fontTitle: 'Cinzel',
    fontBody: 'Georgia',
    tags: ['chairman', 'enterprise', 'medal', 'corporate']
  },
  {
    id: 'sys-tpl-corp-02',
    name: 'Annual Pinnacle Gala Award',
    category: CATEGORIES.CORPORATE,
    orientation: 'LANDSCAPE',
    style: 'Premium black and gold',
    primaryColor: '#18181B',
    secondaryColor: '#FBBF24',
    bgColor: '#09090B',
    fontTitle: 'Cinzel',
    fontBody: 'Playfair Display',
    tags: ['dark', 'gala', 'pinnacle', 'black-gold']
  },
  {
    id: 'sys-tpl-corp-03',
    name: 'Corporate Ambassador of Excellence',
    category: CATEGORIES.CORPORATE,
    orientation: 'LANDSCAPE',
    style: 'Formal institutional',
    primaryColor: '#1E3A8A',
    secondaryColor: '#93C5FD',
    bgColor: '#EFF6FF',
    fontTitle: 'Playfair Display',
    fontBody: 'Georgia',
    tags: ['ambassador', 'excellence', 'corporate']
  },
  {
    id: 'sys-tpl-corp-04',
    name: 'Global Impact Citation of Distinction',
    category: CATEGORIES.CORPORATE,
    orientation: 'PORTRAIT',
    style: 'Ornamental border',
    primaryColor: '#4C1D95',
    secondaryColor: '#F59E0B',
    bgColor: '#FAF5FF',
    fontTitle: 'Cinzel',
    fontBody: 'Georgia',
    tags: ['portrait', 'global', 'impact', 'distinction']
  },
  {
    id: 'sys-tpl-corp-05',
    name: 'Diamond Jubilee Sovereign Laureate',
    category: CATEGORIES.CORPORATE,
    orientation: 'LANDSCAPE',
    style: 'Luxury gold',
    primaryColor: '#78350F',
    secondaryColor: '#FCD34D',
    bgColor: '#FEFCE8',
    fontTitle: 'Cinzel',
    fontBody: 'Playfair Display',
    tags: ['diamond', 'jubilee', 'sovereign', 'laureate']
  }
];

function buildDesignJson(tpl) {
  const isLandscape = tpl.orientation === 'LANDSCAPE';
  const width = isLandscape ? 841.89 : 595.28;
  const height = isLandscape ? 595.28 : 841.89;

  return {
    canvas: {
      width,
      height,
      unit: 'pt',
      orientation: tpl.orientation,
      backgroundColor: tpl.bgColor,
      primaryColor: tpl.primaryColor,
      secondaryColor: tpl.secondaryColor,
      fontTitle: tpl.fontTitle,
      fontBody: tpl.fontBody,
      style: tpl.style
    },
    elements: [
      // Outer Double Border
      {
        id: 'el-border-outer',
        type: 'shape',
        name: 'Outer Frame',
        shapeType: 'rectangle',
        x: 20,
        y: 20,
        width: width - 40,
        height: height - 40,
        stroke: tpl.primaryColor,
        strokeWidth: 3,
        fill: 'transparent',
        locked: true,
        zIndex: 1
      },
      {
        id: 'el-border-inner',
        type: 'shape',
        name: 'Inner Accent Line',
        shapeType: 'rectangle',
        x: 26,
        y: 26,
        width: width - 52,
        height: height - 52,
        stroke: tpl.secondaryColor,
        strokeWidth: 1,
        fill: 'transparent',
        locked: true,
        zIndex: 2
      },
      // Organization Logo placeholder
      {
        id: 'el-org-logo',
        type: 'logo',
        name: 'Organization Logo',
        x: width / 2 - 45,
        y: 42,
        width: 90,
        height: 40,
        placeholder: '{{organization.logo}}',
        align: 'center',
        zIndex: 10
      },
      // Header Ribbon / Organization Name
      {
        id: 'el-org-name',
        type: 'text',
        name: 'Organization Name',
        x: 60,
        y: 88,
        width: width - 120,
        height: 24,
        text: '{{organization.name}}',
        fontFamily: tpl.fontTitle,
        fontSize: 14,
        fontWeight: 'bold',
        color: tpl.primaryColor,
        textAlign: 'center',
        letterSpacing: 2,
        zIndex: 11
      },
      // Certificate Title
      {
        id: 'el-cert-title',
        type: 'text',
        name: 'Certificate Header',
        x: 60,
        y: 118,
        width: width - 120,
        height: 38,
        text: 'CERTIFICATE OF RECOGNITION',
        fontFamily: tpl.fontTitle,
        fontSize: 24,
        fontWeight: 'bold',
        color: tpl.primaryColor,
        textAlign: 'center',
        letterSpacing: 3,
        zIndex: 12
      },
      // Presentation Subtitle
      {
        id: 'el-cert-pres',
        type: 'text',
        name: 'Presentation Text',
        x: 80,
        y: 162,
        width: width - 160,
        height: 20,
        text: 'This prestigious honor is proudly conferred upon',
        fontFamily: tpl.fontBody,
        fontSize: 12,
        fontStyle: 'italic',
        color: tpl.primaryColor === '#18181B' && tpl.bgColor === '#09090B' ? '#A1A1AA' : '#4B5563',
        textAlign: 'center',
        zIndex: 13
      },
      // Recipient Name
      {
        id: 'el-recip-name',
        type: 'text',
        name: 'Recipient Name',
        x: 60,
        y: 194,
        width: width - 120,
        height: 44,
        text: '{{employee.name}}',
        fontFamily: tpl.fontTitle,
        fontSize: 28,
        fontWeight: 'bold',
        color: tpl.secondaryColor,
        textAlign: 'center',
        underline: true,
        zIndex: 14
      },
      // Award Title & Designation
      {
        id: 'el-award-title',
        type: 'text',
        name: 'Award Title',
        x: 80,
        y: 248,
        width: width - 160,
        height: 26,
        text: 'for extraordinary dedication & excellence as {{employee.designation}}',
        fontFamily: tpl.fontBody,
        fontSize: 13,
        fontWeight: 'medium',
        color: tpl.primaryColor,
        textAlign: 'center',
        zIndex: 15
      },
      // Citation Body / Award Description
      {
        id: 'el-award-desc',
        type: 'text',
        name: 'Citation Paragraph',
        x: 100,
        y: 282,
        width: width - 200,
        height: 50,
        text: 'In recognition of outstanding performance, leadership, and exemplary contributions to the mission and growth of {{organization.name}}.',
        fontFamily: tpl.fontBody,
        fontSize: 10,
        color: tpl.primaryColor === '#18181B' && tpl.bgColor === '#09090B' ? '#D4D4D8' : '#374151',
        textAlign: 'center',
        lineHeight: 1.4,
        zIndex: 16
      },
      // Left Signature (HR Director)
      {
        id: 'el-sig-hr',
        type: 'signature',
        name: 'HR Authority Signature',
        x: 75,
        y: height - 145,
        width: 160,
        height: 55,
        role: 'SIGNATURE_HR_MANAGER',
        signatoryName: 'Head of People & Culture',
        fontFamily: tpl.fontBody,
        zIndex: 20
      },
      // Center Official Seal
      {
        id: 'el-seal',
        type: 'seal',
        name: 'Official Seal',
        x: width / 2 - 35,
        y: height - 150,
        width: 70,
        height: 70,
        fill: tpl.secondaryColor,
        zIndex: 21
      },
      // Right Signature (CEO / Director)
      {
        id: 'el-sig-ceo',
        type: 'signature',
        name: 'Executive Leadership Signature',
        x: width - 235,
        y: height - 145,
        width: 160,
        height: 55,
        role: 'SIGNATURE_CEO',
        signatoryName: 'Chief Executive Officer',
        fontFamily: tpl.fontBody,
        zIndex: 22
      },
      // Verification QR Code & Number
      {
        id: 'el-qr',
        type: 'qrcode',
        name: 'Verification QR',
        x: width - 68,
        y: height - 68,
        width: 42,
        height: 42,
        placeholder: '{{certificate.verificationUrl}}',
        zIndex: 25
      },
      {
        id: 'el-cert-meta',
        type: 'text',
        name: 'Certificate ID & Date',
        x: 35,
        y: height - 42,
        width: width - 110,
        height: 16,
        text: 'Certificate ID: {{certificate.number}}  •  Issued: {{award.date}}  •  Authenticity: {{certificate.verificationCode}}',
        fontFamily: 'Inter',
        fontSize: 7.5,
        color: tpl.primaryColor === '#18181B' && tpl.bgColor === '#09090B' ? '#71717A' : '#9CA3AF',
        textAlign: 'left',
        zIndex: 26
      }
    ]
  };
}

async function seedTemplates() {
  console.log('================================================================');
  console.log('MASTERHRMS: SEEDING 50+ READY-MADE CERTIFICATE TEMPLATES');
  console.log('================================================================\n');

  let createdCount = 0;
  let updatedCount = 0;

  for (const tpl of TEMPLATES_SPEC) {
    const designJson = buildDesignJson(tpl);
    const versionId = 'ver-' + tpl.id + '-v1';

    // Upsert Template Record
    const template = await prisma.certificateTemplate.upsert({
      where: { id: tpl.id },
      create: {
        id: tpl.id,
        tenantId: null, // System template
        name: tpl.name,
        description: `Professional ${tpl.style} certificate template designed for ${tpl.category}.`,
        category: tpl.category,
        tags: tpl.tags,
        templateType: 'VISUAL_DESIGNER',
        pageSize: 'A4',
        orientation: tpl.orientation,
        status: 'PUBLISHED',
        isSystem: true,
        thumbnailUrl: `/images/templates/certificates/${tpl.id}.webp`,
        currentPublishedVersionId: versionId,
        createdBy: 'system'
      },
      update: {
        name: tpl.name,
        description: `Professional ${tpl.style} certificate template designed for ${tpl.category}.`,
        category: tpl.category,
        tags: tpl.tags,
        orientation: tpl.orientation,
        status: 'PUBLISHED',
        isSystem: true,
        currentPublishedVersionId: versionId
      }
    });

    // Upsert Version 1
    await prisma.certificateTemplateVersion.upsert({
      where: { id: versionId },
      create: {
        id: versionId,
        templateId: tpl.id,
        versionNumber: 1,
        designJson,
        placeholderSchema: [
          '{{employee.name}}',
          '{{employee.designation}}',
          '{{organization.name}}',
          '{{organization.logo}}',
          '{{award.title}}',
          '{{award.date}}',
          '{{certificate.number}}',
          '{{certificate.verificationCode}}',
          '{{certificate.verificationUrl}}'
        ],
        validationStatus: 'VALIDATED',
        publishedAt: new Date(),
        createdBy: 'system'
      },
      update: {
        designJson,
        validationStatus: 'VALIDATED',
        publishedAt: new Date()
      }
    });

    createdCount++;
  }

  console.log(`✔ Successfully seeded ${createdCount} system certificate templates.`);

  // Verify breakdown by category
  const categoriesInDb = await prisma.certificateTemplate.groupBy({
    by: ['category'],
    _count: { id: true },
    where: { isSystem: true }
  });

  console.log('\n--- Category Breakdown in Database ---');
  let grandTotal = 0;
  for (const cat of categoriesInDb) {
    console.log(`  • ${cat.category.padEnd(38)}: ${cat._count.id} templates`);
    grandTotal += cat._count.id;
  }
  console.log(`----------------------------------------------------------------`);
  console.log(`  TOTAL SYSTEM TEMPLATES               : ${grandTotal} templates\n`);
}

seedTemplates()
  .catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
