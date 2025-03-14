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
    const stream = fs.createWriteStream(dumpFile, { encoding: "utf8" });

    stream.write("/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;\n");
    stream.write("/*!40103 SET TIME_ZONE='+07:00' */;\n");
    stream.write("/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;\n");
    stream.write("/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;\n");
    stream.write("/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;\n");
    stream.write("/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;\n\n");

    const [tables] = await mysqlPool.query("SHOW TABLES");
    for (const tableRow of tables) {
      const tableName = tableRow[Object.keys(tableRow)[0]];

      // Get CREATE TABLE
      const [createTable] = await mysqlPool.query(`SHOW CREATE TABLE \`${tableName}\``);
      stream.write(`DROP TABLE IF EXISTS \`${tableName}\`;\n`);

      let createTableStatement = createTable[0]["Create Table"];
      if (!createTableStatement.includes("CHARSET=utf8mb4")) {
        createTableStatement = createTableStatement.replace(/ENGINE=InnoDB/, "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");
      }
      stream.write(createTableStatement + ";\n\n");

      // Get table data
      const [countResult] = await mysqlPool.query(`SELECT COUNT(*) as total FROM \`${tableName}\``);
      const total = countResult[0].total;
      const chunkSize = 1000;

      for (let offset = 0; offset < total; offset += chunkSize) {
        const [rows] = await mysqlPool.query(`SELECT * FROM \`${tableName}\` ORDER BY (SELECT NULL) LIMIT ? OFFSET ?`, [chunkSize, offset]);
        if (rows.length > 0) {
          const columns = Object.keys(rows[0]);
          const values = rows.map((row) => `(${columns.map((column) => mysqlPool.escape(row[column])).join(", ")})`);
          stream.write(`INSERT INTO \`${tableName}\` (\`${columns.join("`, `")}\`) VALUES\n`);
          stream.write(values.join(",\n") + ";\n\n");
        }
      }
    }

    stream.write("/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;\n");
    stream.write("/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;\n");
    stream.write("/*!40014 SET UNIQUE_CHECKS=IF(@OLD_UNIQUE_CHECKS IS NULL, 1, @OLD_UNIQUE_CHECKS) */;\n");
    stream.write("/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;\n");

    stream.end();
    return dataDir;
  } catch (error) {
    throw new Error(`Database backup failed: ${error.message}`);
  }
};

const backupImages = async (backupDir) => {
  const sourceDir = path.join("/var/www/html/uploads");
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
