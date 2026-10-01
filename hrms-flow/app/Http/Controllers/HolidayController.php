<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Holiday;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class HolidayController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-holidays')) {

            if (isDemo()) {
                $currentYear = (int) date('Y');
                $staticHolidays = $this->getDemoHolidays();
                $branches = Branch::whereIn('created_by', getCompanyAndUsersId())
                    ->select('id', 'name')
                    ->get();

                return Inertia::render('hr/holidays/index', [
                    'holidays'   => ['data' => $staticHolidays->values(), 'total' => $staticHolidays->count(), 'from' => 1, 'to' => $staticHolidays->count(), 'links' => []],
                    'branches'   => $branches,
                    'categories' => ['national', 'religious', 'company-specific', 'regional'],
                    'years'      => [$currentYear],
                    'filters'    => $request->all(['search', 'category', 'branch_id', 'date_from', 'date_to', 'year', 'sort_field', 'sort_direction', 'per_page']),
                ]);
            }

            $query = Holiday::with(['branches'])->where(function ($q) {
                if (Auth::user()->can('manage-any-holidays')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-holidays')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

            // Handle search
            if ($request->has('search') && ! empty($request->search)) {
                $query->where(function ($q) use ($request) {
                    $q->where('name', 'like', '%'.$request->search.'%')
                        ->orWhere('description', 'like', '%'.$request->search.'%');
                });
            }

            // Handle category filter
            if ($request->has('category') && ! empty($request->category)) {
                $query->where('category', $request->category);
            }

            // Handle branch filter
            if ($request->has('branch_id') && ! empty($request->branch_id)) {
                $query->whereHas('branches', function ($q) use ($request) {
                    $q->where('branches.id', $request->branch_id);
                });
            }

            // Handle date range filter
            if ($request->has('date_from') && ! empty($request->date_from)) {
                $query->where(function ($q) use ($request) {
                    $q->where('start_date', '>=', $request->date_from)
                        ->orWhere('end_date', '>=', $request->date_from);
                });
            }
            if ($request->has('date_to') && ! empty($request->date_to)) {
                $query->where(function ($q) use ($request) {
                    $q->where('start_date', '<=', $request->date_to)
                        ->orWhere('end_date', '<=', $request->date_to);
                });
            }

            if (! isDemo()) {
                // Handle year filter
                if ($request->has('year') && ! empty($request->year)) {
                    $year = $request->year;
                    $query->where(function ($q) use ($year) {
                        $q->whereYear('start_date', $year)
                            ->orWhereYear('end_date', $year);
                    });
                } else {
                    // Default to current year if no year specified and not in demo mode
                    $currentYear = date('Y');
                    $query->where(function ($q) use ($currentYear) {
                        $q->whereYear('start_date', $currentYear)
                            ->orWhereYear('end_date', $currentYear);
                    });
                }
            }

            // Handle sorting
            $allowedSortFields = ['id', 'name', 'start_date', 'end_date', 'category', 'is_paid', 'is_recurring', 'is_half_day'];
            if ($request->has('sort_field') && ! empty($request->sort_field)) {
                $sortField = $request->sort_field === 'date' ? 'start_date' : $request->sort_field;
                if (in_array($sortField, $allowedSortFields)) {
                    $sortDirection = in_array($request->sort_direction, ['asc', 'desc']) ? $request->sort_direction : 'asc';
                    $query->orderBy($sortField, $sortDirection);
                } else {
                    $query->orderBy('id', 'desc');
                }
            } else {
                $query->orderBy('id', 'desc');
            }

            $holidays = $query->paginate($request->per_page ?? 10);

            // Get branches for filter dropdown
            $branches = Branch::whereIn('created_by', getCompanyAndUsersId())
                ->select('id', 'name')
                ->get();

            // Get categories for filter dropdown
            $categories = Holiday::whereIn('created_by', getCompanyAndUsersId())
                ->select('category')
                ->distinct()
                ->pluck('category')
                ->toArray();

            // Get available years for filter dropdown
            $years = Holiday::whereIn('created_by', getCompanyAndUsersId())
                ->selectRaw('YEAR(start_date) as year')
                ->distinct()
                ->pluck('year')
                ->toArray();

            // Add current year if not in the list
            $currentYear = (int) date('Y');
            if (! in_array($currentYear, $years)) {
                $years[] = $currentYear;
            }
            sort($years);

            return Inertia::render('hr/holidays/index', [
                'holidays' => $holidays,
                'branches' => $branches,
                'categories' => $categories,
                'years' => $years,
                'filters' => $request->all(['search', 'category', 'branch_id', 'date_from', 'date_to', 'year', 'sort_field', 'sort_direction', 'per_page']),
            ]);
        } else {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
    }

    /**
     * Display the calendar view.
     */
    public function calendar(Request $request)
    {
        $year = $request->year ?? date('Y');

        if (isDemo()) {
            $currentYear = (int) date('Y');
            $staticHolidays = $this->getDemoHolidays();
            $branches = Branch::whereIn('created_by', getCompanyAndUsersId())
                ->select('id', 'name')
                ->get();

            $calendarEvents = $staticHolidays->map(function ($holiday) {
                return [
                    'id'              => $holiday->id,
                    'title'           => $holiday->name,
                    'start'           => $holiday->start_date,
                    'end'             => $holiday->end_date ? \Carbon\Carbon::parse($holiday->end_date)->addDay()->format('Y-m-d') : null,
                    'allDay'          => true,
                    'backgroundColor' => $this->getCategoryColor($holiday->category),
                    'borderColor'     => $this->getCategoryColor($holiday->category),
                    'extendedProps'   => [
                        'category'    => $holiday->category,
                        'description' => $holiday->description,
                        'is_paid'     => $holiday->is_paid,
                        'is_half_day' => $holiday->is_half_day,
                        'is_recurring'=> $holiday->is_recurring,
                        'branches'    => $holiday->branches->pluck('name')->toArray(),
                    ],
                ];
            });

            return Inertia::render('hr/holidays/calendar', [
                'holidays'       => $staticHolidays,
                'calendarEvents' => $calendarEvents,
                'branches'       => $branches,
                'categories'     => ['national', 'religious', 'company-specific', 'regional'],
                'years'          => [$currentYear],
                'currentYear'    => $currentYear,
                'filters'        => $request->all(['category', 'branch_id']),
            ]);
        }

        $query = Holiday::with(['branches'])
            ->whereIn('created_by', getCompanyAndUsersId());

        if (!isDemo()) {
            $query->where(function ($q) use ($year) {
                $q->whereYear('start_date', $year)
                    ->orWhereYear('end_date', $year);
            });
        }

        $holidays = $query->get();

        // Get branches for filter dropdown
        $branches = Branch::whereIn('created_by', getCompanyAndUsersId())
            ->select('id', 'name')
            ->get();

        // Get categories for filter dropdown
        $categories = Holiday::whereIn('created_by', getCompanyAndUsersId())
            ->select('category')
            ->distinct()
            ->pluck('category')
            ->toArray();

        // Get available years for filter dropdown
        $years = Holiday::whereIn('created_by', getCompanyAndUsersId())
            ->selectRaw('YEAR(start_date) as year')
            ->distinct()
            ->pluck('year')
            ->toArray();

        // Add current year if not in the list
        $currentYear = (int) date('Y');
        if (! in_array($currentYear, $years)) {
            $years[] = $currentYear;
        }
        sort($years);

        // Format holidays for FullCalendar
        $calendarEvents = $holidays->map(function ($holiday) {
            return [
                'id' => $holiday->id,
                'title' => $holiday->name,
                'start' => $holiday->start_date,
                'end' => $holiday->end_date ? \Carbon\Carbon::parse($holiday->end_date)->addDay()->format('Y-m-d') : null,
                'allDay' => true,
                'backgroundColor' => $this->getCategoryColor($holiday->category),
                'borderColor' => $this->getCategoryColor($holiday->category),
                'extendedProps' => [
                    'category' => $holiday->category,
                    'description' => $holiday->description,
                    'is_paid' => $holiday->is_paid,
                    'is_half_day' => $holiday->is_half_day,
                    'is_recurring' => $holiday->is_recurring,
                    'branches' => $holiday->branches->pluck('name')->toArray(),
                ],
            ];
        });

        return Inertia::render('hr/holidays/calendar', [
            'holidays' => $holidays,
            'calendarEvents' => $calendarEvents,
            'branches' => $branches,
            'categories' => $categories,
            'years' => $years,
            'currentYear' => (int) $year,
            'filters' => $request->all(['category', 'branch_id']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'category' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_recurring' => 'nullable|boolean',
            'is_paid' => 'nullable|boolean',
            'is_half_day' => 'nullable|boolean',
            'branch_ids' => 'required|array',
            'branch_ids.*' => 'exists:branches,id',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        // Check if branches belong to current company
        $branchIds = $request->branch_ids;
        $validBranches = Branch::whereIn('created_by', getCompanyAndUsersId())
            ->whereIn('id', $branchIds)
            ->pluck('id')
            ->toArray();

        if (count($validBranches) !== count($branchIds)) {
            return redirect()->back()->with('error', __('Invalid branch selection'));
        }

        $holiday = Holiday::create([
            'name' => $request->name,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'category' => $request->category,
            'description' => $request->description,
            'is_recurring' => $request->is_recurring ?? false,
            'is_paid' => $request->is_paid ?? true,
            'is_half_day' => $request->is_half_day ?? false,
            'created_by' => creatorId(),
        ]);

        // Attach branches
        $holiday->branches()->attach($validBranches);

        return redirect()->back()->with('success', __('Holiday created successfully'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Holiday $holiday)
    {
        // Check if holiday belongs to current company
        if (! in_array($holiday->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to update this holiday'));
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'category' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_recurring' => 'nullable|boolean',
            'is_paid' => 'nullable|boolean',
            'is_half_day' => 'nullable|boolean',
            'branch_ids' => 'required|array',
            'branch_ids.*' => 'exists:branches,id',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        // Check if branches belong to current company
        $branchIds = $request->branch_ids;
        $validBranches = Branch::whereIn('created_by', getCompanyAndUsersId())
            ->whereIn('id', $branchIds)
            ->pluck('id')
            ->toArray();

        if (count($validBranches) !== count($branchIds)) {
            return redirect()->back()->with('error', __('Invalid branch selection'));
        }

        $holiday->update([
            'name' => $request->name,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'category' => $request->category,
            'description' => $request->description,
            'is_recurring' => $request->is_recurring ?? false,
            'is_paid' => $request->is_paid ?? true,
            'is_half_day' => $request->is_half_day ?? false,
        ]);

        // Sync branches
        $holiday->branches()->sync($validBranches);

        return redirect()->back()->with('success', __('Holiday updated successfully'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Holiday $holiday)
    {
        // Check if holiday belongs to current company
        if (! in_array($holiday->created_by, getCompanyAndUsersId())) {
            return redirect()->back()->with('error', __('You do not have permission to delete this holiday'));
        }

        // Detach all branches
        $holiday->branches()->detach();

        // Delete the holiday
        $holiday->delete();

        return redirect()->back()->with('success', __('Holiday deleted successfully'));
    }

    /**
     * Export holidays to PDF.
     */
    public function exportPdf(Request $request)
    {
        $year = $request->year ?? date('Y');

        if (isDemo()) {
            $holidays = $this->getDemoHolidays();
        } else {
            $query = Holiday::with(['branches'])
                ->whereIn('created_by', getCompanyAndUsersId());

            $query->where(function ($q) use ($year) {
                $q->whereYear('start_date', $year)
                    ->orWhereYear('end_date', $year);
            });

            if ($request->category) {
                $query->where('category', $request->category);
            }

            if ($request->branch_id) {
                $query->whereHas('branches', function ($q) use ($request) {
                    $q->where('branches.id', $request->branch_id);
                });
            }

            $holidays = $query->orderBy('start_date', 'asc')->get();
        }

        $html = view('exports.holidays-pdf', compact('holidays', 'year'))->render();

        return response($html)
            ->header('Content-Type', 'text/html')
            ->header('Content-Disposition', "attachment; filename=holidays-{$year}.html");
    }

    /**
     * Export holidays to iCal format.
     */
    public function exportIcal(Request $request)
    {
        $year = $request->year ?? date('Y');

        if (isDemo()) {
            $holidays = $this->getDemoHolidays();
        } else {
            $query = Holiday::with(['branches'])
                ->whereIn('created_by', getCompanyAndUsersId());

            $query->where(function ($q) use ($year) {
                $q->whereYear('start_date', $year)
                    ->orWhereYear('end_date', $year);
            });

            if ($request->category) {
                $query->where('category', $request->category);
            }

            if ($request->branch_id) {
                $query->whereHas('branches', function ($q) use ($request) {
                    $q->where('branches.id', $request->branch_id);
                });
            }

            $holidays = $query->orderBy('start_date', 'asc')->get();
        }

        $icalContent = "BEGIN:VCALENDAR\r\n";
        $icalContent .= "VERSION:2.0\r\n";
        $icalContent .= "PRODID:-//Company//Holidays//EN\r\n";
        $icalContent .= "CALSCALE:GREGORIAN\r\n";

        foreach ($holidays as $holiday) {
            $startDate = \Carbon\Carbon::parse($holiday->start_date)->format('Ymd');
            $endDate = $holiday->end_date ? \Carbon\Carbon::parse($holiday->end_date)->addDay()->format('Ymd') : \Carbon\Carbon::parse($holiday->start_date)->addDay()->format('Ymd');

            $icalContent .= "BEGIN:VEVENT\r\n";
            $icalContent .= 'UID:'.md5($holiday->id.$holiday->name)."@company.com\r\n";
            $icalContent .= "DTSTART;VALUE=DATE:{$startDate}\r\n";
            $icalContent .= "DTEND;VALUE=DATE:{$endDate}\r\n";
            $icalContent .= 'SUMMARY:'.str_replace(',', '\,', $holiday->name)."\r\n";
            if ($holiday->description) {
                $icalContent .= 'DESCRIPTION:'.str_replace(',', '\,', $holiday->description)."\r\n";
            }
            $icalContent .= "END:VEVENT\r\n";
        }

        $icalContent .= "END:VCALENDAR\r\n";

        return response($icalContent)
            ->header('Content-Type', 'text/calendar')
            ->header('Content-Disposition', "attachment; filename=holidays-{$year}.ics");
    }

    /**
     * Get color for holiday category
     */
    private function getCategoryColor($category)
    {
        $colors = [
            'national' => '#3b82f6',
            'religious' => '#8b5cf6',
            'company-specific' => '#10b77f',
            'regional' => '#f59e0b',
        ];

        return $colors[$category] ?? '#6b7280';
    }

    /**
     * Get static demo holidays for demo mode.
     */
    private function getDemoHolidays(): \Illuminate\Support\Collection
    {
        $y = (int) date('Y');

        // Get current company branches
        $branches = Branch::whereIn('created_by', getCompanyAndUsersId())
            ->select('id', 'name')
            ->get();

        $holidays = [
            ['id' => 1,  'name' => "New Year's Day",       'start_date' => "$y-01-01", 'end_date' => "$y-01-01", 'category' => 'national',         'description' => 'New Year celebration',           'is_paid' => true,  'is_half_day' => false, 'is_recurring' => true],
            ['id' => 2,  'name' => 'Martin Luther King Day','start_date' => "$y-01-20", 'end_date' => "$y-01-20", 'category' => 'national',         'description' => 'MLK Day',                         'is_paid' => true,  'is_half_day' => false, 'is_recurring' => true],
            ['id' => 3,  'name' => "Valentine's Day",      'start_date' => "$y-02-14", 'end_date' => "$y-02-14", 'category' => 'company-specific', 'description' => "Valentine's Day celebration",    'is_paid' => false, 'is_half_day' => true,  'is_recurring' => true],
            ['id' => 4,  'name' => "Presidents' Day",      'start_date' => "$y-02-17", 'end_date' => "$y-02-17", 'category' => 'national',         'description' => "Presidents' Day",                'is_paid' => true,  'is_half_day' => false, 'is_recurring' => true],
            ['id' => 5,  'name' => 'Good Friday',           'start_date' => "$y-04-18", 'end_date' => "$y-04-18", 'category' => 'religious',        'description' => 'Good Friday observance',          'is_paid' => true,  'is_half_day' => false, 'is_recurring' => true],
            ['id' => 6,  'name' => 'Easter Monday',         'start_date' => "$y-04-21", 'end_date' => "$y-04-21", 'category' => 'religious',        'description' => 'Easter Monday observance',        'is_paid' => true,  'is_half_day' => false, 'is_recurring' => true],
            ['id' => 7,  'name' => 'Memorial Day',          'start_date' => "$y-05-26", 'end_date' => "$y-05-26", 'category' => 'national',         'description' => 'Memorial Day',                    'is_paid' => true,  'is_half_day' => false, 'is_recurring' => true],
            ['id' => 8,  'name' => 'Independence Day',      'start_date' => "$y-07-04", 'end_date' => "$y-07-04", 'category' => 'national',         'description' => 'Independence Day celebration',    'is_paid' => true,  'is_half_day' => false, 'is_recurring' => true],
            ['id' => 9,  'name' => 'Summer Outing',         'start_date' => "$y-08-15", 'end_date' => "$y-08-15", 'category' => 'company-specific', 'description' => 'Annual company summer outing',    'is_paid' => true,  'is_half_day' => false, 'is_recurring' => false],
            ['id' => 10, 'name' => 'Labor Day',             'start_date' => "$y-09-01", 'end_date' => "$y-09-01", 'category' => 'national',         'description' => 'Labor Day',                       'is_paid' => true,  'is_half_day' => false, 'is_recurring' => true],
            ['id' => 11, 'name' => 'Columbus Day',          'start_date' => "$y-10-13", 'end_date' => "$y-10-13", 'category' => 'regional',         'description' => 'Columbus Day',                    'is_paid' => false, 'is_half_day' => false, 'is_recurring' => true],
            ['id' => 12, 'name' => 'Halloween',             'start_date' => "$y-10-31", 'end_date' => "$y-10-31", 'category' => 'company-specific', 'description' => 'Halloween celebration',            'is_paid' => false, 'is_half_day' => true,  'is_recurring' => true],
            ['id' => 13, 'name' => 'Veterans Day',          'start_date' => "$y-11-11", 'end_date' => "$y-11-11", 'category' => 'national',         'description' => 'Veterans Day',                    'is_paid' => true,  'is_half_day' => false, 'is_recurring' => true],
            ['id' => 14, 'name' => 'Thanksgiving Day',      'start_date' => "$y-11-27", 'end_date' => "$y-11-28", 'category' => 'national',         'description' => 'Thanksgiving holiday',            'is_paid' => true,  'is_half_day' => false, 'is_recurring' => true],
            ['id' => 15, 'name' => 'Christmas Eve',         'start_date' => "$y-12-24", 'end_date' => "$y-12-24", 'category' => 'religious',        'description' => 'Christmas Eve',                   'is_paid' => true,  'is_half_day' => true,  'is_recurring' => true],
            ['id' => 16, 'name' => 'Christmas Day',         'start_date' => "$y-12-25", 'end_date' => "$y-12-25", 'category' => 'religious',        'description' => 'Christmas Day celebration',       'is_paid' => true,  'is_half_day' => false, 'is_recurring' => true],
            ['id' => 17, 'name' => "New Year's Eve",        'start_date' => "$y-12-31", 'end_date' => "$y-12-31", 'category' => 'company-specific', 'description' => "New Year's Eve celebration",     'is_paid' => true,  'is_half_day' => true,  'is_recurring' => true],
        ];

        // Convert to objects and attach company branches to each holiday
        return collect($holidays)->map(function ($item) use ($branches) {
            $obj = (object) $item;
            $obj->branches = $branches;
            return $obj;
        });
    }
}
