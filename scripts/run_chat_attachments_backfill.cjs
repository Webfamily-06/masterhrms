/**
 * MasterHRMS - Chat Attachments Backfill Script
 *
 * Invocation:
 *   npx tsx scripts/run_chat_attachments_backfill.cjs
 *   or (after server build):
 *   node scripts/run_chat_attachments_backfill.cjs
 */

let ChatFolderService;
try {
  // Check if compiled JavaScript is available in server/dist
  ChatFolderService = require('../server/dist/services/files/chat-folder.service').ChatFolderService;
} catch {
  try {
    // Attempt resolving via ts-node if present
    require('../server/node_modules/ts-node/register');
    ChatFolderService = require('../server/src/services/files/chat-folder.service').ChatFolderService;
  } catch {
    // Direct require (when invoked via TypeScript-capable runtime like npx tsx)
    ChatFolderService = require('../server/src/services/files/chat-folder.service').ChatFolderService;
  }
}

async function run() {
  if (!ChatFolderService || typeof ChatFolderService.backfillExistingAttachments !== 'function') {
    throw new Error('ChatFolderService module could not be loaded. Please invoke using: npx tsx scripts/run_chat_attachments_backfill.cjs');
  }
  console.log('Running backfillExistingAttachments...');
  const res = await ChatFolderService.backfillExistingAttachments();
  console.log('Backfill result:', res);
  process.exit(0);
}

run().catch(err => {
  console.error('Backfill error:', err.message || err);
  process.exit(1);
});
