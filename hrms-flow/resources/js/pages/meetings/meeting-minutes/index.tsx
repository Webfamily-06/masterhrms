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
import { Plus, FileText, MessageSquare, CheckSquare, StickyNote, Gavel, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useInitials } from '@/hooks/use-initials';

export default function MeetingMinutes() {
  const { t } = useTranslation();
  const { auth, meetingMinutes, meetings, employees, filters: pageFilters = {}, globalSettings } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const getInitials = useInitials();

  const [pageInitialState, setPageInitialState] = useState(true);
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [typeFilter, setTypeFilter] = useState(pageFilters.type || '_empty_');
  const [meetingFilter, setMeetingFilter] = useState(pageFilters.meeting_id || '_empty_');
  const [recorderFilter, setRecorderFilter] = useState(pageFilters.recorded_by || '_empty_');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [typeFilter, meetingFilter, recorderFilter]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem] = useState<any>(null);

  const hasActiveFilters = () => {
    return typeFilter !== '_empty_' || meetingFilter !== '_empty_' || recorderFilter !== '_empty_' || searchTerm !== '';
  };

  const activeFilterCount = () => {
    return (typeFilter !== '_empty_' ? 1 : 0) + (meetingFilter !== '_empty_' ? 1 : 0) + (recorderFilter !== '_empty_' ? 1 : 0) + (searchTerm !== '' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('meetings.meeting-minutes.index'), {
      page: 1,
      search: searchTerm || undefined,
      type: typeFilter !== '_empty_' ? typeFilter : undefined,
      meeting_id: meetingFilter !== '_empty_' ? meetingFilter : undefined,
      recorded_by: recorderFilter !== '_empty_' ? recorderFilter : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    router.get(route('meetings.meeting-minutes.index'), {
      page: pageNum,
      search: searchTerm || undefined,
      type: typeFilter !== '_empty_' ? typeFilter : undefined,
      meeting_id: meetingFilter !== '_empty_' ? meetingFilter : undefined,
      recorded_by: recorderFilter !== '_empty_' ? recorderFilter : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
    router.get(route('meetings.meeting-minutes.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      type: typeFilter !== '_empty_' ? typeFilter : undefined,
      meeting_id: meetingFilter !== '_empty_' ? meetingFilter : undefined,
      recorded_by: recorderFilter !== '_empty_' ? recorderFilter : undefined,
      per_page: pageFilters.per_page
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
    }
  };

  const handleAddNew = () => {
    setCurrentItem(null);
    setFormMode('create');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    // Combine date and time fields into recorded_at
    if (formData.recorded_date && formData.recorded_time) {
      formData.recorded_at = `${formData.recorded_date} ${formData.recorded_time}`;
    } else if (formData.recorded_date) {
      formData.recorded_at = `${formData.recorded_date} 00:00`;
    }

    // Remove separate date/time fields
    delete formData.recorded_date;
    delete formData.recorded_time;

    if (formMode === 'create') {
      if (!globalSettings?.is_demo) {
        toast.loading(t('Creating meeting minute...'));
      }

      router.post(route('meetings.meeting-minutes.store'), formData, {
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
            toast.error(`Failed to create meeting minute: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) {
        toast.loading(t('Updating meeting minute...'));
      }

      router.put(route('meetings.meeting-minutes.update', currentItem.id), formData, {
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
            toast.error(`Failed to update meeting minute: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) {
      toast.loading(t('Deleting meeting minute...'));
    }

    router.delete(route('meetings.meeting-minutes.destroy', currentItem.id), {
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
          toast.error(`Failed to delete meeting minute: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('meetings.meeting-minutes.index'));
  };

  const pageActions = [];

  if (hasPermission(permissions, 'create-meeting-minutes')) {
    pageActions.push({
      label: t('Add Minute'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Meetings') },
    { title: t('Meeting Minutes') }
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Discussion': return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'Decision': return 'bg-green-50 text-green-700 ring-green-600/20';
      case 'Action Item': return 'bg-orange-50 text-orange-700 ring-orange-600/20';
      case 'Note': return 'bg-yellow-50 text-yellow-800 ring-yellow-600/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Discussion': return <MessageSquare className="h-3 w-3" />;
      case 'Decision': return <Gavel className="h-3 w-3" />;
      case 'Action Item': return <CheckSquare className="h-3 w-3" />;
      case 'Note': return <StickyNote className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const columns = [
    {
      key: 'meeting.title',
      label: t('Meeting'),
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.meeting?.title}</div>
          <div className="flex text-xs text-gray-500 gap-1 items-center">
            <Calendar className="h-3 w-3"/>
            {row.meeting?.meeting_date ? window.appSettings?.formatDateTimeSimple(row.meeting?.meeting_date, false) || new Date(row.meeting?.meeting_date).toLocaleDateString() : '-'}
          </div>
        </div>
      )
    },
    {
      key: 'topic',
      label: t('Topic'),
      sortable: true,
      render: (value) => <div className="font-medium">{value}</div>
    },
    {
      key: 'type',
      label: t('Type'),
      render: (value) => (
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getTypeColor(value)}`}>
          {t(value)}
        </span>
      )
    },
    {
      key: 'recorder.name',
      label: t('Recorded By'),
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white overflow-hidden shrink-0">
            {row.recorder?.avatar ? (
              <img src={row.recorder.avatar} alt={row.recorder?.name} className="h-full w-full object-cover" />
            ) : (
              getInitials(row.recorder?.name || '')
            )}
          </div>
          <div>
            <div className="font-medium">{row.recorder?.name || '-'}</div>
            <div className="text-sm text-muted-foreground">{row.recorder?.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'recorded_at',
      label: t('Recorded At'),
      sortable: true,
      type: 'date'
    }
  ];

  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-meeting-minutes'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-meeting-minutes'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-meeting-minutes'
    }
  ];

  const typeOptions = [
    { value: '_empty_', label: t('All Types') },
    { value: 'Discussion', label: t('Discussion') },
    { value: 'Decision', label: t('Decision') },
    { value: 'Action Item', label: t('Action Item') },
    { value: 'Note', label: t('Note') }
  ];

  const meetingOptions = [
    { value: '_empty_', label: t('All Meetings') },
    ...(meetings || []).map((meeting: any) => ({
      value: meeting.id.toString(),
      label: `${meeting.title} - ${format(new Date(meeting.meeting_date), 'MMM dd, yyyy')}`
    }))
  ];

  const recorderOptions = [
    { value: '_empty_', label: t('All Recorders') },
    ...(employees || []).map((emp: any) => ({
      value: emp.id.toString(),
      label: emp.name
    }))
  ];

  const meetingSelectOptions = [
    { value: '_empty_', label: t('Select Meeting') },
    ...(meetings || []).map((meeting: any) => ({
      value: meeting.id.toString(),
      label: `${meeting.title} - ${format(new Date(meeting.meeting_date), 'MMM dd, yyyy')}`
    }))
  ];

  const employeeOptions = [
    { value: '_empty_', label: t('Select Recorder') },
    ...(employees || []).map((emp: any) => ({
      value: emp.id.toString(),
      label: emp.name
    }))
  ];

  return (
    <PageTemplate
      title={t("Meeting Minutes")}
      description={t("Record and review notes and decisions from meetings.")}
      url="/meetings/meeting-minutes"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[
            {
              name: 'type',
              label: t('Type'),
              type: 'select',
              value: typeFilter,
              onChange: setTypeFilter,
              options: typeOptions
            },
            {
              name: 'meeting_id',
              label: t('Meeting'),
              type: 'select',
              value: meetingFilter,
              onChange: setMeetingFilter,
              options: meetingOptions,
              searchable: true
            },
            {
              name: 'recorded_by',
              label: t('Recorder'),
              type: 'select',
              value: recorderFilter,
              onChange: setRecorderFilter,
              options: recorderOptions,
              searchable: true
            }
          ]}
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
          data={meetingMinutes?.data || []}
          from={meetingMinutes?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-meeting-minutes',
            create: 'create-meeting-minutes',
            edit: 'edit-meeting-minutes',
            delete: 'delete-meeting-minutes'
          }}
        />

        <Pagination
          from={meetingMinutes?.from || 0}
          to={meetingMinutes?.to || 0}
          total={meetingMinutes?.total || 0}
          links={meetingMinutes?.links}
          entityName={t("meeting minutes")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || '10'}
          onPerPageChange={(value) => {
            router.get(route('meetings.meeting-minutes.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              type: typeFilter !== '_empty_' ? typeFilter : undefined,
              meeting_id: meetingFilter !== '_empty_' ? meetingFilter : undefined,
              recorded_by: recorderFilter !== '_empty_' ? recorderFilter : undefined,
              sort_field: pageFilters.sort_field || undefined,
              sort_direction: pageFilters.sort_direction || undefined
            }, { preserveState: true, preserveScroll: true });
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
              name: 'meeting_id',
              label: t('Meeting'),
              type: 'select',
              required: true,
              placeholder: t('Select Meeting'),
              options: meetingSelectOptions.filter(opt => opt.value !== '_empty_'),
              searchable: true
            },
            {
              name: 'topic',
              label: t('Topic'),
              type: 'text',
              required: true,
              placeholder: t('e.g. Budget Review Discussion')
            },
            {
              name: 'type',
              label: t('Type'),
              type: 'select',
              required: true,
              placeholder: t('Select Type'),
              options: typeOptions.filter(opt => opt.value !== '_empty_')
            },
            {
              name: 'content',
              label: t('Content'),
              type: 'textarea',
              required: true,
              rows: 6,
              placeholder: t('e.g. The team discussed the Q2 budget allocation...')
            },
            {
              name: 'recorded_by',
              label: t('Recorded By'),
              type: 'select',
              required: true,
              placeholder: t('Select Recorder'),
              options: employeeOptions.filter(opt => opt.value !== '_empty_'),
              searchable: true
            },
            {
              name: 'recorded_date',
              label: t('Recorded Date'),
              type: 'date',
              placeholder: t('Select Recorded Date'),
              helpText: t('Leave empty to use current date')
            },
            {
              name: 'recorded_time',
              label: t('Recorded Time'),
              type: 'time',
              placeholder: t('Select Recorded Time'),
              helpText: t('Leave empty to use current time')
            }
          ],
          modalSize: 'xl'
        }}
        initialData={currentItem ? {
          ...currentItem,
          recorded_date: currentItem.recorded_at ? new Date(currentItem.recorded_at).toISOString().split('T')[0] : '',
          recorded_time: currentItem.recorded_at ? new Date(currentItem.recorded_at).toTimeString().substring(0, 5) : ''
        } : null}
        title={
          formMode === 'create'
            ? t('Add Meeting Minute')
            : t('Edit Meeting Minute')
        }
        mode={formMode}
      />

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.topic || ''}
        entityName="meeting minute"
      />
      {/* View Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View minute={viewingItem} />}
      </Dialog>
    </PageTemplate>
  );
}
