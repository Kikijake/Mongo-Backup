import { exec } from "child_process";
import fs from "fs-extra";
import cron from "node-cron";
import path from "path";
import ora from "ora";

// Mongo URIs
const MONGO_URIS = [
  {
    uri: "mongodb+srv://projectDev-01:O9YGEyPQvKyA3Q48@kwintechinstances.usgwoxy.mongodb.net",
    name: "db1",
  },
  {
    uri: "mongodb+srv://projectDev-01:O9YGEyPQvKyA3Q48@kwintechinstances.usgwoxy.mongodb.net",
    name: "db2",
  },
];

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
const backupDatabase = async ({ uri, name }) => {
  log(`Backing up ${name}...`);

  let seconds = 0;
  const spinner = ora(`Exporting ${name}... 0s `).start();

  // Update spinner text every second
  const timer = setInterval(() => {
    seconds += 1;
    spinner.text = `Exporting ${name}... ${seconds}s`;
  }, 1000);

  // const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const timestamp = getFormattedTimestamp();

  const dbFolder = path.join(BACKUP_DIR, name); // backups/db1
  fs.ensureDirSync(dbFolder);

  const backupPath = path.join(dbFolder, `${name}_${timestamp}`);
  fs.ensureDirSync(backupPath);

  const cmd = `mongodump --uri="${uri}" --out="${backupPath}"`;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    exec(cmd, (error, stdout, stderr) => {
      clearInterval(timer); // stop the counter
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      if (error) {
        spinner.fail(`Backup failed for ${name}`);
        log(`Backup failed for ${name}: ${error.message} (took ${duration}s)`);
        return reject(error);
      }

      spinner.succeed(`Backup completed for ${name} (${duration}s)`);
      log(`Backup completed for ${name}: ${backupPath} (took ${duration}s)`);
      resolve();
    });
  });
};

// Run all backups sequentially
// const runBackups = async () => {
//   log("Starting backup sequence...");
//   for (const db of MONGO_URIS) {
//     try {
//       await backupDatabase(db);
//     } catch (e) {
//       log(`Error backing up ${db.name}: ${e.message}`);
//     }
//   }
//   log("Backup sequence completed.\n");
// };

const runBackupsInBatches = async (batchSize = 2) => {
  log("Starting backup sequence...");

  for (let i = 0; i < MONGO_URIS.length; i += batchSize) {
    const batch = MONGO_URIS.slice(i, i + batchSize); // get the current batch
    log(`Starting batch: ${batch.map((db) => db.name).join(", ")}`);

    // Run the batch in parallel
    await Promise.all(batch.map((db) => backupDatabase(db)));

    log(`Finished batch: ${batch.map((db) => db.name).join(", ")}\n`);
  }

  log("Backup sequence completed.\n");
};

log("Mongo backup service running...");
runBackupsInBatches(2);
// Schedule every hour
cron.schedule("0 * * * *", runBackupsInBatches(2));
