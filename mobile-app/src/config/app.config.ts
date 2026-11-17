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
  // Native Mobile Google Services & Firebase Configuration (Android & iOS Only)
  firebase: {
    projectId: 'masterhrms-ab50b',
    storageBucket: 'masterhrms-ab50b.firebasestorage.app',
    projectNumber: '102052771234',
    android: {
      packageName: 'com.masterhrms.app',
      appId: '1:102052771234:android:6fa54a57eca2c314f62efb',
      apiKey: 'AIzaSyDM4Dz9IiRjv2H_R_Xc_O86QtN8snnPHWY',
      googleServicesFile: './android/app/google-services.json',
    },
    ios: {
      bundleId: 'com.masterhrms.app',
      appId: '1:102052771234:ios:fdd34a4dd2e31a01f62efb',
      apiKey: 'AIzaSyBhWHyTvq6CsafXNzISGnlSStPypdifzKg',
      gcmSenderId: '102052771234',
      googleServicesFile: './ios/MasterHRMS/GoogleService-Info.plist',
    },
  },
};
