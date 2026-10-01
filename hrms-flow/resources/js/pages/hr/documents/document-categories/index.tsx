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
import {
    AlertTriangle,
    Archive,
    Award,
    Book,
    Briefcase,
    Building,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    DollarSign,
    Edit,
    FileText,
    Folder,
    GraduationCap,
    Heart,
    IdCard,
    Lock,
    Scale,
    Search,
    Settings,
    Shield,
    Trash2,
    TrendingUp,
    User,
    Users,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const IconMap: Record<string, any> = {
    FileText,
    Folder,
    Shield,
    Book,
    ClipboardList,
    Scale,
    GraduationCap,
    Building,
    Heart,
    Users,
    Settings,
    Archive,
    IdCard,
    Briefcase,
    DollarSign,
    Award,
    TrendingUp,
    User,
};

export default function DocumentCategories() {
    const { t } = useTranslation();
    const { auth, documentCategories, filters: pageFilters = {}, globalSettings } = usePage().props as any;
    const permissions = auth?.permissions || [];

    // State
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
    const [mandatoryFilter, setMandatoryFilter] = useState(pageFilters.is_mandatory || '_empty_');

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        color: '#3B82F6',
        icon: 'Folder',
        is_mandatory: false,
        status: 'active',
    });

    const [formErrors, setFormErrors] = useState<any>({});

    const iconOptions = [
        { value: 'IdCard', label: 'IdCard' },
        { value: 'GraduationCap', label: 'GraduationCap' },
        { value: 'Briefcase', label: 'Briefcase' },
        { value: 'DollarSign', label: 'DollarSign' },
        { value: 'Heart', label: 'Heart' },
        { value: 'Scale', label: 'Scale' },
        { value: 'Award', label: 'Award' },
        { value: 'TrendingUp', label: 'TrendingUp' },
        { value: 'User', label: 'User' },
        { value: 'Shield', label: 'Shield' },
        { value: 'FileText', label: 'FileText' },
        { value: 'Folder', label: 'Folder' },
        { value: 'Book', label: 'Book' },
        { value: 'ClipboardList', label: 'ClipboardList' },
        { value: 'Building', label: 'Building' },
        { value: 'Users', label: 'Users' },
        { value: 'Settings', label: 'Settings' },
        { value: 'Archive', label: 'Archive' },
    ];

    // Reset form
    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            color: '#3B82F6',
            icon: 'Folder',
            is_mandatory: false,
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
            color: item.color || '#3B82F6',
            icon: item.icon || 'Folder',
            is_mandatory: item.is_mandatory ?? false,
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
            route('hr.documents.document-categories.index'),
            {
                page: 1,
                search: searchTerm || undefined,
                status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
                is_mandatory: mandatoryFilter !== '_empty_' ? mandatoryFilter : undefined,
                per_page: pageFilters.per_page || 10,
                sort_field: pageFilters.sort_field || undefined,
                sort_direction: pageFilters.sort_direction || undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedStatus('_empty_');
        setMandatoryFilter('_empty_');

        router.get(
            route('hr.documents.document-categories.index'),
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
            route('hr.documents.document-categories.index'),
            {
                sort_field: field,
                sort_direction: direction,
                page: 1,
                search: searchTerm || undefined,
                status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
                is_mandatory: mandatoryFilter !== '_empty_' ? mandatoryFilter : undefined,
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
            if (!globalSettings?.is_demo) toast.loading(t('Creating document category...'));

            router.post(route('hr.documents.document-categories.store'), formData as any, {
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
            if (!globalSettings?.is_demo) toast.loading(t('Updating document category...'));

            router.put(route('hr.documents.document-categories.update', currentItem.id), formData as any, {
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
        if (!globalSettings?.is_demo) toast.loading(t('Deleting document category...'));

        router.delete(route('hr.documents.document-categories.destroy', currentItem.id), {
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
                    toast.error(`Failed to delete document category: ${Object.values(errors).join(', ')}`);
                }
            },
        });
    };

    const handleToggleStatus = (item: any) => {
        const newStatus = item.status === 'active' ? 'inactive' : 'active';
        if (!globalSettings?.is_demo) toast.loading(`${newStatus === 'active' ? t('Activating') : t('Deactivating')} document category...`);

        router.put(
            route('hr.documents.document-categories.toggle-status', item.id),
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
                        toast.error(`Failed to update document category status: ${Object.values(errors).join(', ')}`);
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
        { title: t('Documents & Contracts') },
        { title: t('Document Categories') },
    ];

    const canCreate = hasPermission(permissions, 'create-document-categories');
    const canEdit = hasPermission(permissions, 'edit-document-categories');
    const canDelete = hasPermission(permissions, 'delete-document-categories');

    const hasActiveFilters = () => {
        return selectedStatus !== '_empty_' || mandatoryFilter !== '_empty_' || searchTerm !== '';
    };

    return (
        <PageTemplate title={t('Document Categories')} description={t('Organize HR documents into categories.')} url="/hr/documents/document-categories" breadcrumbs={breadcrumbs} noPadding>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left Side - Form */}
                <div className="lg:col-span-1">
                    <div className="sticky top-4 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="border-b border-gray-200 p-6 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formMode === 'create' ? t('Add New Category') : t('Edit Category')}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {formMode === 'create'
                                    ? t('Fill in the details to create a new document category')
                                    : t('Update the category details below')}
                            </p>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4 p-6">
                            <div className="space-y-2">
                                <Label required htmlFor="name" className="required">
                                    {t('Category Name')}
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={t('e.g., HR Policies, Contracts')}
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
                                    placeholder={t('Brief description of the category')}
                                    rows={3}
                                    className={formErrors.description ? 'border-red-500' : ''}
                                    disabled={!canCreate && !canEdit}
                                />
                                {formErrors.description && <p className="text-sm text-red-500">{formErrors.description}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
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
                                            className={`h-10 w-12 cursor-pointer p-1 ${formErrors.color ? 'border-red-500' : ''}`}
                                            disabled={!canCreate && !canEdit}
                                            required
                                        />
                                        <Input
                                            type="text"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="flex-1 font-mono text-sm uppercase"
                                            disabled={!canCreate && !canEdit}
                                            placeholder="#3B82F6"
                                            pattern="^#[0-9A-Fa-f]{6}$"
                                            required
                                        />
                                    </div>
                                    {formErrors.color && <p className="text-sm text-red-500">{formErrors.color}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label required htmlFor="icon" className="required">
                                        {t('Icon')}
                                    </Label>
                                    <Select
                                        value={formData.icon}
                                        onValueChange={(value) => setFormData({ ...formData, icon: value })}
                                        disabled={!canCreate && !canEdit}
                                        required
                                    >
                                        <SelectTrigger className={formErrors.icon ? 'border-red-500' : ''}>
                                            <SelectValue placeholder={t('Select icon')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {iconOptions.map((opt) => {
                                                const IconComponent = IconMap[opt.value];
                                                return (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        <div className="flex items-center gap-2">
                                                            {IconComponent && <IconComponent className="h-4 w-4" />}
                                                            <span>{opt.label}</span>
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                    {formErrors.icon && <p className="text-sm text-red-500">{formErrors.icon}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="is_mandatory">{t('Mandatory Category')}</Label>
                                <Select
                                    value={formData.is_mandatory ? 'yes' : 'no'}
                                    onValueChange={(value) => setFormData({ ...formData, is_mandatory: value === 'yes' })}
                                    disabled={!canCreate && !canEdit}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="yes">{t('Yes, Mandatory')}</SelectItem>
                                        <SelectItem value="no">{t('No, Optional')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('Documents in mandatory categories require acknowledgment')}
                                </p>
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
                                        {formMode === 'create' ? t('Add Category') : t('Update Category')}
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
                                        placeholder={t('Search categories...')}
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
                                        <SelectItem value="_empty_">{t('All Statuses')}</SelectItem>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={mandatoryFilter} onValueChange={setMandatoryFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All Types')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_empty_">{t('All Types')}</SelectItem>
                                        <SelectItem value="true">{t('Mandatory')}</SelectItem>
                                        <SelectItem value="false">{t('Optional')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        {(documentCategories?.data || []).length > 0 ? (
                            <>
                                {/* <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Document Categories')}</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        {t('Manage how documents are organized and categorized.')}
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
                                                            {t('Category')}
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
                                                        {t('Documents')}
                                                    </th>
                                                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300 dark:bg-gray-900">
                                                        {t('Type')}
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
                                                {documentCategories.data.map((item: any) => {
                                                    const IconComponent = IconMap[item.icon] || Folder;
                                                    return (
                                                        <tr key={item.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                            <td className="px-4 py-4">
                                                                <div className="flex items-center">
                                                                    <div
                                                                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-white"
                                                                        style={{ backgroundColor: item.color || '#3B82F6' }}
                                                                    >
                                                                        <IconComponent className="h-5 w-5" />
                                                                    </div>
                                                                    <div className="ml-3">
                                                                        <div className="flex flex-row items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                                                                            {item.name}
                                                                            {item.is_mandatory && (
                                                                                <span title={t('Mandatory')}>
                                                                                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {item.description && (
                                                                            <div className="mt-0.5 max-w-xs text-sm text-gray-500 dark:text-gray-400">
                                                                                <div
                                                                                    className={
                                                                                        expandedDescriptions.has(item.id) ? '' : 'line-clamp-2'
                                                                                    }
                                                                                >
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
                                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-500/10 ring-inset dark:bg-gray-700 dark:text-gray-300">
                                                                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                                                                    {item.documents_count || 0}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-4">
                                                                <span
                                                                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                                                        item.is_mandatory
                                                                            ? 'bg-red-50 text-red-700 ring-red-600/10'
                                                                            : 'bg-blue-50 text-blue-700 ring-blue-600/20'
                                                                    }`}
                                                                >
                                                                    {item.is_mandatory ? (
                                                                        <>
                                                                            <AlertTriangle className="mr-1 h-3 w-3" />
                                                                            {t('Mandatory')}
                                                                        </>
                                                                    ) : (
                                                                        t('Optional')
                                                                    )}
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
                                                                            title={t('Edit Category')}
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
                                                                            title={t('Delete Category')}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="space-y-4 p-4 lg:hidden">
                                    {documentCategories.data.map((item: any) => {
                                        const IconComponent = IconMap[item.icon] || Folder;
                                        return (
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
                                                            <IconComponent className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                                                                {item.name}
                                                                {item.is_mandatory && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
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
                                                        <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{t('Type')}</p>
                                                        <span
                                                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                                                item.is_mandatory
                                                                    ? 'bg-red-50 text-red-700 ring-red-600/10'
                                                                    : 'bg-blue-50 text-blue-700 ring-blue-600/20'
                                                            }`}
                                                        >
                                                            {item.is_mandatory ? (
                                                                <>
                                                                    <AlertTriangle className="mr-1 h-3 w-3" />
                                                                    {t('Mandatory')}
                                                                </>
                                                            ) : (
                                                                t('Optional')
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{t('Documents')}</p>
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-500/10 ring-inset dark:bg-gray-700 dark:text-gray-300">
                                                            <FileText className="h-3 w-3 text-gray-400" />
                                                            {item.documents_count || 0}
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
                                        );
                                    })}
                                </div>

                                {documentCategories?.total > (documentCategories?.per_page || 10) && (
                                    <div className="border-t border-gray-200 dark:border-gray-700">
                                        <Pagination
                                            from={documentCategories?.from || 0}
                                            to={documentCategories?.to || 0}
                                            total={documentCategories?.total || 0}
                                            links={documentCategories?.links}
                                            entityName={t('categories')}
                                            hidePerPage
                                            onPageChange={(url) => {
                                                const page = new URL(url).searchParams.get('page');
                                                router.get(
                                                    route('hr.documents.document-categories.index'),
                                                    {
                                                        page,
                                                        per_page: pageFilters.per_page || 10,
                                                        search: searchTerm || undefined,
                                                        status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
                                                        is_mandatory: mandatoryFilter !== '_empty_' ? mandatoryFilter : undefined,
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
                                    <Folder className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">{t('No document categories found')}</h3>
                                <p className="mx-auto mb-6 max-w-sm text-gray-500 dark:text-gray-400">
                                    {hasActiveFilters()
                                        ? t('No categories match your search criteria. Try adjusting your filters.')
                                        : t('Create document categories to organize your team documents.')}
                                </p>
                                {!hasActiveFilters() && canCreate && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('Use the form on the left to add your first category.')}
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
                entityName="document category"
            />
        </PageTemplate>
    );
}
