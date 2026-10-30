import { Router, Request, Response } from "express";
import { FileAclService } from "../services/files/file-acl.service";
import { StorageProviderFactory } from "../services/storage/storage-provider.factory";
import { rawPrisma, prisma as proxiedPrisma } from "../prisma";

const prisma = rawPrisma || proxiedPrisma;

export const publicFilesRouter = Router();

/**
 * GET /api/v1/public/files/link/:token
 * Public endpoint to fetch file info for an unguessable token.
 * Safe from leaking private file existence; returns 404 on invalid or expired tokens.
 */
publicFilesRouter.get("/link/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.query;

    const result = await FileAclService.verifyPublicLink({
      token,
      password: password ? String(password) : undefined,
    });

    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    return res.json({
      file: result.file || null,
      allowDownload: result.allowDownload,
      requiresPassword: result.requiresPassword,
      isPasswordValid: result.isPasswordValid,
    });
  } catch (err: any) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    return res.status(err.status || 404).json({ error: err.message || "Link not found or expired." });
  }
});

/**
 * POST /api/v1/public/files/link/:token/verify
 * Public endpoint to verify a password-protected link.
 */
publicFilesRouter.post("/link/:token/verify", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || typeof password !== "string" || !password.trim()) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
      return res.status(400).json({ error: "Password is required." });
    }

    const result = await FileAclService.verifyPublicLink({
      token,
      password,
    });

    if (result.requiresPassword && !result.isPasswordValid) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
      return res.status(401).json({ error: "Invalid password." });
    }

    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    return res.json({
      success: true,
      file: result.file,
      allowDownload: result.allowDownload,
    });
  } catch (err: any) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    return res.status(err.status || 401).json({ error: err.message || "Invalid password." });
  }
});

/**
 * POST /api/v1/public/files/link/:token/download
 * Generates an authorized, short-lived signed download URL for public visitors.
 */
publicFilesRouter.post("/link/:token/download", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const result = await FileAclService.verifyPublicLink({
      token,
      password,
    });

    if (result.requiresPassword && !result.isPasswordValid) {
      return res.status(401).json({ error: "Password required to download this file." });
    }

    if (!result.file) {
      return res.status(404).json({ error: "File not found or access denied." });
    }

    if (!result.allowDownload) {
      return res.status(403).json({ error: "Download is not permitted for this link." });
    }

    // Fetch storage key
    const file = await prisma.mediaFile.findUnique({
      where: { id: result.file.id },
      include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } },
    });

    if (!file) {
      return res.status(404).json({ error: "File not found." });
    }

    const latestVersion = file.versions?.[0];
    const storageKey = latestVersion?.storageKey || file.filePath;
    const storageProvider = StorageProviderFactory.getProvider();

    // Short-lived 60-second signed URL for public link download
    const signedUrl = await storageProvider.getSignedDownloadUrl(
      storageKey,
      file.fileName,
      60
    );

    // Audit public link download
    if (file.tenantId) {
      await prisma.fileActivity.create({
        data: {
          fileId: file.id,
          tenantId: file.tenantId,
          actorId: "anonymous_public",
          action: "PUBLIC_LINK_DOWNLOAD",
          metaJson: { fileName: file.fileName, ip: req.ip },
        },
      });
    }

    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    return res.json({
      downloadUrl: signedUrl,
      fileName: file.fileName,
      expiresInSeconds: 60,
    });
  } catch (err: any) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    return res.status(err.status || 404).json({ error: err.message || "Download failed." });
  }
});

