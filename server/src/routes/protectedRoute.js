const express = require("express");
const router = express.Router();
const authToken = require("../middleware/auth");
const roleMiddleware = require("../middleware/roleMiddleware");
const { scaneHandler, showAllActiviy, getActivityByName, showDataByResi } = require("../controllers/auditResiController");
const { addNewBarang, editBarang, showAllBarang, deleteBarang } = require("../controllers/barangController");
const { RegisterHandler, showAllStaff, showStaffDetail, editStaff } = require("../controllers/auth");
const { showAllCategory, addNewCategory, updateCategoryBarang, deleteCategoryBarang } = require("../controllers/categoriesBarangController");

const roles = {
  staff: "staff",
  admin: "admin",
  supadmin: "superadmin",
};

// add staff area

router.post("/auth/register", authToken, roleMiddleware([roles.supadmin]), RegisterHandler);
router.get("/auth/show", authToken, roleMiddleware([roles.admin, roles.supadmin]), showAllStaff);
router.get("/auth/show/:id_pekerja", authToken, roleMiddleware([roles.supadmin]), showStaffDetail);

// barang area
router.get("/barang", authToken, roleMiddleware([roles.admin, roles.supadmin]), showAllBarang);
router.post("/barang", authToken, roleMiddleware([roles.admin, roles.supadmin]), addNewBarang);
router.put("/barang/:resi_id", authToken, roleMiddleware([roles.admin, roles.supadmin]), editBarang);
router.delete("/barang/:resi_id", authToken, roleMiddleware([roles.admin, roles.supadmin]), deleteBarang);

// audit resi
router.post("/auditResi", authToken, roleMiddleware([roles.staff]), scaneHandler);
router.get("/auditResi/activity", authToken, roleMiddleware([roles.admin, roles.supadmin]), showAllActiviy);
router.get("/auditResi/activity/:username", authToken, getActivityByName);
router.get("/auditResi/:resi_id", authToken, roleMiddleware([roles.admin, roles.supadmin]), showDataByResi);

// categories area

router.get("/categories", authToken, roleMiddleware([roles.admin, roles.supadmin]), showAllCategory);
router.post("/categories", authToken, roleMiddleware([roles.admin, roles.supadmin]), addNewCategory);
router.put("/categories/:id_category", authToken, roleMiddleware([roles.admin, roles.supadmin]), updateCategoryBarang);
router.delete("/categories/:id_category", authToken, roleMiddleware([roles.admin, roles.supadmin]), deleteCategoryBarang);

module.exports = router;
