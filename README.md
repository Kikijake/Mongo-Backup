# MongoDB Backup & Restore CLI Manager

A modern, modular, and interactive command-line interface (CLI) to easily manage MongoDB database backups and restorations.

---

## 🚀 Features

- **Interactive CLI Menu:** Select between database backup and restoration with a simple, user-friendly terminal interface.
- **Modular Architecture:** Core logic separated into modular scripts inside the `tasks/` directory.
- **Config-Driven Actions:** Easy configuration management via clean JSON files stored under `jsons/`.
- **Parallel Backups:** Performs database exports in batches of 2 database connections simultaneously to maximize throughput.
- **Smart Restore Pathing:** Restores databases directly from raw backup folders, JSONs, or CSV files with dynamic path resolution relative to your local `backups/` directory.
- **Secure Logging:** Logs backup actions with precise timestamps to `backup.log` while masking connection credentials in the console outputs.

---

## 📁 Project Directory Layout

```text
backup-project/
├── backups/                         # Local storage for database dumps (auto-created)
├── jsons/                           # Configuration directory (git-ignored)
│   ├── mongo_uris.json              # Connection URIs and labels for backing up databases
│   └── restore_config.json          # Credentials and folder path configuration for restores
├── tasks/                           # Modular core script tasks
│   ├── backup.js                    # Backup runner implementation
│   └── restore.js                   # Restoration runner implementation
├── index.js                         # Main interactive CLI entry point
├── package.json                     # NPM manifest file
└── README.md                        # Documentation
```

---

## 🛠️ Prerequisites

1. **Node.js:** Ensure Node.js (v18 or higher recommended) is installed on your machine.
2. **MongoDB Database Tools:** Make sure MongoDB command-line utilities (`mongodump`, `mongorestore`, and `mongoimport`) are installed and added to your system environment `PATH` variable.

---

## ⚙️ Configuration Setup

For security, all configuration JSON files containing credentials are git-ignored. You can create your configurations from the provided template files.

### 1. Database Backup Configurations (`jsons/mongo_uris.json`)
Copy/create `jsons/mongo_uris.json` with an array of the target databases you want to backup:
```json
[
  {
    "uri": "mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>",
    "name": "Production-Database"
  }
]
```

### 2. Database Restore Configurations (`jsons/restore_config.json`)
Copy/create `jsons/restore_config.json` with the connection string and path of the backup folder you wish to restore:
```json
{
  "MONGO_URI": "mongodb://127.0.0.1:27017",
  "SOURCE_PATH": "Testing/Testing_19-05-2026-T-10-46-33/tun-tauk",
  "DB_NAME": "tun-tauk",
  "DROP_BEFORE_RESTORE": true
}
```
> **Tip:** The `SOURCE_PATH` automatically resolves relative to the project's root `backups/` folder. You do not need to prepend `./backups/` or full absolute paths!

---

## 💻 Usage

To launch the interactive CLI, run the following command in the root folder:

```bash
npm start
```

You will be prompted with the following interface:

```text
======================================================
             MongoDB Backup & Restore Manager
======================================================

Please select an action:
1) Backup Database
2) Restore Database

Select option (1-2):
```

Simply input `1` or `2` to run your task. The manager will execute the logic and cleanly exit once completed.

---

## 🔒 Security Best Practices

- **Never Commit Credentials:** The `.gitignore` file is pre-configured to ignore all `*.json` files. Always keep your raw credentials inside the `jsons/` folder to prevent credentials from being pushed to public repositories.
- **Log Masking:** Stored connection parameters are automatically masked in the console outputs to prevent sensitive passwords from printing to standard output streams.
