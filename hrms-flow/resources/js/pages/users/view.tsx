import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { User, Mail, Lock, Calendar, ShieldCheck } from 'lucide-react';

interface ViewProps {
    record: any;
}

export default function View({ record }: ViewProps) {
    const { t } = useTranslation();

    return (
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <User className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('User Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Name & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Name')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {t('Email')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.email || '-'}</p>
                    </div>
                </div>

                {/* Status & Joined */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            {t('Status')}
                        </label>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                record.status === 'active'
                                    ? 'bg-green-50 text-green-700 ring-green-600/20'
                                    : 'bg-red-50 text-red-700 ring-red-600/20'
                            }`}>
                                {record.status === 'active' ? t('Active') : t('Inactive')}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('Joined')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {record.created_at ? (window.appSettings?.formatDateTimeSimple(record.created_at, false) || record.created_at) : '-'}
                        </p>
                    </div>
                </div>

                {/* Roles */}
                <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        {t('Roles')}
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {record.roles && record.roles.length > 0 ? (
                            record.roles.map((role: any) => (
                                <span key={role.id} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                    {role.label || role.name}
                                </span>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500">{t('No roles assigned')}</p>
                        )}
                    </div>
                </div>
            </div>
        </DialogContent>
    );
}
