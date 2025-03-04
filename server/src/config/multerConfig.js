const multer = require("multer");
const path = require("path");

// Ensure uploads directory exists
const fs = require("fs");
const uploadDir = "/var/www/html/uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Get resi_id from form data or params
    const resiId = req.body.resi_id || req.params.resi_id || Date.now();
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileName = `${resiId}_${uniqueSuffix}${path.extname(file.originalname)}`;
    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept image files and Excel files
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|xlsx|xls)$/)) {
    return cb(new Error("Only image files and Excel files are allowed!"), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

module.exports = upload;
