import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { PermissionBadges } from '@/components/PermissionBadges';
import { Plus } from 'lucide-react';

export default function RolesIndex() {
    const { t } = useTranslation();
    const { auth, roles, filters: pageFilters = {}, globalSettings } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [showFilters, setShowFilters] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);

    const hasActiveFilters = () => searchTerm !== '';
    const activeFilterCount = () => (searchTerm !== '' ? 1 : 0);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('roles.index'), {
            page: 1,
            search: searchTerm || undefined,
            per_page: pageFilters.per_page,
            sort_field: pageFilters.sort_field || undefined,
            sort_direction: pageFilters.sort_direction || undefined,
        }, { preserveState: true, preserveScroll: true });
    };

    const handlePageChange = (url: string) => {
        const pageNum = new URL(url).searchParams.get('page') || '1';
        router.get(route('roles.index'), {
            page: pageNum,
            search: searchTerm || undefined,
            per_page: pageFilters.per_page,
            sort_field: pageFilters.sort_field || undefined,
            sort_direction: pageFilters.sort_direction || undefined,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get(route('roles.index'), {
            sort_field: field,
            sort_direction: direction,
            page: 1,
            search: searchTerm || undefined,
            per_page: pageFilters.per_page,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);
        switch (action) {
            case 'view':
                router.get(route('roles.show', item.id));
                break;
            case 'edit':
                router.get(route('roles.edit', item.id));
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
        }
    };

    const handleDeleteConfirm = () => {
        if (!globalSettings?.is_demo) toast.loading(t('Deleting role...'));
        router.delete(route('roles.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                if (!globalSettings?.is_demo) toast.dismiss();
                if (page.props.flash.success) toast.success(t(page.props.flash.success));
                else if (page.props.flash.error) toast.error(t(page.props.flash.error));
            },
            onError: (errors) => {
                if (!globalSettings?.is_demo) toast.dismiss();
                toast.error(typeof errors === 'string' ? t(errors) : Object.values(errors).join(', '));
            },
        });
    };

    const handleResetFilters = () => {
        router.get(route('roles.index'));
    };

    const pageActions = [];
    if (hasPermission(permissions, 'create-roles')) {
        pageActions.push({
            label: t('Add Role'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => router.get(route('roles.create')),
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('System Users') },
        { title: t('Roles') },
    ];

    const columns = [
        { key: 'label', label: t('Name'), sortable: true, render: (value) => <span className="font-semibold">{value || '-'}</span> },
        {
            key: 'permissions',
            label: t('Permissions'),
            render: (value) => <PermissionBadges permissions={value || []} />,
        },
    ];

    const actions = [
        { label: t('View'), icon: 'Eye', action: 'view', className: 'text-blue-500', requiredPermission: 'view-roles' },
        { label: t('Edit'), icon: 'Edit', action: 'edit', className: 'text-amber-500', requiredPermission: 'edit-roles' },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-roles',
            showWhen: (item) => item.is_editable,
        },
    ];

    return (
        <PageTemplate
            title={t('Roles')}
            description={t("Define roles and control permission access.")}
            url="/roles"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[]}
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                />
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                <CrudTable
                    columns={columns}
                    actions={actions}
                    data={roles?.data || []}
                    from={roles?.from || 1}
                    onAction={handleAction}
                    sortField={pageFilters.sort_field}
                    sortDirection={pageFilters.sort_direction}
                    onSort={handleSort}
                    permissions={permissions}
                    entityPermissions={{
                        view: 'view-roles',
                        create: 'create-roles',
                        edit: 'edit-roles',
                        delete: 'delete-roles',
                    }}
                />
                <Pagination
                    from={roles?.from || 0}
                    to={roles?.to || 0}
                    total={roles?.total || 0}
                    links={roles?.links}
                    entityName={t('roles')}
                    onPageChange={handlePageChange}
                    currentPerPage={pageFilters.per_page?.toString() || '10'}
                    onPerPageChange={(value) => {
                        router.get(route('roles.index'), {
                            page: 1,
                            per_page: parseInt(value),
                            search: searchTerm || undefined,
                            sort_field: pageFilters.sort_field || undefined,
                            sort_direction: pageFilters.sort_direction || undefined,
                        }, { preserveState: true, preserveScroll: true });
                    }}
                />
            </div>

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.label || ''}
                entityName="role"
            />
        </PageTemplate>
    );
}
