import { Linking, Share } from 'react-native';
import { Config } from '../../config/environment';
import { apiClient } from '../api/apiClient';

/**
 * Authoritative restricted extensions reconciled from server/src/routes/chat.routes.ts
 */
export const CHAT_RESTRICTED_EXTENSIONS = new Set<string>([
  'exe', 'bat', 'cmd', 'sh', 'bin', 'msi', 'apk', 'com', 'vbs', 'ps1',
  'scr', 'pif', 'app', 'dmg', 'pkg', 'deb', 'rpm', 'env', 'json', 'js',
  'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'php', 'py', 'pyc', 'rb', 'go',
  'java', 'class', 'jar', 'c', 'cpp', 'h', 'hpp', 'cs', 'sql', 'bash',
  'zsh', 'lua', 'pl', 'asp', 'aspx', 'jsp', 'wasm', 'yaml', 'yml', 'pem',
  'key', 'crt', 'cer', 'pfx', 'p12', 'svg', 'svgz', 'html', 'htm', 'xhtml', 'hta',
]);

export const MAX_CHAT_FILE_SIZE_BYTES = 30 * 1024 * 1024; // 30 MB
export const MAX_CHAT_ATTACHMENTS_PER_MESSAGE = 10;

export interface AttachmentValidationResult {
  valid: boolean;
  reason?: string;
}

export function extractFileExtension(fileName?: string | null): string {
  if (!fileName || typeof fileName !== 'string') return '';
  const trimmed = fileName.trim().toLowerCase();
  if (trimmed === '.env' || trimmed.endsWith('/.env')) return 'env';
  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot < 0 || lastDot === trimmed.length - 1) return '';
  return trimmed.slice(lastDot + 1);
}

/**
 * Validates file name, extension, and size against MasterHRMS Chat Security Policy.
 */
export function validateChatAttachmentCandidate(file: {
  name: string;
  size?: number;
  mimeType?: string;
}): AttachmentValidationResult {
  if (!file.name || !file.name.trim()) {
    return { valid: false, reason: 'File name is required.' };
  }

  const ext = extractFileExtension(file.name);
  if (ext && CHAT_RESTRICTED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      reason: `Files with .${ext} extension are blocked by workspace security policy.`,
    };
  }

  const mime = (file.mimeType || '').toLowerCase();
  if (mime.includes('svg') || mime.includes('html') || mime.includes('javascript')) {
    return {
      valid: false,
      reason: `MIME type "${file.mimeType}" is not permitted in chat attachments.`,
    };
  }

  if (typeof file.size === 'number' && file.size > MAX_CHAT_FILE_SIZE_BYTES) {
    return {
      valid: false,
      reason: 'File exceeds the 30 MB maximum attachment size limit.',
    };
  }

  return { valid: true };
}

/**
 * Validates that a URL uses a safe HTTP(S) scheme and resolves relative backend paths.
 * Rejects javascript:, data:, file:, vbscript:, or malformed schemes.
 */
export function resolveSafeBackendUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return null;
  }

  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    if (trimmed.includes('api.dicebear.com') && trimmed.includes('/svg?')) {
      return trimmed.replace('/svg?', '/png?');
    }
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return `${Config.API_BASE_URL}${trimmed}`;
  }

  return null;
}

/**
 * Builds the canonical authenticated download/inline endpoint for a chat media ID.
 */
export function buildChatAttachmentDownloadUrl(mediaId: string, inline = false): string {
  const safeId = encodeURIComponent(mediaId);
  return `${Config.API_BASE_URL}/api/chat/attachments/${safeId}/download${inline ? '?inline=1' : ''}`;
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function classifyAttachmentKind(
  mimeType?: string | null,
  fileName?: string | null
): 'image' | 'pdf' | 'audio' | 'video' | 'file' {
  const mime = (mimeType || '').toLowerCase();
  const ext = extractFileExtension(fileName);

  if (
    (mime.startsWith('image/') && !mime.includes('svg')) ||
    ['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif'].includes(ext)
  ) {
    return 'image';
  }
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) {
    return 'audio';
  }
  if (mime.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext)) {
    return 'video';
  }
  return 'file';
}

/**
 * Safely opens or shares an attachment URL after validating protocol safety.
 */
export async function openOrShareAttachment(params: {
  url?: string | null;
  mediaId?: string | null;
  fileName?: string;
}): Promise<boolean> {
  const targetUrl =
    resolveSafeBackendUrl(params.url) ||
    (params.mediaId ? buildChatAttachmentDownloadUrl(params.mediaId, false) : null);

  if (!targetUrl) {
    throw new Error('Attachment URL is invalid or blocked by security policy.');
  }

  // Use system share sheet to view/save without launching foreign browser whenever possible
  try {
    await Share.share({
      title: params.fileName || 'MasterHRMS Attachment',
      message: targetUrl,
      url: targetUrl,
    });
    return true;
  } catch {
    const canOpen = await Linking.canOpenURL(targetUrl).catch(() => false);
    if (canOpen) {
      await Linking.openURL(targetUrl);
      return true;
    }
  }
  return true;
}

/**
 * Downloads or saves media attachment locally via the platform's native share/save sheet.
 */
export async function downloadOrSaveMedia(params: {
  url?: string | null;
  mediaId?: string | null;
  fileName?: string;
}): Promise<boolean> {
  const targetUrl =
    resolveSafeBackendUrl(params.url) ||
    (params.mediaId ? buildChatAttachmentDownloadUrl(params.mediaId, false) : null);

  if (!targetUrl) {
    throw new Error('Media URL is invalid or blocked by security policy.');
  }

  await Share.share({
    title: params.fileName || 'MasterHRMS Media Download',
    message: `Save file: ${params.fileName || 'Attachment'}\n${targetUrl}`,
    url: targetUrl,
  });
  return true;
}

/**
 * Downloads RFC 5545 .ics calendar content using authenticated apiClient
 * (attaching Bearer JWT + x-tenant-id) and opens the native Share sheet.
 */
export async function exportAndShareIcs(
  endpointPath: string,
  queryParams?: Record<string, string | undefined>,
  shareTitle = 'MasterHRMS Calendar (.ics)'
): Promise<string> {
  const response = await apiClient.get<string>(endpointPath, {
    params: queryParams,
    responseType: 'text',
    headers: {
      Accept: 'text/calendar, text/plain, */*',
    },
  });

  const icsContent = typeof response.data === 'string' ? response.data : String(response.data || '');
  if (!icsContent.includes('BEGIN:VCALENDAR')) {
    throw new Error('Server did not return valid VCALENDAR (.ics) content.');
  }

  await Share.share({
    title: shareTitle,
    message: icsContent,
  });

  return icsContent;
}
