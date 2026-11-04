const fs = require('fs');
const path = require('path');

function getDirStats(dir, depth = 0, maxDepth = 2) {
  let totalBytes = 0;
  let fileCount = 0;
  const subDirs = [];
  const largeFiles = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      try {
        if (entry.isDirectory()) {
          const sub = getDirStats(full, depth + 1, maxDepth);
          totalBytes += sub.totalBytes;
          fileCount += sub.fileCount;
          if (depth < maxDepth) {
            subDirs.push({ name: entry.name, path: full, bytes: sub.totalBytes, files: sub.fileCount });
          }
        } else if (entry.isFile()) {
          const stat = fs.statSync(full);
          totalBytes += stat.size;
          fileCount++;
          if (stat.size > 20 * 1024 * 1024) { // > 20MB
            largeFiles.push({ path: full, bytes: stat.size });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}

  return { totalBytes, fileCount, subDirs, largeFiles };
}

console.log('Scanning repository root...');
const start = Date.now();
const rootStats = getDirStats('.', 0, 2);
console.log(`Scan completed in ${((Date.now() - start) / 1000).toFixed(1)}s\n`);

console.log(`Total Directory Size: ${(rootStats.totalBytes / (1024 * 1024 * 1024)).toFixed(3)} GB (${(rootStats.totalBytes / (1024 * 1024)).toFixed(1)} MB)`);
console.log(`Total File Count: ${rootStats.fileCount}\n`);

// Sort top-level directories
const topEntries = fs.readdirSync('.', { withFileTypes: true }).map(e => {
  const full = path.join('.', e.name);
  if (e.isDirectory()) {
    const s = getDirStats(full, 0, 0);
    return { name: e.name, isDir: true, bytes: s.totalBytes, files: s.fileCount };
  } else {
    try {
      const stat = fs.statSync(full);
      return { name: e.name, isDir: false, bytes: stat.size, files: 1 };
    } catch {
      return { name: e.name, isDir: false, bytes: 0, files: 0 };
    }
  }
}).sort((a, b) => b.bytes - a.bytes);

console.log('=== TOP LEVEL DIRECTORIES & FILES (OVER 5 MB) ===');
topEntries.forEach(e => {
  if (e.bytes > 5 * 1024 * 1024) {
    const mb = (e.bytes / (1024 * 1024)).toFixed(1);
    const gb = (e.bytes / (1024 * 1024 * 1024)).toFixed(2);
    console.log(`  ${e.name.padEnd(30)} [${e.isDir ? 'DIR ' : 'FILE'}] ${mb.padStart(9)} MB (${gb} GB) - ${e.files} files`);
  }
});

