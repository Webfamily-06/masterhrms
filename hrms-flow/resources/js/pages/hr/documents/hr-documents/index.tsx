import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Dialog } from '@/components/ui/dialog';
import View from './view';
import { Plus, FileText, Download, Eye, AlertTriangle, Clock, CheckCircle, Package, Globe, Bell, MoreVertical, Edit, Trash2, RefreshCw, FileType, FileSpreadsheet, Presentation, FolderOpen, Calendar, User, LayoutGrid, FileEdit, Search, CheckCircle2, Archive, XCircle } from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export default function HrDocuments() {
  const { t } = useTranslation();
  const { auth, hrDocuments, statusCounts = {}, categories, stats, filters: pageFilters = {}, errors, flash, globalSettings } = usePage().props as any;
  const permissions = auth?.permissions || [];

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [categoryFilter, setCategoryFilter] = useState(pageFilters.category_id || '_empty_');
  const [statusFilter, setStatusFilter] = useState(pageFilters.status || '_empty_');
  const [pageInitialState, setPageInitialState] = useState(true);

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [categoryFilter, statusFilter]);

  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem] = useState<any>(null);

  const hasActiveFilters = () => {
    return categoryFilter !== '_empty_' || statusFilter !== '_empty_' || searchTerm !== '';
  };

  const activeFilterCount = () => {
    return (categoryFilter !== '_empty_' ? 1 : 0) + (statusFilter !== '_empty_' ? 1 : 0) + (searchTerm !== '' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.documents.hr-documents.index'), {
      page: 1,
      search: searchTerm || undefined,
      category_id: categoryFilter !== '_empty_' ? categoryFilter : undefined,
      status: statusFilter !== '_empty_' ? statusFilter : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    router.get(route('hr.documents.hr-documents.index'), {
      page: pageNum,
      search: searchTerm || undefined,
      category_id: categoryFilter !== '_empty_' ? categoryFilter : undefined,
      status: statusFilter !== '_empty_' ? statusFilter : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.documents.hr-documents.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      category_id: categoryFilter !== '_empty_' ? categoryFilter : undefined,
      status: statusFilter !== '_empty_' ? statusFilter : undefined,
      per_page: pageFilters.per_page,
    }, { preserveState: true, preserveScroll: true });
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
      case 'download':
        window.open(route('hr.documents.hr-documents.download', item.id), '_blank');
        break;
      case 'update-status':
        setIsStatusModalOpen(true);
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
      if (!globalSettings?.is_demo) { toast.loading(t('Uploading document...')); }

      router.post(route('hr.documents.hr-documents.store'), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) { toast.dismiss(); }
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) { toast.dismiss(); }
          if (typeof errors === 'string') {
            toast.error(t(errors));
          } else {
            toast.error(t('Failed to upload document: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) { toast.loading(t('Updating document...')); }

      router.put(route('hr.documents.hr-documents.update', currentItem.id), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) { toast.dismiss(); }
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) { toast.dismiss(); }
          if (typeof errors === 'string') {
            toast.error(t(errors));
          } else {
            toast.error(t('Failed to update document: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) { toast.loading(t('Deleting document...')); }

    router.delete(route('hr.documents.hr-documents.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (!globalSettings?.is_demo) { toast.dismiss(); }
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) { toast.dismiss(); }
        if (typeof errors === 'string') {
          toast.error(t(errors));
        } else {
          toast.error(t('Failed to delete document: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.documents.hr-documents.index'));
  };

  const handleStatusUpdate = (formData: any) => {
    if (!globalSettings?.is_demo) { toast.loading(t('Updating status...')); }

    router.put(route('hr.documents.hr-documents.update-status', currentItem.id), formData, {
      onSuccess: (page) => {
        setIsStatusModalOpen(false);
        if (!globalSettings?.is_demo) { toast.dismiss(); }
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) { toast.dismiss(); }
        if (typeof errors === 'string') {
          toast.error(t(errors));
        } else {
          toast.error(t('Failed to update status: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  // Stats from controller — always based on all documents, never affected by filters
  const totalDocs        = stats?.total || 0;
  const publishedDocs    = stats?.published || 0;
  const expiringSoonDocs = stats?.expiring_soon || 0;
  const needsAckDocs     = stats?.needs_acknowledgment || 0;

  const pageActions = [];

  if (hasPermission(permissions, 'create-hr-documents')) {
    pageActions.push({
      label: t('Upload Document'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Document Management') },
    { title: t('HR Documents') }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':        return 'bg-gray-50 text-gray-600 ring-gray-500/10';
      case 'Under Review': return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
      case 'Approved':     return 'bg-green-50 text-green-700 ring-green-600/20';
      case 'Published':    return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'Archived':     return 'bg-purple-50 text-purple-700 ring-purple-600/20';
      case 'Expired':      return 'bg-red-50 text-red-700 ring-red-600/10';
      default:             return 'bg-gray-50 text-gray-600 ring-gray-500/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Draft': return <FileText className="h-3 w-3" />;
      case 'Under Review': return <Clock className="h-3 w-3" />;
      case 'Approved': return <CheckCircle className="h-3 w-3" />;
      case 'Published': return <Eye className="h-3 w-3" />;
      case 'Archived': return <FileText className="h-3 w-3" />;
      case 'Expired': return <AlertTriangle className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const getFileTypeIcon = (fileName: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <FileType className="h-8 w-8 text-red-600" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-8 w-8 text-blue-600" />;
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
      case 'ppt':
      case 'pptx':
        return <Presentation className="h-8 w-8 text-orange-600" />;
      case 'txt':
        return <FileText className="h-8 w-8 text-gray-600" />;
      default:
        return <FileText className="h-8 w-8 text-slate-600" />;
    }
  };

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return expiry > today && expiry <= thirtyDaysFromNow;
  };

  const isExpired = (expiryDate: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };



  const formatFileSize = (bytes: number) => {
    if (bytes >= 1073741824) {
      return (bytes / 1073741824).toFixed(2) + ' GB';
    } else if (bytes >= 1048576) {
      return (bytes / 1048576).toFixed(2) + ' MB';
    } else if (bytes >= 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    } else {
      return bytes + ' bytes';
    }
  };

  const categoryOptions = [
    { value: '_empty_', label: t('All Categories') },
    ...(categories || []).map((cat: any) => ({
      value: cat.id.toString(),
      label: cat.name
    }))
  ];

  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? 0 },
    { value: 'Draft', label: t('Draft'), icon: <FileEdit className="h-4 w-4" />, count: statusCounts['Draft'] ?? 0 },
    { value: 'Under Review', label: t('Under Review'), icon: <Search className="h-4 w-4" />, count: statusCounts['Under Review'] ?? 0 },
    { value: 'Approved', label: t('Approved'), icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts['Approved'] ?? 0 },
    { value: 'Published', label: t('Published'), icon: <Globe className="h-4 w-4" />, count: statusCounts['Published'] ?? 0 },
    { value: 'Archived', label: t('Archived'), icon: <Archive className="h-4 w-4" />, count: statusCounts['Archived'] ?? 0 },
    { value: 'Expired', label: t('Expired'), icon: <XCircle className="h-4 w-4" />, count: statusCounts['Expired'] ?? 0 },
  ];



  const categorySelectOptions = [
    { value: '_empty_', label: t('Select Category') },
    ...(categories || []).map((cat: any) => ({
      value: cat.id.toString(),
      label: cat.name
    }))
  ];

  return (
    <PageTemplate
      title={t("HR Documents")}
      description={t("Store and manage official HR documents for employees.")}
      url="/hr/documents/hr-documents"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gray-100 dark:bg-gray-700/40 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Total Documents')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalDocs}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('All time')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
              <Package className="h-7 w-7 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Published')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{publishedDocs}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{totalDocs > 0 ? `${Math.round((publishedDocs / totalDocs) * 100)}% ${t('of total')}` : t('No documents')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
              <Globe className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 dark:bg-amber-900/20 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Expiring Soon')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{expiringSoonDocs}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{t('Within 30 days')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
              <Clock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Needs Acknowledgment')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{needsAckDocs}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">{totalDocs > 0 ? `${Math.round((needsAckDocs / totalDocs) * 100)}% ${t('of total')}` : t('No documents')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-red-100 dark:bg-red-900/40 rounded-xl">
              <Bell className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

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
              name: 'category_id',
              label: t('Category'),
              type: 'select',
              value: categoryFilter,
              onChange: setCategoryFilter,
              options: categoryOptions,
              searchable: true
            },

          ]}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
          perPageOptions={[12, 24, 48, 96]}
        />
      </div>

      {/* Card Grid Layout */}
      <div className="overflow-hidden">
        {hrDocuments?.data && hrDocuments.data.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
              {hrDocuments.data.map((document: any) => (
                <div
                  key={document.id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                >
                  {/* Title row + arrow */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base leading-snug line-clamp-2 flex-1">
                      {document.title}
                    </h3>
                    <button
                      onClick={() => handleAction('view', document)}
                      className="shrink-0 mt-0.5 text-gray-500 hover:opacity-70 transition-opacity cursor-pointer"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Last Update */}
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t('Last Update')}: <div className='flex text-gray-500 items-center'> <Calendar className='h-3 w-3 mr-1'/>{window.appSettings?.formatDateTimeSimple(document.effective_date || document.created_at, false)
                      || document.effective_date || document.created_at}</div>
                  </p>

                  {/* Category + Version row */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ring-1 ring-inset truncate max-w-[70%]"
                      style={{
                        backgroundColor: `${document.category?.color || '#3B82F6'}15`,
                        color: document.category?.color || '#3B82F6',
                        '--tw-ring-color': `${document.category?.color || '#3B82F6'}40`,
                      } as any}
                    >
                      {document.category?.name || '-'}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {document.version && (
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          v.{document.version}
                        </span>
                      )}
                      {/* Warning icons */}
                      {document.requires_acknowledgment && (
                        <span title={t('Requires Acknowledgment')}>
                          <Bell className="h-3.5 w-3.5 text-red-500" />
                        </span>
                      )}
                      {isExpiringSoon(document.expiry_date) && !isExpired(document.expiry_date) && (
                        <span title={t('Expiring Soon')}>
                          <Clock className="h-3.5 w-3.5 text-amber-500" />
                        </span>
                      )}
                      {isExpired(document.expiry_date) && document.status !== 'Expired' && (
                        <span title={t('Expired')}>
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(document.status)}`}>
                      {t(document.status)}
                    </span>
                  </div>

                  {/* Expiry date */}
                  {document.expiry_date && (
                    <p className={`text-xs ${ isExpired(document.expiry_date) ? 'text-red-500' : isExpiringSoon(document.expiry_date) ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500' }`}>
                      <span className="font-medium">{t('Expires')}:</span>{' '}
                      {window.appSettings?.formatDateTimeSimple(document.expiry_date, false) || document.expiry_date}
                    </p>
                  )}

                  {/* Footer: uploader + download count + actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 mt-auto">
                    <div className="flex items-center gap-1.5">
                      {document.uploader?.avatar ? (
                        <img src={document.uploader.avatar} alt={document.uploader.name} className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                          {document.uploader?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className='flex flex-col'>
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[80px]">{document.uploader?.name || '-'}</span>
                        <span className="text-sm text-gray-700 text-xs dark:text-gray-300 truncate max-w-[140px]">{document.uploader?.email || '-'}</span>
                      </div>
                      {document.download_count > 0 && (
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-0.5">
                          <Download className="h-3 w-3" />{document.download_count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {hasPermission(permissions, 'view-hr-documents') && (
                        <button
                          onClick={() => handleAction('download', document)}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors cursor-pointer"
                          title={t('Download')}
                        >
                          <Download className="h-3.5 w-3.5 text-gray-500" />
                        </button>
                      )}
                      {(hasPermission(permissions, 'edit-hr-documents') || hasPermission(permissions, 'delete-hr-documents')) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                              <MoreVertical className="h-3.5 w-3.5 text-gray-500" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {hasPermission(permissions, 'edit-hr-documents') && (
                              <>
                                <DropdownMenuItem onClick={() => handleAction('edit', document)}>
                                  <Edit className="h-4 w-4 mr-2 text-gray-500" />{t('Edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction('update-status', document)}>
                                  <RefreshCw className="h-4 w-4 mr-2 text-gray-500" />{t('Update Status')}
                                </DropdownMenuItem>
                              </>
                            )}
                            {hasPermission(permissions, 'delete-hr-documents') && (
                              <DropdownMenuItem onClick={() => handleAction('delete', document)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2 text-gray-500" />{t('Delete')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <Pagination
                    from={hrDocuments?.from || 0}
                    to={hrDocuments?.to || 0}
                    total={hrDocuments?.total || 0}
                    links={hrDocuments?.links}
                    entityName={t("documents")}
                    onPageChange={handlePageChange}
                    currentPerPage={pageFilters.per_page?.toString() || "12"}
                    onPerPageChange={(value) => {
                        router.get(route('hr.documents.hr-documents.index'), {
                        page: 1,
                        per_page: parseInt(value),
                        search: searchTerm || undefined,
                        category_id: categoryFilter !== '_empty_' ? categoryFilter : undefined,
                        status: statusFilter !== '_empty_' ? statusFilter : undefined,
                        sort_field: pageFilters.sort_field || undefined,
                        sort_direction: pageFilters.sort_direction || undefined,
                        }, { preserveState: true, preserveScroll: true });
                    }}
                    perPageOptions={[12, 24, 48, 96]}
                />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FolderOpen className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('No documents found')}</h3>
            <p className="text-sm text-gray-500 mb-4">{t('Upload your first document to get started')}</p>
            {hasPermission(permissions, 'create-hr-documents') && (
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                {t('Upload Document')}
              </Button>
            )}
          </div>
        )}
      </div>

      <CrudFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        errors={errors}
        formConfig={{
          fields: [
            // Basic Information Section
            {
              name: '_section_basic',
              label: t('Basic Information'),
              type: 'section'
            },
            {
              name: 'title',
              label: t('Document Title'),
              type: 'text',
              required: true,
              placeholder: t('e.g. Employee Handbook 2024')
            },
            {
              name: 'category_id',
              label: t('Category'),
              type: 'select',
              required: true,
              placeholder: t('Select a category'),
              options: categorySelectOptions.filter(opt => opt.value !== '_empty_'),
              searchable: true
            },
            {
              name: 'description',
              label: t('Description'),
              type: 'textarea',
              rows: 3,
              placeholder: t('Brief description of the document contents and purpose')
            },
            // File Upload Section
            {
              name: '_section_file',
              label: t('File Upload'),
              type: 'section'
            },
            {
              name: 'file',
              label: t('File'),
              type: 'custom',
              required: formMode === 'create',
              render: (field, formData, handleChange) => (
                <div>
                  <MediaPicker
                    value={String(formData[field.name] || formData.file_path || '')}
                    onChange={(url) => handleChange(field.name, url)}
                    placeholder={t('Select document file...')}
                  />
                </div>
              ),
              helpText: t('Max file size: 10MB. Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT')
            },
            // Validity & Settings Section
            {
              name: '_section_validity',
              label: t('Validity & Settings'),
              type: 'section'
            },
            {
              name: 'effective_date',
              label: t('Effective Date'),
              type: 'date',
              placeholder: t('Select effective date')
            },
            {
              name: 'expiry_date',
              label: t('Expiry Date'),
              type: 'date',
              placeholder: t('Select expiry date')
            },
            {
              name: 'requires_acknowledgment',
              label: t('Requires Acknowledgment'),
              type: 'checkbox',
              helpText: t('Users must acknowledge reading this document')
            }
          ],
          modalSize: 'xl'
        }}
        initialData={currentItem ? {
          ...currentItem,
          effective_date: currentItem.effective_date ? window.appSettings.formatDateTimeSimple(currentItem.effective_date, false) : currentItem.effective_date
        } : null}
        title={
          formMode === 'create'
            ? t('Upload New Document')
            : t('Edit Document')
        }
        mode={formMode}
      />

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.title || ''}
        entityName="document"
      />

      <CrudFormModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onSubmit={handleStatusUpdate}
        formConfig={{
          fields: [
            {
              name: '_workflow_stepper',
              label: '',
              type: 'custom',
              render: () => {
                const getTimelineColor = (status: string) => {
                  switch (status) {
                    case 'Draft': return 'bg-gray-600';
                    case 'Under Review': return 'bg-yellow-600';
                    case 'Approved': return 'bg-green-600';
                    case 'Published': return 'bg-blue-600';
                    case 'Archived': return 'bg-purple-600';
                    case 'Expired': return 'bg-red-600';
                    default: return 'bg-gray-600';
                  }
                };

                const getTimelineTextColor = (status: string) => {
                  switch (status) {
                    case 'Draft': return 'text-gray-600';
                    case 'Under Review': return 'text-yellow-600';
                    case 'Approved': return 'text-green-600';
                    case 'Published': return 'text-blue-600';
                    case 'Archived': return 'text-purple-600';
                    case 'Expired': return 'text-red-600';
                    default: return 'text-gray-600';
                  }
                };

                return (
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      {['Draft', 'Under Review', 'Approved', 'Published', 'Archived', 'Expired'].map((status, index, array) => (
                        <div key={status} className="flex items-center flex-1">
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              currentItem?.status === status
                                ? `${getTimelineColor(status)} text-white`
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {status === 'Draft' && <FileText className="h-5 w-5" />}
                              {status === 'Under Review' && <Clock className="h-5 w-5" />}
                              {status === 'Approved' && <CheckCircle className="h-5 w-5" />}
                              {status === 'Published' && <Eye className="h-5 w-5" />}
                              {status === 'Archived' && <FileText className="h-5 w-5" />}
                              {status === 'Expired' && <AlertTriangle className="h-5 w-5" />}
                            </div>
                            <span className={`text-xs mt-2 text-center ${
                              currentItem?.status === status ? `font-semibold ${getTimelineTextColor(status)}` : 'text-gray-500'
                            }`}>
                              {t(status)}
                            </span>
                          </div>
                          {index < array.length - 1 && (
                            <div className="flex-1 h-0.5 bg-gray-200 mx-2"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
            },
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              required: true,
              placeholder: t('Select new status'),
              options: [
                { value: 'Draft', label: t('Draft') },
                { value: 'Under Review', label: t('Under Review') },
                { value: 'Approved', label: t('Approved') },
                { value: 'Published', label: t('Published') },
                { value: 'Archived', label: t('Archived') },
                { value: 'Expired', label: t('Expired') }
              ]
            }
          ]
        }}
        initialData={{ status: currentItem?.status }}
        title={t('Update Document Status')}
        mode="edit"
        errors={errors}
      />
      {/* View Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View document={viewingItem} />}
      </Dialog>
    </PageTemplate>
  );
}
