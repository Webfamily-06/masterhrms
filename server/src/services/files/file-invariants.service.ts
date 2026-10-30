import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
const prisma = rawPrisma || proxiedPrisma;

const WINDOWS_RESERVED_NAMES = new Set([
  "con", "prn", "aux", "nul",
  "com1", "com2", "com3", "com4", "com5", "com6", "com7", "com8", "com9",
  "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9",
]);

// Characters forbidden by Windows Explorer: \ / : * ? " < > |
const INVALID_WINDOWS_CHARACTERS_REGEX = /[\\/:*?"<>|]/;

export interface ValidationOutcome {
  isValid: boolean;
  error?: string;
  code?: string;
}

export class FileInvariantsService {
  /**
   * Validates a file or folder name against Windows 11 Explorer filename constraints.
   */
  public static validateFileName(name: string): ValidationOutcome {
    if (!name || typeof name !== "string") {
      return { isValid: false, error: "A file or folder name must be provided.", code: "NAME_REQUIRED" };
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return { isValid: false, error: "Name cannot be empty or only whitespace.", code: "NAME_EMPTY" };
    }

    if (name.length > 255) {
      return { isValid: false, error: "Name cannot exceed 255 characters.", code: "NAME_TOO_LONG" };
    }

    // Windows disallows trailing dots or spaces
    if (name.endsWith(".") || name.endsWith(" ")) {
      return {
        isValid: false,
        error: "Names cannot end with a period or space (Windows filesystem convention).",
        code: "INVALID_TRAILING_CHAR",
      };
    }

    // Windows invalid characters: \ / : * ? " < > |
    if (INVALID_WINDOWS_CHARACTERS_REGEX.test(name)) {
      return {
        isValid: false,
        error: 'A name cannot contain any of the following characters: \\ / : * ? " < > |',
        code: "INVALID_CHARACTERS",
      };
    }

    // Prohibit ASCII control characters (0-31)
    for (let i = 0; i < name.length; i++) {
      if (name.charCodeAt(i) < 32) {
        return {
          isValid: false,
          error: "Name cannot contain control characters.",
          code: "CONTROL_CHARACTERS_PROHIBITED",
        };
      }
    }

    // Windows reserved device names: CON, PRN, AUX, NUL, COM1-9, LPT1-9
    // Must check base name without extension
    const baseName = name.split(".")[0].trim().toLowerCase();
    if (WINDOWS_RESERVED_NAMES.has(baseName)) {
      return {
        isValid: false,
        error: `"${baseName.toUpperCase()}" is a reserved system device name and cannot be used.`,
        code: "RESERVED_DEVICE_NAME",
      };
    }

    return { isValid: true };
  }

  /**
   * Normalizes a name for case-insensitive sibling uniqueness.
   */
  public static computeNameKey(name: string): string {
    return name.trim().toLowerCase();
  }

  /**
   * Enforces sibling uniqueness in the same folder / parent.
   */
  public static async assertSiblingUniqueness(
    tx: any,
    tenantId: string | null,
    parentId: string | null,
    nameKey: string,
    excludeNodeId?: string
  ): Promise<void> {
    const existing = await tx.mediaFile.findFirst({
      where: {
        tenantId,
        parentId: parentId || null,
        nameKey,
        status: "ACTIVE",
        deletedAt: null,
        ...(excludeNodeId ? { id: { not: excludeNodeId } } : {}),
      },
    });

    if (existing) {
      throw new Error(`An item named "${existing.fileName}" already exists in this destination.`);
    }
  }

  /**
   * Enforces hierarchy rules for moves:
   * - Folder cannot be moved into itself or any descendant.
   * - Target depth cannot exceed 50.
   */
  public static async assertValidMove(
    tx: any,
    nodeId: string,
    targetParentId: string | null
  ): Promise<{ newMaterializedPath: string; newDepth: number }> {
    const node = await tx.mediaFile.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new Error("Item to move does not exist.");
    }

    if (node.systemModule || node.systemPage) {
      throw new Error("System folders and files cannot be moved.");
    }

    if (targetParentId === null) {
      // Moving to root
      return {
        newMaterializedPath: `/${node.id}`,
        newDepth: 0,
      };
    }

    if (targetParentId === nodeId) {
      throw new Error("Cannot move a folder into itself.");
    }

    const targetParent = await tx.mediaFile.findUnique({
      where: { id: targetParentId },
    });

    if (!targetParent) {
      throw new Error("Destination parent folder not found.");
    }

    if (targetParent.type !== "FOLDER") {
      throw new Error("Target destination must be a folder.");
    }

    if (targetParent.status === "TRASHED" || targetParent.deletedAt) {
      throw new Error("Cannot move items into a trashed folder.");
    }

    if (node.type === "FOLDER") {
      // Check if targetParent is node or descendant of node
      const nodePath = node.materializedPath || `/${node.id}`;
      const targetPath = targetParent.materializedPath || `/${targetParent.id}`;

      if (targetPath === nodePath || targetPath.startsWith(`${nodePath}/`)) {
        throw new Error("Cannot move a folder into itself or one of its subfolders.");
      }
    }

    const newDepth = (targetParent.depth || 0) + 1;
    if (newDepth > 50) {
      throw new Error("Directory nesting exceeds maximum permitted depth (50 levels).");
    }

    const newMaterializedPath = `${targetParent.materializedPath || `/${targetParent.id}`}/${node.id}`;
    return { newMaterializedPath, newDepth };
  }

  /**
   * Recursively updates materializedPath and depth for all descendants of a folder.
   */
  public static async updateDescendantPaths(
    tx: any,
    folderId: string,
    oldPath: string,
    newPath: string,
    depthDiff: number
  ): Promise<void> {
    const descendants = await tx.mediaFile.findMany({
      where: {
        materializedPath: { startsWith: `${oldPath}/` },
      },
    });

    for (const desc of descendants) {
      const updatedPath = desc.materializedPath.replace(oldPath, newPath);
      const updatedDepth = Math.max(0, (desc.depth || 0) + depthDiff);
      await tx.mediaFile.update({
        where: { id: desc.id },
        data: {
          materializedPath: updatedPath,
          depth: updatedDepth,
        },
      });
    }
  }
}

