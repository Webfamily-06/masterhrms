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
import { CrudFormModal } from '@/components/CrudFormModal';
import {
  List,
  Plus,
  Briefcase,
  Calendar,
  Building2,
  UserCheck
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import UserInitials from '@/components/user-initials';

interface OfferItem {
  id: number;
  candidate_id: number;
  position: string;
  salary: number;
  start_date: string;
  expiration_date: string;
  status: string;
  candidate?: {
    id: number;
    first_name: string;
    last_name: string;
    email?: string;
  };
  job?: {
    id: number;
    title: string;
    job_code: string;
  };
  department?: {
    id: number;
    name: string;
  };
  approver?: {
    id: number;
    name: string;
  };
}

export default function OffersKanban() {
  const { t } = useTranslation();
  const { auth, offers = [], candidates = [], departments = [], employees = [], currentUser = {}, filters = {}, globalSettings = {} } = usePage().props as any;

  const permissions = auth?.permissions || [];
  const canEdit = hasPermission(permissions, 'approve-offers') || hasPermission(permissions, 'edit-offers');
  const canCreate = hasPermission(permissions, 'create-offers');

  const [items, setItems] = useState<OfferItem[]>(offers);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [candidateFilter, setCandidateFilter] = useState(filters.candidate_id || '_empty_');

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  useEffect(() => {
    setItems(offers);
  }, [offers]);

  const stages = [
    {
      id: 'Draft',
      title: t('Draft'),
      dotColor: 'bg-slate-500',
      badgeBg: 'bg-slate-50 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300 border border-slate-200/80 shadow-2xs',
      colBg: 'bg-slate-50/40 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800/60'
    },
    {
      id: 'Sent',
      title: t('Sent'),
      dotColor: 'bg-blue-500',
      badgeBg: 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200/80 shadow-2xs',
      colBg: 'bg-blue-50/40 dark:bg-blue-950/10 border-blue-200 dark:border-blue-800/60'
    },
    {
      id: 'Negotiating',
      title: t('Negotiating'),
      dotColor: 'bg-amber-500',
      badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200/80 shadow-2xs',
      colBg: 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800/60'
    },
    {
      id: 'Accepted',
      title: t('Accepted'),
      dotColor: 'bg-emerald-500',
      badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200/80 shadow-2xs',
      colBg: 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/60'
    },
    {
      id: 'Declined',
      title: t('Declined'),
      dotColor: 'bg-rose-500',
      badgeBg: 'bg-rose-50 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-200/80 shadow-2xs',
      colBg: 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-200 dark:border-rose-800/60'
    },
    {
      id: 'Expired',
      title: t('Expired'),
      dotColor: 'bg-orange-500',
      badgeBg: 'bg-orange-50 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 border border-orange-200/80 shadow-2xs',
      colBg: 'bg-orange-50/40 dark:bg-orange-950/10 border-orange-200 dark:border-orange-800/60'
    }
  ];

  const candidateOptions = [
    { value: '_empty_', label: t('All Candidates') },
    ...(candidates || []).map((cand: any) => ({
      value: cand.id.toString(),
      label: `${cand.first_name} ${cand.last_name}`
    }))
  ];

  const candidateSelectOptions = [
    { value: '_empty_', label: t('Select Candidate') },
    ...(candidates || []).map((cand: any) => ({
      value: cand.id.toString(),
      label: `${cand.first_name} ${cand.last_name}`
    }))
  ];

  const employeeOptions = [
    { value: '_empty_', label: t('Select Approver') },
    ...(employees || []).map((emp: any) => ({
      value: emp.id.toString(),
      label: `${emp.name} - ${auth?.user?.name || 'Company'}`
    }))
  ];

  const handleAddNew = () => {
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    if (!globalSettings?.is_demo) toast.loading(t('Creating offer...'));

    router.post(route('hr.recruitment.offers.store'), formData, {
      onSuccess: (page) => {
        setIsFormModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        } else {
          toast.success(t('Offer created successfully'));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(`Failed to create offer: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (!canEdit) {
      toast.error(t('Permission Denied.'));
      return;
    }

    const newStatus = destination.droppableId;
    const offerId = Number(draggableId);

    // Optimistic UI update
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === offerId ? { ...item, status: newStatus } : item
      )
    );

    router.put(
      route('hr.recruitment.offers.update-status', offerId),
      { status: newStatus },
      {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
          toast.success(t('Offer status updated successfully'));
        },
        onError: () => {
          // Revert optimistic update
          setItems(offers);
          toast.error(t('Failed to update offer status'));
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
      route('hr.recruitment.offers.kanban'),
      {
        search: searchTerm || undefined,
        candidate_id: candidateFilter !== '_empty_' ? candidateFilter : undefined
      },
      { preserveState: true, preserveScroll: true }
    );
  };

  const renderCard = (offer: OfferItem, index: number, snapshot: { isDragging: boolean }) => {
    const formattedStartDate = offer.start_date
      ? format(parseISO(offer.start_date), 'MMM dd, yyyy')
      : '';
    const formattedExpDate = offer.expiration_date
      ? format(parseISO(offer.expiration_date), 'MMM dd, yyyy')
      : '';

    const candidateName = offer.candidate
      ? `${offer.candidate.first_name} ${offer.candidate.last_name}`
      : t('Unknown Candidate');

    return (
      <Card
        className={`p-3 space-y-2.5 border bg-white dark:bg-gray-900 shadow-md ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/40 rotate-1' : ''
          }`}
      >
        {/* Top Header: Candidate Name & Avatar */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserInitials name={candidateName} className="h-8 w-8 text-xs shrink-0" />
            <div className="min-w-0">
              <h4
                className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate hover:text-primary cursor-pointer"
                onClick={() => router.get(route('hr.recruitment.offers.show', offer.id))}
              >
                {candidateName}
              </h4>
              {offer.candidate?.email && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{offer.candidate.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Position & Department */}
        {(offer.position || offer.department) && (
          <div className="space-y-0.5 text-xs text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-800/60 pt-2">
            {offer.position && (
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-gray-400 dark:text-gray-500 font-medium">{t('Position')}:</span>
                <span className="font-medium text-gray-700 dark:text-gray-200 truncate">{offer.position}</span>
              </div>
            )}
            {offer.department && (
              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="h-3 w-3 text-gray-400 shrink-0" />
                <span className="truncate">{offer.department.name}</span>
              </div>
            )}
          </div>
        )}

        {/* Job Title & Approver Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {offer.job && (
            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20">
              <Briefcase className="h-3 w-3 mr-1 shrink-0" />
              <span>{offer.job.title}</span>
            </span>
          )}
          {offer.approver && (
            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-purple-50 text-purple-700 ring-purple-600/20">
              <UserCheck className="h-3 w-3 mr-1 shrink-0" />
              <span className="truncate max-w-[100px]">{offer.approver.name}</span>
            </span>
          )}
        </div>

        {/* Salary */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-t pt-2 border-gray-100 dark:border-gray-800">
          <span className="text-gray-500 font-medium">{t('Offered Salary')}</span>
          <div className="font-mono font-bold text-gray-800 dark:text-gray-100 text-sm">
            {window.appSettings?.formatCurrency(offer.salary)}
          </div>
        </div>

        {/* Footer Row: Dates */}
        <div className="flex items-center justify-between pt-1 text-xs text-gray-400 dark:text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{t('Start')}: {formattedStartDate}</span>
          </div>
          {formattedExpDate && (
            <div className="text-[11px]">
              {t('Exp')}: {formattedExpDate}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const pageActions: any[] = [];

  if (canCreate) {
    pageActions.push({
      label: t('Create Offer'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: handleAddNew
    });
  }

  pageActions.push({
    icon: <List className="h-4 w-4" />,
    variant: 'outline',
    tooltip: t('List View'),
    onClick: () => router.get(route('hr.recruitment.offers.index'))
  });

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Recruitment') },
    { title: t('Offers'), href: route('hr.recruitment.offers.index') },
    { title: t('Kanban') }
  ];

  return (
    <PageTemplate
      title={t('Offers Kanban')}
      description={t('Visually track and manage candidate job offer stages.')}
      url="/hr/recruitment/offers/kanban"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
    >
      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
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
              value: candidateFilter,
              onChange: (val) => {
                setCandidateFilter(val);
                router.get(
                  route('hr.recruitment.offers.kanban'),
                  {
                    search: searchTerm || undefined,
                    candidate_id: val !== '_empty_' ? val : undefined
                  },
                  { preserveState: true, preserveScroll: true }
                );
              },
              options: candidateOptions,
              searchable: true
            }
          ]}
          hasActiveFilters={() => candidateFilter !== '_empty_' || searchTerm !== ''}
          activeFilterCount={() => (candidateFilter !== '_empty_' ? 1 : 0) + (searchTerm !== '' ? 1 : 0)}
          onResetFilters={() => {
            setSearchTerm('');
            setCandidateFilter('_empty_');
            router.get(route('hr.recruitment.offers.kanban'));
          }}
        />
      </div>

      {/* Kanban Board */}
      <KanbanBoard<OfferItem>
        stages={stages}
        items={items}
        getStatus={(offer) => offer.status}
        getId={(offer) => offer.id}
        onDragEnd={handleDragEnd}
        renderCard={renderCard}
        emptyPlaceholderText={t('No offers in this stage')}
      />

      {/* Create Offer Modal */}
      <CrudFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        formConfig={{
          fields: [
            {
              name: 'candidate_id',
              type: 'dependent-dropdown',
              dependentConfig: [
                {
                  name: 'candidate_id',
                  label: t('Candidate'),
                  required: true,
                  placeholder: t('Select Candidate'),
                  searchable: true,
                  options: candidateSelectOptions.filter(opt => opt.value !== '_empty_')
                },
                {
                  name: 'position',
                  label: t('Position'),
                  required: true,
                  placeholder: t('Select Position'),
                  apiEndpoint: '/hr/recruitment/offers/candidate/{candidate_id}/job',
                  showCurrentValue: true,
                  searchable: true
                },
                {
                  name: 'department_id',
                  label: t('Department'),
                  required: false,
                  placeholder: t('Auto-filled from position'),
                  apiEndpoint: '/hr/recruitment/offers/job/{position}/departments',
                  searchable: false,
                  disabled: true,
                  selectFirstOption: true
                }
              ]
            },
            {
              name: 'salary',
              label: t('Salary'),
              type: 'number',
              required: true,
              min: 0,
              step: 0.01,
              placeholder: t('e.g. 5000.00')
            },
            {
              name: 'start_date',
              label: t('Start Date'),
              type: 'date',
              required: true,
              placeholder: t('Select Start Date')
            },
            {
              name: 'expiration_date',
              label: t('Expiration Date'),
              type: 'date',
              required: true,
              placeholder: t('Select Expiration Date')
            },
            {
              name: 'approved_by',
              label: t('Approved By'),
              type: 'select',
              required: true,
              placeholder: t('Select Approver'),
              options: employeeOptions.filter(opt => opt.value !== '_empty_'),
              defaultValue: currentUser?.id?.toString()
            },
            {
              name: 'benefits',
              label: t('Benefits'),
              type: 'textarea',
              placeholder: t('e.g. Health insurance, 20 days annual leave, remote work...')
            }
          ],
          modalSize: 'xl'
        }}
        initialData={{}}
        title={t('Create New Offer')}
        mode="create"
      />
    </PageTemplate>
  );
}
