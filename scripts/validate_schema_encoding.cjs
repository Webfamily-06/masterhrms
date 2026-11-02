/**
 * Prisma Schema Encoding Validator
 * 
 * Verifies that all Prisma schema files (*.prisma) across the repository
 * are strictly encoded in UTF-8 without Byte Order Mark (BOM).
 * 
 * Prisma CLI (P1012) fails on schemas with a UTF-8 BOM (0xEF 0xBB 0xBF).
 * This check runs in pre-build and CI to prevent regressions.
 */

const fs = require('fs');
const path = require('path');

function findPrismaFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.git', '.next', 'dist', 'build', '.agents'].includes(entry.name)) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findPrismaFiles(fullPath, fileList);
    } else if (entry.name.endsWith('.prisma')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function findRepoRoot(startDir) {
  let curr = startDir;
  while (curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, 'package.json')) && fs.existsSync(path.join(curr, 'server'))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return startDir;
}

function validateSchemaEncoding() {
  const repoRoot = findRepoRoot(__dirname);
  const prismaFiles = findPrismaFiles(repoRoot);

  if (prismaFiles.length === 0) {
    console.error('[Schema Encoding] Error: No .prisma files found in repository.');
    process.exit(1);
  }

  let hasError = false;

  for (const file of prismaFiles) {
    const relPath = path.relative(repoRoot, file);
    const buf = fs.readFileSync(file);

    // Check for UTF-8 BOM (0xEF, 0xBB, 0xBF)
    if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
      console.error(`[Schema Encoding] FAIL: UTF-8 BOM detected in ${relPath}!`);
      console.error(`  Prisma schema validation fails with P1012 when a BOM is present.`);
      console.error(`  Remove the BOM (bytes 0xEF 0xBB 0xBF) before committing.`);
      hasError = true;
      continue;
    }

    // Check for valid UTF-8
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      decoder.decode(buf);
      console.log(`[Schema Encoding] PASS: ${relPath} (Clean UTF-8, no BOM)`);
    } catch (err) {
      console.error(`[Schema Encoding] FAIL: ${relPath} contains invalid UTF-8 byte sequences: ${err.message}`);
      hasError = true;
    }
  }

  if (hasError) {
    process.exit(1);
  }

  console.log(`[Schema Encoding] All ${prismaFiles.length} Prisma schema file(s) verified successfully.`);
}

validateSchemaEncoding();
