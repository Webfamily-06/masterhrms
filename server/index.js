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

// Uncrashable Serverless Function handler
const handler = (req, res) => {
  if (initError || typeof app !== "function") {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({
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
    }, null, 2));
  }

  try {
    return app(req, res);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({
      error: "UNHANDLED_SERVER_INVOCATION_ERROR",
      message: err.message,
      stack: err.stack,
    }, null, 2));
  }
};

handler.default = handler;
module.exports = handler;
