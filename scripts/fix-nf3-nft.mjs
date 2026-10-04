// Workaround for an nf3 (nitro's file-tracer dependency) packaging issue:
// nf3 ships its own vendored copy of @vercel/nft at
// node_modules/nf3/dist/node_modules/@vercel/nft. That nested copy is not
// resolvable as a named ESM import ("nodeFileTrace" from "@vercel/nft")
// during nitro's "vercel" preset build, and breaks `npm run build`.
//
// Removing the nested copy makes Node's module resolution fall back to the
// top-level @vercel/nft (a direct devDependency of this project, see
// package.json), which resolves correctly. Safe to run on every install —
// this script is a no-op if the nested copy isn't present.
import { existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const brokenVendoredCopy = path.join(
  projectRoot,
  "node_modules",
  "nf3",
  "dist",
  "node_modules",
  "@vercel",
  "nft",
);

if (existsSync(brokenVendoredCopy)) {
  rmSync(brokenVendoredCopy, { recursive: true, force: true });
  console.log(
    "[postinstall] Removed nf3's vendored @vercel/nft copy (using top-level @vercel/nft instead).",
  );
}
