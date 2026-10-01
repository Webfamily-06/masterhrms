import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import UserInitials from '@/components/user-initials';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { KanbanBoard } from '@/components/ui/kanban-board';
import { DropResult } from '@hello-pangea/dnd';
import {
  List,
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  Video,
  Eye,
  Edit,
  Trash2,
  ChevronRight,
  Filter,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

export default function InterviewKanban() {
  const { t } = useTranslation();
  const {
    auth,
    interviews: initialInterviews = [],
    candidates = [],
    interviewTypes = [],
    interviewRounds = [],
    employees = [],
    filters: pageFilters = {},
    globalSettings = {}
  } = usePage().props as any;

  const permissions = auth?.permissions || [];
  const canEdit = hasPermission(permissions, 'edit-interviews');
  const canCreate = hasPermission(permissions, 'create-interviews');
  const canDelete = hasPermission(permissions, 'delete-interviews');

  const [items, setItems] = useState<any[]>(initialInterviews);
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [candidateFilter, setCandidateFilter] = useState(pageFilters.candidate_id || '_empty_');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [availableRounds, setAvailableRounds] = useState([]);

  useEffect(() => {
    setItems(initialInterviews);
  }, [initialInterviews]);

  const stages = [
    {
      id: 'Scheduled',
      title: t('Scheduled'),
      dotColor: 'bg-blue-500',
      headerBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
      badgeBg: 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200/80 shadow-2xs',
      colBg: 'bg-blue-50/40 dark:bg-blue-950/10 border-blue-200 dark:border-blue-800/60'
    },
    {
      id: 'Completed',
      title: t('Completed'),
      dotColor: 'bg-emerald-500',
      headerBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
      badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200/80 shadow-2xs',
      colBg: 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/60'
    },
    {
      id: 'Cancelled',
      title: t('Cancelled'),
      dotColor: 'bg-slate-500',
      headerBg: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800',
      badgeBg: 'bg-slate-50 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300 border border-slate-200/80 shadow-2xs',
      colBg: 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-300 dark:border-slate-700'
    },
    {
      id: 'No-show',
      title: t('No-Show'),
      dotColor: 'bg-rose-500',
      headerBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
      badgeBg: 'bg-rose-50 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-200/80 shadow-2xs',
      colBg: 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-200 dark:border-rose-800/60'
    }
  ];

  const candidateOptions = [
    { value: '_empty_', label: t('All Candidates') },
    ...(candidates || []).map((candidate: any) => ({
      value: candidate.id.toString(),
      label: `${candidate.first_name} ${candidate.last_name}`
    }))
  ];

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (!canEdit) {
      toast.error(t('Permission Denied.'));
      return;
    }

    const previousItems = [...items];
    const targetStatus = destination.droppableId;
    const interviewId = parseInt(draggableId, 10);

    // Optimistically update local state
    setItems((prevItems) =>
      prevItems.map((item) => (item.id === interviewId ? { ...item, status: targetStatus } : item))
    );

    // Persist changes to backend
    router.put(
      route('hr.recruitment.interviews.update-status', interviewId),
      { status: targetStatus },
      {
        preserveScroll: true,
        onError: () => {
          // Revert state on error
          setItems(previousItems);
        },
        onSuccess: (page: any) => {
          if (page.props?.flash?.error) {
            setItems(previousItems);
          } else {
            toast.success(t('Interview status updated successfully'));
          }
        }
      }
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(
      route('hr.recruitment.interviews.kanban'),
      {
        search: searchTerm || undefined,
        candidate_id: candidateFilter !== '_empty_' ? candidateFilter : undefined
      },
      { preserveState: true, preserveScroll: true }
    );
  };

  const handleAddNew = () => {
    setCurrentItem({
      candidate_id: '',
      round_id: '',
      interview_type_id: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '10:00',
      duration: 30,
      location: '',
      meeting_link: '',
      interviewers: []
    });
    setSelectedCandidate('');
    setAvailableRounds([]);
    setFormMode('create');
    setIsFormModalOpen(true);
  };

  const handleEdit = (interview: any) => {
    const rawInterviewers = Array.isArray(interview.interviewers) ? interview.interviewers : [];
    setCurrentItem({
      id: interview.id,
      candidate_id: interview.candidate_id?.toString(),
      round_id: interview.round_id?.toString(),
      interview_type_id: interview.interview_type_id?.toString(),
      scheduled_date: interview.scheduled_date,
      scheduled_time: interview.scheduled_time?.substring(0, 5),
      duration: interview.duration,
      location: interview.location || '',
      meeting_link: interview.meeting_link || '',
      interviewers: rawInterviewers.map((id: any) => id.toString())
    });

    if (interview.candidate_id) {
      setSelectedCandidate(interview.candidate_id.toString());
      fetchRoundsByCandidate(interview.candidate_id);
    }
    setFormMode('edit');
    setIsFormModalOpen(true);
  };

  const handleDelete = (interview: any) => {
    setCurrentItem(interview);
    setIsDeleteModalOpen(true);
  };

  const fetchRoundsByCandidate = async (candidateId: string) => {
    if (!candidateId || candidateId === '_empty_') {
      setAvailableRounds([]);
      return;
    }
    try {
      const response = await fetch(route('hr.recruitment.interviews.rounds-by-candidate', candidateId), {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      const data = await response.json();
      setAvailableRounds(data || []);
    } catch (error) {
      console.error('Failed to fetch interview rounds:', error);
      setAvailableRounds([]);
    }
  };

  const handleCandidateChange = (candidateId: string) => {
    if (candidateId && candidateId !== '_empty_') {
      fetchRoundsByCandidate(candidateId);
    } else {
      setAvailableRounds([]);
    }
  };

  const candidateSelectOptions = [
    { value: '_empty_', label: t('Select Candidate') },
    ...(candidates || []).map((candidate: any) => ({
      value: candidate.id.toString(),
      label: `${candidate.first_name} ${candidate.last_name}`
    }))
  ];

  const interviewTypeOptions = [
    { value: '_empty_', label: t('Select Interview Type') },
    ...(interviewTypes || []).map((type: any) => ({
      value: type.id.toString(),
      label: type.name
    }))
  ];

  const employeeOptions = (employees || []).map((emp: any) => ({
    value: emp.id.toString(),
    label: emp.name || `${emp.first_name} ${emp.last_name}` || emp.employee_id
  }));

  const formFields = [
    {
      name: 'candidate_id',
      label: t('Candidate'),
      type: 'select',
      required: false,
      options: candidateSelectOptions.filter(opt => opt.value !== '_empty_'),
      render: (field: any, formData: any, handleChange: any) => {
        const currentValue = selectedCandidate || formData[field.name] || '';
        return (
          <Select
            value={currentValue}
            onValueChange={(value) => {
              setSelectedCandidate(value);
              handleChange(field.name, value);
              setAvailableRounds([]);
              handleChange('round_id', '');
              handleCandidateChange(value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('Select Candidate')} />
            </SelectTrigger>
            <SelectContent className="z-[60000]" searchable={true}>
              {candidateSelectOptions.filter(opt => opt.value !== '_empty_').map(option => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
    },
    {
      name: 'round_id',
      label: t('Interview Round'),
      type: 'select',
      required: true,
      placeholder: t('Select Interview Round'),
      searchable: true,
      key: `round-${selectedCandidate}`,
      options: availableRounds.map((round: any) => ({
        value: round.id.toString(),
        label: round.name
      }))
    },
    {
      name: 'interview_type_id',
      label: t('Interview Type'),
      type: 'select',
      required: true,
      placeholder: t('Select Interview Type'),
      options: interviewTypeOptions.filter(opt => opt.value !== '_empty_'),
      searchable: true
    },
    {
      name: 'scheduled_date',
      label: t('Date'),
      type: 'date',
      required: true,
      placeholder: t('Select Interview Date')
    },
    {
      name: 'scheduled_time',
      label: t('Time'),
      type: 'time',
      required: true,
      placeholder: t('Select Interview Time')
    },
    {
      name: 'duration',
      label: t('Duration (minutes)'),
      type: 'number',
      required: true,
      min: 15,
      max: 480,
      placeholder: t('e.g. 60')
    },
    {
      name: 'location',
      label: t('Location'),
      type: 'text',
      placeholder: t('e.g. Conference Room A, Floor 2')
    },
    {
      name: 'meeting_link',
      label: t('Meeting Link'),
      type: 'text',
      placeholder: t('https://meet.google.com/xxx-xxxx-xxx')
    },
    {
      name: 'interviewers',
      label: t('Interviewers'),
      type: 'multi-select',
      required: true,
      placeholder: t('Select Interviewers'),
      options: employeeOptions
    }
  ];

  const handleFormSubmit = (formData: any) => {
    if (selectedCandidate) {
      formData.candidate_id = selectedCandidate;
    }

    if (formMode === 'create') {
      if (!globalSettings?.is_demo) toast.loading(t('Scheduling interview...'));

      router.post(route('hr.recruitment.interviews.store'), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          setSelectedCandidate('');
          setAvailableRounds([]);
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
            toast.error(`Failed to schedule interview: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    } else {
      if (!globalSettings?.is_demo) toast.loading(t('Updating interview...'));

      router.put(route('hr.recruitment.interviews.update', currentItem.id), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          setSelectedCandidate('');
          setAvailableRounds([]);
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
            toast.error(`Failed to update interview: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!currentItem) return;
    router.delete(route('hr.recruitment.interviews.destroy', currentItem.id), {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        toast.success(t('Interview deleted successfully'));
      }
    });
  };

  const pageActions: any[] = [];

  if (canCreate) {
    pageActions.push({
      label: t('Schedule Interview'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: handleAddNew
    });
  }

  pageActions.push({
    icon: <List className="h-4 w-4" />,
    variant: 'outline',
    tooltip: t('List View'),
    onClick: () => router.get(route('hr.recruitment.interviews.index'))
  });

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Recruitment') },
    { title: t('Interviews'), href: route('hr.recruitment.interviews.index') },
    { title: t('Kanban') }
  ];

  return (
    <PageTemplate
      title={t('Interviews Kanban')}
      description={t('Track and manage interview schedules visually across stages')}
      actions={pageActions}
      breadcrumbs={breadcrumbs}
    >
      {/* Search and Filters Header */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearchSubmit}
          searchPlaceholder={t('Search...')}
          filters={[
            {
              name: 'candidate_id',
              label: t('Candidate'),
              type: 'select',
              searchable: true,
              options: candidateOptions,
              value: candidateFilter,
              onChange: (val) => {
                setCandidateFilter(val);
                router.get(
                  route('hr.recruitment.interviews.kanban'),
                  {
                    search: searchTerm || undefined,
                    candidate_id: val !== '_empty_' ? val : undefined
                  },
                  { preserveState: true, preserveScroll: true }
                );
              }
            }
          ]}
          hasActiveFilters={() => candidateFilter !== '_empty_' || searchTerm !== ''}
          activeFilterCount={() => (candidateFilter !== '_empty_' ? 1 : 0) + (searchTerm !== '' ? 1 : 0)}
          onResetFilters={() => {
            setSearchTerm('');
            setCandidateFilter('_empty_');
            router.get(route('hr.recruitment.interviews.kanban'));
          }}
        />
      </div>

      {/* Kanban Board Component */}
      <KanbanBoard
        stages={stages}
        items={items}
        getStatus={(item) => item.status}
        getId={(item) => item.id}
        onDragEnd={handleDragEnd}
        emptyPlaceholderText={t('Drop tasks here')}
        renderCard={(interview, index, snapshotDrag) => (
          <div
            className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/80 p-3 shadow-sm ${
              snapshotDrag.isDragging ? 'shadow-2xl ring-2 ring-primary scale-[1.02] rotate-1 z-50' : ''
            }`}
          >
            {/* Candidate Header */}
            <div className="flex items-start justify-between gap-2 mb-2 border-b border-gray-200 dark:border-gray-700/60 pb-2">
              <div className="flex items-center gap-2.5">
                <UserInitials name={interview.candidate_name} />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight">
                    {interview.candidate_name}
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {interview.job_title || t('Candidate')}
                  </p>
                </div>
              </div>
              {/* Actions Menu */}
              <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                {canEdit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handleEdit(interview)}
                        className="p-1 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{t('Edit')}</TooltipContent>
                  </Tooltip>
                )}
                {canDelete && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handleDelete(interview)}
                        className="p-1 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{t('Delete')}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Date & Time info with Mins on the right */}
            <div className="flex items-center justify-between gap-2 mb-2 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-1.5 min-w-0">
                <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="truncate">
                  {interview.scheduled_date ? String(interview.scheduled_date).substring(0, 10) : '-'}
                  {interview.scheduled_time ? ` at ${interview.scheduled_time.substring(0, 5)}` : ''}
                </span>
              </div>
              {interview.duration && (
                <div className="flex items-center gap-1 shrink-0 text-gray-600 dark:text-gray-300 rounded text-xs">
                  <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span>{interview.duration} mins</span>
                </div>
              )}
            </div>

            {/* Tags: Round Name & Type */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {interview.round_name && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/80 shadow-2xs">
                  {interview.round_name}
                </span>
              )}
              {interview.type_name && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 shadow-2xs">
                  {interview.type_name}
                </span>
              )}
            </div>

            {/* Location / Meeting link */}
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
              {interview.meeting_link ? (
                <Video className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              ) : (
                <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              )}
              <span className="truncate">
                {interview.location || (interview.meeting_link ? t('Online') : '-')}
              </span>
            </div>

            {/* Interviewers footer */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700/60 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">{t('Interviewers')}</span>
              <div className="flex items-center -space-x-1.5 overflow-visible">
                {interview.interviewer_details && interview.interviewer_details.length > 0 ? (
                  <>
                    {interview.interviewer_details.slice(0, 3).map((user: any, iIdx: number) => (
                      <Tooltip key={user.id || iIdx}>
                        <TooltipTrigger asChild>
                          <div className="ring-2 ring-white dark:ring-gray-800 rounded-full flex items-center justify-center cursor-pointer">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="h-6 w-6 rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextElementSibling) {
                                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div style={{ display: user.avatar ? 'none' : 'block' }}>
                              <UserInitials name={user.name} />
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {user.name}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {interview.interviewer_details.length > 3 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 text-[10px] font-medium flex items-center justify-center ring-2 ring-white dark:ring-gray-800 cursor-pointer">
                            +{interview.interviewer_details.length - 3}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {interview.interviewer_details
                            .slice(3)
                            .map((u: any) => u.name)
                            .join(', ')}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </>
                ) : (
                  <span className="text-[11px] text-gray-400">{t('None')}</span>
                )}
              </div>
            </div>

            {/* Join Meeting CTA if link exists */}
            {interview.meeting_link && (
              <Button
                asChild
                variant="default"
                size="sm"
                className="mt-2 w-full h-8 text-xs font-medium hover:!text-primary-foreground [&_a]:hover:!text-primary-foreground"
              >
                <a
                  href={interview.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 !text-primary-foreground hover:!text-primary-foreground"
                >
                  <Video className="h-3.5 w-3.5" />
                  {t('Join Interview')}
                </a>
              </Button>
            )}
          </div>
        )}
      />

      {/* Modals */}
      <CrudFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        title={
          formMode === 'create'
            ? t('Schedule New Interview')
            : t('Edit Interview')
        }
        formConfig={{
          fields: formFields as any,
          modalSize: 'lg'
        }}
        mode={formMode}
        initialData={currentItem ? {
          ...currentItem,
          candidate_id: currentItem.candidate_id?.toString()
        } : null}
      />

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={t('Delete Interview')}
        description={t('Are you sure you want to delete this interview schedule? This action cannot be undone.')}
      />
    </PageTemplate>
  );
}
