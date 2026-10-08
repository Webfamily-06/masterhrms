export interface TimezoneItem {
  value: string;
  label: string;
  canonical: string;
}

/**
 * Complete canonical timezone dataset (401 global IANA timezones).
 */
export const TIMEZONES: TimezoneItem[] = [
  {
    "value": "UTC",
    "label": "UTC",
    "canonical": "UTC"
  },
  {
    "value": "America/Adak",
    "label": "(UTC-10:00) America/Adak (Hawaii-Aleutian Standard Time)",
    "canonical": "America/Adak"
  },
  {
    "value": "America/Atka",
    "label": "(UTC-10:00) America/Atka (Hawaii-Aleutian Standard Time)",
    "canonical": "America/Atka"
  },
  {
    "value": "America/Anchorage",
    "label": "(UTC-9:00) America/Anchorage (Alaska Standard Time)",
    "canonical": "America/Anchorage"
  },
  {
    "value": "America/Juneau",
    "label": "(UTC-9:00) America/Juneau (Alaska Standard Time)",
    "canonical": "America/Juneau"
  },
  {
    "value": "America/Nome",
    "label": "(UTC-9:00) America/Nome (Alaska Standard Time)",
    "canonical": "America/Nome"
  },
  {
    "value": "America/Yakutat",
    "label": "(UTC-9:00) America/Yakutat (Alaska Standard Time)",
    "canonical": "America/Yakutat"
  },
  {
    "value": "America/Dawson",
    "label": "(UTC-8:00) America/Dawson (Pacific Standard Time)",
    "canonical": "America/Dawson"
  },
  {
    "value": "America/Ensenada",
    "label": "(UTC-8:00) America/Ensenada (Pacific Standard Time)",
    "canonical": "America/Ensenada"
  },
  {
    "value": "America/Los_Angeles",
    "label": "(UTC-8:00) America/Los_Angeles (Pacific Standard Time)",
    "canonical": "America/Los_Angeles"
  },
  {
    "value": "America/Tijuana",
    "label": "(UTC-8:00) America/Tijuana (Pacific Standard Time)",
    "canonical": "America/Tijuana"
  },
  {
    "value": "America/Vancouver",
    "label": "(UTC-8:00) America/Vancouver (Pacific Standard Time)",
    "canonical": "America/Vancouver"
  },
  {
    "value": "America/Whitehorse",
    "label": "(UTC-8:00) America/Whitehorse (Pacific Standard Time)",
    "canonical": "America/Whitehorse"
  },
  {
    "value": "Canada/Pacific",
    "label": "(UTC-8:00) Canada/Pacific (Pacific Standard Time)",
    "canonical": "Canada/Pacific"
  },
  {
    "value": "Canada/Yukon",
    "label": "(UTC-8:00) Canada/Yukon (Pacific Standard Time)",
    "canonical": "Canada/Yukon"
  },
  {
    "value": "Mexico/BajaNorte",
    "label": "(UTC-8:00) Mexico/BajaNorte (Pacific Standard Time)",
    "canonical": "Mexico/BajaNorte"
  },
  {
    "value": "America/Boise",
    "label": "(UTC-7:00) America/Boise (Mountain Standard Time)",
    "canonical": "America/Boise"
  },
  {
    "value": "America/Cambridge_Bay",
    "label": "(UTC-7:00) America/Cambridge_Bay (Mountain Standard Time)",
    "canonical": "America/Cambridge_Bay"
  },
  {
    "value": "America/Chihuahua",
    "label": "(UTC-7:00) America/Chihuahua (Mountain Standard Time)",
    "canonical": "America/Chihuahua"
  },
  {
    "value": "America/Dawson_Creek",
    "label": "(UTC-7:00) America/Dawson_Creek (Mountain Standard Time)",
    "canonical": "America/Dawson_Creek"
  },
  {
    "value": "America/Denver",
    "label": "(UTC-7:00) America/Denver (Mountain Standard Time)",
    "canonical": "America/Denver"
  },
  {
    "value": "America/Edmonton",
    "label": "(UTC-7:00) America/Edmonton (Mountain Standard Time)",
    "canonical": "America/Edmonton"
  },
  {
    "value": "America/Hermosillo",
    "label": "(UTC-7:00) America/Hermosillo (Mountain Standard Time)",
    "canonical": "America/Hermosillo"
  },
  {
    "value": "America/Inuvik",
    "label": "(UTC-7:00) America/Inuvik (Mountain Standard Time)",
    "canonical": "America/Inuvik"
  },
  {
    "value": "America/Mazatlan",
    "label": "(UTC-7:00) America/Mazatlan (Mountain Standard Time)",
    "canonical": "America/Mazatlan"
  },
  {
    "value": "America/Phoenix",
    "label": "(UTC-7:00) America/Phoenix (Mountain Standard Time)",
    "canonical": "America/Phoenix"
  },
  {
    "value": "America/Shiprock",
    "label": "(UTC-7:00) America/Shiprock (Mountain Standard Time)",
    "canonical": "America/Shiprock"
  },
  {
    "value": "America/Yellowknife",
    "label": "(UTC-7:00) America/Yellowknife (Mountain Standard Time)",
    "canonical": "America/Yellowknife"
  },
  {
    "value": "Canada/Mountain",
    "label": "(UTC-7:00) Canada/Mountain (Mountain Standard Time)",
    "canonical": "Canada/Mountain"
  },
  {
    "value": "Mexico/BajaSur",
    "label": "(UTC-7:00) Mexico/BajaSur (Mountain Standard Time)",
    "canonical": "Mexico/BajaSur"
  },
  {
    "value": "America/Belize",
    "label": "(UTC-6:00) America/Belize (Central Standard Time)",
    "canonical": "America/Belize"
  },
  {
    "value": "America/Cancun",
    "label": "(UTC-6:00) America/Cancun (Central Standard Time)",
    "canonical": "America/Cancun"
  },
  {
    "value": "America/Chicago",
    "label": "(UTC-6:00) America/Chicago (Central Standard Time)",
    "canonical": "America/Chicago"
  },
  {
    "value": "America/Costa_Rica",
    "label": "(UTC-6:00) America/Costa_Rica (Central Standard Time)",
    "canonical": "America/Costa_Rica"
  },
  {
    "value": "America/El_Salvador",
    "label": "(UTC-6:00) America/El_Salvador (Central Standard Time)",
    "canonical": "America/El_Salvador"
  },
  {
    "value": "America/Guatemala",
    "label": "(UTC-6:00) America/Guatemala (Central Standard Time)",
    "canonical": "America/Guatemala"
  },
  {
    "value": "America/Knox_IN",
    "label": "(UTC-6:00) America/Knox_IN (Central Standard Time)",
    "canonical": "America/Knox_IN"
  },
  {
    "value": "America/Managua",
    "label": "(UTC-6:00) America/Managua (Central Standard Time)",
    "canonical": "America/Managua"
  },
  {
    "value": "America/Menominee",
    "label": "(UTC-6:00) America/Menominee (Central Standard Time)",
    "canonical": "America/Menominee"
  },
  {
    "value": "America/Merida",
    "label": "(UTC-6:00) America/Merida (Central Standard Time)",
    "canonical": "America/Merida"
  },
  {
    "value": "America/Mexico_City",
    "label": "(UTC-6:00) America/Mexico_City (Central Standard Time)",
    "canonical": "America/Mexico_City"
  },
  {
    "value": "America/Monterrey",
    "label": "(UTC-6:00) America/Monterrey (Central Standard Time)",
    "canonical": "America/Monterrey"
  },
  {
    "value": "America/Rainy_River",
    "label": "(UTC-6:00) America/Rainy_River (Central Standard Time)",
    "canonical": "America/Rainy_River"
  },
  {
    "value": "America/Rankin_Inlet",
    "label": "(UTC-6:00) America/Rankin_Inlet (Central Standard Time)",
    "canonical": "America/Rankin_Inlet"
  },
  {
    "value": "America/Regina",
    "label": "(UTC-6:00) America/Regina (Central Standard Time)",
    "canonical": "America/Regina"
  },
  {
    "value": "America/Swift_Current",
    "label": "(UTC-6:00) America/Swift_Current (Central Standard Time)",
    "canonical": "America/Swift_Current"
  },
  {
    "value": "America/Tegucigalpa",
    "label": "(UTC-6:00) America/Tegucigalpa (Central Standard Time)",
    "canonical": "America/Tegucigalpa"
  },
  {
    "value": "America/Winnipeg",
    "label": "(UTC-6:00) America/Winnipeg (Central Standard Time)",
    "canonical": "America/Winnipeg"
  },
  {
    "value": "Canada/Central",
    "label": "(UTC-6:00) Canada/Central (Central Standard Time)",
    "canonical": "Canada/Central"
  },
  {
    "value": "Canada/East-Saskatchewan",
    "label": "(UTC-6:00) Canada/East-Saskatchewan (Central Standard Time)",
    "canonical": "Canada/East-Saskatchewan"
  },
  {
    "value": "Canada/Saskatchewan",
    "label": "(UTC-6:00) Canada/Saskatchewan (Central Standard Time)",
    "canonical": "Canada/Saskatchewan"
  },
  {
    "value": "Chile/EasterIsland",
    "label": "(UTC-6:00) Chile/EasterIsland (Easter Is. Time)",
    "canonical": "Chile/EasterIsland"
  },
  {
    "value": "Mexico/General",
    "label": "(UTC-6:00) Mexico/General (Central Standard Time)",
    "canonical": "Mexico/General"
  },
  {
    "value": "America/Atikokan",
    "label": "(UTC-5:00) America/Atikokan (Eastern Standard Time)",
    "canonical": "America/Atikokan"
  },
  {
    "value": "America/Bogota",
    "label": "(UTC-5:00) America/Bogota (Colombia Time)",
    "canonical": "America/Bogota"
  },
  {
    "value": "America/Cayman",
    "label": "(UTC-5:00) America/Cayman (Eastern Standard Time)",
    "canonical": "America/Cayman"
  },
  {
    "value": "America/Coral_Harbour",
    "label": "(UTC-5:00) America/Coral_Harbour (Eastern Standard Time)",
    "canonical": "America/Coral_Harbour"
  },
  {
    "value": "America/Detroit",
    "label": "(UTC-5:00) America/Detroit (Eastern Standard Time)",
    "canonical": "America/Detroit"
  },
  {
    "value": "America/Fort_Wayne",
    "label": "(UTC-5:00) America/Fort_Wayne (Eastern Standard Time)",
    "canonical": "America/Fort_Wayne"
  },
  {
    "value": "America/Grand_Turk",
    "label": "(UTC-5:00) America/Grand_Turk (Eastern Standard Time)",
    "canonical": "America/Grand_Turk"
  },
  {
    "value": "America/Guayaquil",
    "label": "(UTC-5:00) America/Guayaquil (Ecuador Time)",
    "canonical": "America/Guayaquil"
  },
  {
    "value": "America/Havana",
    "label": "(UTC-5:00) America/Havana (Cuba Standard Time)",
    "canonical": "America/Havana"
  },
  {
    "value": "America/Indianapolis",
    "label": "(UTC-5:00) America/Indianapolis (Eastern Standard Time)",
    "canonical": "America/Indianapolis"
  },
  {
    "value": "America/Iqaluit",
    "label": "(UTC-5:00) America/Iqaluit (Eastern Standard Time)",
    "canonical": "America/Iqaluit"
  },
  {
    "value": "America/Jamaica",
    "label": "(UTC-5:00) America/Jamaica (Eastern Standard Time)",
    "canonical": "America/Jamaica"
  },
  {
    "value": "America/Lima",
    "label": "(UTC-5:00) America/Lima (Peru Time)",
    "canonical": "America/Lima"
  },
  {
    "value": "America/Louisville",
    "label": "(UTC-5:00) America/Louisville (Eastern Standard Time)",
    "canonical": "America/Louisville"
  },
  {
    "value": "America/Montreal",
    "label": "(UTC-5:00) America/Montreal (Eastern Standard Time)",
    "canonical": "America/Montreal"
  },
  {
    "value": "America/Nassau",
    "label": "(UTC-5:00) America/Nassau (Eastern Standard Time)",
    "canonical": "America/Nassau"
  },
  {
    "value": "America/New_York",
    "label": "(UTC-5:00) America/New_York (Eastern Standard Time)",
    "canonical": "America/New_York"
  },
  {
    "value": "America/Nipigon",
    "label": "(UTC-5:00) America/Nipigon (Eastern Standard Time)",
    "canonical": "America/Nipigon"
  },
  {
    "value": "America/Panama",
    "label": "(UTC-5:00) America/Panama (Eastern Standard Time)",
    "canonical": "America/Panama"
  },
  {
    "value": "America/Pangnirtung",
    "label": "(UTC-5:00) America/Pangnirtung (Eastern Standard Time)",
    "canonical": "America/Pangnirtung"
  },
  {
    "value": "America/Port-au-Prince",
    "label": "(UTC-5:00) America/Port-au-Prince (Eastern Standard Time)",
    "canonical": "America/Port-au-Prince"
  },
  {
    "value": "America/Resolute",
    "label": "(UTC-5:00) America/Resolute (Eastern Standard Time)",
    "canonical": "America/Resolute"
  },
  {
    "value": "America/Thunder_Bay",
    "label": "(UTC-5:00) America/Thunder_Bay (Eastern Standard Time)",
    "canonical": "America/Thunder_Bay"
  },
  {
    "value": "America/Toronto",
    "label": "(UTC-5:00) America/Toronto (Eastern Standard Time)",
    "canonical": "America/Toronto"
  },
  {
    "value": "Canada/Eastern",
    "label": "(UTC-5:00) Canada/Eastern (Eastern Standard Time)",
    "canonical": "Canada/Eastern"
  },
  {
    "value": "America/Caracas",
    "label": "(UTC-4:-30) America/Caracas (Venezuela Time)",
    "canonical": "America/Caracas"
  },
  {
    "value": "America/Anguilla",
    "label": "(UTC-4:00) America/Anguilla (Atlantic Standard Time)",
    "canonical": "America/Anguilla"
  },
  {
    "value": "America/Antigua",
    "label": "(UTC-4:00) America/Antigua (Atlantic Standard Time)",
    "canonical": "America/Antigua"
  },
  {
    "value": "America/Aruba",
    "label": "(UTC-4:00) America/Aruba (Atlantic Standard Time)",
    "canonical": "America/Aruba"
  },
  {
    "value": "America/Asuncion",
    "label": "(UTC-4:00) America/Asuncion (Paraguay Time)",
    "canonical": "America/Asuncion"
  },
  {
    "value": "America/Barbados",
    "label": "(UTC-4:00) America/Barbados (Atlantic Standard Time)",
    "canonical": "America/Barbados"
  },
  {
    "value": "America/Blanc-Sablon",
    "label": "(UTC-4:00) America/Blanc-Sablon (Atlantic Standard Time)",
    "canonical": "America/Blanc-Sablon"
  },
  {
    "value": "America/Boa_Vista",
    "label": "(UTC-4:00) America/Boa_Vista (Amazon Time)",
    "canonical": "America/Boa_Vista"
  },
  {
    "value": "America/Campo_Grande",
    "label": "(UTC-4:00) America/Campo_Grande (Amazon Time)",
    "canonical": "America/Campo_Grande"
  },
  {
    "value": "America/Cuiaba",
    "label": "(UTC-4:00) America/Cuiaba (Amazon Time)",
    "canonical": "America/Cuiaba"
  },
  {
    "value": "America/Curacao",
    "label": "(UTC-4:00) America/Curacao (Atlantic Standard Time)",
    "canonical": "America/Curacao"
  },
  {
    "value": "America/Dominica",
    "label": "(UTC-4:00) America/Dominica (Atlantic Standard Time)",
    "canonical": "America/Dominica"
  },
  {
    "value": "America/Eirunepe",
    "label": "(UTC-4:00) America/Eirunepe (Amazon Time)",
    "canonical": "America/Eirunepe"
  },
  {
    "value": "America/Glace_Bay",
    "label": "(UTC-4:00) America/Glace_Bay (Atlantic Standard Time)",
    "canonical": "America/Glace_Bay"
  },
  {
    "value": "America/Goose_Bay",
    "label": "(UTC-4:00) America/Goose_Bay (Atlantic Standard Time)",
    "canonical": "America/Goose_Bay"
  },
  {
    "value": "America/Grenada",
    "label": "(UTC-4:00) America/Grenada (Atlantic Standard Time)",
    "canonical": "America/Grenada"
  },
  {
    "value": "America/Guadeloupe",
    "label": "(UTC-4:00) America/Guadeloupe (Atlantic Standard Time)",
    "canonical": "America/Guadeloupe"
  },
  {
    "value": "America/Guyana",
    "label": "(UTC-4:00) America/Guyana (Guyana Time)",
    "canonical": "America/Guyana"
  },
  {
    "value": "America/Halifax",
    "label": "(UTC-4:00) America/Halifax (Atlantic Standard Time)",
    "canonical": "America/Halifax"
  },
  {
    "value": "America/La_Paz",
    "label": "(UTC-4:00) America/La_Paz (Bolivia Time)",
    "canonical": "America/La_Paz"
  },
  {
    "value": "America/Manaus",
    "label": "(UTC-4:00) America/Manaus (Amazon Time)",
    "canonical": "America/Manaus"
  },
  {
    "value": "America/Marigot",
    "label": "(UTC-4:00) America/Marigot (Atlantic Standard Time)",
    "canonical": "America/Marigot"
  },
  {
    "value": "America/Martinique",
    "label": "(UTC-4:00) America/Martinique (Atlantic Standard Time)",
    "canonical": "America/Martinique"
  },
  {
    "value": "America/Moncton",
    "label": "(UTC-4:00) America/Moncton (Atlantic Standard Time)",
    "canonical": "America/Moncton"
  },
  {
    "value": "America/Montserrat",
    "label": "(UTC-4:00) America/Montserrat (Atlantic Standard Time)",
    "canonical": "America/Montserrat"
  },
  {
    "value": "America/Port_of_Spain",
    "label": "(UTC-4:00) America/Port_of_Spain (Atlantic Standard Time)",
    "canonical": "America/Port_of_Spain"
  },
  {
    "value": "America/Porto_Acre",
    "label": "(UTC-4:00) America/Porto_Acre (Amazon Time)",
    "canonical": "America/Porto_Acre"
  },
  {
    "value": "America/Porto_Velho",
    "label": "(UTC-4:00) America/Porto_Velho (Amazon Time)",
    "canonical": "America/Porto_Velho"
  },
  {
    "value": "America/Puerto_Rico",
    "label": "(UTC-4:00) America/Puerto_Rico (Atlantic Standard Time)",
    "canonical": "America/Puerto_Rico"
  },
  {
    "value": "America/Rio_Branco",
    "label": "(UTC-4:00) America/Rio_Branco (Amazon Time)",
    "canonical": "America/Rio_Branco"
  },
  {
    "value": "America/Santiago",
    "label": "(UTC-4:00) America/Santiago (Chile Time)",
    "canonical": "America/Santiago"
  },
  {
    "value": "America/Santo_Domingo",
    "label": "(UTC-4:00) America/Santo_Domingo (Atlantic Standard Time)",
    "canonical": "America/Santo_Domingo"
  },
  {
    "value": "America/St_Barthelemy",
    "label": "(UTC-4:00) America/St_Barthelemy (Atlantic Standard Time)",
    "canonical": "America/St_Barthelemy"
  },
  {
    "value": "America/St_Kitts",
    "label": "(UTC-4:00) America/St_Kitts (Atlantic Standard Time)",
    "canonical": "America/St_Kitts"
  },
  {
    "value": "America/St_Lucia",
    "label": "(UTC-4:00) America/St_Lucia (Atlantic Standard Time)",
    "canonical": "America/St_Lucia"
  },
  {
    "value": "America/St_Thomas",
    "label": "(UTC-4:00) America/St_Thomas (Atlantic Standard Time)",
    "canonical": "America/St_Thomas"
  },
  {
    "value": "America/St_Vincent",
    "label": "(UTC-4:00) America/St_Vincent (Atlantic Standard Time)",
    "canonical": "America/St_Vincent"
  },
  {
    "value": "America/Thule",
    "label": "(UTC-4:00) America/Thule (Atlantic Standard Time)",
    "canonical": "America/Thule"
  },
  {
    "value": "America/Tortola",
    "label": "(UTC-4:00) America/Tortola (Atlantic Standard Time)",
    "canonical": "America/Tortola"
  },
  {
    "value": "America/Virgin",
    "label": "(UTC-4:00) America/Virgin (Atlantic Standard Time)",
    "canonical": "America/Virgin"
  },
  {
    "value": "Antarctica/Palmer",
    "label": "(UTC-4:00) Antarctica/Palmer (Chile Time)",
    "canonical": "Antarctica/Palmer"
  },
  {
    "value": "Atlantic/Bermuda",
    "label": "(UTC-4:00) Atlantic/Bermuda (Atlantic Standard Time)",
    "canonical": "Atlantic/Bermuda"
  },
  {
    "value": "Atlantic/Stanley",
    "label": "(UTC-4:00) Atlantic/Stanley (Falkland Is. Time)",
    "canonical": "Atlantic/Stanley"
  },
  {
    "value": "Brazil/Acre",
    "label": "(UTC-4:00) Brazil/Acre (Amazon Time)",
    "canonical": "Brazil/Acre"
  },
  {
    "value": "Brazil/West",
    "label": "(UTC-4:00) Brazil/West (Amazon Time)",
    "canonical": "Brazil/West"
  },
  {
    "value": "Canada/Atlantic",
    "label": "(UTC-4:00) Canada/Atlantic (Atlantic Standard Time)",
    "canonical": "Canada/Atlantic"
  },
  {
    "value": "Chile/Continental",
    "label": "(UTC-4:00) Chile/Continental (Chile Time)",
    "canonical": "Chile/Continental"
  },
  {
    "value": "America/St_Johns",
    "label": "(UTC-3:-30) America/St_Johns (Newfoundland Standard Time)",
    "canonical": "America/St_Johns"
  },
  {
    "value": "Canada/Newfoundland",
    "label": "(UTC-3:-30) Canada/Newfoundland (Newfoundland Standard Time)",
    "canonical": "Canada/Newfoundland"
  },
  {
    "value": "America/Araguaina",
    "label": "(UTC-3:00) America/Araguaina (Brasilia Time)",
    "canonical": "America/Araguaina"
  },
  {
    "value": "America/Bahia",
    "label": "(UTC-3:00) America/Bahia (Brasilia Time)",
    "canonical": "America/Bahia"
  },
  {
    "value": "America/Belem",
    "label": "(UTC-3:00) America/Belem (Brasilia Time)",
    "canonical": "America/Belem"
  },
  {
    "value": "America/Buenos_Aires",
    "label": "(UTC-3:00) America/Buenos_Aires (Argentine Time)",
    "canonical": "America/Buenos_Aires"
  },
  {
    "value": "America/Catamarca",
    "label": "(UTC-3:00) America/Catamarca (Argentine Time)",
    "canonical": "America/Catamarca"
  },
  {
    "value": "America/Cayenne",
    "label": "(UTC-3:00) America/Cayenne (French Guiana Time)",
    "canonical": "America/Cayenne"
  },
  {
    "value": "America/Cordoba",
    "label": "(UTC-3:00) America/Cordoba (Argentine Time)",
    "canonical": "America/Cordoba"
  },
  {
    "value": "America/Fortaleza",
    "label": "(UTC-3:00) America/Fortaleza (Brasilia Time)",
    "canonical": "America/Fortaleza"
  },
  {
    "value": "America/Godthab",
    "label": "(UTC-3:00) America/Godthab (Western Greenland Time)",
    "canonical": "America/Godthab"
  },
  {
    "value": "America/Jujuy",
    "label": "(UTC-3:00) America/Jujuy (Argentine Time)",
    "canonical": "America/Jujuy"
  },
  {
    "value": "America/Maceio",
    "label": "(UTC-3:00) America/Maceio (Brasilia Time)",
    "canonical": "America/Maceio"
  },
  {
    "value": "America/Mendoza",
    "label": "(UTC-3:00) America/Mendoza (Argentine Time)",
    "canonical": "America/Mendoza"
  },
  {
    "value": "America/Miquelon",
    "label": "(UTC-3:00) America/Miquelon (Pierre & Miquelon Standard Time)",
    "canonical": "America/Miquelon"
  },
  {
    "value": "America/Montevideo",
    "label": "(UTC-3:00) America/Montevideo (Uruguay Time)",
    "canonical": "America/Montevideo"
  },
  {
    "value": "America/Paramaribo",
    "label": "(UTC-3:00) America/Paramaribo (Suriname Time)",
    "canonical": "America/Paramaribo"
  },
  {
    "value": "America/Recife",
    "label": "(UTC-3:00) America/Recife (Brasilia Time)",
    "canonical": "America/Recife"
  },
  {
    "value": "America/Rosario",
    "label": "(UTC-3:00) America/Rosario (Argentine Time)",
    "canonical": "America/Rosario"
  },
  {
    "value": "America/Santarem",
    "label": "(UTC-3:00) America/Santarem (Brasilia Time)",
    "canonical": "America/Santarem"
  },
  {
    "value": "America/Sao_Paulo",
    "label": "(UTC-3:00) America/Sao_Paulo (Brasilia Time)",
    "canonical": "America/Sao_Paulo"
  },
  {
    "value": "Antarctica/Rothera",
    "label": "(UTC-3:00) Antarctica/Rothera (Rothera Time)",
    "canonical": "Antarctica/Rothera"
  },
  {
    "value": "Brazil/East",
    "label": "(UTC-3:00) Brazil/East (Brasilia Time)",
    "canonical": "Brazil/East"
  },
  {
    "value": "America/Noronha",
    "label": "(UTC-2:00) America/Noronha (Fernando de Noronha Time)",
    "canonical": "America/Noronha"
  },
  {
    "value": "Atlantic/South_Georgia",
    "label": "(UTC-2:00) Atlantic/South_Georgia (South Georgia Standard Time)",
    "canonical": "Atlantic/South_Georgia"
  },
  {
    "value": "Brazil/DeNoronha",
    "label": "(UTC-2:00) Brazil/DeNoronha (Fernando de Noronha Time)",
    "canonical": "Brazil/DeNoronha"
  },
  {
    "value": "America/Scoresbysund",
    "label": "(UTC-1:00) America/Scoresbysund (Eastern Greenland Time)",
    "canonical": "America/Scoresbysund"
  },
  {
    "value": "Atlantic/Azores",
    "label": "(UTC-1:00) Atlantic/Azores (Azores Time)",
    "canonical": "Atlantic/Azores"
  },
  {
    "value": "Atlantic/Cape_Verde",
    "label": "(UTC-1:00) Atlantic/Cape_Verde (Cape Verde Time)",
    "canonical": "Atlantic/Cape_Verde"
  },
  {
    "value": "Africa/Abidjan",
    "label": "(UTC+0:00) Africa/Abidjan (Greenwich Mean Time)",
    "canonical": "Africa/Abidjan"
  },
  {
    "value": "Africa/Accra",
    "label": "(UTC+0:00) Africa/Accra (Ghana Mean Time)",
    "canonical": "Africa/Accra"
  },
  {
    "value": "Africa/Bamako",
    "label": "(UTC+0:00) Africa/Bamako (Greenwich Mean Time)",
    "canonical": "Africa/Bamako"
  },
  {
    "value": "Africa/Banjul",
    "label": "(UTC+0:00) Africa/Banjul (Greenwich Mean Time)",
    "canonical": "Africa/Banjul"
  },
  {
    "value": "Africa/Bissau",
    "label": "(UTC+0:00) Africa/Bissau (Greenwich Mean Time)",
    "canonical": "Africa/Bissau"
  },
  {
    "value": "Africa/Casablanca",
    "label": "(UTC+0:00) Africa/Casablanca (Western European Time)",
    "canonical": "Africa/Casablanca"
  },
  {
    "value": "Africa/Conakry",
    "label": "(UTC+0:00) Africa/Conakry (Greenwich Mean Time)",
    "canonical": "Africa/Conakry"
  },
  {
    "value": "Africa/Dakar",
    "label": "(UTC+0:00) Africa/Dakar (Greenwich Mean Time)",
    "canonical": "Africa/Dakar"
  },
  {
    "value": "Africa/El_Aaiun",
    "label": "(UTC+0:00) Africa/El_Aaiun (Western European Time)",
    "canonical": "Africa/El_Aaiun"
  },
  {
    "value": "Africa/Freetown",
    "label": "(UTC+0:00) Africa/Freetown (Greenwich Mean Time)",
    "canonical": "Africa/Freetown"
  },
  {
    "value": "Africa/Lome",
    "label": "(UTC+0:00) Africa/Lome (Greenwich Mean Time)",
    "canonical": "Africa/Lome"
  },
  {
    "value": "Africa/Monrovia",
    "label": "(UTC+0:00) Africa/Monrovia (Greenwich Mean Time)",
    "canonical": "Africa/Monrovia"
  },
  {
    "value": "Africa/Nouakchott",
    "label": "(UTC+0:00) Africa/Nouakchott (Greenwich Mean Time)",
    "canonical": "Africa/Nouakchott"
  },
  {
    "value": "Africa/Ouagadougou",
    "label": "(UTC+0:00) Africa/Ouagadougou (Greenwich Mean Time)",
    "canonical": "Africa/Ouagadougou"
  },
  {
    "value": "Africa/Sao_Tome",
    "label": "(UTC+0:00) Africa/Sao_Tome (Greenwich Mean Time)",
    "canonical": "Africa/Sao_Tome"
  },
  {
    "value": "Africa/Timbuktu",
    "label": "(UTC+0:00) Africa/Timbuktu (Greenwich Mean Time)",
    "canonical": "Africa/Timbuktu"
  },
  {
    "value": "America/Danmarkshavn",
    "label": "(UTC+0:00) America/Danmarkshavn (Greenwich Mean Time)",
    "canonical": "America/Danmarkshavn"
  },
  {
    "value": "Atlantic/Canary",
    "label": "(UTC+0:00) Atlantic/Canary (Western European Time)",
    "canonical": "Atlantic/Canary"
  },
  {
    "value": "Atlantic/Faeroe",
    "label": "(UTC+0:00) Atlantic/Faeroe (Western European Time)",
    "canonical": "Atlantic/Faeroe"
  },
  {
    "value": "Atlantic/Faroe",
    "label": "(UTC+0:00) Atlantic/Faroe (Western European Time)",
    "canonical": "Atlantic/Faroe"
  },
  {
    "value": "Atlantic/Madeira",
    "label": "(UTC+0:00) Atlantic/Madeira (Western European Time)",
    "canonical": "Atlantic/Madeira"
  },
  {
    "value": "Atlantic/Reykjavik",
    "label": "(UTC+0:00) Atlantic/Reykjavik (Greenwich Mean Time)",
    "canonical": "Atlantic/Reykjavik"
  },
  {
    "value": "Atlantic/St_Helena",
    "label": "(UTC+0:00) Atlantic/St_Helena (Greenwich Mean Time)",
    "canonical": "Atlantic/St_Helena"
  },
  {
    "value": "Europe/Belfast",
    "label": "(UTC+0:00) Europe/Belfast (Greenwich Mean Time)",
    "canonical": "Europe/Belfast"
  },
  {
    "value": "Europe/Dublin",
    "label": "(UTC+0:00) Europe/Dublin (Greenwich Mean Time)",
    "canonical": "Europe/Dublin"
  },
  {
    "value": "Europe/Guernsey",
    "label": "(UTC+0:00) Europe/Guernsey (Greenwich Mean Time)",
    "canonical": "Europe/Guernsey"
  },
  {
    "value": "Europe/Isle_of_Man",
    "label": "(UTC+0:00) Europe/Isle_of_Man (Greenwich Mean Time)",
    "canonical": "Europe/Isle_of_Man"
  },
  {
    "value": "Europe/Jersey",
    "label": "(UTC+0:00) Europe/Jersey (Greenwich Mean Time)",
    "canonical": "Europe/Jersey"
  },
  {
    "value": "Europe/Lisbon",
    "label": "(UTC+0:00) Europe/Lisbon (Western European Time)",
    "canonical": "Europe/Lisbon"
  },
  {
    "value": "Europe/London",
    "label": "(UTC+0:00) Europe/London (Greenwich Mean Time)",
    "canonical": "Europe/London"
  },
  {
    "value": "Africa/Algiers",
    "label": "(UTC+1:00) Africa/Algiers (Central European Time)",
    "canonical": "Africa/Algiers"
  },
  {
    "value": "Africa/Bangui",
    "label": "(UTC+1:00) Africa/Bangui (Western African Time)",
    "canonical": "Africa/Bangui"
  },
  {
    "value": "Africa/Brazzaville",
    "label": "(UTC+1:00) Africa/Brazzaville (Western African Time)",
    "canonical": "Africa/Brazzaville"
  },
  {
    "value": "Africa/Ceuta",
    "label": "(UTC+1:00) Africa/Ceuta (Central European Time)",
    "canonical": "Africa/Ceuta"
  },
  {
    "value": "Africa/Douala",
    "label": "(UTC+1:00) Africa/Douala (Western African Time)",
    "canonical": "Africa/Douala"
  },
  {
    "value": "Africa/Kinshasa",
    "label": "(UTC+1:00) Africa/Kinshasa (Western African Time)",
    "canonical": "Africa/Kinshasa"
  },
  {
    "value": "Africa/Lagos",
    "label": "(UTC+1:00) Africa/Lagos (Western African Time)",
    "canonical": "Africa/Lagos"
  },
  {
    "value": "Africa/Libreville",
    "label": "(UTC+1:00) Africa/Libreville (Western African Time)",
    "canonical": "Africa/Libreville"
  },
  {
    "value": "Africa/Luanda",
    "label": "(UTC+1:00) Africa/Luanda (Western African Time)",
    "canonical": "Africa/Luanda"
  },
  {
    "value": "Africa/Malabo",
    "label": "(UTC+1:00) Africa/Malabo (Western African Time)",
    "canonical": "Africa/Malabo"
  },
  {
    "value": "Africa/Ndjamena",
    "label": "(UTC+1:00) Africa/Ndjamena (Western African Time)",
    "canonical": "Africa/Ndjamena"
  },
  {
    "value": "Africa/Niamey",
    "label": "(UTC+1:00) Africa/Niamey (Western African Time)",
    "canonical": "Africa/Niamey"
  },
  {
    "value": "Africa/Porto-Novo",
    "label": "(UTC+1:00) Africa/Porto-Novo (Western African Time)",
    "canonical": "Africa/Porto-Novo"
  },
  {
    "value": "Africa/Tunis",
    "label": "(UTC+1:00) Africa/Tunis (Central European Time)",
    "canonical": "Africa/Tunis"
  },
  {
    "value": "Africa/Windhoek",
    "label": "(UTC+1:00) Africa/Windhoek (Western African Time)",
    "canonical": "Africa/Windhoek"
  },
  {
    "value": "Arctic/Longyearbyen",
    "label": "(UTC+1:00) Arctic/Longyearbyen (Central European Time)",
    "canonical": "Arctic/Longyearbyen"
  },
  {
    "value": "Atlantic/Jan_Mayen",
    "label": "(UTC+1:00) Atlantic/Jan_Mayen (Central European Time)",
    "canonical": "Atlantic/Jan_Mayen"
  },
  {
    "value": "Europe/Amsterdam",
    "label": "(UTC+1:00) Europe/Amsterdam (Central European Time)",
    "canonical": "Europe/Amsterdam"
  },
  {
    "value": "Europe/Andorra",
    "label": "(UTC+1:00) Europe/Andorra (Central European Time)",
    "canonical": "Europe/Andorra"
  },
  {
    "value": "Europe/Belgrade",
    "label": "(UTC+1:00) Europe/Belgrade (Central European Time)",
    "canonical": "Europe/Belgrade"
  },
  {
    "value": "Europe/Berlin",
    "label": "(UTC+1:00) Europe/Berlin (Central European Time)",
    "canonical": "Europe/Berlin"
  },
  {
    "value": "Europe/Bratislava",
    "label": "(UTC+1:00) Europe/Bratislava (Central European Time)",
    "canonical": "Europe/Bratislava"
  },
  {
    "value": "Europe/Brussels",
    "label": "(UTC+1:00) Europe/Brussels (Central European Time)",
    "canonical": "Europe/Brussels"
  },
  {
    "value": "Europe/Budapest",
    "label": "(UTC+1:00) Europe/Budapest (Central European Time)",
    "canonical": "Europe/Budapest"
  },
  {
    "value": "Europe/Copenhagen",
    "label": "(UTC+1:00) Europe/Copenhagen (Central European Time)",
    "canonical": "Europe/Copenhagen"
  },
  {
    "value": "Europe/Gibraltar",
    "label": "(UTC+1:00) Europe/Gibraltar (Central European Time)",
    "canonical": "Europe/Gibraltar"
  },
  {
    "value": "Europe/Ljubljana",
    "label": "(UTC+1:00) Europe/Ljubljana (Central European Time)",
    "canonical": "Europe/Ljubljana"
  },
  {
    "value": "Europe/Luxembourg",
    "label": "(UTC+1:00) Europe/Luxembourg (Central European Time)",
    "canonical": "Europe/Luxembourg"
  },
  {
    "value": "Europe/Madrid",
    "label": "(UTC+1:00) Europe/Madrid (Central European Time)",
    "canonical": "Europe/Madrid"
  },
  {
    "value": "Europe/Malta",
    "label": "(UTC+1:00) Europe/Malta (Central European Time)",
    "canonical": "Europe/Malta"
  },
  {
    "value": "Europe/Monaco",
    "label": "(UTC+1:00) Europe/Monaco (Central European Time)",
    "canonical": "Europe/Monaco"
  },
  {
    "value": "Europe/Oslo",
    "label": "(UTC+1:00) Europe/Oslo (Central European Time)",
    "canonical": "Europe/Oslo"
  },
  {
    "value": "Europe/Paris",
    "label": "(UTC+1:00) Europe/Paris (Central European Time)",
    "canonical": "Europe/Paris"
  },
  {
    "value": "Europe/Podgorica",
    "label": "(UTC+1:00) Europe/Podgorica (Central European Time)",
    "canonical": "Europe/Podgorica"
  },
  {
    "value": "Europe/Prague",
    "label": "(UTC+1:00) Europe/Prague (Central European Time)",
    "canonical": "Europe/Prague"
  },
  {
    "value": "Europe/Rome",
    "label": "(UTC+1:00) Europe/Rome (Central European Time)",
    "canonical": "Europe/Rome"
  },
  {
    "value": "Europe/San_Marino",
    "label": "(UTC+1:00) Europe/San_Marino (Central European Time)",
    "canonical": "Europe/San_Marino"
  },
  {
    "value": "Europe/Sarajevo",
    "label": "(UTC+1:00) Europe/Sarajevo (Central European Time)",
    "canonical": "Europe/Sarajevo"
  },
  {
    "value": "Europe/Skopje",
    "label": "(UTC+1:00) Europe/Skopje (Central European Time)",
    "canonical": "Europe/Skopje"
  },
  {
    "value": "Europe/Stockholm",
    "label": "(UTC+1:00) Europe/Stockholm (Central European Time)",
    "canonical": "Europe/Stockholm"
  },
  {
    "value": "Europe/Tirane",
    "label": "(UTC+1:00) Europe/Tirane (Central European Time)",
    "canonical": "Europe/Tirane"
  },
  {
    "value": "Europe/Vaduz",
    "label": "(UTC+1:00) Europe/Vaduz (Central European Time)",
    "canonical": "Europe/Vaduz"
  },
  {
    "value": "Europe/Vatican",
    "label": "(UTC+1:00) Europe/Vatican (Central European Time)",
    "canonical": "Europe/Vatican"
  },
  {
    "value": "Europe/Vienna",
    "label": "(UTC+1:00) Europe/Vienna (Central European Time)",
    "canonical": "Europe/Vienna"
  },
  {
    "value": "Europe/Warsaw",
    "label": "(UTC+1:00) Europe/Warsaw (Central European Time)",
    "canonical": "Europe/Warsaw"
  },
  {
    "value": "Europe/Zagreb",
    "label": "(UTC+1:00) Europe/Zagreb (Central European Time)",
    "canonical": "Europe/Zagreb"
  },
  {
    "value": "Europe/Zurich",
    "label": "(UTC+1:00) Europe/Zurich (Central European Time)",
    "canonical": "Europe/Zurich"
  },
  {
    "value": "Africa/Blantyre",
    "label": "(UTC+2:00) Africa/Blantyre (Central African Time)",
    "canonical": "Africa/Blantyre"
  },
  {
    "value": "Africa/Bujumbura",
    "label": "(UTC+2:00) Africa/Bujumbura (Central African Time)",
    "canonical": "Africa/Bujumbura"
  },
  {
    "value": "Africa/Cairo",
    "label": "(UTC+2:00) Africa/Cairo (Eastern European Time)",
    "canonical": "Africa/Cairo"
  },
  {
    "value": "Africa/Gaborone",
    "label": "(UTC+2:00) Africa/Gaborone (Central African Time)",
    "canonical": "Africa/Gaborone"
  },
  {
    "value": "Africa/Harare",
    "label": "(UTC+2:00) Africa/Harare (Central African Time)",
    "canonical": "Africa/Harare"
  },
  {
    "value": "Africa/Johannesburg",
    "label": "(UTC+2:00) Africa/Johannesburg (South Africa Standard Time)",
    "canonical": "Africa/Johannesburg"
  },
  {
    "value": "Africa/Kigali",
    "label": "(UTC+2:00) Africa/Kigali (Central African Time)",
    "canonical": "Africa/Kigali"
  },
  {
    "value": "Africa/Lubumbashi",
    "label": "(UTC+2:00) Africa/Lubumbashi (Central African Time)",
    "canonical": "Africa/Lubumbashi"
  },
  {
    "value": "Africa/Lusaka",
    "label": "(UTC+2:00) Africa/Lusaka (Central African Time)",
    "canonical": "Africa/Lusaka"
  },
  {
    "value": "Africa/Maputo",
    "label": "(UTC+2:00) Africa/Maputo (Central African Time)",
    "canonical": "Africa/Maputo"
  },
  {
    "value": "Africa/Maseru",
    "label": "(UTC+2:00) Africa/Maseru (South Africa Standard Time)",
    "canonical": "Africa/Maseru"
  },
  {
    "value": "Africa/Mbabane",
    "label": "(UTC+2:00) Africa/Mbabane (South Africa Standard Time)",
    "canonical": "Africa/Mbabane"
  },
  {
    "value": "Africa/Tripoli",
    "label": "(UTC+2:00) Africa/Tripoli (Eastern European Time)",
    "canonical": "Africa/Tripoli"
  },
  {
    "value": "Asia/Amman",
    "label": "(UTC+2:00) Asia/Amman (Eastern European Time)",
    "canonical": "Asia/Amman"
  },
  {
    "value": "Asia/Beirut",
    "label": "(UTC+2:00) Asia/Beirut (Eastern European Time)",
    "canonical": "Asia/Beirut"
  },
  {
    "value": "Asia/Damascus",
    "label": "(UTC+2:00) Asia/Damascus (Eastern European Time)",
    "canonical": "Asia/Damascus"
  },
  {
    "value": "Asia/Gaza",
    "label": "(UTC+2:00) Asia/Gaza (Eastern European Time)",
    "canonical": "Asia/Gaza"
  },
  {
    "value": "Asia/Istanbul",
    "label": "(UTC+2:00) Asia/Istanbul (Eastern European Time)",
    "canonical": "Asia/Istanbul"
  },
  {
    "value": "Asia/Jerusalem",
    "label": "(UTC+2:00) Asia/Jerusalem (Israel Standard Time)",
    "canonical": "Asia/Jerusalem"
  },
  {
    "value": "Asia/Nicosia",
    "label": "(UTC+2:00) Asia/Nicosia (Eastern European Time)",
    "canonical": "Asia/Nicosia"
  },
  {
    "value": "Asia/Tel_Aviv",
    "label": "(UTC+2:00) Asia/Tel_Aviv (Israel Standard Time)",
    "canonical": "Asia/Tel_Aviv"
  },
  {
    "value": "Europe/Athens",
    "label": "(UTC+2:00) Europe/Athens (Eastern European Time)",
    "canonical": "Europe/Athens"
  },
  {
    "value": "Europe/Bucharest",
    "label": "(UTC+2:00) Europe/Bucharest (Eastern European Time)",
    "canonical": "Europe/Bucharest"
  },
  {
    "value": "Europe/Chisinau",
    "label": "(UTC+2:00) Europe/Chisinau (Eastern European Time)",
    "canonical": "Europe/Chisinau"
  },
  {
    "value": "Europe/Helsinki",
    "label": "(UTC+2:00) Europe/Helsinki (Eastern European Time)",
    "canonical": "Europe/Helsinki"
  },
  {
    "value": "Europe/Istanbul",
    "label": "(UTC+2:00) Europe/Istanbul (Eastern European Time)",
    "canonical": "Europe/Istanbul"
  },
  {
    "value": "Europe/Kaliningrad",
    "label": "(UTC+2:00) Europe/Kaliningrad (Eastern European Time)",
    "canonical": "Europe/Kaliningrad"
  },
  {
    "value": "Europe/Kiev",
    "label": "(UTC+2:00) Europe/Kiev (Eastern European Time)",
    "canonical": "Europe/Kiev"
  },
  {
    "value": "Europe/Mariehamn",
    "label": "(UTC+2:00) Europe/Mariehamn (Eastern European Time)",
    "canonical": "Europe/Mariehamn"
  },
  {
    "value": "Europe/Minsk",
    "label": "(UTC+2:00) Europe/Minsk (Eastern European Time)",
    "canonical": "Europe/Minsk"
  },
  {
    "value": "Europe/Nicosia",
    "label": "(UTC+2:00) Europe/Nicosia (Eastern European Time)",
    "canonical": "Europe/Nicosia"
  },
  {
    "value": "Europe/Riga",
    "label": "(UTC+2:00) Europe/Riga (Eastern European Time)",
    "canonical": "Europe/Riga"
  },
  {
    "value": "Europe/Simferopol",
    "label": "(UTC+2:00) Europe/Simferopol (Eastern European Time)",
    "canonical": "Europe/Simferopol"
  },
  {
    "value": "Europe/Sofia",
    "label": "(UTC+2:00) Europe/Sofia (Eastern European Time)",
    "canonical": "Europe/Sofia"
  },
  {
    "value": "Europe/Tallinn",
    "label": "(UTC+2:00) Europe/Tallinn (Eastern European Time)",
    "canonical": "Europe/Tallinn"
  },
  {
    "value": "Europe/Tiraspol",
    "label": "(UTC+2:00) Europe/Tiraspol (Eastern European Time)",
    "canonical": "Europe/Tiraspol"
  },
  {
    "value": "Europe/Uzhgorod",
    "label": "(UTC+2:00) Europe/Uzhgorod (Eastern European Time)",
    "canonical": "Europe/Uzhgorod"
  },
  {
    "value": "Europe/Vilnius",
    "label": "(UTC+2:00) Europe/Vilnius (Eastern European Time)",
    "canonical": "Europe/Vilnius"
  },
  {
    "value": "Europe/Zaporozhye",
    "label": "(UTC+2:00) Europe/Zaporozhye (Eastern European Time)",
    "canonical": "Europe/Zaporozhye"
  },
  {
    "value": "Africa/Addis_Ababa",
    "label": "(UTC+3:00) Africa/Addis_Ababa (Eastern African Time)",
    "canonical": "Africa/Addis_Ababa"
  },
  {
    "value": "Africa/Asmara",
    "label": "(UTC+3:00) Africa/Asmara (Eastern African Time)",
    "canonical": "Africa/Asmara"
  },
  {
    "value": "Africa/Asmera",
    "label": "(UTC+3:00) Africa/Asmera (Eastern African Time)",
    "canonical": "Africa/Asmera"
  },
  {
    "value": "Africa/Dar_es_Salaam",
    "label": "(UTC+3:00) Africa/Dar_es_Salaam (Eastern African Time)",
    "canonical": "Africa/Dar_es_Salaam"
  },
  {
    "value": "Africa/Djibouti",
    "label": "(UTC+3:00) Africa/Djibouti (Eastern African Time)",
    "canonical": "Africa/Djibouti"
  },
  {
    "value": "Africa/Kampala",
    "label": "(UTC+3:00) Africa/Kampala (Eastern African Time)",
    "canonical": "Africa/Kampala"
  },
  {
    "value": "Africa/Khartoum",
    "label": "(UTC+3:00) Africa/Khartoum (Eastern African Time)",
    "canonical": "Africa/Khartoum"
  },
  {
    "value": "Africa/Mogadishu",
    "label": "(UTC+3:00) Africa/Mogadishu (Eastern African Time)",
    "canonical": "Africa/Mogadishu"
  },
  {
    "value": "Africa/Nairobi",
    "label": "(UTC+3:00) Africa/Nairobi (Eastern African Time)",
    "canonical": "Africa/Nairobi"
  },
  {
    "value": "Antarctica/Syowa",
    "label": "(UTC+3:00) Antarctica/Syowa (Syowa Time)",
    "canonical": "Antarctica/Syowa"
  },
  {
    "value": "Asia/Aden",
    "label": "(UTC+3:00) Asia/Aden (Arabia Standard Time)",
    "canonical": "Asia/Aden"
  },
  {
    "value": "Asia/Baghdad",
    "label": "(UTC+3:00) Asia/Baghdad (Arabia Standard Time)",
    "canonical": "Asia/Baghdad"
  },
  {
    "value": "Asia/Bahrain",
    "label": "(UTC+3:00) Asia/Bahrain (Arabia Standard Time)",
    "canonical": "Asia/Bahrain"
  },
  {
    "value": "Asia/Kuwait",
    "label": "(UTC+3:00) Asia/Kuwait (Arabia Standard Time)",
    "canonical": "Asia/Kuwait"
  },
  {
    "value": "Asia/Qatar",
    "label": "(UTC+3:00) Asia/Qatar (Arabia Standard Time)",
    "canonical": "Asia/Qatar"
  },
  {
    "value": "Europe/Moscow",
    "label": "(UTC+3:00) Europe/Moscow (Moscow Standard Time)",
    "canonical": "Europe/Moscow"
  },
  {
    "value": "Europe/Volgograd",
    "label": "(UTC+3:00) Europe/Volgograd (Volgograd Time)",
    "canonical": "Europe/Volgograd"
  },
  {
    "value": "Indian/Antananarivo",
    "label": "(UTC+3:00) Indian/Antananarivo (Eastern African Time)",
    "canonical": "Indian/Antananarivo"
  },
  {
    "value": "Indian/Comoro",
    "label": "(UTC+3:00) Indian/Comoro (Eastern African Time)",
    "canonical": "Indian/Comoro"
  },
  {
    "value": "Indian/Mayotte",
    "label": "(UTC+3:00) Indian/Mayotte (Eastern African Time)",
    "canonical": "Indian/Mayotte"
  },
  {
    "value": "Asia/Tehran",
    "label": "(UTC+3:30) Asia/Tehran (Iran Standard Time)",
    "canonical": "Asia/Tehran"
  },
  {
    "value": "Asia/Baku",
    "label": "(UTC+4:00) Asia/Baku (Azerbaijan Time)",
    "canonical": "Asia/Baku"
  },
  {
    "value": "Asia/Dubai",
    "label": "(UTC+4:00) Asia/Dubai (Gulf Standard Time)",
    "canonical": "Asia/Dubai"
  },
  {
    "value": "Asia/Muscat",
    "label": "(UTC+4:00) Asia/Muscat (Gulf Standard Time)",
    "canonical": "Asia/Muscat"
  },
  {
    "value": "Asia/Tbilisi",
    "label": "(UTC+4:00) Asia/Tbilisi (Georgia Time)",
    "canonical": "Asia/Tbilisi"
  },
  {
    "value": "Asia/Yerevan",
    "label": "(UTC+4:00) Asia/Yerevan (Armenia Time)",
    "canonical": "Asia/Yerevan"
  },
  {
    "value": "Europe/Samara",
    "label": "(UTC+4:00) Europe/Samara (Samara Time)",
    "canonical": "Europe/Samara"
  },
  {
    "value": "Indian/Mahe",
    "label": "(UTC+4:00) Indian/Mahe (Seychelles Time)",
    "canonical": "Indian/Mahe"
  },
  {
    "value": "Indian/Mauritius",
    "label": "(UTC+4:00) Indian/Mauritius (Mauritius Time)",
    "canonical": "Indian/Mauritius"
  },
  {
    "value": "Indian/Reunion",
    "label": "(UTC+4:00) Indian/Reunion (Reunion Time)",
    "canonical": "Indian/Reunion"
  },
  {
    "value": "Asia/Kabul",
    "label": "(UTC+4:30) Asia/Kabul (Afghanistan Time)",
    "canonical": "Asia/Kabul"
  },
  {
    "value": "Asia/Aqtau",
    "label": "(UTC+5:00) Asia/Aqtau (Aqtau Time)",
    "canonical": "Asia/Aqtau"
  },
  {
    "value": "Asia/Aqtobe",
    "label": "(UTC+5:00) Asia/Aqtobe (Aqtobe Time)",
    "canonical": "Asia/Aqtobe"
  },
  {
    "value": "Asia/Ashgabat",
    "label": "(UTC+5:00) Asia/Ashgabat (Turkmenistan Time)",
    "canonical": "Asia/Ashgabat"
  },
  {
    "value": "Asia/Ashkhabad",
    "label": "(UTC+5:00) Asia/Ashkhabad (Turkmenistan Time)",
    "canonical": "Asia/Ashkhabad"
  },
  {
    "value": "Asia/Dushanbe",
    "label": "(UTC+5:00) Asia/Dushanbe (Tajikistan Time)",
    "canonical": "Asia/Dushanbe"
  },
  {
    "value": "Asia/Karachi",
    "label": "(UTC+5:00) Asia/Karachi (Pakistan Time)",
    "canonical": "Asia/Karachi"
  },
  {
    "value": "Asia/Oral",
    "label": "(UTC+5:00) Asia/Oral (Oral Time)",
    "canonical": "Asia/Oral"
  },
  {
    "value": "Asia/Samarkand",
    "label": "(UTC+5:00) Asia/Samarkand (Uzbekistan Time)",
    "canonical": "Asia/Samarkand"
  },
  {
    "value": "Asia/Tashkent",
    "label": "(UTC+5:00) Asia/Tashkent (Uzbekistan Time)",
    "canonical": "Asia/Tashkent"
  },
  {
    "value": "Asia/Yekaterinburg",
    "label": "(UTC+5:00) Asia/Yekaterinburg (Yekaterinburg Time)",
    "canonical": "Asia/Yekaterinburg"
  },
  {
    "value": "Indian/Kerguelen",
    "label": "(UTC+5:00) Indian/Kerguelen (French Southern & Antarctic Lands Time)",
    "canonical": "Indian/Kerguelen"
  },
  {
    "value": "Indian/Maldives",
    "label": "(UTC+5:00) Indian/Maldives (Maldives Time)",
    "canonical": "Indian/Maldives"
  },
  {
    "value": "Asia/Calcutta",
    "label": "(UTC+5:30) Asia/Calcutta (India Standard Time)",
    "canonical": "Asia/Calcutta"
  },
  {
    "value": "Asia/Colombo",
    "label": "(UTC+5:30) Asia/Colombo (India Standard Time)",
    "canonical": "Asia/Colombo"
  },
  {
    "value": "Asia/Kolkata",
    "label": "(UTC+5:30) Asia/Kolkata (India Standard Time)",
    "canonical": "Asia/Kolkata"
  },
  {
    "value": "Asia/Katmandu",
    "label": "(UTC+5:45) Asia/Katmandu (Nepal Time)",
    "canonical": "Asia/Katmandu"
  },
  {
    "value": "Antarctica/Mawson",
    "label": "(UTC+6:00) Antarctica/Mawson (Mawson Time)",
    "canonical": "Antarctica/Mawson"
  },
  {
    "value": "Antarctica/Vostok",
    "label": "(UTC+6:00) Antarctica/Vostok (Vostok Time)",
    "canonical": "Antarctica/Vostok"
  },
  {
    "value": "Asia/Almaty",
    "label": "(UTC+6:00) Asia/Almaty (Alma-Ata Time)",
    "canonical": "Asia/Almaty"
  },
  {
    "value": "Asia/Bishkek",
    "label": "(UTC+6:00) Asia/Bishkek (Kirgizstan Time)",
    "canonical": "Asia/Bishkek"
  },
  {
    "value": "Asia/Dacca",
    "label": "(UTC+6:00) Asia/Dacca (Bangladesh Time)",
    "canonical": "Asia/Dacca"
  },
  {
    "value": "Asia/Dhaka",
    "label": "(UTC+6:00) Asia/Dhaka (Bangladesh Time)",
    "canonical": "Asia/Dhaka"
  },
  {
    "value": "Asia/Novosibirsk",
    "label": "(UTC+6:00) Asia/Novosibirsk (Novosibirsk Time)",
    "canonical": "Asia/Novosibirsk"
  },
  {
    "value": "Asia/Omsk",
    "label": "(UTC+6:00) Asia/Omsk (Omsk Time)",
    "canonical": "Asia/Omsk"
  },
  {
    "value": "Asia/Qyzylorda",
    "label": "(UTC+6:00) Asia/Qyzylorda (Qyzylorda Time)",
    "canonical": "Asia/Qyzylorda"
  },
  {
    "value": "Asia/Thimbu",
    "label": "(UTC+6:00) Asia/Thimbu (Bhutan Time)",
    "canonical": "Asia/Thimbu"
  },
  {
    "value": "Asia/Thimphu",
    "label": "(UTC+6:00) Asia/Thimphu (Bhutan Time)",
    "canonical": "Asia/Thimphu"
  },
  {
    "value": "Indian/Chagos",
    "label": "(UTC+6:00) Indian/Chagos (Indian Ocean Territory Time)",
    "canonical": "Indian/Chagos"
  },
  {
    "value": "Asia/Rangoon",
    "label": "(UTC+6:30) Asia/Rangoon (Myanmar Time)",
    "canonical": "Asia/Rangoon"
  },
  {
    "value": "Indian/Cocos",
    "label": "(UTC+6:30) Indian/Cocos (Cocos Islands Time)",
    "canonical": "Indian/Cocos"
  },
  {
    "value": "Antarctica/Davis",
    "label": "(UTC+7:00) Antarctica/Davis (Davis Time)",
    "canonical": "Antarctica/Davis"
  },
  {
    "value": "Asia/Bangkok",
    "label": "(UTC+7:00) Asia/Bangkok (Indochina Time)",
    "canonical": "Asia/Bangkok"
  },
  {
    "value": "Asia/Ho_Chi_Minh",
    "label": "(UTC+7:00) Asia/Ho_Chi_Minh (Indochina Time)",
    "canonical": "Asia/Ho_Chi_Minh"
  },
  {
    "value": "Asia/Hovd",
    "label": "(UTC+7:00) Asia/Hovd (Hovd Time)",
    "canonical": "Asia/Hovd"
  },
  {
    "value": "Asia/Jakarta",
    "label": "(UTC+7:00) Asia/Jakarta (West Indonesia Time)",
    "canonical": "Asia/Jakarta"
  },
  {
    "value": "Asia/Krasnoyarsk",
    "label": "(UTC+7:00) Asia/Krasnoyarsk (Krasnoyarsk Time)",
    "canonical": "Asia/Krasnoyarsk"
  },
  {
    "value": "Asia/Phnom_Penh",
    "label": "(UTC+7:00) Asia/Phnom_Penh (Indochina Time)",
    "canonical": "Asia/Phnom_Penh"
  },
  {
    "value": "Asia/Pontianak",
    "label": "(UTC+7:00) Asia/Pontianak (West Indonesia Time)",
    "canonical": "Asia/Pontianak"
  },
  {
    "value": "Asia/Saigon",
    "label": "(UTC+7:00) Asia/Saigon (Indochina Time)",
    "canonical": "Asia/Saigon"
  },
  {
    "value": "Asia/Vientiane",
    "label": "(UTC+7:00) Asia/Vientiane (Indochina Time)",
    "canonical": "Asia/Vientiane"
  },
  {
    "value": "Indian/Christmas",
    "label": "(UTC+7:00) Indian/Christmas (Christmas Island Time)",
    "canonical": "Indian/Christmas"
  },
  {
    "value": "Antarctica/Casey",
    "label": "(UTC+8:00) Antarctica/Casey (Western Standard Time (Australia))",
    "canonical": "Antarctica/Casey"
  },
  {
    "value": "Asia/Brunei",
    "label": "(UTC+8:00) Asia/Brunei (Brunei Time)",
    "canonical": "Asia/Brunei"
  },
  {
    "value": "Asia/Choibalsan",
    "label": "(UTC+8:00) Asia/Choibalsan (Choibalsan Time)",
    "canonical": "Asia/Choibalsan"
  },
  {
    "value": "Asia/Chongqing",
    "label": "(UTC+8:00) Asia/Chongqing (China Standard Time)",
    "canonical": "Asia/Chongqing"
  },
  {
    "value": "Asia/Chungking",
    "label": "(UTC+8:00) Asia/Chungking (China Standard Time)",
    "canonical": "Asia/Chungking"
  },
  {
    "value": "Asia/Harbin",
    "label": "(UTC+8:00) Asia/Harbin (China Standard Time)",
    "canonical": "Asia/Harbin"
  },
  {
    "value": "Asia/Hong_Kong",
    "label": "(UTC+8:00) Asia/Hong_Kong (Hong Kong Time)",
    "canonical": "Asia/Hong_Kong"
  },
  {
    "value": "Asia/Irkutsk",
    "label": "(UTC+8:00) Asia/Irkutsk (Irkutsk Time)",
    "canonical": "Asia/Irkutsk"
  },
  {
    "value": "Asia/Kashgar",
    "label": "(UTC+8:00) Asia/Kashgar (China Standard Time)",
    "canonical": "Asia/Kashgar"
  },
  {
    "value": "Asia/Kuala_Lumpur",
    "label": "(UTC+8:00) Asia/Kuala_Lumpur (Malaysia Time)",
    "canonical": "Asia/Kuala_Lumpur"
  },
  {
    "value": "Asia/Kuching",
    "label": "(UTC+8:00) Asia/Kuching (Malaysia Time)",
    "canonical": "Asia/Kuching"
  },
  {
    "value": "Asia/Macao",
    "label": "(UTC+8:00) Asia/Macao (China Standard Time)",
    "canonical": "Asia/Macao"
  },
  {
    "value": "Asia/Macau",
    "label": "(UTC+8:00) Asia/Macau (China Standard Time)",
    "canonical": "Asia/Macau"
  },
  {
    "value": "Asia/Makassar",
    "label": "(UTC+8:00) Asia/Makassar (Central Indonesia Time)",
    "canonical": "Asia/Makassar"
  },
  {
    "value": "Asia/Manila",
    "label": "(UTC+8:00) Asia/Manila (Philippines Time)",
    "canonical": "Asia/Manila"
  },
  {
    "value": "Asia/Shanghai",
    "label": "(UTC+8:00) Asia/Shanghai (China Standard Time)",
    "canonical": "Asia/Shanghai"
  },
  {
    "value": "Asia/Singapore",
    "label": "(UTC+8:00) Asia/Singapore (Singapore Time)",
    "canonical": "Asia/Singapore"
  },
  {
    "value": "Asia/Taipei",
    "label": "(UTC+8:00) Asia/Taipei (China Standard Time)",
    "canonical": "Asia/Taipei"
  },
  {
    "value": "Asia/Ujung_Pandang",
    "label": "(UTC+8:00) Asia/Ujung_Pandang (Central Indonesia Time)",
    "canonical": "Asia/Ujung_Pandang"
  },
  {
    "value": "Asia/Ulaanbaatar",
    "label": "(UTC+8:00) Asia/Ulaanbaatar (Ulaanbaatar Time)",
    "canonical": "Asia/Ulaanbaatar"
  },
  {
    "value": "Asia/Ulan_Bator",
    "label": "(UTC+8:00) Asia/Ulan_Bator (Ulaanbaatar Time)",
    "canonical": "Asia/Ulan_Bator"
  },
  {
    "value": "Asia/Urumqi",
    "label": "(UTC+8:00) Asia/Urumqi (China Standard Time)",
    "canonical": "Asia/Urumqi"
  },
  {
    "value": "Australia/Perth",
    "label": "(UTC+8:00) Australia/Perth (Western Standard Time (Australia))",
    "canonical": "Australia/Perth"
  },
  {
    "value": "Australia/West",
    "label": "(UTC+8:00) Australia/West (Western Standard Time (Australia))",
    "canonical": "Australia/West"
  },
  {
    "value": "Australia/Eucla",
    "label": "(UTC+8:45) Australia/Eucla (Central Western Standard Time (Australia))",
    "canonical": "Australia/Eucla"
  },
  {
    "value": "Asia/Dili",
    "label": "(UTC+9:00) Asia/Dili (Timor-Leste Time)",
    "canonical": "Asia/Dili"
  },
  {
    "value": "Asia/Jayapura",
    "label": "(UTC+9:00) Asia/Jayapura (East Indonesia Time)",
    "canonical": "Asia/Jayapura"
  },
  {
    "value": "Asia/Pyongyang",
    "label": "(UTC+9:00) Asia/Pyongyang (Korea Standard Time)",
    "canonical": "Asia/Pyongyang"
  },
  {
    "value": "Asia/Seoul",
    "label": "(UTC+9:00) Asia/Seoul (Korea Standard Time)",
    "canonical": "Asia/Seoul"
  },
  {
    "value": "Asia/Tokyo",
    "label": "(UTC+9:00) Asia/Tokyo (Japan Standard Time)",
    "canonical": "Asia/Tokyo"
  },
  {
    "value": "Asia/Yakutsk",
    "label": "(UTC+9:00) Asia/Yakutsk (Yakutsk Time)",
    "canonical": "Asia/Yakutsk"
  },
  {
    "value": "Australia/Adelaide",
    "label": "(UTC+9:30) Australia/Adelaide (Central Standard Time (South Australia))",
    "canonical": "Australia/Adelaide"
  },
  {
    "value": "Australia/Broken_Hill",
    "label": "(UTC+9:30) Australia/Broken_Hill (Central Standard Time (South Australia/New South Wales))",
    "canonical": "Australia/Broken_Hill"
  },
  {
    "value": "Australia/Darwin",
    "label": "(UTC+9:30) Australia/Darwin (Central Standard Time (Northern Territory))",
    "canonical": "Australia/Darwin"
  },
  {
    "value": "Australia/North",
    "label": "(UTC+9:30) Australia/North (Central Standard Time (Northern Territory))",
    "canonical": "Australia/North"
  },
  {
    "value": "Australia/South",
    "label": "(UTC+9:30) Australia/South (Central Standard Time (South Australia))",
    "canonical": "Australia/South"
  },
  {
    "value": "Australia/Yancowinna",
    "label": "(UTC+9:30) Australia/Yancowinna (Central Standard Time (South Australia/New South Wales))",
    "canonical": "Australia/Yancowinna"
  },
  {
    "value": "Antarctica/DumontDUrville",
    "label": "(UTC+10:00) Antarctica/DumontDUrville (Dumont-d\\",
    "canonical": "Antarctica/DumontDUrville"
  },
  {
    "value": "Asia/Sakhalin",
    "label": "(UTC+10:00) Asia/Sakhalin (Sakhalin Time)",
    "canonical": "Asia/Sakhalin"
  },
  {
    "value": "Asia/Vladivostok",
    "label": "(UTC+10:00) Asia/Vladivostok (Vladivostok Time)",
    "canonical": "Asia/Vladivostok"
  },
  {
    "value": "Australia/ACT",
    "label": "(UTC+10:00) Australia/ACT (Eastern Standard Time (New South Wales))",
    "canonical": "Australia/ACT"
  },
  {
    "value": "Australia/Brisbane",
    "label": "(UTC+10:00) Australia/Brisbane (Eastern Standard Time (Queensland))",
    "canonical": "Australia/Brisbane"
  },
  {
    "value": "Australia/Canberra",
    "label": "(UTC+10:00) Australia/Canberra (Eastern Standard Time (New South Wales))",
    "canonical": "Australia/Canberra"
  },
  {
    "value": "Australia/Currie",
    "label": "(UTC+10:00) Australia/Currie (Eastern Standard Time (New South Wales))",
    "canonical": "Australia/Currie"
  },
  {
    "value": "Australia/Hobart",
    "label": "(UTC+10:00) Australia/Hobart (Eastern Standard Time (Tasmania))",
    "canonical": "Australia/Hobart"
  },
  {
    "value": "Australia/Lindeman",
    "label": "(UTC+10:00) Australia/Lindeman (Eastern Standard Time (Queensland))",
    "canonical": "Australia/Lindeman"
  },
  {
    "value": "Australia/Melbourne",
    "label": "(UTC+10:00) Australia/Melbourne (Eastern Standard Time (Victoria))",
    "canonical": "Australia/Melbourne"
  },
  {
    "value": "Australia/NSW",
    "label": "(UTC+10:00) Australia/NSW (Eastern Standard Time (New South Wales))",
    "canonical": "Australia/NSW"
  },
  {
    "value": "Australia/Queensland",
    "label": "(UTC+10:00) Australia/Queensland (Eastern Standard Time (Queensland))",
    "canonical": "Australia/Queensland"
  },
  {
    "value": "Australia/Sydney",
    "label": "(UTC+10:00) Australia/Sydney (Eastern Standard Time (New South Wales))",
    "canonical": "Australia/Sydney"
  },
  {
    "value": "Australia/Tasmania",
    "label": "(UTC+10:00) Australia/Tasmania (Eastern Standard Time (Tasmania))",
    "canonical": "Australia/Tasmania"
  },
  {
    "value": "Australia/Victoria",
    "label": "(UTC+10:00) Australia/Victoria (Eastern Standard Time (Victoria))",
    "canonical": "Australia/Victoria"
  },
  {
    "value": "Australia/LHI",
    "label": "(UTC+10:30) Australia/LHI (Lord Howe Standard Time)",
    "canonical": "Australia/LHI"
  },
  {
    "value": "Australia/Lord_Howe",
    "label": "(UTC+10:30) Australia/Lord_Howe (Lord Howe Standard Time)",
    "canonical": "Australia/Lord_Howe"
  },
  {
    "value": "Asia/Magadan",
    "label": "(UTC+11:00) Asia/Magadan (Magadan Time)",
    "canonical": "Asia/Magadan"
  },
  {
    "value": "Antarctica/McMurdo",
    "label": "(UTC+12:00) Antarctica/McMurdo (New Zealand Standard Time)",
    "canonical": "Antarctica/McMurdo"
  },
  {
    "value": "Antarctica/South_Pole",
    "label": "(UTC+12:00) Antarctica/South_Pole (New Zealand Standard Time)",
    "canonical": "Antarctica/South_Pole"
  },
  {
    "value": "Asia/Anadyr",
    "label": "(UTC+12:00) Asia/Anadyr (Anadyr Time)",
    "canonical": "Asia/Anadyr"
  },
  {
    "value": "Asia/Kamchatka",
    "label": "(UTC+12:00) Asia/Kamchatka (Petropavlovsk-Kamchatski Time)",
    "canonical": "Asia/Kamchatka"
  }
];

export function findTimezone(value?: string): TimezoneItem | undefined {
  if (!value) return undefined;
  const needle = value.toLowerCase().trim();
  return (
    TIMEZONES.find((t) => t.value.toLowerCase() === needle) ||
    TIMEZONES.find((t) => t.canonical.toLowerCase() === needle) ||
    TIMEZONES.find((t) => t.label.toLowerCase().includes(needle))
  );
}
