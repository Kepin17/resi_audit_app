const mysqlPool = require("../../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UAParser = require("ua-parser-js");

require("dotenv").config();
const secretKey = process.env.SECRET_KEY;

// regisrasi pekerja
const RegisterHandler = async (req, res) => {
  try {
    const { username, nama_pekerja, id_bagian, password, role } = req.body;

    // Enhanced input validation
    if (!username?.trim()) {
      return res.status(400).send({
        success: false,
        message: "Username is required",
        error: "validation_error",
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).send({
        success: false,
        message: "Password must be at least 6 characters long",
        error: "validation_error",
      });
    }

    if (!nama_pekerja?.trim()) {
      return res.status(400).send({
        success: false,
        message: "Worker name is required",
        error: "validation_error",
      });
    }

    // Validate role
    const validRoles = ["superadmin", "admin", "staff"];
    if (!validRoles.includes(role)) {
      return res.status(400).send({
        success: false,
        message: "Invalid role specified",
        error: "invalid_role",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await mysqlPool.query(
      `INSERT INTO pekerja (username, nama_pekerja, id_bagian, password, role) 
       VALUES (?, ?, ?, ?, ?)`,
      [username, nama_pekerja, id_bagian, hashedPassword, role]
    );

    res.status(200).send({
      success: true,
      message: "Successfully registered",
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      if (error.message.includes("username")) {
        return res.status(409).send({
          success: false,
          message: "Username already exists",
          error: "duplicate_username",
        });
      }
      return res.status(409).send({
        success: false,
        message: "Duplicate entry detected",
        error: "duplicate_entry",
      });
    }

    if (error.code === "ER_DATA_TOO_LONG") {
      return res.status(400).send({
        success: false,
        message: "Input data exceeds maximum length",
        error: "data_length_error",
      });
    }

    if (error.code?.startsWith("ER_")) {
      return res.status(400).send({
        success: false,
        message: "Database constraint violation",
        error: error.code,
      });
    }

    res.status(500).send({
      success: false,
      message: "Internal server error during registration",
      error: "internal_server_error",
    });
  }
};

const loginHandler = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Enhanced input validation
    if (!username?.trim() || !password) {
      return res.status(400).send({
        success: false,
        message: "Username and password are required",
        error: "validation_error",
      });
    }

    // Validate and parse user agent
    const ua = new UAParser(req.headers["user-agent"]);
    if (!req.headers["user-agent"]) {
      return res.status(400).send({
        success: false,
        message: "Invalid client information",
        error: "invalid_client",
      });
    }

    const deviceInfo = {
      ip_address: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
      device_type: ua.getDevice().type || "desktop",
      browser: `${ua.getBrowser().name || "Unknown"} ${ua.getBrowser().version || ""}`,
      os: `${ua.getOS().name || "Unknown"} ${ua.getOS().version || ""}`,
    };

    const [rows] = await mysqlPool.query("SELECT * FROM pekerja WHERE username = ?", [username]);

    if (rows.length === 0) {
      return res.status(401).send({
        success: false,
        message: "Invalid credentials",
        error: "invalid_credentials",
      });
    }

    const pekerja = rows[0];
    const passcordValidation = await bcrypt.compare(password, pekerja.password);
    const [bagianData] = await mysqlPool.query("SELECT * FROM bagian WHERE id_bagian = ?", [pekerja.id_bagian]);

    const divisi = bagianData[0] ? bagianData[0].nama_bagian : "admin";

    await mysqlPool.query(
      `INSERT INTO device_logs (id_pekerja, ip_address, device_info)
       VALUES (?, ?, ?)`,
      [pekerja.id_pekerja, deviceInfo.ip_address, JSON.stringify(deviceInfo)]
    );

    if (!passcordValidation) {
      return res.status(401).send({
        success: false,
        message: "Invalid credentials",
        error: "invalid_credentials",
      });
    }

    const token = jwt.sign(
      {
        id_pekerja: pekerja.id_pekerja,
        username: pekerja.username,
        pekerja: pekerja.nama_pekerja,
        bagian: divisi || null,
        role: pekerja.role,
        deviceInfo: deviceInfo,
      },
      secretKey,
      {
        expiresIn: "1d",
      }
    );

    res.status(200).send({
      success: true,
      message: "Login success",
      data: {
        username: pekerja.username,
        nama_pekerja: pekerja.nama_pekerja,
        bagian: divisi,
        role: pekerja.role,
      },
      yourToken: token,
    });
  } catch (error) {
    console.error("Login error:", error);

    // Add specific handling for device logging errors
    if (error.code === "ER_BAD_FIELD_ERROR") {
      // Continue with login even if device logging fails
      console.error("Device logging failed:", error.message);
      // Don't return here - continue with login process
    }

    if (error.code === "ER_ACCESS_DENIED_ERROR") {
      return res.status(500).send({
        success: false,
        message: "Database access error",
        error: "database_error",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).send({
        success: false,
        message: "Session expired",
        error: "token_expired",
      });
    }

    res.status(500).send({
      success: false,
      message: "Internal server error during login",
      error: "internal_server_error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const logOutHandler = (req, res) => {
  res.status(200).send({
    success: true,
    message: "Logout success",
  });
};

const showAllStaff = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(`
      SELECT id_pekerja, username,nama_pekerja, role, jenis_pekerja
      FROM pekerja 
      LEFT JOIN bagian ON pekerja.id_bagian = bagian.id_bagian
    `);
    res.status(200).send({
      success: true,
      message: "Data found",
      data: rows,
    });
  } catch (error) {
    console.error("Error when trying to show all workers:", error);

    res.status(500).send({
      success: false,
      message: "Error when trying to show all workers",
      error: "internal_server_error",
    });
  }
};

const showStaffDetail = async (req, res) => {
  try {
    const { id_pekerja } = req.params;
    const [rows] = await mysqlPool.query("SELECT * FROM pekerja WHERE id_pekerja = ?", [id_pekerja]);

    if (rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Data not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Data found",
      data: rows,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error when trying to show worker detail",
      error: "internal_server_error",
    });
  }
};

const deviceLog = async (req, res) => {
  try {
    const { id_pekerja } = req.params;
    const [rows] = await mysqlPool.query("SELECT * FROM device_logs WHERE id_pekerja = ?", [id_pekerja]);

    if (rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Data not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Data found",
      data: rows,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error when trying to show worker detail",
      error: "internal_server_error",
    });
  }
};

const editStaff = async (req, res) => {
  try {
    const { id_pekerja } = req.params;
    const { username, nama_pekerja, id_bagian, password, role } = req.body;

    // Enhanced input validation
    if (!username?.trim()) {
      return res.status(400).send({
        success: false,
        message: "Username is required",
        error: "validation_error",
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).send({
        success: false,
        message: "Password must be at least 6 characters long",
        error: "validation_error",
      });
    }

    if (!nama_pekerja?.trim()) {
      return res.status(400).send({
        success: false,
        message: "Worker name is required",
        error: "validation_error",
      });
    }

    // Validate role
    const validRoles = ["superadmin", "admin", "staff"];
    if (!validRoles.includes(role)) {
      return res.status(400).send({
        success: false,
        message: "Invalid role specified",
        error: "invalid_role",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await mysqlPool.query(`UPDATE pekerja SET username = ?, nama_pekerja = ?, id_bagian = ?, password = ?, role = ? WHERE id_pekerja = ?`, [username, nama_pekerja, id_bagian, hashedPassword, role, id_pekerja]);

    if (result.affectedRows === 0) {
      return res.status(404).send({
        success: false,
        message: "Worker not found",
        error: "not_found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Successfully edited",
    });
  } catch (error) {
    console.error("Edit staff error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).send({
        success: false,
        message: "Username already exists",
        error: "duplicate_username",
      });
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).send({
        success: false,
        message: "Invalid department ID",
        error: "invalid_department",
      });
    }

    if (error.code === "ER_DATA_TOO_LONG") {
      return res.status(400).send({
        success: false,
        message: "Input data exceeds maximum length",
        error: "data_length_error",
      });
    }

    res.status(500).send({
      success: false,
      message: "Error when trying to edit worker",
      error: "internal_server_error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = { RegisterHandler, loginHandler, logOutHandler, showAllStaff, showStaffDetail, editStaff, deviceLog };
