const express = require("express");
const router = express.Router();
const authToken = require("../middleware/auth");
const { scaneHandler, showAllActiviy, getActivityByName } = require("../controllers/auditResiController");
const { addNewBarang, editBarang, showAllBarang, deleteBarang } = require("../controllers/barangController");
const roleMiddleware = require("../middleware/roleMiddleware");
const { RegisterHandler } = require("../controllers/auth");

const roles = {
  staff: "staff",
  admin: "admin",
  supadmin: "superadmin",
};

// add staff area

router.post("/auth/register", authToken, roleMiddleware([roles.supadmin]), RegisterHandler);
// barang area
router.get("/barang", authToken, roleMiddleware([roles.admin]), showAllBarang);
router.post("/barang/add", authToken, roleMiddleware([roles.admin]), addNewBarang);
router.post("/barang/edit", authToken, roleMiddleware([roles.admin]), editBarang);
router.post("/barang/del", authToken, roleMiddleware([roles.admin]), deleteBarang);

// audit resi
router.post("/auditResi", authToken, roleMiddleware([roles.staff]), scaneHandler);
router.get("/auditResi/activity", authToken, roleMiddleware([roles.admin, roles.supadmin]), showAllActiviy);
router.get("/auditResi/activity/:username", roleMiddleware([roles.staff, roles.admin, roles.supadmin]), authToken, getActivityByName);

// categories area

module.exports = router;
