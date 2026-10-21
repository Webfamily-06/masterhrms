import { PincodeLookupResult } from "./address-types";

/**
 * Curated local dataset for instant offline resolution of high-frequency Indian postal codes.
 * Ensures zero dependency on external network calls for common regions, especially Tamil Nadu.
 */
const KNOWN_PINCODES: Record<string, { city: string; district: string; state: string; country: string }> = {
  // Chennai & Suburban TN
  "600001": { city: "Chennai", district: "Chennai", state: "Tamil Nadu", country: "India" },
  "600002": { city: "Chennai", district: "Chennai", state: "Tamil Nadu", country: "India" },
  "600004": { city: "Mylapore", district: "Chennai", state: "Tamil Nadu", country: "India" },
  "600017": { city: "T. Nagar", district: "Chennai", state: "Tamil Nadu", country: "India" },
  "600020": { city: "Adyar", district: "Chennai", state: "Tamil Nadu", country: "India" },
  "600028": { city: "R.A. Puram", district: "Chennai", state: "Tamil Nadu", country: "India" },
  "600032": { city: "Guindy", district: "Chennai", state: "Tamil Nadu", country: "India" },
  "600042": { city: "Velachery", district: "Chennai", state: "Tamil Nadu", country: "India" },
  "600096": { city: "Perungudi (OMR)", district: "Chennai", state: "Tamil Nadu", country: "India" },
  "600097": { city: "Thoraipakkam", district: "Chennai", state: "Tamil Nadu", country: "India" },
  "600100": { city: "Medavakkam", district: "Chengalpattu", state: "Tamil Nadu", country: "India" },
  "600119": { city: "Sholinganallur", district: "Chennai", state: "Tamil Nadu", country: "India" },
  "603103": { city: "Siruseri (SIPCOT)", district: "Chengalpattu", state: "Tamil Nadu", country: "India" },

  // Coimbatore & Western TN
  "641001": { city: "Coimbatore", district: "Coimbatore", state: "Tamil Nadu", country: "India" },
  "641014": { city: "Peelamedu", district: "Coimbatore", state: "Tamil Nadu", country: "India" },
  "641035": { city: "Saravanampatti", district: "Coimbatore", state: "Tamil Nadu", country: "India" },
  "638001": { city: "Erode", district: "Erode", state: "Tamil Nadu", country: "India" },
  "641601": { city: "Tiruppur", district: "Tiruppur", state: "Tamil Nadu", country: "India" },
  "636001": { city: "Salem", district: "Salem", state: "Tamil Nadu", country: "India" },

  // Southern & Central TN
  "625001": { city: "Madurai", district: "Madurai", state: "Tamil Nadu", country: "India" },
  "620001": { city: "Tiruchirappalli", district: "Tiruchirappalli", state: "Tamil Nadu", country: "India" },
  "627001": { city: "Tirunelveli", district: "Tirunelveli", state: "Tamil Nadu", country: "India" },
  "629001": { city: "Nagercoil", district: "Kanyakumari", state: "Tamil Nadu", country: "India" },
  "632001": { city: "Vellore", district: "Vellore", state: "Tamil Nadu", country: "India" },

  // Bengaluru
  "560001": { city: "Bengaluru", district: "Bengaluru Urban", state: "Karnataka", country: "India" },
  "560034": { city: "Koramangala", district: "Bengaluru Urban", state: "Karnataka", country: "India" },
  "560038": { city: "Indiranagar", district: "Bengaluru Urban", state: "Karnataka", country: "India" },
  "560066": { city: "Whitefield", district: "Bengaluru Urban", state: "Karnataka", country: "India" },
  "560100": { city: "Electronic City", district: "Bengaluru Urban", state: "Karnataka", country: "India" },
  "560103": { city: "Bellandur (Outer Ring Rd)", district: "Bengaluru Urban", state: "Karnataka", country: "India" },

  // Hyderabad
  "500001": { city: "Hyderabad", district: "Hyderabad", state: "Telangana", country: "India" },
  "500081": { city: "Madhapur (Hitec City)", district: "Ranga Reddy", state: "Telangana", country: "India" },

  // Mumbai & Pune
  "400001": { city: "Mumbai", district: "Mumbai City", state: "Maharashtra", country: "India" },
  "400051": { city: "Bandra Kurla Complex (BKC)", district: "Mumbai Suburban", state: "Maharashtra", country: "India" },
  "411001": { city: "Pune", district: "Pune", state: "Maharashtra", country: "India" },
  "411057": { city: "Hinjawadi", district: "Pune", state: "Maharashtra", country: "India" },

  // Delhi NCR
  "110001": { city: "Connaught Place", district: "New Delhi", state: "Delhi", country: "India" },
  "122001": { city: "Gurugram", district: "Gurugram", state: "Haryana", country: "India" },
  "201301": { city: "Noida", district: "Gautam Buddha Nagar", state: "Uttar Pradesh", country: "India" },

  // Kochi / Kerala
  "682001": { city: "Kochi", district: "Ernakulam (Kochi)", state: "Kerala", country: "India" },
  "695001": { city: "Thiruvananthapuram", district: "Thiruvananthapuram", state: "Kerala", country: "India" },
};

/**
 * Lookup Indian postal code.
 * Checks local dataset first. If not found and online, queries India Post API with strict timeout.
 * Never throws, always returns graceful null or result.
 */
export async function lookupPincode(pincode: string): Promise<PincodeLookupResult | null> {
  const cleanCode = pincode.trim().replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleanCode)) {
    return null;
  }

  // 1. Instant local lookup
  if (KNOWN_PINCODES[cleanCode]) {
    const loc = KNOWN_PINCODES[cleanCode];
    return {
      pincode: cleanCode,
      city: loc.city,
      district: loc.district,
      state: loc.state,
      country: loc.country,
      isReliable: true,
      source: "local_dataset",
    };
  }

  // 2. Safe external lookup with 2-second timeout
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`https://api.postalpincode.in/pincode/${cleanCode}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        return {
          pincode: cleanCode,
          city: po.Name || po.Block || po.District,
          district: po.District,
          state: po.State,
          country: "India",
          isReliable: true,
          source: "provider",
        };
      }
    }
  } catch (err) {
    // Offline or network error -> Graceful degradation to manual entry
  }

  return null;
}
