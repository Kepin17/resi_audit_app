const express = require("express");
const router = express.Router();
const authToken = require("../middleware/auth");
const { scaneHandler, showAllActiviy, getActivityByName } = require("../controllers/auditResiController");
const { addNewBarang, editBarang, showAllBarang, deleteBarang } = require("../controllers/barangController");

// barang area

router.get("/barang", authToken, showAllBarang);
router.post("/barang/add", authToken, addNewBarang);
router.post("/barang/edit", authToken, editBarang);
router.post("/barang/del", authToken, deleteBarang);

// audit resi
router.post("/auditResi", authToken, scaneHandler);
router.get("/auditResi/activity", authToken, showAllActiviy);
router.get("/auditResi/activity/:username", authToken, getActivityByName);

module.exports = router;
