import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/custom-toast';
import { hasPermission } from '@/utils/authorization';
import {
  ArrowLeft, Edit, Calendar, MapPin, Building, DollarSign, Clock, Star,
  Briefcase, Users, FileText, CheckCircle2, Copy, ExternalLink,
  HelpCircle, ShieldCheck, UserCheck, Eye, Sparkles, Tag, Info
} from 'lucide-react';

export default function ShowJobPosting() {
  const { t } = useTranslation();
  const { auth, jobPosting, customQuestions } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const [copied, setCopied] = useState(false);

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Recruitment') },
    { title: t('Job Postings'), href: route('hr.recruitment.job-postings.index') },
    { title: jobPosting.title }
  ];

  // Window appSettings formatting helpers
  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return window.appSettings?.formatDateTimeSimple(date, false) || new Date(date).toLocaleDateString();
  };

  const formatDateTime = (date: string | null | undefined) => {
    if (!date) return '-';
    return window.appSettings?.formatDateTimeSimple(date, true) || new Date(date).toLocaleString();
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    if (amount === null || amount === undefined || amount === '') return '-';
    return window.appSettings?.formatCurrency(amount) || `$${amount}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 ring-yellow-600/20 dark:ring-yellow-500/30';
      case 'Published':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 ring-emerald-600/20 dark:ring-emerald-500/30';
      case 'Closed':
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 ring-rose-600/20 dark:ring-rose-500/30';
      default:
        return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 ring-gray-600/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 ring-rose-600/20';
      case 'Medium':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ring-amber-600/20';
      case 'Low':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 ring-blue-600/20';
      default:
        return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 ring-gray-600/20';
    }
  };

  const getDeadlineBadge = (deadline: string) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
    if (days < 0) {
      return <Badge variant="outline" className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800">{t('Expired')}</Badge>;
    }
    if (days === 0) {
      return <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">{t('Ends Today')}</Badge>;
    }
    if (days <= 7) {
      return <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">{days} {t('days left')}</Badge>;
    }
    return <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">{days} {t('days left')}</Badge>;
  };

  const copyApplicationUrl = () => {
    if (jobPosting.application_url) {
      navigator.clipboard.writeText(jobPosting.application_url).then(() => {
        setCopied(true);
        toast.success(t('Application URL copied to clipboard!'));
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const openApplicationPage = () => {
    if (jobPosting.application_url) {
      window.open(jobPosting.application_url, '_blank');
    }
  };

  const actions = [
    {
      label: t('Back'),
      icon: <ArrowLeft className="h-4 w-4 mr-2" />,
      variant: 'outline' as const,
      onClick: () => router.get(route('hr.recruitment.job-postings.index'))
    }
  ];

  if (hasPermission(permissions, 'edit-job-postings1')) {
    actions.push({
      label: t('Edit'),
      icon: <Edit className="h-4 w-4 mr-2" />,
      variant: 'default' as const,
      onClick: () => router.get(route('hr.recruitment.job-postings.edit', jobPosting.id))
    });
  }

  return (
    <PageTemplate
      title={jobPosting.title}
      description={t("View full details, applicants, and activity for this job posting.")}
      breadcrumbs={breadcrumbs}
      actions={actions}
    >
      <style>{`
            main {
            max-width: 100vw;
            overflow-x: clip !important;
            }
            body {
            overflow-x: clip !important;
            }
        `}</style>
      <div className="space-y-6">

        {/* Clean Essential Header Card */}
        <Card className="overflow-hidden border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  {jobPosting.title}
                </h1>

                {/* Essential Quick Meta Row */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-600 dark:text-gray-400 pt-1">
                  {jobPosting.job_type?.name && (
                    <span className="flex items-center gap-1.5 font-medium">
                      <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" />
                      {jobPosting.job_type.name}
                    </span>
                  )}
                  {jobPosting.location?.name && (
                    <span className="flex items-center gap-1.5 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                      {jobPosting.location.name}
                    </span>
                  )}
                  {(jobPosting.branch?.name || jobPosting.department?.name) && (
                    <span className="flex items-center gap-1.5 font-medium">
                      <Building className="h-3.5 w-3.5 text-primary shrink-0" />
                      {[jobPosting.branch?.name, jobPosting.department?.name].filter(Boolean).join(' • ')}
                    </span>
                  )}
                  {jobPosting.positions && (
                    <span className="flex items-center gap-1.5 font-medium">
                      <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                      {jobPosting.positions} {t('positions')}
                    </span>
                  )}
                  {jobPosting.application_deadline && (
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                      {formatDate(jobPosting.application_deadline)}
                      {getDeadlineBadge(jobPosting.application_deadline)}
                    </span>
                  )}
                </div>
              </div>

              {jobPosting.application_url && (
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0">
                  <Button variant="outline" size="sm" onClick={copyApplicationUrl} className="gap-2 text-xs">
                    {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-500" />}
                    {copied ? t('Copied!') : t('Copy Link')}
                  </Button>
                  <Button variant="default" size="sm" onClick={openApplicationPage} className="gap-2 text-xs">
                    <ExternalLink className="h-4 w-4" />
                    {t('View Page')}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2-Column Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Left / Main Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Experience & Salary Overview */}
            <Card className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
              <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  {t('Experience & Compensation')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('Required Experience')}</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                        {jobPosting.min_experience} - {jobPosting.max_experience || '+'} {t('years')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('Salary Range')}</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-0.5 font-mono">
                        {jobPosting.min_salary && jobPosting.max_salary
                          ? `${formatCurrency(jobPosting.min_salary)} - ${formatCurrency(jobPosting.max_salary)}`
                          : jobPosting.min_salary
                            ? `${formatCurrency(jobPosting.min_salary)}+`
                            : '-'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Job Description */}
            {jobPosting.description && (
              <Card className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
                <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {t('Job Description')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 max-h-[150px] overflow-x-auto">
                  <div
                    className="prose dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-ul:text-gray-700 dark:prose-ul:text-gray-300 prose-ol:text-gray-700 dark:prose-ol:text-gray-300 prose-li:my-1 prose-a:text-primary hover:prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-primary/40 prose-blockquote:pl-4 prose-blockquote:italic prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm"
                    dangerouslySetInnerHTML={{ __html: jobPosting.description }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Requirements */}
            {jobPosting.requirements && (
              <Card className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
                <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {t('Requirements')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 max-h-[150px] overflow-x-auto">
                  <div
                    className="prose dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-ul:text-gray-700 dark:prose-ul:text-gray-300 prose-ol:text-gray-700 dark:prose-ol:text-gray-300 prose-li:my-1 prose-a:text-primary hover:prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-primary/40 prose-blockquote:pl-4 prose-blockquote:italic prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm"
                    dangerouslySetInnerHTML={{ __html: jobPosting.requirements }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Benefits */}
            {jobPosting.benefits && (
              <Card className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
                <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {t('Benefits')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 max-h-[150px] overflow-x-auto">
                  <div
                    className="prose dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-ul:text-gray-700 dark:prose-ul:text-gray-300 prose-ol:text-gray-700 dark:prose-ol:text-gray-300 prose-li:my-1 prose-a:text-primary hover:prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-primary/40 prose-blockquote:pl-4 prose-blockquote:italic prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm"
                    dangerouslySetInnerHTML={{ __html: jobPosting.benefits }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Required Skills */}
            {jobPosting.skills && jobPosting.skills.length > 0 && (
              <Card className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
                <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    {t('Required Skills')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 max-h-[150px] overflow-x-auto">
                  <div className="flex flex-wrap gap-2">
                    {jobPosting.skills.map((skill: string, index: number) => (
                      <span key={index} className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset bg-primary/10 text-primary ring-primary">
                        {skill}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

          {/* Right Sidebar Column - STICKY */}
          <div className="space-y-6 lg:sticky lg:top-6">

            {/* Status & Attributes Card in Sticky Sidebar */}
            <Card className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
              <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  {t('Posting Status & Attributes')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">{t('Job Code')}</span>
                  <span className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset bg-gray-50 text-gray-700 ring-gray-600/20 font-mono">
                    {jobPosting.job_code}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">{t('Status')}</span>
                  <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${getStatusColor(jobPosting.status)}`}>
                    {t(jobPosting.status)}
                  </span>
                </div>

                {jobPosting.priority && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{t('Priority')}</span>
                    <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${getPriorityColor(jobPosting.priority)}`}>
                      {t(jobPosting.priority)}
                    </span>
                  </div>
                )}

                {jobPosting.is_featured && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{t('Featured Job')}</span>
                    <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      {t('Featured')}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Job Requisition Card */}
            {jobPosting.requisition && (
              <Card className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
                <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {t('Job Requisition')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('Requisition Code')}</p>
                    <p className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100 bg-muted px-2.5 py-1 rounded-md mt-1 inline-block">
                      {jobPosting.requisition.requisition_code}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('Title')}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">{jobPosting.requisition.title}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Custom Questions */}
            {jobPosting.custom_question && jobPosting.custom_question.length > 0 && (
              <Card className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
                <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    {t('Custom Questions')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 max-h-[250px] overflow-x-auto space-y-3">
                  {jobPosting.custom_question.map((questionId: number, index: number) => {
                    const question = customQuestions?.find((q: any) => q.id === questionId);
                    return (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 leading-relaxed flex-1">
                            {question?.question || `Question ID: ${questionId}`}
                          </p>
                          {question?.required === 1 && (
                            <span className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset bg-red-500/10 text-red-600 ring-red-600/20">Required</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Applicant Requirements ("Need to Ask?") */}
            {jobPosting.applicant && jobPosting.applicant.length > 0 && (
              <Card className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
                <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    {t('Need to Ask?')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-2">
                    {jobPosting.applicant.map((item: string, index: number) => (
                      <span key={index} className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset bg-gray-50 text-gray-700 ring-gray-600/20">
                        {item === 'gender' && t('Gender')}
                        {item === 'date_of_birth' && t('Date Of Birth')}
                        {item === 'address' && t('Address')}
                        {item !== 'gender' && item !== 'date_of_birth' && item !== 'address' && item}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Visibility Options ("Need to Show Option?") */}
            {jobPosting.visibility && jobPosting.visibility.length > 0 && (
              <Card className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
                <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    {t('Need to Show Option?')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-2">
                    {jobPosting.visibility.map((item: string, index: number) => (
                      <span key={index} className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset bg-gray-50 text-gray-700 ring-gray-600/20">
                        {item === 'profile_image' && t('Profile Image')}
                        {item === 'resume' && t('Resume')}
                        {item === 'cover_letter' && t('Cover Letter')}
                        {item === 'terms_and_conditions' && t('Terms And Conditions')}
                        {item !== 'profile_image' && item !== 'resume' && item !== 'cover_letter' && item !== 'terms_and_conditions' && item}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Important Dates Card */}
            <Card className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
              <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  {t('Important Dates')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">{t('Start Date')}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {jobPosting.start_date ? formatDate(jobPosting.start_date) : t('Not specified')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">{t('Application Deadline')}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {jobPosting.application_deadline ? formatDate(jobPosting.application_deadline) : t('Not specified')}
                  </span>
                </div>

                {jobPosting.publish_date && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{t('Published Date')}</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatDate(jobPosting.publish_date)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Audit Log / Metadata Card */}
            <Card className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
              <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {t('Audit Log')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{t('Created At')}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatDateTime(jobPosting.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{t('Updated At')}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatDateTime(jobPosting.updated_at)}
                  </span>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>
      </div>
    </PageTemplate>
  );
}
