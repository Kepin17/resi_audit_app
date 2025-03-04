const fs = require("fs");
const path = require("path");

const cleanupOldImages = () => {
  const uploadsDir = '/var/www/html/uploads';
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      console.error("Error reading uploads directory:", err);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(uploadsDir, file);

      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`Error getting stats for file ${file}:`, err);
          return;
        }

        if (stats.isFile() && stats.mtime < threeMonthsAgo) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`Error deleting file ${file}:`, err);
              return;
            }
            console.log(`Deleted old file: ${file}`);
          });
        }
      });
    });
  });
};

module.exports = cleanupOldImages;
