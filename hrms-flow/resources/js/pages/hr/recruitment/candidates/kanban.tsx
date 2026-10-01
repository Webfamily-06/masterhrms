import React, { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { hasPermission } from '@/utils/authorization';
import { KanbanBoard } from '@/components/ui/kanban-board';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropResult } from '@hello-pangea/dnd';
import { toast } from '@/components/custom-toast';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import {
  List,
  Briefcase,
  Calendar,
  Building2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import UserInitials from '@/components/user-initials';

interface CandidateItem {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status: string;
  experience_years: number;
  expected_salary?: number;
  current_company?: string;
  current_position?: string;
  application_date: string;
  is_employee?: boolean;
  job?: {
    id: number;
    title: string;
    job_code: string;
  };
  source?: {
    id: number;
    name: string;
  };
}

export default function CandidatesKanban() {
  const { t } = useTranslation();
  const { auth, candidates = [], jobPostings = [], sources = [], filters = {} } = usePage().props as any;

  const permissions = auth?.permissions || [];
  const canEdit = hasPermission(permissions, 'edit-candidates');

  const [items, setItems] = useState<CandidateItem[]>(candidates);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [jobFilter, setJobFilter] = useState(filters.job_id || '_empty_');
  const [sourceFilter, setSourceFilter] = useState(filters.source_id || '_empty_');

  useEffect(() => {
    setItems(candidates);
  }, [candidates]);

  const stages = [
    {
      id: 'New',
      title: t('New'),
      dotColor: 'bg-blue-500',
      badgeBg: 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200/80 shadow-2xs',
      colBg: 'bg-blue-50/40 dark:bg-blue-950/10 border-blue-200 dark:border-blue-800/60'
    },
    {
      id: 'Screening',
      title: t('Screening'),
      dotColor: 'bg-amber-500',
      badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200/80 shadow-2xs',
      colBg: 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800/60'
    },
    {
      id: 'Interview',
      title: t('Interview'),
      dotColor: 'bg-purple-500',
      badgeBg: 'bg-purple-50 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200/80 shadow-2xs',
      colBg: 'bg-purple-50/40 dark:bg-purple-950/10 border-purple-200 dark:border-purple-800/60'
    },
    {
      id: 'Offer',
      title: t('Offer'),
      dotColor: 'bg-orange-500',
      badgeBg: 'bg-orange-50 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 border border-orange-200/80 shadow-2xs',
      colBg: 'bg-orange-50/40 dark:bg-orange-950/10 border-orange-200 dark:border-orange-800/60'
    },
    {
      id: 'Hired',
      title: t('Hired'),
      dotColor: 'bg-emerald-500',
      badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200/80 shadow-2xs',
      colBg: 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/60'
    },
    {
      id: 'Rejected',
      title: t('Rejected'),
      dotColor: 'bg-rose-500',
      badgeBg: 'bg-rose-50 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-200/80 shadow-2xs',
      colBg: 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-200 dark:border-rose-800/60'
    }
  ];

  const jobOptions = [
    { value: '_empty_', label: t('All Jobs') },
    ...(jobPostings || []).map((job: any) => ({
      value: job.id.toString(),
      label: `${job.job_code} - ${job.title}`
    }))
  ];

  const sourceOptions = [
    { value: '_empty_', label: t('All Sources') },
    ...(sources || []).map((src: any) => ({
      value: src.id.toString(),
      label: src.name
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

    const newStatus = destination.droppableId;
    const candidateId = Number(draggableId);

    // Optimistic UI update
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === candidateId ? { ...item, status: newStatus } : item
      )
    );

    router.put(
      route('hr.recruitment.candidates.update-status', candidateId),
      { status: newStatus },
      {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
          toast.success(t('Candidate status updated successfully'));
        },
        onError: () => {
          // Revert optimistic update
          setItems(candidates);
          toast.error(t('Failed to update candidate status'));
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
      route('hr.recruitment.candidates.kanban'),
      {
        search: searchTerm || undefined,
        job_id: jobFilter !== '_empty_' ? jobFilter : undefined,
        source_id: sourceFilter !== '_empty_' ? sourceFilter : undefined
      },
      { preserveState: true, preserveScroll: true }
    );
  };

  const renderCard = (candidate: CandidateItem, index: number, snapshot: { isDragging: boolean }) => {
    const formattedDate = candidate.application_date
      ? format(parseISO(candidate.application_date), 'MMM dd, yyyy')
      : '';

    return (
      <Card
        className={`p-3 space-y-2.5 border bg-white dark:bg-gray-900 shadow-md ${
          snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/40 rotate-1' : ''
        }`}
      >
        {/* Top Header: Candidate Name & Avatar */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserInitials name={`${candidate.first_name} ${candidate.last_name}`} className="h-8 w-8 text-xs shrink-0" />
            <div className="min-w-0">
              <h4
                className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate hover:text-primary cursor-pointer"
                onClick={() => router.get(route('hr.recruitment.candidates.show', candidate.id))}
              >
                {candidate.first_name} {candidate.last_name}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{candidate.email}</p>
            </div>
          </div>
        </div>

        {/* Position & Company Details */}
        {(candidate.current_position || candidate.current_company) && (
          <div className="space-y-0.5 text-xs text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-800/60 pt-2">
            {candidate.current_position && (
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-gray-400 dark:text-gray-500 font-medium">{t('Position')}:</span>
                <span className="font-medium text-gray-700 dark:text-gray-200 truncate">{candidate.current_position}</span>
              </div>
            )}
            {candidate.current_company && (
              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="h-3 w-3 text-gray-400 shrink-0" />
                <span className="truncate">{candidate.current_company}</span>
              </div>
            )}
          </div>
        )}

        {/* Job Title & Source Badges using standardized application badge styling */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {candidate.job && (
            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20">
              <Briefcase className="h-3 w-3 mr-1 shrink-0" />
              <span className="">{candidate.job.title}</span>
            </span>
          )}
        </div>
        <div>
          {candidate.source && (
            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-purple-50 text-purple-700 ring-purple-600/20">
              <span className="">{candidate.source.name}</span>
            </span>
          )}
        </div>

        {/* Info Row: Experience & Salary */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-t pt-2 border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1">
            <span className="font-medium text-gray-700 dark:text-gray-300">{candidate.experience_years} {t('yrs exp')}</span>
          </div>
          {candidate.expected_salary && (
            <div className="font-mono font-medium text-gray-700 dark:text-gray-300">
              {window.appSettings?.formatCurrency(candidate.expected_salary)}
            </div>
          )}
        </div>

        {/* Footer Row: Application Date */}
        <div className="flex items-center justify-between pt-1 text-xs text-gray-400 dark:text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </Card>
    );
  };

  const pageActions = [
    {
      icon: <List className="h-4 w-4" />,
      variant: 'outline' as const,
      tooltip: t('List View'),
      onClick: () => router.get(route('hr.recruitment.candidates.index'))
    }
  ];

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Recruitment') },
    { title: t('Candidates'), href: route('hr.recruitment.candidates.index') },
    { title: t('Kanban') }
  ];

  return (
    <PageTemplate
      title={t('Candidates Kanban')}
      description={t('Visually manage candidate pipelines and drag across recruitment stages.')}
      url="/hr/recruitment/candidates/kanban"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
    >
      {/* Standard Search & Filter Bar */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearchSubmit}
          searchPlaceholder={t('Search...')}
          filters={[
            {
              name: 'job_id',
              label: t('Job'),
              type: 'select',
              value: jobFilter,
              onChange: (val) => {
                setJobFilter(val);
                router.get(
                  route('hr.recruitment.candidates.kanban'),
                  {
                    search: searchTerm || undefined,
                    job_id: val !== '_empty_' ? val : undefined,
                    source_id: sourceFilter !== '_empty_' ? sourceFilter : undefined
                  },
                  { preserveState: true, preserveScroll: true }
                );
              },
              options: jobOptions,
              searchable: true
            },
            {
              name: 'source_id',
              label: t('Source'),
              type: 'select',
              value: sourceFilter,
              onChange: (val) => {
                setSourceFilter(val);
                router.get(
                  route('hr.recruitment.candidates.kanban'),
                  {
                    search: searchTerm || undefined,
                    job_id: jobFilter !== '_empty_' ? jobFilter : undefined,
                    source_id: val !== '_empty_' ? val : undefined
                  },
                  { preserveState: true, preserveScroll: true }
                );
              },
              options: sourceOptions,
              searchable: true
            }
          ]}
          hasActiveFilters={() => jobFilter !== '_empty_' || sourceFilter !== '_empty_' || searchTerm !== ''}
          activeFilterCount={() => (jobFilter !== '_empty_' ? 1 : 0) + (sourceFilter !== '_empty_' ? 1 : 0) + (searchTerm !== '' ? 1 : 0)}
          onResetFilters={() => {
            setSearchTerm('');
            setJobFilter('_empty_');
            setSourceFilter('_empty_');
            router.get(route('hr.recruitment.candidates.kanban'));
          }}
        />
      </div>

      {/* Kanban Board */}
      <KanbanBoard<CandidateItem>
        stages={stages}
        items={items}
        getStatus={(candidate) => candidate.status}
        getId={(candidate) => candidate.id}
        onDragEnd={handleDragEnd}
        renderCard={renderCard}
        emptyPlaceholderText={t('No candidates in this stage')}
      />
    </PageTemplate>
  );
}
