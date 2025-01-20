const express = require("express");
const { loginHandler } = require("../controllers/auth");
const router = express.Router();

// Define route handler with callback function
router.get("/", (req, res) => {
  res.json({ message: "Welcome to the API" });
});

router.post("/auth/login", loginHandler);

module.exports = router;
