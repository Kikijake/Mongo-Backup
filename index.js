import { exec } from "child_process";
import fs from "fs-extra";
import cron from "node-cron";
import path from "path";
import ora from "ora";
import MONGO_URIS from "./mongo_uris.json" assert { type: "json" };

const CONCURRENT = 2

const getFormattedTimestamp = () => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const year = now.getFullYear();

  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");

  return `${day}-${month}-${year}-T-${hours}-${minutes}-${seconds}`;
};

const BACKUP_DIR = path.join(process.cwd(), "backups");
const LOG_FILE = path.join(process.cwd(), "backup.log");
fs.ensureDirSync(BACKUP_DIR);

// Create a write stream for logging
const logStream = fs.createWriteStream(LOG_FILE, { flags: "a" });
const log = (message) => {
  const timestamp = new Date().toISOString();
  console.log(message); // still show in console
  logStream.write(`[${timestamp}] ${message}\n`);
};

// Backup a single database with spinner
const backupDatabase = async ({ uri, name }, useSpinner = true) => {
  log(`Backing up ${name}...`);

  let seconds = 0;
  let spinner;
  let timer;

  if (useSpinner) {
    spinner = ora(`Exporting ${name}... 0s`).start();
    timer = setInterval(() => {
      seconds += 1;
      spinner.text = `Exporting ${name}... ${seconds}s`;
    }, 1000);
  }

  const timestamp = getFormattedTimestamp();
  const dbFolder = path.join(BACKUP_DIR, name);
  fs.ensureDirSync(dbFolder);

  const backupPath = path.join(dbFolder, `${name}_${timestamp}`);
  fs.ensureDirSync(backupPath);

  const cmd = `mongodump --uri="${uri}" --out="${backupPath}"`;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    exec(cmd, (error, stdout, stderr) => {
      if (useSpinner) clearInterval(timer);

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      if (error) {
        if (useSpinner) spinner.fail(`Backup failed for ${name}`);
        log(`Backup failed for ${name}: ${error.message} (took ${duration}s)`);
        return reject(error);
      }

      if (useSpinner)
        spinner.succeed(`Backup completed for ${name} (${duration}s)`);

      log(`Backup completed for ${name}: ${backupPath} (took ${duration}s)`);

      // Return the DB name and duration for batch logging
      resolve({ name, duration });
    });
  });
};


const runBackupsInBatches = async (batchSize = 2) => {
  log("Starting backup sequence...");

  for (let i = 0; i < MONGO_URIS.length; i += batchSize) {
    const batch = MONGO_URIS.slice(i, i + batchSize);
    log(`Starting batch: ${batch.map((db) => db.name).join(", ")}`);

    let seconds = 0;
    const spinner = ora(
      `Exporting ${batch.map((db) => db.name).join(", ")}... 0s`
    ).start();
    const timer = setInterval(() => {
      seconds += 1;
      spinner.text = `Exporting ${batch
        .map((db) => db.name)
        .join(", ")}... ${seconds}s`;
    }, 1000);

    // Run batch in parallel but disable individual spinners
    const results = await Promise.all(
      batch.map((db) => backupDatabase(db, false))
    );

    clearInterval(timer);
    spinner.succeed(`Finished batch: ${batch.map((db) => db.name).join(", ")}`);
    log(`Finished batch: ${batch.map((db) => db.name).join(", ")}\n`);

    // Log duration for each DB in the batch
    results.forEach((r) => {
      log(`Duration for ${r.name}: ${r.duration}s`);
    });
  }

  log("Backup sequence completed.\n");
};


log("Mongo backup service running...");
runBackupsInBatches(CONCURRENT);
// Schedule every hour
cron.schedule("0 * * * *", () => runBackupsInBatches(CONCURRENT));
