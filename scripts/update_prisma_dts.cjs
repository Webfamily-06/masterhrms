const fs = require('fs');

const path = 'node_modules/.prisma/client/index.d.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Add fileId to OrganizationBrandingAssetCreateInput
if (!content.includes('fileId?: string | null\n    createdBy?: string | null')) {
  content = content.replace(
    'isActive?: boolean\n    createdBy?: string | null',
    'isActive?: boolean\n    fileId?: string | null\n    createdBy?: string | null'
  );
  content = content.replace(
    'isActive?: boolean\r\n    createdBy?: string | null',
    'isActive?: boolean\r\n    fileId?: string | null\r\n    createdBy?: string | null'
  );
}

// 2. Add fileId to OrganizationBrandingAssetWhereInput
if (!content.includes('fileId?: StringNullableFilter<"OrganizationBrandingAsset"> | string | null')) {
  content = content.replace(
    'isActive?: BoolFilter<"OrganizationBrandingAsset"> | boolean',
    'isActive?: BoolFilter<"OrganizationBrandingAsset"> | boolean\r\n    fileId?: StringNullableFilter<"OrganizationBrandingAsset"> | string | null'
  );
  content = content.replace(
    'isActive?: BoolFilter<"OrganizationBrandingAsset"> | boolean',
    'isActive?: BoolFilter<"OrganizationBrandingAsset"> | boolean\n    fileId?: StringNullableFilter<"OrganizationBrandingAsset"> | string | null'
  );
}

// 3. Add fileId to OrganizationBrandingAssetUpdateInput
if (!content.includes('fileId?: NullableStringFieldUpdateOperationsInput | string | null')) {
  content = content.replace(
    'isActive?: BoolFieldUpdateOperationsInput | boolean',
    'isActive?: BoolFieldUpdateOperationsInput | boolean\r\n    fileId?: NullableStringFieldUpdateOperationsInput | string | null'
  );
  content = content.replace(
    'isActive?: BoolFieldUpdateOperationsInput | boolean',
    'isActive?: BoolFieldUpdateOperationsInput | boolean\n    fileId?: NullableStringFieldUpdateOperationsInput | string | null'
  );
}

// 4. Add fileId to OrganizationBrandingAsset model type
if (!content.includes('fileId: string | null\n    createdBy: string | null')) {
  content = content.replace(
    'isActive: boolean\n    createdBy: string | null',
    'isActive: boolean\n    fileId: string | null\n    createdBy: string | null'
  );
  content = content.replace(
    'isActive: boolean\r\n    createdBy: string | null',
    'isActive: boolean\r\n    fileId: string | null\r\n    createdBy: string | null'
  );
}

// 5. Add fileId to EmployeeAwardCertificateCreateInput & Unchecked
if (!content.includes('fileId?: string | null\n    fileName: string')) {
  content = content.replace(
    'storagePath: string\n    fileName: string',
    'storagePath: string\n    fileId?: string | null\n    fileName: string'
  );
  content = content.replace(
    'storagePath: string\r\n    fileName: string',
    'storagePath: string\r\n    fileId?: string | null\r\n    fileName: string'
  );
}

// 6. Add fileId to EmployeeAwardCertificate model type
if (!content.includes('fileId: string | null\n    fileName: string')) {
  content = content.replace(
    'storagePath: string\n    fileName: string',
    'storagePath: string\n    fileId: string | null\n    fileName: string'
  );
  content = content.replace(
    'storagePath: string\r\n    fileName: string',
    'storagePath: string\r\n    fileId: string | null\r\n    fileName: string'
  );
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated node_modules/.prisma/client/index.d.ts with fileId');
