export const AppConfig = {
  name: 'MasterHRMS',
  tagline: 'Unified Enterprise Human Resource Management System',
  supportEmail: 'support@masterhrms.com',
  defaultLanguage: 'en',
  defaultTimezone: 'Asia/Kolkata',
  defaultBrandColor: '#FF6B00',
  defaultDarkColor: '#0F172A',
  supportedRoles: [
    'employee',
    'hr_admin',
    'admin',
    'tenant_admin',
    'workspace_admin',
    'manager',
  ] as const,
};
