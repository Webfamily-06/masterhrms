import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudTable } from '@/components/CrudTable';
import { toast } from '@/components/custom-toast';
import { PageTemplate } from '@/components/page-template';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { hasPermission } from '@/utils/authorization';
import { router, usePage } from '@inertiajs/react';
import { AlertTriangle, Calendar, CheckCircle, Clock, FileText, Plus, XCircle, LayoutGrid, BadgeCheck, AlertOctagon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/dialog';
import View from './view';
import { useInitials } from '@/hooks/use-initials';

export default function DocumentAcknowledgments() {
    const { t } = useTranslation();
    const { auth, documentAcknowledgments, statusCounts = {}, documents, users, filters: pageFilters = {}, globalSettings } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const getInitials = useInitials();

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [documentFilter, setDocumentFilter] = useState(pageFilters.document_id || '_empty_');
    const [userFilter, setUserFilter] = useState(pageFilters.user_id || '_empty_');
    const [statusFilter, setStatusFilter] = useState(pageFilters.status || '_empty_');
    const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [documentFilter, userFilter, statusFilter]);
    const [showFilters, setShowFilters] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isAcknowledgeModalOpen, setIsAcknowledgeModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [viewingItem, setViewingItem] = useState<any>(null);

    const hasActiveFilters = () => {
        return documentFilter !== '_empty_' || userFilter !== '_empty_' || statusFilter !== '_empty_' || searchTerm !== '';
    };

    const activeFilterCount = () => {
        return (
            (documentFilter !== '_empty_' ? 1 : 0) +
            (userFilter !== '_empty_' ? 1 : 0) +
            (statusFilter !== '_empty_' ? 1 : 0) +
            (searchTerm !== '' ? 1 : 0)
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(
            route('hr.documents.document-acknowledgments.index'),
            {
                page: 1,
                search: searchTerm || undefined,
                document_id: documentFilter !== '_empty_' ? documentFilter : undefined,
                user_id: userFilter !== '_empty_' ? userFilter : undefined,
                status: statusFilter !== '_empty_' ? statusFilter : undefined,
                per_page: pageFilters.per_page,
                sort_field: pageFilters.sort_field || undefined,
                sort_direction: pageFilters.sort_direction || undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handlePageChange = (url: string) => {
        const pageNum = new URL(url).searchParams.get('page') || '1';
        router.get(
            route('hr.documents.document-acknowledgments.index'),
            {
                page: pageNum,
                search: searchTerm || undefined,
                document_id: documentFilter !== '_empty_' ? documentFilter : undefined,
                user_id: userFilter !== '_empty_' ? userFilter : undefined,
                status: statusFilter !== '_empty_' ? statusFilter : undefined,
                per_page: pageFilters.per_page,
                sort_field: pageFilters.sort_field || undefined,
                sort_direction: pageFilters.sort_direction || undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

        router.get(
            route('hr.documents.document-acknowledgments.index'),
            {
                sort_field: field,
                sort_direction: direction,
                page: 1,
                search: searchTerm || undefined,
                document_id: documentFilter !== '_empty_' ? documentFilter : undefined,
                user_id: userFilter !== '_empty_' ? userFilter : undefined,
                status: statusFilter !== '_empty_' ? statusFilter : undefined,
                per_page: pageFilters.per_page,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);

        switch (action) {
            case 'view':
                setViewingItem(item);
                break;
            case 'edit':
                setFormMode('edit');
                setIsFormModalOpen(true);
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
            case 'acknowledge':
                setIsAcknowledgeModalOpen(true);
                break;
        }
    };

    const handleAddNew = () => {
        setCurrentItem(null);
        setFormMode('create');
        setIsFormModalOpen(true);
    };

    const handleFormSubmit = (formData: any) => {
        if (formMode === 'create') {
            if (!globalSettings?.is_demo) {
                toast.loading(t('Assigning document acknowledgment...'));
            }

            router.post(route('hr.documents.document-acknowledgments.store'), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    if (!globalSettings?.is_demo) {
                        toast.dismiss();
                    }
                    if (page.props.flash.success) {
                        toast.success(t(page.props.flash.success));
                    } else if (page.props.flash.error) {
                        toast.error(t(page.props.flash.error));
                    }
                },
                onError: (errors) => {
                    if (!globalSettings?.is_demo) {
                        toast.dismiss();
                    }
                    if (typeof errors === 'string') {
                        toast.error(errors);
                    } else {
                        toast.error(`Failed to assign acknowledgment: ${Object.values(errors).join(', ')}`);
                    }
                },
            });
        } else if (formMode === 'edit') {
            if (!globalSettings?.is_demo) {
                toast.loading(t('Updating document acknowledgment...'));
            }

            router.put(route('hr.documents.document-acknowledgments.update', currentItem.id), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    if (!globalSettings?.is_demo) {
                        toast.dismiss();
                    }
                    if (page.props.flash.success) {
                        toast.success(t(page.props.flash.success));
                    } else if (page.props.flash.error) {
                        toast.error(t(page.props.flash.error));
                    }
                },
                onError: (errors) => {
                    if (!globalSettings?.is_demo) {
                        toast.dismiss();
                    }
                    if (typeof errors === 'string') {
                        toast.error(errors);
                    } else {
                        toast.error(`Failed to update acknowledgment: ${Object.values(errors).join(', ')}`);
                    }
                },
            });
        }
    };

    const handleDeleteConfirm = () => {
        if (!globalSettings?.is_demo) {
            toast.loading(t('Deleting document acknowledgment...'));
        }

        router.delete(route('hr.documents.document-acknowledgments.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                if (!globalSettings?.is_demo) {
                    toast.dismiss();
                }
                if (page.props.flash.success) {
                    toast.success(t(page.props.flash.success));
                } else if (page.props.flash.error) {
                    toast.error(t(page.props.flash.error));
                }
            },
            onError: (errors) => {
                if (!globalSettings?.is_demo) {
                    toast.dismiss();
                }
                if (typeof errors === 'string') {
                    toast.error(errors);
                } else {
                    toast.error(`Failed to delete acknowledgment: ${Object.values(errors).join(', ')}`);
                }
            },
        });
    };

    const handleResetFilters = () => {
        router.get(route('hr.documents.document-acknowledgments.index'));
    };

    const handleAcknowledgeSubmit = (formData: any) => {
        if (!globalSettings?.is_demo) {
            toast.loading(t('Acknowledging document...'));
        }

        router.put(
            route('hr.documents.document-acknowledgments.acknowledge', currentItem.id),
            {
                acknowledgment_note: formData.acknowledgment_note || 'Document acknowledged',
            },
            {
                onSuccess: (page) => {
                    setIsAcknowledgeModalOpen(false);
                    if (!globalSettings?.is_demo) {
                        toast.dismiss();
                    }
                    if (page.props.flash.success) {
                        toast.success(t(page.props.flash.success));
                    } else if (page.props.flash.error) {
                        toast.error(t(page.props.flash.error));
                    }
                },
                onError: (errors) => {
                    if (!globalSettings?.is_demo) {
                        toast.dismiss();
                    }
                    if (typeof errors === 'string') {
                        toast.error(errors);
                    } else {
                        toast.error(`Failed to acknowledge document: ${Object.values(errors).join(', ')}`);
                    }
                },
            },
        );
    };

    const pageActions = [];

    if (hasPermission(permissions, 'create-document-acknowledgments')) {
        pageActions.push({
            label: t('Assign Document'),
            icon: <Plus className="mr-2 h-4 w-4" />,
            variant: 'default',
            onClick: () => handleAddNew(),
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Documents & Contracts') },
        { title: t('Acknowledgments') },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending':
                return 'bg-yellow-50 text-yellow-800 ring-yellow-600/20';
            case 'Acknowledged':
                return 'bg-green-50 text-green-700 ring-green-600/20';
            case 'Overdue':
                return 'bg-red-50 text-red-700 ring-red-600/10';
            case 'Exempted':
                return 'bg-gray-50 text-gray-600 ring-gray-500/10';
            default:
                return 'bg-gray-50 text-gray-600 ring-gray-500/10';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Pending':
                return <Clock className="h-3 w-3" />;
            case 'Acknowledged':
                return <CheckCircle className="h-3 w-3" />;
            case 'Overdue':
                return <AlertTriangle className="h-3 w-3" />;
            case 'Exempted':
                return <XCircle className="h-3 w-3" />;
            default:
                return <Clock className="h-3 w-3" />;
        }
    };

    const getDaysInfo = (item: any) => {
        if (item.status === 'Acknowledged' || item.status === 'Exempted') return null;

        if (!item.due_date) return null;

        const today = new Date();
        const dueDate = new Date(item.due_date);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { type: 'overdue', days: Math.abs(diffDays), text: `${Math.abs(diffDays)} days overdue` };
        } else if (diffDays === 0) {
            return { type: 'today', days: 0, text: 'Due today' };
        } else {
            return { type: 'remaining', days: diffDays, text: `${diffDays} days remaining` };
        }
    };

    const columns = [
        {
            key: 'user.name',
            label: t('Employee'),
            sortable: false,
            render: (_, row) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white overflow-hidden shrink-0">
                        {row.user?.avatar ? (
                            <img src={row.user.avatar} alt={row.user?.name} className="h-full w-full object-cover" />
                        ) : (
                            getInitials(row.user?.name || '')
                        )}
                    </div>
                    <div>
                        <div className="font-medium">{row.user?.name || '-'}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {row.document?.title || '-'}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            label: t('Status'),
            render: (value) => (
                <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(value)}`}
                >
                    {getStatusIcon(value)}
                    {t(value)}
                </span>
            ),
        },
        {
            key: 'acknowledged_at',
            label: t('Acknowledged'),
            sortable: true,
            type: 'date'
        },
        {
            key: 'due_date',
            label: t('Due Date'),
            sortable: true,
            render: (value, row) => {
                if (!value) return '-';
                const daysInfo = getDaysInfo(row);
                return (
                    <div>
                        <div className="flex items-left gap-2 whitespace-nowrap overflow-hidden text-ellipsis text-gray-500">
                            {value && <Calendar className="h-4 w-4" />}
                            <span>{window.appSettings?.formatDateTimeSimple(value, false) || '-'}</span>
                        </div>
                        {daysInfo && (
                            <div
                                className={`text-xs ${
                                    daysInfo.type === 'overdue' ? 'text-red-600' : daysInfo.type === 'today' ? 'text-orange-600' : 'text-gray-500'
                                }`}
                            >
                                {daysInfo.text}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'assigned_by.name',
            label: t('Assigned By'),
            render: (_, row) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white overflow-hidden shrink-0">
                        {row.assigned_by?.avatar ? (
                            <img src={row.assigned_by.avatar} alt={row.assigned_by?.name} className="h-full w-full object-cover" />
                        ) : (
                            getInitials(row.assigned_by?.name || '')
                        )}
                    </div>
                    <div>
                        <div className="font-medium">{row.assigned_by?.name || '-'}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                            {row.assigned_by?.email || '-'}
                        </div>
                    </div>
                </div>
            ),
            // render: (_, row) => row.assigned_by?.name || '-',
        },
        {
            key: 'document.file_url',
            label: t('Document'),
            render: (_, row) => row.document?.file_url ? (
                <a
                    href={row.document.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center text-blue-700 hover:text-blue-900 transition-colors"
                    title={t('View Document')}
                >
                    <FileText className="h-4 w-4" />
                </a>
            ) : '-'
        },
    ];

    const actions = [
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-document-acknowledgments',
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-document-acknowledgments',
        },
        {
            label: t('Acknowledge'),
            icon: 'CheckCircle',
            action: 'acknowledge',
            className: 'text-green-500',
            requiredPermission: 'acknowledge-document-acknowledgments',
            condition: (item: any) => item.status === 'Pending' || item.status === 'Overdue',
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-document-acknowledgments',
        },
    ];

    const documentOptions = [
        { value: '_empty_', label: t('All Documents') },
        ...(documents || []).map((doc: any) => ({
            value: doc.id.toString(),
            label: doc.title,
        })),
    ];

    const userOptions = [
        { value: '_empty_', label: t('All Users') },
        ...(users || []).map((user: any) => ({
            value: user.id.toString(),
            label: user.name,
        })),
    ];

    const statusTabs = [
        { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? 0 },
        { value: 'Pending', label: t('Pending'), icon: <Clock className="h-4 w-4" />, count: statusCounts['Pending'] ?? 0 },
        { value: 'Acknowledged', label: t('Acknowledged'), icon: <BadgeCheck className="h-4 w-4" />, count: statusCounts['Acknowledged'] ?? 0 },
        { value: 'Overdue', label: t('Overdue'), icon: <AlertOctagon className="h-4 w-4" />, count: statusCounts['Overdue'] ?? 0 },
        { value: 'Exempted', label: t('Exempted'), icon: <XCircle className="h-4 w-4" />, count: statusCounts['Exempted'] ?? 0 },
    ];

    const statusOptions = [
        { value: '_empty_', label: t('All Statuses') },
        { value: 'Pending', label: t('Pending') },
        { value: 'Acknowledged', label: t('Acknowledged') },
        { value: 'Overdue', label: t('Overdue') },
        { value: 'Exempted', label: t('Exempted') },
    ];

    const documentSelectOptions = [
        { value: '_empty_', label: t('Select Document') },
        ...(documents || []).map((doc: any) => ({
            value: doc.id.toString(),
            label: doc.title,
        })),
    ];

    const userSelectOptions = [
        { value: '_empty_', label: t('Select User') },
        ...(users || []).map((user: any) => ({
            value: user.id.toString(),
            label: user.name,
        })),
    ];

    return (
        <PageTemplate
            title={t('Acknowledgments')}
            description={t("Track employee acknowledgments for HR documents.")}
            url="/hr/documents/document-acknowledgments"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    statusTabs={statusTabs}
                    activeStatusTab={statusFilter}
                    onStatusTabChange={setStatusFilter}
                    filters={[
                        {
                            name: 'document_id',
                            label: t('Document'),
                            type: 'select',
                            value: documentFilter,
                            onChange: setDocumentFilter,
                            options: documentOptions,
                            searchable: true,
                        },
                        {
                            name: 'user_id',
                            label: t('User'),
                            type: 'select',
                            value: userFilter,
                            onChange: setUserFilter,
                            options: userOptions,
                            searchable: true,
                        },
                    ]}
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                />
            </div>

            <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-900">
                <CrudTable
                    columns={columns}
                    actions={actions}
                    data={documentAcknowledgments?.data || []}
                    from={documentAcknowledgments?.from || 1}
                    onAction={handleAction}
                    sortField={pageFilters.sort_field}
                    sortDirection={pageFilters.sort_direction}
                    onSort={handleSort}
                    permissions={permissions}
                    entityPermissions={{
                        view: 'view-document-acknowledgments',
                        create: 'create-document-acknowledgments',
                        edit: 'edit-document-acknowledgments',
                        delete: 'delete-document-acknowledgments',
                    }}
                />

                <Pagination
                    from={documentAcknowledgments?.from || 0}
                    to={documentAcknowledgments?.to || 0}
                    total={documentAcknowledgments?.total || 0}
                    links={documentAcknowledgments?.links}
                    entityName={t('acknowledgments')}
                    onPageChange={handlePageChange}
                    currentPerPage={pageFilters.per_page?.toString() || '10'}
                    onPerPageChange={(value) => {
                        router.get(
                            route('hr.documents.document-acknowledgments.index'),
                            {
                                page: 1,
                                per_page: parseInt(value),
                                search: searchTerm || undefined,
                                document_id: documentFilter !== '_empty_' ? documentFilter : undefined,
                                user_id: userFilter !== '_empty_' ? userFilter : undefined,
                                status: statusFilter !== '_empty_' ? statusFilter : undefined,
                                sort_field: pageFilters.sort_field || undefined,
                                sort_direction: pageFilters.sort_direction || undefined,
                            },
                            { preserveState: true, preserveScroll: true },
                        );
                    }}
                />
            </div>

            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    fields: [
                        {
                            name: 'document_id',
                            label: t('Document'),
                            type: 'select',
                            required: true,
                            placeholder: t('Select Document'),
                            options: documentSelectOptions.filter((opt) => opt.value !== '_empty_'),
                            searchable: true,
                        },
                        {
                            name: 'user_id',
                            label: t('User'),
                            type: 'select',
                            required: true,
                            placeholder: t('Select User'),
                            options: userSelectOptions.filter((opt) => opt.value !== '_empty_'),
                            searchable: true,
                        },
                        {
                            name: 'due_date',
                            label: t('Due Date'),
                            type: 'date',
                            placeholder: t('Select Due Date'),
                            helpText: formMode === 'create' ? t('Leave empty to set 7 days from today') : undefined,
                        },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            required: formMode === 'edit',
                            placeholder: t('Select Status'),
                            options: statusOptions.filter((opt) => opt.value !== '_empty_'),
                            conditional: (mode) => mode === 'edit' || mode === 'view',
                        },
                        {
                            name: 'acknowledgment_note',
                            label: t('Note'),
                            type: 'textarea',
                            rows: 3,
                            placeholder: t('e.g. Additional notes about this acknowledgment...')
                        },
                    ],
                    modalSize: 'lg',
                }}
                initialData={
                    currentItem
                        ? {
                              ...currentItem,
                              document_id: currentItem.document_id?.toString(),
                              user_id: currentItem.user_id?.toString(),
                              due_date: currentItem.due_date
                                  ? window.appSettings.formatDateTimeSimple(currentItem.due_date, false)
                                  : currentItem.due_date,
                          }
                        : null
                }
                title={
                    formMode === 'create'
                        ? t('Assign Document for Acknowledgment')
                        : t('Edit Document Acknowledgment')
                }
                mode={formMode}
            />

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem ? `${currentItem.document?.title} - ${currentItem.user?.name}` : ''}
                entityName="acknowledgment"
            />

            <CrudFormModal
                isOpen={isAcknowledgeModalOpen}
                onClose={() => setIsAcknowledgeModalOpen(false)}
                onSubmit={handleAcknowledgeSubmit}
                formConfig={{
                    fields: [
                        {
                            name: 'acknowledgment_note',
                            label: t('Acknowledgment Note'),
                            type: 'textarea',
                            rows: 3,
                            placeholder: t('Enter acknowledgment note (optional)'),
                        },
                    ],
                }}
                initialData={{ acknowledgment_note: '' }}
                title={t('Acknowledge Document')}
                mode="edit"
            />
            {/* View Modal */}
            <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
                {viewingItem && <View acknowledgment={viewingItem} />}
            </Dialog>
        </PageTemplate>
    );
}
