/**
 * Authoritative MasterHRMS Locale Datasets:
 * - Complete Global Timezones (UTC-12:00 to UTC+13:00 with IANA mappings)
 * - 11 Date Formats
 * - 11 Time Formats
 * - 14 Supported Languages (with RTL flags & native labels)
 */

export interface TimezoneEntry {
  value: string;
  abbr: string;
  offset: number;
  isdst: boolean;
  text: string;
  utc: string[];
  /** Primary IANA timezone identifier (e.g. "Asia/Kolkata") */
  iana: string;
}

const RAW_TIMEZONES: Array<Omit<TimezoneEntry, "iana">> = [
  { value: "Dateline Standard Time", abbr: "DST", offset: -12, isdst: false, text: "(UTC-12:00) International Date Line West", utc: ["Etc/GMT+12"] },
  { value: "UTC-11", abbr: "U", offset: -11, isdst: false, text: "(UTC-11:00) Coordinated Universal Time-11", utc: ["Etc/GMT+11", "Pacific/Midway", "Pacific/Niue", "Pacific/Pago_Pago"] },
  { value: "Hawaiian Standard Time", abbr: "HST", offset: -10, isdst: false, text: "(UTC-10:00) Hawaii", utc: ["Pacific/Honolulu", "Etc/GMT+10", "Pacific/Johnston", "Pacific/Rarotonga", "Pacific/Tahiti"] },
  { value: "Alaskan Standard Time", abbr: "AKDT", offset: -8, isdst: true, text: "(UTC-09:00) Alaska", utc: ["America/Anchorage", "America/Juneau", "America/Nome", "America/Sitka", "America/Yakutat"] },
  { value: "Pacific Standard Time (Mexico)", abbr: "PDT", offset: -7, isdst: true, text: "(UTC-08:00) Baja California", utc: ["America/Santa_Isabel"] },
  { value: "Pacific Daylight Time", abbr: "PDT", offset: -7, isdst: true, text: "(UTC-07:00) Pacific Daylight Time (US & Canada)", utc: ["America/Los_Angeles", "America/Tijuana", "America/Vancouver"] },
  { value: "Pacific Standard Time", abbr: "PST", offset: -8, isdst: false, text: "(UTC-08:00) Pacific Standard Time (US & Canada)", utc: ["America/Los_Angeles", "America/Tijuana", "America/Vancouver", "PST8PDT"] },
  { value: "US Mountain Standard Time", abbr: "UMST", offset: -7, isdst: false, text: "(UTC-07:00) Arizona", utc: ["America/Phoenix", "America/Creston", "America/Dawson", "America/Dawson_Creek", "America/Hermosillo", "America/Whitehorse", "Etc/GMT+7"] },
  { value: "Mountain Standard Time (Mexico)", abbr: "MDT", offset: -6, isdst: true, text: "(UTC-07:00) Chihuahua, La Paz, Mazatlan", utc: ["America/Chihuahua", "America/Mazatlan"] },
  { value: "Mountain Standard Time", abbr: "MDT", offset: -6, isdst: true, text: "(UTC-07:00) Mountain Time (US & Canada)", utc: ["America/Denver", "America/Boise", "America/Cambridge_Bay", "America/Edmonton", "America/Inuvik", "America/Ojinaga", "America/Yellowknife", "MST7MDT"] },
  { value: "Central America Standard Time", abbr: "CAST", offset: -6, isdst: false, text: "(UTC-06:00) Central America", utc: ["America/Guatemala", "America/Belize", "America/Costa_Rica", "America/El_Salvador", "America/Managua", "America/Tegucigalpa", "Etc/GMT+6", "Pacific/Galapagos"] },
  { value: "Central Standard Time", abbr: "CDT", offset: -5, isdst: true, text: "(UTC-06:00) Central Time (US & Canada)", utc: ["America/Chicago", "America/Indiana/Knox", "America/Indiana/Tell_City", "America/Matamoros", "America/Menominee", "America/North_Dakota/Beulah", "America/North_Dakota/Center", "America/North_Dakota/New_Salem", "America/Rainy_River", "America/Rankin_Inlet", "America/Resolute", "America/Winnipeg", "CST6CDT"] },
  { value: "Central Standard Time (Mexico)", abbr: "CDT", offset: -5, isdst: true, text: "(UTC-06:00) Guadalajara, Mexico City, Monterrey", utc: ["America/Mexico_City", "America/Bahia_Banderas", "America/Cancun", "America/Merida", "America/Monterrey"] },
  { value: "Canada Central Standard Time", abbr: "CCST", offset: -6, isdst: false, text: "(UTC-06:00) Saskatchewan", utc: ["America/Regina", "America/Swift_Current"] },
  { value: "SA Pacific Standard Time", abbr: "SPST", offset: -5, isdst: false, text: "(UTC-05:00) Bogota, Lima, Quito", utc: ["America/Bogota", "America/Cayman", "America/Coral_Harbour", "America/Eirunepe", "America/Guayaquil", "America/Jamaica", "America/Lima", "America/Panama", "America/Rio_Branco", "Etc/GMT+5"] },
  { value: "Eastern Standard Time", abbr: "EST", offset: -5, isdst: false, text: "(UTC-05:00) Eastern Time (US & Canada)", utc: ["America/New_York", "America/Detroit", "America/Havana", "America/Indiana/Petersburg", "America/Indiana/Vincennes", "America/Indiana/Winamac", "America/Iqaluit", "America/Kentucky/Monticello", "America/Louisville", "America/Montreal", "America/Nassau", "America/Nipigon", "America/Pangnirtung", "America/Port-au-Prince", "America/Thunder_Bay", "America/Toronto"] },
  { value: "Eastern Daylight Time", abbr: "EDT", offset: -4, isdst: true, text: "(UTC-04:00) Eastern Daylight Time (US & Canada)", utc: ["America/New_York", "America/Detroit", "America/Toronto"] },
  { value: "US Eastern Standard Time", abbr: "UEDT", offset: -5, isdst: false, text: "(UTC-05:00) Indiana (East)", utc: ["America/Indianapolis", "America/Indiana/Marengo", "America/Indiana/Vevay"] },
  { value: "Venezuela Standard Time", abbr: "VST", offset: -4.5, isdst: false, text: "(UTC-04:30) Caracas", utc: ["America/Caracas"] },
  { value: "Paraguay Standard Time", abbr: "PYT", offset: -4, isdst: false, text: "(UTC-04:00) Asuncion", utc: ["America/Asuncion"] },
  { value: "Atlantic Standard Time", abbr: "ADT", offset: -3, isdst: true, text: "(UTC-04:00) Atlantic Time (Canada)", utc: ["America/Halifax", "America/Glace_Bay", "America/Goose_Bay", "America/Moncton", "America/Thule", "Atlantic/Bermuda"] },
  { value: "Central Brazilian Standard Time", abbr: "CBST", offset: -4, isdst: false, text: "(UTC-04:00) Cuiaba", utc: ["America/Cuiaba", "America/Campo_Grande"] },
  { value: "SA Western Standard Time", abbr: "SWST", offset: -4, isdst: false, text: "(UTC-04:00) Georgetown, La Paz, Manaus, San Juan", utc: ["America/La_Paz", "America/Manaus", "America/Puerto_Rico", "America/Santo_Domingo", "Etc/GMT+4"] },
  { value: "Pacific SA Standard Time", abbr: "PSST", offset: -4, isdst: false, text: "(UTC-04:00) Santiago", utc: ["America/Santiago", "Antarctica/Palmer"] },
  { value: "Newfoundland Standard Time", abbr: "NDT", offset: -2.5, isdst: true, text: "(UTC-03:30) Newfoundland", utc: ["America/St_Johns"] },
  { value: "E. South America Standard Time", abbr: "ESAST", offset: -3, isdst: false, text: "(UTC-03:00) Brasilia", utc: ["America/Sao_Paulo"] },
  { value: "Argentina Standard Time", abbr: "AST", offset: -3, isdst: false, text: "(UTC-03:00) Buenos Aires", utc: ["America/Argentina/Buenos_Aires", "America/Buenos_Aires"] },
  { value: "SA Eastern Standard Time", abbr: "SEST", offset: -3, isdst: false, text: "(UTC-03:00) Cayenne, Fortaleza", utc: ["America/Cayenne", "America/Fortaleza", "America/Recife", "Etc/GMT+3"] },
  { value: "Greenland Standard Time", abbr: "GDT", offset: -3, isdst: true, text: "(UTC-03:00) Greenland", utc: ["America/Godthab"] },
  { value: "Montevideo Standard Time", abbr: "MST", offset: -3, isdst: false, text: "(UTC-03:00) Montevideo", utc: ["America/Montevideo"] },
  { value: "Bahia Standard Time", abbr: "BST", offset: -3, isdst: false, text: "(UTC-03:00) Salvador", utc: ["America/Bahia"] },
  { value: "UTC-02", abbr: "U", offset: -2, isdst: false, text: "(UTC-02:00) Coordinated Universal Time-02", utc: ["America/Noronha", "Atlantic/South_Georgia", "Etc/GMT+2"] },
  { value: "Mid-Atlantic Standard Time", abbr: "MDT", offset: -1, isdst: true, text: "(UTC-02:00) Mid-Atlantic - Old", utc: ["Etc/GMT+2"] },
  { value: "Azores Standard Time", abbr: "ADT", offset: 0, isdst: true, text: "(UTC-01:00) Azores", utc: ["Atlantic/Azores", "America/Scoresbysund"] },
  { value: "Cape Verde Standard Time", abbr: "CVST", offset: -1, isdst: false, text: "(UTC-01:00) Cape Verde Is.", utc: ["Atlantic/Cape_Verde", "Etc/GMT+1"] },
  { value: "Morocco Standard Time", abbr: "MDT", offset: 1, isdst: true, text: "(UTC) Casablanca", utc: ["Africa/Casablanca", "Africa/El_Aaiun"] },
  { value: "UTC", abbr: "UTC", offset: 0, isdst: false, text: "(UTC) Coordinated Universal Time", utc: ["UTC", "Etc/GMT", "America/Danmarkshavn"] },
  { value: "GMT Standard Time", abbr: "GMT", offset: 0, isdst: false, text: "(UTC) Edinburgh, London", utc: ["Europe/London", "Europe/Isle_of_Man", "Europe/Guernsey", "Europe/Jersey"] },
  { value: "British Summer Time", abbr: "BST", offset: 1, isdst: true, text: "(UTC+01:00) Edinburgh, London", utc: ["Europe/London"] },
  { value: "GMT Standard Time (Dublin)", abbr: "GDT", offset: 1, isdst: true, text: "(UTC) Dublin, Lisbon", utc: ["Europe/Dublin", "Europe/Lisbon", "Atlantic/Canary"] },
  { value: "Greenwich Standard Time", abbr: "GST", offset: 0, isdst: false, text: "(UTC) Monrovia, Reykjavik", utc: ["Atlantic/Reykjavik", "Africa/Abidjan", "Africa/Accra", "Africa/Monrovia"] },
  { value: "W. Europe Standard Time", abbr: "WEDT", offset: 2, isdst: true, text: "(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna", utc: ["Europe/Berlin", "Europe/Amsterdam", "Europe/Rome", "Europe/Stockholm", "Europe/Vienna", "Europe/Zurich"] },
  { value: "Central Europe Standard Time", abbr: "CEDT", offset: 2, isdst: true, text: "(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague", utc: ["Europe/Budapest", "Europe/Belgrade", "Europe/Prague"] },
  { value: "Romance Standard Time", abbr: "RDT", offset: 2, isdst: true, text: "(UTC+01:00) Brussels, Copenhagen, Madrid, Paris", utc: ["Europe/Paris", "Europe/Brussels", "Europe/Copenhagen", "Europe/Madrid"] },
  { value: "Central European Standard Time", abbr: "CEDT", offset: 2, isdst: true, text: "(UTC+01:00) Sarajevo, Skopje, Warsaw, Zagreb", utc: ["Europe/Warsaw", "Europe/Sarajevo", "Europe/Zagreb"] },
  { value: "W. Central Africa Standard Time", abbr: "WCAST", offset: 1, isdst: false, text: "(UTC+01:00) West Central Africa", utc: ["Africa/Lagos", "Africa/Algiers", "Africa/Kinshasa", "Africa/Tunis", "Etc/GMT-1"] },
  { value: "Namibia Standard Time", abbr: "NST", offset: 1, isdst: false, text: "(UTC+01:00) Windhoek", utc: ["Africa/Windhoek"] },
  { value: "GTB Standard Time", abbr: "GDT", offset: 3, isdst: true, text: "(UTC+02:00) Athens, Bucharest", utc: ["Europe/Athens", "Europe/Bucharest", "Asia/Nicosia"] },
  { value: "Middle East Standard Time", abbr: "MEDT", offset: 3, isdst: true, text: "(UTC+02:00) Beirut", utc: ["Asia/Beirut"] },
  { value: "Egypt Standard Time", abbr: "EST", offset: 2, isdst: false, text: "(UTC+02:00) Cairo", utc: ["Africa/Cairo"] },
  { value: "Syria Standard Time", abbr: "SDT", offset: 3, isdst: false, text: "(UTC+02:00) Damascus", utc: ["Asia/Damascus"] },
  { value: "E. Europe Standard Time", abbr: "EEDT", offset: 3, isdst: true, text: "(UTC+02:00) E. Europe", utc: ["Europe/Helsinki", "Europe/Kyiv", "Europe/Riga", "Europe/Sofia"] },
  { value: "South Africa Standard Time", abbr: "SAST", offset: 2, isdst: false, text: "(UTC+02:00) Harare, Pretoria", utc: ["Africa/Johannesburg", "Africa/Harare", "Etc/GMT-2"] },
  { value: "FLE Standard Time", abbr: "FDT", offset: 3, isdst: true, text: "(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius", utc: ["Europe/Kyiv", "Europe/Helsinki", "Europe/Tallinn", "Europe/Vilnius"] },
  { value: "Turkey Standard Time", abbr: "TDT", offset: 3, isdst: false, text: "(UTC+03:00) Istanbul", utc: ["Europe/Istanbul"] },
  { value: "Israel Standard Time", abbr: "JDT", offset: 3, isdst: true, text: "(UTC+02:00) Jerusalem", utc: ["Asia/Jerusalem"] },
  { value: "Libya Standard Time", abbr: "LST", offset: 2, isdst: false, text: "(UTC+02:00) Tripoli", utc: ["Africa/Tripoli"] },
  { value: "Jordan Standard Time", abbr: "JST", offset: 3, isdst: false, text: "(UTC+03:00) Amman", utc: ["Asia/Amman"] },
  { value: "Arabic Standard Time", abbr: "AST", offset: 3, isdst: false, text: "(UTC+03:00) Baghdad", utc: ["Asia/Baghdad"] },
  { value: "Kaliningrad Standard Time", abbr: "KST", offset: 3, isdst: false, text: "(UTC+02:00) Kaliningrad", utc: ["Europe/Kaliningrad"] },
  { value: "Arab Standard Time", abbr: "AST", offset: 3, isdst: false, text: "(UTC+03:00) Kuwait, Riyadh", utc: ["Asia/Riyadh", "Asia/Kuwait", "Asia/Qatar", "Asia/Bahrain"] },
  { value: "E. Africa Standard Time", abbr: "EAST", offset: 3, isdst: false, text: "(UTC+03:00) Nairobi", utc: ["Africa/Nairobi", "Africa/Addis_Ababa", "Etc/GMT-3"] },
  { value: "Moscow Standard Time", abbr: "MSK", offset: 3, isdst: false, text: "(UTC+03:00) Moscow, St. Petersburg, Volgograd, Minsk", utc: ["Europe/Moscow", "Europe/Minsk", "Europe/Volgograd"] },
  { value: "Samara Time", abbr: "SAMT", offset: 4, isdst: false, text: "(UTC+04:00) Samara, Ulyanovsk, Saratov", utc: ["Europe/Samara", "Europe/Astrakhan"] },
  { value: "Iran Standard Time", abbr: "IDT", offset: 4.5, isdst: true, text: "(UTC+03:30) Tehran", utc: ["Asia/Tehran"] },
  { value: "Arabian Standard Time", abbr: "AST", offset: 4, isdst: false, text: "(UTC+04:00) Abu Dhabi, Muscat", utc: ["Asia/Dubai", "Asia/Muscat", "Etc/GMT-4"] },
  { value: "Azerbaijan Standard Time", abbr: "ADT", offset: 5, isdst: true, text: "(UTC+04:00) Baku", utc: ["Asia/Baku"] },
  { value: "Mauritius Standard Time", abbr: "MST", offset: 4, isdst: false, text: "(UTC+04:00) Port Louis", utc: ["Indian/Mauritius", "Indian/Mahe", "Indian/Reunion"] },
  { value: "Georgian Standard Time", abbr: "GET", offset: 4, isdst: false, text: "(UTC+04:00) Tbilisi", utc: ["Asia/Tbilisi"] },
  { value: "Caucasus Standard Time", abbr: "CST", offset: 4, isdst: false, text: "(UTC+04:00) Yerevan", utc: ["Asia/Yerevan"] },
  { value: "Afghanistan Standard Time", abbr: "AST", offset: 4.5, isdst: false, text: "(UTC+04:30) Kabul", utc: ["Asia/Kabul"] },
  { value: "West Asia Standard Time", abbr: "WAST", offset: 5, isdst: false, text: "(UTC+05:00) Ashgabat, Tashkent", utc: ["Asia/Tashkent", "Asia/Ashgabat", "Indian/Maldives", "Etc/GMT-5"] },
  { value: "Yekaterinburg Time", abbr: "YEKT", offset: 5, isdst: false, text: "(UTC+05:00) Yekaterinburg", utc: ["Asia/Yekaterinburg"] },
  { value: "Pakistan Standard Time", abbr: "PKT", offset: 5, isdst: false, text: "(UTC+05:00) Islamabad, Karachi", utc: ["Asia/Karachi"] },
  { value: "India Standard Time", abbr: "IST", offset: 5.5, isdst: false, text: "(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi", utc: ["Asia/Kolkata", "Asia/Calcutta"] },
  { value: "Sri Lanka Standard Time", abbr: "SLST", offset: 5.5, isdst: false, text: "(UTC+05:30) Sri Jayawardenepura", utc: ["Asia/Colombo"] },
  { value: "Nepal Standard Time", abbr: "NST", offset: 5.75, isdst: false, text: "(UTC+05:45) Kathmandu", utc: ["Asia/Kathmandu"] },
  { value: "Central Asia Standard Time", abbr: "CAST", offset: 6, isdst: false, text: "(UTC+06:00) Nur-Sultan (Astana)", utc: ["Asia/Almaty", "Asia/Bishkek", "Etc/GMT-6"] },
  { value: "Bangladesh Standard Time", abbr: "BST", offset: 6, isdst: false, text: "(UTC+06:00) Dhaka", utc: ["Asia/Dhaka", "Asia/Thimphu"] },
  { value: "Myanmar Standard Time", abbr: "MST", offset: 6.5, isdst: false, text: "(UTC+06:30) Yangon (Rangoon)", utc: ["Asia/Yangon", "Asia/Rangoon"] },
  { value: "SE Asia Standard Time", abbr: "SAST", offset: 7, isdst: false, text: "(UTC+07:00) Bangkok, Hanoi, Jakarta", utc: ["Asia/Bangkok", "Asia/Jakarta", "Asia/Ho_Chi_Minh", "Etc/GMT-7"] },
  { value: "N. Central Asia Standard Time", abbr: "NCAST", offset: 7, isdst: false, text: "(UTC+07:00) Novosibirsk", utc: ["Asia/Novosibirsk", "Asia/Omsk"] },
  { value: "China Standard Time", abbr: "CST", offset: 8, isdst: false, text: "(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi", utc: ["Asia/Shanghai", "Asia/Hong_Kong", "Asia/Macau"] },
  { value: "North Asia Standard Time", abbr: "NAST", offset: 8, isdst: false, text: "(UTC+08:00) Krasnoyarsk", utc: ["Asia/Krasnoyarsk"] },
  { value: "Singapore Standard Time", abbr: "MPST", offset: 8, isdst: false, text: "(UTC+08:00) Kuala Lumpur, Singapore", utc: ["Asia/Singapore", "Asia/Kuala_Lumpur", "Asia/Manila", "Etc/GMT-8"] },
  { value: "W. Australia Standard Time", abbr: "WAST", offset: 8, isdst: false, text: "(UTC+08:00) Perth", utc: ["Australia/Perth"] },
  { value: "Taipei Standard Time", abbr: "TST", offset: 8, isdst: false, text: "(UTC+08:00) Taipei", utc: ["Asia/Taipei"] },
  { value: "Ulaanbaatar Standard Time", abbr: "UST", offset: 8, isdst: false, text: "(UTC+08:00) Ulaanbaatar", utc: ["Asia/Ulaanbaatar"] },
  { value: "North Asia East Standard Time", abbr: "NAEST", offset: 8, isdst: false, text: "(UTC+08:00) Irkutsk", utc: ["Asia/Irkutsk"] },
  { value: "Japan Standard Time", abbr: "JST", offset: 9, isdst: false, text: "(UTC+09:00) Osaka, Sapporo, Tokyo", utc: ["Asia/Tokyo", "Etc/GMT-9"] },
  { value: "Korea Standard Time", abbr: "KST", offset: 9, isdst: false, text: "(UTC+09:00) Seoul", utc: ["Asia/Seoul"] },
  { value: "Cen. Australia Standard Time", abbr: "CAST", offset: 9.5, isdst: false, text: "(UTC+09:30) Adelaide", utc: ["Australia/Adelaide"] },
  { value: "AUS Central Standard Time", abbr: "ACST", offset: 9.5, isdst: false, text: "(UTC+09:30) Darwin", utc: ["Australia/Darwin"] },
  { value: "E. Australia Standard Time", abbr: "EAST", offset: 10, isdst: false, text: "(UTC+10:00) Brisbane", utc: ["Australia/Brisbane"] },
  { value: "AUS Eastern Standard Time", abbr: "AEST", offset: 10, isdst: false, text: "(UTC+10:00) Canberra, Melbourne, Sydney", utc: ["Australia/Sydney", "Australia/Melbourne"] },
  { value: "West Pacific Standard Time", abbr: "WPST", offset: 10, isdst: false, text: "(UTC+10:00) Guam, Port Moresby", utc: ["Pacific/Guam", "Pacific/Port_Moresby", "Etc/GMT-10"] },
  { value: "Tasmania Standard Time", abbr: "TST", offset: 10, isdst: false, text: "(UTC+10:00) Hobart", utc: ["Australia/Hobart"] },
  { value: "Yakutsk Standard Time", abbr: "YST", offset: 9, isdst: false, text: "(UTC+09:00) Yakutsk", utc: ["Asia/Yakutsk"] },
  { value: "Central Pacific Standard Time", abbr: "CPST", offset: 11, isdst: false, text: "(UTC+11:00) Solomon Is., New Caledonia", utc: ["Pacific/Guadalcanal", "Pacific/Noumea", "Etc/GMT-11"] },
  { value: "Vladivostok Standard Time", abbr: "VLAT", offset: 10, isdst: false, text: "(UTC+10:00) Vladivostok", utc: ["Asia/Vladivostok"] },
  { value: "Sakhalin Standard Time", abbr: "SAKT", offset: 11, isdst: false, text: "(UTC+11:00) Sakhalin", utc: ["Asia/Sakhalin"] },
  { value: "New Zealand Standard Time", abbr: "NZST", offset: 12, isdst: false, text: "(UTC+12:00) Auckland, Wellington", utc: ["Pacific/Auckland"] },
  { value: "UTC+12", abbr: "U", offset: 12, isdst: false, text: "(UTC+12:00) Coordinated Universal Time+12", utc: ["Etc/GMT-12", "Pacific/Tarawa"] },
  { value: "Fiji Standard Time", abbr: "FST", offset: 12, isdst: false, text: "(UTC+12:00) Fiji", utc: ["Pacific/Fiji"] },
  { value: "Magadan Standard Time", abbr: "MST", offset: 12, isdst: false, text: "(UTC+12:00) Magadan", utc: ["Asia/Magadan"] },
  { value: "Kamchatka Standard Time", abbr: "KDT", offset: 13, isdst: true, text: "(UTC+12:00) Petropavlovsk-Kamchatsky - Old", utc: ["Asia/Kamchatka"] },
  { value: "Tonga Standard Time", abbr: "TST", offset: 13, isdst: false, text: "(UTC+13:00) Nuku'alofa", utc: ["Pacific/Tongatapu", "Etc/GMT-13"] },
  { value: "Samoa Standard Time", abbr: "SST", offset: 13, isdst: false, text: "(UTC+13:00) Samoa", utc: ["Pacific/Apia"] },
];

export const GLOBAL_TIMEZONES: TimezoneEntry[] = RAW_TIMEZONES.map((tz) => ({
  ...tz,
  iana: tz.utc[0] || "UTC",
}));

/** Resolve any stored timezone (IANA or Windows name) to a valid IANA string */
export function resolveIanaTimezone(input?: string | null): string {
  if (!input) return "Asia/Kolkata";
  const match = GLOBAL_TIMEZONES.find(
    (tz) => tz.iana === input || tz.value === input || tz.utc.includes(input)
  );
  return match ? match.iana : input;
}

export const DATE_FORMAT_OPTIONS: Array<{ value: string; label: string; example: string }> = [
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD", example: "(2024-01-15)" },
  { value: "MM-DD-YYYY", label: "MM-DD-YYYY", example: "(01-15-2024)" },
  { value: "DD-MM-YYYY", label: "DD-MM-YYYY", example: "(15-01-2024)" },
  { value: "YYYY/MM/DD", label: "YYYY/MM/DD", example: "(2024/01/15)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY", example: "(01/15/2024)" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY", example: "(15/01/2024)" },
];

export const TIME_FORMAT_OPTIONS: Array<{ value: string; label: string; example: string }> = [
  { value: "24h", label: "24 Hour", example: "(13:30)" },
  { value: "12h", label: "12 Hour", example: "(1:30 PM)" },
];

export function normalizeDateFormat(input?: string | null): string {
  const raw = String(input || "").trim();
  const allowed = new Set(DATE_FORMAT_OPTIONS.map((o) => o.value));
  if (allowed.has(raw)) return raw;
  const legacyMap: Record<string, string> = {
    "Y-m-d": "YYYY-MM-DD",
    "m-d-Y": "MM-DD-YYYY",
    "d-m-Y": "DD-MM-YYYY",
    "Y/m/d": "YYYY/MM/DD",
    "m/d/Y": "MM/DD/YYYY",
    "d/m/Y": "DD/MM/YYYY",
  };
  return legacyMap[raw] || "YYYY-MM-DD";
}

export function normalizeTimeFormat(input?: string | null): "24h" | "12h" {
  const raw = String(input || "").trim();
  if (raw === "24h" || raw === "12h") return raw;
  if (raw.includes("H") || raw.includes("G")) return "24h";
  if (raw.includes("h") || raw.includes("g") || raw.toLowerCase().includes("a")) return "12h";
  return "24h";
}

export interface LanguageOption {
  code: string;
  countryCode: string;
  label: string;
  rtl?: boolean;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", countryCode: "GB", label: "English" },
  { code: "es", countryCode: "ES", label: "Español" },
  { code: "ar", countryCode: "SA", label: "العربية", rtl: true },
  { code: "da", countryCode: "DK", label: "Dansk" },
  { code: "de", countryCode: "DE", label: "Deutsch" },
  { code: "fr", countryCode: "FR", label: "Français" },
  { code: "he", countryCode: "IL", label: "עברית", rtl: true },
  { code: "it", countryCode: "IT", label: "Italiano" },
  { code: "ja", countryCode: "JP", label: "日本語" },
  { code: "nl", countryCode: "NL", label: "Nederlands" },
  { code: "pl", countryCode: "PL", label: "Polski" },
  { code: "pt", countryCode: "PT", label: "Português" },
  { code: "ta", countryCode: "IN", label: "தமிழ்" },
  { code: "hi", countryCode: "IN", label: "हिन्दी" },
];

export interface CountryOption {
  code: string; // ISO-2 uppercase (e.g. "IN") -> /assets/img/flags/in.svg
  name: string;
  dialCode: string;
  zipMin?: number;
  zipMax?: number;
  phoneMin?: number;
  phoneMax?: number;
  states: string[];
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  {
    code: "IN",
    name: "India",
    dialCode: "+91",
    zipMin: 6,
    zipMax: 6,
    phoneMin: 10,
    phoneMax: 10,
    states: [
      "Andhra Pradesh",
      "Arunachal Pradesh",
      "Assam",
      "Bihar",
      "Chhattisgarh",
      "Goa",
      "Gujarat",
      "Haryana",
      "Himachal Pradesh",
      "Jharkhand",
      "Karnataka",
      "Kerala",
      "Madhya Pradesh",
      "Maharashtra",
      "Manipur",
      "Meghalaya",
      "Mizoram",
      "Nagaland",
      "Odisha",
      "Punjab",
      "Rajasthan",
      "Sikkim",
      "Tamil Nadu",
      "Telangana",
      "Tripura",
      "Uttar Pradesh",
      "Uttarakhand",
      "West Bengal",
      "Andaman and Nicobar Islands",
      "Chandigarh",
      "Dadra and Nagar Haveli and Daman and Diu",
      "Delhi",
      "Jammu and Kashmir",
      "Ladakh",
      "Lakshadweep",
      "Puducherry",
    ],
  },
  {
    code: "US",
    name: "United States",
    dialCode: "+1",
    zipMin: 5,
    zipMax: 9,
    phoneMin: 10,
    phoneMax: 10,
    states: [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
      "Delaware", "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois",
      "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts",
      "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
      "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
      "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
      "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
      "West Virginia", "Wisconsin", "Wyoming",
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    dialCode: "+44",
    zipMin: 4,
    zipMax: 8,
    phoneMin: 10,
    phoneMax: 11,
    states: ["England", "Scotland", "Wales", "Northern Ireland", "Greater London", "West Midlands", "Greater Manchester", "West Yorkshire"],
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    dialCode: "+971",
    zipMin: 4,
    zipMax: 6,
    phoneMin: 9,
    phoneMax: 9,
    states: ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"],
  },
  {
    code: "SG",
    name: "Singapore",
    dialCode: "+65",
    zipMin: 6,
    zipMax: 6,
    phoneMin: 8,
    phoneMax: 8,
    states: ["Central Region", "East Region", "North Region", "North-East Region", "West Region"],
  },
  {
    code: "CA",
    name: "Canada",
    dialCode: "+1",
    zipMin: 5,
    zipMax: 7,
    phoneMin: 10,
    phoneMax: 10,
    states: [
      "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
      "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island",
      "Quebec", "Saskatchewan", "Yukon",
    ],
  },
  {
    code: "AU",
    name: "Australia",
    dialCode: "+61",
    zipMin: 4,
    zipMax: 4,
    phoneMin: 9,
    phoneMax: 10,
    states: [
      "Australian Capital Territory", "New South Wales", "Northern Territory", "Queensland",
      "South Australia", "Tasmania", "Victoria", "Western Australia",
    ],
  },
  {
    code: "DE",
    name: "Germany",
    dialCode: "+49",
    zipMin: 5,
    zipMax: 5,
    phoneMin: 9,
    phoneMax: 12,
    states: [
      "Baden-Württemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hesse",
      "Lower Saxony", "Mecklenburg-Vorpommern", "North Rhine-Westphalia", "Rhineland-Palatinate",
      "Saarland", "Saxony", "Saxony-Anhalt", "Schleswig-Holstein", "Thuringia",
    ],
  },
  {
    code: "FR",
    name: "France",
    dialCode: "+33",
    zipMin: 5,
    zipMax: 5,
    phoneMin: 9,
    phoneMax: 10,
    states: [
      "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Brittany", "Centre-Val de Loire",
      "Corsica", "Grand Est", "Hauts-de-France", "Île-de-France", "Normandy",
      "Nouvelle-Aquitaine", "Occitanie", "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
    ],
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    dialCode: "+966",
    zipMin: 5,
    zipMax: 5,
    phoneMin: 9,
    phoneMax: 9,
    states: ["Riyadh", "Makkah", "Madinah", "Eastern Province", "Asir", "Tabuk", "Qassim", "Hail", "Jazan", "Najran"],
  },
  {
    code: "QA",
    name: "Qatar",
    dialCode: "+974",
    zipMin: 4,
    zipMax: 6,
    phoneMin: 8,
    phoneMax: 8,
    states: ["Doha", "Al Rayyan", "Al Wakrah", "Al Khor", "Umm Salal", "Al Daayen", "Al Shamal"],
  },
  {
    code: "OM",
    name: "Oman",
    dialCode: "+968",
    zipMin: 3,
    zipMax: 6,
    phoneMin: 8,
    phoneMax: 8,
    states: ["Muscat", "Dhofar", "Musandam", "Al Buraimi", "Ad Dakhiliyah", "Al Batinah North", "Al Batinah South"],
  },
  {
    code: "KW",
    name: "Kuwait",
    dialCode: "+965",
    zipMin: 5,
    zipMax: 5,
    phoneMin: 8,
    phoneMax: 8,
    states: ["Al Asimah", "Hawalli", "Farwaniya", "Mubarak Al-Kabeer", "Ahmadi", "Jahra"],
  },
  {
    code: "BH",
    name: "Bahrain",
    dialCode: "+973",
    zipMin: 3,
    zipMax: 4,
    phoneMin: 8,
    phoneMax: 8,
    states: ["Capital", "Muharraq", "Northern", "Southern"],
  },
  {
    code: "MY",
    name: "Malaysia",
    dialCode: "+60",
    zipMin: 5,
    zipMax: 5,
    phoneMin: 9,
    phoneMax: 10,
    states: ["Johor", "Kedah", "Kelantan", "Kuala Lumpur", "Melaka", "Negeri Sembilan", "Pahang", "Penang", "Perak", "Sabah", "Sarawak", "Selangor"],
  },
  {
    code: "NL",
    name: "Netherlands",
    dialCode: "+31",
    zipMin: 4,
    zipMax: 6,
    phoneMin: 9,
    phoneMax: 10,
    states: ["North Holland", "South Holland", "Utrecht", "North Brabant", "Gelderland", "Limburg", "Overijssel", "Groningen"],
  },
  {
    code: "IE",
    name: "Ireland",
    dialCode: "+353",
    zipMin: 4,
    zipMax: 7,
    phoneMin: 9,
    phoneMax: 10,
    states: ["Leinster", "Munster", "Connacht", "Ulster", "Dublin", "Cork", "Galway"],
  },
  {
    code: "JP",
    name: "Japan",
    dialCode: "+81",
    zipMin: 7,
    zipMax: 7,
    phoneMin: 10,
    phoneMax: 11,
    states: ["Tokyo", "Osaka", "Kanagawa", "Aichi", "Saitama", "Chiba", "Hyogo", "Hokkaido", "Fukuoka", "Kyoto"],
  },
  {
    code: "KR",
    name: "South Korea",
    dialCode: "+82",
    zipMin: 5,
    zipMax: 5,
    phoneMin: 9,
    phoneMax: 11,
    states: ["Seoul", "Busan", "Incheon", "Daegu", "Daejeon", "Gwangju", "Ulsan", "Gyeonggi-do"],
  },
  {
    code: "NZ",
    name: "New Zealand",
    dialCode: "+64",
    zipMin: 4,
    zipMax: 4,
    phoneMin: 8,
    phoneMax: 10,
    states: ["Auckland", "Wellington", "Canterbury", "Waikato", "Bay of Plenty", "Otago"],
  },
  {
    code: "ZA",
    name: "South Africa",
    dialCode: "+27",
    zipMin: 4,
    zipMax: 4,
    phoneMin: 9,
    phoneMax: 10,
    states: ["Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape", "Free State", "Limpopo", "Mpumalanga", "North West", "Northern Cape"],
  },
  {
    code: "ES",
    name: "Spain",
    dialCode: "+34",
    zipMin: 5,
    zipMax: 5,
    phoneMin: 9,
    phoneMax: 9,
    states: ["Madrid", "Catalonia", "Andalusia", "Valencia", "Basque Country", "Galicia", "Castile and León"],
  },
  {
    code: "IT",
    name: "Italy",
    dialCode: "+39",
    zipMin: 5,
    zipMax: 5,
    phoneMin: 9,
    phoneMax: 11,
    states: ["Lombardy", "Lazio", "Veneto", "Piedmont", "Emilia-Romagna", "Tuscany", "Campania", "Sicily"],
  },
  {
    code: "CH",
    name: "Switzerland",
    dialCode: "+41",
    zipMin: 4,
    zipMax: 4,
    phoneMin: 9,
    phoneMax: 10,
    states: ["Zurich", "Geneva", "Bern", "Vaud", "Basel-Stadt", "Lucerne", "Ticino"],
  },
  {
    code: "LK",
    name: "Sri Lanka",
    dialCode: "+94",
    zipMin: 5,
    zipMax: 5,
    phoneMin: 9,
    phoneMax: 10,
    states: ["Western", "Central", "Southern", "Northern", "Eastern", "North Western", "North Central", "Uva", "Sabaragamuwa"],
  },
  {
    code: "PH",
    name: "Philippines",
    dialCode: "+63",
    zipMin: 4,
    zipMax: 4,
    phoneMin: 10,
    phoneMax: 10,
    states: ["Metro Manila", "Cebu", "Davao", "Calabarzon", "Central Luzon", "Western Visayas"],
  },
  {
    code: "ID",
    name: "Indonesia",
    dialCode: "+62",
    zipMin: 5,
    zipMax: 5,
    phoneMin: 9,
    phoneMax: 12,
    states: ["Jakarta", "West Java", "East Java", "Central Java", "Bali", "North Sumatra", "Banten"],
  },
  {
    code: "BR",
    name: "Brazil",
    dialCode: "+55",
    zipMin: 8,
    zipMax: 8,
    phoneMin: 10,
    phoneMax: 11,
    states: ["São Paulo", "Rio de Janeiro", "Minas Gerais", "Bahia", "Paraná", "Rio Grande do Sul", "Distrito Federal"],
  },
  {
    code: "MX",
    name: "Mexico",
    dialCode: "+52",
    zipMin: 5,
    zipMax: 5,
    phoneMin: 10,
    phoneMax: 10,
    states: ["Mexico City", "Jalisco", "Nuevo León", "State of Mexico", "Puebla", "Guanajuato", "Querétaro"],
  },
  {
    code: "NG",
    name: "Nigeria",
    dialCode: "+234",
    zipMin: 6,
    zipMax: 6,
    phoneMin: 10,
    phoneMax: 11,
    states: ["Lagos", "Abuja (FCT)", "Rivers", "Kano", "Oyo", "Kaduna", "Ogun"],
  },
  {
    code: "KE",
    name: "Kenya",
    dialCode: "+254",
    zipMin: 5,
    zipMax: 5,
    phoneMin: 9,
    phoneMax: 10,
    states: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Eldoret"],
  },
];

export function getCountryByCode(code?: string | null): CountryOption {
  const norm = String(code || "IN").trim().toUpperCase();
  return (
    COUNTRY_OPTIONS.find((c) => c.code === norm || c.name.toLowerCase() === norm.toLowerCase()) ||
    COUNTRY_OPTIONS[0]
  );
}

/** Format a Date using the selected standard Date Format + IANA timezone */
export function formatDateWithPattern(
  input: Date | string | number | null | undefined,
  pattern: string = "YYYY-MM-DD",
  timezone: string = "Asia/Kolkata"
): string {
  if (!input) return "—";
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return String(input);

  const tz = resolveIanaTimezone(timezone);
  const fmt = normalizeDateFormat(pattern);
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(dt);

    const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
    const YYYY = get("year");
    const MM = get("month").padStart(2, "0");
    const DD = get("day").padStart(2, "0");

    return fmt.replace("YYYY", YYYY).replace("MM", MM).replace("DD", DD);
  } catch {
    return dt.toLocaleDateString();
  }
}

/** Format a Date using 24 Hour (13:30) or 12 Hour (1:30 PM) + IANA timezone */
export function formatTimeWithPattern(
  input: Date | string | number | null | undefined,
  pattern: string = "24h",
  timezone: string = "Asia/Kolkata"
): string {
  if (!input) return "—";
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return String(input);

  const tz = resolveIanaTimezone(timezone);
  const fmt = normalizeTimeFormat(pattern);
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(dt);

    const get = (t: string) => parts.find((p) => p.type === t)?.value || "00";
    const h24 = Number(get("hour")) % 24;
    const min = get("minute").padStart(2, "0");

    if (fmt === "12h") {
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      const ampm = h24 >= 12 ? "PM" : "AM";
      return `${h12}:${min} ${ampm}`;
    }
    return `${String(h24).padStart(2, "0")}:${min}`;
  } catch {
    return dt.toLocaleTimeString();
  }
}
