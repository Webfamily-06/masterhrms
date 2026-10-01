import { PrismaClient } from "@prisma/client";

export interface StateUTRecord {
  id: string;
  stateCode: string;
  tinCode: string;
  name: string;
  capital: string;
  isUnionTerritory: boolean;
  hasPt: boolean;
  hasLwf: boolean;
  isActive: boolean;
}

export const ALL_INDIAN_STATES_UTS: StateUTRecord[] = [
  // 28 States
  { id: "AP", stateCode: "AP", tinCode: "37", name: "Andhra Pradesh", capital: "Amaravati", isUnionTerritory: false, hasPt: true, hasLwf: true, isActive: true },
  { id: "AR", stateCode: "AR", tinCode: "12", name: "Arunachal Pradesh", capital: "Itanagar", isUnionTerritory: false, hasPt: false, hasLwf: false, isActive: true },
  { id: "AS", stateCode: "AS", tinCode: "18", name: "Assam", capital: "Dispur", isUnionTerritory: false, hasPt: true, hasLwf: true, isActive: true },
  { id: "BR", stateCode: "BR", tinCode: "10", name: "Bihar", capital: "Patna", isUnionTerritory: false, hasPt: true, hasLwf: false, isActive: true },
  { id: "CG", stateCode: "CG", tinCode: "22", name: "Chhattisgarh", capital: "Raipur", isUnionTerritory: false, hasPt: true, hasLwf: true, isActive: true },
  { id: "GA", stateCode: "GA", tinCode: "30", name: "Goa", capital: "Panaji", isUnionTerritory: false, hasPt: true, hasLwf: true, isActive: true },
  { id: "GJ", stateCode: "GJ", tinCode: "24", name: "Gujarat", capital: "Gandhinagar", isUnionTerritory: false, hasPt: true, hasLwf: true, isActive: true },
  { id: "HR", stateCode: "HR", tinCode: "06", name: "Haryana", capital: "Chandigarh", isUnionTerritory: false, hasPt: false, hasLwf: true, isActive: true },
  { id: "HP", stateCode: "HP", tinCode: "02", name: "Himachal Pradesh", capital: "Shimla", isUnionTerritory: false, hasPt: false, hasLwf: false, isActive: true },
  { id: "JH", stateCode: "JH", tinCode: "20", name: "Jharkhand", capital: "Ranchi", isUnionTerritory: false, hasPt: true, hasLwf: false, isActive: true },
  { id: "KA", stateCode: "KA", tinCode: "29", name: "Karnataka", capital: "Bengaluru", isUnionTerritory: false, hasPt: true, hasLwf: true, isActive: true },
  { id: "KL", stateCode: "KL", tinCode: "32", name: "Kerala", capital: "Thiruvananthapuram", isUnionTerritory: false, hasPt: true, hasLwf: true, isActive: true },
  { id: "MP", stateCode: "MP", tinCode: "23", name: "Madhya Pradesh", capital: "Bhopal", isUnionTerritory: false, hasPt: true, hasLwf: true, isActive: true },
  { id: "MH", stateCode: "MH", tinCode: "27", name: "Maharashtra", capital: "Mumbai", isUnionTerritory: false, hasPt: true, hasLwf: true, isActive: true },
  { id: "MN", stateCode: "MN", tinCode: "14", name: "Manipur", capital: "Imphal", isUnionTerritory: false, hasPt: true, hasLwf: false, isActive: true },
  { id: "ML", stateCode: "ML", tinCode: "17", name: "Meghalaya", capital: "Shillong", isUnionTerritory: false, hasPt: true, hasLwf: false, isActive: true },
  { id: "MZ", stateCode: "MZ", tinCode: "15", name: "Mizoram", capital: "Aizawl", isUnionTerritory: false, hasPt: true, hasLwf: false, isActive: true },
  { id: "NL", stateCode: "NL", tinCode: "13", name: "Nagaland", capital: "Kohima", isUnionTerritory: false, hasPt: true, hasLwf: false, isActive: true },
  { id: "OD", stateCode: "OD", tinCode: "21", name: "Odisha", capital: "Bhubaneswar", isUnionTerritory: false, hasPt: true, hasLwf: true, isActive: true },
  { id: "PB", stateCode: "PB", tinCode: "03", name: "Punjab", capital: "Chandigarh", isUnionTerritory: false, hasPt: true, hasLwf: true, isActive: true },
  { id: "RJ", stateCode: "RJ", tinCode: "08", name: "Rajasthan", capital: "Jaipur", isUnionTerritory: false, hasPt: false, hasLwf: false, isActive: true },
  { id: "SK", stateCode: "SK", tinCode: "11", name: "Sikkim", capital: "Gangtok", isUnionTerritory: false, hasPt: true, hasLwf: false, isActive: true },
  { id: "TN", stateCode: "TN", tinCode: "33", name: "Tamil Nadu", capital: "Chennai", isUnionTerritory: false, hasPt: true, hasLwf: true, isActive: true },
  { id: "TS", stateCode: "TS", tinCode: "36", name: "Telangana", capital: "Hyderabad", isUnionTerritory: false, hasPt: true, hasLwf: true, isActive: true },
  { id: "TR", stateCode: "TR", tinCode: "16", name: "Tripura", capital: "Agartala", isUnionTerritory: false, hasPt: true, hasLwf: false, isActive: true },
  { id: "UP", stateCode: "UP", tinCode: "09", name: "Uttar Pradesh", capital: "Lucknow", isUnionTerritory: false, hasPt: false, hasLwf: false, isActive: true },
  { id: "UK", stateCode: "UK", tinCode: "05", name: "Uttarakhand", capital: "Dehradun", isUnionTerritory: false, hasPt: false, hasLwf: false, isActive: true },
  { id: "WB", stateCode: "WB", tinCode: "19", name: "West Bengal", capital: "Kolkata", isUnionTerritory: false, hasPt: true, hasLwf: true, isActive: true },

  // 8 Union Territories
  { id: "AN", stateCode: "AN", tinCode: "35", name: "Andaman and Nicobar Islands", capital: "Port Blair", isUnionTerritory: true, hasPt: false, hasLwf: false, isActive: true },
  { id: "CH", stateCode: "CH", tinCode: "04", name: "Chandigarh", capital: "Chandigarh", isUnionTerritory: true, hasPt: false, hasLwf: true, isActive: true },
  { id: "DN", stateCode: "DN", tinCode: "26", name: "Dadra and Nagar Haveli and Daman and Diu", capital: "Daman", isUnionTerritory: true, hasPt: false, hasLwf: false, isActive: true },
  { id: "DL", stateCode: "DL", tinCode: "07", name: "Delhi", capital: "New Delhi", isUnionTerritory: true, hasPt: false, hasLwf: true, isActive: true },
  { id: "JK", stateCode: "JK", tinCode: "01", name: "Jammu and Kashmir", capital: "Srinagar / Jammu", isUnionTerritory: true, hasPt: false, hasLwf: false, isActive: true },
  { id: "LA", stateCode: "LA", tinCode: "38", name: "Ladakh", capital: "Leh", isUnionTerritory: true, hasPt: false, hasLwf: false, isActive: true },
  { id: "LD", stateCode: "LD", tinCode: "31", name: "Lakshadweep", capital: "Kavaratti", isUnionTerritory: true, hasPt: false, hasLwf: false, isActive: true },
  { id: "PY", stateCode: "PY", tinCode: "34", name: "Puducherry", capital: "Puducherry", isUnionTerritory: true, hasPt: true, hasLwf: false, isActive: true }
];

export async function seedStateUTMaster(prisma: PrismaClient) {
  console.log("Seeding all 36 Indian States and Union Territories...");
  let count = 0;
  for (const st of ALL_INDIAN_STATES_UTS) {
    await prisma.stateUTMaster.upsert({
      where: { id: st.id },
      create: st,
      update: {
        name: st.name,
        tinCode: st.tinCode,
        stateCode: st.stateCode,
        capital: st.capital,
        isUnionTerritory: st.isUnionTerritory,
        hasPt: st.hasPt,
        hasLwf: st.hasLwf,
        isActive: st.isActive,
      }
    });
    count++;
  }
  console.log(`Successfully seeded ${count} States and Union Territories.`);
}
