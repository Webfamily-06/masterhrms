import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { TrendingUp, Briefcase, Calendar, DollarSign, FileText, Eye, ArrowRight } from 'lucide-react';
import { getImagePath } from '@/utils/helpers';
import { useInitials } from '@/hooks/use-initials';
interface ViewPromotionProps {
    promotion: any;
}
export default function View({ promotion }: ViewPromotionProps) {
    const { t } = useTranslation();
    const getInitials = useInitials();
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800 border-green-200';
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        }
    };
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Promotion Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-6">
                {/* Employee Info */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white overflow-hidden shrink-0">
                            {promotion.employee?.avatar ? (
                                <img src={promotion.employee.avatar} alt={promotion.employee?.name} className="h-full w-full object-cover" />
                            ) : (
                                getInitials(promotion.employee?.name || '')
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">{t('Employee')}</p>
                            <p className="text-sm font-semibold text-gray-900">{promotion.employee?.name || '-'}</p>
                        </div>
                    </div>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border capitalize ${getStatusClass(promotion.status)}`}>
                        {promotion.status || '-'}
                    </span>
                </div>
                {/* Designation Progress */}
                <div>
                    <p className="text-xs font-medium text-gray-500 mb-3 tracking-wide">{t('Designation Change')}</p>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 p-3 rounded-lg border bg-red-50 border-red-100">
                            <p className="text-xs text-gray-500 mb-1">{t('Previous')}</p>
                            <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-red-400 shrink-0" />
                                <p className="text-sm font-semibold text-gray-900">{promotion.prev_designation?.name || promotion.previous_designation || '-'}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-1 shrink-0">
                            <ArrowRight className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 p-3 rounded-lg border bg-green-50 border-green-100">
                            <p className="text-xs text-gray-500 mb-1">{t('New')}</p>
                            <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-green-500 shrink-0" />
                                <p className="text-sm font-semibold text-gray-900">{promotion.designation?.name || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Timeline */}
                <div>
                    <p className="text-xs font-medium text-gray-500 mb-3 tracking-wide">{t('Timeline')}</p>
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-1 before:bottom-1 before:w-0.5 before:bg-gray-200">
                        <div className="relative">
                            <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                            </div>
                            <p className="text-xs text-gray-500">{t('Promotion Date')}</p>
                            <p className="text-sm font-semibold text-gray-900">{promotion.promotion_date ? (window.appSettings?.formatDateTimeSimple(promotion.promotion_date, false) || promotion.promotion_date) : '-'}</p>
                        </div>
                        <div className="relative">
                            <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            </div>
                            <p className="text-xs text-gray-500">{t('Effective Date')}</p>
                            <p className="text-sm font-semibold text-gray-900">{promotion.effective_date ? (window.appSettings?.formatDateTimeSimple(promotion.effective_date, false) || promotion.effective_date) : '-'}</p>
                        </div>
                    </div>
                </div>
                {/* Salary & Document */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {promotion.document && (
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                {t('Document')}
                            </label>
                            <a href={getImagePath(promotion.document)} target="_blank" className="mt-2 group block relative overflow-hidden rounded-lg border bg-gray-50 hover:border-primary transition-colors">
                                <img
                                    src={getImagePath(promotion.document)}
                                    alt={t('Document')}
                                    className="w-full h-36 object-cover group-hover:opacity-90 transition-opacity"
                                    onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                                    <Eye className="h-6 w-6 text-white" />
                                </div>
                            </a>
                        </div>
                    )}
                </div>
                {/* Reason */}
                {promotion.reason && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Reason for Promotion')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{promotion.reason}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
