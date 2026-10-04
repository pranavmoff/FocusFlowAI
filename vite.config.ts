import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";
import path from "node:path";

// Vercel-targeted build for TanStack Start.
// - On Vercel (VERCEL=1 is set automatically in their build env) we emit
//   `.vercel/output` via the `vercel` preset (Build Output API v3).
// - Everywhere else (local builds, other hosts) we fall back to the
//   `cloudflare-module` preset, writing to `dist/`.
// - Set `NITRO_PRESET` to override (e.g. "vercel-edge", "node-server").
const nitroPreset =
  process.env.NITRO_PRESET || (process.env.VERCEL ? "vercel" : "cloudflare-module");

// Automatically use Vercel's production URL for the site URL if not explicitly set
if (!process.env.VITE_SITE_URL) {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    process.env.VITE_SITE_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  } else if (process.env.VERCEL_URL) {
    process.env.VITE_SITE_URL = `https://${process.env.VERCEL_URL}`;
  }
}

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"],
  },
  server: {
    host: "::",
    port: Number(process.env.PORT) || 8080,
  },
  preview: {
    host: "::",
    port: Number(process.env.PORT) || 8080,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
    }),
    nitro({
      preset: nitroPreset,
      // The `vercel` preset writes to `.vercel/output` (Build Output API v3).
      // Other presets (e.g. cloudflare-module for local/non-Vercel builds)
      // write to `dist/` instead.
      ...(nitroPreset === "vercel" ? {} : { output: { dir: "dist" } }),
    }),
    react(),
  ],
});
