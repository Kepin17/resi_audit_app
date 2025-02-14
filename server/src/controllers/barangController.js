const mysqlPool = require("../config/db");
const excelJS = require("exceljs");
const moment = require("moment");

const addNewBarang = async (req, res) => {
  try {
    const { resi_id } = req.body;

    // Validate required fields
    if (!resi_id) {
      return res.status(400).send({
        success: false,
        message: "all field are required",
      });
    }

    const [rows] = await mysqlPool.query("SELECT * FROM barang WHERE resi_id = ?", [resi_id]);

    if (rows.length === 0) {
      await mysqlPool.query("INSERT INTO barang (resi_id) VALUES (?)", [resi_id]);
    } else {
      return res.status(400).send({
        success: false,
        message: "resi already exist",
      });
    }

    res.status(200).send({
      success: true,
      message: "New barang added",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error when trying to add new barang",
      error: error.message,
    });
  }
};

const showAllBarang = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    const { search, status, startDate, endDate, sortBy } = req.query;

    // Build the WHERE clause dynamically
    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push("(b.resi_id LIKE ?)");
      queryParams.push(`%${search}%`);
    }

    // Update the status filtering logic
    if (status && status !== "Semua") {
      const statusValue = status.toLowerCase();
      if (statusValue === "pending") {
        whereConditions.push("(latest_process.status_proses IS NULL OR latest_process.status_proses = 'pending')");
      } else {
        whereConditions.push("latest_process.status_proses = ?");
        queryParams.push(statusValue);
      }
    }

    if (startDate && endDate) {
      whereConditions.push("DATE(b.created_at) BETWEEN ? AND ?");
      queryParams.push(startDate, endDate);
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    // Get total count with filters
    const [countResult] = await mysqlPool.query(
      `SELECT COUNT(DISTINCT b.resi_id) as count 
       FROM barang b
       LEFT JOIN (
         SELECT p1.resi_id, p1.status_proses
         FROM proses p1
         WHERE p1.id_proses = (
           SELECT p2.id_proses 
           FROM proses p2 
           WHERE p2.resi_id = p1.resi_id 
           ORDER BY p2.updated_at DESC 
           LIMIT 1
         )
       ) latest_process ON b.resi_id = latest_process.resi_id
       ${whereClause}`,
      queryParams
    );

    const totalItems = countResult[0].count;
    const totalPages = Math.ceil(totalItems / limit);

    // Define sort order based on sortBy parameter
    let orderClause = "ORDER BY b.created_at DESC";
    switch (sortBy) {
      case "today-first":
        orderClause = "ORDER BY DATE(b.created_at) = CURDATE() DESC, b.created_at ASC";
        break;
      case "oldest-first":
        orderClause = "ORDER BY b.created_at ASC";
        break;
      case "last-update":
        // Fix: use last_scan from latest_process instead of updated_at
        orderClause = "ORDER BY COALESCE(latest_process.last_scan, b.updated_at) DESC";
        break;
      default:
        orderClause = "ORDER BY b.created_at DESC";
    }

    // Get filtered and paginated data with latest process status
    const [rows] = await mysqlPool.query(
      `SELECT 
        b.resi_id,
        b.created_at,
        b.updated_at,
        COALESCE(latest_process.status_proses, 'pending') as status_proses,
        latest_process.nama_pekerja,
        latest_process.last_scan,
        CASE 
          WHEN latest_process.status_proses = 'cancelled' THEN 'Dibatalkan'
          WHEN latest_process.status_proses = 'pending' OR latest_process.status_proses IS NULL THEN 'Menunggu pickup'
          WHEN latest_process.status_proses = 'picker' THEN 'Sudah dipickup'
          WHEN latest_process.status_proses = 'packing' THEN 'Sudah dipacking'
          WHEN latest_process.status_proses = 'pickout' THEN 'Dalam pengiriman'
          WHEN latest_process.status_proses = 'konfirmasi' THEN 'Konfirmasi Cancel'
          ELSE 'Menunggu proses'
        END as status_description,
        (
          SELECT GROUP_CONCAT(DISTINCT l.status_proses ORDER BY l.created_at DESC)
          FROM log_proses l
          WHERE l.resi_id = b.resi_id
        ) as process_history
       FROM barang b
       LEFT JOIN (
         SELECT p1.resi_id, 
                p1.status_proses, 
                p1.updated_at as last_scan,
                pek.nama_pekerja
         FROM proses p1
         LEFT JOIN pekerja pek ON p1.id_pekerja = pek.id_pekerja
         WHERE p1.id_proses = (
           SELECT p2.id_proses 
           FROM proses p2 
           WHERE p2.resi_id = p1.resi_id 
           ORDER BY p2.updated_at DESC 
           LIMIT 1
         )
       ) latest_process ON b.resi_id = latest_process.resi_id
       ${whereClause}
       ${orderClause}
       LIMIT ?, ?`,
      [...queryParams, offset, limit]
    );

    return res.status(200).json({
      success: true,
      message: "Data found",
      data: rows,
      pagination: {
        totalPages,
        currentPage: page,
        totalItems,
      },
    });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({
      success: false,
      message: "Error when trying to fetch data",
      error: error.message,
    });
  }
};

const showDetailByResi = async (req, res) => {
  try {
    const { resi_id } = req.params;

    if (!resi_id) {
      return res.status(400).send({
        success: false,
        message: "Resi ID is required",
      });
    }

    const [rows] = await mysqlPool.query(
      `
      SELECT log_proses.resi_id,
      log_proses.status_proses,
      log_proses.created_at,
      log_proses.gambar_resi,
      pekerja.nama_pekerja
      FROM log_proses
      LEFT JOIN pekerja ON log_proses.id_pekerja = pekerja.id_pekerja
      WHERE log_proses.resi_id = ?
      
      `,
      [resi_id]
    );

    if (rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No data found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Data found",
      data: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Error fetching resi details",
      error: error.message,
    });
  }
};

const cancelBarang = async (req, res) => {
  const connection = await mysqlPool.getConnection();

  try {
    await connection.beginTransaction();

    const { resi_id } = req.params;
    const userRoles = req.user.roles;

    // Check if resi exists and get current status
    const [existingResi] = await connection.query("SELECT status_proses FROM proses WHERE resi_id = ? ORDER BY updated_at DESC LIMIT 1", [resi_id]);

    if (existingResi.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Resi not found",
      });
    }

    // Check if already cancelled
    if (existingResi[0].status_proses === "cancelled") {
      return res.status(400).send({
        success: false,
        message: "Resi already cancelled",
      });
    }

    // Updated query with correct parameter order and WHERE clause
    await connection.query(
      `UPDATE proses 
       SET status_proses = 'cancelled', 
           id_pekerja = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE resi_id = ? 
       AND id_proses = (
         SELECT id_proses 
         FROM (
           SELECT MAX(id_proses) as id_proses 
           FROM proses 
           WHERE resi_id = ?
         ) as latest
       )`,
      [req.user.id_pekerja, resi_id, resi_id]
    );

    // Log the cancellation only if not already logged
    await connection.query(
      `INSERT INTO log_proses (resi_id, id_pekerja, status_proses)
       SELECT ?, ?, 'cancelled'
       WHERE NOT EXISTS (
         SELECT 1 FROM log_proses 
         WHERE resi_id = ? AND status_proses = 'cancelled'
       )`,
      [resi_id, req.user.id_pekerja, resi_id]
    );

    await connection.commit();

    res.status(200).send({
      success: true,
      message: "Resi has been cancelled",
      updatedBy: userRoles,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Cancel resi error:", error);
    res.status(500).send({
      success: false,
      message: "Error cancelling resi",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const importResiFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({
        success: false,
        message: "No file uploaded",
      });
    }

    const workbook = new excelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.getWorksheet(1);

    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const resi_id = row.getCell(1).value;

        if (resi_id) {
          // Insert into barang table
          await connection.query(
            `INSERT INTO barang (resi_id) 
             VALUES (?)
             ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
            [resi_id]
          );
        }
      }

      await connection.commit();

      // Clean up uploaded file
      const fs = require("fs");
      fs.unlinkSync(req.file.path);

      res.status(200).send({
        success: true,
        message: "Data imported successfully",
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Error importing data",
      error: error.message,
    });
  }
};

const exportBarang = async (req, res) => {
  try {
    const { search, status, startDate, endDate } = req.query;

    // Build the WHERE clause dynamically
    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push("(b.resi_id LIKE ?)");
      queryParams.push(`%${search}%`);
    }

    if (status && status !== "Semua") {
      whereConditions.push("latest_process.status_proses = ?");
      queryParams.push(status);
    }

    if (startDate && endDate) {
      whereConditions.push("DATE(b.created_at) BETWEEN ? AND ?");
      queryParams.push(startDate, endDate);
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    // Updated query to use correct table structure
    const [rows] = await mysqlPool.query(
      `
      SELECT 
        b.resi_id,
        COALESCE(latest_process.status_proses, 'pending') as status_proses,
        DATE_FORMAT(b.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(b.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at,
        COALESCE(latest_process.nama_pekerja, '-') as nama_pekerja,
        CASE 
          WHEN latest_process.status_proses = 'cancelled' THEN 'Dibatalkan'
          WHEN latest_process.status_proses = 'pending' OR latest_process.status_proses IS NULL THEN 'Menunggu pickup'
          WHEN latest_process.status_proses = 'picker' THEN 'Sudah dipickup'
          WHEN latest_process.status_proses = 'packing' THEN 'Sudah dipacking'
          WHEN latest_process.status_proses = 'pickout' THEN 'Dalam pengiriman'
          ELSE 'Status tidak diketahui'
        END as status_description
      FROM barang b
      LEFT JOIN (
        SELECT p1.resi_id, 
               p1.status_proses,
               p1.updated_at,
               pek.nama_pekerja
        FROM proses p1
        LEFT JOIN pekerja pek ON p1.id_pekerja = pek.id_pekerja
        WHERE p1.id_proses = (
          SELECT p2.id_proses 
          FROM proses p2 
          WHERE p2.resi_id = p1.resi_id 
          ORDER BY p2.updated_at DESC 
          LIMIT 1
        )
      ) latest_process ON b.resi_id = latest_process.resi_id
      ${whereClause}
      ORDER BY b.created_at DESC
    `,
      queryParams
    );

    if (rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No data to export",
      });
    }

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data Barang");

    // Updated column headers to match the actual data
    worksheet.columns = [
      { header: "Nomor Resi", key: "resi_id", width: 20 },
      { header: "Status", key: "status_description", width: 25 },
      { header: "Tanggal Dibuat", key: "created_at", width: 25 },
      { header: "Terakhir Update", key: "updated_at", width: 25 },
      { header: "Pekerja", key: "nama_pekerja", width: 25 },
    ];

    // Add metadata row for filter information
    const filterInfo = [`Search: ${search || "None"}`, `Status: ${status || "All"}`, `Date Range: ${startDate || "None"} to ${endDate || "None"}`].join(" | ");
    worksheet.addRow([filterInfo]);

    // Style header rows
    worksheet.getRow(2).font = { bold: true };
    worksheet.getRow(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Add data rows starting from row 3
    rows.forEach((row) => {
      worksheet.addRow({
        resi_id: row.resi_id,
        status_description: row.status_description,
        created_at: row.created_at,
        updated_at: row.updated_at,
        nama_pekerja: row.nama_pekerja,
      });
    });

    worksheet.columns.forEach((column) => {
      column.alignment = { vertical: "middle", horizontal: "left" };
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=data_barang_${moment().format("YYYY-MM-DD_HH-mm")}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).send({
      success: false,
      message: "Error exporting data",
      error: error.message,
    });
  }
};

const backupBarang = async (req, res) => {
  try {
    // Get data from database
    const [rows] = await mysqlPool.query(
      `
      SELECT * FROM barang
      ORDER BY created_at DESC
    `
    );

    if (rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No data to export",
      });
    }

    // Create workbook and worksheet
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data Barang");

    // Define columns
    worksheet.columns = [
      { header: "Nomor Resi", key: "resi_id", width: 20 },
      { header: "Status", key: "status_barang", width: 25 },
      { header: "Tanggal Dibuat", key: "created_at", width: 25 },
      { header: "Terakhir Update", key: "updated_at", width: 25 },
      { header: "id_proses", key: "id_proses", width: 25 },
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Add rows
    rows.forEach((row) => {
      worksheet.addRow({
        resi_id: row.resi_id,
        status_barang: row.status_barang,
        created_at: row.created_at,
        updated_at: row.updated_at,
        id_proses: row.id_proses,
      });
    });

    // Auto fit columns
    worksheet.columns.forEach((column) => {
      column.alignment = { vertical: "middle", horizontal: "left" };
    });

    // Set response headers
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=data_barang_${moment().format("YYYY-MM-DD_HH-mm")}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).send({
      success: false,
      message: "Error exporting data",
      error: error.message,
    });
  }
};

module.exports = {
  addNewBarang,
  showAllBarang,
  cancelBarang,
  showDetailByResi,
  importResiFromExcel,
  exportBarang,
  backupBarang,
};
