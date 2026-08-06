import fs from "node:fs";
import path from "node:path";

// globals.css owns the palette; everything else must reference it by token.
const TOKEN_SOURCE = "src/app/globals.css";
const HEX = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;

// Hex that cannot be a CSS variable: canvas paint, values persisted to the
// database, and third-party brand marks.
const ALLOWED = new Set([
  "src/lib/avatar-fallback.ts",
  "src/components/SaveHeartBurst.tsx",
  "src/components/dashboard/ProfilePhotoUploader.tsx",
  "src/components/post-ad/PostAdPageClient.tsx",
  "src/components/auth/AuthForms.tsx",
]);

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (/\.(css|tsx|ts)$/.test(entry.name)) acc.push(p);
  }
  return acc;
}

const targets = ["styles.css", ...walk("src")];
const failures = [];

for (const file of targets) {
  const rel = path.relative(".", file).split(path.sep).join("/");
  if (rel === TOKEN_SOURCE || ALLOWED.has(rel)) continue;
  const text = fs.readFileSync(file, "utf8");
  text.split("\n").forEach((line, i) => {
    for (const m of line.matchAll(HEX)) failures.push(`${rel}:${i + 1}  ${m[0]}`);
  });
}

if (failures.length) {
  console.error(`Raw colour values found outside ${TOKEN_SOURCE}:\n`);
  console.error(failures.join("\n"));
  console.error(`\n${failures.length} violation(s). Add a token to ${TOKEN_SOURCE} and reference it with var().`);
  process.exit(1);
}

console.log(`No raw colour values outside ${TOKEN_SOURCE}.`);
