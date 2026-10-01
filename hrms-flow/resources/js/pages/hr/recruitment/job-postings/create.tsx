import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router, useForm } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { TagInput } from '@/components/ui/tag-input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

export default function CreateJobPosting() {
  const { t } = useTranslation();
  const { jobTypes, locations, branches, departments, customQuestions, companySlug, globalSettings } = usePage().props as any;

  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, setData, post, processing } = useForm({
    title: '',
    job_type_id: '',
    location_id: '',
    branch_id: '',
    department_id: '',
    priority: 'Low',
    skills: [],
    positions: 1,
    min_experience: 0,
    max_experience: '',
    min_salary: '',
    max_salary: '',
    description: '',
    requirements: '',
    education: '',
    benefits: '',
    start_date: '',
    application_deadline: '',
    application_type: 'existing',
    application_url: companySlug ? route('career.index', companySlug) : route('career.index'),
    code: '',
    custom_question: [],
    applicant: [],
    visibility: [],
    is_featured: false,
  });

  const handleChange = (name: string, value: any) => {
    setData(name as any, value);

    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!data.title) e.title = t('Job title is required');
      if (!data.job_type_id) e.job_type_id = t('Job type is required');
      if (!data.location_id) e.location_id = t('Location is required');
      if (!data.branch_id) e.branch_id = t('Branch is required');
      if (!data.department_id) e.department_id = t('Department is required');
      if (!data.priority) e.priority = t('Priority is required');
      if (!data.skills || data.skills.length === 0) e.skills = t('Required skills are required');
      if (!data.start_date) e.start_date = t('Start date is required');
      if (!data.application_deadline) e.application_deadline = t('Application deadline is required');
      if (!data.application_type) e.application_type = t('Application type is required');
      if (!data.application_url) e.application_url = t('Application URL is required');
      if (!data.positions || data.positions < 1) e.positions = t('Positions is required');
    }
    if (s === 1) {
      if (data.min_experience === '' || data.min_experience === null || data.min_experience === undefined) e.min_experience = t('Min experience is required');
      if (data.max_experience === '' || data.max_experience === null || data.max_experience === undefined) e.max_experience = t('Max experience is required');
      if (data.min_salary === '' || data.min_salary === null || data.min_salary === undefined) e.min_salary = t('Min salary is required');
      if (data.max_salary === '' || data.max_salary === null || data.max_salary === undefined) e.max_salary = t('Max salary is required');
    }
    if (s === 2) {
      if (!data.description) e.description = t('Job description is required');
      if (!data.requirements) e.requirements = t('Requirements are required');
      if (!data.benefits) e.benefits = t('Benefits are required');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const STEP_FIELDS: Record<number, string[]> = {
    0: ['title', 'job_type_id', 'location_id', 'branch_id', 'department_id', 'priority', 'skills', 'start_date', 'application_deadline', 'application_type', 'application_url', 'positions'],
    1: ['min_experience', 'max_experience', 'min_salary', 'max_salary'],
    2: ['description', 'requirements', 'benefits'],
  };

  const stepHasError = (i: number) => (STEP_FIELDS[i] || []).some(f => errors[f]);

  const STEPS = [
    { key: 'basic', label: t('Basic Information') },
    { key: 'experience', label: t('Experience & Salary') },
    { key: 'details', label: t('Job Details') },
  ];

  const handleStepClick = (targetStep: number) => {
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
    } else {
      if (validateStep(currentStep)) {
        setCurrentStep(targetStep);
      }
    }
  };

  const handleSubmit = () => {

    if (!validateStep(currentStep)) return;

    if (!globalSettings?.is_demo) toast.loading(t('Creating job posting...'));

    post(route('hr.recruitment.job-postings.store'), {
      onSuccess: (page) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(t(errors));
        } else {
          toast.error(t('Failed to create job posting'));
        }
      }
    });
  };

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Recruitment') },
    { title: t('Job Postings'), href: route('hr.recruitment.job-postings.index') },
    { title: t('Create') }
  ];

  return (
    <PageTemplate
      title={t('Create Job Posting')}
      description={t("Create a new job posting to attract candidates.")}
      breadcrumbs={breadcrumbs}
      actions={[
        {
          label: t('Back'),
          icon: <ArrowLeft className="h-4 w-4 mr-2" />,
          variant: 'outline',
          onClick: () => router.get(route('hr.recruitment.job-postings.index'))
        }
      ]}
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* Step Indicator / Tabs */}
        <div className="flex items-center w-full">
          {STEPS.map((s, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            const hasErr = stepHasError(i);
            return (
              <div key={s.key} className="flex items-center flex-1 last:flex-none cursor-pointer" onClick={() => handleStepClick(i)}>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${hasErr ? 'bg-red-50 border-red-500 text-red-600' :
                    done ? 'bg-primary border-primary text-white' :
                      active ? 'border-primary text-primary bg-white dark:bg-gray-900' :
                        'border-gray-300 dark:border-gray-600 text-gray-400 bg-white dark:bg-gray-900'
                    }`}>
                    {done && !hasErr ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`text-sm font-medium hidden sm:block ${hasErr ? 'text-red-600' :
                    active ? 'text-primary font-semibold' :
                      done ? 'text-gray-700 dark:text-gray-300' :
                        'text-gray-400 dark:text-gray-500'
                    }`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-3 transition-colors ${done && !hasErr ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 0: Basic Information */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Basic Information')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title" required>{t('Job Title')} </Label>
                  <Input
                    id="title"
                    value={data.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder={t('Enter job title')}
                    required
                    className={errors.title ? 'border-red-500' : ''}
                  />
                  {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
                </div>

                <div>
                  <Label htmlFor="job_type_id" required>{t('Job Type')}</Label>
                  <Select value={data.job_type_id} onValueChange={(value) => handleChange('job_type_id', value)}>
                    <SelectTrigger className={errors.job_type_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder={t('Select Job Type')} />
                    </SelectTrigger>
                    <SelectContent searchable={true}>
                      {jobTypes?.map((type: any) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.job_type_id && <p className="text-sm text-red-500">{errors.job_type_id}</p>}
                </div>

                <div>
                  <Label htmlFor="location_id" required>{t('Location')} </Label>
                  <Select value={data.location_id} onValueChange={(value) => handleChange('location_id', value)}>
                    <SelectTrigger className={errors.location_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder={t('Select Location')} />
                    </SelectTrigger>
                    <SelectContent searchable={true}>
                      {locations?.map((loc: any) => (
                        <SelectItem key={loc.id} value={loc.id.toString()}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.location_id && <p className="text-sm text-red-500">{errors.location_id}</p>}
                </div>

                <div>
                  <Label htmlFor="branch_id" required>{t('Branch')}</Label>
                  <Select value={data.branch_id} onValueChange={(value) => {
                    handleChange('branch_id', value);
                    handleChange('department_id', '');
                  }}>
                    <SelectTrigger className={errors.branch_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder={t('Select Branch')} />
                    </SelectTrigger>
                    <SelectContent searchable={true}>
                      {branches?.map((branch: any) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.branch_id && <p className="text-sm text-red-500">{errors.branch_id}</p>}
                </div>

                <div>
                  <Label htmlFor="department_id" required>{t('Department')}</Label>
                  <Select
                    value={data.department_id}
                    onValueChange={(value) => handleChange('department_id', value)}
                    disabled={!data.branch_id}
                  >
                    <SelectTrigger className={errors.department_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder={t('Select Department')} />
                    </SelectTrigger>
                    <SelectContent searchable={true}>
                      {departments?.filter((dept: any) => String(dept.branch_id) === String(data.branch_id)).map((dept: any) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.department_id && <p className="text-sm text-red-500">{errors.department_id}</p>}
                </div>

                <div>
                  <Label htmlFor="priority" required>{t('Priority')}</Label>
                  <Select value={data.priority} onValueChange={(value) => handleChange('priority', value)}>
                    <SelectTrigger className={errors.priority ? 'border-red-500' : ''}>
                      <SelectValue placeholder={t('Select Priority')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">{t('Low')}</SelectItem>
                      <SelectItem value="Medium">{t('Medium')}</SelectItem>
                      <SelectItem value="High">{t('High')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.priority && <p className="text-sm text-red-500">{errors.priority}</p>}
                </div>

                <div>
                  <Label htmlFor="skills" required>{t('Required Skills')} </Label>
                  <TagInput
                    value={data.skills}
                    onChange={(skills) => handleChange('skills', skills)}
                    placeholder={t('Type Required Skills and press Enter')}
                  />
                  {errors.skills && <p className="text-sm text-red-500">{errors.skills}</p>}
                </div>

                <div>
                  <Label htmlFor="start_date" required>{t('Start Date')}</Label>
                  <div className="cursor-pointer" onClick={(e) => { const input = (e.currentTarget as HTMLElement).querySelector('input'); try { (input as any)?.showPicker?.(); } catch { input?.focus(); } }}>
                    <Input
                      id="start_date"
                      type="date"
                      value={data.start_date}
                      onChange={(e) => handleChange('start_date', e.target.value)}
                      className={`cursor-pointer ${errors.start_date ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.start_date && <p className="text-sm text-red-500">{errors.start_date}</p>}
                </div>

                <div>
                  <Label htmlFor="application_deadline" required>{t('Application Deadline')}</Label>
                  <div className="cursor-pointer" onClick={(e) => { const input = (e.currentTarget as HTMLElement).querySelector('input'); try { (input as any)?.showPicker?.(); } catch { input?.focus(); } }}>
                    <Input
                      id="application_deadline"
                      type="date"
                      value={data.application_deadline}
                      onChange={(e) => handleChange('application_deadline', e.target.value)}
                      className={`cursor-pointer ${errors.application_deadline ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.application_deadline && <p className="text-sm text-red-500">{errors.application_deadline}</p>}
                </div>

                <div>
                  <Label htmlFor="application_type" required>{t('Job Application')}</Label>
                  <Select value={data.application_type} onValueChange={(value) => {
                    handleChange('application_type', value);
                    if (value === 'existing') {
                      handleChange('application_url', companySlug ? route('career.index', companySlug) : route('career.index'));
                    } else {
                      handleChange('application_url', '');
                    }
                  }}>
                    <SelectTrigger className={errors.application_type ? 'border-red-500' : ''}>
                      <SelectValue placeholder={t('Select Application Type')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="existing">{t('Existing Link')}</SelectItem>
                      <SelectItem value="custom">{t('Custom Link')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.application_type && <p className="text-sm text-red-500">{errors.application_type}</p>}
                </div>

                <div>
                  <Label htmlFor="application_url" required>{t('Application URL')}</Label>
                  <Input
                    id="application_url"
                    value={data.application_url}
                    onChange={(e) => handleChange('application_url', e.target.value)}
                    placeholder={t('Enter application URL')}
                    disabled={data.application_type === 'existing'}
                    className={errors.application_url ? 'border-red-500' : ''}
                  />
                  {errors.application_url && <p className="text-sm text-red-500">{errors.application_url}</p>}
                </div>

                <div>
                  <Label htmlFor="positions" required>{t('Number of Positions')} </Label>
                  <Input
                    id="positions"
                    type="number"
                    min="1"
                    value={data.positions}
                    onChange={(e) => handleChange('positions', parseInt(e.target.value) || 1)}
                    placeholder={t('Enter number of positions')}
                    className={errors.positions ? 'border-red-500' : ''}
                  />
                  {errors.positions && <p className="text-sm text-red-500">{errors.positions}</p>}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_featured"
                  checked={data.is_featured}
                  onCheckedChange={(checked) => handleChange('is_featured', checked as boolean)}
                />
                <Label htmlFor="is_featured">{t('Featured Job')}</Label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Experience & Salary */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Experience & Salary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_experience" required>{t('Min Experience (Years)')} </Label>
                  <Input
                    id="min_experience"
                    type="number"
                    min="0"
                    step="0.1"
                    value={data.min_experience}
                    onChange={(e) => handleChange('min_experience', parseFloat(e.target.value) || 0)}
                    placeholder={t('e.g. 1')}
                    required
                    className={errors.min_experience ? 'border-red-500' : ''}
                  />
                  {errors.min_experience && <p className="text-sm text-red-500">{errors.min_experience}</p>}
                </div>

                <div>
                  <Label htmlFor="max_experience" required>{t('Max Experience (Years)')}</Label>
                  <Input
                    id="max_experience"
                    type="number"
                    min="0"
                    step="0.1"
                    value={data.max_experience}
                    onChange={(e) => handleChange('max_experience', e.target.value)}
                    placeholder={t('e.g. 5')}
                    required
                    className={errors.max_experience ? 'border-red-500' : ''}
                  />
                  {errors.max_experience && <p className="text-sm text-red-500">{errors.max_experience}</p>}
                </div>

                <div>
                  <Label htmlFor="min_salary" required> {t('Min Salary')}</Label>
                  <Input
                    id="min_salary"
                    type="number"
                    min="0"
                    step="0.01"
                    value={data.min_salary}
                    onChange={(e) => handleChange('min_salary', e.target.value)}
                    placeholder={t('e.g. 3000.00')}
                    required
                    className={errors.min_salary ? 'border-red-500' : ''}
                  />
                  {errors.min_salary && <p className="text-sm text-red-500">{errors.min_salary}</p>}
                </div>

                <div>
                  <Label htmlFor="max_salary" required>{t('Max Salary')}</Label>
                  <Input
                    id="max_salary"
                    type="number"
                    min="0"
                    step="0.01"
                    value={data.max_salary}
                    onChange={(e) => handleChange('max_salary', e.target.value)}
                    placeholder={t('e.g. 6000.00')}
                    required
                    className={errors.max_salary ? 'border-red-500' : ''}
                  />
                  {errors.max_salary && <p className="text-sm text-red-500">{errors.max_salary}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Job Details */}
        {currentStep === 2 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Job Details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="description" required>{t('Job Description')}</Label>
                  <RichTextEditor
                    content={data.description}
                    onChange={(content) => handleChange('description', content)}
                    placeholder={t('Enter job description...')}
                    className="[&_.ProseMirror]:min-h-[150px]"
                  />
                  {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                </div>

                <div>
                  <Label htmlFor="requirements" required>{t('Requirements')}</Label>
                  <RichTextEditor
                    content={data.requirements}
                    onChange={(content) => handleChange('requirements', content)}
                    placeholder={t('Enter job requirements...')}
                    className="[&_.ProseMirror]:min-h-[150px]"
                  />
                  {errors.requirements && <p className="text-sm text-red-500">{errors.requirements}</p>}
                </div>

                <div>
                  <Label htmlFor="benefits" required>{t('Benefits')}</Label>
                  <RichTextEditor
                    content={data.benefits}
                    onChange={(content) => handleChange('benefits', content)}
                    placeholder={t('Enter job benefits...')}
                    className="[&_.ProseMirror]:min-h-[120px]"
                  />
                  {errors.benefits && <p className="text-sm text-red-500">{errors.benefits}</p>}
                </div>
              </CardContent>
            </Card>

            {customQuestions && customQuestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Custom Questions')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {customQuestions.map((question: any) => (
                    <div key={question.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`question_${question.id}`}
                        checked={data.custom_question.includes(question.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleChange('custom_question', [...data.custom_question, question.id]);
                          } else {
                            handleChange('custom_question', data.custom_question.filter((id: any) => id !== question.id));
                          }
                        }}
                      />
                      <Label htmlFor={`question_${question.id}`} className="flex-1">
                        {question.question}
                        {question.required === 1 && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Need to Ask?')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'gender', label: t('Gender') },
                    { key: 'date_of_birth', label: t('Date Of Birth') },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`applicant_${item.key}`}
                        checked={data.applicant.includes(item.key)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleChange('applicant', [...data.applicant, item.key]);
                          } else {
                            handleChange('applicant', data.applicant.filter((key: any) => key !== item.key));
                          }
                        }}
                      />
                      <Label htmlFor={`applicant_${item.key}`}>{item.label}</Label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Need to Show Option?')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'cover_letter', label: t('Cover Letter') },
                    { key: 'terms_and_conditions', label: t('Terms And Conditions') }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`visibility_${item.key}`}
                        checked={data.visibility.includes(item.key)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleChange('visibility', [...data.visibility, item.key]);
                          } else {
                            handleChange('visibility', data.visibility.filter((key: any) => key !== item.key));
                          }
                        }}
                      />
                      <Label htmlFor={`visibility_${item.key}`}>{item.label}</Label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Step Navigation Buttons */}
        <div className="flex justify-between">
          {currentStep !== 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(s => s - 1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('Back')}
            </Button>
          ) : <div></div>}

          {currentStep < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={() => {
                if (validateStep(currentStep)) setCurrentStep(s => s + 1);
              }}
            >
              {t('Next')}<ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={processing}>
              {processing ? t('Creating...') : t('Create Job Posting')}
            </Button>
          )}
        </div>
      </form>
    </PageTemplate>
  );
}
