/**
 * MASTERHRMS — Phase F5 System Folder Service
 * 
 * Manages the canonical system folder hierarchy:
 * App Files/
 * └── {Module Name}/
 *     └── {Page Name}/
 * 
 * System folders are auto-provisioned, linked to navigation registry definitions,
 * owned by SYSTEM, and protected against user rename, move, and trash/purge.
 */

import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
import { FileInvariantsService } from "./file-invariants.service";

const prisma = rawPrisma || proxiedPrisma;

export interface EnsureSystemFolderOptions {
  tenantId: string;
  moduleKey: string;
  pageKey: string;
  moduleLabel?: string;
  pageLabel?: string;
  actorId?: string;
}

export class SystemFolderService {
  /**
   * Human-readable label mappings for modules and pages
   */
  private static readonly MODULE_LABELS: Record<string, string> = {
    chat: "Chat",
    expenses: "Expenses",
    leave: "Leave",
    recruitment: "Recruitment",
    employees: "Employees",
    profile: "Profile",
    settings: "Settings",
    support: "Support",
    helpdesk: "Helpdesk",
    billing: "Billing",
    accounting: "Accounting",
    crm: "CRM",
    documents: "Documents",
    assets: "Assets",
    cms: "CMS",
    core: "Core HR",
  };

  private static readonly PAGE_LABELS: Record<string, string> = {
    receipts: "Receipts",
    claims: "Expense Claims",
    candidates: "Candidates",
    resumes: "Resumes",
    avatars: "Avatars",
    branding: "Branding",
    tickets: "Tickets",
    attachments: "Attachments",
    "voice-notes": "Voice Notes",
    "medical-proofs": "Medical Proofs",
    contracts: "Contracts",
    kyc: "KYC Documents",
    imports: "Imports",
    "payment-proofs": "Payment Proofs",
    general: "General",
  };

  public static getModuleLabel(key: string, override?: string): string {
    if (override && override.trim()) return override.trim();
    const cleanKey = key.toLowerCase().trim();
    return this.MODULE_LABELS[cleanKey] || cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
  }

  public static getPageLabel(key: string, override?: string): string {
    if (override && override.trim()) return override.trim();
    const cleanKey = key.toLowerCase().trim();
    return this.PAGE_LABELS[cleanKey] || cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
  }

  /**
   * Ensures the existence of the canonical system folder hierarchy:
   * App Files / {Module} / {Page}
   */
  public static async ensureSystemFolder(options: EnsureSystemFolderOptions): Promise<{
    rootFolder: any;
    moduleFolder: any;
    targetFolder: any;
  }> {
    const { tenantId, moduleKey, pageKey, actorId = "system" } = options;
    const moduleName = this.getModuleLabel(moduleKey, options.moduleLabel);
    const pageName = this.getPageLabel(pageKey, options.pageLabel);

    // 1. Root: App Files
    let rootFolder = await prisma.mediaFile.findFirst({
      where: {
        tenantId,
        isFolder: true,
        parentId: null,
        fileName: "App Files",
        deletedAt: null,
      },
    });

    if (!rootFolder) {
      rootFolder = await prisma.mediaFile.create({
        data: {
          tenantId,
          fileName: "App Files",
          nameKey: "app files",
          filePath: "App Files",
          url: "",
          storageDisk: "LOCAL",
          mimeType: "inode/directory",
          fileSize: 0,
          checksumSha: "",
          folder: "App Files",
          isFolder: true,
          parentId: null,
          ownerType: "SYSTEM",
          ownerId: "system",
          uploadedBy: actorId,
          type: "FOLDER",
          category: "System",
          status: "ACTIVE",
          materializedPath: "/App Files/",
          depth: 0,
          systemModule: "system",
          systemPage: "root",
          tags: ["system", "app-files"],
        },
      });
    }

    // 2. Module Folder: App Files / {Module Name}
    let moduleFolder = await prisma.mediaFile.findFirst({
      where: {
        tenantId,
        isFolder: true,
        parentId: rootFolder.id,
        systemModule: moduleKey.toLowerCase(),
        deletedAt: null,
      },
    });

    if (!moduleFolder) {
      moduleFolder = await prisma.mediaFile.create({
        data: {
          tenantId,
          fileName: moduleName,
          nameKey: moduleName.toLowerCase(),
          filePath: `App Files/${moduleName}`,
          url: "",
          storageDisk: "LOCAL",
          mimeType: "inode/directory",
          fileSize: 0,
          checksumSha: "",
          folder: `App Files/${moduleName}`,
          isFolder: true,
          parentId: rootFolder.id,
          ownerType: "SYSTEM",
          ownerId: "system",
          uploadedBy: actorId,
          type: "FOLDER",
          category: "System",
          status: "ACTIVE",
          materializedPath: `/App Files/${moduleName}/`,
          depth: 1,
          systemModule: moduleKey.toLowerCase(),
          tags: ["system", "module", moduleKey.toLowerCase()],
        },
      });
    }

    // 3. Page Folder: App Files / {Module Name} / {Page Name}
    let targetFolder = await prisma.mediaFile.findFirst({
      where: {
        tenantId,
        isFolder: true,
        parentId: moduleFolder.id,
        systemPage: pageKey.toLowerCase(),
        deletedAt: null,
      },
    });

    if (!targetFolder) {
      targetFolder = await prisma.mediaFile.create({
        data: {
          tenantId,
          fileName: pageName,
          nameKey: pageName.toLowerCase(),
          filePath: `App Files/${moduleName}/${pageName}`,
          url: "",
          storageDisk: "LOCAL",
          mimeType: "inode/directory",
          fileSize: 0,
          checksumSha: "",
          folder: `App Files/${moduleName}/${pageName}`,
          isFolder: true,
          parentId: moduleFolder.id,
          ownerType: "SYSTEM",
          ownerId: "system",
          uploadedBy: actorId,
          type: "FOLDER",
          category: "System",
          status: "ACTIVE",
          materializedPath: `/App Files/${moduleName}/${pageName}/`,
          depth: 2,
          systemModule: moduleKey.toLowerCase(),
          systemPage: pageKey.toLowerCase(),
          tags: ["system", "page", moduleKey.toLowerCase(), pageKey.toLowerCase()],
        },
      });
    }

    return { rootFolder, moduleFolder, targetFolder };
  }

  /**
   * Lists all system folders for a tenant grouped by module
   */
  public static async listSystemFolders(tenantId: string) {
    const folders = await prisma.mediaFile.findMany({
      where: {
        tenantId,
        isFolder: true,
        ownerType: "SYSTEM",
        deletedAt: null,
      },
      orderBy: [{ depth: "asc" }, { fileName: "asc" }],
      include: {
        _count: {
          select: {
            children: true,
          },
        },
      },
    });

    return folders;
  }

  /**
   * Asserts that a folder or file is not protected as system infrastructure
   */
  public static assertNotSystemNode(node: { systemModule?: string | null; systemPage?: string | null; ownerType?: string | null }) {
    if (node.systemModule || node.systemPage || node.ownerType === "SYSTEM") {
      const err: any = new Error("System folders and files cannot be modified, renamed, moved, or deleted.");
      err.status = 403;
      err.code = "SYSTEM_NODE_PROTECTED";
      throw err;
    }
  }
}

