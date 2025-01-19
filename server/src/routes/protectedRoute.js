const express = require("express");
const router = express.Router();
const authToken = require("../middleware/auth");
const { scaneHandler, showAllActiviy, getActivityByName } = require("../controllers/auditResiController");

router.post("/auditResi", authToken, scaneHandler);
router.get("/auditResi/activity", authToken, showAllActiviy);
router.get("/auditResi/activity/:username", authToken, getActivityByName);

module.exports = router;
