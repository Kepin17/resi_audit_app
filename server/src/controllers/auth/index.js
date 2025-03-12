const mysqlPool = require("../../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UAParser = require("ua-parser-js");

require("dotenv").config();
const secretKey = process.env.SECRET_KEY;

const generatePekerjaPKJId = async () => {
  const [lastId] = await mysqlPool.query("SELECT id_pekerja FROM pekerja ORDER BY id_pekerja DESC LIMIT 1");
  if (lastId.length === 0) return "PKJ00001";

  const lastNumber = parseInt(lastId[0].id_pekerja.slice(3));
  return `PKJ${String(lastNumber + 1).padStart(5, "0")}`;
};

// regisrasi pekerja
const RegisterHandler = async (req, res) => {
  try {
    const { username, nama_pekerja, bagian_roles, password } = req.body;

    // Validate input
    if (!username?.trim() || !password || !nama_pekerja?.trim() || !Array.isArray(bagian_roles) || bagian_roles.length === 0) {
      return res.status(400).send({
        success: false,
        message: "All fields are required. bagian_roles must be an array of valid bagian IDs",
        error: "validation_error",
      });
    }

    if (password.length < 6) {
      return res.status(400).send({
        success: false,
        message: "Password must be at least 6 characters long",
        error: "validation_error",
      });
    }

    const connection = await mysqlPool.getConnection();

    try {
      await connection.beginTransaction();

      // Generate PKJ ID
      const id_pekerja = await generatePekerjaPKJId();
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert into pekerja table
      await connection.query(
        `INSERT INTO pekerja (id_pekerja, username, nama_pekerja, password) 
         VALUES (?, ?, ?, ?)`,
        [id_pekerja, username, nama_pekerja, hashedPassword]
      );

      // Insert roles
      for (const bagian_id of bagian_roles) {
        await connection.query(`INSERT INTO role_pekerja (id_pekerja, id_bagian) VALUES (?, ?)`, [id_pekerja, bagian_id]);
      }

      await connection.commit();

      res.status(200).send({
        success: true,
        message: "Successfully registered",
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).send({
        success: false,
        message: "Username already exists",
        error: "duplicate_username",
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

    if (!username?.trim() || !password) {
      return res.status(400).send({
        success: false,
        message: "Username and password are required",
        error: "validation_error",
      });
    }

    // Get user agent info
    const ua = new UAParser(req.headers["user-agent"]);
    const deviceInfo = {
      ip_address: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
      device_type: ua.getDevice().type || "desktop",
      browser: `${ua.getBrowser().name || "Unknown"} ${ua.getBrowser().version || ""}`,
      os: `${ua.getOS().name || "Unknown"} ${ua.getOS().version || ""}`,
    };

    // Get user and their roles
    const [users] = await mysqlPool.query(
      `SELECT p.*, 
              GROUP_CONCAT(b.jenis_pekerja) as roles,
              GROUP_CONCAT(b.id_bagian) as bagian_ids
       FROM pekerja p
       LEFT JOIN role_pekerja rp ON p.id_pekerja = rp.id_pekerja
       LEFT JOIN bagian b ON rp.id_bagian = b.id_bagian
       WHERE p.username = ?
       GROUP BY p.id_pekerja`,
      [username]
    );

    if (users.length === 0) {
      return res.status(401).send({
        success: false,
        message: "Invalid credentials",
        error: "invalid_credentials",
      });
    }

    const user = users[0];
    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      return res.status(401).send({
        success: false,
        message: "Invalid credentials",
        error: "invalid_credentials",
      });
    }

    // Log device info
    await mysqlPool.query(
      `INSERT INTO device_logs (id_pekerja, ip_address, device_info)
       VALUES (?, ?, ?)`,
      [user.id_pekerja, deviceInfo.ip_address, JSON.stringify(deviceInfo)]
    );

    const roles = user.roles ? user.roles.split(",") : [];
    const bagian_ids = user.bagian_ids ? user.bagian_ids.split(",") : [];

    const token = jwt.sign(
      {
        id_pekerja: user.id_pekerja,
        username: user.username,
        pekerja: user.nama_pekerja,
        roles: roles,
        bagian_ids: bagian_ids,
        deviceInfo: deviceInfo,
      },
      secretKey,
      { expiresIn: "1d" }
    );

    res.status(200).send({
      success: true,
      message: "Login success",
      data: {
        username: user.username,
        nama_pekerja: user.nama_pekerja,
        roles: roles,
        bagian_ids: bagian_ids,
      },
      yourToken: token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).send({
      success: false,
      message: "Internal server error during login",
      error: "internal_server_error",
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { search } = req.query;

    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push("(p.nama_pekerja LIKE ? OR p.username LIKE ? OR b.jenis_pekerja LIKE ?)");
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    // Get total count
    const [countResult] = await mysqlPool.query(
      `SELECT COUNT(DISTINCT p.id_pekerja) as count
       FROM pekerja p
       LEFT JOIN role_pekerja rp ON p.id_pekerja = rp.id_pekerja
       LEFT JOIN bagian b ON rp.id_bagian = b.id_bagian
       ${whereClause}`,
      queryParams
    );

    const totalItems = countResult[0].count;
    const totalPages = Math.ceil(totalItems / limit);

    // Get worker data with their roles
    const [rows] = await mysqlPool.query(
      `SELECT 
        p.id_pekerja,
        p.username,
        p.nama_pekerja,
        p.created_at,
        GROUP_CONCAT(DISTINCT b.jenis_pekerja) as roles,
        GROUP_CONCAT(DISTINCT b.id_bagian) as bagian_ids
       FROM pekerja p
       LEFT JOIN role_pekerja rp ON p.id_pekerja = rp.id_pekerja
       LEFT JOIN bagian b ON rp.id_bagian = b.id_bagian
       ${whereClause}
       GROUP BY p.id_pekerja
       ORDER BY p.created_at DESC
       LIMIT ?, ?`,
      [...queryParams, offset, limit]
    );

    // Process the results to convert comma-separated strings to arrays
    const processedRows = rows.map((row) => ({
      ...row,
      roles: row.roles ? row.roles.split(",") : [],
      bagian_ids: row.bagian_ids ? row.bagian_ids.split(",") : [],
    }));

    res.status(200).send({
      success: true,
      message: "Data found",
      data: processedRows,
      pagination: {
        totalPages,
        currentPage: page,
        totalItems,
        pageSize: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error when trying to show all workers:", error);
    res.status(500).send({
      success: false,
      message: "Error when trying to show all workers",
      error: "internal_server_error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    const { search, startDate, endDate } = req.query;

    // Build the WHERE clause dynamically
    let whereConditions = [];
    let queryParams = [];

    // Updated search condition
    if (search) {
      whereConditions.push("(pekerja.nama_pekerja LIKE ? OR pekerja.nama_pekerja LIKE ?)");
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (startDate && endDate) {
      whereConditions.push("DATE(device_logs.login_time) BETWEEN ? AND ?");
      queryParams.push(startDate, endDate);
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    // Get total count with filters
    const [countResult] = await mysqlPool.query(
      `SELECT COUNT(*) as count 
       FROM device_logs 
       LEFT JOIN pekerja ON device_logs.id_pekerja = pekerja.id_pekerja
       ${whereClause}`,
      queryParams
    );

    const totalItems = countResult[0].count;
    const totalPages = Math.ceil(totalItems / limit);

    const [rows] = await mysqlPool.query(
      `
      SELECT device_logs.*, pekerja.nama_pekerja FROM device_logs
      LEFT JOIN pekerja ON device_logs.id_pekerja = pekerja.id_pekerja
      ${whereClause}
      ORDER BY login_time DESC
      LIMIT ?, ?
      `,
      [...queryParams, offset, limit]
    );

    return res.status(200).json({
      success: true,
      message: "Barang found",
      data: rows,
      pagination: {
        totalPages,
        currentPage: page,
        totalItems,
      },
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
    const { username, nama_pekerja, bagian_roles, new_password } = req.body;

    // Input validation
    if (!username?.trim() || !nama_pekerja?.trim()) {
      return res.status(400).send({
        success: false,
        message: "Username and worker name are required",
        error: "validation_error",
      });
    }

    if (!Array.isArray(bagian_roles) || bagian_roles.length === 0) {
      return res.status(400).send({
        success: false,
        message: "At least one role must be assigned",
        error: "validation_error",
      });
    }

    const connection = await mysqlPool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if worker exists
      const [existingWorker] = await connection.query("SELECT id_pekerja FROM pekerja WHERE id_pekerja = ?", [id_pekerja]);

      if (existingWorker.length === 0) {
        await connection.rollback();
        return res.status(404).send({
          success: false,
          message: "Worker not found",
          error: "not_found",
        });
      }

      // Update basic info
      let updateQuery = "UPDATE pekerja SET username = ?, nama_pekerja = ?";
      let updateParams = [username, nama_pekerja];

      if (new_password) {
        if (new_password.length < 6) {
          await connection.rollback();
          return res.status(400).send({
            success: false,
            message: "Password must be at least 6 characters long",
            error: "validation_error",
          });
        }
        const hashedPassword = await bcrypt.hash(new_password, 10);
        updateQuery += ", password = ?";
        updateParams.push(hashedPassword);
      }

      updateQuery += " WHERE id_pekerja = ?";
      updateParams.push(id_pekerja);

      await connection.query(updateQuery, updateParams);

      // Get current roles
      const [currentRoles] = await connection.query("SELECT id_bagian FROM role_pekerja WHERE id_pekerja = ?", [id_pekerja]);

      const currentRoleSet = new Set(currentRoles.map((r) => r.id_bagian));
      const newRoleSet = new Set(bagian_roles);

      // Roles to add (in new set but not in current)
      const rolesToAdd = bagian_roles.filter((r) => !currentRoleSet.has(r));

      // Roles to remove (in current but not in new)
      const rolesToRemove = Array.from(currentRoleSet).filter((r) => !newRoleSet.has(r));

      // Add new roles
      if (rolesToAdd.length > 0) {
        const insertValues = rolesToAdd.map((role) => [id_pekerja, role]);
        await connection.query("INSERT INTO role_pekerja (id_pekerja, id_bagian) VALUES ?", [insertValues]);
      }

      // Remove old roles only if there will still be at least one role left
      if (rolesToRemove.length > 0 && currentRoles.length - rolesToRemove.length >= 1) {
        await connection.query("DELETE FROM role_pekerja WHERE id_pekerja = ? AND id_bagian IN (?)", [id_pekerja, rolesToRemove]);
      }

      await connection.commit();

      res.status(200).send({
        success: true,
        message: "Successfully updated worker and roles",
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
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
        message: "One or more invalid bagian IDs provided",
        error: "invalid_bagian",
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

const deleteStaff = async (req, res) => {
  try {
    const { id_pekerja } = req.params;

    const [result] = await mysqlPool.query("DELETE FROM pekerja WHERE id_pekerja = ?", [id_pekerja]);

    if (result.affectedRows === 0) {
      return res.status(404).send({
        success: false,
        message: "Worker not found",
        error: "not_found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Successfully deleted",
    });
  } catch (error) {
    console.error("Delete staff error:", error);

    res.status(500).send({
      success: false,
      message: "Error when trying to delete worker",
      error: "internal_server_error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const showPackingStaff = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search?.trim();

    // First, get total count with search condition
    const countQuery = `
      SELECT COUNT(DISTINCT p.id_pekerja) as total
      FROM pekerja p
      LEFT JOIN role_pekerja rp ON p.id_pekerja = rp.id_pekerja
      LEFT JOIN bagian b ON rp.id_bagian = b.id_bagian
      ${search ? "WHERE p.nama_pekerja LIKE ?" : ""}
      HAVING 
        COUNT(CASE WHEN b.jenis_pekerja = 'packing' THEN 1 END) > 0
        AND
        COUNT(CASE WHEN b.jenis_pekerja = 'freelance' THEN 1 END) > 0
    `;

    const [countResult] = await mysqlPool.query(countQuery, search ? [`%${search}%`] : []);

    const totalItems = countResult[0]?.total || 0;

    // Then get the paginated data
    const query = `
      SELECT 
        p.id_pekerja, 
        p.nama_pekerja, 
        GROUP_CONCAT(DISTINCT b.jenis_pekerja) as roles,
        COALESCE((
          SELECT SUM(gaji_total) 
          FROM gaji_pegawai 
          WHERE id_pekerja = p.id_pekerja 
          AND is_dibayar = 0
        ), 0) as gaji_pokok
      FROM pekerja p
      LEFT JOIN role_pekerja rp ON p.id_pekerja = rp.id_pekerja
      LEFT JOIN bagian b ON rp.id_bagian = b.id_bagian
      ${search ? "WHERE p.nama_pekerja LIKE ?" : ""}
      GROUP BY p.id_pekerja
      HAVING 
        COUNT(CASE WHEN b.jenis_pekerja = 'packing' THEN 1 END) > 0
        AND
        COUNT(CASE WHEN b.jenis_pekerja = 'freelance' THEN 1 END) > 0
      ORDER BY p.nama_pekerja ASC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await mysqlPool.query(query, search ? [`%${search}%`, limit, offset] : [limit, offset]);

    res.status(200).send({
      success: true,
      message: "Data found",
      data: rows,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    });
  } catch (error) {
    console.error("Error in showPackingStaff:", error);
    res.status(500).send({
      success: false,
      message: "Error when trying to show packing worker",
      error: "internal_server_error",
    });
  }
};

const resetPass = async (req, res) => {
  try {
    const { username } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).send({
        success: false,
        message: "Password is required",
        error: "validation_error",
      });
    }

    if (password.length < 6) {
      return res.status(400).send({
        success: false,
        message: "Password must be at least 6 characters long",
        error: "validation_error",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await mysqlPool.query("UPDATE pekerja SET password = ? WHERE id_pekerja = ?", [hashedPassword, id_pekerja]);

    if (result.affectedRows === 0) {
      return res.status(404).send({
        success: false,
        message: "Worker not found",
        error: "not_found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error in resetPass:", error);
    res.status(500).send({
      success: false,
      message: "Error when trying to reset password",
      error: "internal_server_error",
    });
  }
};

module.exports = {
  RegisterHandler,
  loginHandler,
  logOutHandler,
  showAllStaff,
  showStaffDetail,
  editStaff,
  deviceLog,
  deleteStaff,
  showPackingStaff,
  resetPass,
};
