import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, User, Briefcase, MapPin, Clock, Phone, Mail, Building, ExternalLink, Award, FileText, Star, Calendar, Download, CheckCircle, XCircle, Globe, Banknote } from 'lucide-react';
import { getImagePath } from '@/utils/helpers';
import { useBrand } from '@/contexts/BrandContext';
import { THEME_COLORS } from '@/hooks/use-appearance';
import { useInitials } from '@/hooks/use-initials';

export default function CandidateShow() {
  const { t } = useTranslation();
  const { candidate } = usePage().props as any;
  const { themeColor, customColor } = useBrand();

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Recruitment') },
    { title: t('Candidates'), href: route('hr.recruitment.candidates.index') },
    { title: t('Candidate Details') }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'Screening': return 'bg-yellow-50 text-yellow-800 ring-yellow-600/20';
      case 'Interview': return 'bg-purple-50 text-purple-700 ring-purple-600/20';
      case 'Offer': return 'bg-orange-50 text-orange-700 ring-orange-600/20';
      case 'Hired': return 'bg-green-50 text-green-700 ring-green-600/20';
      case 'Rejected': return 'bg-red-50 text-red-700 ring-red-600/10';
      default: return 'bg-gray-50 text-gray-600 ring-gray-500/10';
    }
  };

  const SectionHeading = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-slate-400">{icon}</span>
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</h3>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
    </div>
  );

  const Field = ({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) =>
    value ? (
      <div>
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{label}</p>
        <p className={`text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5 break-words${mono ? ' font-mono' : ''}`}>{value}</p>
      </div>
    ) : null;

  const getInitials = useInitials();

  return (
    <PageTemplate
      title={`${candidate.first_name} ${candidate.last_name}`}
      description={t('Candidate profile')}
      breadcrumbs={breadcrumbs}
      actions={[{
        label: t('Back'),
        icon: <ArrowLeft className="h-4 w-4 mr-2" />,
        variant: 'outline',
        onClick: () => router.get(route('hr.recruitment.candidates.index'))
      }]}
    >
      <div className="max-w-5xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">

        {/* ── HEADER ── */}
        <div className="relative px-5 py-6 sm:px-8 sm:py-8 border-b">

          {/* stamp — absolute top-right */}
          {candidate.status === 'Hired' ? (
            <div className="absolute top-4 right-4 w-28 h-28 rotate-[-12deg] select-none opacity-90">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                <circle cx="50" cy="50" r="45" stroke="#16a34a" strokeWidth="2.5" strokeDasharray="4 2" />
                <circle cx="50" cy="50" r="50" stroke="#16a34a" strokeWidth="1.5" />
                <text x="50" y="47" textAnchor="middle" fontSize="14" fontWeight="900" fill="#16a34a" letterSpacing="1">HIRED</text>
                <text x="50" y="61" textAnchor="middle" fontSize="9" fontWeight="600" fill="#16a34a" letterSpacing="2">VERIFIED</text>
                <text x="50" y="33" textAnchor="middle" fontSize="13" fill="#16a34a">✓</text>
              </svg>
            </div>
          ) : candidate.status === 'Rejected' ? (
            <div className="absolute top-4 right-4 w-28 h-28 rotate-[-12deg] select-none opacity-90">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                <circle cx="50" cy="50" r="45" stroke="#dc2626" strokeWidth="2.5" strokeDasharray="4 2" />
                <circle cx="50" cy="50" r="50" stroke="#dc2626" strokeWidth="1.5" />
                <text x="50" y="47" textAnchor="middle" fontSize="12" fontWeight="900" fill="#dc2626" letterSpacing="1">REJECTED</text>
                <text x="50" y="61" textAnchor="middle" fontSize="9" fontWeight="600" fill="#dc2626" letterSpacing="2">DECLINED</text>
                <text x="50" y="33" textAnchor="middle" fontSize="13" fill="#dc2626">✕</text>
              </svg>
            </div>
          ) : null}

          {/* Row 1: avatar + name + status */}
          <div className="flex items-start gap-4">
            <div className="shrink-0 h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden ring-2 ring-white/20 bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white font-medium">
              <div className="h-full w-full flex items-center justify-center text-3xl">
                {getInitials(`${candidate.first_name} ${candidate.last_name}`)}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {candidate.first_name} {candidate.last_name}
                </h1>
                {candidate.status !== 'Hired' && candidate.status !== 'Rejected' && (
                  <span className={`shrink-0 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(candidate.status)}`}>
                    {t(candidate.status)}
                  </span>
                )}
              </div>

              {(candidate.current_position || candidate.current_company) && (
                <p className="text-sm mt-1 truncate text-gray-600 dark:text-gray-400">
                  {[candidate.current_position, candidate.current_company].filter(Boolean).join(' · ')}
                </p>
              )}

              {candidate.rating && (
                <div className="flex gap-0.5 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < candidate.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600'}`} />
                  ))}
                </div>
              )}

              <div className="flex gap-1.5 flex-wrap mt-2">
                {candidate.is_archive && (
                  <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">{t('Archived')}</span>
                )}
                {candidate.is_employee && (
                  <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">{t('Employee')}</span>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: contact chips */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
            <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-xs min-w-0">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate max-w-[180px] sm:max-w-none">{candidate.email}</span>
            </span>
            {candidate.phone && (
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-xs">
                <Phone className="h-3.5 w-3.5 shrink-0" />{candidate.phone}
              </span>
            )}
            {(candidate.city || candidate.country) && (
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-xs">
                <MapPin className="h-3.5 w-3.5 shrink-0" />{[candidate.city, candidate.country].filter(Boolean).join(', ')}
              </span>
            )}
            {candidate.linkedin_url && (
              <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:underline text-primary">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />LinkedIn
              </a>
            )}
            {candidate.portfolio_url && (
              <a href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:underline text-primary">
                <Globe className="h-3.5 w-3.5 shrink-0" />{t('Portfolio')}
              </a>
            )}
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex flex-col lg:flex-row">

          {/* ── SIDEBAR ── */}
          <aside className="w-full lg:w-60 xl:w-68 shrink-0 bg-gray-50 dark:bg-gray-800/50 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 p-5 space-y-5">

            {/* Applied for */}
            <div>
              <SectionHeading icon={<Briefcase className="h-4 w-4" />} title={t('Applied For')} />
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 break-words">{candidate.job?.title || '-'}</p>
                {candidate.job?.job_code && <p className="text-xs text-gray-400 mt-0.5">{candidate.job.job_code}</p>}
                <div className="mt-2 space-y-1.5">
                  {candidate.job?.job_type?.name && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">{candidate.job.job_type.name}</span>
                    </div>
                  )}
                  {candidate.job?.location?.name && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">{candidate.job.location.name}</span>
                    </div>
                  )}
                  {candidate.department?.name && (
                    <div className="flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">{candidate.department.name}</span>
                    </div>
                  )}
                  {candidate.branch?.name && (
                    <div className="flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">{candidate.branch.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Salary */}
            {(candidate.current_salary || candidate.expected_salary || candidate.final_salary) && (
              <div>
                <SectionHeading icon={<Banknote className="h-4 w-4" />} title={t('Salary')} />
                <div className="space-y-2.5">
                  <Field label={t('Current')} value={candidate.current_salary ? window.appSettings?.formatCurrency(candidate.current_salary) : null} mono />
                  <Field label={t('Expected')} value={candidate.expected_salary ? window.appSettings?.formatCurrency(candidate.expected_salary) : null} mono />
                  <Field label={t('Final Offer')} value={candidate.final_salary ? window.appSettings?.formatCurrency(candidate.final_salary) : null} mono />
                </div>
              </div>
            )}

            {/* Application meta */}
            <div>
              <SectionHeading icon={<Calendar className="h-4 w-4" />} title={t('Application')} />
              <div className="space-y-2.5">
                <Field label={t('Applied')} value={window.appSettings?.formatDateTimeSimple(candidate.application_date, false) || new Date(candidate.application_date).toLocaleDateString()} />
                {candidate.source?.name && <Field label={t('Source')} value={candidate.source.name} />}
                {candidate.referral_employee?.name && <Field label={t('Referred by')} value={candidate.referral_employee.name} />}
                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{t('Terms & Conditions')}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {candidate.terms_condition_check === 'on'
                      ? <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-700/10 mr-1">{t('Accepted')}</span>
                      : <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-700/10 mr-1">{t('Not Accepted')}</span>
                    }
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* ── MAIN ── */}
          <main className="flex-1 p-5 sm:p-7 space-y-7 min-w-0">

            {/* Personal details */}
            <section>
              <SectionHeading icon={<User className="h-4 w-4" />} title={t('Personal Details')} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {candidate.gender && <Field label={t('Gender')} value={candidate.gender.charAt(0).toUpperCase() + candidate.gender.slice(1)} />}
                {candidate.date_of_birth && <Field label={t('Date of Birth')} value={window.appSettings?.formatDateTimeSimple(candidate.date_of_birth, false) || new Date(candidate.date_of_birth).toLocaleDateString()} />}
                {candidate.notice_period && <Field label={t('Notice Period')} value={candidate.notice_period} />}
                {candidate.experience_years !== null && candidate.experience_years !== undefined && (
                  <Field label={t('Experience')} value={`${candidate.experience_years} ${t('years')}`} />
                )}
              </div>
            </section>

            {/* Address */}
            {(candidate.address || candidate.city || candidate.state || candidate.country || candidate.zip_code) && (
              <section>
                <SectionHeading icon={<MapPin className="h-4 w-4" />} title={t('Address')} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label={t('Address')} value={candidate.address} />
                  <Field label={t('City')} value={candidate.city} />
                  <Field label={t('State')} value={candidate.state} />
                  <Field label={t('Country')} value={candidate.country} />
                  <Field label={t('Zip Code')} value={candidate.zip_code} />
                </div>
              </section>
            )}

            {/* Cover letter */}
            {candidate.coverletter_message && (
              <section>
                <SectionHeading icon={<Mail className="h-4 w-4" />} title={t('Cover Letter')} />
                <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{candidate.coverletter_message}</p>
                </div>
              </section>
            )}

            {/* Screening Q&A */}
            {candidate.custom_question && Object.keys(candidate.custom_question).length > 0 && (
              <section>
                <SectionHeading icon={<Award className="h-4 w-4" />} title={t('Screening Questions')} />
                <div className="space-y-4">
                  {Object.entries(candidate.custom_question).map(([question, answer], index) => (
                    <div key={index} className="pl-3 border-l-2 border-slate-200 dark:border-slate-700">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{question}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{answer as string}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Documents */}
            {(candidate.resume_path || candidate.cover_letter_path) && (
              <section>
                <SectionHeading icon={<FileText className="h-4 w-4" />} title={t('Documents')} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {candidate.resume_path && (
                    <a href={getImagePath(candidate.resume_path)} target="_blank" rel="noopener noreferrer" download
                      className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all group">
                      <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-xl shrink-0">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('Resume')}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{t('Click to download')}</p>
                      </div>
                      <Download className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0" />
                    </a>
                  )}
                  {candidate.cover_letter_path && (
                    <a href={getImagePath(candidate.cover_letter_path)} target="_blank" rel="noopener noreferrer" download
                      className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 hover:border-green-300 dark:hover:border-green-600 hover:shadow-sm transition-all group">
                      <div className="p-2.5 bg-green-100 dark:bg-green-900/40 rounded-xl shrink-0">
                        <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('Cover Letter')}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{t('Click to download')}</p>
                      </div>
                      <Download className="h-4 w-4 text-gray-400 group-hover:text-green-600 transition-colors shrink-0" />
                    </a>
                  )}
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </PageTemplate>
  );
}
