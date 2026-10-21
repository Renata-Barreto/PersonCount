import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig(({ command }) => ({
  root: fileURLToPath(new URL("./front", import.meta.url)),
  plugins: [
    react(),
    {
      name: "development-csp",
      transformIndexHtml(html) {
        // React Fast Refresh injects an inline module only in development.
        return command === "serve"
          ? html.replace(
              "script-src 'self';",
              "script-src 'self' 'unsafe-inline';",
            )
          : html;
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    proxy: { "/upload-history": "http://127.0.0.1:3000" },
  },
  build: { outDir: "../dist", emptyOutDir: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    clearMocks: true,
  },
}));
