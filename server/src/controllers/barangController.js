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

    await connection.query(
      `
      DELETE FROM log_proses
      WHERE resi_id = ? AND status_proses != 'cancelled'
      `,
      [resi_id]
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

const createExcelTemplate = async (req, res) => {
  try {
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template Import Resi");

    // Add title and info
    worksheet.mergeCells("A1:D1");
    worksheet.getCell("A1").value = "TEMPLATE IMPORT DATA RESI";
    worksheet.getCell("A1").font = { bold: true, size: 14 };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    // Add instruction
    worksheet.mergeCells("A3:D3");
    worksheet.getCell("A3").value = "Petunjuk Pengisian:";
    worksheet.getCell("A3").font = { bold: true };

    worksheet.mergeCells("A4:D4");
    worksheet.getCell("A4").value = "1. Nomor Resi wajib diisi dan tidak boleh duplikat";

    worksheet.mergeCells("A5:D5");
    worksheet.getCell("A5").value = "2. Format Tanggal & Waktu: YYYY-MM-DD HH:mm:ss (contoh: 2024-01-30 14:30:00)";

    worksheet.mergeCells("A6:D6");
    worksheet.getCell("A6").value = "3. Jika waktu dikosongkan, akan menggunakan waktu saat ini";

    // Add headers at row 8
    worksheet.getRow(8).values = ["Nomor Resi", "Tanggal & Waktu"];
    worksheet.getRow(8).font = { bold: true };
    worksheet.getRow(8).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Set column widths
    worksheet.getColumn(1).width = 25;
    worksheet.getColumn(2).width = 30;

    // Add borders to header
    worksheet.getRow(8).eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Add example row
    const exampleRow = worksheet.getRow(9);
    exampleRow.values = ["123456789", moment().format("YYYY-MM-DD HH:mm:ss")];
    exampleRow.font = { italic: true, color: { argb: "FF808080" } };

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=template_import_resi.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Template creation error:", error);
    res.status(500).send({
      success: false,
      message: "Error creating template",
      error: error.message,
    });
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

    // Validate file type
    const allowedTypes = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).send({
        success: false,
        message: "Invalid file type. Please upload an Excel file (.xlsx)",
      });
    }

    const workbook = new excelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.getWorksheet(1);

    // Validate template format
    const titleCell = worksheet.getCell("A1").value;
    if (titleCell !== "TEMPLATE IMPORT DATA RESI") {
      return res.status(400).send({
        success: false,
        message: "Invalid template format. Please use the provided template.",
      });
    }

    const connection = await mysqlPool.getConnection();
    const results = {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: [],
      problemRows: [],
    };

    try {
      await connection.beginTransaction();
      const batchSize = 100;
      let batch = [];
      let totalRows = 0;

      // Start reading from row 10 (after headers and example)
      for (let rowNumber = 10; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const resi_id = row.getCell(1).value?.toString().trim();
        let dateTime = row.getCell(2).value;

        // Skip empty rows
        if (!resi_id) continue;
        totalRows++;

        // Validate resi_id format
        if (!/^[A-Za-z0-9-]+$/.test(resi_id)) {
          results.failed++;
          results.problemRows.push({
            row: rowNumber,
            resi: resi_id,
            reason: "Invalid resi format (only alphanumeric and hyphen allowed)",
          });
          continue;
        }

        // Validate and format datetime
        let created_at;
        if (dateTime instanceof Date) {
          created_at = moment(dateTime).format("YYYY-MM-DD HH:mm:ss");
        } else if (typeof dateTime === "string") {
          const parsedDate = moment(dateTime, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY-MM-DD", "DD-MM-YYYY HH:mm:ss", "DD/MM/YYYY HH:mm:ss"], true);

          if (!parsedDate.isValid()) {
            results.failed++;
            results.problemRows.push({
              row: rowNumber,
              resi: resi_id,
              reason: "Invalid date format",
            });
            continue;
          }
          created_at = parsedDate.format("YYYY-MM-DD HH:mm:ss");
        } else {
          created_at = moment().format("YYYY-MM-DD HH:mm:ss");
        }

        // Check for duplicate in current batch
        if (batch.some((item) => item.resi_id === resi_id)) {
          results.duplicates++;
          results.problemRows.push({
            row: rowNumber,
            resi: resi_id,
            reason: "Duplicate entry in import file",
          });
          continue;
        }

        batch.push({ resi_id, created_at });

        // Process batch
        if (batch.length === batchSize || rowNumber === worksheet.rowCount) {
          try {
            const resiIds = batch.map((item) => item.resi_id);
            const [existingResis] = await connection.query("SELECT resi_id FROM barang WHERE resi_id IN (?)", [resiIds]);

            const existingResiSet = new Set(existingResis.map((row) => row.resi_id));
            const newRecords = batch.filter((item) => !existingResiSet.has(item.resi_id));

            // Track existing resis as duplicates
            batch.forEach((item) => {
              if (existingResiSet.has(item.resi_id)) {
                results.duplicates++;
                results.problemRows.push({
                  resi: item.resi_id,
                  reason: "Resi already exists in database",
                });
              }
            });

            if (newRecords.length > 0) {
              await connection.query("INSERT INTO barang (resi_id, created_at) VALUES ?", [newRecords.map((item) => [item.resi_id, item.created_at])]);
              results.success += newRecords.length;
            }
          } catch (error) {
            console.error(`Batch insert error:`, error);
            results.failed += batch.length;
            results.errors.push(`Error processing batch: ${error.message}`);
          }

          batch = [];
        }
      }

      await connection.commit();

      // Clean up uploaded file
      const fs = require("fs");
      fs.unlinkSync(req.file.path);

      const response = {
        success: results.success > 0,
        message: `Import completed with ${results.success} successful imports`,
        results: {
          totalProcessed: totalRows,
          successful: results.success,
          duplicates: results.duplicates,
          failed: results.failed,
          errors: results.errors,
          problemRows: results.problemRows,
        },
      };

      // Determine appropriate status code
      const statusCode = results.success > 0 ? 200 : 400;
      res.status(statusCode).send(response);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Import error:", error);
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

const deleteResi = async (req, res) => {
  const connection = await mysqlPool.getConnection();

  try {
    await connection.beginTransaction();

    const { resi_id } = req.params;

    // First check if resi exists
    const [existingResi] = await connection.query("SELECT resi_id FROM barang WHERE resi_id = ?", [resi_id]);

    if (existingResi.length === 0) {
      await connection.rollback();
      return res.status(404).send({
        success: false,
        message: "Resi not found",
      });
    }

    // Delete related records first (foreign key constraints)
    await connection.query("DELETE FROM log_proses WHERE resi_id = ?", [resi_id]);
    await connection.query("DELETE FROM proses WHERE resi_id = ?", [resi_id]);

    await connection.commit();

    res.status(200).send({
      success: true,
      message: "Resi successfully deleted",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Delete resi error:", error);
    res.status(500).send({
      success: false,
      message: "Error when trying to delete resi",
      error: error.message,
    });
  } finally {
    connection.release();
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
  createExcelTemplate,
  deleteResi,
};
