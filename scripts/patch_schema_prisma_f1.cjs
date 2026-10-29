const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../server/prisma/schema.prisma");
let content = fs.readFileSync(filePath, "utf8");

const target = `  usages      MediaUsage[]

  @@index([tenantId, folder])
  @@map("media_files")
}`;

const replacement = `  usages      MediaUsage[]

  // F1 File Manager Extensions
  parentId       String?      @map("parent_id") @db.VarChar(36)
  isFolder       Boolean      @default(false) @map("is_folder")
  category       String       @default("Documents") @db.VarChar(50)
  originalFolder String?      @map("original_folder") @db.VarChar(100)

  parent         MediaFile?   @relation("FolderHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children       MediaFile[]  @relation("FolderHierarchy")
  stars          FileStar[]
  shares         FileShare[]

  @@index([tenantId, folder])
  @@index([tenantId, parentId])
  @@index([tenantId, isFolder])
  @@map("media_files")
}

model FileStar {
  id        String    @id @default(uuid()) @db.VarChar(36)
  fileId    String    @map("file_id") @db.VarChar(36)
  userId    String    @map("user_id") @db.VarChar(36)
  tenantId  String?   @map("tenant_id") @db.VarChar(36)
  createdAt DateTime  @default(now()) @map("created_at")
  file      MediaFile @relation(fields: [fileId], references: [id], onDelete: Cascade)

  @@unique([fileId, userId])
  @@index([userId, tenantId])
  @@map("file_stars")
}

model FileShare {
  id          String    @id @default(uuid()) @db.VarChar(36)
  fileId      String    @map("file_id") @db.VarChar(36)
  tenantId    String?   @map("tenant_id") @db.VarChar(36)
  sharedWith  String?   @map("shared_with") @db.VarChar(36)
  sharedRole  String?   @map("shared_role") @db.VarChar(50)
  accessLevel String    @default("view") @map("access_level") @db.VarChar(20)
  sharedBy    String    @map("shared_by") @db.VarChar(36)
  expiresAt   DateTime? @map("expires_at")
  revokedAt   DateTime? @map("revoked_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  file        MediaFile @relation(fields: [fileId], references: [id], onDelete: Cascade)

  @@index([fileId, sharedWith])
  @@index([tenantId, sharedWith])
  @@map("file_shares")
}`;

const crlfTarget = target.replace(/\n/g, "\r\n");
const crlfReplacement = replacement.replace(/\n/g, "\r\n");

if (content.includes(crlfTarget)) {
  content = content.replace(crlfTarget, crlfReplacement);
  fs.writeFileSync(filePath, content, "utf8");
  console.log("schema.prisma updated successfully (CRLF)!");
} else if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, "utf8");
  console.log("schema.prisma updated successfully (LF)!");
} else {
  console.error("Target block not found in schema.prisma!");
  process.exit(1);
}

