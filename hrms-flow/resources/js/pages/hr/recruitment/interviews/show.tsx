import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    Video,
    User,
    Users,
    Star,
    MessageSquare,
    Calendar,
    Clock,
    Briefcase,
    Target,
    Tag,
    Timer,
    CheckCircle2,
    MapPin,
    Mail,
    Phone,
    Building2,
    Award,
    ChartPie,
    MessageCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import UserInitials from '@/components/user-initials';
import { hasPermission } from '@/utils/authorization';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function InterviewerAvatar({ name, avatar, className = "w-9 h-9 text-xs" }: { name: string; avatar?: string; className?: string }) {
    const getInitials = (n: string) => {
        if (!n) return '';
        const parts = n.trim().split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        return n.slice(0, 2).toUpperCase();
    };

    return (
        <div className={`relative rounded-full overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700 ${className}`}>
            {avatar ? (
                <img
                    src={avatar}
                    alt={name || 'User'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fb = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fb) fb.style.display = 'flex';
                    }}
                />
            ) : null}
            <div className={`w-full h-full bg-primary/10 text-primary flex items-center justify-center font-semibold ${avatar ? 'hidden' : ''}`}>
                {getInitials(name || '')}
            </div>
        </div>
    );
}

function StarDisplay({ value }: { value: number }) {
    if (!value) return <span className="text-xs font-medium text-gray-500">-</span>;
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => {
                const isFullFilled = value >= star;
                const isHalfFilled = !isFullFilled && value >= star - 0.5;
                return (
                    <div key={star} className="relative h-4 w-4">
                        <Star className="h-4 w-4 fill-none text-gray-300 dark:text-gray-600" />
                        {isHalfFilled && (
                            <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            </div>
                        )}
                        {isFullFilled && (
                            <div className="absolute inset-0">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// Star Rating component — supports half stars (0.5 steps), value stored as float
function StarRating({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
    const [hovered, setHovered] = useState<number>(0);

    const displayValue = hovered || value;

    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => {
                const isFullFilled = displayValue >= star;
                const isHalfFilled = !isFullFilled && displayValue >= star - 0.5;

                return (
                    <div key={star} className="relative h-7 w-7">
                        {/* Base empty star */}
                        <Star className="h-7 w-7 fill-none text-gray-300 dark:text-gray-600" />

                        {/* Half fill overlay */}
                        {isHalfFilled && (
                            <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                                <Star className="h-7 w-7 fill-yellow-400 text-yellow-400" />
                            </div>
                        )}

                        {/* Full fill overlay */}
                        {isFullFilled && (
                            <div className="absolute inset-0">
                                <Star className="h-7 w-7 fill-yellow-400 text-yellow-400" />
                            </div>
                        )}

                        {/* Left half hitbox → x - 0.5 */}
                        <div
                            className={`absolute inset-y-0 left-0 w-1/2 ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
                            onMouseEnter={() => !disabled && setHovered(star - 0.5)}
                            onMouseLeave={() => !disabled && setHovered(0)}
                            onClick={() => !disabled && onChange(star - 0.5)}
                        />

                        {/* Right half hitbox → x */}
                        <div
                            className={`absolute inset-y-0 right-0 w-1/2 ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
                            onMouseEnter={() => !disabled && setHovered(star)}
                            onMouseLeave={() => !disabled && setHovered(0)}
                            onClick={() => !disabled && onChange(star)}
                        />
                    </div>
                );
            })}

            {value > 0 && (
                <span className="ml-2 text-sm text-gray-500">{value}/5</span>
            )}
        </div>
    );
}

function RadarTriangleChart({ technical, communication, culturalFit }: { technical: number; communication: number; culturalFit: number }) {
    const [animated, setAnimated] = useState(false);

    useEffect(() => {
        setAnimated(false);
        const timer = setTimeout(() => {
            setAnimated(true);
        }, 150);
        return () => clearTimeout(timer);
    }, [technical, communication, culturalFit]);

    const size = 190;
    const cx = size / 2;
    const cy = size / 2 + 5;
    const R = 72;

    const currentTech = animated ? technical : 0;
    const currentComm = animated ? communication : 0;
    const currentCult = animated ? culturalFit : 0;

    const getCoords = (val: number, angleDeg: number) => {
        const rad = (angleDeg * Math.PI) / 180;
        const r = (val / 5) * R;
        return {
            x: cx + r * Math.cos(rad),
            y: cy + r * Math.sin(rad),
        };
    };

    const topPt = getCoords(currentTech, -90);
    const rightPt = getCoords(currentCult, 30);
    const leftPt = getCoords(currentComm, 150);

    const polygonPoints = `${topPt.x},${topPt.y} ${rightPt.x},${rightPt.y} ${leftPt.x},${leftPt.y}`;
    const gridLevels = [1, 2, 3, 4, 5];

    return (
        <div className="relative flex flex-col items-center justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
                {gridLevels.map((lvl) => {
                    const p1 = getCoords(lvl, -90);
                    const p2 = getCoords(lvl, 30);
                    const p3 = getCoords(lvl, 150);
                    return (
                        <polygon
                            key={lvl}
                            points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
                            fill="none"
                            stroke="#d1d5db"
                            strokeWidth="1"
                            className="dark:stroke-gray-700"
                        />
                    );
                })}

                {[-90, 30, 150].map((angle) => {
                    const p = getCoords(5, angle);
                    return (
                        <line
                            key={angle}
                            x1={cx}
                            y1={cy}
                            x2={p.x}
                            y2={p.y}
                            stroke="#d1d5db"
                            strokeWidth="1"
                            className="dark:stroke-gray-700"
                        />
                    );
                })}

                <polygon
                    points={polygonPoints}
                    className="fill-primary/25 stroke-primary transition-all duration-1000 ease-out"
                    strokeWidth="2.5"
                />

                <circle cx={topPt.x} cy={topPt.y} r="4" className="fill-primary stroke-white dark:stroke-gray-900 transition-all duration-1000 ease-out" strokeWidth="2" />
                <circle cx={rightPt.x} cy={rightPt.y} r="4" className="fill-primary stroke-white dark:stroke-gray-900 transition-all duration-1000 ease-out" strokeWidth="2" />
                <circle cx={leftPt.x} cy={leftPt.y} r="4" className="fill-primary stroke-white dark:stroke-gray-900 transition-all duration-1000 ease-out" strokeWidth="2" />
            </svg>
        </div>
    );
}

export default function InterviewShow() {
    const { t } = useTranslation();
    const { auth, interview, interviewerUsers, globalSettings } = usePage().props as any;
    const candidate = interview?.candidate;
    const permissions = auth?.permissions || [];

    const canViewFeedback = hasPermission(permissions, 'manage-interview-feedback');

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

    const [selectedInterviewerId, setSelectedInterviewerId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const idFromUrl = params.get('interviewer_id');
            if (idFromUrl) return idFromUrl;
        }
        return interviewerUsers && interviewerUsers.length > 0 ? interviewerUsers[0].id.toString() : null;
    });

    const handleAddNew = (interviewerId?: string) => {
        setCurrentItem(interviewerId ? { interviewer_id: interviewerId } : null);
        setFormMode('create');
        setIsFormModalOpen(true);
    };

    const handleEdit = (item: any) => {
        setCurrentItem(item);
        setFormMode('edit');
        setIsFormModalOpen(true);
    };

    const handleDelete = (item: any) => {
        setCurrentItem(item);
        setIsDeleteModalOpen(true);
    };

    const handleFormSubmit = (formData: any) => {
        formData.interview_id = interview.id.toString();

        if (formMode === 'create' && selectedInterviewerId) {
            formData.interviewer_id = selectedInterviewerId;
        } else if (formMode === 'edit' && currentItem?.interviewer_id) {
            formData.interviewer_id = currentItem.interviewer_id;
        }

        if (formMode === 'create') {
            if (!globalSettings?.is_demo) toast.loading(t('Submitting interview feedback...'));
            router.post(route('hr.recruitment.interview-feedback.store'), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    if (!globalSettings?.is_demo) toast.dismiss();
                    if (page.props.flash.success) {
                        toast.success(t(page.props.flash.success));
                    } else if (page.props.flash.error) {
                        toast.error(t(page.props.flash.error));
                    } else {
                        toast.success(t('Interview feedback submitted successfully'));
                    }
                },
                onError: (errors) => {
                    if (!globalSettings?.is_demo) toast.dismiss();
                    if (typeof errors === 'string') {
                        toast.error(errors);
                    } else {
                        toast.error(`Failed to submit interview feedback: ${Object.values(errors).join(', ')}`);
                    }
                }
            });
        } else if (formMode === 'edit') {
            if (!globalSettings?.is_demo) toast.loading(t('Updating interview feedback...'));
            router.put(route('hr.recruitment.interview-feedback.update', currentItem.id), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    if (!globalSettings?.is_demo) toast.dismiss();
                    if (page.props.flash.success) {
                        toast.success(t(page.props.flash.success));
                    } else if (page.props.flash.error) {
                        toast.error(t(page.props.flash.error));
                    } else {
                        toast.success(t('Interview feedback updated successfully'));
                    }
                },
                onError: (errors) => {
                    if (!globalSettings?.is_demo) toast.dismiss();
                    if (typeof errors === 'string') {
                        toast.error(errors);
                    } else {
                        toast.error(`Failed to update interview feedback: ${Object.values(errors).join(', ')}`);
                    }
                }
            });
        }
    };

    const handleDeleteConfirm = () => {
        if (!globalSettings?.is_demo) toast.loading(t('Deleting interview feedback...'));
        router.delete(route('hr.recruitment.interview-feedback.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                if (!globalSettings?.is_demo) toast.dismiss();
                if (page.props.flash.success) {
                    toast.success(t(page.props.flash.success));
                } else if (page.props.flash.error) {
                    toast.error(t(page.props.flash.error));
                } else {
                    toast.success(t('Interview feedback deleted successfully'));
                }
            },
            onError: (errors) => {
                if (!globalSettings?.is_demo) toast.dismiss();
                if (typeof errors === 'string') {
                    toast.error(errors);
                } else {
                    toast.error(`Failed to delete interview feedback: ${Object.values(errors).join(', ')}`);
                }
            }
        });
    };

    const recommendationOptions = [
        { value: 'Strong Hire', label: t('Strong Hire') },
        { value: 'Hire', label: t('Hire') },
        { value: 'Maybe', label: t('Maybe') },
        { value: 'Reject', label: t('Reject') },
        { value: 'Strong Reject', label: t('Strong Reject') }
    ];

    const interviewOptions = [
        { value: interview.id.toString(), label: `${interview.candidate?.first_name} ${interview.candidate?.last_name} - ${interview.job?.title} (${interview.round?.name || 'No Round'})` }
    ];

    const availableInterviewers = (interviewerUsers || []).map((user: any) => ({
        value: user.id.toString(),
        label: user.name
    }));

    const feedbacks: any[] = interview?.feedback || [];
    const feedbackCount = feedbacks.length;

    const formatRating = (val: number | string) => {
        const num = Number(val) || 0;
        return num % 1 === 0 ? num.toString() : num.toFixed(1);
    };

    const avgOverall = feedbackCount > 0
        ? formatRating(feedbacks.reduce((acc, f) => acc + (Number(f.overall_rating) || 0), 0) / feedbackCount)
        : '0';

    const avgTech = feedbackCount > 0
        ? formatRating(feedbacks.reduce((acc, f) => acc + (Number(f.technical_rating) || 0), 0) / feedbackCount)
        : '0';

    const avgComm = feedbackCount > 0
        ? formatRating(feedbacks.reduce((acc, f) => acc + (Number(f.communication_rating) || 0), 0) / feedbackCount)
        : '0';

    const avgCultural = feedbackCount > 0
        ? formatRating(feedbacks.reduce((acc, f) => acc + (Number(f.cultural_fit_rating) || 0), 0) / feedbackCount)
        : '0';

    const recCounts = {
        'Strong Hire': 0,
        'Hire': 0,
        'Maybe': 0,
        'Reject': 0,
        'Strong Reject': 0,
    };

    feedbacks.forEach((f) => {
        if (f.recommendation && recCounts.hasOwnProperty(f.recommendation)) {
            recCounts[f.recommendation as keyof typeof recCounts]++;
        }
    });

    const getRecPercent = (count: number) => {
        if (feedbackCount === 0) return 0;
        return Math.round((count / feedbackCount) * 100);
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Recruitment') },
        { title: t('Interviews'), href: route('hr.recruitment.interviews.index') },
        { title: t('Interview Details') },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Scheduled': return 'bg-blue-50 text-blue-700 ring-blue-600/20';
            case 'Completed': return 'bg-green-50 text-green-700 ring-green-600/20';
            case 'Cancelled': return 'bg-red-50 text-red-700 ring-red-600/10';
            case 'No-show': return 'bg-orange-50 text-orange-700 ring-orange-600/20';
            default: return 'bg-gray-50 text-gray-600 ring-gray-500/10';
        }
    };

    const getRecommendationColor = (recommendation: string) => {
        switch (recommendation) {
            case 'Strong Hire': return 'bg-green-50 text-green-700 ring-green-600/20 border-green-200';
            case 'Hire': return 'bg-blue-50 text-blue-700 ring-blue-600/20 border-blue-200';
            case 'Maybe': return 'bg-yellow-50 text-yellow-800 ring-yellow-600/20 border-yellow-200';
            case 'Reject': return 'bg-red-50 text-red-700 ring-red-600/10 border-red-200';
            case 'Strong Reject': return 'bg-red-50 text-red-700 ring-red-600/10 border-red-200';
            default: return 'bg-gray-50 text-gray-600 ring-gray-500/10 border-gray-200';
        }
    };

    const renderListItems = (text: string | null | undefined, bulletColorClass: string) => {
        if (!text) return <p className="text-xs text-gray-500 dark:text-gray-400">-</p>;
        const lines = text
            .split('\n')
            .map((l) => l.trim().replace(/^[-•*]\s*/, ''))
            .filter(Boolean);

        if (lines.length === 0) return <p className="text-xs text-gray-500 dark:text-gray-400">-</p>;

        return (
            <ul className="space-y-1 mt-1">
                {lines.map((line, idx) => (
                    <li key={idx} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1.5">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${bulletColorClass}`} />
                        <span>{line}</span>
                    </li>
                ))}
            </ul>
        );
    };

    var actions = [];

    actions.push({
        label: t('Back'),
        icon: <ArrowLeft className="h-4 w-4 mr-2" />,
        variant: 'outline',
        onClick: () => router.get(route('hr.recruitment.interviews.index')),
    });
    // if (hasPermission(permissions, 'create-interview-feedback')) {
    //     actions.push({
    //         label: t('Add Feedback'),
    //         icon: <Plus className="h-4 w-4 mr-2" />,
    //         variant: 'default',
    //         onClick: () => handleAddNew(),
    //     });
    // }

    return (
        <PageTemplate
            title={t('Interview Details')}
            description={t('View interview information.')}
            breadcrumbs={breadcrumbs}
            actions={actions}
        >
            <style>{`
                main, body {
                    overflow-x: clip !important;
                }
            `}</style>
            <div className="flex flex-col lg:flex-row gap-6">

                {/* ── LEFT COLUMN ── */}
                <div className="flex-1 min-w-0 space-y-6">

                    {/* Interview Details Card */}
                    <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
                        <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                                    <Briefcase className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Interview Details')}</CardTitle>
                                    <CardDescription>{t('Schedule and interview information')}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-primary mt-0.5 flex-shrink-0">
                                        <Briefcase className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide mb-0.5">{t('Job')}</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{interview.job?.title || '-'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-primary mt-0.5 flex-shrink-0">
                                        <Target className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide mb-0.5">{t('Round')}</p>
                                        {interview.round?.name ? (
                                            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-primary/10 text-primary ring-primary/20 whitespace-nowrap">
                                                {interview.round.name}
                                            </span>
                                        ) : (
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">-</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-primary mt-0.5 flex-shrink-0">
                                        <Tag className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide mb-0.5">{t('Interview Type')}</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{interview.interview_type?.name || '-'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-primary mt-0.5 flex-shrink-0">
                                        <Calendar className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide mb-0.5">{t('Date')}</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {interview.scheduled_date
                                                ? (window.appSettings?.formatDateTimeSimple(interview.scheduled_date, false) || interview.scheduled_date)
                                                : '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-primary mt-0.5 flex-shrink-0">
                                        <Clock className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide mb-0.5">{t('Time')}</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {interview.scheduled_time
                                                ? (window.appSettings?.formatTime(interview.scheduled_time) || interview.scheduled_time)
                                                : '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-primary mt-0.5 flex-shrink-0">
                                        <Timer className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide mb-0.5">{t('Duration')}</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {interview.duration ? `${interview.duration} ${t('min')}` : '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-primary mt-0.5 flex-shrink-0">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide mb-0.5">{t('Status')}</p>
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(interview.status)}`}>
                                            {t(interview.status) || '-'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-primary mt-0.5 flex-shrink-0">
                                        <MessageSquare className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide mb-0.5">{t('Feedback')}</p>
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${interview.feedback_submitted
                                            ? 'bg-green-50 text-green-700 ring-green-600/20'
                                            : 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
                                            }`}>
                                            {interview.feedback_submitted ? t('Submitted') : t('Pending')}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-primary mt-0.5 flex-shrink-0">
                                        <MapPin className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide mb-0.5">{t('Location')}</p>
                                        {interview.meeting_link ? (
                                            <div className="flex items-center gap-1.5">
                                                <Video className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                                <a
                                                    href={interview.meeting_link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-sm font-semibold text-primary hover:underline truncate"
                                                >
                                                    {t('Join Online Interview')}
                                                </a>
                                            </div>
                                        ) : (
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{interview.location || '-'}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── INTERVIEW FEEDBACK SECTION ── */}
                    {canViewFeedback && (
                        <>
                            {/* Summary Card */}
                            <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
                                <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                                            <ChartPie className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Interview Feedback Summary')}</CardTitle>
                                            <CardDescription>{t('Overall feedback of the interview')}</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-5">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

                                        {/* 1. Overall Average Rating */}
                                        <div className="flex flex-col items-center justify-center p-5 rounded-lg bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 text-center h-full min-h-[190px]">
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                                {t('Overall Average Rating')}
                                            </p>
                                            <div className="flex items-baseline justify-center mb-2">
                                                <span className="text-4xl font-bold text-primary">{avgOverall}</span>
                                                <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">/5</span>
                                            </div>
                                            <div className="mb-2">
                                                <StarDisplay value={parseFloat(avgOverall)} />
                                            </div>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                {t('Based on {{count}} feedback', { count: feedbackCount })}
                                            </p>
                                        </div>

                                        {/* 2. Recommendation Breakdown (Contains Radar Triangle Chart + Recommendation Breakdown List) */}
                                        <div className="lg:col-span-2 flex flex-col justify-between p-5 rounded-lg bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 h-full min-h-[190px]">
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                                {t('Recommendation Breakdown')}
                                            </p>

                                            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-auto">
                                                {/* Radar Triangle Chart */}
                                                <div className="relative flex flex-col items-center justify-center">
                                                    <div className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                                                        <span className="font-semibold text-gray-800 dark:text-gray-200">{t('Technical')}</span> {avgTech}/5
                                                    </div>

                                                    <RadarTriangleChart
                                                        technical={parseFloat(avgTech)}
                                                        communication={parseFloat(avgComm)}
                                                        culturalFit={parseFloat(avgCultural)}
                                                    />

                                                    <div className="flex justify-between w-full text-[11px] font-medium text-gray-600 dark:text-gray-400 mt-1 gap-6">
                                                        <div>
                                                            <span className="font-semibold text-gray-800 dark:text-gray-200">{t('Communication')}</span> {avgComm}/5
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold text-gray-800 dark:text-gray-200">{t('Cultural Fit')}</span> {avgCultural}/5
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Recommendation breakdown count list */}
                                                <div className="w-full sm:w-56 space-y-2.5 text-xs">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                                                            <span className="text-gray-700 dark:text-gray-300 font-medium">{t('Strong Hire')}</span>
                                                        </div>
                                                        <span className="text-gray-600 dark:text-gray-400 font-semibold">{recCounts['Strong Hire']} <span className="text-gray-400 font-normal">({getRecPercent(recCounts['Strong Hire'])}%)</span></span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-full bg-[#34d399]" />
                                                            <span className="text-gray-700 dark:text-gray-300 font-medium">{t('Hire')}</span>
                                                        </div>
                                                        <span className="text-gray-600 dark:text-gray-400 font-semibold">{recCounts['Hire']} <span className="text-gray-400 font-normal">({getRecPercent(recCounts['Hire'])}%)</span></span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]" />
                                                            <span className="text-gray-700 dark:text-gray-300 font-medium">{t('Maybe')}</span>
                                                        </div>
                                                        <span className="text-gray-600 dark:text-gray-400 font-semibold">{recCounts['Maybe']} <span className="text-gray-400 font-normal">({getRecPercent(recCounts['Maybe'])}%)</span></span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                                                            <span className="text-gray-700 dark:text-gray-300 font-medium">{t('Reject')}</span>
                                                        </div>
                                                        <span className="text-gray-600 dark:text-gray-400 font-semibold">{recCounts['Reject']} <span className="text-gray-400 font-normal">({getRecPercent(recCounts['Reject'])}%)</span></span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                                                            <span className="text-gray-700 dark:text-gray-300 font-medium">{t('Strong Reject')}</span>
                                                        </div>
                                                        <span className="text-gray-600 dark:text-gray-400 font-semibold">{recCounts['Strong Reject']} <span className="text-gray-400 font-normal">({getRecPercent(recCounts['Strong Reject'])}%)</span></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </CardContent>
                            </Card>

                            {/* Interviewer Feedback List */}
                            <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
                                <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                                                <MessageCircle className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Feedback by Interviewers')}</CardTitle>
                                                <CardDescription>{t('Feedback from all interviewers')}</CardDescription>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="flex flex-col md:flex-row h-auto md:h-[550px]">
                                        {/* Left: Interviewers List */}
                                        <div className="w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 h-[250px] md:h-full">
                                            <ScrollArea className="h-full">
                                                <div className="flex flex-col">
                                                    {interviewerUsers?.map((interviewer: any) => {
                                                        const isSelected = selectedInterviewerId === interviewer.id.toString();
                                                        const intFb = feedbacks?.find((f: any) => f.interviewer_id && f.interviewer_id.split(',').includes(interviewer.id.toString()));
                                                        return (
                                                            <button
                                                                key={interviewer.id}
                                                                onClick={() => {
                                                                    const id = interviewer.id.toString();
                                                                    setSelectedInterviewerId(id);
                                                                    router.get(
                                                                        route('hr.recruitment.interviews.show', interview.id),
                                                                        { interviewer_id: id },
                                                                        { preserveState: true, preserveScroll: true, replace: true }
                                                                    );
                                                                }}
                                                                className={`flex items-center gap-3 p-4 text-left transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 cursor-pointer ${
                                                                    isSelected
                                                                        ? 'bg-primary/10 dark:bg-primary/20'
                                                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800/30'
                                                                }`}
                                                            >
                                                                <InterviewerAvatar name={interviewer.name} avatar={interviewer.avatar} className="w-10 h-10 shrink-0" />
                                                                <div className="min-w-0 flex-1">
                                                                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-gray-900 dark:text-gray-100'}`}>
                                                                        {interviewer.name}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                            {interviewer.type ? interviewer.type : t('Interviewer')}
                                                                        </p>
                                                                        {intFb?.recommendation && (
                                                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getRecommendationColor(intFb.recommendation)}`}>
                                                                                {t(intFb.recommendation)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {<ChevronRight className={`h-4 w-4 shrink-0 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />}
                                                            </button>
                                                        );
                                                    })}
                                                    {(!interviewerUsers || interviewerUsers.length === 0) && (
                                                        <div className="p-4 text-sm text-gray-500 text-center">{t('No interviewers assigned.')}</div>
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        </div>

                                        {/* Right: Selected Interviewer's Feedback */}
                                        <div className="flex-1 min-w-0 bg-white dark:bg-gray-800/60 h-auto md:h-full">
                                            <ScrollArea className="h-full">
                                                <div className="p-5">
                                                    {(() => {
                                                if (!selectedInterviewerId) {
                                                    return (
                                                        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                                                            <p className="text-sm">{t('Please select an interviewer from the list.')}</p>
                                                        </div>
                                                    );
                                                }

                                                const fb = feedbacks.find((f: any) => 
                                                    f.interviewer_id && f.interviewer_id.split(',').includes(selectedInterviewerId)
                                                );

                                                if (!fb) {
                                                    return (
                                                        <div className="py-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center">
                                                            <MessageSquare className="h-10 w-10 mb-3 opacity-30 text-gray-400" />
                                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                                                                {t('No feedback submitted by this interviewer yet.')}
                                                            </p>
                                                            {hasPermission(permissions, 'create-interview-feedback') && (
                                                                <Button onClick={() => handleAddNew(selectedInterviewerId)} size="sm">
                                                                    <Plus className="h-4 w-4 mr-2" />
                                                                    {t('Add Feedback')}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                const formattedDate = fb.created_at
                                                    ? (window.appSettings?.formatDateTimeSimple(fb.created_at, false) || fb.created_at)
                                                    : '-';
                                                    
                                                const interviewerName = interviewerUsers?.find((u: any) => u.id.toString() === selectedInterviewerId)?.name || '';

                                                return (
                                                    <div className="space-y-6">
                                                        {/* Header */}
                                                        <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
                                                            <div>
                                                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('Interviewer Feedback')}</h3>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('Submitted by')} {interviewerName}</p>
                                                            </div>
                                                            {/* Actions (Edit/Delete) */}
                                                            <div className="flex items-center gap-1">
                                                                {hasPermission(permissions, 'edit-interview-feedback') && (
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(fb)} className="h-8 w-8 rounded text-gray-500 hover:text-gray-600 hover:bg-transparent">
                                                                                    <Edit className="h-4 w-4" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>{t('Edit')}</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                )}
                                                                {hasPermission(permissions, 'delete-interview-feedback') && (
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(fb)} className="h-8 w-8 rounded text-gray-500 hover:text-gray-600 hover:bg-transparent">
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>{t('Delete')}</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Score Cards */}
                                                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                             <div className="bg-white dark:bg-gray-900 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700/50 shadow-sm">
                                                                 <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">{t('Overall Score')}</p>
                                                                 <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatRating(fb.overall_rating)} <span className="text-gray-900 dark:text-gray-100 font-bold">/ 5</span></div>
                                                                 <div className="flex justify-center mt-2">
                                                                     <StarDisplay value={Number(fb.overall_rating)} />
                                                                 </div>
                                                             </div>
                                                             <div className="bg-white dark:bg-gray-900 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700/50 shadow-sm">
                                                                 <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">{t('Technical')}</p>
                                                                 <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatRating(fb.technical_rating)} <span className="text-gray-900 dark:text-gray-100 font-bold">/ 5</span></div>
                                                                 <div className="flex justify-center mt-2">
                                                                     <StarDisplay value={Number(fb.technical_rating)} />
                                                                 </div>
                                                             </div>
                                                             <div className="bg-white dark:bg-gray-900 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700/50 shadow-sm">
                                                                 <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">{t('Communication')}</p>
                                                                 <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatRating(fb.communication_rating)} <span className="text-gray-900 dark:text-gray-100 font-bold">/ 5</span></div>
                                                                 <div className="flex justify-center mt-2">
                                                                     <StarDisplay value={Number(fb.communication_rating)} />
                                                                 </div>
                                                             </div>
                                                             <div className="bg-white dark:bg-gray-900 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700/50 shadow-sm">
                                                                 <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">{t('Cultural Fit')}</p>
                                                                 <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatRating(fb.cultural_fit_rating)} <span className="text-gray-900 dark:text-gray-100 font-bold">/ 5</span></div>
                                                                 <div className="flex justify-center mt-2">
                                                                     <StarDisplay value={Number(fb.cultural_fit_rating)} />
                                                                 </div>
                                                             </div>
                                                         </div>

                                                        {/* Details */}
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">{t('Candidate Strengths')}</h4>
                                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700/50">
                                                                {fb.strengths || <span className="text-gray-400 italic">{t('Not specified')}</span>}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">{t('Candidate Weaknesses')}</h4>
                                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700/50">
                                                                {fb.weaknesses || <span className="text-gray-400 italic">{t('Not specified')}</span>}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">{t('General Comments')}</h4>
                                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700/50">
                                                                {fb.comments || <span className="text-gray-400 italic">{t('No comments provided.')}</span>}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Footer */}
                                                        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 mt-6">
                                                            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 sm:mb-0">{t('Feedback Submitted Date')}</span>
                                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{formattedDate}</span>
                                                        </div>
                                                    </div>
                                                );
                                                    })()}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}

                </div>

                {/* ── RIGHT COLUMN (Sticky Sidebar) ── */}
                <div className="w-full lg:w-80 flex-shrink-0">
                    <div className="sticky top-20">
                        <ScrollArea className="h-[calc(100vh-6rem)]">
                            <div className="space-y-4 pr-1">
                                {/* Candidate Details Card */}
                                <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                                                <User className="h-5 w-5 text-primary" />
                                            </div>
                                            <CardTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
                                                {t('Candidate Details')}
                                            </CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4 px-5 pb-4 space-y-3">
                                        <div className="flex items-center gap-3 pb-3 dark:border-gray-700">
                                            <UserInitials name={candidate ? `${candidate.first_name} ${candidate.last_name}` : ''} />
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                                    {candidate ? `${candidate.first_name} ${candidate.last_name}` : '-'}
                                                </p>
                                                {candidate?.email && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1 mt-0.5">
                                                        <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                                        <span className="truncate">{candidate.email}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {[
                                            { icon: <Phone className="h-3.5 w-3.5 text-gray-400" />, label: t('Phone'), value: candidate?.phone },
                                            { icon: <Briefcase className="h-3.5 w-3.5 text-gray-400" />, label: t('Current Position'), value: candidate?.current_position },
                                            { icon: <Building2 className="h-3.5 w-3.5 text-gray-400" />, label: t('Current Company'), value: candidate?.current_company },
                                            { icon: <Award className="h-3.5 w-3.5 text-gray-400" />, label: t('Experience'), value: candidate?.experience_years != null ? `${candidate.experience_years} ${t('years')}` : null },
                                            { icon: <Clock className="h-3.5 w-3.5 text-gray-400" />, label: t('Notice Period'), value: candidate?.notice_period },
                                        ].filter(f => f.value).map(({ icon, label, value }) => (
                                            <div key={label} className="flex items-center justify-between text-xs py-1">
                                                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                                    {icon}
                                                    {label}
                                                </span>
                                                <span className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[140px] text-right">{value}</span>
                                            </div>
                                        ))}

                                        {candidate?.status && (
                                            <div className="pt-2 border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
                                                <span className="text-gray-500 dark:text-gray-400">{t('Status')}</span>
                                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-primary/10 text-primary ring-primary/20">
                                                    {t(candidate.status)}
                                                </span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Interviewers Card */}
                                {interviewerUsers?.length > 0 && (
                                    <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                                                    <Users className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
                                                        {t('Interviewers')}
                                                    </CardTitle>
                                                    <CardDescription className="text-xs">{t('Assigned Interviewers')}</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-4 px-5 pb-4">
                                            <div className="space-y-3">
                                                {interviewerUsers.map((user: any) => (
                                                    <div key={user.id} className="flex items-center gap-3">
                                                        <InterviewerAvatar name={user.name} avatar={user.avatar} className="w-9 h-9" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{user.name}</p>
                                                            {user.email && (
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </div>

            {/* Edit Feedback Form Modal */}
            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    fields: [
                        {
                            name: 'interview_id',
                            label: t('Interview'),
                            type: 'select',
                            required: false,
                            options: interviewOptions,
                            render: (field: any, formData: any, handleChange: any) => {
                                return (
                                    <Select value={interview.id.toString()} disabled>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={interview.id.toString()}>
                                                {`${interview.candidate?.first_name} ${interview.candidate?.last_name} - ${interview.job?.title}`}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                );
                            }
                        },
                        // {
                        //     name: 'interviewer_id',
                        //     label: t('Interviewer'),
                        //     type: 'multi-select',
                        //     required: true,
                        //     searchable: true,
                        //     placeholder: t('Select Interviewers'),
                        //     options: availableInterviewers
                        // },
                        {
                            name: 'technical_rating',
                            label: t('Technical Rating'),
                            type: 'number',
                            required: true,
                            render: (field: any, formData: any, handleChange: any) => (
                                <StarRating
                                    value={Number(formData[field.name]) || 0}
                                    onChange={(v) => handleChange(field.name, v)}
                                    disabled={formMode === 'view'}
                                />
                            )
                        },
                        {
                            name: 'communication_rating',
                            label: t('Communication Rating'),
                            type: 'number',
                            required: true,
                            render: (field: any, formData: any, handleChange: any) => (
                                <StarRating
                                    value={Number(formData[field.name]) || 0}
                                    onChange={(v) => handleChange(field.name, v)}
                                    disabled={formMode === 'view'}
                                />
                            )
                        },
                        {
                            name: 'cultural_fit_rating',
                            label: t('Cultural Fit Rating'),
                            type: 'number',
                            required: true,
                            render: (field: any, formData: any, handleChange: any) => (
                                <StarRating
                                    value={Number(formData[field.name]) || 0}
                                    onChange={(v) => handleChange(field.name, v)}
                                    disabled={formMode === 'view'}
                                />
                            )
                        },
                        {
                            name: 'overall_rating',
                            label: t('Overall Rating'),
                            type: 'number',
                            required: true,
                            render: (field: any, formData: any, handleChange: any) => (
                                <StarRating
                                    value={Number(formData[field.name]) || 0}
                                    onChange={(v) => handleChange(field.name, v)}
                                    disabled={formMode === 'view'}
                                />
                            )
                        },
                        {
                            name: 'recommendation',
                            label: t('Recommendation'),
                            type: 'select',
                            required: true,
                            placeholder: t('Select Recommendation'),
                            options: recommendationOptions
                        },
                        {
                            name: 'strengths',
                            label: t('Strengths'),
                            type: 'textarea',
                            required: true,
                            placeholder: t('e.g. Strong problem-solving skills, excellent communication...')
                        },
                        {
                            name: 'weaknesses',
                            label: t('Weaknesses'),
                            type: 'textarea',
                            placeholder: t('e.g. Needs improvement in time management...')
                        },
                        {
                            name: 'comments',
                            label: t('Comments'),
                            type: 'textarea',
                            placeholder: t('e.g. Overall a strong candidate, recommend for next round...')
                        }
                    ],
                    modalSize: 'xl'
                }}
                initialData={currentItem ? {
                    ...currentItem,
                    interviewer_id: currentItem.interviewer_id ? currentItem.interviewer_id.split(',') : [],
                    interview_id: interview.id.toString()
                } : null}
                title={t('Edit Interview Feedback')}
                mode={formMode}
            />

            {/* Delete Feedback Confirmation Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem ? `${currentItem.interview?.candidate?.first_name} ${currentItem.interview?.candidate?.last_name} - ${currentItem.interviewer?.name}` : ''}
                entityName="interview feedback"
            />
        </PageTemplate>
    );
}
