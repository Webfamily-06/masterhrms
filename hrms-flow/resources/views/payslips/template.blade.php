<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Payslip - {{ $payrollEntry->employee->name }}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: Arial, sans-serif;
            font-size: 13px;
            color: #333;
            background: #fff;
            padding: 20px 10px 40px 10px;
        }

        .container {
            max-width: 860px;
            margin: 0 auto;
            background: #fff;
            overflow: visible;
        }

        /* ===== HEADER ===== */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 16px;
            border-bottom: 2px solid {{ $themeColor }};
            margin-bottom: 20px;
        }

        .company-name {
            font-size: 22px;
            font-weight: bold;
            color: #111;
        }

        .company-address {
            font-size: 12px;
            color: #555;
            margin-top: 4px;
        }

        /* ===== PAYSLIP TITLE ===== */
        .payslip-title {
            font-size: 15px;
            font-weight: bold;
            margin-bottom: 16px;
            color: #111;
        }

        /* ===== EMPLOYEE PAY SUMMARY ===== */
        .section-label {
            font-size: 11px;
            font-weight: bold;
            color: {{ $themeColor }};
            text-transform: capitalize;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }

        .employee-summary {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e0e0e0;
        }

        .employee-info table {
            border: none;
            border-collapse: collapse;
        }

        .employee-info td {
            border: none;
            padding: 4px 16px 4px 0;
            font-size: 13px;
            vertical-align: top;
        }

        .employee-info td:first-child {
            color: #777;
            white-space: nowrap;
            min-width: 120px;
        }

        .employee-info td:last-child {
            color: #111;
            font-weight: 500;
        }

        .net-pay-box {
            text-align: center;
            min-width: 220px;
        }

        .net-pay-label {
            font-size: 13px;
            color: #555;
            margin-bottom: 6px;
        }

        .net-pay-amount {
            font-size: 36px;
            font-weight: bold;
            color: #111;
            line-height: 1.1;
        }

        .net-pay-meta {
            font-size: 11px;
            color: #777;
            margin-top: 6px;
        }

        /* ===== EARNINGS / DEDUCTIONS TABLE ===== */
        .section-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0;
        }

        .section-table .section-heading th {
            font-size: 11px;
            font-weight: bold;
            color: {{ $themeColor }};
            text-transform: capitalize;
            letter-spacing: 0.5px;
            padding: 10px 8px;
            border-top: 2px solid {{ $themeColor }};
            border-bottom: 1px solid #e0e0e0;
            background: #fff;
            text-align: left;
        }

        .section-table .section-heading th.amount-col {
            text-align: right;
        }

        .section-table td {
            padding: 8px 8px;
            border-bottom: 1px dashed #e8e8e8;
            font-size: 13px;
            color: #333;
        }

        .section-table .amount-col {
            text-align: right;
        }

        .section-table .total-row td {
            font-weight: bold;
            border-top: 1px solid #ccc;
            border-bottom: none;
            padding: 9px 8px;
            background: #fff;
        }

        /* ===== NET PAY ROW ===== */
        .net-pay-row {
            width: 100%;
            border-collapse: collapse;
            margin-top: 0;
        }

        .net-pay-row td {
            background-color: #eef1fd;
            padding: 12px 8px;
            font-size: 13px;
            font-weight: bold;
            color: {{ $themeColor }};
            border: 1px solid #c5cef5;
        }

        .net-pay-row td.amount-col {
            text-align: right;
        }

        /* ===== TOTAL NET PAYABLE ===== */
        .total-net-payable {
            text-align: center;
            padding: 20px 0 16px;
            font-size: 15px;
            color: #111;
            border-bottom: 2px solid {{ $themeColor }};
            margin-bottom: 20px;
        }

        .total-net-payable strong {
            font-size: 18px;
        }

        /* ===== ATTENDANCE SECTION ===== */
        .attendance-section {
            margin-bottom: 20px;
        }

        .attendance-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: auto;
            border: 1px solid #dde2f5;
            font-size: 9px;
        }

        .attendance-table th {
            background: #f5f7ff;
            color: {{ $themeColor }};
            font-size: 9px;
            text-transform: capitalize;
            padding: 4px 2px;
            border: 1px solid #dde2f5;
            text-align: center;
            word-break: break-word;
            white-space: normal;
        }

        .attendance-table td {
            padding: 4px 2px;
            border: 1px solid #dde2f5;
            text-align: center;
            font-size: 9px;
        }

        /* ===== FOOTER ===== */
        .footer {
            text-align: center;
            font-size: 11px;
            color: #999;
            padding-top: 16px;
        }
    </style>
</head>

<body>
    <div class="container" id="payslip-content">

        {{-- ===== HEADER ===== --}}
        <div class="header">
            <div>
                <div class="company-name">
                    {{ isset($companySettings['titleText']) ? $companySettings['titleText'] : config('app.name', 'HRM') }}
                </div>
                @if(isset($companySettings['companyAddress']))
                    <div class="company-address">{{ $companySettings['companyAddress'] }}</div>
                @endif
                <div class="company-address">
                    @if(isset($companySettings['companyEmail'])) {{ $companySettings['companyEmail'] }} @endif
                    @if(isset($companySettings['companyMobile'])) | {{ $companySettings['companyMobile'] }} @endif
                </div>
            </div>
        </div>

        {{-- ===== PAYSLIP TITLE ===== --}}
        <div class="payslip-title">
            Payslip for the month of {{ $payrollEntry->payrollRun->pay_period_start->format('F Y') }}
        </div>

        {{-- ===== EMPLOYEE PAY SUMMARY ===== --}}
        <div class="section-label">Employee Pay Summary</div>

        @php
            $lopDays         = $payrollEntry->lop_days ?? 0;
            $effectivePaid   = $payrollEntry->effective_paid_days ?? $payrollEntry->present_days ?? 0;
            $presentDays     = $payrollEntry->present_days ?? 0;
            $fullPresent     = $payrollEntry->full_present_days ?? 0;
            $halfDays        = $payrollEntry->half_days ?? 0;
            $holidayDays     = $payrollEntry->holiday_days ?? 0;
            $paidLeaveDays   = $payrollEntry->paid_leave_days ?? 0;
            $unpaidLeaveDays = $payrollEntry->unpaid_leave_days ?? 0;
            $absentDays      = $payrollEntry->absent_days ?? 0;
        @endphp

        <div class="employee-summary">
            <div class="employee-info">
                <table>
                    <tr>
                        <td>Employee Name:</td>
                        <td>{{ $payrollEntry->employee->name }}{{ isset($employeeData->employee_id) ? ', ' . $employeeData->employee_id : '' }}</td>
                    </tr>
                    <tr>
                        <td>Email:</td>
                        <td>{{ $payrollEntry->employee->email }}</td>
                    </tr>
                    @if(isset($employeeData->bank_name) || isset($employeeData->account_number))
                    <tr>
                        <td>Bank Name:</td>
                        <td>{{ $employeeData->bank_name ?? 'N/A' }}</td>
                    </tr>
                    <tr>
                        <td>Account Number:</td>
                        <td>{{ $employeeData->account_number ?? 'N/A' }}</td>
                    </tr>
                    @endif
                    <tr>
                        <td>Pay Period:</td>
                        <td>{{ $payrollEntry->payrollRun->pay_period_start->format('d M Y') }} - {{ $payrollEntry->payrollRun->pay_period_end->format('d M Y') }}</td>
                    </tr>
                    <tr>
                        <td>Pay Date:</td>
                        <td>{{ $payrollEntry->payrollRun->pay_date->format('d/m/Y') }}</td>
                    </tr>
                    <tr>
                        <td>Generated On:</td>
                        <td>{{ now()->format('d/m/Y') }}</td>
                    </tr>
                </table>
            </div>
            <div class="net-pay-box">
                <div class="net-pay-label">Employee Net Pay</div>
                <div class="net-pay-amount">{{ formatCurrency($payrollEntry->net_pay) }}</div>
                <div class="net-pay-meta">
                    Paid Days : {{ $effectivePaid }} | LOP Days : {{ $lopDays }}
                </div>
            </div>
        </div>

        {{-- ===== ATTENDANCE SUMMARY ===== --}}
        @if($payrollEntry->working_days > 0)
        <div class="attendance-section">
            <div class="section-label">Attendance Summary</div>
            <table class="attendance-table">
                <tr>
                    <th>Working Days</th>
                    <th>Full Present</th>
                    <th>Half Days</th>
                    <th>Holidays</th>
                    <th>Paid Leave</th>
                    <th>Unpaid Leave</th>
                    <th>Absent</th>
                    <th>LOP Days</th>
                    @if($payrollEntry->overtime_hours > 0)
                    <th>Overtime Hrs</th>
                    @endif
                </tr>
                <tr>
                    <td>{{ $payrollEntry->working_days }}</td>
                    <td>{{ $fullPresent }}</td>
                    <td>{{ $halfDays }}</td>
                    <td>{{ $holidayDays }}</td>
                    <td>{{ $paidLeaveDays }}</td>
                    <td>{{ $unpaidLeaveDays }}</td>
                    <td>{{ $absentDays }}</td>
                    <td><strong>{{ $lopDays }}</strong></td>
                    @if($payrollEntry->overtime_hours > 0)
                    <td>{{ number_format($payrollEntry->overtime_hours, 2) }}</td>
                    @endif
                </tr>
            </table>
            <div style="font-size:11px; color:#555; margin-top:6px; padding:6px 8px; background:#f8f9ff; border-left:3px solid {{ $themeColor }};">
                <strong>Present Days</strong> = Full Present ({{ $fullPresent }}) + Holidays ({{ $holidayDays }}) + Paid Leave ({{ $paidLeaveDays }}) + Half Days × 0.5 ({{ $halfDays }} × 0.5) = <strong>{{ $presentDays }}</strong>
                @if($payrollEntry->overtime_hours > 0)
                &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Overtime</strong> = {{ number_format($payrollEntry->overtime_hours, 2) }} hrs = <strong>{{ formatCurrency($payrollEntry->overtime_amount) }}</strong>
                @endif
            </div>
        </div>
        @endif

        {{-- ===== EARNINGS ===== --}}
        @php
            $earnings   = $payrollEntry->earnings_breakdown ?? [];
            $deductions = $payrollEntry->deductions_breakdown ?? [];

            if ($payrollEntry->overtime_amount > 0) {
                $earnings['Overtime Amount'] = $payrollEntry->overtime_amount;
            }

            $lopDeduction = $payrollEntry->lop_deduction ?? 0;
            if ($lopDeduction > 0) {
                $deductions['LOP Deduction (' . $lopDays . ' days)'] = $lopDeduction;
            }

            $unpaidLeaveDeduction = $payrollEntry->unpaid_leave_deduction ?? 0;
            if ($unpaidLeaveDeduction > 0) {
                $deductions['Unpaid Leave Deduction'] = $unpaidLeaveDeduction;
            }

            $earningsKeys         = array_keys($earnings);
            $deductionsKeys       = array_keys($deductions);
            $totalEarningsDisplay = array_sum($earnings);
            $totalDeductionsDisplay = array_sum($deductions);
        @endphp

        <table class="section-table">
            <tr class="section-heading">
                <th style="width:70%;">Earnings</th>
                <th class="amount-col" style="width:30%;">Amount</th>
            </tr>
            @foreach($earningsKeys as $key)
            <tr>
                <td>{{ $key }}</td>
                <td class="amount-col">{{ formatCurrency($earnings[$key]) }}</td>
            </tr>
            @endforeach
            <tr class="total-row">
                <td>Gross Earnings</td>
                <td class="amount-col">{{ formatCurrency($totalEarningsDisplay) }}</td>
            </tr>
        </table>

        {{-- ===== DEDUCTIONS ===== --}}
        <table class="section-table" style="margin-top:16px;">
            <tr class="section-heading">
                <th style="width:70%;">Deductions</th>
                <th class="amount-col" style="width:30%;">(-)Amount</th>
            </tr>
            @foreach($deductionsKeys as $key)
            <tr>
                <td>{{ $key }}</td>
                <td class="amount-col">{{ formatCurrency($deductions[$key]) }}</td>
            </tr>
            @endforeach
            <tr class="total-row">
                <td>Total Deductions</td>
                <td class="amount-col">{{ formatCurrency($totalDeductionsDisplay) }}</td>
            </tr>
        </table>

        {{-- ===== NET PAY ROW ===== --}}
        <table class="net-pay-row" style="margin-top:0;">
            <tr>
                <td style="width:70%;"><strong>NET PAY (Gross Earnings - Total Deductions)</strong></td>
                <td class="amount-col" style="width:30%;"><strong>{{ formatCurrency($payrollEntry->net_pay) }}</strong></td>
            </tr>
        </table>

        {{-- ===== TOTAL NET PAYABLE ===== --}}
        <div class="total-net-payable">
            Total Net Payable <strong>{{ formatCurrency($payrollEntry->net_pay) }}</strong>
        </div>

        {{-- ===== FOOTER ===== --}}
        <div class="footer">
            <p>-- This document has been automatically generated; therefore, a signature is not required. --</p>
        </div>

    </div>
</body>

<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<script>
    window.addEventListener('load', function () {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        var element = document.querySelector('.container');
        var filename = 'payslip-{{ $payrollEntry->employee->name }}-{{ $payrollEntry->payrollRun->pay_period_start->format("M-Y") }}.pdf';
        var opt = {
            margin: 0.3,
            filename: filename,
            image: { type: 'jpeg', quality: 1 },
            html2canvas: {
                scale: 2,
                dpi: 192,
                letterRendering: true
            },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save().then(function () {
            setTimeout(function () {
                window.location.href = '{{ route('hr.payslips.index') }}';
            }, 1000);
        });
    });
</script>

</html>
