export interface Country {
  code: string;
  name: string;
  phoneCode?: string;
  hasDistricts?: boolean;
}

export interface StateProvince {
  code: string;
  name: string;
  countryCode: string;
}

export interface District {
  code: string;
  name: string;
  stateCode: string;
}

export interface PincodeLookupResult {
  pincode: string;
  city: string;
  district: string;
  state: string;
  country: string;
  isReliable: boolean;
  source: "local_dataset" | "provider" | "fallback";
}
