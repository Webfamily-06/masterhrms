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
import { Plus, Star } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import UserInitials from '@/components/user-initials';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';

// Star Rating component — supports half stars (0.5 steps), value stored as float
function StarRating({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const [hovered, setHovered] = useState<number>(0);

  const displayValue = hovered || value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFullFilled  = displayValue >= star;
        const isHalfFilled  = !isFullFilled && displayValue >= star - 0.5;

        return (
          <div key={star} className="relative h-7 w-7">
            {/* Base empty star */}
            <Star className="h-7 w-7 fill-none text-gray-300" />

            {/* Half fill overlay */}
            {isHalfFilled && (
              <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                <Star className="h-7 w-7 fill-yellow-400 text-yellow-400" />
              </div>
            )}

            {/* Full fill overlay */}
            {isFullFilled && (
              <div className="absolute inset-0">
                <Star className="h-7 w-7 fill-yellow-400 text-yellow-400" />
              </div>
            )}

            {/* Left half hitbox → x - 0.5 */}
            <div
              className={`absolute inset-y-0 left-0 w-1/2 ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
              onMouseEnter={() => !disabled && setHovered(star - 0.5)}
              onMouseLeave={() => !disabled && setHovered(0)}
              onClick={() => !disabled && onChange(star - 0.5)}
            />

            {/* Right half hitbox → x */}
            <div
              className={`absolute inset-y-0 right-0 w-1/2 ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
              onMouseEnter={() => !disabled && setHovered(star)}
              onMouseLeave={() => !disabled && setHovered(0)}
              onClick={() => !disabled && onChange(star)}
            />
          </div>
        );
      })}

      {value > 0 && (
        <span className="ml-2 text-sm text-gray-500">{value}/5</span>
      )}
    </div>
  );
}

export default function InterviewFeedback() {
  const { t } = useTranslation();
  const { auth, interviewFeedback, interviews, interviewers, filters: pageFilters = {}, globalSettings } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const getInitials = useInitials();

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [recommendationFilter, setRecommendationFilter] = useState(pageFilters.recommendation || '_empty_');
  const [interviewerFilter, setInterviewerFilter] = useState(pageFilters.interviewer_id || '_empty_');
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [availableInterviewers, setAvailableInterviewers] = useState([]);
  const [selectedInterview, setSelectedInterview] = useState('');

  const handleInterviewChange = async (interviewId: string, clearInterviewers = true) => {
    if (clearInterviewers) {
      setAvailableInterviewers([]);
    }

    if (interviewId && interviewId !== '_empty_') {
      try {
        const response = await fetch(route('hr.recruitment.interview-feedback.get-interviewers', interviewId), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        const data = await response.json();
        setAvailableInterviewers(data || []);
      } catch (error) {
        setAvailableInterviewers([]);
      }
    } else {
      setAvailableInterviewers([]);
    }
  };

  const hasActiveFilters = () => {
    return recommendationFilter !== '_empty_' || interviewerFilter !== '_empty_' || searchTerm !== '';
  };

  const activeFilterCount = () => {
    return (recommendationFilter !== '_empty_' ? 1 : 0) + (interviewerFilter !== '_empty_' ? 1 : 0) + (searchTerm !== '' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.recruitment.interview-feedback.index'), {
      page: 1,
      search: searchTerm || undefined,
      recommendation: recommendationFilter !== '_empty_' ? recommendationFilter : undefined,
      interviewer_id: interviewerFilter !== '_empty_' ? interviewerFilter : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const page = new URL(url).searchParams.get('page');
    router.get(route('hr.recruitment.interview-feedback.index'), {
      page,
      search: searchTerm || undefined,
      recommendation: recommendationFilter !== '_empty_' ? recommendationFilter : undefined,
      interviewer_id: interviewerFilter !== '_empty_' ? interviewerFilter : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.recruitment.interview-feedback.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      recommendation: recommendationFilter !== '_empty_' ? recommendationFilter : undefined,
      interviewer_id: interviewerFilter !== '_empty_' ? interviewerFilter : undefined,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = async (action: string, item: any) => {
    setCurrentItem(item);

    if ((action === 'edit') && item.interview_id) {
      setSelectedInterview(item.interview_id.toString());
      await handleInterviewChange(item.interview_id.toString());
    }

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
    setAvailableInterviewers([]);
    setSelectedInterview('');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    // Ensure interview_id is included from selectedInterview state
    if (selectedInterview) {
      formData.interview_id = selectedInterview;
    }

    // Convert interviewer_id array to comma-separated string if it's an array
    if (Array.isArray(formData.interviewer_id) && formData.interviewer_id.length > 0) {
      formData.interviewer_id = formData.interviewer_id.join(',');
    } else if (!formData.interviewer_id) {
      formData.interviewer_id = null;
    }

    if (formMode === 'create') {
      if (!globalSettings?.is_demo) toast.loading(t('Submitting interview feedback...'));

      router.post(route('hr.recruitment.interview-feedback.store'), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          setSelectedInterview('');
          setAvailableInterviewers([]);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          } else {
            toast.success(t('Interview feedback submitted successfully'));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(`Failed to submit interview feedback: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) toast.loading(t('Updating interview feedback...'));

      router.put(route('hr.recruitment.interview-feedback.update', currentItem.id), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          setSelectedInterview('');
          setAvailableInterviewers([]);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          } else {
            toast.success(t('Interview feedback updated successfully'));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(`Failed to update interview feedback: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting interview feedback...'));

    router.delete(route('hr.recruitment.interview-feedback.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        } else {
          toast.success(t('Interview feedback deleted successfully'));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(`Failed to delete interview feedback: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.recruitment.interview-feedback.index'));
  };

  const pageActions = [];

  if (hasPermission(permissions, 'create-interview-feedback')) {
    pageActions.push({
      label: t('Add Feedback'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Recruitment') },
    { title: t('Interview Feedback') }
  ];

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'Strong Hire': return 'bg-green-50 text-green-700 ring-green-600/20';
      case 'Hire': return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'Maybe': return 'bg-yellow-50 text-yellow-800 ring-yellow-600/20';
      case 'Reject': return 'bg-red-50 text-red-700 ring-red-600/10';
      case 'Strong Reject': return 'bg-red-50 text-red-700 ring-red-600/10';
      default: return 'bg-gray-50 text-gray-600 ring-gray-500/10';
    }
  };

  const columns = [
    {
      key: 'interview.candidate.full_name',
      label: t('Candidate'),
      render: (value: any, row: any) => {
            return (
            <div className="flex items-center gap-3">
                <UserInitials name={`${row.interview?.candidate?.first_name} ${row.interview?.candidate?.last_name}`} />
                <div>
                <div className="font-medium">{row.interview?.candidate?.first_name} {row.interview?.candidate?.last_name}</div>
                <div className="text-sm text-muted-foreground">{row.interview?.job?.title}</div>
                </div>
            </div>
            );
        }
    },
    {
      key: 'interview.round.name',
      label: t('Round'),
      render: (_, row) => row.interview?.round?.name || '-'
    },
    {
      key: 'interviewer_names',
      label: t('Interviewer'),
      render: (value: any, row: any) => {
        const interviewers = row.interviewers || [];
        if (!interviewers.length) return <span className="text-muted-foreground">-</span>;
        const visible = interviewers.slice(0, 4);
        const remaining = interviewers.slice(4);
        return (
          <TooltipProvider>
            <div className="flex items-center">
              {visible.map((interviewer: any, index: number) => (
                <Tooltip key={interviewer.id}>
                  <TooltipTrigger asChild>
                    <div
                      className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 flex-shrink-0 cursor-pointer"
                      style={{ marginLeft: index === 0 ? 0 : '-8px', zIndex: interviewers.length - index }}
                    >
                      {interviewer.avatar ? (
                        <img
                          src={interviewer.avatar}
                          alt={interviewer.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fb = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fb) fb.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold${interviewer.avatar ? ' hidden' : ''}`}>
                        {getInitials(interviewer.name)}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{interviewer.name}</TooltipContent>
                </Tooltip>
              ))}
              {remaining.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-semibold text-gray-600 dark:text-gray-300 flex-shrink-0 cursor-pointer"
                      style={{ marginLeft: '-8px', zIndex: 0 }}
                    >
                      +{remaining.length}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-0.5">
                      {remaining.map((i: any) => <p key={i.id}>{i.name}</p>)}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        );
      }
    },
    {
      key: 'overall_rating',
      label: t('Overall Rating'),
      render: (value) => {
        if (!value) return '-';
        return (
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => {
              const isFullFilled = value >= star;
              const isHalfFilled = !isFullFilled && value >= star - 0.5;
              return (
                <div key={star} className="relative h-4 w-4">
                  <Star className="h-4 w-4 fill-none text-gray-300" />
                  {isHalfFilled && (
                    <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                  )}
                  {isFullFilled && (
                    <div className="absolute inset-0">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                  )}
                </div>
              );
            })}
            <span className="ml-1 text-xs text-gray-500">{value}/5</span>
          </div>
        );
      }
    },
    {
      key: 'recommendation',
      label: t('Recommendation'),
      render: (value) => {
        if (!value) return '-';
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getRecommendationColor(value)}`}>
            {t(value)}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      label: t('Submitted'),
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
      requiredPermission: 'view-interview-feedback'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-interview-feedback'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-interview-feedback'
    }
  ];

  const recommendationOptions = [
    { value: '_empty_', label: t('Recommendations') },
    { value: 'Strong Hire', label: t('Strong Hire') },
    { value: 'Hire', label: t('Hire') },
    { value: 'Maybe', label: t('Maybe') },
    { value: 'Reject', label: t('Reject') },
    { value: 'Strong Reject', label: t('Strong Reject') }
  ];

  const interviewerOptions = [
    { value: '_empty_', label: t('All Interviewers'), disabled: true },
    ...(interviewers || []).map((interviewer: any) => ({
      value: interviewer.id.toString(),
      label: interviewer.name
    }))
  ];

  const [pageInitialState, setPageInitialState] = useState(true);
  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [searchTerm, recommendationFilter, interviewerFilter]);

  const interviewOptions = [
    { value: '_empty_', label: t('Select Interview') },
    ...(interviews || []).map((interview: any) => ({
      value: interview.id.toString(),
      label: `${interview.candidate?.first_name} ${interview.candidate?.last_name} - ${interview.job?.title} (${interview.round?.name || 'No Round'})`
    }))
  ];

  const interviewerSelectOptions = [
    { value: '_empty_', label: t('Select Interviewer') },
    ...(interviewers || []).map((interviewer: any) => ({
      value: interviewer.id.toString(),
      label: interviewer.name
    }))
  ];

  return (
    <PageTemplate
      title={t("Interview Feedback")}
      description={t("View and manage feedback submitted for candidate interviews.")}
      url="/hr/recruitment/interview-feedback"
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
              name: 'recommendation',
              label: t('Recommendation'),
              type: 'select',
              value: recommendationFilter,
              onChange: setRecommendationFilter,
              options: recommendationOptions
            },
            {
              name: 'interviewer_id',
              label: t('Interviewer'),
              type: 'select',
              value: interviewerFilter,
              onChange: setInterviewerFilter,
              options: interviewerOptions,
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
          data={interviewFeedback?.data || []}
          from={interviewFeedback?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-interview-feedback',
            create: 'create-interview-feedback',
            edit: 'edit-interview-feedback',
            delete: 'delete-interview-feedback'
          }}
        />

        <Pagination
          from={interviewFeedback?.from || 0}
          to={interviewFeedback?.to || 0}
          total={interviewFeedback?.total || 0}
          links={interviewFeedback?.links}
          entityName={t("interview feedback")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || '10'}
          onPerPageChange={(value) => {
            router.get(route('hr.recruitment.interview-feedback.index'), {
              page: 1,
              per_page: value,
              search: searchTerm || undefined,
              recommendation: recommendationFilter !== '_empty_' ? recommendationFilter : undefined,
              interviewer_id: interviewerFilter !== '_empty_' ? interviewerFilter : undefined,
              sort_field: pageFilters.sort_field || undefined,
              sort_direction: pageFilters.sort_direction || undefined,
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
              name: 'interview_id',
              label: t('Interview'),
              type: 'select',
              required: false,
              options: interviewOptions.filter(opt => opt.value !== '_empty_'),
              render: (field: any, formData: any, handleChange: any) => {
                const currentValue = selectedInterview || formData[field.name] || '';
                return (
                  <Select
                    value={currentValue}
                    onValueChange={(value) => {
                      setSelectedInterview(value);
                      handleChange(field.name, value);
                      // Clear interviewer selection when interview changes
                      setAvailableInterviewers([]);
                      handleChange('interviewer_id', []);
                      handleInterviewChange(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select Interview')} />
                    </SelectTrigger>
                    <SelectContent className="z-[60000]" searchable={true}>
                      {interviewOptions.filter(opt => opt.value !== '_empty_').map(option => (
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
              name: 'interviewer_id',
              label: t('Interviewer'),
              type: 'multi-select',
              required: true,
              searchable: true,
              placeholder: t('Select Interviewers'),
              key: `interviewer-${selectedInterview}`,
              options: availableInterviewers.map((interviewer: any) => ({
                value: interviewer.id.toString(),
                label: interviewer.name
              }))
            },
            {
              name: 'technical_rating',
              label: t('Technical Rating'),
              type: 'number',
              required: true,
              render: (field: any, formData: any, handleChange: any) => (
                <StarRating
                  value={Number(formData[field.name]) || 0}
                  onChange={(v) => handleChange(field.name, v)}
                  disabled={formMode === 'view'}
                />
              )
            },
            {
              name: 'communication_rating',
              label: t('Communication Rating'),
              type: 'number',
              required: true,
              render: (field: any, formData: any, handleChange: any) => (
                <StarRating
                  value={Number(formData[field.name]) || 0}
                  onChange={(v) => handleChange(field.name, v)}
                  disabled={formMode === 'view'}
                />
              )
            },
            {
              name: 'cultural_fit_rating',
              label: t('Cultural Fit Rating'),
              type: 'number',
              required: true,
              render: (field: any, formData: any, handleChange: any) => (
                <StarRating
                  value={Number(formData[field.name]) || 0}
                  onChange={(v) => handleChange(field.name, v)}
                  disabled={formMode === 'view'}
                />
              )
            },
            {
              name: 'overall_rating',
              label: t('Overall Rating'),
              type: 'number',
              required: true,
              render: (field: any, formData: any, handleChange: any) => (
                <StarRating
                  value={Number(formData[field.name]) || 0}
                  onChange={(v) => handleChange(field.name, v)}
                  disabled={formMode === 'view'}
                />
              )
            },
            {
              name: 'recommendation',
              label: t('Recommendation'),
              type: 'select',
              required: true,
              placeholder: t('Select Recommendation'),
              options: recommendationOptions.filter(opt => opt.value !== '_empty_')
            },
            {
              name: 'strengths',
              label: t('Strengths'),
              type: 'textarea',
              required: true,
              placeholder: t('e.g. Strong problem-solving skills, excellent communication...')
            },
            {
              name: 'weaknesses',
              label: t('Weaknesses'),
              type: 'textarea',
              placeholder: t('e.g. Needs improvement in time management...')
            },
            {
              name: 'comments',
              label: t('Comments'),
              type: 'textarea',
              placeholder: t('e.g. Overall a strong candidate, recommend for next round...')
            }
          ],
          modalSize: 'xl'
        }}
        initialData={currentItem ? {
          ...currentItem,
          interviewer_id: currentItem.interviewer_id ? currentItem.interviewer_id.split(',') : [],
          interview_id: currentItem.interview_id?.toString()
        } : null}
        title={
          formMode === 'create'
            ? t('Add Interview Feedback')
            : t('Edit Interview Feedback')
        }
        mode={formMode}
      />

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem ? `${currentItem.interview?.candidate?.first_name} ${currentItem.interview?.candidate?.last_name} - ${currentItem.interviewer?.name}` : ''}
        entityName="interview feedback"
      />
      {/* View Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View feedback={viewingItem} />}
      </Dialog>
    </PageTemplate>
  );
}
