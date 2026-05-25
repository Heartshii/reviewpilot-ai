import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "..");
const manifestPath = path.join(repoRoot, "convex", "migrations", "manifest.json");

function loadManifest() {
  const raw = fs.readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(raw);
  if (!Array.isArray(manifest.migrations)) {
    throw new Error("Migration manifest must include a migrations array.");
  }
  return manifest;
}

function checkManifest() {
  const manifest = loadManifest();
  const ids = new Set();

  for (const migration of manifest.migrations) {
    if (!migration.id || !migration.title || !migration.status) {
      throw new Error(
        `Migration entry is missing required fields: ${JSON.stringify(migration)}`
      );
    }
    if (ids.has(migration.id)) {
      throw new Error(`Duplicate migration id detected: ${migration.id}`);
    }
    ids.add(migration.id);
  }

  console.log(
    `Migration manifest is valid. ${manifest.migrations.length} migration entries found.`
  );
}

function listManifest() {
  const manifest = loadManifest();
  console.log(`ReviewPilot Convex migrations (${manifest.migrations.length})`);
  for (const migration of manifest.migrations) {
    console.log(
      `- ${migration.id} [${migration.status}] ${migration.title} (${migration.scope})`
    );
  }
}

const command = process.argv[2] ?? "list";

if (command === "list") {
  listManifest();
} else if (command === "check") {
  checkManifest();
} else {
  console.error("Usage: node scripts/convex-migrations.mjs <list|check>");
  process.exit(1);
}
