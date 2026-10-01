import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { hasPermission } from '@/utils/authorization';
import { router, usePage } from '@inertiajs/react';
import { Calendar, ChevronDown, ChevronUp, Clock, Edit, Lock, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function MeetingTypes() {
    const { t } = useTranslation();
    const { auth, meetingTypes, filters: pageFilters = {}, globalSettings } = usePage().props as any;
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
        color: '#000000',
        default_duration: 15,
        status: 'active',
    });

    const [formErrors, setFormErrors] = useState<any>({});

    // Reset form
    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            color: '#000000',
            default_duration: 15,
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
            color: item.color || '#000000',
            default_duration: item.default_duration || 15,
            status: item.status || 'active',
        });
        setFormMode('edit');
        setCurrentItem(item);
        setFormErrors({});
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(
            route('meetings.meeting-types.index'),
            {
                page: 1,
                search: searchTerm || undefined,
                status: selectedStatus !== 'all' ? selectedStatus : undefined,
                per_page: pageFilters.per_page || 10,
                sort_field: pageFilters.sort_field || undefined,
                sort_direction: pageFilters.sort_direction || undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedStatus('all');

        router.get(
            route('meetings.meeting-types.index'),
            {
                page: 1,
                per_page: pageFilters.per_page || 10,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get(
            route('meetings.meeting-types.index'),
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

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);

        switch (action) {
            case 'edit':
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

        if (formMode === 'create') {
            if (!globalSettings?.is_demo) toast.loading(t('Creating meeting type...'));

            router.post(route('meetings.meeting-types.store'), formData as any, {
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
                        toast.error(t('Please check the form for errors'));
                    }
                },
            });
        } else if (formMode === 'edit') {
            if (!globalSettings?.is_demo) toast.loading(t('Updating meeting type...'));

            router.put(route('meetings.meeting-types.update', currentItem.id), formData as any, {
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
                        toast.error(t('Please check the form for errors'));
                    }
                },
            });
        }
    };

    const handleDeleteConfirm = () => {
        if (!globalSettings?.is_demo) toast.loading(t('Deleting meeting type...'));

        router.delete(route('meetings.meeting-types.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                if (!globalSettings?.is_demo) toast.dismiss();
                if (page.props.flash.success) {
                    toast.success(t(page.props.flash.success));
                } else if (page.props.flash.error) {
                    toast.error(t(page.props.flash.error));
                }
            },
            onError: (errors) => {
                if (!globalSettings?.is_demo) toast.dismiss();
                if (typeof errors === 'string') {
                    toast.error(errors);
                } else {
                    toast.error(`Failed to delete meeting type: ${Object.values(errors).join(', ')}`);
                }
            },
        });
    };

    const handleToggleStatus = (meetingType: any) => {
        const newStatus = meetingType.status === 'active' ? 'inactive' : 'active';
        if (!globalSettings?.is_demo) toast.loading(`${newStatus === 'active' ? t('Activating') : t('Deactivating')} meeting type...`);

        router.put(
            route('meetings.meeting-types.toggle-status', meetingType.id),
            {},
            {
                onSuccess: (page) => {
                    if (!globalSettings?.is_demo) toast.dismiss();
                    if (page.props.flash.success) {
                        toast.success(t(page.props.flash.success));
                    } else if (page.props.flash.error) {
                        toast.error(t(page.props.flash.error));
                    }
                },
                onError: (errors) => {
                    if (!globalSettings?.is_demo) toast.dismiss();
                    if (typeof errors === 'string') {
                        toast.error(errors);
                    } else {
                        toast.error(`Failed to update meeting type status: ${Object.values(errors).join(', ')}`);
                    }
                },
            },
        );
    };

    const toggleDescription = (meetingTypeId: number) => {
        const newExpanded = new Set(expandedDescriptions);
        if (newExpanded.has(meetingTypeId)) {
            newExpanded.delete(meetingTypeId);
        } else {
            newExpanded.add(meetingTypeId);
        }
        setExpandedDescriptions(newExpanded);
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Meetings') },
        { title: t('Meeting Types') },
    ];

    const canCreate = hasPermission(permissions, 'create-meeting-types');
    const canEdit = hasPermission(permissions, 'edit-meeting-types');
    const canDelete = hasPermission(permissions, 'delete-meeting-types');

    return (
        <PageTemplate title={t('Meeting Types')} description={t('Define categories for organizing meetings.')} url="/meetings/meeting-types" breadcrumbs={breadcrumbs} noPadding>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                    <div className="sticky top-4 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="border-b border-gray-200 p-6 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formMode === 'create' ? t('Add New Meeting Type') : t('Edit Meeting Type')}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {formMode === 'create'
                                    ? t('Fill in the details to create a new meeting type')
                                    : t('Update the meeting type details below')}
                            </p>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4 p-6">
                            <div className="space-y-2">
                                <Label required htmlFor="name" className="required">
                                    {t('Name')}
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={t('e.g., Client Call, Team Sync')}
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
                                    placeholder={t('Brief description of the meeting type')}
                                    rows={3}
                                    className={formErrors.description ? 'border-red-500' : ''}
                                    disabled={!canCreate && !canEdit}
                                />
                                {formErrors.description && <p className="text-sm text-red-500">{formErrors.description}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label required htmlFor="color" className="required">
                                    {t('Color')}
                                </Label>
                                <div className="flex items-center gap-3">
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
                                        className="flex-1 font-mono uppercase"
                                        disabled={!canCreate && !canEdit}
                                        placeholder="#000000"
                                        pattern="^#[0-9A-Fa-f]{6}$"
                                        required
                                    />
                                </div>
                                {formErrors.color && <p className="text-sm text-red-500">{formErrors.color}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label required htmlFor="default_duration" className="required">
                                    {t('Default Duration (minutes)')}
                                </Label>
                                <Input
                                    id="default_duration"
                                    type="number"
                                    min="15"
                                    max="480"
                                    value={formData.default_duration}
                                    onChange={(e) => setFormData({ ...formData, default_duration: parseInt(e.target.value) || ('' as any) })}
                                    className={formErrors.default_duration ? 'border-red-500' : ''}
                                    disabled={!canCreate && !canEdit}
                                    required
                                />
                                {formErrors.default_duration && <p className="text-sm text-red-500">{formErrors.default_duration}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label required htmlFor="status" className="required">
                                    {t('Status')}
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
                                        {formMode === 'create' ? t('Add Meeting Type') : t('Update Meeting Type')}
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

                <div className="space-y-4 lg:col-span-2">
                    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                                    <Input
                                        type="text"
                                        placeholder={t('Search meeting types...')}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                                        className="pl-10"
                                    />
                                </div>
                                <Button onClick={handleSearch} variant="default">
                                    {t('Search')}
                                </Button>
                                {(searchTerm || selectedStatus !== 'all') && (
                                    <Button onClick={handleResetFilters} variant="outline">
                                        <X className="mr-2 h-4 w-4" />
                                        {t('Reset')}
                                    </Button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:w-1/2">
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
                        {(meetingTypes?.data || []).length > 0 ? (
                            <>
                                {/* <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Meeting Types')}</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        {t('Manage different types of meetings and their default durations.')}
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
                                                            {t('Name')}
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
                                                        {t('Duration')}
                                                    </th>
                                                    <th className="px-3 py-3 text-center text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300 dark:bg-gray-900">
                                                        {t('Meetings')}
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
                                                {meetingTypes.data.map((meetingType: any) => (
                                                    <tr key={meetingType.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-start">
                                                                <div
                                                                    className="mt-1 h-4 w-4 flex-shrink-0 rounded-full border border-gray-200 shadow-sm"
                                                                    style={{ backgroundColor: meetingType.color }}
                                                                />
                                                                <div className="ml-3">
                                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                        {meetingType.name}
                                                                    </div>
                                                                    {meetingType.description && (
                                                                        <div className="mt-1 max-w-xs text-sm text-gray-500 dark:text-gray-400">
                                                                            <div
                                                                                className={
                                                                                    expandedDescriptions.has(meetingType.id) ? '' : 'line-clamp-2'
                                                                                }
                                                                            >
                                                                                {meetingType.description}
                                                                            </div>
                                                                            {meetingType.description.length > 60 && (
                                                                                <button
                                                                                    onClick={() => toggleDescription(meetingType.id)}
                                                                                    className="mt-1 inline-flex items-center text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                                                                                >
                                                                                    {expandedDescriptions.has(meetingType.id) ? (
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
                                                        <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="h-4 w-4 text-gray-400" />
                                                                {meetingType.default_duration} {t('min')}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-4 text-center">
                                                            <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-500/10 ring-inset dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-400/20">
                                                                {meetingType.meetings_count || 0}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-4 whitespace-nowrap">
                                                            <span
                                                                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${meetingType.status === 'active'
                                                                    ? 'bg-green-50 text-green-700 ring-green-600/20'
                                                                    : 'bg-red-50 text-red-700 ring-red-600/20'
                                                                    }`}
                                                            >
                                                                {meetingType.status === 'active' ? t('Active') : t('Inactive')}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 text-right text-sm font-medium whitespace-nowrap">
                                                            <div className="flex items-center justify-end gap-2">
                                                                {canEdit && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleAction('edit', meetingType)}
                                                                        className="h-8 w-8 p-0 text-gray-500"
                                                                        title={t('Edit Meeting Type')}
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                                {canEdit && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleAction('toggle-status', meetingType)}
                                                                        className="h-8 w-8 p-0 text-gray-500"
                                                                        title={meetingType.status === 'active' ? t('Deactivate') : t('Activate')}
                                                                    >
                                                                        <Lock className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                                {canDelete && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleAction('delete', meetingType)}
                                                                        className="h-8 w-8 p-0 text-gray-500"
                                                                        title={t('Delete Meeting Type')}
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

                                <div className="space-y-4 p-4 lg:hidden">
                                    {meetingTypes.data.map((meetingType: any) => (
                                        <div
                                            key={meetingType.id}
                                            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                                        >
                                            <div className="mb-3 flex items-start justify-between">
                                                <div className="flex gap-3">
                                                    <div
                                                        className="mt-1 h-4 w-4 flex-shrink-0 rounded-full border border-gray-200 shadow-sm"
                                                        style={{ backgroundColor: meetingType.color }}
                                                    />
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{meetingType.name}</h4>
                                                        {meetingType.description && (
                                                            <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                                                                {meetingType.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="ml-4 flex justify-end gap-1">
                                                    {canEdit && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleAction('edit', meetingType)}
                                                            className="h-8 w-8 p-0 text-gray-500"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {canEdit && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleAction('toggle-status', meetingType)}
                                                            className="h-8 w-8 p-0 text-gray-500"
                                                        >
                                                            <Lock className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {canDelete && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleAction('delete', meetingType)}
                                                            className="h-8 w-8 p-0 text-gray-500"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-3 grid grid-cols-2 gap-4 border-t border-gray-100 pt-3 dark:border-gray-700">
                                                <div>
                                                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{t('Duration')}</p>
                                                    <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                                                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                                                        {meetingType.default_duration} min
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{t('Meetings')}</p>
                                                    <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-500/10 ring-inset dark:bg-gray-700 dark:text-gray-300">
                                                        {meetingType.meetings_count || 0}
                                                    </span>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{t('Status')}</p>
                                                    <span
                                                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${meetingType.status === 'active'
                                                            ? 'bg-green-50 text-green-700 ring-green-600/20'
                                                            : 'bg-red-50 text-red-700 ring-red-600/20'
                                                            }`}
                                                    >
                                                        {meetingType.status === 'active' ? t('Active') : t('Inactive')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {meetingTypes?.total > (meetingTypes?.per_page || 10) && (
                                    <div className="border-t border-gray-200 dark:border-gray-700">
                                        <Pagination
                                            from={meetingTypes?.from || 0}
                                            to={meetingTypes?.to || 0}
                                            total={meetingTypes?.total || 0}
                                            links={meetingTypes?.links}
                                            entityName={t('meeting types')}
                                            hidePerPage
                                            onPageChange={(url) => {
                                                const page = new URL(url).searchParams.get('page');
                                                router.get(
                                                    route('meetings.meeting-types.index'),
                                                    {
                                                        page,
                                                        per_page: pageFilters.per_page || 10,
                                                        search: searchTerm || undefined,
                                                        status: selectedStatus !== 'all' ? selectedStatus : undefined,
                                                        sort_field: pageFilters.sort_field || undefined,
                                                        sort_direction: pageFilters.sort_direction || undefined,
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
                                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">{t('No meeting types found')}</h3>
                                <p className="mx-auto mb-6 max-w-sm text-gray-500 dark:text-gray-400">
                                    {searchTerm || selectedStatus !== 'all'
                                        ? t('No meeting types match your search criteria. Try adjusting your filters.')
                                        : t('Create meeting types to categorize and set default durations for your team meetings.')}
                                </p>
                                {!searchTerm && selectedStatus === 'all' && canCreate && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('Use the form on the left to add your first type.')}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.name || ''}
                entityName="meeting type"
            />
        </PageTemplate>
    );
}
