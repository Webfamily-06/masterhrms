import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { FileText, Tag, Calendar, Download, User, AlertTriangle, Clock, CheckCircle, Eye, FileType, FileSpreadsheet, Presentation, Hash, HardDrive, Shield } from 'lucide-react';

interface ViewHrDocumentProps {
    document: any;
}

export default function View({ document }: ViewHrDocumentProps) {
    const { t } = useTranslation();

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Draft':        return 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10';
            case 'Under Review': return 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20';
            case 'Approved':     return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            case 'Published':    return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
            case 'Archived':     return 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20';
            case 'Expired':      return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10';
            default:             return 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10';
        }
    };

    const formatFileSize = (bytes: number) => {
        if (!bytes) return '-';
        if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
        if (bytes >= 1048576)    return (bytes / 1048576).toFixed(2) + ' MB';
        if (bytes >= 1024)       return (bytes / 1024).toFixed(2) + ' KB';
        return bytes + ' bytes';
    };

    const isExpired      = document.expiry_date && new Date(document.expiry_date) < new Date();
    const isExpiringSoon = document.expiry_date && (() => {
        const expiry = new Date(document.expiry_date);
        const today  = new Date();
        return expiry > today && expiry <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    })();

    const getFileTypeIcon = (fileName: string) => {
        const ext = fileName?.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'pdf':  return <FileType className="h-5 w-5 text-red-600" />;
            case 'doc':
            case 'docx': return <FileText className="h-5 w-5 text-blue-600" />;
            case 'xls':
            case 'xlsx': return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
            case 'ppt':
            case 'pptx': return <Presentation className="h-5 w-5 text-orange-600" />;
            default:     return <FileText className="h-5 w-5 text-slate-600" />;
        }
    };

    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>

            {/* Header */}
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Document Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">

                {/* Title */}
                <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {t('Title')}
                    </label>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">{document.title || '-'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Category */}
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('Category')}
                        </label>
                        <div className="mt-1">
                            <span
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ring-1 ring-inset"
                                style={{
                                    backgroundColor: `${document.category?.color || '#3B82F6'}15`,
                                    color: document.category?.color || '#3B82F6',
                                    '--tw-ring-color': `${document.category?.color || '#3B82F6'}40`,
                                } as any}
                            >
                                {document.category?.name || '-'}
                            </span>
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusClass(document.status)}`}>
                                {t(document.status) || '-'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Effective Date */}
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Effective Date')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {document.effective_date
                                ? (window.appSettings?.formatDateTimeSimple(document.effective_date, false) || document.effective_date)
                                : '-'}
                        </p>
                    </div>

                    {/* Expiry Date */}
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t('Expiry Date')}
                        </label>
                        <p className={`mt-1 text-sm font-medium ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-gray-900 dark:text-gray-100'}`}>
                            {document.expiry_date
                                ? (window.appSettings?.formatDateTimeSimple(document.expiry_date, false) || document.expiry_date)
                                : '-'}
                            {isExpired && <span className="ml-1 text-xs">({t('Expired')})</span>}
                            {isExpiringSoon && !isExpired && <span className="ml-1 text-xs">({t('Expiring Soon')})</span>}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Uploaded By */}
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Uploaded By')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">{document.uploader?.name || '-'}</p>
                        {document.created_at && (
                            <p className="text-xs text-gray-400 mt-0.5">
                                {window.appSettings?.formatDateTimeSimple(document.created_at, true) || document.created_at}
                            </p>
                        )}
                    </div>

                    {/* Approved By */}
                    {document.approver && (
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                {t('Approved By')}
                            </label>
                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">{document.approver?.name || '-'}</p>
                            {document.approved_at && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {window.appSettings?.formatDateTimeSimple(document.approved_at, true) || document.approved_at}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* File Name */}
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            {getFileTypeIcon(document.file_name)}
                            {t('File Name')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100 break-all">{document.file_name || '-'}</p>
                    </div>

                    {/* Downloads */}
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            {t('Downloads')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">{document.download_count || 0}</p>
                    </div>
                </div>

                {/* Requires Acknowledgment */}
                {document.requires_acknowledgment && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {t('Requires Acknowledgment')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-red-600">{t('Yes')}</p>
                    </div>
                )}

                {/* Description */}
                {document.description && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Description')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed">{document.description}</p>
                    </div>
                )}

            </div>
        </DialogContent>
    );
}
