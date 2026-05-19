import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { runBackup } from "./tasks/backup.js";
import { runRestore } from "./tasks/restore.js";

const main = async () => {
  const rl = readline.createInterface({ input, output });

  console.log("\n======================================================");
  console.log("             MongoDB Backup & Restore Manager");
  console.log("======================================================\n");
  console.log("Please select an action:");
  console.log("1) Backup Database");
  console.log("2) Restore Database");

  try {
    const choice = await rl.question("\nSelect option (1-2): ");
    
    switch (choice.trim()) {
      case "1":
        console.log("\n[Starting Backup Task...]");
        await runBackup();
        break;
      case "2":
        console.log("\n[Starting Restore Task...]");
        await runRestore();
        break;
      default:
        console.log("Invalid option selected. Exiting cleanly.");
        break;
    }
  } catch (error) {
    console.error("\nAn error occurred during execution:", error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
};

main();
