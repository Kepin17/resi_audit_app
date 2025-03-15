const mysqlPool = require("../config/db");
const excelJS = require("exceljs");
const moment = require("moment");

const showResiTerpack = async (req, res) => {
  try {
    const { search, startDate, endDate, status, page = 1 } = req.query;
    const limit = 12;
    const offset = (page - 1) * limit;

    // Get today's count from all process tables combined
    const todayCountQuery = `
      SELECT 
        (SELECT COUNT(*) FROM log_proses_picker WHERE DATE(created_at) = CURDATE()) +
        (SELECT COUNT(*) FROM log_proses_packing WHERE DATE(created_at) = CURDATE()) +
        (SELECT COUNT(*) FROM log_proses_pickout WHERE DATE(created_at) = CURDATE()) +
        (SELECT COUNT(*) FROM log_proses_cancelled WHERE DATE(created_at) = CURDATE()) +
        (SELECT COUNT(*) FROM log_proses_validated WHERE DATE(created_at) = CURDATE()) as today_count
    `;
    const [todayCount] = await mysqlPool.query(todayCountQuery);

    // Build query based on status filter
    let countQuery = "";
    let dataQuery = "";
    const params = [];
    const countParams = [];

    // Determine which table to query based on status
    if (status && status !== "all") {
      let statusTable = "";
      let resiIdColumn = "";

      switch (status) {
        case "picker":
          statusTable = "log_proses_picker";
          resiIdColumn = "resi_id_picker";
          break;
        case "packing":
          statusTable = "log_proses_packing";
          resiIdColumn = "resi_id_packing";
          break;
        case "pickout":
          statusTable = "log_proses_pickout";
          resiIdColumn = "resi_id_pickout";
          break;
        case "cancelled":
          statusTable = "log_proses_cancelled";
          resiIdColumn = "resi_id_cancelled";
          break;
        case "konfirmasi":
          statusTable = "log_proses_validated";
          resiIdColumn = "resi_id_validated";
          break;
        default:
          statusTable = "log_proses_picker";
          resiIdColumn = "resi_id_picker";
      }

      // Start with base query without WHERE 1=1
      countQuery = `
        SELECT COUNT(DISTINCT ${statusTable}.${resiIdColumn}) as total
        FROM ${statusTable}
        LEFT JOIN pekerja ON ${statusTable}.id_pekerja = pekerja.id_pekerja
      `;

      dataQuery = `
        SELECT 
          ${statusTable}.${resiIdColumn} as resi_id,
          ${statusTable}.id_pekerja,
          ${statusTable}.status_proses,
          ${statusTable}.created_at,
          pekerja.nama_pekerja
        FROM ${statusTable}
        LEFT JOIN pekerja ON ${statusTable}.id_pekerja = pekerja.id_pekerja
      `;

      // Create conditions array to collect WHERE clauses
      const conditions = [];
      const countConditions = [];

      // Add search conditions if present
      if (search) {
        conditions.push(`(${statusTable}.${resiIdColumn} = ? COLLATE utf8mb4_general_ci OR pekerja.nama_pekerja = ? COLLATE utf8mb4_general_ci)`);
        countConditions.push(`(${statusTable}.${resiIdColumn} = ? COLLATE utf8mb4_general_ci OR pekerja.nama_pekerja = ? COLLATE utf8mb4_general_ci)`);
        params.push(search, search);
        countParams.push(search, search);
      }

      // Add date filter if present
      if (startDate && endDate) {
        conditions.push(`DATE(created_at) BETWEEN ? AND ?`);
        countConditions.push(`DATE(created_at) BETWEEN ? AND ?`);
        params.push(startDate, endDate);
        countParams.push(startDate, endDate);
      }

      // Add WHERE clause only if conditions exist
      if (conditions.length > 0) {
        dataQuery += ` WHERE ${conditions.join(" AND ")}`;
      }

      if (countConditions.length > 0) {
        countQuery += ` WHERE ${countConditions.join(" AND ")}`;
      }
    } else {
      // If no specific status, union all tables
      countQuery = `
        SELECT COUNT(*) as total FROM (
          SELECT resi_id_picker as resi_id FROM log_proses_picker
          UNION ALL
          SELECT resi_id_packing as resi_id FROM log_proses_packing
          UNION ALL
          SELECT resi_id_pickout as resi_id FROM log_proses_pickout
          UNION ALL
          SELECT resi_id_cancelled as resi_id FROM log_proses_cancelled
          UNION ALL
          SELECT resi_id_validated as resi_id FROM log_proses_validated
        ) as combined_logs
      `;

      // Build each UNION subquery with proper conditions
      const buildSubquery = (tableName, idColumn) => {
        const conditions = [];
        if (search) {
          conditions.push(`(${idColumn} = ? COLLATE utf8mb4_general_ci OR (SELECT nama_pekerja FROM pekerja WHERE pekerja.id_pekerja = ${tableName}.id_pekerja) = ? COLLATE utf8mb4_general_ci)`);
          params.push(search, search);
        }

        if (startDate && endDate) {
          conditions.push(`DATE(created_at) BETWEEN ? AND ?`);
          params.push(startDate, endDate);
        }

        return `
          (SELECT 
            ${idColumn} as resi_id,
            id_pekerja,
            status_proses,
            created_at,
            (SELECT nama_pekerja FROM pekerja WHERE pekerja.id_pekerja = ${tableName}.id_pekerja) as nama_pekerja
           FROM ${tableName}
           ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
          )
        `;
      };

      // Create UNION query with proper conditions for each table
      dataQuery = [
        buildSubquery("log_proses_picker", "resi_id_picker"),
        buildSubquery("log_proses_packing", "resi_id_packing"),
        buildSubquery("log_proses_pickout", "resi_id_pickout"),
        buildSubquery("log_proses_cancelled", "resi_id_cancelled"),
        buildSubquery("log_proses_validated", "resi_id_validated"),
      ].join(" UNION ALL ");
    }

    // Add order by and limit for data query
    if (status && status !== "all") {
      dataQuery += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    } else {
      // For UNION queries, wrap in a subquery to apply order and limit
      dataQuery = `SELECT * FROM (${dataQuery}) AS combined_data ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    // Expedition count query for pickout status - Use array for conditions
    let expeditionCountQuery = `
      SELECT 
        ekpedisi.nama_ekspedisi,
        COUNT(DISTINCT barang.resi_id) AS total_resi
      FROM barang
      JOIN ekpedisi ON barang.id_ekspedisi = ekpedisi.id_ekspedisi
      JOIN log_proses_pickout ON barang.resi_id = log_proses_pickout.resi_id_pickout
    `;

    let expeditionParams = [];
    const expeditionConditions = [];

    if (startDate && endDate) {
      expeditionConditions.push(`DATE(log_proses_pickout.created_at) BETWEEN ? AND ?`);
      expeditionParams.push(startDate, endDate);
    }

    if (expeditionConditions.length > 0) {
      expeditionCountQuery += ` WHERE ${expeditionConditions.join(" AND ")}`;
    }

    expeditionCountQuery += ` GROUP BY ekpedisi.nama_ekspedisi`;

    const [rows] = await mysqlPool.query(dataQuery, params);
    const [countResult] = await mysqlPool.query(countQuery, countParams);

    // Get expedition counts
    let expeditionCounts;
    try {
      [expeditionCounts] = await mysqlPool.query(expeditionCountQuery, expeditionParams);
    } catch (error) {
      console.error("Error fetching expedition counts:", error);
      expeditionCounts = [];
    }

    // Get counts for different statuses - Build condition parts separately
    const getStatusDateCondition = (startDate, endDate) => {
      return startDate && endDate ? `WHERE DATE(created_at) BETWEEN '${startDate}' AND '${endDate}'` : "";
    };

    const statusCountsQuery = `
      SELECT 'picker' as status_proses, COUNT(*) as count FROM log_proses_picker
      ${getStatusDateCondition(startDate, endDate)}
      UNION ALL
      SELECT 'packing' as status_proses, COUNT(*) as count FROM log_proses_packing
      ${getStatusDateCondition(startDate, endDate)}
      UNION ALL
      SELECT 'pickout' as status_proses, COUNT(*) as count FROM log_proses_pickout
      ${getStatusDateCondition(startDate, endDate)}
      UNION ALL
      SELECT 'cancelled' as status_proses, COUNT(*) as count FROM log_proses_cancelled
      ${getStatusDateCondition(startDate, endDate)}
      UNION ALL
      SELECT 'konfirmasi' as status_proses, COUNT(*) as count FROM log_proses_validated
      ${getStatusDateCondition(startDate, endDate)}
    `;

    const [statusCounts] = await mysqlPool.query(statusCountsQuery);

    // Calculate pagination info
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    return res.status(200).json({
      success: true,
      message: "Data berhasil ditemukan!",
      data: rows,
      todayCount: todayCount[0].today_count,
      countEkspedisiToday: expeditionCounts.map((item) => ({
        nama_ekpedisi: item.nama_ekspedisi,
        total_resi: item.total_resi,
      })),
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item.status_proses] = item.count;
        return acc;
      }, {}),
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
    const { status, search } = req.query;
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

    if (search) {
      query += ` AND (log_proses.resi_id = ? COLLATE utf8mb4_general_ci OR pekerja.nama_pekerja = ? COLLATE utf8mb4_general_ci)`;
      params.push(search, search);
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
