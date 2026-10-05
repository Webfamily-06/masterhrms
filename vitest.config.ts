import { defineConfig } from "vitest/config";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "server/.env") });

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@prisma/client": path.resolve(__dirname, "./server/node_modules/@prisma/client"),
    },
  },
});
