const esbuild = require("esbuild");
const path = require("path");

async function build() {
  console.log("Building calling test harness bundle with esbuild...");
  try {
    await esbuild.build({
      entryPoints: [path.join(__dirname, "../scratch/calling-test-harness.tsx")],
      bundle: true,
      outfile: path.join(__dirname, "../scratch/harness-bundle.js"),
      format: "iife",
      loader: {
        ".tsx": "tsx",
        ".ts": "ts",
        ".js": "jsx",
      },
      alias: {
        "@": path.resolve(__dirname, "../src"),
      },
      define: {
        "process.env.NODE_ENV": JSON.stringify("development"),
      },
      sourcemap: false,
    });
    console.log("Calling test harness bundle built successfully!");
  } catch (err) {
    console.error("Bundle build failed:", err);
    process.exit(1);
  }
}

build();

