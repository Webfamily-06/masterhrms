import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit, FileText, Star, Code, Tag } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';

export default function ShowDocumentTemplate() {
    const { t } = useTranslation();
    const { auth, documentTemplate } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Documents & Contracts') },
        { title: t('Document Templates'), href: route('hr.documents.document-templates.index') },
        { title: t('View') },
    ];

    const pageActions: any[] = [
        {
            label: t('Back'),
            icon: <ArrowLeft className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => router.get(route('hr.documents.document-templates.index')),
        },
    ];

    const placeholders: string[] = Array.isArray(documentTemplate.placeholders)
        ? documentTemplate.placeholders
        : [];

    return (
        <PageTemplate
            title={t('View Document Template')}
            description={t("Preview the content and details of this document template.")}
            breadcrumbs={breadcrumbs}
            actions={pageActions}
        >
            <div className="space-y-6">
                {/* Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {t('Basic Information')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Template Name')}</p>
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                                        style={{ backgroundColor: documentTemplate.category?.color || '#3B82F6' }}
                                    >
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{documentTemplate.name}</p>
                                        {documentTemplate.is_default && (
                                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Category')}</p>
                                <div className="flex items-center gap-1.5">
                                    <Tag className="h-4 w-4 text-gray-400" />
                                    <p className="text-sm text-gray-900 dark:text-gray-100">{documentTemplate.category?.name || '-'}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('File Format')}</p>
                                <span className="inline-flex items-center rounded-md bg-gray-50 dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10">
                                    {documentTemplate.file_format?.toUpperCase() || '-'}
                                </span>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Status')}</p>
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                    documentTemplate.status === 'active'
                                        ? 'bg-green-50 text-green-700 ring-green-600/20'
                                        : 'bg-red-50 text-red-700 ring-red-600/20'
                                }`}>
                                    {documentTemplate.status === 'active' ? t('Active') : t('Inactive')}
                                </span>
                            </div>

                            {documentTemplate.description && (
                                <div className="md:col-span-2">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Description')}</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{documentTemplate.description}</p>
                                </div>
                            )}

                            <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Created At')}</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {window.appSettings?.formatDateTimeSimple(documentTemplate.created_at, false) || new Date(documentTemplate.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Template Content */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {t('Template Content')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                            <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 dark:text-gray-200">
                                {documentTemplate.template_content || t('No content available')}
                            </pre>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                            {documentTemplate.template_content?.length || 0} {t('characters')}
                        </p>
                    </CardContent>
                </Card>

                {/* Placeholders */}
                {placeholders.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                <Code className="h-5 w-5 text-gray-400" />
                                {t('Placeholders')}
                                <span className="text-sm font-normal text-gray-500">({placeholders.length})</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {placeholders.map((placeholder: string, index: number) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-600/20"
                                    >
                                        {`{{${placeholder}}}`}
                                    </span>
                                ))}
                            </div>

                            {/* Default values */}
                            {documentTemplate.default_values && Object.keys(documentTemplate.default_values).length > 0 && (
                                <div className="mt-4">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('Default Values')}</p>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                                        <pre className="text-xs font-mono text-gray-700 dark:text-gray-300">
                                            {JSON.stringify(documentTemplate.default_values, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </PageTemplate>
    );
}
