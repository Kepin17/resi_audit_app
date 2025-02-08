const express = require("express");
const app = express();
const routes = require("./routes");
const dotenv = require("dotenv");
const mysqlPool = require("./config/db");
const protectedRoute = require("./routes/protectedRoute");
const cors = require("cors");
const fileUpload = require("express-fileupload");

dotenv.config();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(fileUpload("server/uploads"));
app.use("/uploads", express.static("uploads"));

app.use("/api/v1", routes);
app.use("/api/v1", protectedRoute);

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
