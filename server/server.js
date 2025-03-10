const express = require("express");
const app = express();
const routes = require("./src/routes");
const dotenv = require("dotenv");
const mysqlPool = require("./src/config/db");
const protectedRoute = require("./src/routes/protectedRoute");
const cors = require("cors");
const cleanupOldImages = require("./src/utils/imageCleanup");
const path = require("path");

dotenv.config();

app.use(
  cors({
    origin: "https://guudstore.my.id",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));

app.use((req, res, next) => {
  const userAgent = req.headers["user-agent"] || "";
  if (userAgent.toLowerCase().includes("curl")) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
});

const uploadsPath = path.join(__dirname, "../uploads");
app.use("/uploads", express.static(uploadsPath));

app.use("/api/v1", routes);
app.use("/api/v1", protectedRoute);

// Schedule image cleanup to run daily at midnight
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    cleanupOldImages();
  }
}, 60000); // Check every minute

const PORT = process.env.PORT || 3000;

mysqlPool.getConnection((err, con) => {
  if (err) {
    console.log(`Error: ${err}`);
  } else {
    console.log(`Connected to MySQL database`);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
