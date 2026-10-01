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

export default function CreateDocumentTemplate() {
    const { t } = useTranslation();
    const { categories, globalSettings } = usePage().props as any;

    const { data, setData, post, processing, errors, clearErrors } = useForm({
        name: '',
        description: '',
        category_id: '',
        template_content: '',
        placeholders: '',
        default_values: '',
        file_format: 'pdf',
        is_default: false as boolean,
        status: 'active',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        clearErrors();

        // Client-side JSON validation before sending
        if (data.default_values) {
            try {
                JSON.parse(data.default_values);
            } catch {
                toast.error(t('Default Values must be valid JSON'));
                return;
            }
        }

        if (!globalSettings?.is_demo) toast.loading(t('Creating document template...'));

        post(route('hr.documents.document-templates.store'), {
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
        { title: t('Document Templates'), href: route('hr.documents.document-templates.index') },
        { title: t('Create') },
    ];

    return (
        <PageTemplate
            title={t('Create Document Template')}
            description={t("Build a new reusable document template.")}
            breadcrumbs={breadcrumbs}
            actions={[
                {
                    label: t('Back'),
                    icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                    variant: 'outline',
                    onClick: () => router.get(route('hr.documents.document-templates.index')),
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
                                <Label htmlFor="category_id" required>{t('Category')}</Label>
                                <Select value={data.category_id} onValueChange={(v) => setData('category_id', v)}>
                                    <SelectTrigger className={errors.category_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select Category')} />
                                    </SelectTrigger>
                                    <SelectContent searchable>
                                        {categories?.map((cat: any) => (
                                            <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.category_id && <p className="text-sm text-red-500 mt-1">{errors.category_id}</p>}
                            </div>

                            <div>
                                <Label htmlFor="file_format">{t('File Format')}</Label>
                                <Select value={data.file_format} onValueChange={(v) => setData('file_format', v)}>
                                    <SelectTrigger className={errors.file_format ? 'border-red-500' : ''}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pdf">PDF</SelectItem>
                                        <SelectItem value="doc">DOC</SelectItem>
                                        <SelectItem value="docx">DOCX</SelectItem>
                                        <SelectItem value="txt">TXT</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.file_format && <p className="text-sm text-red-500 mt-1">{errors.file_format}</p>}
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
                            <Label htmlFor="is_default">{t('Set as Default for Category')}</Label>
                        </div>
                    </CardContent>
                </Card>

                {/* Template Content */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Template Content')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="template_content" required>{t('Content')}</Label>
                            <p className="text-xs text-gray-500 mb-1">{t('Use {{placeholder_name}} for dynamic content')}</p>
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

                {/* Placeholders & Default Values */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Placeholders & Default Values')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="placeholders" required>{t('Placeholders')}</Label>
                            <p className="text-xs text-gray-500 mb-1">{t('Comma-separated list of placeholder names (without {{}})')}</p>
                            <Input
                                id="placeholders"
                                value={data.placeholders}
                                onChange={(e) => setData('placeholders', e.target.value)}
                                placeholder="employee_name, company_name, date"
                                required
                                className={errors.placeholders ? 'border-red-500' : ''}
                            />
                            {errors.placeholders && <p className="text-sm text-red-500 mt-1">{errors.placeholders}</p>}
                        </div>

                        <div>
                            <Label htmlFor="default_values">{t('Default Values')}</Label>
                            <p className="text-xs text-gray-500 mb-1">{t('JSON object e.g. {"company_name": "Acme Inc"}')}</p>
                            <Textarea
                                id="default_values"
                                value={data.default_values}
                                onChange={(e) => setData('default_values', e.target.value)}
                                placeholder={'{\n  "company_name": "Acme Inc"\n}'}
                                rows={4}
                                className={`font-mono text-sm ${errors.default_values ? 'border-red-500' : ''}`}
                            />
                            {errors.default_values && <p className="text-sm text-red-500 mt-1">{errors.default_values}</p>}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => router.get(route('hr.documents.document-templates.index'))}>
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
