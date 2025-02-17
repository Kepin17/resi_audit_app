const express = require("express");
const router = express.Router();
const authToken = require("../middleware/auth");
const roleMiddleware = require("../middleware/roleMiddleware");
const { scaneHandler, showAllActiviy, getActivityByName, showDataByResi, uploadPhoto, getActivityNotComplited } = require("../controllers/auditResiController");
const { addNewBarang, showAllBarang, cancelBarang, showDetailByResi, importResiFromExcel, exportBarang, backupBarang, createExcelTemplate, deleteResi, getCalendarData } = require("../controllers/barangController");
const { RegisterHandler, showAllStaff, showStaffDetail, editStaff, deviceLog, deleteStaff, importStaffFromExcel, exportStaff, backupStaff } = require("../controllers/auth");
const { getBagian } = require("../controllers/BagianController");
const { getSalary, editGaji, getGajiPacking, payPackingStaff, exportGaji, backupGajiPacking, importGajiFromExcel, getSalaryByID, getGajiPackingStats, getDailyEarnings } = require("../controllers/SalaryController");
const { showResiTerpack, exportPackToExcel, backupPackToExcel, importPackFromExcel } = require("../controllers/resiTerpackController");
const upload = require("../config/multerConfig");
const { getStatistics, getWorkerStatistics } = require("../controllers/statisticsController");
const { createBackup } = require("../controllers/backupController");
const { getAllEkspedisi } = require("../controllers/ekspedisiController");

const roles = {
  picker: "picker",
  packing: "packing",
  pickout: "pickout",
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
router.post("/auth-import", authToken, roleMiddleware([roles.admin, roles.supadmin]), upload.single("file"), importStaffFromExcel);
router.get("/auth-backup", authToken, roleMiddleware([roles.admin, roles.supadmin]), backupStaff);
router.get("/auth-export", authToken, roleMiddleware([roles.admin, roles.supadmin]), exportStaff);

// barang area
router.get("/barang", authToken, roleMiddleware([roles.admin, roles.supadmin]), showAllBarang);
router.get("/barang/calendar-data", authToken, roleMiddleware([roles.admin, roles.supadmin]), getCalendarData);
router.delete("/barang/:resi_id", authToken, roleMiddleware([roles.supadmin]), deleteResi);
router.post("/barang", authToken, roleMiddleware([roles.admin, roles.supadmin]), addNewBarang);
router.put("/barang-cancel/:resi_id", authToken, roleMiddleware([roles.admin, roles.supadmin]), cancelBarang);
router.get("/barang/:resi_id", authToken, roleMiddleware([roles.admin, roles.supadmin]), showDetailByResi);
router.get("/barang-export", authToken, roleMiddleware([roles.admin, roles.supadmin]), exportBarang);
router.post("/barang/import", authToken, roleMiddleware([roles.admin, roles.supadmin]), upload.single("file"), importResiFromExcel);
router.get("/barang-backup", authToken, roleMiddleware([roles.admin, roles.supadmin]), backupBarang);

// audit resi
router.post("/auditResi/scan/:resi_id", authToken, roleMiddleware([roles.packing, roles.pickout, roles.picker, roles.admin, roles.supadmin]), upload.single("photo"), scaneHandler);
router.get("/auditResi/activity", authToken, roleMiddleware([roles.admin, roles.supadmin]), showAllActiviy);
router.get("/auditResi/activity/:thisPage/:username", authToken, roleMiddleware([roles.picker, roles.packing, roles.pickout]), getActivityByName);
router.get("/auditResi/:resi_id", authToken, roleMiddleware([roles.admin, roles.supadmin]), showDataByResi);
router.post("/auditResi/photo", authToken, uploadPhoto);
router.get("/audit-packed", authToken, roleMiddleware([roles.admin, roles.supadmin]), showResiTerpack);

// audit packing
router.get("/resi-terpack", authToken, roleMiddleware([roles.admin, roles.supadmin, roles.packing, roles.pickout, roles.picker]), showResiTerpack);
router.get("/resi-terpack-export", authToken, roleMiddleware([roles.admin, roles.supadmin]), exportPackToExcel);
router.get("/resi-terpack-backup", authToken, roleMiddleware([roles.admin, roles.supadmin]), backupPackToExcel);
router.post("/resi-terpack-import", authToken, roleMiddleware([roles.admin, roles.supadmin]), upload.single("file"), importPackFromExcel);

router.get("/resi-not-complited/:thisPage", authToken, roleMiddleware([roles.admin, roles.supadmin, roles.packing, roles.picker, roles.pickout]), upload.single("file"), getActivityNotComplited);

// bagian
router.get("/bagian", authToken, roleMiddleware([roles.supadmin]), upload.single("file"), getBagian);

// gaji bos
router.get("/gaji", authToken, roleMiddleware([roles.supadmin]), getSalary);
router.get("/salary/daily-earnings", authToken, roleMiddleware([roles.packing]), getDailyEarnings);
router.put("/gaji/:id_gaji", authToken, roleMiddleware([roles.supadmin]), editGaji);
router.get("/gaji/packing", authToken, roleMiddleware([roles.supadmin, roles.admin]), getGajiPacking);
router.put("/gaji/packing/:id_gaji_pegawai", authToken, roleMiddleware([roles.supadmin]), payPackingStaff);

// audit gaji

router.get("/gaji/packing-export", authToken, roleMiddleware([roles.supadmin, roles.admin]), exportGaji);
router.get("/gaji/packing-backup", authToken, roleMiddleware([roles.supadmin, roles.admin]), backupGajiPacking);
router.post("/gaji/packing-import", authToken, roleMiddleware([roles.supadmin, roles.admin]), upload.single("file"), importGajiFromExcel);

// statistics
router.get("/packing/stats", authToken, roleMiddleware([roles.supadmin, roles.admin]), getGajiPackingStats);
router.get("/statistics", authToken, roleMiddleware([roles.supadmin]), getStatistics);
router.get("/worker-statistics", authToken, roleMiddleware([roles.supadmin]), getWorkerStatistics);
router.get("/backup/create", authToken, roleMiddleware([roles.supadmin]), createBackup);

router.get("/template-resi", authToken, roleMiddleware([roles.supadmin, roles.admin]), createExcelTemplate);

// ekspedisi
router.get("/ekspedisi", authToken, roleMiddleware([roles.supadmin, roles.admin]), getAllEkspedisi);

module.exports = router;
