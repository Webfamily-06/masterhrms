import path from 'path';
import { ValidationResult } from './storage.types';

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 Megabytes

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

export const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];

/**
 * Inspects raw buffer binary magic bytes and validates size/type safety.
 * Rejects executables, scripts, and disguised payloads.
 */
export function validateFileBuffer(
  buffer: Buffer,
  originalFilename: string,
  declaredMimeType?: string
): ValidationResult {
  // 1. Check empty buffer
  if (!buffer || buffer.length === 0) {
    return { isValid: false, error: 'Uploaded file is empty (0 bytes).' };
  }

  // 2. Enforce strict 10MB ceiling
  if (buffer.length > MAX_UPLOAD_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File size exceeds 10MB limit (received ${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  // 3. Reject executable and script signatures immediately
  // DOS / Windows PE executable ("MZ")
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { isValid: false, error: 'Executable binaries (.exe/.dll) are strictly prohibited.' };
  }

  // Linux ELF binary
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x7f &&
    buffer[1] === 0x45 &&
    buffer[2] === 0x4c &&
    buffer[3] === 0x46
  ) {
    return { isValid: false, error: 'Executable ELF binaries are strictly prohibited.' };
  }

  // Shell script / PHP / HTML script in headers
  const headerAscii = buffer.slice(0, 100).toString('ascii').toLowerCase();
  if (
    headerAscii.startsWith('#!/') ||
    headerAscii.includes('<?php') ||
    headerAscii.includes('<script') ||
    headerAscii.includes('<!doctype html')
  ) {
    return { isValid: false, error: 'Script and executable files are strictly prohibited.' };
  }

  // 4. Verify legitimate file magic signatures
  let detectedMime: string | undefined;
  let detectedExt: string | undefined;

  // PDF signature: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    detectedMime = 'application/pdf';
    detectedExt = '.pdf';
  }
  // PNG signature: \x89PNG\r\n\x1a\n (0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A)
  else if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    detectedMime = 'image/png';
    detectedExt = '.png';
  }
  // JPEG / JPG signature: \xFF\xD8\xFF (0xFF 0xD8 0xFF)
  else if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    detectedMime = 'image/jpeg';
    detectedExt = '.jpg';
  }

  if (!detectedMime || !detectedExt) {
    return {
      isValid: false,
      error: 'Invalid file signature. Only authentic PDF, PNG, and JPEG documents are permitted.',
    };
  }

  // 5. Cross-check filename extension
  const fileExt = path.extname(originalFilename || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
    return {
      isValid: false,
      error: `File extension '${fileExt}' is not allowed. Only .pdf, .png, .jpg, and .jpeg are supported.`,
    };
  }

  // 6. Ensure extension matches binary magic bytes (prevent e.g. disguised .exe.pdf or .jpg with pdf header)
  if (detectedExt === '.pdf' && fileExt !== '.pdf') {
    return {
      isValid: false,
      error: `MIME mismatch: File contains PDF binary data but has extension '${fileExt}'.`,
    };
  }
  if (
    detectedExt === '.jpg' &&
    fileExt !== '.jpg' &&
    fileExt !== '.jpeg'
  ) {
    return {
      isValid: false,
      error: `MIME mismatch: File contains JPEG binary data but has extension '${fileExt}'.`,
    };
  }
  if (detectedExt === '.png' && fileExt !== '.png') {
    return {
      isValid: false,
      error: `MIME mismatch: File contains PNG binary data but has extension '${fileExt}'.`,
    };
  }

  return {
    isValid: true,
    detectedMime,
    detectedExt,
  };
}

export const FileValidator = {
  validateFile: validateFileBuffer,
};

