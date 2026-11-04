const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function run() {
  try {
    const totalRecords = await prisma.mediaFile.count();
    console.log('Total MediaFile records in DB:', totalRecords);
    
    const folders = await prisma.mediaFile.count({ where: { isFolder: true } });
    const files = await prisma.mediaFile.count({ where: { isFolder: false } });
    console.log('  Folders count:', folders);
    console.log('  Files count:', files);

    const disks = await prisma.mediaFile.groupBy({
      by: ['storageDisk'],
      _count: { id: true }
    });
    console.log('Storage disks breakdown:', disks);

    const categories = await prisma.mediaFile.groupBy({
      by: ['category'],
      _count: { id: true }
    });
    console.log('Categories breakdown:', categories);

    const tenants = await prisma.mediaFile.groupBy({
      by: ['tenantId'],
      _count: { id: true }
    });
    console.log('Tenants with files:', tenants.length);

    // Let's check files on disk
    const allFiles = await prisma.mediaFile.findMany({
      where: { isFolder: false },
      select: {
        id: true,
        fileName: true,
        filePath: true,
        storageDisk: true,
        folder: true,
        tenantId: true,
        fileSize: true
      }
    });

    console.log(`Auditing physical file existence for all ${allFiles.length} file records...`);
    let existingOnDisk = 0;
    let missingOnDisk = 0;
    let cloudOrExternal = 0;

    const uploadsRoot = path.resolve(__dirname, '../uploads');
    const missingList = [];

    for (const f of allFiles) {
      if (f.storageDisk === 'LOCAL') {
        const p1 = path.resolve(uploadsRoot, f.filePath.replace(/^[/\\]+/, ''));
        const p2 = path.resolve(uploadsRoot, 'files', f.filePath.replace(/^[/\\]+/, ''));
        const p3 = path.resolve(__dirname, '../', f.filePath.replace(/^[/\\]+/, ''));

        if (fs.existsSync(p1) || fs.existsSync(p2) || fs.existsSync(p3)) {
          existingOnDisk++;
        } else {
          missingOnDisk++;
          missingList.push(f);
        }
      } else {
        cloudOrExternal++;
      }
    }

    console.log(`Local files found on disk: ${existingOnDisk}`);
    console.log(`Local files missing on disk: ${missingOnDisk}`);
    console.log(`Cloud/Supabase files: ${cloudOrExternal}`);

    if (missingList.length > 0) {
      console.log('Sample missing files:', missingList.slice(0, 5));
    }

    // Check shares and ACLs
    const totalShares = await prisma.fileShare.count();
    const totalAcls = await prisma.fileAcl.count();
    console.log('Total FileShare records:', totalShares);
    console.log('Total FileAcl records:', totalAcls);

  } catch (err) {
    console.error('Error connecting to DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();

