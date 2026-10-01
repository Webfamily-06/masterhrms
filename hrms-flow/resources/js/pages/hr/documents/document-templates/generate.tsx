import { useRef, useState } from 'react';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { FileDown, FileText } from 'lucide-react';
import { usePage } from '@inertiajs/react';

interface GenerateProps {
    record: any;
    onClose: () => void;
}

export default function Generate({ record, onClose }: GenerateProps) {
    const { t } = useTranslation();
    const { csrf_token } = usePage().props as any;
    const formRef = useRef<HTMLFormElement>(null);

    const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        (record.placeholders || []).forEach((p: string) => {
            initial[p] = record.default_values?.[p] || '';
        });
        return initial;
    });

    const handleGenerate = () => {
        if (formRef.current) {
            formRef.current.submit();
            setPlaceholderValues(() => {
                const reset: Record<string, string> = {};
                (record.placeholders || []).forEach((p: string) => { reset[p] = ''; });
                return reset;
            });
            onClose();
        }
    };

    const filename = `${record.name}_${new Date().toISOString().split('T')[0]}`;
    const generateUrl = route('hr.documents.document-templates.generate', record.id);
    const fileFormat = record.file_format || 'txt';

    return (
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <FileDown className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-semibold">{t('Generate Document')}</DialogTitle>
                        <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-sm text-gray-500">{record.name}</p>
                            <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                {fileFormat.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Hidden form — browser handles file download natively */}
                <form ref={formRef} method="POST" action={generateUrl} style={{ display: 'none' }}>
                    <input type="hidden" name="_token" value={csrf_token} />
                    <input type="hidden" name="filename" value={filename} />
                    {Object.entries(placeholderValues).map(([key, value]) => (
                        <input key={key} type="hidden" name={`values[${key}]`} value={value} />
                    ))}
                </form>

                {record.placeholders && record.placeholders.length > 0 ? (
                    <>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Fill in the values for the template placeholders below.')}
                        </p>
                        <div className="space-y-3">
                            {record.placeholders.map((placeholder: string) => (
                                <div key={placeholder} className="space-y-1.5">
                                    <Label htmlFor={placeholder} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {placeholder.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                    </Label>
                                    <Input
                                        id={placeholder}
                                        value={placeholderValues[placeholder] || ''}
                                        onChange={(e) => setPlaceholderValues(prev => ({ ...prev, [placeholder]: e.target.value }))}
                                        placeholder={`Enter ${placeholder.replace(/_/g, ' ')}`}
                                    />
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('This template has no placeholders. Click Generate to download the document.')}
                        </p>
                    </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <Button variant="outline" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button onClick={handleGenerate}>
                        <FileDown className="h-4 w-4 mr-2" />
                        {t('Generate')} {fileFormat.toUpperCase()}
                    </Button>
                </div>
            </div>
        </DialogContent>
    );
}
