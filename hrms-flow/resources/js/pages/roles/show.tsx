import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { hasPermission } from '@/utils/authorization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit } from 'lucide-react';

export default function RolesShow() {
    const { t } = useTranslation();
    const { auth, role, permissions: allPermissions } = usePage().props as any;
    const userPermissions = auth?.permissions || [];

    const assignedPermissionNames: string[] = role.permissions?.map((p: any) => p.name) || [];

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('System Users') },
        { title: t('Roles'), href: route('roles.index') },
        { title: role.label || t('View Role') },
    ];

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
            title={role.label || t('View Role')}
            description={t("View permissions and details assigned to this role.")}
            url={`/roles/${role.id}`}
            actions={pageActions}
            breadcrumbs={breadcrumbs}
        >
            <div className="space-y-6">

                {/* Basic Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">{t('Role Information')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('Role Name')}</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{role.label || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('Slug')}</p>
                                <p className="mt-1 text-sm font-mono text-gray-600 dark:text-gray-400">{role.name || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('Total Permissions')}</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{assignedPermissionNames.length}</p>
                            </div>
                            {role.description && (
                                <div className="sm:col-span-2 md:col-span-3">
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('Description')}</p>
                                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{role.description}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Permissions grouped by module */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">{t('Assigned Permissions')}</CardTitle>
                        <CardDescription>{t('Permissions assigned to this role, grouped by module.')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {assignedPermissionNames.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                                {t('No permissions assigned to this role.')}
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {Object.entries(allPermissions as Record<string, any[]>).map(([module, modulePermissions]) => {
                                    const assignedInModule = modulePermissions.filter(p =>
                                        assignedPermissionNames.includes(p.name)
                                    );

                                    if (assignedInModule.length === 0) return null;

                                    return (
                                        <div key={module} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                                            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                    {module}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-0.5 rounded-full border dark:border-gray-600">
                                                    {assignedInModule.length} / {modulePermissions.length}
                                                </span>
                                            </div>
                                            <div className="p-3 flex flex-wrap gap-1.5">
                                                {assignedInModule.map((permission) => (
                                                    <Badge
                                                        key={permission.id}
                                                        variant="outline"
                                                        className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 text-xs font-normal"
                                                    >
                                                        {permission.label || permission.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </PageTemplate>
    );
}
