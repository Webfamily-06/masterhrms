"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chat_folder_service_1 = require("../services/files/chat-folder.service");
async function main() {
    console.log("[Chat Attachment Backfill] Starting...");
    const result = await chat_folder_service_1.ChatFolderService.backfillExistingAttachments();
    console.log("[Chat Attachment Backfill] Complete:", result);
    process.exit(0);
}
main().catch((err) => {
    console.error("[Chat Attachment Backfill] Failed:", err);
    process.exit(1);
});
