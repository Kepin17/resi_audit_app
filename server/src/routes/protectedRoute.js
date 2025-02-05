const express = require("express");
const router = express.Router();
const authToken = require("../middleware/auth");
const roleMiddleware = require("../middleware/roleMiddleware");
const { scaneHandler, showAllActiviy, getActivityByName, showDataByResi } = require("../controllers/auditResiController");
const { addNewBarang, showAllBarang, cancelBarang, exportBarang, showDetailByResi } = require("../controllers/barangController");
const { RegisterHandler, showAllStaff, showStaffDetail, editStaff, deviceLog, deleteStaff } = require("../controllers/auth");
const { getBagian } = require("../controllers/BagianController");
const { getSalary, editGaji, getGajiPacking } = require("../controllers/SalaryController");

const roles = {
  staff: "staff",
  admin: "admin",
  supadmin: "superadmin",
};

// add staff area

// , authToken, roleMiddleware([roles.supadmin])

router.post("/auth/register", authToken, roleMiddleware([roles.supadmin]), RegisterHandler);
router.get("/auth/show", authToken, roleMiddleware([roles.admin, roles.supadmin]), showAllStaff);
router.get("/auth/show/:id_pekerja", authToken, roleMiddleware([roles.supadmin]), showStaffDetail);
router.delete("/auth/:id_pekerja", authToken, roleMiddleware([roles.supadmin]), deleteStaff);
router.put("/auth/:id_pekerja", authToken, roleMiddleware([roles.supadmin]), editStaff);
router.get("/auth/log", authToken, roleMiddleware([roles.admin, roles.supadmin]), deviceLog);

// barang area
router.get("/barang", authToken, roleMiddleware([roles.admin, roles.supadmin]), showAllBarang);
router.post("/barang", authToken, roleMiddleware([roles.admin, roles.supadmin]), addNewBarang);
router.put("/barang/:resi_id", authToken, roleMiddleware([roles.admin, roles.supadmin]), cancelBarang);
router.get("/barang/:resi_id", authToken, roleMiddleware([roles.admin, roles.supadmin]), showDetailByResi);
router.post("/barang/export", authToken, roleMiddleware([roles.admin, roles.supadmin]), exportBarang);

// audit resi
router.post("/auditResi", authToken, roleMiddleware([roles.staff]), scaneHandler);
router.get("/auditResi/activity", authToken, roleMiddleware([roles.admin, roles.supadmin]), showAllActiviy);
router.get("/auditResi/activity/:username", authToken, getActivityByName);
router.get("/auditResi/:resi_id", authToken, roleMiddleware([roles.admin, roles.supadmin]), showDataByResi);

router.get("/bagian", authToken, roleMiddleware([roles.supadmin]), getBagian);

// gaji bos
router.get("/gaji", authToken, roleMiddleware([roles.supadmin]), getSalary);
router.put("/gaji/:id_gaji", authToken, roleMiddleware([roles.supadmin]), editGaji);
router.get("/gaji/packing", authToken, roleMiddleware([roles.supadmin]), getGajiPacking);

module.exports = router;
