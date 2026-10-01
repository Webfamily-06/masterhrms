import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { Trophy, User, Tag, Calendar, Gift, DollarSign, FileText, Image, Eye } from 'lucide-react';
import { getImagePath } from '@/utils/helpers';
interface ViewAwardProps {
    award: any;
}
export default function View({ award }: ViewAwardProps) {
    const { t } = useTranslation();
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Trophy className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Award Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Employee')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{award.employee?.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Award Type')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{award.award_type?.name || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Award Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{award.award_date ? (window.appSettings?.formatDateTimeSimple(award.award_date, false) || award.award_date) : '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Gift className="h-4 w-4" />
                            {t('Gift')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{award.gift || '-'}</p>
                    </div>
                </div>
                {(award.certificate || award.photo) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {award.certificate && (
                            <div>
                                <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                    <Image className="h-4 w-4" />
                                    {t('Certificate')}
                                </label>
                                <a href={getImagePath(award.certificate)} target="_blank" className="mt-2 group block relative overflow-hidden rounded-lg border bg-gray-50 hover:border-primary transition-colors">
                                    <img
                                        src={getImagePath(award.certificate)}
                                        alt={t('Certificate')}
                                        className="w-full h-36 object-cover group-hover:opacity-90 transition-opacity"
                                        onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                                        <Eye className="h-6 w-6 text-white" />
                                    </div>
                                </a>
                            </div>
                        )}
                        {award.photo && (
                            <div>
                                <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                    <Image className="h-4 w-4" />
                                    {t('Photo')}
                                </label>
                                <a href={getImagePath(award.photo)} target="_blank" className="mt-2 group block relative overflow-hidden rounded-lg border bg-gray-50 hover:border-primary transition-colors">
                                    <img
                                        src={getImagePath(award.photo)}
                                        alt={t('Photo')}
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
                )}
                {award.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{award.description}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
