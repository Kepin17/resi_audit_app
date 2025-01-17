const express = require("express");
const router = express.Router();
const authToken = require("../middleware/auth");
const { scaneHandler } = require("../controllers/auditResiController");

router.post("/auditResi", authToken, scaneHandler);

module.exports = router;
