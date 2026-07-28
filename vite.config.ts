// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import fs from "fs";
import path from "path";

function updateEnvMiddlewarePlugin() {
  return {
    name: "update-env-middleware",
    configureServer(server: any) {
      server.middlewares.use("/api/save-env", async (req: any, res: any) => {
        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk: any) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              const data = JSON.parse(body);
              const envPath = path.resolve(process.cwd(), ".env");
              let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

              const keysToUpdate: Record<string, string> = {
                VITE_SMTP_HOST: data.smtpHost || "",
                VITE_SMTP_PORT: data.smtpPort || "",
                VITE_SMTP_USER: data.smtpUser || "",
                VITE_SMTP_PASS: data.smtpPass || "",
                VITE_SMTP_ENCRYPTION: data.smtpEncryption || "",
                VITE_SMTP_FROM_NAME: data.smtpFromName || "",
                VITE_SMTP_FROM_EMAIL: data.smtpFromEmail || "",
                VITE_PUSHER_APP_ID: data.pusherAppId || "",
                VITE_PUSHER_KEY: data.pusherKey || "",
                VITE_PUSHER_SECRET: data.pusherSecret || "",
                VITE_PUSHER_CLUSTER: data.pusherCluster || "",
                VITE_PUSHER_ENABLED: String(data.pusherEnabled),
              };

              for (const [key, val] of Object.entries(keysToUpdate)) {
                const regex = new RegExp(`^${key}=.*$`, "m");
                if (regex.test(envContent)) {
                  envContent = envContent.replace(regex, `${key}="${val}"`);
                } else {
                  envContent += `\n${key}="${val}"`;
                }
              }

              fs.writeFileSync(envPath, envContent.trim() + "\n", "utf-8");
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: true, message: ".env updated on disk" }));
            } catch (err: any) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          res.writeHead(405, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Method not allowed" }));
        }
      });
    },
  };
}

export default defineConfig({
  vite: {
    plugins: [updateEnvMiddlewarePlugin()],
    optimizeDeps: {
      force: true,
    },
    server: {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
