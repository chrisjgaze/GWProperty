import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = path.join(root, "public", "custom-properties");
const legacyFile = path.join(root, "public", "custom-properties.json");
const outputFile = path.join(root, "public", "custom-properties-index.json");

await mkdir(sourceDirectory, { recursive: true });

const properties = [];
const filenames = (await readdir(sourceDirectory))
  .filter((filename) => filename.endsWith(".json"))
  .sort((a, b) => a.localeCompare(b));

for (const filename of filenames) {
  const property = JSON.parse(await readFile(path.join(sourceDirectory, filename), "utf8"));
  properties.push(property);
}

try {
  const legacyPayload = JSON.parse(await readFile(legacyFile, "utf8"));
  if (Array.isArray(legacyPayload?.properties)) properties.push(...legacyPayload.properties);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

await writeFile(outputFile, `${JSON.stringify({ properties }, null, 2)}\n`);
console.log(`Prepared ${properties.length} custom properties.`);
