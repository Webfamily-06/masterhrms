import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Users, ChevronUp } from 'lucide-react';
import { useInitials } from '@/hooks/use-initials';

interface Employee {
    id: number;
    name: string;
    email: string;
    avatar: string;
    created_by: number | null;
    department: string | null;
    designation: string | null;
    branch: string | null;
    employee_id: string | null;
    status: string;
    children: Employee[];
}

const V_LINE_HEIGHT = 24;

function NodeCard({ node, isRoot = false }: { node: Employee; isRoot?: boolean }) {
    const getInitials = useInitials();
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(true);

    if (!node.name || node.name.trim() === '') return null;

    const visibleChildren = node.children?.filter(c => c.name && c.name.trim() !== '') ?? [];
    const hasChildren = visibleChildren.length > 0;

    const statusColor =
        node.status === 'active' ? '#22c55e' :
        node.status === 'inactive' ? '#ef4444' : '#9ca3af';

    const borderClass = isRoot
        ? 'border-primary'
        : hasChildren
            ? 'border-blue-300 dark:border-blue-600'
            : 'border-gray-200 dark:border-gray-600';

    return (
        <div className="flex flex-col items-center">
            {/* Card */}
            <div className={`relative bg-white dark:bg-gray-800 border-2 ${borderClass} rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200`}
                style={{ width: '176px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
            >
                {/* Avatar */}
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '50%',
                        overflow: 'hidden', background: 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 700, fontSize: '16px',
                    }}>
                        {node.avatar
                            ? <img src={node.avatar} alt={node.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : getInitials(node.name)
                        }
                    </div>
                    <span style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: '12px', height: '12px', borderRadius: '50%',
                        background: statusColor,
                    }} className="border-white dark:border-gray-800" />
                </div>

                {/* Name */}
                <p className="font-semibold text-gray-900 dark:text-white"
                    style={{ fontSize: '12px', lineHeight: 1.3, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {node.name}
                </p>
                {/* Email */}
                <p className="font-normal text-gray-500 dark:text-white"
                    style={{ fontSize: '10px', lineHeight: 1.3, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {node.email}
                </p>

                {/* Designation */}
                {node.designation && (
                    <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/20 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-600/20 my-2">
                        {node.designation}
                    </span>
                )}

                {/* Expand/Collapse button */}
                {hasChildren && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="absolute flex items-center justify-center cursor-pointer text-white"
                        style={{
                            bottom: '-14px', left: '50%', transform: 'translateX(-50%)',
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: 'var(--primary)', border: 'none',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)', zIndex: 10,
                            fontSize: '10px', fontWeight: 700,
                        }}
                        title={expanded ? t('Collapse') : `${t('Expand')} (${visibleChildren.length})`}
                    >
                        {expanded
                            ? <ChevronUp size={14} />
                            : <span style={{ fontSize: '10px', fontWeight: 700 }}>{visibleChildren.length}</span>
                        }
                    </button>
                )}
            </div>

            {/* Children */}
            {hasChildren && expanded && (
                <div className="flex flex-col items-center">
                    {/* Vertical line from card down */}
                    <div className="bg-gray-300 dark:bg-gray-600"
                        style={{ width: '1px', height: `${V_LINE_HEIGHT + 14}px` }} />

                    {/* Row of children */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
                        {visibleChildren.map((child, index) => (
                            <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '208px', flexShrink: 0, position: 'relative' }}>
                                {/* Vertical line */}
                                <div className="bg-gray-300 dark:bg-gray-600"
                                    style={{ width: '1px', height: `${V_LINE_HEIGHT}px` }} />
                                {/* Left horizontal segment */}
                                {index > 0 && (
                                    <div className="bg-gray-300 dark:bg-gray-600"
                                        style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '1px' }} />
                                )}
                                {/* Right horizontal segment */}
                                {index < visibleChildren.length - 1 && (
                                    <div className="bg-gray-300 dark:bg-gray-600"
                                        style={{ position: 'absolute', top: 0, left: '50%', width: '50%', height: '1px' }} />
                                )}
                                <div className="flex flex-col items-center">
                                    <NodeCard node={child} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function OrganizationChart() {
    const { t } = useTranslation();
    const { chartData, totalCount } = usePage().props as any;

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Workforce Management') },
        { title: t('Organization Chart') },
    ];

    return (
        <PageTemplate
            title={t('Organization Chart')}
            description={t('Visual hierarchy of your organization')}
            url="/hr/organization-chart"
            breadcrumbs={breadcrumbs}
            noPadding
        >
            <div className="flex flex-col" style={{ overflow: 'hidden', maxWidth: '100%' }}>
                {/* Stats bar */}
                <div className="flex items-center gap-4 mb-5">
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 shadow-sm">
                        <Users size={16} color="var(--primary)" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {totalCount} {t('Members')}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                            {t('Active')}
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                            {t('Inactive')}
                        </span>
                        {/* <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />
                            {t('Other')}
                        </span> */}
                    </div>
                </div>

                {/* Chart box */}
                <div
                    className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700"
                    style={{ overflow: 'auto', height: 'calc(100vh - 230px)', minHeight: '400px', padding: '40px', width: '100%', boxSizing: 'border-box' }}
                >
                    {chartData ? (
                        <div style={{ display: 'inline-flex', justifyContent: 'center', minWidth: '100%' }}>
                            <NodeCard node={chartData} isRoot={true} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <Users size={48} className="text-gray-300 dark:text-gray-600 mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">{t('No employees found')}</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('Add employees to see the organization chart')}</p>
                        </div>
                    )}
                </div>
            </div>
        </PageTemplate>
    );
}
