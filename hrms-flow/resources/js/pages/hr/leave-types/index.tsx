// pages/hr/leave-types/index.tsx
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { hasPermission } from '@/utils/authorization';
import { router, usePage } from '@inertiajs/react';
import { Calendar, ChevronDown, ChevronUp, DollarSign, Edit, Lock, Search, Trash2, Wallet, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function LeaveTypes() {
    const { t } = useTranslation();
    const { auth, leaveTypes, filters: pageFilters = {}, globalSettings } = usePage().props as any;
    const permissions = auth?.permissions || [];

    // State
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        max_days_per_year: '',
        is_paid: true,
        color: '#3B82F6',
        status: 'active',
    });

    const [formErrors, setFormErrors] = useState<any>({});

    // Reset form
    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            max_days_per_year: '',
            is_paid: true,
            color: '#3B82F6',
            status: 'active',
        });
        setFormErrors({});
        setFormMode('create');
        setCurrentItem(null);
    };

    // Load item for editing
    const loadItemForEdit = (item: any) => {
        setFormData({
            name: item.name || '',
            description: item.description || '',
            max_days_per_year: item.max_days_per_year?.toString() || '',
            is_paid: item.is_paid ?? true,
            color: item.color || '#3B82F6',
            status: item.status || 'active',
        });
        setFormMode('edit');
        setCurrentItem(item);
        setFormErrors({});
    };

    const hasActiveFilters = () => {
        return searchTerm !== '' || selectedStatus !== 'all';
    };

    const handleSearch = (e?: React.FormEvent | any) => {
        if (e?.preventDefault) e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(
            route('hr.leave-types.index'),
            {
                page: 1,
                search: searchTerm || undefined,
                status: selectedStatus !== 'all' ? selectedStatus : undefined,
                sort_field: pageFilters.sort_field,
                sort_direction: pageFilters.sort_direction,
                per_page: pageFilters.per_page || 10,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

        router.get(
            route('hr.leave-types.index'),
            {
                sort_field: field,
                sort_direction: direction,
                page: 1,
                search: searchTerm || undefined,
                status: selectedStatus !== 'all' ? selectedStatus : undefined,
                per_page: pageFilters.per_page || 10,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedStatus('all');

        router.get(
            route('hr.leave-types.index'),
            {
                page: 1,
                sort_field: pageFilters.sort_field,
                sort_direction: pageFilters.sort_direction,
                per_page: pageFilters.per_page || 10,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);

        switch (action) {
            case 'edit':
            case 'view':
                loadItemForEdit(item);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
            case 'toggle-status':
                handleToggleStatus(item);
                break;
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormErrors({});

        const submitData = {
            ...formData,
            max_days_per_year: parseInt(formData.max_days_per_year, 10),
        };

        if (formMode === 'create') {
            if (!globalSettings?.is_demo) toast.loading(t('Creating leave type...'));

            router.post(route('hr.leave-types.store'), submitData, {
                onSuccess: (page) => {
                    if (!globalSettings?.is_demo) toast.dismiss();
                    if (page.props.flash.success) {
                        toast.success(t(page.props.flash.success));
                        resetForm();
                    } else if (page.props.flash.error) {
                        toast.error(t(page.props.flash.error));
                    }
                },
                onError: (errors) => {
                    if (!globalSettings?.is_demo) toast.dismiss();
                    setFormErrors(errors);
                    if (typeof errors === 'string') {
                        toast.error(errors);
                    } else {
                        toast.error(`Failed to create leave type.`);
                    }
                },
            });
        } else {
            if (!globalSettings?.is_demo) toast.loading(t('Updating leave type...'));

            router.put(route('hr.leave-types.update', currentItem.id), submitData, {
                onSuccess: (page) => {
                    if (!globalSettings?.is_demo) toast.dismiss();
                    if (page.props.flash.success) {
                        toast.success(t(page.props.flash.success));
                        resetForm();
                    } else if (page.props.flash.error) {
                        toast.error(t(page.props.flash.error));
                    }
                },
                onError: (errors) => {
                    if (!globalSettings?.is_demo) toast.dismiss();
                    setFormErrors(errors);
                    if (typeof errors === 'string') {
                        toast.error(errors);
                    } else {
                        toast.error(`Failed to update leave type.`);
                    }
                },
            });
        }
    };

    const handleDeleteConfirm = () => {
        if (!globalSettings?.is_demo) toast.loading(t('Deleting leave type...'));

        router.delete(route('hr.leave-types.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                if (!globalSettings?.is_demo) toast.dismiss();
                if (page.props.flash.success) {
                    toast.success(t(page.props.flash.success));
                    if (formMode === 'edit' && currentItem?.id === currentItem.id) {
                        resetForm();
                    }
                } else if (page.props.flash.error) {
                    toast.error(t(page.props.flash.error));
                }
            },
            onError: (errors) => {
                setIsDeleteModalOpen(false);
                if (!globalSettings?.is_demo) toast.dismiss();
                if (typeof errors === 'string') {
                    toast.error(errors);
                } else {
                    toast.error(`Failed to delete leave type: ${Object.values(errors).join(', ')}`);
                }
            },
        });
    };

    const handleToggleStatus = (item: any) => {
        const newStatus = item.status === 'active' ? 'inactive' : 'active';
        if (!globalSettings?.is_demo) toast.loading(`${newStatus === 'active' ? t('Activating') : t('Deactivating')} leave type...`);

        router.put(
            route('hr.leave-types.toggle-status', item.id),
            {},
            {
                onSuccess: (page) => {
                    if (!globalSettings?.is_demo) toast.dismiss();
                    if (page.props.flash.success) {
                        toast.success(t(page.props.flash.success));
                        if (formMode === 'edit' && currentItem?.id === item.id) {
                            setFormData((prev) => ({ ...prev, status: newStatus }));
                        }
                    } else if (page.props.flash.error) {
                        toast.error(t(page.props.flash.error));
                    }
                },
                onError: (errors) => {
                    if (!globalSettings?.is_demo) toast.dismiss();
                    if (typeof errors === 'string') {
                        toast.error(errors);
                    } else {
                        toast.error(`Failed to update leave type status: ${Object.values(errors).join(', ')}`);
                    }
                },
            },
        );
    };

    const toggleDescription = (id: number) => {
        const newExpanded = new Set(expandedDescriptions);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedDescriptions(newExpanded);
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Leave Management') },
        { title: t('Leave Types') },
    ];

    const canCreate = hasPermission(permissions, 'create-leave-types');
    const canEdit = hasPermission(permissions, 'edit-leave-types');
    const canDelete = hasPermission(permissions, 'delete-leave-types');

    return (
        <PageTemplate title={t('Leave Types')} description={t("Manage leave types and their configurations.")} url="/hr/leave-types" breadcrumbs={breadcrumbs} noPadding>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left Side - Form */}
                <div className="lg:col-span-1">
                    <div className="sticky top-4 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="border-b border-gray-200 p-6 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formMode === 'create' ? t('Add New Leave Type') : t('Edit Leave Type')}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {formMode === 'create'
                                    ? t('Fill in the details to create a new leave type')
                                    : t('Update the leave type details below')}
                            </p>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4 p-6">
                            <div className="space-y-2">
                                <Label required htmlFor="name" className="required">
                                    {t('Leave Type Name')}
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={t('e.g., Casual Leave, Sick Leave')}
                                    className={formErrors.name ? 'border-red-500' : ''}
                                    disabled={!canCreate && !canEdit}
                                    required
                                />
                                {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">{t('Description')}</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder={t('Brief description of the leave policies')}
                                    rows={3}
                                    className={formErrors.description ? 'border-red-500' : ''}
                                    disabled={!canCreate && !canEdit}
                                />
                                {formErrors.description && <p className="text-sm text-red-500">{formErrors.description}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label required htmlFor="max_days_per_year" className="required">
                                        {t('Max Days / Year')}
                                    </Label>
                                    <Input
                                        id="max_days_per_year"
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={formData.max_days_per_year}
                                        onChange={(e) => setFormData({ ...formData, max_days_per_year: e.target.value })}
                                        placeholder="0"
                                        className={formErrors.max_days_per_year ? 'border-red-500' : ''}
                                        disabled={!canCreate && !canEdit}
                                        required
                                    />
                                    {formErrors.max_days_per_year && <p className="text-sm text-red-500">{formErrors.max_days_per_year}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label required htmlFor="color" className="required">
                                        {t('Color')}
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="color"
                                            type="color"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className={`h-10 w-14 cursor-pointer p-1 ${formErrors.color ? 'border-red-500' : ''}`}
                                            disabled={!canCreate && !canEdit}
                                            required
                                        />
                                        <Input
                                            type="text"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            pattern="^#[0-9A-Fa-f]{6}$"
                                            className="font-mono text-sm uppercase"
                                            placeholder="#000000"
                                            disabled={!canCreate && !canEdit}
                                            required
                                        />
                                    </div>
                                    {formErrors.color && <p className="text-sm text-red-500">{formErrors.color}</p>}
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">{t('Paid Leave')}</Label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {t('Employees will receive salary for these days')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.is_paid}
                                        onCheckedChange={(checked) => setFormData({ ...formData, is_paid: checked })}
                                        disabled={!canCreate && !canEdit}
                                    />
                                </div>
                                {formErrors.is_paid && <p className="text-sm text-red-500">{formErrors.is_paid}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label required htmlFor="status" className="required">
                                    {t('Status')}{' '}
                                </Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                                    disabled={!canCreate && !canEdit}
                                    required
                                >
                                    <SelectTrigger className={formErrors.status ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {formErrors.status && <p className="text-sm text-red-500">{formErrors.status}</p>}
                            </div>

                            <div className="flex items-center gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                                {(canCreate || canEdit) && (
                                    <Button type="submit" className="flex-1">
                                        {formMode === 'create' ? t('Add Leave Type') : t('Update Leave Type')}
                                    </Button>
                                )}
                                {formMode === 'edit' && (
                                    <Button type="button" variant="outline" onClick={resetForm}>
                                        {t('Cancel')}
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right Side - List */}
                <div className="space-y-4 lg:col-span-2">
                    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                                    <Input
                                        type="text"
                                        placeholder={t('Search leave types...')}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                                        className="pl-10"
                                    />
                                </div>
                                <Button onClick={handleSearch} variant="default">
                                    {t('Search')}
                                </Button>
                                {hasActiveFilters() && (
                                    <Button onClick={handleResetFilters} variant="outline">
                                        <X className="mr-2 h-4 w-4" />
                                        {t('Reset')}
                                    </Button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All Statuses')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Statuses')}</SelectItem>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        {(leaveTypes?.data || []).length > 0 ? (
                            <>
                                {/* <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Leave Types')}</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        {t('Manage leave policies and maximum allocated days.')}
                                    </p>
                                </div> */}

                                <div className="hidden lg:block">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr className="bg-[#F0F0F1] hover:bg-[#F0F0F1] dark:border-gray-900 dark:bg-gray-900 border-t">
                                                    <th
                                                        className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 select-none dark:text-gray-300 dark:bg-gray-900"
                                                        onClick={() => handleSort('name')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            {t('Leave Type')}
                                                            {pageFilters.sort_field === 'name' ? (
                                                                pageFilters.sort_direction === 'asc' ? (
                                                                    ' ↑'
                                                                ) : (
                                                                    ' ↓'
                                                                )
                                                            ) : (
                                                                <span className="opacity-40">↕</span>
                                                            )}
                                                        </div>
                                                    </th>
                                                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300 dark:bg-gray-900">
                                                        {t('Days/Year')}
                                                    </th>
                                                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300 dark:bg-gray-900">
                                                        {t('Payment Type')}
                                                    </th>
                                                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300 dark:bg-gray-900">
                                                        {t('Status')}
                                                    </th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300 dark:bg-gray-900 pr-[50px]">
                                                        {t('Actions')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                                {leaveTypes.data.map((item: any) => (
                                                    <tr key={item.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center">
                                                                <div
                                                                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-white"
                                                                    style={{ backgroundColor: item.color || '#3B82F6' }}
                                                                >
                                                                    <Calendar className="h-5 w-5" />
                                                                </div>
                                                                <div className="ml-3">
                                                                    <div className="flex flex-row items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                                                                        {item.name}
                                                                    </div>
                                                                    {item.description && (
                                                                        <div className="mt-0.5 max-w-xs text-sm text-gray-500 dark:text-gray-400">
                                                                            <div className={expandedDescriptions.has(item.id) ? '' : 'line-clamp-2'}>
                                                                                {item.description}
                                                                            </div>
                                                                            {item.description.length > 60 && (
                                                                                <button
                                                                                    onClick={() => toggleDescription(item.id)}
                                                                                    className="mt-1 inline-flex items-center text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                                                                                >
                                                                                    {expandedDescriptions.has(item.id) ? (
                                                                                        <>
                                                                                            <ChevronUp className="mr-1 h-3 w-3" />
                                                                                            {t('Show less')}
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                                <ChevronDown className="mr-1 h-3 w-3" />
                                                                                            {t('Show more')}
                                                                                        </>
                                                                                    )}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-4">
                                                            <span className="inline-flex items-center font-mono font-semibold text-gray-900 dark:text-gray-100">
                                                                {item.max_days_per_year} {t('Days')}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-4">
                                                            <span
                                                                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                                                    item.is_paid
                                                                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                                                        : 'bg-orange-50 text-orange-700 ring-orange-600/20'
                                                                }`}
                                                            >
                                                                {item.is_paid ? t('Paid') : t('Unpaid')}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-4">
                                                            <span
                                                                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                                                    item.status === 'active'
                                                                        ? 'bg-green-50 text-green-700 ring-green-600/20'
                                                                        : 'bg-red-50 text-red-700 ring-red-600/20'
                                                                }`}
                                                            >
                                                                {item.status === 'active' ? t('Active') : t('Inactive')}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 text-right text-sm font-medium whitespace-nowrap">
                                                            <div className="flex items-center justify-end gap-2">
                                                                {canEdit && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleAction('edit', item)}
                                                                        className="h-8 w-8 p-0 text-gray-500"
                                                                        title={t('Edit Type')}
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                                {canEdit && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleAction('toggle-status', item)}
                                                                        className="h-8 w-8 p-0 text-gray-500"
                                                                        title={item.status === 'active' ? t('Deactivate') : t('Activate')}
                                                                    >
                                                                        <Lock className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                                {canDelete && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleAction('delete', item)}
                                                                        className="h-8 w-8 p-0 text-gray-500"
                                                                        title={t('Delete Type')}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Mobile View */}
                                <div className="space-y-4 p-4 lg:hidden">
                                    {leaveTypes.data.map((item: any) => (
                                        <div
                                            key={item.id}
                                            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                                        >
                                            <div className="mb-3 flex items-start justify-between">
                                                <div className="flex gap-3">
                                                    <div
                                                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-white"
                                                        style={{ backgroundColor: item.color || '#3B82F6' }}
                                                    >
                                                        <Calendar className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                                                            {item.name}
                                                        </h4>
                                                        {item.description && (
                                                            <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="ml-4 flex justify-end gap-1">
                                                    {canEdit && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleAction('edit', item)}
                                                            className="h-8 w-8 p-0 text-gray-500"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {canEdit && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleAction('toggle-status', item)}
                                                            className="h-8 w-8 p-0 text-gray-500"
                                                        >
                                                            <Lock className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {canDelete && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleAction('delete', item)}
                                                            className="h-8 w-8 p-0 text-gray-500"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-3 grid grid-cols-2 gap-4 border-t border-gray-100 pt-3 dark:border-gray-700">
                                                <div>
                                                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{t('Days/Year')}</p>
                                                    <span className="font-mono text-xs font-medium text-gray-900 dark:text-gray-100">
                                                        {item.max_days_per_year} {t('Days')}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{t('Payment Type')}</p>
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                                                            item.is_paid
                                                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                                                : 'bg-orange-50 text-orange-700 ring-orange-600/20'
                                                        }`}
                                                    >
                                                        {item.is_paid ? (
                                                            <>
                                                                <DollarSign className="h-3 w-3" /> {t('Paid')}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Wallet className="h-3 w-3" /> {t('Unpaid')}
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{t('Status')}</p>
                                                    <span
                                                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                                            item.status === 'active'
                                                                ? 'bg-green-50 text-green-700 ring-green-600/20'
                                                                : 'bg-red-50 text-red-700 ring-red-600/20'
                                                        }`}
                                                    >
                                                        {item.status === 'active' ? t('Active') : t('Inactive')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {leaveTypes?.total > (leaveTypes?.per_page || 10) && (
                                    <div className="border-t border-gray-200 dark:border-gray-700">
                                        <Pagination
                                            from={leaveTypes?.from || 0}
                                            to={leaveTypes?.to || 0}
                                            total={leaveTypes?.total || 0}
                                            links={leaveTypes?.links}
                                            entityName={t('leave types')}
                                            hidePerPage
                                            onPageChange={(url) => {
                                                const urlObj = new URL(url, window.location.origin);
                                                router.get(
                                                    urlObj.pathname + urlObj.search,
                                                    {
                                                        search: searchTerm || undefined,
                                                        status: selectedStatus !== 'all' ? selectedStatus : undefined,
                                                        sort_field: pageFilters.sort_field,
                                                        sort_direction: pageFilters.sort_direction,
                                                    },
                                                    { preserveState: true, preserveScroll: true },
                                                );
                                            }}
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-12 text-center">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                                    <Calendar className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">{t('No leave types found')}</h3>
                                <p className="mx-auto mb-6 max-w-sm text-gray-500 dark:text-gray-400">
                                    {hasActiveFilters()
                                        ? t('No leave types match your search criteria. Try adjusting your filters.')
                                        : t('Create leave types to start managing your employee time off.')}
                                </p>
                                {!hasActiveFilters() && canCreate && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('Use the form on the left to add your first leave type.')}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.name || ''}
                entityName={t('leave type')}
            />
        </PageTemplate>
    );
}
