const express = require("express");
const app = express();
const routes = require("./routes");
const dotenv = require("dotenv");
const mysqlPool = require("./config/db");
const protectedRoute = require("./routes/protectedRoute");

dotenv.config();

app.use(express.json());
app.use("/", routes);
app.use("/api", protectedRoute);

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
