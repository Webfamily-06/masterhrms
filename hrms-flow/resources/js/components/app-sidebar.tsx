import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useLayout } from '@/contexts/LayoutContext';
import { useSidebarSettings } from '@/contexts/SidebarContext';
import { useBrand } from '@/contexts/BrandContext';
import { type NavItem } from '@/types';
import { Link, usePage, router } from '@inertiajs/react';
import { BookOpen, Folder, LayoutGrid, ShoppingBag, Users, Tag, FileIcon, Settings, BarChart, BarChart2, Barcode, FileText, Briefcase, CheckSquare, Calendar, CreditCard, Ticket, Gift, DollarSign, MessageSquare, CalendarDays, Palette, Image, Mail, Mail as VCard, ChevronDown, Building2, Globe, Clock, Timer, Coins, Fingerprint, RefreshCw, UserPlus, Package, Search, X, LogOut, User, HelpCircle, ChevronRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import AppLogo from './app-logo';
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { hasPermission } from '@/utils/authorization';
import { toast } from '@/components/custom-toast';
import { getImagePath } from '@/utils/helpers';
import { getCompanyId } from '@/utils/helpers';


export function AppSidebar() {
    const { t, i18n } = useTranslation();
    const { auth, globalSettings, companySlug } = usePage().props as any;
    const userRole = auth.user?.type || auth.user?.role;
    const permissions = auth?.permissions || [];
    const isSaas = globalSettings?.is_saas;

    // Get current direction
    const isRtl = document.documentElement.dir === 'rtl';

    // Business switch handler removed

    const getSuperAdminNavItems = (): NavItem[] => [
        {
            title: t('Dashboard'),
            href: route('dashboard'),
            icon: LayoutGrid,
            group: t('Overview'),
        },
        {
            title: t('Companies'),
            href: route('companies.index'),
            icon: Briefcase,
            group: t('Management'),
        },
        {
            title: t('Media Library'),
            href: route('media-library'),
            icon: Image,
            group: t('Management'),
        },
        {
            title: t('Plans'),
            icon: CreditCard,
            group: t('Management'),
            children: [
                { title: t('Plan'), href: route('plans.index') },
                { title: t('Plan Request'), href: route('plan-requests.index') },
                { title: t('Plan Orders'), href: route('plan-orders.index') }
            ]
        },
        {
            title: t('Coupons'),
            href: route('coupons.index'),
            icon: Settings,
            group: t('Management'),
        },
        {
            title: t('Currency'),
            href: route('currencies.index'),
            icon: DollarSign,
            group: t('Management'),
        },
        {
            title: t('Referral Program'),
            href: route('referral.index'),
            icon: Gift,
            group: t('Management'),
        },
        {
            title: t('Landing Page'),
            icon: Palette,
            group: t('Management'),
            children: [
                { title: t('Landing Page'), href: route('landing-page') },
                { title: t('Custom Pages'), href: route('landing-page.custom-pages.index') },
                ...(hasPermission(permissions, 'manage-contacts') ? [{ title: t('Contact Inquiries'), href: route('contacts.index') }] : []),
                ...(hasPermission(permissions, 'manage-newsletters') ? [{ title: t('Newsletter'), href: route('newsletters.index') }] : [])
            ]
        },
        {
            title: t('Settings'),
            href: route('settings'),
            icon: Settings,
            group: t('System Control'),
        }
    ];

    const buildCommonNavItems = (): NavItem[] => {
        const items: NavItem[] = [];

        // ── 1. OVERVIEW ──────────────────────────────────────────────────────
        if (hasPermission(permissions, 'manage-dashboard')) {
            items.push({ title: t('Dashboard'), href: route('dashboard'), icon: LayoutGrid, group: t('Overview') });
        }
        if (hasPermission(permissions, 'view-calendar') || hasPermission(permissions, 'manage-calendar')) {
            items.push({ title: t('Calendar'), href: route('calendar.index'), icon: CalendarDays, group: t('Overview') });
        }

        // ── 2. WORKFORCE MANAGEMENT ──────────────────────────────────────────
        if (hasPermission(permissions, 'manage-employees')) {
            items.push({ title: t('Employees'), href: route('hr.employees.index'), icon: Users, group: t('Workforce Management') });
        }

        if (hasPermission(permissions, 'manage-organization-chart')) {
            items.push({ title: t('Organization Chart'), href: route('hr.organization-chart.index'), icon: Building2, group: t('Workforce Management') });
        }

        const orgChildren: any[] = [];
        if (hasPermission(permissions, 'manage-branches')) orgChildren.push({ title: t('Branches'), href: route('hr.branches.index') });
        if (hasPermission(permissions, 'manage-departments')) orgChildren.push({ title: t('Departments'), href: route('hr.departments.index') });
        if (hasPermission(permissions, 'manage-designations')) orgChildren.push({ title: t('Designations'), href: route('hr.designations.index') });
        if (hasPermission(permissions, 'manage-holidays')) orgChildren.push({ title: t('Holidays'), href: route('hr.holidays.index') });
        if (hasPermission(permissions, 'manage-announcements')) orgChildren.push({ title: t('Announcements'), href: route('hr.announcements.index') });
        if (hasPermission(permissions, 'manage-award-types')) orgChildren.push({ title: t('Award Types'), href: route('hr.award-types.index') });
        if (hasPermission(permissions, 'manage-document-types')) orgChildren.push({ title: t('Document Types'), href: route('hr.document-types.index') });
        if (orgChildren.length > 0) items.push({ title: t('Organization Structure'), icon: Building2, children: orgChildren, group: t('Workforce Management') });

        const attendanceChildren: any[] = [];
        if (hasPermission(permissions, 'manage-attendance-records')) attendanceChildren.push({ title: t('Attendance Records'), href: route('hr.attendance-records.index') });
        if (hasPermission(permissions, 'manage-time-entries')) attendanceChildren.push({ title: t('Timesheet'), href: route('hr.time-entries.index') });
        if (hasPermission(permissions, 'manage-biometric-attendance')) attendanceChildren.push({ title: t('Biometric Attendance'), href: route('hr.biometric-attendance.index') });
        if (hasPermission(permissions, 'manage-attendance-regularizations')) attendanceChildren.push({ title: t('Attendance Regularizations'), href: route('hr.attendance-regularizations.index') });
        if (hasPermission(permissions, 'manage-shifts')) attendanceChildren.push({ title: t('Shifts'), href: route('hr.shifts.index') });
        if (hasPermission(permissions, 'manage-attendance-policies')) attendanceChildren.push({ title: t('Attendance Policies'), href: route('hr.attendance-policies.index') });
        if (attendanceChildren.length > 0) items.push({ title: t('Attendance'), icon: Clock, children: attendanceChildren, group: t('Workforce Management') });

        const leaveChildren: any[] = [];
        if (hasPermission(permissions, 'manage-leave-applications')) leaveChildren.push({ title: t('Leave Applications'), href: route('hr.leave-applications.index') });
        if (hasPermission(permissions, 'manage-leave-balances')) leaveChildren.push({ title: t('Leave Balances'), href: route('hr.leave-balances.index') });
        if (hasPermission(permissions, 'manage-leave-types')) leaveChildren.push({ title: t('Leave Types'), href: route('hr.leave-types.index') });
        if (hasPermission(permissions, 'manage-leave-policies')) leaveChildren.push({ title: t('Leave Policies'), href: route('hr.leave-policies.index') });
        if (leaveChildren.length > 0) items.push({ title: t('Leave Management'), icon: CalendarDays, children: leaveChildren, group: t('Workforce Management') });

        // ── 3. TALENT & GROWTH ───────────────────────────────────────────────
        const recruitmentChildren: any[] = [];

        // Daily Use / Core Flow
        if (hasPermission(permissions, 'manage-job-postings')) recruitmentChildren.push({ title: t('Job Postings'), href: route('hr.recruitment.job-postings.index') });
        if (hasPermission(permissions, 'manage-candidates')) recruitmentChildren.push({ title: t('Candidates'), href: route('hr.recruitment.candidates.index') });
        if (hasPermission(permissions, 'manage-interviews')) recruitmentChildren.push({ title: t('Interviews'), href: route('hr.recruitment.interviews.index') });
        // if (hasPermission(permissions, 'manage-interview-feedback')) recruitmentChildren.push({ title: t('Interview Feedback'), href: route('hr.recruitment.interview-feedback.index') });
        if (hasPermission(permissions, 'manage-offers')) recruitmentChildren.push({ title: t('Offers'), href: route('hr.recruitment.offers.index') });
        if (hasPermission(permissions, 'manage-candidate-onboarding')) recruitmentChildren.push({ title: t('Candidate Onboarding'), href: route('hr.recruitment.candidate-onboarding.index') });

        // Supporting Workflow
        if (hasPermission(permissions, 'manage-candidate-assessments')) recruitmentChildren.push({ title: t('Candidate Assessments'), href: route('hr.recruitment.candidate-assessments.index') });
        if (hasPermission(permissions, 'manage-onboarding-checklists')) recruitmentChildren.push({ title: t('Onboarding Checklists'), href: route('hr.recruitment.onboarding-checklists.index') });
        if (hasPermission(permissions, 'manage-checklist-items')) recruitmentChildren.push({ title: t('Checklist Items'), href: route('hr.recruitment.checklist-items.index') });
        if (hasPermission(permissions, 'manage-career-page') && companySlug) recruitmentChildren.push({ title: t('Career'), href: route('career.index', companySlug), target: '_blank' });

        // Setup / Configuration
        if (hasPermission(permissions, 'manage-job-categories')) recruitmentChildren.push({ title: t('Job Categories'), href: route('hr.recruitment.job-categories.index') });
        if (hasPermission(permissions, 'manage-job-types')) recruitmentChildren.push({ title: t('Job Types'), href: route('hr.recruitment.job-types.index') });
        if (hasPermission(permissions, 'manage-job-locations')) recruitmentChildren.push({ title: t('Job Locations'), href: route('hr.recruitment.job-locations.index') });
        if (hasPermission(permissions, 'manage-candidate-sources')) recruitmentChildren.push({ title: t('Candidate Sources'), href: route('hr.recruitment.candidate-sources.index') });
        if (hasPermission(permissions, 'manage-interview-types')) recruitmentChildren.push({ title: t('Interview Types'), href: route('hr.recruitment.interview-types.index') });
        if (hasPermission(permissions, 'manage-interview-rounds')) recruitmentChildren.push({ title: t('Interview Rounds'), href: route('hr.recruitment.interview-rounds.index') });
        if (hasPermission(permissions, 'manage-offer-templates')) recruitmentChildren.push({ title: t('Offer Templates'), href: route('hr.recruitment.offer-templates.index') });
        if (hasPermission(permissions, 'manage-custom-questions')) recruitmentChildren.push({ title: t('Custom Questions'), href: route('hr.recruitment.custom-questions.index') });

        if (recruitmentChildren.length > 0) items.push({ title: t('Recruitment'), icon: UserPlus, children: recruitmentChildren, group: t('Talent & Growth') });

        const lifecycleChildren: any[] = [];
        if (hasPermission(permissions, 'manage-awards')) lifecycleChildren.push({ title: t('Awards'), href: route('hr.awards.index') });
        if (hasPermission(permissions, 'manage-promotions')) lifecycleChildren.push({ title: t('Promotions'), href: route('hr.promotions.index') });
        if (hasPermission(permissions, 'manage-employee-transfers')) lifecycleChildren.push({ title: t('Transfers'), href: route('hr.transfers.index') });
        if (hasPermission(permissions, 'manage-warnings')) lifecycleChildren.push({ title: t('Warnings'), href: route('hr.warnings.index') });
        if (hasPermission(permissions, 'manage-resignations')) lifecycleChildren.push({ title: t('Resignations'), href: route('hr.resignations.index') });
        if (hasPermission(permissions, 'manage-terminations')) lifecycleChildren.push({ title: t('Terminations'), href: route('hr.terminations.index') });
        if (hasPermission(permissions, 'manage-trips')) lifecycleChildren.push({ title: t('Trips'), href: route('hr.trips.index') });
        if (hasPermission(permissions, 'manage-complaints')) lifecycleChildren.push({ title: t('Complaints'), href: route('hr.complaints.index') });
        if (lifecycleChildren.length > 0) items.push({ title: t('Employee Lifecycle'), icon: RefreshCw, children: lifecycleChildren, group: t('Talent & Growth') });

        const performanceChildren: any[] = [];
        if (hasPermission(permissions, 'manage-employee-reviews')) performanceChildren.push({ title: t('Employee Reviews'), href: route('hr.performance.employee-reviews.index') });
        if (hasPermission(permissions, 'manage-employee-goals')) performanceChildren.push({ title: t('Employee Goals'), href: route('hr.performance.employee-goals.index') });
        if (hasPermission(permissions, 'manage-review-cycles')) performanceChildren.push({ title: t('Review Cycles'), href: route('hr.performance.review-cycles.index') });
        if (hasPermission(permissions, 'manage-performance-indicators')) performanceChildren.push({ title: t('Indicators'), href: route('hr.performance.indicators.index') });
        if (hasPermission(permissions, 'manage-goal-types')) performanceChildren.push({ title: t('Goal Types'), href: route('hr.performance.goal-types.index') });
        if (hasPermission(permissions, 'manage-performance-indicator-categories')) performanceChildren.push({ title: t('Indicator Categories'), href: route('hr.performance.indicator-categories.index') });
        if (performanceChildren.length > 0) items.push({ title: t('Performance Management'), icon: BarChart2, children: performanceChildren, group: t('Talent & Growth') });

        const trainingChildren: any[] = [];
        // Daily Use / Core Flow
        if (hasPermission(permissions, 'manage-employee-trainings')) trainingChildren.push({ title: t('Employee Trainings'), href: route('hr.employee-trainings.index') });
        if (hasPermission(permissions, 'manage-training-sessions')) trainingChildren.push({ title: t('Training Sessions'), href: route('hr.training-sessions.index') });
        if (hasPermission(permissions, 'manage-training-programs')) trainingChildren.push({ title: t('Training Programs'), href: route('hr.training-programs.index') });
        // Supporting Workflow
        if (hasPermission(permissions, 'manage-training-assessments')) trainingChildren.push({ title: t('Training Assessments'), href: route('hr.training-assessments.index') });
        // Setup / Configuration
        if (hasPermission(permissions, 'manage-training-types')) trainingChildren.push({ title: t('Training Types'), href: route('hr.training-types.index') });
        if (trainingChildren.length > 0) items.push({ title: t('Training & Development'), icon: BookOpen, children: trainingChildren, group: t('Talent & Growth') });

        // ── 4. FINANCE & ASSETS ──────────────────────────────────────────────
        const payrollChildren: any[] = [];
        if (hasPermission(permissions, 'manage-payslips')) payrollChildren.push({ title: t('Payslips'), href: route('hr.payslips.index') });
        if (hasPermission(permissions, 'manage-payroll-runs')) payrollChildren.push({ title: t('Payroll Runs'), href: route('hr.payroll-runs.index') });
        if (hasPermission(permissions, 'manage-employee-salaries')) payrollChildren.push({ title: t('Employee Salaries'), href: route('hr.employee-salaries.index') });
        if (hasPermission(permissions, 'manage-salary-components')) payrollChildren.push({ title: t('Salary Components'), href: route('hr.salary-components.index') });
        if (payrollChildren.length > 0) items.push({ title: t('Payroll Management'), icon: DollarSign, children: payrollChildren, group: t('Finance & Assets') });

        const assetChildren: any[] = [];
        if (hasPermission(permissions, 'manage-assets')) assetChildren.push({ title: t('Dashboard'), href: route('hr.assets.dashboard') });
        if (hasPermission(permissions, 'manage-assets')) assetChildren.push({ title: t('Assets'), href: route('hr.assets.index') });
        if (hasPermission(permissions, 'manage-assets')) assetChildren.push({ title: t('Depreciation'), href: route('hr.assets.depreciation-report') });
        if (hasPermission(permissions, 'manage-asset-types')) assetChildren.push({ title: t('Asset Types'), href: route('hr.asset-types.index') });
        if (assetChildren.length > 0) items.push({ title: t('Asset Management'), icon: Package, children: assetChildren, group: t('Finance & Assets') });

        // ── 5. COMMUNICATIONS & CONTENT ──────────────────────────────────────
        // Daily Use / Core Flow
        const meetingChildren: any[] = [];
        if (hasPermission(permissions, 'manage-meetings')) meetingChildren.push({ title: t('Meetings'), href: route('meetings.meetings.index') });
        // if (hasPermission(permissions, 'manage-meeting-attendees')) meetingChildren.push({ title: t('Meeting Attendees'), href: route('meetings.meeting-attendees.index') });
        // if (hasPermission(permissions, 'manage-meeting-minutes')) meetingChildren.push({ title: t('Meeting Minutes'), href: route('meetings.meeting-minutes.index') });
        if (hasPermission(permissions, 'manage-action-items')) meetingChildren.push({ title: t('Action Items'), href: route('meetings.action-items.index') });
        // Setup / Configuration
        if (hasPermission(permissions, 'manage-meeting-types')) meetingChildren.push({ title: t('Meeting Types'), href: route('meetings.meeting-types.index') });
        if (hasPermission(permissions, 'manage-meeting-rooms')) meetingChildren.push({ title: t('Meeting Rooms'), href: route('meetings.meeting-rooms.index') });
        if (meetingChildren.length > 0) items.push({ title: t('Meetings'), icon: Calendar, children: meetingChildren, group: t('Communications & Content') });

        const docsContractsChildren: any[] = [];
        // Daily Use / Core Flow
        if (hasPermission(permissions, 'manage-hr-documents')) docsContractsChildren.push({ title: t('HR Documents'), href: route('hr.documents.hr-documents.index') });
        if (hasPermission(permissions, 'manage-employee-contracts')) docsContractsChildren.push({ title: t('Employee Contracts'), href: route('hr.contracts.employee-contracts.index') });
        if (hasPermission(permissions, 'manage-document-acknowledgments')) docsContractsChildren.push({ title: t('Acknowledgments'), href: route('hr.documents.document-acknowledgments.index') });
        // Templates & Generation
        if (hasPermission(permissions, 'manage-contract-templates')) docsContractsChildren.push({ title: t('Contract Templates'), href: route('hr.contracts.contract-templates.index') });
        if (hasPermission(permissions, 'manage-document-templates')) docsContractsChildren.push({ title: t('Document Templates'), href: route('hr.documents.document-templates.index') });
        // Setup / Configuration
        if (hasPermission(permissions, 'manage-contract-types')) docsContractsChildren.push({ title: t('Contract Types'), href: route('hr.contracts.contract-types.index') });
        if (hasPermission(permissions, 'manage-document-categories')) docsContractsChildren.push({ title: t('Document Categories'), href: route('hr.documents.document-categories.index') });
        if (docsContractsChildren.length > 0) items.push({ title: t('Documents & Contracts'), icon: FileText, children: docsContractsChildren, group: t('Communications & Content') });

        if (hasPermission(permissions, 'manage-media')) items.push({ title: t('Media Library'), href: route('media-library'), icon: Image, group: t('Communications & Content') });

        return items;
    };

    // ─── SaaS Company Nav ─────────────────────────────────────────────────────
    const getSaasCompanyNavItems = (): NavItem[] => {
        const items = buildCommonNavItems();

        // 16. System Users
        const staffChildren: any[] = [];
        if (hasPermission(permissions, 'manage-users')) {
            staffChildren.push({ title: t('Users'), href: route('users.index') });
        }
        if (hasPermission(permissions, 'manage-roles')) {
            staffChildren.push({ title: t('Roles'), href: route('roles.index') });
        }
        if (staffChildren.length > 0) {
            items.push({ title: t('System Users'), icon: Users, children: staffChildren, group: t('System Control') });
        }

        // 17. Plans — SaaS only
        const planChildren: any[] = [];
        if (hasPermission(permissions, 'manage-plans')) {
            planChildren.push({ title: t('Plans'), href: route('plans.index') });
        }
        if (hasPermission(permissions, 'view-plan-requests')) {
            planChildren.push({ title: t('Plan Requests'), href: route('plan-requests.index') });
        }
        if (hasPermission(permissions, 'view-plan-orders')) {
            planChildren.push({ title: t('Plan Orders'), href: route('plan-orders.index') });
        }
        if (planChildren.length > 0) {
            items.push({ title: t('Plans'), icon: CreditCard, children: planChildren, group: t('System Control') });
        }

        // 18. Referral Program — SaaS only
        if (hasPermission(permissions, 'manage-referral')) {
            items.push({ title: t('Referral Program'), href: route('referral.index'), icon: Gift, group: t('System Control') });
        }

        // 19. Settings
        if (hasPermission(permissions, 'manage-settings')) {
            items.push({ title: t('Settings'), href: route('settings'), icon: Settings, group: t('System Control') });
        }

        return items;
    };

    // ─── Non-SaaS Company Nav ─────────────────────────────────────────────────
    const getNonSaasNavItems = (): NavItem[] => {
        const items = buildCommonNavItems();

        // 16. Landing Page — Non-SaaS only
        if (hasPermission(permissions, 'manage-landing-page')) {
            items.push({
                title: t('Landing Page'),
                icon: Palette,
                group: t('System Control'),
                children: [
                    { title: t('Landing Page'), href: route('landing-page') },
                    { title: t('Custom Pages'), href: route('landing-page.custom-pages.index') },
                    ...(hasPermission(permissions, 'manage-contacts') ? [{ title: t('Contact Inquiries'), href: route('contacts.index') }] : []),
                    ...(hasPermission(permissions, 'manage-newsletters') ? [{ title: t('Newsletter'), href: route('newsletters.index') }] : [])
                ]
            });
        }

        // 17. System Users
        const staffChildren: any[] = [];
        if (hasPermission(permissions, 'manage-users')) {
            staffChildren.push({ title: t('Users'), href: route('users.index') });
        }
        if (hasPermission(permissions, 'manage-roles')) {
            staffChildren.push({ title: t('Roles'), href: route('roles.index') });
        }
        if (staffChildren.length > 0) {
            items.push({ title: t('System Users'), icon: Users, children: staffChildren, group: t('System Control') });
        }

        // 18. Currency — Non-SaaS
        if (hasPermission(permissions, 'manage-currencies')) {
            items.push({ title: t('Currency'), href: route('currencies.index'), icon: DollarSign, group: t('System Control') });
        }

        // 19. Settings
        if (hasPermission(permissions, 'manage-settings')) {
            items.push({ title: t('Settings'), href: route('settings'), icon: Settings, group: t('System Control') });
        }

        return items;
    };

    const mainNavItems = userRole === 'superadmin'
        ? getSuperAdminNavItems()
        : isSaas
            ? getSaasCompanyNavItems()
            : getNonSaasNavItems();

    const { position, effectivePosition } = useLayout();
    const { variant, collapsible, style } = useSidebarSettings();
    const { logoLight, logoDark, favicon, updateBrandSettings } = useBrand();
    const [sidebarStyle, setSidebarStyle] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {

        // Apply styles based on sidebar style
        if (style === 'colored') {
            setSidebarStyle({ backgroundColor: 'var(--primary)', color: 'white' });
        } else if (style === 'gradient') {
            setSidebarStyle({
                background: 'linear-gradient(to bottom, var(--primary), color-mix(in srgb, var(--primary), transparent 20%))',
                color: 'white'
            });
        } else {
            setSidebarStyle({});
        }
    }, [style]);

    const filterNavItems = (items: NavItem[], query: string): NavItem[] => {
        if (!query.trim()) return items;
        const q = query.toLowerCase();
        const result: NavItem[] = [];
        items.forEach(item => {
            if (item.children) {
                const matchedChildren = item.children.filter(child =>
                    child.title.toLowerCase().includes(q)
                );
                if (item.title.toLowerCase().includes(q)) {
                    result.push(item);
                } else if (matchedChildren.length > 0) {
                    result.push({ ...item, children: matchedChildren, defaultOpen: true });
                }
            } else {
                if (item.title.toLowerCase().includes(q)) {
                    result.push(item);
                }
            }
        });
        return result;
    };

    const filteredNavItems = filterNavItems(mainNavItems, searchQuery);

    // Get the first available menu item's href for logo link
    const getFirstAvailableHref = () => {
        if (filteredNavItems.length === 0) return route('dashboard');

        const firstItem = filteredNavItems[0];
        if (firstItem.href) {
            return firstItem.href;
        } else if (firstItem.children && firstItem.children.length > 0) {
            return firstItem.children[0].href || route('dashboard');
        }
        return route('dashboard');
    };

    return (
        <Sidebar
            side={effectivePosition}
            collapsible={collapsible}
            variant={variant}
            className={style !== 'plain' ? 'sidebar-custom-style' : ''}
        >
            <SidebarHeader className={style !== 'plain' ? 'sidebar-styled' : ''} style={sidebarStyle}>
                <div className="flex justify-center items-center p-2">
                    <Link href={getFirstAvailableHref()} prefetch className="flex items-center justify-center">
                        {/* Logo for expanded sidebar */}
                        <div className="group-data-[collapsible=icon]:hidden flex items-center">
                            {(() => {
                                const isDark = document.documentElement.classList.contains('dark');
                                const currentLogo = isDark ? logoLight : logoDark;
                                const displayUrl = getImagePath(currentLogo) ?? currentLogo;

                                return displayUrl ? (
                                    <img
                                        key={`${currentLogo}-${Date.now()}`}
                                        src={displayUrl}
                                        alt="Logo"
                                        className="w-auto transition-all duration-200"
                                        onError={() => updateBrandSettings({ [isDark ? 'logoLight' : 'logoDark']: '' })}
                                    />
                                ) : (
                                    <div className="h-12 text-inherit font-semibold flex items-center text-lg tracking-tight">
                                        WorkDo
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Icon for collapsed sidebar */}
                        <div className="h-8 w-8 hidden group-data-[collapsible=icon]:block">
                            {(() => {
                                const displayFavicon = favicon ? getImagePath(favicon) : '';

                                return displayFavicon ? (
                                    <img
                                        key={`${favicon}-${Date.now()}`}
                                        src={displayFavicon}
                                        alt="Icon"
                                        className="h-8 w-8 transition-all duration-200"
                                        onError={() => updateBrandSettings({ favicon: '' })}
                                    />
                                ) : (
                                    <div className="h-8 w-8 bg-primary text-white rounded flex items-center justify-center font-bold shadow-sm">
                                        W
                                    </div>
                                );
                            })()}
                        </div>
                    </Link>
                </div>

                {/* Search Input */}
                <div className="group-data-[collapsible=icon]:hidden px-2 pb-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('Search menu...')}
                            className="w-full rounded-md border-1 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 py-1.5 pl-8 pr-7 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Business Switcher removed */}
            </SidebarHeader>

            <SidebarContent style={sidebarStyle} className={`h-full ${style !== 'plain' ? 'sidebar-styled' : ''}`}>
                <NavMain items={filteredNavItems} position={effectivePosition} searchQuery={searchQuery} />
            </SidebarContent>

            <SidebarFooter className={isSaas && userRole === 'company' ? 'border-t' : ''}>
                {/* Plan Active UI — SaaS + Company only */}
                {isSaas && userRole === 'company' && (() => {
                    const user = auth.user;
                    const plan = user?.plan;
                    const isActive = user?.plan_is_active === 1;
                    const isTrial = user?.is_trial == 1;

                    const expireDate = isTrial == 1 ? user?.trial_expire_date : (user?.plan_expire_date || globalSettings?.planExirationDate);

                    const daysLeft = expireDate
                        ? Math.ceil((new Date(expireDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : null;
                    const isExpired = daysLeft == null || daysLeft <= 0;

                    let subText = '';
                    if (isExpired) subText = t('Plan expired');
                    else if (!plan) subText = t('No Plan');
                    else if (isTrial) subText = daysLeft !== null ? t('Trial · {{n}} days left', { n: daysLeft }) : t('Trial');
                    else if (daysLeft !== null && daysLeft <= 7) subText = t('Expires in {{n}} days', { n: daysLeft });
                    else subText = plan.name;


                    return <div ref={userMenuRef} className="relative group-data-[collapsible=icon]:hidden">
                        {/* Popup panel — expands above */}
                        {userMenuOpen && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
                                {/* User info row */}
                                <Link
                                    href={route('profile')}
                                    onClick={() => setUserMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800"
                                >
                                    <div className="relative shrink-0">
                                        {auth.user?.avatar ? (
                                            <img src={auth.user.avatar} alt={auth.user.name} className="h-9 w-9 rounded-full object-cover" />
                                        ) : (
                                            <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold line-clamp-1">
                                                {auth.user?.name?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate line-clamp-1">{auth.user?.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate line-clamp-1">{auth.user?.email}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                                </Link>

                                {/* Actions */}
                                <div className="py-1">
                                    <Link
                                        href={route('referral.index')}
                                        onClick={() => setUserMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <Gift className="h-4 w-4 text-gray-400" />
                                        {t('Referral Program')}
                                    </Link>
                                    <Link
                                        href={route('plans.index')}
                                        onClick={() => setUserMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <CreditCard className="h-4 w-4 text-gray-400" />
                                        {t('Plans')}
                                    </Link>
                                    <Link
                                        href={route('settings')}
                                        onClick={() => setUserMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <Settings className="h-4 w-4 text-gray-400" />
                                        {t('Settings')}
                                    </Link>
                                </div>

                                <div className="border-t border-gray-100 dark:border-gray-800 py-1">
                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        onClick={() => setUserMenuOpen(false)}
                                        className="flex cursor-pointer w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <LogOut className="h-4 w-4 text-gray-400" />
                                        {t('Log out')}
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* Trigger card */}
                        <button
                            type="button"
                            onClick={() => setUserMenuOpen(v => !v)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-black/10 dark:bg-white/10 transition-colors cursor-pointer"
                        >
                            <div className="shrink-0">
                                {auth.user?.avatar ? (
                                    <img src={auth.user.avatar} alt={auth.user.name} className="h-8 w-8 rounded-full object-cover" />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
                                        {auth.user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-medium text-sidebar-foreground truncate line-clamp-1">{auth.user?.name}</p>
                                <p className={`text-xs truncate line-clamp-1 ${isExpired ? 'text-red-400' : daysLeft !== null && daysLeft <= 7 ? 'text-orange-500' : 'text-sidebar-foreground/60'}`}>{subText}</p>
                            </div>
                            <Link
                                href={route('plans.index')}
                                onClick={e => e.stopPropagation()}
                                className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white text-gray-900 hover:!text-gray-900 hover:bg-gray-100 border border-gray-300"
                            >
                                {t('Upgrade')}
                            </Link>
                        </button>
                    </div>
                })()}
            </SidebarFooter>
        </Sidebar>
    );
}
