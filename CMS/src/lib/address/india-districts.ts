import { District } from "./address-types";

// All 38 Districts of Tamil Nadu (Official Government Classification)
export const TAMIL_NADU_DISTRICTS: District[] = [
  { code: "TN-AR", name: "Ariyalur", stateCode: "TN" },
  { code: "TN-CGL", name: "Chengalpattu", stateCode: "TN" },
  { code: "TN-CH", name: "Chennai", stateCode: "TN" },
  { code: "TN-CO", name: "Coimbatore", stateCode: "TN" },
  { code: "TN-CU", name: "Cuddalore", stateCode: "TN" },
  { code: "TN-DH", name: "Dharmapuri", stateCode: "TN" },
  { code: "TN-DI", name: "Dindigul", stateCode: "TN" },
  { code: "TN-ER", name: "Erode", stateCode: "TN" },
  { code: "TN-KL", name: "Kallakurichi", stateCode: "TN" },
  { code: "TN-KC", name: "Kanchipuram", stateCode: "TN" },
  { code: "TN-KK", name: "Kanyakumari", stateCode: "TN" },
  { code: "TN-KR", name: "Karur", stateCode: "TN" },
  { code: "TN-KRISH", name: "Krishnagiri", stateCode: "TN" },
  { code: "TN-MDU", name: "Madurai", stateCode: "TN" },
  { code: "TN-MYD", name: "Mayiladuthurai", stateCode: "TN" },
  { code: "TN-NG", name: "Nagapattinam", stateCode: "TN" },
  { code: "TN-NM", name: "Namakkal", stateCode: "TN" },
  { code: "TN-NI", name: "Nilgiris", stateCode: "TN" },
  { code: "TN-PE", name: "Perambalur", stateCode: "TN" },
  { code: "TN-PU", name: "Pudukkottai", stateCode: "TN" },
  { code: "TN-RA", name: "Ramanathapuram", stateCode: "TN" },
  { code: "TN-RN", name: "Ranipet", stateCode: "TN" },
  { code: "TN-SA", name: "Salem", stateCode: "TN" },
  { code: "TN-SI", name: "Sivaganga", stateCode: "TN" },
  { code: "TN-TS", name: "Tenkasi", stateCode: "TN" },
  { code: "TN-TJ", name: "Thanjavur", stateCode: "TN" },
  { code: "TN-TH", name: "Theni", stateCode: "TN" },
  { code: "TN-TK", name: "Thoothukudi", stateCode: "TN" },
  { code: "TN-TC", name: "Tiruchirappalli", stateCode: "TN" },
  { code: "TN-TI", name: "Tirunelveli", stateCode: "TN" },
  { code: "TN-TP", name: "Tirupathur", stateCode: "TN" },
  { code: "TN-TU", name: "Tiruppur", stateCode: "TN" },
  { code: "TN-TL", name: "Tiruvallur", stateCode: "TN" },
  { code: "TN-TV", name: "Tiruvannamalai", stateCode: "TN" },
  { code: "TN-TR", name: "Tiruvarur", stateCode: "TN" },
  { code: "TN-VE", name: "Vellore", stateCode: "TN" },
  { code: "TN-VL", name: "Viluppuram", stateCode: "TN" },
  { code: "TN-VR", name: "Virudhunagar", stateCode: "TN" },
];

export const KARNATAKA_DISTRICTS: District[] = [
  { code: "KA-BLR-U", name: "Bengaluru Urban", stateCode: "KA" },
  { code: "KA-BLR-R", name: "Bengaluru Rural", stateCode: "KA" },
  { code: "KA-MYS", name: "Mysuru", stateCode: "KA" },
  { code: "KA-MNG", name: "Dakshina Kannada (Mangaluru)", stateCode: "KA" },
  { code: "KA-BEL", name: "Belagavi", stateCode: "KA" },
  { code: "KA-HUB", name: "Dharwad (Hubballi)", stateCode: "KA" },
  { code: "KA-SHI", name: "Shivamogga", stateCode: "KA" },
  { code: "KA-TUM", name: "Tumakuru", stateCode: "KA" },
  { code: "KA-UDU", name: "Udupi", stateCode: "KA" },
];

export const MAHARASHTRA_DISTRICTS: District[] = [
  { code: "MH-MUM", name: "Mumbai City", stateCode: "MH" },
  { code: "MH-SUB", name: "Mumbai Suburban", stateCode: "MH" },
  { code: "MH-PUN", name: "Pune", stateCode: "MH" },
  { code: "MH-THN", name: "Thane", stateCode: "MH" },
  { code: "MH-NAG", name: "Nagpur", stateCode: "MH" },
  { code: "MH-NSK", name: "Nashik", stateCode: "MH" },
  { code: "MH-AUR", name: "Chhatrapati Sambhajinagar", stateCode: "MH" },
];

export const KERALA_DISTRICTS: District[] = [
  { code: "KL-TVM", name: "Thiruvananthapuram", stateCode: "KL" },
  { code: "KL-EKM", name: "Ernakulam (Kochi)", stateCode: "KL" },
  { code: "KL-CLT", name: "Kozhikode", stateCode: "KL" },
  { code: "KL-TCR", name: "Thrissur", stateCode: "KL" },
  { code: "KL-KNR", name: "Kannur", stateCode: "KL" },
  { code: "KL-KTM", name: "Kottayam", stateCode: "KL" },
  { code: "KL-ALP", name: "Alappuzha", stateCode: "KL" },
];

export const TELANGANA_DISTRICTS: District[] = [
  { code: "TG-HYD", name: "Hyderabad", stateCode: "TG" },
  { code: "TG-RRD", name: "Ranga Reddy", stateCode: "TG" },
  { code: "TG-MED", name: "Medchal-Malkajgiri", stateCode: "TG" },
  { code: "TG-SAN", name: "Sangareddy", stateCode: "TG" },
  { code: "TG-WGL", name: "Warangal", stateCode: "TG" },
];

export const DELHI_DISTRICTS: District[] = [
  { code: "DL-NEW", name: "New Delhi", stateCode: "DL" },
  { code: "DL-CEN", name: "Central Delhi", stateCode: "DL" },
  { code: "DL-SOU", name: "South Delhi", stateCode: "DL" },
  { code: "DL-NOR", name: "North Delhi", stateCode: "DL" },
  { code: "DL-WES", name: "West Delhi", stateCode: "DL" },
  { code: "DL-EAS", name: "East Delhi", stateCode: "DL" },
];

const DISTRICTS_MAP: Record<string, District[]> = {
  TN: TAMIL_NADU_DISTRICTS,
  "TAMIL NADU": TAMIL_NADU_DISTRICTS,
  KA: KARNATAKA_DISTRICTS,
  KARNATAKA: KARNATAKA_DISTRICTS,
  MH: MAHARASHTRA_DISTRICTS,
  MAHARASHTRA: MAHARASHTRA_DISTRICTS,
  KL: KERALA_DISTRICTS,
  KERALA: KERALA_DISTRICTS,
  TG: TELANGANA_DISTRICTS,
  TELANGANA: TELANGANA_DISTRICTS,
  DL: DELHI_DISTRICTS,
  DELHI: DELHI_DISTRICTS,
};

export function getDistrictsByState(stateCodeOrName?: string | null): District[] {
  if (!stateCodeOrName) return [];
  const key = stateCodeOrName.trim().toUpperCase();
  return DISTRICTS_MAP[key] || [];
}

export function isDistrictInState(districtName: string, stateName: string): boolean {
  const districts = getDistrictsByState(stateName);
  if (districts.length === 0) return true; // If we lack dataset, allow manual
  return districts.some(
    (d) => d.name.toLowerCase() === districtName.trim().toLowerCase()
  );
}
