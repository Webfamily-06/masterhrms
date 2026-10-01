import { PageTemplate } from '@/components/page-template';
import { usePage, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/components/custom-toast';

export default function CreateContractTemplate() {
    const { t } = useTranslation();
    const { contractTypes, globalSettings } = usePage().props as any;

    const { data, setData, post, processing, errors, clearErrors } = useForm({
        name: '',
        description: '',
        contract_type_id: '',
        template_content: '',
        variables: '',
        clauses: '',
        is_default: false as boolean,
        status: 'active',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        clearErrors();

        if (!globalSettings?.is_demo) toast.loading(t('Creating contract template...'));

        post(route('hr.contracts.contract-templates.store'), {
            onSuccess: (page) => {
                if (!globalSettings?.is_demo) toast.dismiss();
                if (page.props.flash?.success) toast.success(t(page.props.flash.success));
            },
            onError: () => {
                if (!globalSettings?.is_demo) toast.dismiss();
                toast.error(t('Please fix the errors below'));
            },
        });
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Documents & Contracts') },
        { title: t('Contract Templates'), href: route('hr.contracts.contract-templates.index') },
        { title: t('Create') },
    ];

    return (
        <PageTemplate
            title={t('Create Contract Template')}
            description={t("Build a new reusable contract template.")}
            breadcrumbs={breadcrumbs}
            actions={[
                {
                    label: t('Back'),
                    icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                    variant: 'outline',
                    onClick: () => router.get(route('hr.contracts.contract-templates.index')),
                },
            ]}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Basic Information')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="name" required>{t('Template Name')}</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder={t('Enter template name')}
                                    required
                                    className={errors.name ? 'border-red-500' : ''}
                                />
                                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <Label htmlFor="contract_type_id" required>{t('Contract Type')}</Label>
                                <Select value={data.contract_type_id} onValueChange={(v) => setData('contract_type_id', v)}>
                                    <SelectTrigger className={errors.contract_type_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select Contract Type')} />
                                    </SelectTrigger>
                                    <SelectContent searchable>
                                        {contractTypes?.map((type: any) => (
                                            <SelectItem key={type.id} value={type.id.toString()}>{type.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.contract_type_id && <p className="text-sm text-red-500 mt-1">{errors.contract_type_id}</p>}
                            </div>

                            <div>
                                <Label htmlFor="status" required>{t('Status')}</Label>
                                <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                                    <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.status && <p className="text-sm text-red-500 mt-1">{errors.status}</p>}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="description">{t('Description')}</Label>
                            <Textarea
                                id="description"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                placeholder={t('Enter description')}
                                rows={2}
                                className={errors.description ? 'border-red-500' : ''}
                            />
                            {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="is_default"
                                checked={data.is_default}
                                onCheckedChange={(checked) => setData('is_default', checked as boolean)}
                            />
                            <Label htmlFor="is_default">{t('Set as Default for Contract Type')}</Label>
                        </div>
                    </CardContent>
                </Card>

                {/* Template Content */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Template Content')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div>
                            <Label htmlFor="template_content" required>{t('Content')}</Label>
                            <p className="text-xs text-gray-500 mb-1">{t('Use {{variable_name}} for dynamic content')}</p>
                            <Textarea
                                id="template_content"
                                value={data.template_content}
                                onChange={(e) => setData('template_content', e.target.value)}
                                placeholder={t('Enter template content...')}
                                rows={14}
                                required
                                className={`font-mono text-sm ${errors.template_content ? 'border-red-500' : ''}`}
                            />
                            {errors.template_content && <p className="text-sm text-red-500 mt-1">{errors.template_content}</p>}
                        </div>
                    </CardContent>
                </Card>

                {/* Variables */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Variables')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div>
                            <Label htmlFor="variables" required>{t('Variables')}</Label>
                            <p className="text-xs text-gray-500 mb-1">{t('Comma-separated list of variable names (without {{}})')}</p>
                            <Input
                                id="variables"
                                value={data.variables}
                                onChange={(e) => setData('variables', e.target.value)}
                                placeholder="employee_name, company_name, start_date"
                                required
                                className={errors.variables ? 'border-red-500' : ''}
                            />
                            {errors.variables && <p className="text-sm text-red-500 mt-1">{errors.variables}</p>}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => router.get(route('hr.contracts.contract-templates.index'))}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing ? t('Creating...') : t('Create Template')}
                    </Button>
                </div>
            </form>
        </PageTemplate>
    );
}
