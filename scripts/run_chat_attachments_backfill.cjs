const { ChatFolderService } = require('../server/src/services/files/chat-folder.service');

async function run() {
  console.log('Running backfillExistingAttachments...');
  const res = await ChatFolderService.backfillExistingAttachments();
  console.log('Backfill result:', res);
  process.exit(0);
}

run().catch(err => {
  console.error('Backfill error:', err);
  process.exit(1);
});

