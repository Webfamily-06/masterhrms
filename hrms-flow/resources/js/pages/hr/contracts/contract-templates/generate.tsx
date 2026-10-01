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

    const [variableValues, setVariableValues] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        (record.variables || []).forEach((v: string) => { initial[v] = ''; });
        return initial;
    });

    const handleGenerate = () => {
        if (formRef.current) {
            formRef.current.submit();
            setVariableValues(() => {
                const reset: Record<string, string> = {};
                (record.variables || []).forEach((v: string) => { reset[v] = ''; });
                return reset;
            });
            onClose();
        }
    };

    const filename = `${record.name}_${new Date().toISOString().split('T')[0]}`;
    const generateUrl = route('hr.contracts.contract-templates.generate', record.id);

    return (
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <FileDown className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-semibold">{t('Generate Contract')}</DialogTitle>
                        <p className="text-sm text-gray-500 mt-0.5">{record.name}</p>
                    </div>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Hidden form that submits to controller — browser handles PDF download natively */}
                <form ref={formRef} method="POST" action={generateUrl} style={{ display: 'none' }}>
                    <input type="hidden" name="_token" value={csrf_token} />
                    <input type="hidden" name="filename" value={filename} />
                    {Object.entries(variableValues).map(([key, value]) => (
                        <input key={key} type="hidden" name={`variables[${key}]`} value={value} />
                    ))}
                </form>

                {record.variables && record.variables.length > 0 ? (
                    <>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('Fill in the values for the template variables below.')}
                        </p>
                        <div className="space-y-3">
                            {record.variables.map((variable: string) => (
                                <div key={variable} className="space-y-1.5">
                                    <Label htmlFor={variable} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {variable.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                    </Label>
                                    <Input
                                        id={variable}
                                        value={variableValues[variable] || ''}
                                        onChange={(e) => setVariableValues(prev => ({ ...prev, [variable]: e.target.value }))}
                                        placeholder={`Enter ${variable.replace(/_/g, ' ')}`}
                                    />
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('This template has no variables. Click Generate to download the PDF.')}
                        </p>
                    </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <Button variant="outline" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button onClick={handleGenerate}>
                        <FileDown className="h-4 w-4 mr-2" />
                        {t('Generate PDF')}
                    </Button>
                </div>
            </div>
        </DialogContent>
    );
}
