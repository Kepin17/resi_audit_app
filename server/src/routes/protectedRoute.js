const express = require("express");
const router = express.Router();
const authToken = require("../middleware/auth");
const showAll = require("../controllers/bagianController");

router.get("/bagian/show", authToken, showAll);

module.exports = router;
