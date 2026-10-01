// pages/hr/employee-salaries/payroll-calculation.tsx
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calculator, DollarSign, TrendingUp, TrendingDown, Clock, Users, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/custom-toast';

export default function PayrollCalculation() {
  const { t } = useTranslation();
  const { employeeSalary, payrollRuns, selectedPayrollRun, payrollData } = usePage().props as any;

  const [currentPayrollRun, setCurrentPayrollRun] = useState(selectedPayrollRun);
  const [salaryBreakdown, setSalaryBreakdown] = useState(payrollData?.salaryBreakdown || { earnings: {}, deductions: {} });
  const [attendanceSummary, setAttendanceSummary] = useState(payrollData?.attendanceSummary || {});
  const [payrollCalculation, setPayrollCalculation] = useState(payrollData?.payrollCalculation || {});
  const [attendanceRecords, setAttendanceRecords] = useState(payrollData?.attendanceRecords || []);
  const [currentMonth, setCurrentMonth] = useState(payrollData?.currentMonth || null);
  const [loading, setLoading] = useState(false);

  const handlePayrollChange = async (payrollRunId: string) => {
    if (payrollRunId === currentPayrollRun?.id?.toString()) return;
    setLoading(true);
    try {
      const response = await fetch(route('hr.employee-salaries.get-payroll-calculation', {
        employeeSalary: employeeSalary.id,
        payrollRun: payrollRunId,
      }));
      if (response.ok) {
        const data = await response.json();
        setCurrentPayrollRun(payrollRuns.find((r: any) => r.id.toString() === payrollRunId));
        setSalaryBreakdown(data.salaryBreakdown || { earnings: {}, deductions: {} });
        setAttendanceSummary(data.attendanceSummary || {});
        setPayrollCalculation(data.payrollCalculation || {});
        setAttendanceRecords(data.attendanceRecords || []);
        setCurrentMonth(data.currentMonth);
      } else {
        toast.error(t('Failed to load payroll data'));
      }
    } catch {
      toast.error(t('Failed to load payroll data'));
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Payroll Management') },
    { title: t('Employee Salaries'), href: route('hr.employee-salaries.index') },
    { title: t('Payroll Calculation') },
  ];

  const pageActions = [{
    label: t('Back'),
    icon: <ArrowLeft className="h-4 w-4 mr-2" />,
    variant: 'outline' as const,
    onClick: () => router.get(route('hr.employee-salaries.index')),
  }];

  const attendanceCards = [
    { label: t('Working Days'), value: attendanceSummary.total_working_days || 0, bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-100' },
    { label: t('Full Present'), value: attendanceSummary.full_present_days || 0, bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
    { label: t('Half Days'), value: attendanceSummary.half_days || 0, bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
    { label: t('Holidays'), value: attendanceSummary.holiday_days || 0, bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
    { label: t('Paid Leave'), value: attendanceSummary.leave_days || 0, bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
    { label: t('Unpaid Leave'), value: attendanceSummary.unpaid_leave_days || 0, bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
    { label: t('Absent'), value: attendanceSummary.absent_days || 0, bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
    { label: t('Overtime'), value: `${(Number(attendanceSummary.overtime_hours) || 0).toFixed(1)}h`, bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400' },
  ];

  const statusBadge = (record: any) => {
    const map: Record<string, string> = {
      present: 'bg-green-50 text-green-700 ring-green-600/20',
      absent: 'bg-red-50 text-red-700 ring-red-600/20',
      half_day: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
      holiday: 'bg-purple-50 text-purple-700 ring-purple-600/20',
      on_leave: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    };
    const label: Record<string, string> = {
      present: t('Present'), absent: t('Absent'), half_day: t('Half Day'),
      holiday: t('Holiday'), on_leave: t('On Leave'),
    };
    return (
      <div className="flex flex-wrap items-center gap-1">
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${map[record.status] || 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
          {label[record.status] || record.status}
        </span>
        {record.status === 'on_leave' && record.leave_type_name && (
          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
            {record.is_paid_leave ? t('Paid Leave') : t('Unpaid Leave')}
          </span>
        )}
        {record.is_late && (
          <span className="inline-flex items-center rounded-md px-1 py-0.5 text-xs font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20">{t('Late')}</span>
        )}
        {record.is_early_departure && (
          <span className="inline-flex items-center rounded-md px-1 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20">{t('Early')}</span>
        )}
      </div>
    );
  };

  return (
    <PageTemplate
      title={`${t('Payroll Calculation')} — ${employeeSalary.employee.name}`}
      description={t("Salary breakdown with attendance-based earnings and deductions.")}
      url="/hr/employee-salaries/payroll-calculation"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      <div className="space-y-5">

        {/* ===== Header Card ===== */}
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calculator className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{employeeSalary.employee.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {currentMonth ? new Date(currentMonth).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : '-'}
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-72">
                <Select value={currentPayrollRun?.id?.toString() || ''} onValueChange={handlePayrollChange} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select Payroll Run')} />
                  </SelectTrigger>
                  <SelectContent>
                    {payrollRuns?.map((run: any) => (
                      <SelectItem key={run.id} value={run.id.toString()}>
                        {run.title} ({window?.appSettings?.formatDateTimeSimple(run.pay_period_start, false)} — {window?.appSettings?.formatDateTimeSimple(run.pay_period_end, false)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== Summary Cards ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide">{t('Basic Salary')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{window.appSettings?.formatCurrency(employeeSalary.basic_salary || 0)}</p>
                </div>
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <DollarSign className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 tracking-wide">{t('Gross Pay')}</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">{window.appSettings?.formatCurrency(payrollCalculation.gross_pay || 0)}</p>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-primary tracking-wide">{t('Net Salary')}</p>
                  <p className="text-2xl font-bold text-primary mt-1">{window.appSettings?.formatCurrency(payrollCalculation.net_salary || 0)}</p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== Loading ===== */}
        {loading && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
              <span className="text-gray-500 dark:text-gray-400">{t('Loading payroll data...')}</span>
            </CardContent>
          </Card>
        )}

        {!loading && (
          <>
            {/* ===== Attendance Summary ===== */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  {t('Attendance Summary')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {attendanceCards.map((item) => (
                    <div key={item.label} className={`${item.bg} rounded-lg p-3 text-center`}>
                      <p className={`text-2xl font-bold ${item.text}`}>{item.value}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{t('Present Days')}:</span>{' '}
                    Full Present + Holidays + Paid Leave + (Half Days × 0.5) ={' '}
                    <span className="font-bold text-gray-800 dark:text-gray-200">{attendanceSummary.present_days || 0}</span>
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{t('LOP Days')}:</span>{' '}
                    <span className="font-bold text-red-600 dark:text-red-400">{payrollCalculation.lop_days || 0}</span>
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{t('Unpaid Leave')}:</span>{' '}
                    <span className="font-bold text-orange-600 dark:text-orange-400">{attendanceSummary.unpaid_leave_days || 0} {t('days')}</span>
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* ===== Salary Components ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    {t('Earnings')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(salaryBreakdown.earnings || {}).map(([name, amount]: [string, any]) => (
                      <div key={name} className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{name}</span>
                        <span className="text-sm font-mono font-medium text-green-600 dark:text-green-400">{window.appSettings?.formatCurrency(amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t-2 border-green-200 dark:border-green-800">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('Total Earnings')}</span>
                      <span className="text-sm font-mono font-bold text-green-700 dark:text-green-400">{window.appSettings?.formatCurrency(payrollCalculation.total_earnings || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    {t('Component Deductions')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.keys(salaryBreakdown.deductions || {}).length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">{t('No component deductions')}</p>
                    ) : (
                      Object.entries(salaryBreakdown.deductions || {}).map(([name, amount]: [string, any]) => (
                        <div key={name} className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{name}</span>
                          <span className="text-sm font-mono font-medium text-red-600 dark:text-red-400">{window.appSettings?.formatCurrency(amount)}</span>
                        </div>
                      ))
                    )}
                    <div className="flex justify-between items-center pt-2 border-t-2 border-red-200 dark:border-red-800">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('Total Deductions')}</span>
                      <span className="text-sm font-mono font-bold text-red-700 dark:text-red-400">{window.appSettings?.formatCurrency(payrollCalculation.total_deductions || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ===== Final Calculation ===== */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  {t('Final Calculation')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Formula */}
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300 space-y-1.5">
                  <p><span className="font-semibold">{t('Gross Pay Formula')}:</span> Total Earnings (Basic Salary + Component Earnings) - LOP Deduction - Unpaid Leave Deduction + Overtime Earnings</p>
                  <p><span className="font-semibold">{t('Net Salary Formula')}:</span> Gross Pay - Total Component Deductions</p>
                  <p><span className="font-semibold">{t('LOP Deduction Formula')}:</span> (Basic Salary / Total Working Days) × LOP Days</p>
                </div>

                <div className="space-y-1.5">
                  {/* Earnings */}
                  <div className="flex justify-between items-center px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('Basic Salary')}</span>
                    <span className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">{window.appSettings?.formatCurrency(employeeSalary.basic_salary || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('Component Earnings')}</span>
                    <span className="text-sm font-mono font-medium text-green-600 dark:text-green-400">+ {window.appSettings?.formatCurrency(payrollCalculation.component_earnings || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2.5 border-t-2 border-gray-200 dark:border-gray-700 mt-1">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('Total Earnings')}</span>
                    <span className="text-sm font-mono font-bold text-gray-900 dark:text-gray-100">{window.appSettings?.formatCurrency(payrollCalculation.total_earnings || 0)}</span>
                  </div>

                  <div className="py-1" />

                  {/* Deductions */}
                  <div className="flex justify-between items-center px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t('LOP Deduction')}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">({payrollCalculation.lop_days || 0} days × {window.appSettings?.formatCurrency(payrollCalculation.per_day_salary || 0)}/day)</span>
                    </div>
                    <span className="text-sm font-mono font-medium text-red-600 dark:text-red-400">− {window.appSettings?.formatCurrency(payrollCalculation.lop_deduction || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t('Unpaid Leave Deduction')}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">({attendanceSummary.unpaid_leave_days || 0} days)</span>
                    </div>
                    <span className="text-sm font-mono font-medium text-red-600 dark:text-red-400">− {window.appSettings?.formatCurrency(payrollCalculation.unpaid_leave_deduction || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('Overtime Amount')}</span>
                    <span className="text-sm font-mono font-medium text-green-600 dark:text-green-400">+ {window.appSettings?.formatCurrency(payrollCalculation.overtime_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2.5 border-t-2 border-gray-200 dark:border-gray-700 mt-1">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('Gross Pay')}</span>
                    <span className="text-sm font-mono font-bold text-gray-900 dark:text-gray-100">{window.appSettings?.formatCurrency(payrollCalculation.gross_pay || 0)}</span>
                  </div>

                  <div className="py-1" />

                  <div className="flex justify-between items-center px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t('Component Deductions')}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">(Tax, PF etc.)</span>
                    </div>
                    <span className="text-sm font-mono font-medium text-red-600 dark:text-red-400">− {window.appSettings?.formatCurrency(payrollCalculation.total_deductions || 0)}</span>
                  </div>

                  {/* Net Salary */}
                  <div className="flex justify-between items-center px-3 py-3 border-t-2 border-gray-900 dark:border-gray-100 mt-1">
                    <span className="text-base font-bold text-gray-900 dark:text-gray-100">{t('Net Salary (Take Home)')}</span>
                    <span className="text-base font-mono font-bold text-gray-900 dark:text-gray-100">{window.appSettings?.formatCurrency(payrollCalculation.net_salary || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ===== Daily Attendance Records ===== */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  {t('Daily Attendance Records')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        {[t('Date'), t('Clock In'), t('Clock Out'), t('Total Hours'), t('Overtime'), t('Status')].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {attendanceRecords.length > 0 ? attendanceRecords.map((record: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3 text-gray-900 dark:text-white whitespace-nowrap">
                            {window.appSettings?.formatDateTimeSimple(record.date, false) || new Date(record.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-green-600 dark:text-green-400 whitespace-nowrap">{record.clock_in || '—'}</td>
                          <td className="px-4 py-3 font-mono text-sm text-red-600 dark:text-red-400 whitespace-nowrap">{record.clock_out || '—'}</td>
                          <td className="px-4 py-3 font-mono text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {record.total_hours ? `${Number(record.total_hours).toFixed(2)}h` : '—'}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-orange-600 dark:text-orange-400 whitespace-nowrap">
                            {record.overtime_hours > 0 ? `${Number(record.overtime_hours).toFixed(1)}h` : '—'}
                          </td>
                          <td className="px-4 py-3">{statusBadge(record)}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                            <AlertCircle className="h-5 w-5 mx-auto mb-2 opacity-50" />
                            {t('No attendance records found for this period')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

          </>
        )}
      </div>
    </PageTemplate>
  );
}
