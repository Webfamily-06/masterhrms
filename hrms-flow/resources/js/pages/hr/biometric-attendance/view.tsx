import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { Timer } from 'lucide-react';

interface ViewProps {
    employee: { code: string; date: string; name: string } | null;
    entries: any[];
}

export default function View({ employee, entries }: ViewProps) {
    const { t } = useTranslation();

    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Timer className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-semibold">
                            {t('Punch Details')} — {employee?.name}
                            {employee?.code && (
                                <span className="text-base font-normal text-gray-500 ml-1">({employee.code})</span>
                            )}
                        </DialogTitle>
                        {employee?.date && (
                            <p className="text-sm text-gray-500 mt-0.5">
                                {window.appSettings.formatDateTimeSimple(employee.date, false)}
                            </p>
                        )}
                    </div>
                </div>
            </DialogHeader>
            <div className="px-6 py-4 pb-6">
                <div className="max-h-96 overflow-y-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                            <tr className="border-b">
                                <th className="text-left px-3 py-2 text-xs font-bold text-gray-700 tracking-wider">{t('Time')}</th>
                                <th className="text-left px-3 py-2 text-xs font-bold text-gray-700 tracking-wider">{t('Status')}</th>
                                <th className="text-left px-3 py-2 text-xs font-bold text-gray-700 tracking-wider">{t('Verify Type')}</th>
                                <th className="text-left px-3 py-2 text-xs font-bold text-gray-700 tracking-wider">{t('Terminal')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {entries.map((entry: any) => (
                                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-3 py-2 font-mono text-sm font-medium text-gray-900">{entry.time}</td>
                                    <td className="px-3 py-2 text-sm text-gray-700">{entry.punch_state_display}</td>
                                    <td className="px-3 py-2 text-sm text-gray-700">{entry.verify_type_display}</td>
                                    <td className="px-3 py-2 text-sm text-gray-700">{entry.terminal_alias}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {entries.length === 0 && (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            {t('No entries found')}
                        </div>
                    )}
                </div>
            </div>
        </DialogContent>
    );
}
