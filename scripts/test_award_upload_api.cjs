const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { MediaService } = require('../server/dist/services/media/media.service');

async function testUploadLogic() {
  console.log('--- Testing Award Type Image Buffer Validation & Storage ---');
  
  // 1. Create a 1x1 transparent PNG buffer
  const samplePngBuffer = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d450000000049454e44ae426082',
    'hex'
  );

  const validation = MediaService.validateImageBuffer(samplePngBuffer, 'image/png', 'sample-award.png');
  console.log('Validation result:', validation);

  if (!validation.isValid) {
    throw new Error('PNG validation failed!');
  }

  // 2. Test invalid executable rejection
  const invalidBuffer = Buffer.from('MZ90003000000004000000ffff0000b8000000000000004000000000000000', 'hex');
  const invalidValidation = MediaService.validateImageBuffer(invalidBuffer, 'application/x-dosexec', 'malicious.exe');
  console.log('Invalid executable rejection result:', invalidValidation);

  if (invalidValidation.isValid) {
    throw new Error('Security failure: Executable was not rejected!');
  }

  console.log('✅ Validation and security gates verified successfully!');
  await prisma.$disconnect();
}

testUploadLogic().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

