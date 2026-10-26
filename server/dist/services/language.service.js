"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLanguagesList = getLanguagesList;
exports.getLanguagePhrases = getLanguagePhrases;
exports.saveLanguagePhrases = saveLanguagePhrases;
exports.createLanguagePack = createLanguagePack;
exports.deleteLanguagePack = deleteLanguagePack;
exports.toggleLanguagePackStatus = toggleLanguagePackStatus;
const prisma_1 = require("../prisma");
const DEFAULT_LANGUAGES = [
    { code: "en", name: "English (US)", flag: "🇺🇸", countryCode: "US", isDefault: true, enabled: true },
    { code: "es", name: "Español", flag: "🇪🇸", countryCode: "ES", isDefault: false, enabled: true },
    { code: "fr", name: "Français", flag: "🇫🇷", countryCode: "FR", isDefault: false, enabled: true },
    { code: "de", name: "Deutsch", flag: "🇩🇪", countryCode: "DE", isDefault: false, enabled: true },
    { code: "hi", name: "हिन्दी (Hindi)", flag: "🇮🇳", countryCode: "IN", isDefault: false, enabled: true },
    { code: "ar", name: "العربية (Arabic)", flag: "🇦🇪", countryCode: "AE", isDefault: false, enabled: true },
];
const DEFAULT_EN_PHRASES = {
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
async function getLanguagesList() {
    const page = await prisma_1.rawPrisma.cmsPage.findUnique({
        where: { slug: "system-language-packs-registry" },
    });
    if (page?.content && Array.isArray(page.content.languages)) {
        return page.content.languages;
    }
    // Initialize registry if first run
    await prisma_1.rawPrisma.cmsPage.upsert({
        where: { slug: "system-language-packs-registry" },
        create: {
            id: "system-language-packs-registry",
            slug: "system-language-packs-registry",
            title: "Language Registry",
            content: { languages: DEFAULT_LANGUAGES },
            published: true,
        },
        update: {},
    });
    return DEFAULT_LANGUAGES;
}
async function getLanguagePhrases(code) {
    const page = await prisma_1.rawPrisma.cmsPage.findUnique({
        where: { slug: `system-language-dict-${code}` },
    });
    if (page?.content && typeof page.content.phrases === "object") {
        return page.content.phrases;
    }
    // Return default English phrases as base
    if (code === "en") {
        await prisma_1.rawPrisma.cmsPage.upsert({
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
async function saveLanguagePhrases(code, phrases) {
    await prisma_1.rawPrisma.cmsPage.upsert({
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
async function createLanguagePack(code, name, countryCode) {
    const languages = await getLanguagesList();
    const existing = languages.find((l) => l.code.toLowerCase() === code.toLowerCase());
    if (existing) {
        throw new Error(`Language code '${code}' already exists`);
    }
    const newLang = {
        code: code.toLowerCase(),
        name,
        flag: countryCode.toUpperCase(),
        countryCode: countryCode.toUpperCase(),
        isDefault: false,
        enabled: true,
    };
    const updated = [...languages, newLang];
    await prisma_1.rawPrisma.cmsPage.upsert({
        where: { slug: "system-language-packs-registry" },
        create: {
            id: "system-language-packs-registry",
            slug: "system-language-packs-registry",
            title: "Language Registry",
            content: { languages: updated },
            published: true,
        },
        update: {
            content: { languages: updated },
        },
    });
    // Copy english phrases initially
    const enPhrases = await getLanguagePhrases("en");
    await saveLanguagePhrases(newLang.code, enPhrases);
    return newLang;
}
async function deleteLanguagePack(code) {
    if (code === "en") {
        throw new Error("Cannot delete English language pack");
    }
    const languages = await getLanguagesList();
    const updated = languages.filter((l) => l.code !== code);
    await prisma_1.rawPrisma.cmsPage.update({
        where: { slug: "system-language-packs-registry" },
        data: { content: { languages: updated } },
    });
    try {
        await prisma_1.rawPrisma.cmsPage.delete({
            where: { slug: `system-language-dict-${code}` },
        });
    }
    catch { }
}
async function toggleLanguagePackStatus(code) {
    if (code === "en") {
        throw new Error("Cannot disable default English language pack");
    }
    const languages = await getLanguagesList();
    const target = languages.find((l) => l.code === code);
    if (!target)
        throw new Error("Language not found");
    target.enabled = !target.enabled;
    await prisma_1.rawPrisma.cmsPage.update({
        where: { slug: "system-language-packs-registry" },
        data: { content: { languages } },
    });
    return target;
}
