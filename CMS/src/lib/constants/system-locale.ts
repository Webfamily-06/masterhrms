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
  { value: "M j, Y", label: "M j, Y", example: "(Jan 1, 2025)" },
  { value: "d-m-Y", label: "d-m-Y", example: "(01-01-2025)" },
  { value: "m-d-Y", label: "m-d-Y", example: "(01-01-2025)" },
  { value: "Y-m-d", label: "Y-m-d", example: "(2025-01-01)" },
  { value: "d M, Y", label: "d M, Y", example: "(01 Jan, 2025)" },
  { value: "d F, Y", label: "d F, Y", example: "(01 January, 2025)" },
  { value: "F j, Y", label: "F j, Y", example: "(January 1, 2025)" },
  { value: "j F Y", label: "j F Y", example: "(1 January 2025)" },
  { value: "D, M j, Y", label: "D, M j, Y", example: "(Thu, Jan 1, 2025)" },
  { value: "l, F j, Y", label: "l, F j, Y", example: "(Thursday, January 1, 2025)" },
  { value: "d/m/Y", label: "d/m/Y", example: "(01/01/2025)" },
];

export const TIME_FORMAT_OPTIONS: Array<{ value: string; label: string; example: string }> = [
  { value: "g:i A", label: "g:i A", example: "(1:30 PM)" },
  { value: "g:i a", label: "g:i a", example: "(1:30 pm)" },
  { value: "h:i A", label: "h:i A", example: "(01:30 PM)" },
  { value: "h:i a", label: "h:i a", example: "(01:30 pm)" },
  { value: "G:i", label: "G:i", example: "(13:30)" },
  { value: "H:i", label: "H:i", example: "(13:30)" },
  { value: "H:i:s", label: "H:i:s", example: "(13:30:00)" },
  { value: "g:i:s A", label: "g:i:s A", example: "(1:30:00 PM)" },
  { value: "g:i:s a", label: "g:i:s a", example: "(1:30:00 pm)" },
  { value: "h:i:s A", label: "h:i:s A", example: "(01:30:00 PM)" },
  { value: "h:i:s a", label: "h:i:s a", example: "(01:30:00 pm)" },
];

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

/** Format a Date using PHP-style Date Format tokens + IANA timezone */
export function formatDateWithPattern(
  input: Date | string | number | null | undefined,
  pattern: string = "Y-m-d",
  timezone: string = "Asia/Kolkata"
): string {
  if (!input) return "—";
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return String(input);

  const tz = resolveIanaTimezone(timezone);
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "long",
    }).formatToParts(dt);

    const monthShort = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short" }).format(dt);
    const monthLong = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "long" }).format(dt);
    const weekdayShort = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(dt);

    const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
    const Y = get("year");
    const m = get("month").padStart(2, "0");
    const d = get("day").padStart(2, "0");
    const j = String(Number(d));
    const l = get("weekday");

    const map: Record<string, string> = {
      Y,
      m,
      d,
      j,
      M: monthShort,
      F: monthLong,
      D: weekdayShort,
      l,
    };

    return pattern.replace(/[YmdjMFDl]/g, (tok) => map[tok] ?? tok);
  } catch {
    return dt.toLocaleDateString();
  }
}

/** Format a Date using PHP-style Time Format tokens + IANA timezone */
export function formatTimeWithPattern(
  input: Date | string | number | null | undefined,
  pattern: string = "h:i a",
  timezone: string = "Asia/Kolkata"
): string {
  if (!input) return "—";
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return String(input);

  const tz = resolveIanaTimezone(timezone);
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(dt);

    const get = (t: string) => parts.find((p) => p.type === t)?.value || "00";
    const h24 = Number(get("hour")) % 24;
    const min = get("minute").padStart(2, "0");
    const sec = get("second").padStart(2, "0");
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const ampm = h24 >= 12 ? "PM" : "AM";

    const map: Record<string, string> = {
      H: String(h24).padStart(2, "0"),
      G: String(h24),
      h: String(h12).padStart(2, "0"),
      g: String(h12),
      i: min,
      s: sec,
      A: ampm,
      a: ampm.toLowerCase(),
    };

    return pattern.replace(/[HGhgisAa]/g, (tok) => map[tok] ?? tok);
  } catch {
    return dt.toLocaleTimeString();
  }
}
