import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { Plane, MapPin, Calendar, DollarSign, FileText, Eye } from 'lucide-react';
import { getImagePath } from '@/utils/helpers';
interface ViewTripProps {
    trip: any;
}
export default function View({ trip }: ViewTripProps) {
    const { t } = useTranslation();
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'ongoing': return 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20';
            case 'completed': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'cancelled': return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20';
            default: return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
        }
    };
    const getAdvanceStatusClass = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20';
            case 'paid': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'reconciled': return 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20';
            default: return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
        }
    };
    const getReimbursementStatusClass = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20';
            case 'paid': return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            default: return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
        }
    };
    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Plane className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Trip Details')}</DialogTitle>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Purpose')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{trip.purpose || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {t('Destination')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{trip.destination || '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Start Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{trip.start_date ? (window.appSettings?.formatDateTimeSimple(trip.start_date, false) || trip.start_date) : '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('End Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{trip.end_date ? (window.appSettings?.formatDateTimeSimple(trip.end_date, false) || trip.end_date) : '-'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <p className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ${getStatusClass(trip.status)}`}>
                                {trip.status || '-'}
                            </span>
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            {t('Advance Amount')}
                        </label>
                        <div className="mt-1 flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 font-mono">{trip.advance_amount ? window.appSettings?.formatCurrency(trip.advance_amount) : '-'}</p>
                            {trip.advance_status && (
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ${getAdvanceStatusClass(trip.advance_status)}`}>
                                    {trip.advance_status}
                                </span>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            {t('Total Expenses')}
                        </label>
                        <div className="mt-1 flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 font-mono">{trip.total_expenses ? window.appSettings?.formatCurrency(trip.total_expenses) : '-'}</p>
                            {trip.reimbursement_status && (
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ${getReimbursementStatusClass(trip.reimbursement_status)}`}>
                                    {trip.reimbursement_status}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {trip.documents && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                {t('Documents')}
                            </label>
                            <a href={getImagePath(trip.documents)} target="_blank" rel="noreferrer" className="mt-2 group block relative overflow-hidden rounded-lg border bg-gray-50 hover:border-primary transition-colors">
                                <img
                                    src={getImagePath(trip.documents)}
                                    alt={t('Document')}
                                    className="w-full h-36 object-cover group-hover:opacity-90 transition-opacity"
                                    onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                                    <Eye className="h-6 w-6 text-white" />
                                </div>
                            </a>
                        </div>
                    </div>
                )}
                {trip.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{trip.description}</p>
                    </div>
                )}
                {trip.expected_outcomes && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Expected Outcomes')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{trip.expected_outcomes}</p>
                    </div>
                )}
                {trip.trip_report && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Trip Report')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900">{trip.trip_report}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
