let app;
let initError = null;

try {
  const loaded = require("./dist/index.js");
  app = (loaded && typeof loaded === "object" && typeof loaded.default === "function")
    ? loaded.default
    : loaded;
} catch (err) {
  initError = err;
  console.error("FATAL INITIALIZATION ERROR:", err);
}

if (initError || typeof app !== "function") {
  const express = require("express");
  const fallbackApp = express();
  fallbackApp.all("*", (req, res) => {
    res.status(500).json({
      error: "FATAL_SERVER_INIT_ERROR",
      message: initError ? initError.message : "Loaded module is not a callable Express application",
      stack: initError ? initError.stack : null,
      name: initError ? initError.name : "InvalidExportType",
      appType: typeof app,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        HAS_DATABASE_URL: Boolean(process.env.DATABASE_URL),
        DATABASE_URL_PREFIX: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 25) + "..." : null,
      }
    });
  });
  module.exports = fallbackApp;
} else {
  module.exports = app;
}
