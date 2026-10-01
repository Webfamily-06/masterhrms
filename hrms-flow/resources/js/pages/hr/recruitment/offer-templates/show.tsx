import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit, Code } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';

export default function ShowOfferTemplate() {
    const { t } = useTranslation();
    const { auth, offerTemplate } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Recruitment') },
        { title: t('Offer Templates'), href: route('hr.recruitment.offer-templates.index') },
        { title: t('View') },
    ];

    const pageActions: any[] = [
        {
            label: t('Back'),
            icon: <ArrowLeft className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => router.get(route('hr.recruitment.offer-templates.index')),
        },
    ];

    const variables: string[] = Array.isArray(offerTemplate.variables) ? offerTemplate.variables : [];

    return (
        <PageTemplate
            title={t('View Offer Template')}
            description={t("Preview the content and details of this offer template.")}
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
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{offerTemplate.name}</p>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Status')}</p>
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                    offerTemplate.status === 'active'
                                        ? 'bg-green-50 text-green-700 ring-green-600/20'
                                        : 'bg-red-50 text-red-700 ring-red-600/20'
                                }`}>
                                    {offerTemplate.status === 'active' ? t('Active') : t('Inactive')}
                                </span>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Created At')}</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {window.appSettings?.formatDateTimeSimple(offerTemplate.created_at, false) || new Date(offerTemplate.created_at).toLocaleDateString()}
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
                                {offerTemplate.template_content || t('No content available')}
                            </pre>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                            {offerTemplate.template_content?.length || 0} {t('characters')}
                        </p>
                    </CardContent>
                </Card>

                {/* Variables */}
                {variables.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                <Code className="h-5 w-5 text-gray-400" />
                                {t('Variables')}
                                <span className="text-sm font-normal text-gray-500">({variables.length})</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {variables.map((variable: string, index: number) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-600/20"
                                    >
                                        {`{{${variable}}}`}
                                    </span>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </PageTemplate>
    );
}
