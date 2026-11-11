const fs = require('fs');

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [target, replacement] of replacements) {
    if (content.includes(target)) {
      content = content.replace(target, replacement);
      changed = true;
    } else {
      console.warn(`Target not found in ${filePath}:\n${target.slice(0, 80)}...`);
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

// 1. Language Select Emojis in ai-content-generator-modal.tsx (src and CMS)
const languageReplacements = [
  ['{ value: "English", label: "🇺🇸 English" }', '{ value: "English", label: "English" }'],
  ['{ value: "Tamil", label: "🇮🇳 Tamil (தமிழ்)" }', '{ value: "Tamil", label: "Tamil (தமிழ்)" }'],
  ['{ value: "Hindi", label: "🇮🇳 Hindi (हिन्दी)" }', '{ value: "Hindi", label: "Hindi (हिन्दी)" }'],
  ['{ value: "Arabic", label: "🇦🇪 Arabic (العربية)" }', '{ value: "Arabic", label: "Arabic (العربية)" }'],
  ['{ value: "Spanish", label: "🇪🇸 Spanish (Español)" }', '{ value: "Spanish", label: "Spanish (Español)" }'],
  ['{ value: "French", label: "🇫🇷 French (Français)" }', '{ value: "French", label: "French (Français)" }'],
  ['{ value: "German", label: "🇩🇪 German (Deutsch)" }', '{ value: "German", label: "German (Deutsch)" }'],
  ['{ value: "Japanese", label: "🇯🇵 Japanese (日本語)" }', '{ value: "Japanese", label: "Japanese (日本語)" }'],
];

replaceInFile('src/components/ai-content-generator-modal.tsx', languageReplacements);
replaceInFile('CMS/src/components/ai-content-generator-modal.tsx', languageReplacements);

// 2. Language Select Emojis in Settings (src and CMS)
const settingsLanguageReplacements = [
  ['<SelectItem value="en">🇬🇧 English</SelectItem>', '<SelectItem value="en">English</SelectItem>'],
  ['<SelectItem value="hi">🇮🇳 Hindi (हिंदी)</SelectItem>', '<SelectItem value="hi">Hindi (हिंदी)</SelectItem>'],
  ['<SelectItem value="es">🇪🇸 Spanish (Español)</SelectItem>', '<SelectItem value="es">Spanish (Español)</SelectItem>'],
  ['<SelectItem value="fr">🇫🇷 French (Français)</SelectItem>', '<SelectItem value="fr">French (Français)</SelectItem>'],
  ['<SelectItem value="ar">🇦🇪 Arabic (العربية - RTL)</SelectItem>', '<SelectItem value="ar">Arabic (العربية - RTL)</SelectItem>'],
];

replaceInFile('src/routes/_authenticated/super/settings.tsx', settingsLanguageReplacements);
replaceInFile('CMS/src/app/super/settings/page.tsx', settingsLanguageReplacements);

// 3. RetentionTab.tsx in CMS
replaceInFile('CMS/src/app/(workspace)/tenant/files/storage/RetentionTab.tsx', [
  [
    '<span>⚠️ Destructive Operation Notice</span>',
    '<ShieldAlert className="size-4 shrink-0" />\n              <span>Destructive Operation Notice</span>',
  ],
]);

// 4. Socket.ts emoji and debug logs (src)
replaceInFile('src/lib/socket.ts', [
  [
    'if (import.meta.env.DEV) console.log("⚡ [SOCKET_CLIENT] Connected! socketId:", globalSocket?.id);',
    '// Socket connected',
  ],
  [
    'globalSocket.on("connect_error", (err) => console.error("⚡ [SOCKET_CLIENT] Connection error:", err.message));',
    'globalSocket.on("connect_error", (err) => console.error("[SOCKET_CLIENT] Connection error:", err.message));',
  ],
  [
    'console.log("[Realtime] settings.updated received:", data);',
    '// [Realtime] settings.updated received',
  ],
]);

// Socket.ts emoji and debug logs (CMS)
replaceInFile('CMS/src/lib/socket.ts', [
  [
    '"⚡ [SOCKET_CLIENT] No NEXT_PUBLIC_SOCKET_URL configured — Socket.IO is disabled on this deployment. "',
    '"[SOCKET_CLIENT] No NEXT_PUBLIC_SOCKET_URL configured — Socket.IO is disabled on this deployment. "',
  ],
  [
    'if (process.env.NODE_ENV !== "production") console.log("⚡ [SOCKET_CLIENT] Connected! socketId:", globalSocket?.id);',
    '// Socket connected',
  ],
  [
    'console.warn("⚡ [SOCKET_CLIENT] Connection error:", err.message);',
    'console.warn("[SOCKET_CLIENT] Connection error:", err.message);',
  ],
  [
    'console.log("[Realtime] settings.updated received:", data);',
    '// [Realtime] settings.updated received',
  ],
]);

// 5. Forms.tsx dev console log (src and CMS)
replaceInFile('src/routes/_authenticated/_app/forms.tsx', [
  [
    `      if (import.meta.env.DEV) {
        console.log(\`[Statutory PDF Generator] Download Success: Form=\${formDefToUse.formNumber}, File=\${res.filename}, Size=\${(res.byteSize / 1024).toFixed(1)}KB, Time=\${elapsedMs}ms\`);
      }`,
    '',
  ],
]);

replaceInFile('CMS/src/app/(workspace)/forms/page.tsx', [
  [
    `      if (process.env.NODE_ENV !== "production") {
        console.log(\`[Statutory PDF Generator] Download Success: Form=\${formDefToUse.formNumber}, File=\${res.filename}, Size=\${(res.byteSize / 1024).toFixed(1)}KB, Time=\${elapsedMs}ms\`);
      }`,
    '',
  ],
]);

// 6. Hybrid Room Adapter console log (src and CMS)
replaceInFile('src/components/calling/hybrid-room-adapter.ts', [
  [
    'console.log("[HybridAdapter] Disconnected from SFU room");',
    '// Disconnected from SFU room',
  ],
]);

replaceInFile('CMS/src/components/calling/hybrid-room-adapter.ts', [
  [
    'console.log("[HybridAdapter] Disconnected from SFU room");',
    '// Disconnected from SFU room',
  ],
]);

// 7. Screen Share Stage console log (src and CMS)
replaceInFile('src/components/calling/screen-share-stage.tsx', [
  [
    'console.log("[SCREEN_SHARE_ENDED] Detected native screenTrack.onended event");',
    '// Native screenTrack ended',
  ],
]);

replaceInFile('CMS/src/components/calling/screen-share-stage.tsx', [
  [
    'console.log("[SCREEN_SHARE_ENDED] Detected native screenTrack.onended event");',
    '// Native screenTrack ended',
  ],
]);

// 8. QZ Print console log (src and CMS)
replaceInFile('src/lib/qz-print.ts', [
  [
    'console.log("QZ-Tray hardware printing service connected successfully.");',
    '// QZ-Tray connected',
  ],
]);

replaceInFile('CMS/src/lib/qz-print.ts', [
  [
    'console.log("QZ-Tray hardware printing service connected successfully.");',
    '// QZ-Tray connected',
  ],
]);

// 9. Inactivity Tracker console info (src and CMS)
replaceInFile('src/components/system-states/inactivity-tracker.tsx', [
  [
    'console.info("[Session Manager] User inactive for 15 minutes. Redirecting to lock screen.");',
    '// Redirecting inactive session to lock screen',
  ],
]);

replaceInFile('CMS/src/components/system-states/inactivity-tracker.tsx', [
  [
    'console.info("[Session Manager] User inactive for 15 minutes. Redirecting to lock screen.");',
    '// Redirecting inactive session to lock screen',
  ],
]);

console.log('Emoji and Console log cleanup completed.');

