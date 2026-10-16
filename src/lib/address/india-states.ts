import { StateProvince } from "./address-types";

export const INDIA_STATES: StateProvince[] = [
  { code: "TN", name: "Tamil Nadu", countryCode: "IN" },
  { code: "KA", name: "Karnataka", countryCode: "IN" },
  { code: "MH", name: "Maharashtra", countryCode: "IN" },
  { code: "DL", name: "Delhi", countryCode: "IN" },
  { code: "TS", name: "Telangana", countryCode: "IN" },
  { code: "AP", name: "Andhra Pradesh", countryCode: "IN" },
  { code: "KL", name: "Kerala", countryCode: "IN" },
  { code: "GJ", name: "Gujarat", countryCode: "IN" },
  { code: "UP", name: "Uttar Pradesh", countryCode: "IN" },
  { code: "WB", name: "West Bengal", countryCode: "IN" },
  { code: "RJ", name: "Rajasthan", countryCode: "IN" },
  { code: "MP", name: "Madhya Pradesh", countryCode: "IN" },
  { code: "HR", name: "Haryana", countryCode: "IN" },
  { code: "PB", name: "Punjab", countryCode: "IN" },
  { code: "BR", name: "Bihar", countryCode: "IN" },
  { code: "OR", name: "Odisha", countryCode: "IN" },
  { code: "AS", name: "Assam", countryCode: "IN" },
  { code: "JH", name: "Jharkhand", countryCode: "IN" },
  { code: "CT", name: "Chhattisgarh", countryCode: "IN" },
  { code: "UT", name: "Uttarakhand", countryCode: "IN" },
  { code: "HP", name: "Himachal Pradesh", countryCode: "IN" },
  { code: "GA", name: "Goa", countryCode: "IN" },
  { code: "TR", name: "Tripura", countryCode: "IN" },
  { code: "ML", name: "Meghalaya", countryCode: "IN" },
  { code: "MN", name: "Manipur", countryCode: "IN" },
  { code: "NL", name: "Nagaland", countryCode: "IN" },
  { code: "MZ", name: "Mizoram", countryCode: "IN" },
  { code: "SK", name: "Sikkim", countryCode: "IN" },
  { code: "AR", name: "Arunachal Pradesh", countryCode: "IN" },
  { code: "PY", name: "Puducherry", countryCode: "IN" },
  { code: "CH", name: "Chandigarh", countryCode: "IN" },
  { code: "JK", name: "Jammu and Kashmir", countryCode: "IN" },
  { code: "LA", name: "Ladakh", countryCode: "IN" },
  { code: "AN", name: "Andaman and Nicobar Islands", countryCode: "IN" },
  { code: "DN", name: "Dadra and Nagar Haveli and Daman and Diu", countryCode: "IN" },
  { code: "LD", name: "Lakshadweep", countryCode: "IN" },
];

export const US_STATES: StateProvince[] = [
  { code: "CA", name: "California", countryCode: "US" },
  { code: "NY", name: "New York", countryCode: "US" },
  { code: "TX", name: "Texas", countryCode: "US" },
  { code: "WA", name: "Washington", countryCode: "US" },
  { code: "FL", name: "Florida", countryCode: "US" },
  { code: "IL", name: "Illinois", countryCode: "US" },
  { code: "MA", name: "Massachusetts", countryCode: "US" },
  { code: "NJ", name: "New Jersey", countryCode: "US" },
];

export function getStatesByCountry(countryCodeOrName: string): StateProvince[] {
  if (!countryCodeOrName) return [];
  const normalized = countryCodeOrName.trim().toLowerCase();

  if (normalized === "in" || normalized === "india") {
    return INDIA_STATES;
  }
  if (normalized === "us" || normalized === "usa" || normalized === "united states") {
    return US_STATES;
  }
  return [];
}

export function getStateByCode(code: string, country?: string): StateProvince | undefined {
  const states = country ? getStatesByCountry(country) : [...INDIA_STATES, ...US_STATES];
  return states.find(
    (s) => s.code.toLowerCase() === code.toLowerCase() || s.name.toLowerCase() === code.toLowerCase()
  );
}
