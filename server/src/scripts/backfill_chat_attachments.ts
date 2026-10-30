import { ChatFolderService } from "../services/files/chat-folder.service";

async function main() {
  console.log("[Chat Attachment Backfill] Starting...");
  const result = await ChatFolderService.backfillExistingAttachments();
  console.log("[Chat Attachment Backfill] Complete:", result);
  process.exit(0);
}

main().catch((err) => {
  console.error("[Chat Attachment Backfill] Failed:", err);
  process.exit(1);
});

