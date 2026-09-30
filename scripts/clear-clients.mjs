import { readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const confirmed = process.argv.includes("--confirm");
const storagePath = path.join(process.cwd(), "storage", "app-data.json");
const importsPath = path.resolve(process.cwd(), "imports");
const templateFileName = "clients-template.xlsx";

if (!confirmed) {
  console.error("Refusing to clear clients without --confirm.");
  console.error("Usage: node scripts/clear-clients.mjs --confirm");
  process.exit(1);
}

const isUploadedClientSpreadsheet = (fileName) => {
  const normalizedName = fileName.toLocaleLowerCase();
  const extension = path.extname(normalizedName);

  if (normalizedName === templateFileName) {
    return false;
  }

  return extension === ".csv" || (extension === ".xlsx" && normalizedName.includes("client"));
};

const removeUploadedClientSpreadsheets = async () => {
  let entries = [];

  try {
    entries = await readdir(importsPath, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return 0;
    }

    throw error;
  }

  let deletedFiles = 0;

  for (const entry of entries) {
    if (!entry.isFile() || !isUploadedClientSpreadsheet(entry.name)) {
      continue;
    }

    const targetPath = path.resolve(importsPath, entry.name);
    if (!targetPath.startsWith(`${importsPath}${path.sep}`)) {
      throw new Error("Refusing to remove a file outside the imports folder.");
    }

    await unlink(targetPath);
    deletedFiles += 1;
  }

  return deletedFiles;
};

try {
  const data = JSON.parse(await readFile(storagePath, "utf8"));
  const previousCount = Array.isArray(data.clients) ? data.clients.length : 0;

  await writeFile(
    storagePath,
    `${JSON.stringify({ ...data, clients: [] }, null, 2)}\n`,
    "utf8"
  );
  const deletedFiles = await removeUploadedClientSpreadsheets();

  console.log(`Cleared clients: ${previousCount}`);
  console.log(`Removed uploaded client spreadsheets: ${deletedFiles}`);
  console.log(`Kept template: imports/${templateFileName}`);
  console.log("Other app data was left unchanged.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unable to clear clients");
  process.exit(1);
}
