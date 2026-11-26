import { COUNTRIES } from "./address/countries";
import { Country } from "./address/address-types";

// Common country name / abbreviation to ISO2 code aliases
const COUNTRY_ALIASES: Record<string, string> = {
  usa: "us",
  "united states of america": "us",
  "united states": "us",
  uk: "gb",
  "great britain": "gb",
  "united kingdom": "gb",
  uae: "ae",
  "united arab emirates": "ae",
  india: "in",
  singapore: "sg",
  france: "fr",
  germany: "de",
  norway: "no",
  canada: "ca",
  australia: "au",
  malaysia: "my",
  "saudi arabia": "sa",
  ksa: "sa",
  qatar: "qa",
  netherlands: "nl",
  japan: "jp",
  china: "cn",
  brazil: "br",
  russia: "ru",
  "south africa": "za",
  "south korea": "kr",
  korea: "kr",
  italy: "it",
  spain: "es",
  switzerland: "ch",
  sweden: "se",
  denmark: "dk",
  finland: "fi",
  ireland: "ie",
  "new zealand": "nz",
  mexico: "mx",
  indonesia: "id",
  thailand: "th",
  vietnam: "vn",
  philippines: "ph",
  pakistan: "pk",
  bangladesh: "bd",
  "sri lanka": "lk",
  nepal: "np",
  turkey: "tr",
  türkiye: "tr",
  egypt: "eg",
  nigeria: "ng",
  kenya: "ke"
};

// Build fast lookup map from COUNTRIES array
const NAME_TO_CODE = new Map<string, string>();
const CODE_TO_COUNTRY = new Map<string, Country>();

COUNTRIES.forEach((c) => {
  const codeLower = c.code.toLowerCase();
  NAME_TO_CODE.set(c.name.toLowerCase(), codeLower);
  NAME_TO_CODE.set(codeLower, codeLower);
  CODE_TO_COUNTRY.set(codeLower, c);
});

// Register aliases
Object.entries(COUNTRY_ALIASES).forEach(([alias, code]) => {
  NAME_TO_CODE.set(alias.toLowerCase(), code.toLowerCase());
});

/**
 * Returns the ISO 2-letter country code for a given country name, alias, or code.
 */
export function getCountryCode(countryOrCode?: string | null): string {
  if (!countryOrCode) return "in";
  const clean = countryOrCode.trim().toLowerCase();
  if (clean.length === 2 && CODE_TO_COUNTRY.has(clean)) {
    return clean;
  }
  return NAME_TO_CODE.get(clean) || (clean.length === 2 ? clean : "in");
}

/**
 * Returns the SVG flag URL for a country code, abbreviation, or country name.
 * e.g. "US" -> "/flags/us.svg", "United States" -> "/flags/us.svg"
 */
export function getCountryFlagUrl(countryOrCode?: string | null): string {
  const code = getCountryCode(countryOrCode);
  return `/flags/${code}.svg`;
}export { COUNTRIES };
