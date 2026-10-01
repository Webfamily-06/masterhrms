import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { router, usePage } from '@inertiajs/react';
import { Package, CheckCircle, UserCheck, Wrench, Trash2, TrendingUp, List, BarChart2, PieChartIcon, LayoutGrid, Calendar, TrendingDown, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, CartesianGrid, LabelList } from 'recharts';
import { useState, useEffect } from 'react';
import { getImagePath } from '@/utils/helpers';
import { CrudTable } from '@/components/CrudTable';

export default function AssetDashboard() {
    const { t } = useTranslation();
    const { 
        assetCounts, 
        assetTypeData, 
        recentAssignments, 
        upcomingMaintenance, 
        assetValueSummary,
        recentAssets,
        monthlyTrend
    } = usePage().props as any;

    const [mounted, setMounted] = useState(false);
    const [primaryColor, setPrimaryColor] = useState('#3b82f6');

    useEffect(() => {
        setMounted(true);
        const raw = getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim();
        if (raw) setPrimaryColor(raw);
    }, []);
    const globalSetting = usePage().props.globalSettings;

    const fadeUp = (delay = 0) =>
        `transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`
        + (delay ? ` delay-${delay}` : '');

    const handleViewAssets = () => {
        router.get(route('hr.assets.index'));
    };

    const handleViewDepreciationReport = () => {
        router.get(route('hr.assets.depreciation-report'));
    };

    // Colors for the donut chart
    const COLORS = ['#10B981', '#3b82f6', '#f59e0b', '#ef4444', '#667eea'];
    
    // Format data for Donut Chart
    const pieData = [
        { name: t('Available'), value: assetCounts.available, color: COLORS[0] },
        { name: t('Assigned'), value: assetCounts.assigned, color: COLORS[1] },
        { name: t('Under Maintenance'), value: assetCounts.under_maintenance, color: COLORS[2] },
        { name: t('Disposed'), value: assetCounts.disposed, color: COLORS[3] },
    ];

    // Status badge - matches index.tsx exactly
    const statusClasses: Record<string, string> = {
        'available': 'bg-green-50 text-green-700 ring-green-600/20',
        'assigned': 'bg-blue-50 text-blue-700 ring-blue-600/20',
        'under_maintenance': 'bg-amber-50 text-amber-700 ring-amber-600/20',
        'disposed': 'bg-red-50 text-red-700 ring-red-600/20'
    };
    const statusLabels: Record<string, string> = {
        'available': t('Available'),
        'assigned': t('Assigned'),
        'under_maintenance': t('Under Maintenance'),
        'disposed': t('Disposed')
    };
    const getStatusBadge = (status: string) => (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusClasses[status] || 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
            {statusLabels[status] || status}
        </span>
    );

    // Calculate percentages for pie legend
    const getPercentage = (value: number) => {
        if (assetCounts.total === 0) return '0%';
        return `${Math.round((value / assetCounts.total) * 100)}%`;
    };

    const tableColumns = [
        {
            key: 'name',
            label: t('Name'),
            render: (value: string, row: any) => (
                <div className="flex items-center gap-3">
                    <img
                        src={row.image_url || (row.images ? (row.images.startsWith('http') ? row.images : `/storage/${row.images}`) : getImagePath('default/image-not-found.jpg'))}
                        alt={row.name}
                        className="h-9 w-9 cursor-pointer rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800"
                        onClick={() => window.open(row.image_url, '_blank')}
                    />
                    <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{value}</div>
                        <div className="text-xs text-gray-500">{row.asset_type?.name || '-'}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'asset_code',
            label: t('Asset Code / Serial'),
            render: (value: string, row: any) => (
                <div>
                    <div className="text-gray-900 dark:text-gray-100">{value || '-'}</div>
                    <div className="text-xs text-gray-500">{row.serial_number || '-'}</div>
                </div>
            )
        },
        {
            key: 'status',
            label: t('Status'),
            render: (value: string) => getStatusBadge(value)
        },
        {
            key: 'assigned_to',
            label: t('Assigned To'),
            render: (_: any, row: any) => {
                if (row.status !== 'assigned' || !row.current_assignment?.employee) {
                    return <span className="text-gray-400">—</span>;
                }
                return (
                    <div className="flex items-center gap-3">
                        <img
                            src={row.current_assignment?.employee?.avatar}
                            alt={row.current_assignment?.employee?.name}
                            className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = getImagePath('avatars/avatar.png');
                            }}
                        />
                        <div>
                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{row.current_assignment?.employee?.name}</div>
                            <div className="text-xs text-gray-500">{row.current_assignment?.employee?.email || '-'}</div>
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'location',
            label: t('Location'),
            render: (value: string) => <span className="text-gray-600 dark:text-gray-400">{value || '-'}</span>
        },
        {
            key: 'purchase_date',
            label: t('Purchase Date'),
            type: 'date' as const
        },
        {
            key: 'purchase_cost',
            label: t('Value'),
            render: (value: any) => value ? <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{window.appSettings?.formatCurrency(value)}</span> : <span className="text-gray-400">—</span>
        }
    ];

    // Define page actions
    const pageActions = [
        {
            label: t('Asset List'),
            icon: <List className="mr-2 h-4 w-4" />,
            variant: 'outline' as const,
            onClick: handleViewAssets,
        },
        {
            label: t('Depreciation Report'),
            icon: <BarChart2 className="mr-2 h-4 w-4" />,
            variant: 'outline' as const,
            onClick: handleViewDepreciationReport,
        },
    ];

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Asset Management') },
        { title: t('Asset Dashboard') },
    ];

    return (
        <PageTemplate title={t('Asset Dashboard')} description={t('Overview of all company assets and their status.')} url="/hr/assets/dashboard" actions={pageActions} breadcrumbs={breadcrumbs}>
        <div className="space-y-6 bg-gray-50/30 dark:bg-gray-900/30 min-h-screen overflow-x-hidden">
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                {/* Top Stat Cards */}
                <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gray-100 dark:bg-gray-700/40 rounded-bl-full" />
                    <div className="relative flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Total Assets')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{assetCounts.total}</p>
                            <div className="flex items-center gap-1.5 mt-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('All registered assets')}</span>
                            </div>
                        </div>
                        <div className="relative z-10 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                            <Package className="h-7 w-7 text-gray-600 dark:text-gray-400" />
                        </div>
                    </div>
                </div>

                <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-bl-full" />
                    <div className="relative flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Available')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{assetCounts.available}</p>
                            <div className="flex items-center gap-1.5 mt-2">
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium">{assetCounts.total > 0 ? Math.round((assetCounts.available / assetCounts.total) * 100) : 0}% {t('of total')}</span>
                            </div>
                        </div>
                        <div className="relative z-10 p-3 bg-green-100 dark:bg-green-900/40 rounded-xl">
                            <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </div>

                <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-bl-full" />
                    <div className="relative flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Assigned')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{assetCounts.assigned}</p>
                            <div className="flex items-center gap-1.5 mt-2">
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{assetCounts.total > 0 ? Math.round((assetCounts.assigned / assetCounts.total) * 100) : 0}% {t('of total')}</span>
                            </div>
                        </div>
                        <div className="relative z-10 p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                            <UserCheck className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </div>

                <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 dark:bg-amber-900/20 rounded-bl-full" />
                    <div className="relative flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Under Maintenance')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{assetCounts.under_maintenance}</p>
                            <div className="flex items-center gap-1.5 mt-2">
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{assetCounts.total > 0 ? Math.round((assetCounts.under_maintenance / assetCounts.total) * 100) : 0}% {t('of total')}</span>
                            </div>
                        </div>
                        <div className="relative z-10 p-3 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
                            <Wrench className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                        </div>
                    </div>
                </div>

                <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-bl-full" />
                    <div className="relative flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Disposed')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{assetCounts.disposed}</p>
                            <div className="flex items-center gap-1.5 mt-2">
                                <span className="text-xs text-red-600 dark:text-red-400 font-medium">{assetCounts.total > 0 ? Math.round((assetCounts.disposed / assetCounts.total) * 100) : 0}% {t('of total')}</span>
                            </div>
                        </div>
                        <div className="relative z-10 p-3 bg-red-100 dark:bg-red-900/40 rounded-xl">
                            <Trash2 className="h-7 w-7 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main grid cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Donut Chart */}
                <div className={fadeUp(300)}>
                    <Card className="h-full border-gray-200 dark:border-gray-800 shadow-sm">
                        <CardHeader className="pb-3 pt-5 px-5 border-b">
                            <div className="flex items-center">
                                <PieChartIcon className="h-6 w-6 text-primary" />
                                <div className="pl-3">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">{t('Asset Status Overview')}</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-col sm:flex-row items-center justify-between pb-6 pt-4">
                            <div className="h-48 w-48 relative shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                                            {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                                        </Pie>
                                        <RechartsTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{assetCounts.total}</span>
                                    <span className="text-xs text-gray-500">{t('Total Assets')}</span>
                                </div>
                            </div>
                            <div className="space-y-4 w-full mt-6 sm:mt-0 sm:pl-4">
                                {pieData.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold">{item.value}</span>
                                            <span className="text-xs text-gray-400 w-12 text-right">({getPercentage(item.value)})</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Bar Chart - Assets by Type */}
                <div className={fadeUp(500)}>
                    <Card className="h-full border-gray-200 dark:border-gray-800 shadow-sm">
                        <CardHeader className="pb-3 pt-5 px-5 border-b">
                            <div className="flex items-center">
                                <LayoutGrid className="h-6 w-6 text-primary" />
                                <div className="pl-3">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">{t('Assets by Type')}</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-64 pt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={assetTypeData.slice(0, 5)} margin={{ top: 20, right: 0, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={primaryColor} strokeOpacity={0.12} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={{ stroke: '#9ca3af', strokeOpacity: 0.4, strokeWidth: 1.5 }}
                                        tickLine={{ stroke: '#9ca3af', strokeOpacity: 0.3 }}
                                        tick={{ fontSize: 11, fill: 'currentColor' }}
                                        className="text-gray-700 dark:text-gray-300 font-medium"
                                        interval={0}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={{ stroke: '#9ca3af', strokeOpacity: 0.4, strokeWidth: 1.5 }}
                                        tickLine={{ stroke: '#9ca3af', strokeOpacity: 0.3 }}
                                        tick={{ fontSize: 12, fill: 'currentColor' }}
                                        className="text-muted-foreground"
                                    />
                                    <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                        {assetTypeData.slice(0, 5).map((_entry: any, index: number) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                        <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: '#6b7280' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Row 2: Recent Assignments & Maintenance Schedule */}
                <div className={fadeUp(600)}>
                    <Card className="h-full border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5 border-b">
                            <CardTitle className="text-base font-semibold flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary" />{t('Recent Assignments')}</CardTitle>
                            <span className="text-xs text-primary font-medium cursor-pointer hover:underline" onClick={() => router.get(route('hr.assets.index', { page: 1, per_page: '', status: 'assigned' }))}>{t('View All')}</span>
                        </CardHeader>
                        <CardContent className="flex-1 pt-4">
                            <div className="space-y-4">
                                {recentAssignments && recentAssignments.length > 0 ? recentAssignments.map((assignment: any) => (
                                    <div key={assignment.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                                                <img src={assignment.employee.avatar} alt={assignment.employee.name} className="h-9 w-9 rounded-full" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{assignment.employee?.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{assignment.asset?.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {getStatusBadge('assigned')}
                                            <p className="text-xs text-gray-400 mt-1">{window.appSettings?.formatDateTimeSimple(assignment.checkout_date, false) || '-'}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="flex items-center justify-center h-full text-sm text-gray-400">{t('No recent assignments')}</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className={fadeUp(700)}>
                    <Card className="h-full border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5 border-b">
                            <CardTitle className="text-base font-semibold flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" />{t('Maintenance Schedule')}</CardTitle>
                            <span className="text-xs text-primary font-medium cursor-pointer hover:underline" onClick={() => router.get(route('hr.assets.index', { page: 1, per_page: '', status: 'under_maintenance' }))}>{t('View All')}</span>
                        </CardHeader>
                        <CardContent className="flex-1 pt-4">
                            <div className="space-y-4">
                                {upcomingMaintenance && upcomingMaintenance.length > 0 ? upcomingMaintenance.map((maintenance: any) => (
                                    <div key={maintenance.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-primary/5 dark:bg-primary/20 text-primary flex items-center justify-center shrink-0 border border-primary"><Wrench className="h-5 w-5" /></div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{maintenance.asset?.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{maintenance.maintenance_type}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20">{t('Upcoming')}</span>
                                            <p className="text-xs text-gray-400 mt-1">{window.appSettings?.formatDateTimeSimple(maintenance.start_date, false) || '-'}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="flex items-center justify-center h-full text-sm text-gray-400">{t('No upcoming maintenance')}</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Row 3: Asset Value Overview - Full Width */}
                <div className={`col-span-1 lg:col-span-2 ${fadeUp(800)}`}>
                    <Card className="h-full border-gray-200 dark:border-gray-800 shadow-sm">
                        <CardHeader className="pb-3 pt-5 px-5 border-b">
                            <CardTitle className="text-base font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />{t('Asset Value Overview (12 Months)')}</CardTitle>
                        </CardHeader>
                        <CardContent className="h-72 pt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={monthlyTrend} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="assetValueGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={primaryColor} strokeOpacity={0.12} />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={{ stroke: primaryColor, strokeOpacity: 0.4, strokeWidth: 1.5 }}
                                        tickLine={{ stroke: primaryColor, strokeOpacity: 0.3 }}
                                        tick={{ fontSize: 12, fill: 'currentColor' }}
                                        className="text-gray-700 dark:text-gray-300 font-medium"
                                        dy={8}
                                    />
                                    <YAxis
                                        axisLine={{ stroke: primaryColor, strokeOpacity: 0.4, strokeWidth: 1.5 }}
                                        tickLine={{ stroke: primaryColor, strokeOpacity: 0.3 }}
                                        tick={{ fontSize: 12, fill: 'currentColor' }}
                                        className="text-muted-foreground"
                                        tickFormatter={(value) => `$${value / 1000}k`}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ fontSize: 12, borderRadius: '8px', border: `1px solid ${primaryColor}30`, backgroundColor: 'rgba(255,255,255,0.9)', color: primaryColor }}
                                        formatter={(value: number) => [window.appSettings?.formatCurrency(value) || `$${value}`, t('Value')]}
                                    />
                                    <Area type="monotone" dataKey="value" stroke={primaryColor} strokeWidth={2.5} fillOpacity={1} fill="url(#assetValueGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Row 4: Depreciation Summary - Full Width */}
                <div className={`col-span-1 lg:col-span-2 ${fadeUp(900)}`}>
                    <Card className="h-full border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
                        <CardHeader className="pb-3 pt-5 px-5 border-b">
                            <CardTitle className="text-base font-semibold flex items-center gap-2"><TrendingDown className="h-5 w-5 text-primary" />{t('Depreciation Summary')}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 p-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 p-4 rounded-2xl border border-blue-300/50 dark:border-blue-800/50 flex flex-col justify-between transition-transform">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="p-2 bg-blue-500/10 rounded-xl"><DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-blue-600/80 dark:text-blue-400/80 mb-1 tracking-wider">{t('Purchase Value')}</div>
                                        <div className="text-2xl font-black text-blue-950 dark:text-blue-50 font-mono tracking-tight">{window.appSettings?.formatCurrency(assetValueSummary.total_purchase_value || 0)}</div>
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 p-4 rounded-2xl border border-red-300/50 dark:border-red-800/50 flex flex-col justify-between transition-transform">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="p-2 bg-red-500/10 rounded-xl"><TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" /></div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-red-600/80 dark:text-red-400/80 mb-1 tracking-wider">{t('Accumulated Depr.')}</div>
                                        <div className="text-2xl font-black text-red-950 dark:text-red-50 font-mono tracking-tight">{window.appSettings?.formatCurrency(assetValueSummary.total_depreciation || 0)}</div>
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 p-4 rounded-2xl border border-green-300/50 dark:border-green-800/50 flex flex-col justify-between transition-transform">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="p-2 bg-green-500/10 rounded-xl"><Package className="h-5 w-5 text-green-600 dark:text-green-400" /></div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-green-600/80 dark:text-green-400/80 mb-1 tracking-wider">{t('Book Value')}</div>
                                        <div className="text-2xl font-black text-green-950 dark:text-green-50 font-mono tracking-tight">{window.appSettings?.formatCurrency(assetValueSummary.total_current_value || 0)}</div>
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 p-4 rounded-2xl border border-purple-300/50 dark:border-purple-800/50 flex flex-col justify-between transition-transform">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="p-2 bg-purple-500/10 rounded-xl"><TrendingDown className="h-5 w-5 text-purple-600 dark:text-purple-400" /></div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-purple-600/80 dark:text-purple-400/80 mb-1 tracking-wider">{t('Monthly Depr.')}</div>
                                        <div className="text-2xl font-black text-purple-950 dark:text-purple-50 font-mono tracking-tight">{window.appSettings?.formatCurrency(assetValueSummary.monthly_depreciation || 0)}</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            {/* Table */}
            <div className={fadeUp(1000)}>
                <Card className="border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-gray-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-4 pt-5 px-5 border-b">
                        <CardTitle className="text-base font-semibold flex items-center gap-2"><Package className="h-5 w-5 text-primary" />{t('Recent Assets')}</CardTitle>
                        <span className="text-xs text-primary font-medium cursor-pointer hover:underline" onClick={() => router.get(route('hr.assets.index'))}>{t('View All')}</span>
                    </CardHeader>
                    <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-800">
                        <CrudTable
                            columns={tableColumns}
                            actions={[]}
                            data={recentAssets || []}
                            from={1}
                            onAction={() => {}}
                            permissions={[]}
                            showActions={false}
                        />
                    </div>
                </Card>
            </div>
        </div>
        </PageTemplate>
    );
}
