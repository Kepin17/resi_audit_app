const express = require("express");
const app = express();
const routes = require("./src/routes");
const dotenv = require("dotenv");
const mysqlPool = require("./src/config/db");
const protectedRoute = require("./src/routes/protectedRoute");
const cors = require("cors");
const cleanupOldImages = require("./src/utils/imageCleanup");
const authToken = require("./src/middleware/auth");
const path = require("path");

dotenv.config();

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));



// Serve uploaded files
app.use('/uploads', authToken, express.static('/var/www/html/uploads'));
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
