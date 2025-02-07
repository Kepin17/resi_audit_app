const express = require("express");
const router = express.Router();
const authToken = require("../middleware/auth");
const roleMiddleware = require("../middleware/roleMiddleware");
const { scaneHandler, showAllActiviy, getActivityByName, showDataByResi } = require("../controllers/auditResiController");
const { addNewBarang, showAllBarang, cancelBarang, showDetailByResi, importResiFromExcel, exportBarang, backupBarang } = require("../controllers/barangController");
const { RegisterHandler, showAllStaff, showStaffDetail, editStaff, deviceLog, deleteStaff, importStaffFromExcel, exportStaff, backupStaff } = require("../controllers/auth");
const { getBagian } = require("../controllers/BagianController");
const { getSalary, editGaji, getGajiPacking, payPackingStaff, exportGaji, backupGajiPacking, importGajiFromExcel } = require("../controllers/SalaryController");
const { showResiTerpack, exportPackToExcel, backupPackToExcel, importPackFromExcel } = require("../controllers/resiTerpackController");

const roles = {
  staff: "staff",
  admin: "admin",
  supadmin: "superadmin",
};

// add staff area

router.post("/auth/register", authToken, roleMiddleware([roles.supadmin]), RegisterHandler);
router.get("/auth/show", authToken, roleMiddleware([roles.admin, roles.supadmin]), showAllStaff);
router.get("/auth/show/:id_pekerja", authToken, roleMiddleware([roles.supadmin]), showStaffDetail);
router.delete("/auth/:id_pekerja", authToken, roleMiddleware([roles.supadmin]), deleteStaff);
router.put("/auth/:id_pekerja", authToken, roleMiddleware([roles.supadmin]), editStaff);
router.get("/auth/log", authToken, roleMiddleware([roles.admin, roles.supadmin]), deviceLog);
router.post("/auth-import", authToken, roleMiddleware([roles.admin, roles.supadmin]), importStaffFromExcel);
router.get("/auth-backup", authToken, roleMiddleware([roles.admin, roles.supadmin]), backupStaff);
router.get("/auth-export", authToken, roleMiddleware([roles.admin, roles.supadmin]), exportStaff);

// barang area
router.get("/barang", authToken, roleMiddleware([roles.admin, roles.supadmin]), showAllBarang);
router.post("/barang", authToken, roleMiddleware([roles.admin, roles.supadmin]), addNewBarang);
router.put("/barang/:resi_id", authToken, roleMiddleware([roles.admin, roles.supadmin]), cancelBarang);
router.get("/barang/:resi_id", authToken, roleMiddleware([roles.admin, roles.supadmin]), showDetailByResi);
router.get("/barang-export", authToken, roleMiddleware([roles.admin, roles.supadmin]), exportBarang);
router.post("/barang/import", authToken, roleMiddleware([roles.admin, roles.supadmin]), importResiFromExcel);
router.get("/barang-backup", authToken, roleMiddleware([roles.admin, roles.supadmin]), backupBarang);

// audit resi
router.post("/auditResi", authToken, roleMiddleware([roles.staff]), scaneHandler);
router.get("/auditResi/activity", authToken, roleMiddleware([roles.admin, roles.supadmin]), showAllActiviy);
router.get("/auditResi/activity/:username", authToken, getActivityByName);
router.get("/auditResi/:resi_id", authToken, roleMiddleware([roles.admin, roles.supadmin]), showDataByResi);
router.get("/audit-packed", authToken, roleMiddleware([roles.admin, roles.supadmin]), showResiTerpack);

// audit packing
router.get("/resi-terpack", showResiTerpack);
router.get("/resi-terpack-export", exportPackToExcel);
router.get("/resi-terpack-backup", backupPackToExcel);
router.post("/resi-terpack-import", importPackFromExcel);

// bagian
router.get("/bagian", authToken, roleMiddleware([roles.supadmin]), getBagian);

// gaji bos
router.get("/gaji", authToken, roleMiddleware([roles.supadmin]), getSalary);
router.put("/gaji/:id_gaji", authToken, roleMiddleware([roles.supadmin]), editGaji);
router.get("/gaji/packing", authToken, roleMiddleware([roles.supadmin]), getGajiPacking);
router.put("/gaji/packing/:id_gaji_pegawai", authToken, roleMiddleware([roles.supadmin]), payPackingStaff);

// audit gaji

router.get("/gaji/packing-export", authToken, roleMiddleware([roles.supadmin]), exportGaji);
router.get("/gaji/packing-backup", authToken, roleMiddleware([roles.supadmin]), backupGajiPacking);
router.post("/gaji/packing-import", authToken, roleMiddleware([roles.supadmin]), importGajiFromExcel);

module.exports = router;
