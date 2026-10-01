// pages/hr/training/assessments/show.tsx
import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { hasPermission } from '@/utils/authorization';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar, Edit, Trash } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';

export default function TrainingAssessmentShow() {
  const { t } = useTranslation();
  const { auth, trainingAssessment, statistics, globalSettings } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const handleBackToList = () => {
    router.get(route('hr.training-assessments.index'));
  };

  const handleEdit = () => {
    setIsFormModalOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    if (!globalSettings?.is_demo) toast.loading(t('Updating assessment...'));

    router.put(route('hr.training-assessments.update', trainingAssessment.id), formData, {
      onSuccess: (page) => {
        setIsFormModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        } else {
          toast.success(t('Assessment updated successfully'));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(`Failed to update assessment: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting assessment...'));

    router.delete(route('hr.training-assessments.destroy', trainingAssessment.id), {
      onSuccess: (page) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        } else {
          toast.success(t('Assessment deleted successfully'));
        }
        router.get(route('hr.training-assessments.index'));
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(`Failed to delete assessment: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  // Define page actions
  const pageActions = [];

  // Add the "Back to List" button
  pageActions.push({
    label: t('Back'),
    icon: <ArrowLeft className="h-4 w-4 mr-2" />,
    variant: 'outline' as const,
    onClick: handleBackToList
  });

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Training & Development') },
    { title: t('Training Assessments'), href: route('hr.training-assessments.index') },
    { title: trainingAssessment.name }
  ];

  // Assessment type badge classes
  const typeClasses = {
    'quiz':         'bg-blue-100 text-blue-800 border-blue-200',
    'practical':    'bg-green-100 text-green-800 border-green-200',
    'presentation': 'bg-purple-100 text-purple-800 border-purple-200'
  };

  // Prepare training program options for form
  const trainingProgramOptions = [
    { value: trainingAssessment.training_program.id.toString(), label: trainingAssessment.training_program.name }
  ];

  return (
    <PageTemplate
      title={t('Assessment Details')}
      description={t("View the questions, results, and details of this training assessment.")}
      url={`/hr/training/assessments/${trainingAssessment.id}`}
      actions={pageActions}
      breadcrumbs={breadcrumbs}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assessment Details */}
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{trainingAssessment.name}</CardTitle>
                  <CardDescription className="mt-2">
                    {trainingAssessment.training_program?.name || t('Unknown Program')}
                  </CardDescription>
                </div>
                <Badge className={`${typeClasses[trainingAssessment.type] || 'bg-gray-100 text-gray-800 border-gray-200'} capitalize`}>
                  {trainingAssessment.type.charAt(0).toUpperCase() + trainingAssessment.type.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400  tracking-wide">{t('Passing Score')}</h3>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">{trainingAssessment.passing_score}%</p>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400  tracking-wide">{t('Created By')}</h3>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">{trainingAssessment.creator?.name || '-'}</p>
                </div>
              </div>

              {trainingAssessment.description && (
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400  tracking-wide">{t('Description')}</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{trainingAssessment.description}</p>
                </div>
              )}

              {trainingAssessment.criteria && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400  tracking-wide">{t('Assessment Criteria')}</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{trainingAssessment.criteria}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assessment Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Assessment Results')}</CardTitle>
            </CardHeader>
            <CardContent>
              {trainingAssessment.employee_results && trainingAssessment.employee_results.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Employee')}</TableHead>
                      <TableHead>{t('Date')}</TableHead>
                      <TableHead>{t('Score')}</TableHead>
                      <TableHead>{t('Result')}</TableHead>
                      <TableHead>{t('Assessed By')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainingAssessment.employee_results.map((result: any) => (
                      <TableRow key={result.id}>
                        <TableCell>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{result.employee_training?.employee?.name || '-'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{result.employee_training?.employee?.employee?.employee_id || '-'}</div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-left gap-2 whitespace-nowrap overflow-hidden text-ellipsis text-gray-500">
                                {result.assessment_date && <Calendar className="h-4 w-4" />}
                                <span>{window.appSettings?.formatDateTimeSimple(result.assessment_date, false) || '-'}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                          {result.score}%
                        </TableCell>
                        <TableCell>
                          {result.is_passed ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200 capitalize">
                              {t('Passed')}
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 border-red-200 capitalize">
                              {t('Failed')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.assessor?.name || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
                  {t('No assessment results available')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Statistics */}
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Statistics')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Total Results')}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{statistics.totalResults}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Pass Rate')}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{statistics.passRate.toFixed(1)}%</span>
                  </div>
                  <Progress
                    value={statistics.passRate}
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Average Score')}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{statistics.averageScore.toFixed(1)}%</span>
                  </div>
                  <Progress
                    value={statistics.averageScore}
                    className="h-2"
                  />
                </div>

                <div className="pt-2 border-t">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Passed')}</span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">{statistics.passedResults}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Failed')}</span>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">{statistics.failedResults}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Form Modal */}
      <CrudFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        formConfig={{
          fields: [
            {
              name: 'training_program_id',
              label: t('Training Program'),
              type: 'select',
              required: true,
              options: trainingProgramOptions,
              disabled: true
            },
            {
              name: 'name',
              label: t('Assessment Name'),
              type: 'text',
              required: true
            },
            {
              name: 'description',
              label: t('Description'),
              type: 'textarea'
            },
            {
              name: 'type',
              label: t('Assessment Type'),
              type: 'select',
              required: true,
              options: [
                { value: 'quiz', label: t('Quiz') },
                { value: 'practical', label: t('Practical') },
                { value: 'presentation', label: t('Presentation') }
              ]
            },
            {
              name: 'passing_score',
              label: t('Passing Score (%)'),
              type: 'number',
              required: true,
              min: 0,
              max: 100
            },
            {
              name: 'criteria',
              label: t('Assessment Criteria'),
              type: 'textarea',
              helpText: t('Describe the criteria used to evaluate this assessment')
            }
          ],
          modalSize: 'lg'
        }}
        initialData={trainingAssessment}
        title={t('Edit Assessment')}
        mode="edit"
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={trainingAssessment.name}
        entityName="assessment"
      />
    </PageTemplate>
  );
}
