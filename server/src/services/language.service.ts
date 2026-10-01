import { rawPrisma as prisma } from "../prisma";

export interface LanguagePackMeta {
  code: string;
  name: string;
  flag: string;
  countryCode: string;
  isDefault?: boolean;
  enabled?: boolean;
}

export type PhraseDictionary = Record<string, string>;

const DEFAULT_LANGUAGES: LanguagePackMeta[] = [
  { code: "en", name: "English (US)", flag: "🇺🇸", countryCode: "US", isDefault: true, enabled: true },
  { code: "es", name: "Español", flag: "🇪🇸", countryCode: "ES", isDefault: false, enabled: true },
  { code: "fr", name: "Français", flag: "🇫🇷", countryCode: "FR", isDefault: false, enabled: true },
  { code: "de", name: "Deutsch", flag: "🇩🇪", countryCode: "DE", isDefault: false, enabled: true },
  { code: "hi", name: "हिन्दी (Hindi)", flag: "🇮🇳", countryCode: "IN", isDefault: false, enabled: true },
  { code: "ar", name: "العربية (Arabic)", flag: "🇦🇪", countryCode: "AE", isDefault: false, enabled: true },
];

const DEFAULT_EN_PHRASES: PhraseDictionary = {
  "app.title": "Master ERP & HRMS",
  "Dashboard": "Dashboard",
  "System Users": "System Users",
  "Users": "Users",
  "Companies": "Companies",
  "Employees": "Employees",
  "Payroll": "Payroll",
  "Attendance": "Attendance",
  "Recruitment": "Recruitment",
  "Assets": "Assets",
  "Marketing Campaigns": "Marketing Campaigns",
  "Custom Fields": "Custom Fields",
  "Settings": "Settings",
  "Login History": "Login History",
  "Backup & Restore": "Backup & Restore",
  "Language Editor": "Language Editor",
  "Add User": "Add User",
  "Edit User": "Edit User",
  "Delete User": "Delete User",
  "Reset Password": "Reset Password",
  "New Password": "New Password",
  "Confirm Password": "Confirm Password",
  "Enter new password": "Enter new password",
  "Re-enter new password": "Re-enter new password",
  "Save": "Save",
  "Cancel": "Cancel",
  "Delete": "Delete",
  "Edit": "Edit",
  "View": "View",
  "Status": "Status",
  "Active": "Active",
  "Inactive": "Inactive",
  "Action": "Action",
  "IP Address": "IP Address",
  "Login Date": "Login Date",
  "Details": "Details",
  "Search": "Search",
  "Filter": "Filter",
  "Export": "Export",
  "Download": "Download",
  "Create": "Create",
  "Update": "Update",
  "Success": "Success",
  "Error": "Error",
};

export async function getLanguagesList(): Promise<LanguagePackMeta[]> {
  const page = await prisma.cmsPage.findUnique({
    where: { slug: "system-language-packs-registry" },
  });

  if (page?.content && Array.isArray((page.content as any).languages)) {
    return (page.content as any).languages as LanguagePackMeta[];
  }

  // Initialize registry if first run
  await prisma.cmsPage.upsert({
    where: { slug: "system-language-packs-registry" },
    create: {
      id: "system-language-packs-registry",
      slug: "system-language-packs-registry",
      title: "Language Registry",
      content: { languages: DEFAULT_LANGUAGES } as any,
      published: true,
    },
    update: {},
  });

  return DEFAULT_LANGUAGES;
}

export async function getLanguagePhrases(code: string): Promise<PhraseDictionary> {
  const page = await prisma.cmsPage.findUnique({
    where: { slug: `system-language-dict-${code}` },
  });

  if (page?.content && typeof (page.content as any).phrases === "object") {
    return (page.content as any).phrases;
  }

  // Return default English phrases as base
  if (code === "en") {
    await prisma.cmsPage.upsert({
      where: { slug: "system-language-dict-en" },
      create: {
        id: "system-language-dict-en",
        slug: "system-language-dict-en",
        title: "English Phrases",
        content: { phrases: DEFAULT_EN_PHRASES },
        published: true,
      },
      update: {},
    });
    return DEFAULT_EN_PHRASES;
  }

  // If another language has no custom translations yet, start with default English keys
  return { ...DEFAULT_EN_PHRASES };
}

export async function saveLanguagePhrases(code: string, phrases: PhraseDictionary): Promise<void> {
  await prisma.cmsPage.upsert({
    where: { slug: `system-language-dict-${code}` },
    create: {
      id: `system-language-dict-${code}`,
      slug: `system-language-dict-${code}`,
      title: `Language Phrases: ${code}`,
      content: { phrases },
      published: true,
    },
    update: {
      content: { phrases },
    },
  });
}

export async function createLanguagePack(code: string, name: string, countryCode: string): Promise<LanguagePackMeta> {
  const languages = await getLanguagesList();
  const existing = languages.find((l) => l.code.toLowerCase() === code.toLowerCase());
  if (existing) {
    throw new Error(`Language code '${code}' already exists`);
  }

  const newLang: LanguagePackMeta = {
    code: code.toLowerCase(),
    name,
    flag: countryCode.toUpperCase(),
    countryCode: countryCode.toUpperCase(),
    isDefault: false,
    enabled: true,
  };

  const updated = [...languages, newLang];

  await prisma.cmsPage.upsert({
    where: { slug: "system-language-packs-registry" },
    create: {
      id: "system-language-packs-registry",
      slug: "system-language-packs-registry",
      title: "Language Registry",
      content: { languages: updated } as any,
      published: true,
    },
    update: {
      content: { languages: updated } as any,
    },
  });

  // Copy english phrases initially
  const enPhrases = await getLanguagePhrases("en");
  await saveLanguagePhrases(newLang.code, enPhrases);

  return newLang;
}

export async function deleteLanguagePack(code: string): Promise<void> {
  if (code === "en") {
    throw new Error("Cannot delete English language pack");
  }

  const languages = await getLanguagesList();
  const updated = languages.filter((l) => l.code !== code);

  await prisma.cmsPage.update({
    where: { slug: "system-language-packs-registry" },
    data: { content: { languages: updated } as any },
  });

  try {
    await prisma.cmsPage.delete({
      where: { slug: `system-language-dict-${code}` },
    });
  } catch {}
}

export async function toggleLanguagePackStatus(code: string): Promise<LanguagePackMeta> {
  if (code === "en") {
    throw new Error("Cannot disable default English language pack");
  }

  const languages = await getLanguagesList();
  const target = languages.find((l) => l.code === code);
  if (!target) throw new Error("Language not found");

  target.enabled = !target.enabled;

  await prisma.cmsPage.update({
    where: { slug: "system-language-packs-registry" },
    data: { content: { languages } as any },
  });

  return target;
}
