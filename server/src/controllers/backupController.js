const fs = require("fs");
const fse = require("fs-extra");
const path = require("path");
const moment = require("moment");
const archiver = require("archiver");
const mysqlPool = require("../config/db");

const backupDatabase = async (backupDir) => {
  try {
    const dataDir = path.join(backupDir, "data");

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const timestamp = moment().format("YYYY-MM-DD_HH-mm");
    const dumpFile = path.join(dataDir, `backup_${timestamp}.sql`);

    // Get all tables
    const [tables] = await mysqlPool.query("SHOW TABLES");
    let dumpContent = "";

    // For each table
    for (const tableRow of tables) {
      const tableName = tableRow[Object.keys(tableRow)[0]];

      // Get create table statement
      const [createTable] = await mysqlPool.query(`SHOW CREATE TABLE ${tableName}`);
      dumpContent += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      dumpContent += createTable[0]["Create Table"] + ";\n\n";

      // Get table data
      const [rows] = await mysqlPool.query(`SELECT * FROM ${tableName}`);
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        dumpContent += `INSERT INTO \`${tableName}\` (\`${columns.join("`, `")}\`) VALUES\n`;

        const values = rows.map((row) => {
          const rowValues = columns.map((column) => {
            const value = row[column];
            if (value === null) return "NULL";
            if (typeof value === "number") return value;
            return `'${value.toString().replace(/'/g, "''")}'`;
          });
          return `(${rowValues.join(", ")})`;
        });

        dumpContent += values.join(",\n") + ";\n\n";
      }
    }

    // Write SQL file
    fs.writeFileSync(dumpFile, dumpContent, "utf8");
    return dataDir;
  } catch (error) {
    throw new Error(`Database backup failed: ${error.message}`);
  }
};

const backupImages = async (backupDir) => {
  const sourceDir = path.join(__dirname, "../../uploads");
  const destDir = path.join(backupDir, "images");

  // Create images directory if it doesn't exist
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Copy all files from uploads to backup/images
  await fse.copy(sourceDir, destDir);

  return destDir;
};

const createBackup = async (req, res) => {
  try {
    const timestamp = moment().format("YYYY-MM-DD_HH-mm");
    const backupDir = path.join(__dirname, "../../backup", `backup_${timestamp}`);

    // Create main backup directory
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Backup database to SQL
    await backupDatabase(backupDir);

    // Backup images
    await backupImages(backupDir);

    // Create ZIP archive
    const zipPath = path.join(__dirname, "../../backup", `backup_${timestamp}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      // Clean up temporary folders
      fse.removeSync(backupDir);

      // Send ZIP file
      res.download(zipPath, path.basename(zipPath), (err) => {
        if (err) {
          console.error("Error sending file:", err);
        }
        // Delete ZIP file after sending
        fs.unlink(zipPath, (unlinkErr) => {
          if (unlinkErr) console.error("Error deleting ZIP:", unlinkErr);
        });
      });
    });

    archive.on("error", (err) => {
      throw err;
    });

    archive.pipe(output);
    archive.directory(backupDir, false);
    archive.finalize();
  } catch (error) {
    console.error("Backup error:", error);
    res.status(500).json({
      error: "Failed to create backup",
      details: error.message,
    });
  }
};

module.exports = {
  createBackup,
};
