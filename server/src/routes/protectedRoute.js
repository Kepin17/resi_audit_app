const express = require("express");
const router = express.Router();
const authToken = require("../middleware/auth");
const roleMiddleware = require("../middleware/roleMiddleware");
const { scaneHandler, showAllActiviy, getActivityByName, showDataByResi } = require("../controllers/auditResiController");
const { addNewBarang, showAllBarang } = require("../controllers/barangController");
const { RegisterHandler, showAllStaff, showStaffDetail, editStaff, deviceLog } = require("../controllers/auth");
const { getBagian } = require("../controllers/BagianController");

const roles = {
  staff: "staff",
  admin: "admin",
  supadmin: "superadmin",
};

// add staff area

router.post("/auth/register", authToken, roleMiddleware([roles.supadmin]), RegisterHandler);
router.get("/auth/show", authToken, roleMiddleware([roles.admin, roles.supadmin]), showAllStaff);
router.get("/auth/show/:id_pekerja", authToken, roleMiddleware([roles.supadmin]), showStaffDetail);
router.put("/auth/:id_pekerja", authToken, roleMiddleware([roles.supadmin]), editStaff);
router.get("/auth/log", authToken, roleMiddleware([roles.admin, roles.supadmin]), deviceLog);

// barang area
router.get("/barang", authToken, roleMiddleware([roles.admin, roles.supadmin]), showAllBarang);
router.post("/barang", authToken, roleMiddleware([roles.admin, roles.supadmin]), addNewBarang);

// audit resi
router.post("/auditResi", authToken, roleMiddleware([roles.staff]), scaneHandler);
router.get("/auditResi/activity", authToken, roleMiddleware([roles.admin, roles.supadmin]), showAllActiviy);
router.get("/auditResi/activity/:username", authToken, getActivityByName);
router.get("/auditResi/:resi_id", authToken, roleMiddleware([roles.admin, roles.supadmin]), showDataByResi);

router.get("/bagian", authToken, roleMiddleware([roles.supadmin]), getBagian);
module.exports = router;
