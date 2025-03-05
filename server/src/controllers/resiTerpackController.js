const mysqlPool = require("../config/db");
const excelJS = require("exceljs");
const moment = require("moment");

const showResiTerpack = async (req, res) => {
  try {
    const { search, startDate, endDate, status, page = 1 } = req.query;
    const limit = 12;
    const offset = (page - 1) * limit;

    // Get today's count
    const [todayCount] = await mysqlPool.query(
      `SELECT COUNT(*) as today_count 
       FROM log_proses 
       WHERE DATE(created_at) = CURDATE()`
    );

    let countQuery = `
      SELECT COUNT(DISTINCT log_proses.id_log) as total
      FROM log_proses
      LEFT JOIN pekerja ON log_proses.id_pekerja = pekerja.id_pekerja
      WHERE 1=1
    `;

    let dataQuery = `
      SELECT DISTINCT
        log_proses.id_log,
        log_proses.resi_id,
        log_proses.id_pekerja,
        log_proses.status_proses,
        log_proses.created_at,
        pekerja.nama_pekerja
      FROM log_proses
      LEFT JOIN pekerja ON log_proses.id_pekerja = pekerja.id_pekerja
      WHERE 1=1
    `;

    const params = [];
    const countParams = [];

    // Add status filter
    if (status && status !== "all") {
      const statusCondition = ` AND log_proses.status_proses = ?`;
      dataQuery += statusCondition;
      countQuery += statusCondition;
      params.push(status);
      countParams.push(status);
    }

    if (search) {
      // Updated search condition to be more specific but case insensitive
      const searchCondition = ` AND (log_proses.resi_id = ? COLLATE utf8mb4_general_ci OR pekerja.nama_pekerja = ? COLLATE utf8mb4_general_ci)`;
      dataQuery += searchCondition;
      countQuery += searchCondition;
      params.push(search, search);
      countParams.push(search, search);
    }

    if (startDate && endDate) {
      const dateCondition = ` AND DATE(log_proses.created_at) BETWEEN ? AND ?`;
      dataQuery += dateCondition;
      countQuery += dateCondition;
      params.push(startDate, endDate);
      countParams.push(startDate, endDate);
    }

    dataQuery += ` ORDER BY log_proses.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // Modify the expedition count query to get individual rows
    let expeditionCountQuery = `
      SELECT 
        ekpedisi.nama_ekspedisi,
        COUNT(barang.resi_id) AS total_resi
      FROM barang
      JOIN ekpedisi ON barang.id_ekspedisi = ekpedisi.id_ekspedisi
      JOIN proses ON barang.resi_id = proses.resi_id
      WHERE proses.status_proses = 'pickout' 
    `;

    let expeditionParams = [];

    // Tambahkan filter tanggal jika tersedia
    if (startDate && endDate) {
      expeditionCountQuery += ` AND barang.created_at BETWEEN ? AND ?`;
      expeditionParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    }

    // Akhiri query utama dengan GROUP BY
    expeditionCountQuery += ` GROUP BY ekpedisi.nama_ekspedisi`;

    const [rows] = await mysqlPool.query(dataQuery, params);
    const [countResult] = await mysqlPool.query(countQuery, countParams);
    
    // Get expedition counts using the modified query
    let expeditionCounts;
    try {
      [expeditionCounts] = await mysqlPool.query(expeditionCountQuery, expeditionParams);
    } catch (error) {
      console.error("Error fetching expedition counts:", error);
      expeditionCounts = [];
    }
    
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    return res.status(200).json({
      success: true,
      message: "Data berhasil ditemukan!",
      data: rows,
      todayCount: todayCount[0].today_count,
      countEkspedisiToday: expeditionCounts.map(item => ({
        nama_ekpedisi: item.nama_ekspedisi,
        total_resi: item.total_resi
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems,
        perPage: limit,
      },
    });
  } catch (err) {
    console.error("Error in showResiTerpack:", err);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: err.message,
    });
  }
};

const exportPackToExcel = async (req, res) => {
  try {
    const { status } = req.query;
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Resi Report");

    worksheet.columns = [
      { header: "Resi ID", key: "resi_id", width: 20 },
      { header: "Staff Name", key: "nama_pekerja", width: 20 },
      { header: "Status", key: "status_proses", width: 15 },
      { header: "Pack Date", key: "created_at", width: 20 },
    ];

    let query = `
      SELECT 
        log_proses.resi_id,
        pekerja.nama_pekerja,
        log_proses.status_proses,
        log_proses.created_at
      FROM log_proses
      LEFT JOIN pekerja ON log_proses.id_pekerja = pekerja.id_pekerja
      WHERE 1=1
    `;

    const params = [];

    if (status && status !== "all") {
      query += ` AND log_proses.status_proses = ?`;
      params.push(status);
    }

    query += ` ORDER BY log_proses.created_at DESC`;

    const [rows] = await mysqlPool.query(query, params);

    rows.forEach((row) => {
      worksheet.addRow({
        ...row,
        created_at: moment(row.created_at).format("DD/MM/YYYY HH:mm:ss"),
      });
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    const fileName = status && status !== "all" ? `resi_${status}_${moment().format("DDMMYYYY")}.xlsx` : `resi_all_${moment().format("DDMMYYYY")}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    return workbook.xlsx.write(res);
  } catch (err) {
    console.error("Error in exportToExcel:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to export data",
      error: err.message,
    });
  }
};

const backupPackToExcel = async (req, res) => {
  try {
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Backup_Resi_Packing");

    worksheet.columns = [
      { header: "ID", key: "id_log", width: 10 },
      { header: "Resi ID", key: "resi_id", width: 20 },
      { header: "ID Pekerja", key: "id_pekerja", width: 20 },
      { header: "Status", key: "status_proses", width: 15 },
      { header: "Pack Date", key: "created_at", width: 20 },
      { header: "updated at", key: "updated_at", width: 20 },
    ];

    const [rows] = await mysqlPool.query(`
      SELECT 
       * 
      FROM log_proses
      ORDER BY log_proses.created_at DESC
    `);

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
        id_log: row.id_log,
        resi_id: row.resi_id,
        id_pekerja: row.id_pekerja,
        status_proses: row.status_proses,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
    });

    // Auto fit columns
    worksheet.columns.forEach((column) => {
      column.alignment = { vertical: "middle", horizontal: "left" };
    });

    // Set response headers
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=data_barang_${moment().format("YYYY-MM-DD_HH-mm")}_backup.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);

    res.end();
  } catch (err) {
    console.error("Error in backupToExcel:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create backup",
      error: err.message,
    });
  }
};

const importPackFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({
        success: false,
        message: "No file uploaded",
      });
    }

    const workbook = new excelJS.Workbook();

    try {
      await workbook.xlsx.readFile(req.file.path);
      const worksheet = workbook.getWorksheet(1);

      const rows = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip header row
          const id_log = row.getCell(1).value;
          const resi_id = row.getCell(2).value;
          const id_pekerja = row.getCell(3).value;
          const status_proses = row.getCell(4).value;
          const created_at = row.getCell(5).value;
          const updated_at = row.getCell(6).value;

          rows.push([id_log, resi_id, id_pekerja, status_proses, created_at, updated_at]);
        }
      });

      // Insert data into database
      for (const row of rows) {
        await mysqlPool.query(
          `INSERT INTO log_proses (id_log, resi_id, id_pekerja, status_proses, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
           updated_at = VALUES(updated_at)`,
          row
        );
      }

      // Clean up: delete the uploaded file
      const fs = require("fs");
      fs.unlinkSync(req.file.path);

      return res.status(200).send({
        success: true,
        message: "Data berhasil diimport dan diupdate",
        rowsProcessed: rows.length,
      });
    } catch (error) {
      console.error("Error processing Excel file:", error);
      return res.status(500).send({
        success: false,
        message: "Error processing Excel file",
        error: error.message,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Error when trying to import resi",
      error: error.message,
    });
  }
};

module.exports = {
  showResiTerpack,
  exportPackToExcel,
  backupPackToExcel,
  importPackFromExcel,
};
