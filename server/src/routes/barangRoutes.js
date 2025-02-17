module.exports = router;
router.get("/calendar-data", authenticateToken, barangController.getCalendarData);
const { authenticateToken } = require("../middleware/auth");
const barangController = require("../controllers/barangController");
const router = express.Router();
const express = require("express");
