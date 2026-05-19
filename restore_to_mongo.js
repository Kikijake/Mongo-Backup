import { exec } from "child_process";
import fs from "fs-extra";
import path from "path";
import ora from "ora";

/**
 * CONFIG
 * Set these values before running.
 */
const MONGO_URI = "mongodb://127.0.0.1:27017"; // local or atlas
const SOURCE_PATH =
  "./backups/tun-tauk/tun-tauk_04-05-2026-T-09-52-26/tun-tauk"; // folder or file
const DB_NAME = "tun-tauk"; // optional: force target DB name, leave "" to use source/default
const DROP_BEFORE_RESTORE = true; // true = overwrite existing collections

/**
 * HELPERS
 */
const execAsync = (cmd) =>
  new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject({
          error,
          stdout,
          stderr,
        });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });

const isJsonFile = (filePath) => filePath.toLowerCase().endsWith(".json");
const isCsvFile = (filePath) => filePath.toLowerCase().endsWith(".csv");
const isBsonFile = (filePath) => filePath.toLowerCase().endsWith(".bson");

const getCollectionNameFromFile = (filePath) => {
  return path.basename(filePath, path.extname(filePath));
};

const quote = (value) => `"${value}"`;

/**
 * RESTORE MONGODUMP FOLDER
 * Example source:
 * ./backups/mydb/mydb_11-03-2026-T-10-00-00
 */
const restoreDumpFolder = async (folderPath) => {
  const spinner = ora(`Restoring dump folder: ${folderPath}`).start();

  try {
    let cmd = `mongorestore --uri=${quote(MONGO_URI)} ${quote(folderPath)}`;

    if (DROP_BEFORE_RESTORE) {
      cmd += " --drop";
    }

    if (DB_NAME) {
      cmd += ` --db=${quote(DB_NAME)}`;
    }

    const { stdout, stderr } = await execAsync(cmd);

    spinner.succeed(`Dump folder restored successfully`);

    if (stdout?.trim()) console.log(stdout);
    if (stderr?.trim()) console.log(stderr);
  } catch ({ error, stdout, stderr }) {
    spinner.fail(`Failed to restore dump folder`);
    console.error(error.message);
    if (stdout?.trim()) console.log(stdout);
    if (stderr?.trim()) console.log(stderr);
  }
};

/**
 * IMPORT SINGLE JSON / CSV FILE
 * JSON file should usually contain array of docs or newline JSON.
 */
const importDataFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const collection = getCollectionNameFromFile(filePath);

  const spinner = ora(
    `Importing ${path.basename(filePath)} into collection "${collection}"`,
  ).start();

  try {
    let cmd = `mongoimport --uri=${quote(MONGO_URI)} `;

    if (DB_NAME) {
      cmd += `--db=${quote(DB_NAME)} `;
    }

    cmd += `--collection=${quote(collection)} --file=${quote(filePath)} `;

    if (isJsonFile(filePath)) {
      cmd += "--jsonArray ";
    }

    if (isCsvFile(filePath)) {
      cmd += "--type=csv --headerline ";
    }

    const { stdout, stderr } = await execAsync(cmd);

    spinner.succeed(`Imported ${path.basename(filePath)} successfully`);

    if (stdout?.trim()) console.log(stdout);
    if (stderr?.trim()) console.log(stderr);
  } catch ({ error, stdout, stderr }) {
    spinner.fail(`Failed to import ${path.basename(filePath)}`);
    console.error(error.message);
    if (stdout?.trim()) console.log(stdout);
    if (stderr?.trim()) console.log(stderr);
  }
};

/**
 * AUTO-DETECT SOURCE TYPE
 */
const run = async () => {
  if (!MONGO_URI || MONGO_URI === "your-mongodb-uri-here") {
    throw new Error("Please set a valid MONGO_URI");
  }

  if (!SOURCE_PATH) {
    throw new Error("Please set SOURCE_PATH");
  }

  const fullPath = path.resolve(SOURCE_PATH);

  if (!(await fs.pathExists(fullPath))) {
    throw new Error(`Path does not exist: ${fullPath}`);
  }

  const stat = await fs.stat(fullPath);

  if (stat.isDirectory()) {
    // folder from mongodump => use mongorestore
    await restoreDumpFolder(fullPath);
    return;
  }

  if (stat.isFile()) {
    if (isJsonFile(fullPath) || isCsvFile(fullPath)) {
      await importDataFile(fullPath);
      return;
    }

    if (isBsonFile(fullPath)) {
      console.log(
        "You selected a .bson file directly. Usually you should restore the parent dump folder with mongorestore.",
      );
      console.log(
        "Example: set SOURCE_PATH to the dump folder, not the .bson file.",
      );
      return;
    }

    console.log(
      "Unsupported file type. Use a dump folder, .json, or .csv file.",
    );
    return;
  }

  console.log("Unsupported path type.");
};

run().catch((err) => {
  console.error("Error:", err.message);
});
