import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RolePermissionCheckboxGroup } from '@/components/RolePermissionCheckboxGroup';
import { Save, ArrowLeft } from 'lucide-react';

export default function RolesCreate() {
    const { t } = useTranslation();
    const { auth, permissions, globalSettings } = usePage().props as any;
    const isDemo = globalSettings?.is_demo;

    const [label, setLabel] = useState('');
    const [description, setDescription] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('System Users') },
        { title: t('Roles'), href: route('roles.index') },
        { title: t('Add Role') },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors: Record<string, string> = {};
        if (!label.trim()) newErrors.label = t('Role name is required');
        if (selectedPermissions.length === 0) newErrors.permissions = t('At least one permission is required');

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        if (!isDemo) {
            setProcessing(true);
            if (!globalSettings?.is_demo) toast.loading(t('Creating role...'));
        }

        router.post(route('roles.store'), {
            label,
            description,
            permissions: selectedPermissions,
        }, {
            onSuccess: (page) => {
                if (!isDemo) {
                    if (!globalSettings?.is_demo) toast.dismiss();
                    if (page.props.flash.success) toast.success(t(page.props.flash.success));
                    else if (page.props.flash.error) toast.error(t(page.props.flash.error));
                }
            },
            onError: (errs) => {
                if (!isDemo) if (!globalSettings?.is_demo) toast.dismiss();
                if (typeof errs === 'object') setErrors(errs as Record<string, string>);
                else if (!isDemo) toast.error(t(errs));
            },
            onFinish: () => setProcessing(false),
        });
    };

    const pageActions = [
        {
            label: t('Back'),
            icon: <ArrowLeft className="h-4 w-4 mr-2" />,
            variant: 'outline' as const,
            onClick: () => router.get(route('roles.index')),
        },
    ];

    return (
        <PageTemplate
            title={t('Add Role')}
            description={t("Create a new role and assign permissions.")}
            url="/roles/create"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
        >
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Basic Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">{t('Role Information')}</CardTitle>
                        <CardDescription>{t('Enter the role name and an optional description.')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label required htmlFor="label">{t('Role Name')}</Label>
                                <Input
                                    id="label"
                                    required
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    placeholder={t('e.g. HR Manager, Team Lead, Accountant')}
                                    className={errors.label ? 'border-red-500' : ''}
                                />
                                {errors.label && <p className="text-xs text-red-500">{errors.label}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="description">{t('Description')}</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={t('Enter role description...')}
                                    rows={3}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Permissions */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">{t('Role Permissions')}</CardTitle>
                        <CardDescription>
                            {t('Select permissions for this role. You can select all permissions at once or manage them by module.')}
                            {auth?.user?.type !== 'superadmin' && (
                                <span className="block mt-1 text-amber-600 text-xs">
                                    {t('Note: Only permissions for modules available to your role are shown.')}
                                </span>
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {errors.permissions && (
                            <p className="text-xs text-red-500 mb-3">{errors.permissions}</p>
                        )}
                        <RolePermissionCheckboxGroup
                            permissions={permissions}
                            selectedPermissions={selectedPermissions}
                            onChange={setSelectedPermissions}
                        />
                    </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pb-2">
                    <Button type="button" variant="outline" onClick={() => router.get(route('roles.index'))}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && !isDemo ? t('Saving...') : t('Save')}
                    </Button>
                </div>

            </form>
        </PageTemplate>
    );
}
