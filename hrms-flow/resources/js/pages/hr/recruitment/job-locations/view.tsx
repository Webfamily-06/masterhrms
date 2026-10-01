import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { MapPin, Lock, Globe, Hash, Building2 } from 'lucide-react';
interface ViewJobLocationProps {
    jobLocation: any;
}
export default function View({ jobLocation }: ViewJobLocationProps) {
    const { t } = useTranslation();
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Job Location Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {t('Name')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{jobLocation.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {t('Type')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${jobLocation.is_remote ? 'bg-blue-50 text-blue-700 ring-blue-600/20' : 'bg-gray-50 text-gray-600 ring-gray-500/10'}`}>
                                {jobLocation.is_remote ? t('Remote') : t('On-site')}
                            </span>
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${jobLocation.status === 'active' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'}`}>
                                {jobLocation.status === 'active' ? t('Active') : t('Inactive')}
                            </span>
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {t('City')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{jobLocation.city || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {t('State')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{jobLocation.state || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            {t('Country')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{jobLocation.country || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            {t('Postal Code')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{jobLocation.postal_code || '-'}</p>
                    </div>
                </div>
                {jobLocation.address && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {t('Address')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{jobLocation.address}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
