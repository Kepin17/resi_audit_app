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
        message: "All fields are required",
      });
    }

    // Check if resi_id already exists in 'barang'
    const [existingBarang] = await mysqlPool.query("SELECT * FROM barang WHERE resi_id = ?", [resi_id]);
    if (existingBarang.length > 0) {
      return res.status(400).send({
        success: false,
        message: "Resi already exists",
      });
    }

    const [allowedResiCodes] = await mysqlPool.query("SELECT id_resi FROM kode_resi");

    const validResiList = allowedResiCodes.map((row) => row.id_resi);

    const resiCode = resi_id.substring(0, 2);
    const numberOnlyRegex = /^\d+$/;

    const isValidExpedition = validResiList.includes(resiCode);
    const isValidNumber = numberOnlyRegex.test(resi_id);

    if (!isValidExpedition && !isValidNumber) {
      return res.status(400).send({
        success: false,
        message: "Format resi tidak valid. Gunakan format ekspedisi (Cth: CM1234567) atau nomor saja",
      });
    }

    if (resi_id.length < 8) {
      return res.status(400).send({
        success: false,
        message: "Resi ID must be at least 8 characters long",
      });
    }

    // Get expedition ID from kode_resi
    let ekspedisiId = null;
    const [resiData] = await mysqlPool.query("SELECT id_ekspedisi FROM kode_resi WHERE id_resi = ? OR id_resi = ?", [resiCode, resi_id]);

    if (resiData.length === 0) {
      ekspedisiId = "JCG";
    } else {
      ekspedisiId = resiData[0].id_ekspedisi;
    }

    // Insert new barang entry
    await mysqlPool.query("INSERT INTO barang (resi_id, id_ekspedisi) VALUES (?, ?)", [resi_id, ekspedisiId]);

    res.status(200).send({
      success: true,
      message: "New barang added",
    });
  } catch (error) {
    console.error(error);
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
    const { search, status, startDate, endDate, sortBy, ekspedisi } = req.query;

    // Build the WHERE clause dynamically
    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push("(b.resi_id LIKE ?)");
      queryParams.push(`%${search}%`);
    }

    // Fix ekspedisi filter
    if (ekspedisi && ekspedisi !== "Semua") {
      whereConditions.push("e.id_ekspedisi = ?");
      queryParams.push(ekspedisi);
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

    // Update the count query to include ekspedisi join
    const [countResult] = await mysqlPool.query(
      `SELECT COUNT(DISTINCT b.resi_id) as count 
       FROM barang b
       LEFT JOIN ekpedisi e ON b.id_ekspedisi = e.id_ekspedisi
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
        orderClause = "ORDER BY COALESCE(latest_process.last_scan, b.updated_at) DESC";
        break;
      default:
        orderClause = "ORDER BY b.created_at DESC";
    }

    const [rows] = await mysqlPool.query(
      `SELECT 
        b.resi_id,
        b.created_at,
        b.updated_at,
        b.id_ekspedisi,
        e.nama_ekspedisi,
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
       LEFT JOIN ekpedisi e ON b.id_ekspedisi = e.id_ekspedisi
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

    const [barangKeseluruhan] = await mysqlPool.query(
      `SELECT 
        b.resi_id,
        b.created_at,
        b.updated_at,
        b.id_ekspedisi,
        e.nama_ekspedisi,
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
       LEFT JOIN ekpedisi e ON b.id_ekspedisi = e.id_ekspedisi
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
    `,
      [...queryParams, offset, limit]
    );

    const [getDataPending] = await mysqlPool.query(
      `SELECT COUNT(DISTINCT b.resi_id) as count
      FROM proses b
      WHERE b.status_proses = 'pending'`
    );

    return res.status(200).json({
      success: true,
      message: "Data found",
      data: rows,
      totalPesanan: barangKeseluruhan.length,
      countPending: getDataPending[0].count,
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

    // Support for multiple resi_ids
    const resiIds = Array.isArray(resi_id) ? resi_id : [resi_id];

    // Check if resis exist and get current status
    const [existingResis] = await connection.query("SELECT resi_id, status_proses FROM proses WHERE resi_id IN (?) ORDER BY updated_at DESC", [resiIds]);

    const notFoundResis = resiIds.filter((id) => !existingResis.some((resi) => resi.resi_id === id));

    if (notFoundResis.length > 0) {
      return res.status(404).send({
        success: false,
        message: `Resi not found: ${notFoundResis.join(", ")}`,
      });
    }

    // Check if any are already cancelled
    const alreadyCancelled = existingResis.filter((resi) => resi.status_proses === "cancelled");
    if (alreadyCancelled.length > 0) {
      return res.status(400).send({
        success: false,
        message: `Some resis are already cancelled: ${alreadyCancelled.map((r) => r.resi_id).join(", ")}`,
      });
    }

    // Updated query to handle multiple resis
    for (const resiId of resiIds) {
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
        [req.user.id_pekerja, resiId, resiId]
      );

      await connection.query(
        `DELETE FROM log_proses
         WHERE resi_id = ? AND status_proses != 'cancelled'`,
        [resiId]
      );
    }

    await connection.commit();

    res.status(200).send({
      success: true,
      message: `${resiIds.length} resi(s) have been cancelled`,
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

    worksheet.mergeCells("A7:D7");
    worksheet.getCell("A7").value = "4. Perhatikan contoh baris data yang sudah disediakan";
    worksheet.getCell("A7").font = { italic: true, color: { argb: "fc1303" } };

    // Add headers at row 8
    worksheet.getRow(9).values = ["ID Resi", "Tanggal & Waktu"];
    worksheet.getRow(9).font = { bold: true };
    worksheet.getCell("A9").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };
    worksheet.getCell("B9").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Set column widths
    worksheet.getColumn(1).width = 25;
    worksheet.getColumn(2).width = 30;

    // Add borders to header
    worksheet.getRow(9).eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Add example row
    const exampleRow = worksheet.getRow(10);
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
  const connection = await mysqlPool.getConnection();
  let processedFile = null;

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

    processedFile = req.file.path;
    const workbook = new excelJS.Workbook();
    await workbook.xlsx.readFile(processedFile);
    const worksheet = workbook.getWorksheet(1);

    // Validate template format
    const titleCell = worksheet.getCell("A1").value;
    if (titleCell !== "TEMPLATE IMPORT DATA RESI") {
      return res.status(400).send({
        success: false,
        message: "Invalid template format. Please use the provided template.",
      });
    }

    // Pre-process and validate all rows first
    const validRecords = [];
    const problemRecords = []; // New array to track problem records
    const results = {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: new Set(),
      problemRows: [],
      invalidFormat: 0,
      duplicatesInFile: 0,
    };

    const processedResis = new Set();
    const duplicatesInFile = new Set();
    const [allowedResiCodes] = await mysqlPool.query("SELECT id_resi FROM kode_resi");
    const validResiList = allowedResiCodes.map((row) => row.id_resi);

    // First pass: Validate all rows and collect valid records
    for (let rowNumber = 10; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const resi_id = row.getCell(1).value?.toString().trim();
      if (!resi_id) continue;

      // Check for duplicates within the import file
      if (processedResis.has(resi_id)) {
        results.duplicatesInFile++;
        duplicatesInFile.add(resi_id);
        problemRecords.push({
          resi_id,
          status: "duplikat",
          reason: "Duplicate entry in import file",
          source: "file",
        });
        continue;
      }

      const resiCode = resi_id.substring(0, 2);
      const isValidExpedition = validResiList.includes(resiCode);

      const [getEkspedisi] = await connection.query("SELECT id_ekspedisi FROM kode_resi WHERE id_resi = ? OR id_resi = ?", [resiCode, resi_id]);
      const ekspedisi = validResiList.includes(resiCode) ? getEkspedisi[0].id_ekspedisi : "JCG";
      const numberOnly = /^\d+$/;
      const isValidNumber = numberOnly.test(resi_id);

      const validationError = validateResiEntry(resi_id, processedResis, isValidExpedition, isValidNumber, rowNumber);

      if (validationError) {
        results[validationError.type]++;
        results.problemRows.push(validationError.problem);

        // Add all validation errors to problemRecords for logging
        if (validationError.type === "duplicates") {
          problemRecords.push({
            resi_id,
            status: "duplikat",
            reason: validationError.problem.reason,
            source: "file",
          });
        } else if (validationError.type === "invalidFormat") {
          problemRecords.push({
            resi_id,
            status: "failed",
            reason: "Invalid resi format. Use expedition code (e.g., CM1234567) or numbers only",
            source: "file",
          });
        } else if (validationError.type === "failed") {
          problemRecords.push({
            resi_id,
            status: "failed",
            reason: validationError.problem.reason,
            source: "file",
          });
        }
        continue;
      }

      let created_at = moment().format("YYYY-MM-DD HH:mm:ss");
      const dateTime = row.getCell(2).value;
      if (dateTime) {
        const parsedDate = moment(dateTime, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY-MM-DD", "DD-MM-YYYY HH:mm:ss", "DD/MM/YYYY HH:mm:ss"], true);

        if (!parsedDate.isValid()) {
          results.failed++;
          const invalidDateProblem = {
            row: rowNumber,
            resi: resi_id,
            reason: "Invalid date format",
          };
          results.problemRows.push(invalidDateProblem);

          // Add date format issues to problemRecords
          problemRecords.push({
            resi_id,
            status: "failed",
            reason: "Invalid date format",
            source: "file",
          });

          continue;
        }
        created_at = parsedDate.format("YYYY-MM-DD HH:mm:ss");
      }

      processedResis.add(resi_id);
      validRecords.push({ resi_id, created_at, ekspedisi });
    }

    if (validRecords.length === 0) {
      return res.status(400).send({
        success: false,
        message: "No valid records found to import",
      });
    }

    // Start transaction and process in optimized batches
    await connection.beginTransaction();

    const BATCH_SIZE = 1000; // Increased batch size for better performance
    for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
      const batch = validRecords.slice(i, i + BATCH_SIZE);
      const resiIds = batch.map((record) => record.resi_id);

      // Check existing records in current batch
      const [existingResis] = await connection.query("SELECT resi_id FROM barang WHERE resi_id IN (?)", [resiIds]);

      const existingResiSet = new Set(existingResis.map((row) => row.resi_id));
      const newRecords = batch.filter((record) => !existingResiSet.has(record.resi_id));

      // Track duplicates with details
      const duplicateRecords = batch.filter((record) => existingResiSet.has(record.resi_id));
      duplicateRecords.forEach((record) => {
        if (!duplicatesInFile.has(record.resi_id)) {
          // Only if not already marked as duplicate in file
          problemRecords.push({
            resi_id: record.resi_id,
            status: "duplikat",
            reason: "Resi already exists in database",
            source: "database",
          });
        }
      });

      if (newRecords.length > 0) {
        await connection.query("INSERT INTO barang (resi_id, created_at, id_ekspedisi) VALUES ?", [newRecords.map((record) => [record.resi_id, record.created_at, record.ekspedisi])]);

        results.success += newRecords.length;
      }

      results.duplicates += existingResis.length;
    }

    // Insert import logs for all processed records
    if (problemRecords.length > 0) {
      const importLogValues = problemRecords.map((record) => [record.resi_id, record.reason, record.status, moment().format("YYYY-MM-DD HH:mm:ss")]);

      await connection.query("INSERT INTO log_import (resi_id, reason, status, created_at) VALUES ?", [importLogValues]);
    }

    await connection.commit();

    // Update problemRows in results
    results.problemRows = problemRecords.map((record) => ({
      resi: record.resi_id,
      status: record.status,
      reason: record.reason,
    }));

    const response = {
      success: results.success > 0,
      message: `Import completed with ${results.success} successful imports`,
      results: {
        totalProcessed: processedResis.size,
        successful: results.success,
        duplicates: results.duplicates,
        duplicatesInFile: results.duplicatesInFile,
        failed: results.failed,
        invalidFormat: results.invalidFormat,
        errors: Array.from(results.errors),
        problemRows: results.problemRows,
      },
    };

    return res.status(results.success > 0 ? 200 : 400).send(response);
  } catch (error) {
    await connection.rollback();
    console.error("Import error:", error);
    return res.status(500).send({
      success: false,
      message: "Error importing data",
      error: error.message,
    });
  } finally {
    connection.release();
    // Clean up uploaded file
    if (processedFile) {
      require("fs").unlink(processedFile, (err) => {
        if (err) console.error("Error deleting temporary file:", err);
      });
    }
  }
};

function validateResiEntry(resi_id, processedResis, isValidExpedition, isValidNumber, rowNumber) {
  if (!resi_id) {
    return {
      type: "failed",
      problem: {
        row: rowNumber,
        resi: resi_id,
        status: "failed",
        reason: "Empty resi ID",
      },
    };
  }

  if (resi_id.length < 8) {
    return {
      type: "failed",
      problem: {
        row: rowNumber,
        resi: resi_id,
        status: "failed",
        reason: "Resi ID must be at least 8 characters long",
      },
    };
  }

  if (processedResis.has(resi_id)) {
    return {
      type: "duplicates",
      problem: {
        row: rowNumber,
        resi: resi_id,
        status: "duplikat",
        reason: "Duplicate entry in import file",
      },
    };
  }

  if (!isValidExpedition && !isValidNumber) {
    return {
      type: "invalidFormat",
      problem: {
        row: rowNumber,
        resi: resi_id,
        status: "failed",
        reason: "Invalid resi format",
      },
    };
  }

  return null;
}

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

    // Support for multiple resi_ids
    const resiIds = Array.isArray(resi_id) ? resi_id : [resi_id];

    // First check if resis exist
    const [existingResis] = await connection.query("SELECT resi_id FROM barang WHERE resi_id IN (?)", [resiIds]);

    const notFoundResis = resiIds.filter((id) => !existingResis.some((resi) => resi.resi_id === id));

    if (notFoundResis.length > 0) {
      await connection.rollback();
      return res.status(404).send({
        success: false,
        message: `Some resis not found: ${notFoundResis.join(", ")}`,
      });
    }

    // Delete related records for all resis
    await connection.query("DELETE FROM log_proses WHERE resi_id IN (?)", [resiIds]);

    await connection.query("DELETE FROM proses WHERE resi_id IN (?)", [resiIds]);

    // Finally delete the barang records
    await connection.query("DELETE FROM barang WHERE resi_id IN (?)", [resiIds]);

    await connection.commit();

    res.status(200).send({
      success: true,
      message: `${resiIds.length} resi(s) successfully deleted`,
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

const getCalendarData = async (req, res) => {
  try {
    const { search, status, ekspedisi } = req.query;

    // Build WHERE conditions
    let whereConditions = ["(latest_process.status_proses IN ('pending', 'picker', 'packing') OR latest_process.status_proses IS NULL)", "b.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 90 DAY)"];
    let queryParams = [];

    if (search) {
      whereConditions.push("(b.resi_id LIKE ?)");
      queryParams.push(`%${search}%`);
    }

    if (status && status !== "Semua") {
      whereConditions.push("latest_process.status_proses = ?");
      queryParams.push(status.toLowerCase());
    }

    if (ekspedisi && ekspedisi !== "Semua") {
      whereConditions.push("b.id_ekspedisi = ?");
      queryParams.push(ekspedisi);
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    const [rows] = await mysqlPool.query(
      `
      SELECT DISTINCT
        DATE(b.created_at) as date,
        COALESCE(latest_process.status_proses, 'pending') as status_proses,
        COUNT(b.resi_id) as count
      FROM barang b
      LEFT JOIN (
        SELECT p1.resi_id, 
               p1.status_proses
        FROM proses p1
        WHERE p1.id_proses = (
          SELECT p2.id_proses 
          FROM proses p2 
          WHERE p2.resi_id = p1.resi_id 
          ORDER BY p2.updated_at DESC 
          LIMIT 1
        )
      ) latest_process ON b.resi_id = latest_process.resi_id
      ${whereClause}
      GROUP BY DATE(b.created_at), status_proses
      ORDER BY date DESC
    `,
      queryParams
    );

    const formattedData = rows.reduce((acc, curr) => {
      const date = moment(curr.date).format("YYYY-MM-DD");
      if (!acc[date]) {
        acc[date] = {
          statuses: new Set(),
          counts: {},
        };
      }
      acc[date].statuses.add(curr.status_proses);
      acc[date].counts[curr.status_proses] = curr.count;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      message: rows.length > 0 ? "Data found" : "No data available",
      data: Object.entries(formattedData).map(([date, data]) => ({
        date,
        statuses: Array.from(data.statuses),
        counts: data.counts,
      })),
    });
  } catch (error) {
    console.error("Calendar data error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching calendar data",
      error: error.message,
    });
  }
};

const getImportLog = async (req, res) => {
  try {
    const connection = await mysqlPool.getConnection();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { startDate, endDate } = req.query;

    let whereClause = "";
    let queryParams = [];

    if (startDate && endDate) {
      whereClause = "WHERE created_at BETWEEN ? AND ?";
      queryParams = [startDate, endDate];
    }

    // Get total count of distinct import times
    const [countResult] = await connection.query(
      `SELECT COUNT(DISTINCT created_at) as total 
       FROM log_import ${whereClause}`,
      queryParams
    );

    // Get data grouped by exact import time
    const [rows] = await connection.query(
      `SELECT 
        created_at,
        COUNT(*) as total_entries,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'duplikat' THEN 1 ELSE 0 END) as duplicate_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
      FROM log_import
      ${whereClause}
      GROUP BY created_at
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    connection.release();

    res.status(200).json({
      success: true,
      message: rows.length > 0 ? "Data found" : "No data available",
      data: rows,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Import log error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching import log",
      error: error.message,
    });
  }
};

const exportLogImportToExcel = async (req, res) => {
  try {
    const { imporDate } = req.query;
    let whereClause = "";
    let queryParams = [];

    if (imporDate) {
      whereClause = "WHERE created_at BETWEEN ? AND ?";
      queryParams = [imporDate + " 00:00:00", imporDate + " 23:59:59"];
    }

    // Get all log data
    const [rows] = await mysqlPool.query(
      `SELECT resi_id, status, reason, created_at 
       FROM log_import 
       ${whereClause}
       ORDER BY created_at DESC`,
      queryParams
    );

    if (rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No data to export",
      });
    }

    // Group data by status
    const groupedData = {
      success: rows.filter((row) => row.status === "success"),
      duplicate: rows.filter((row) => row.status === "duplikat"),
      failed: rows.filter((row) => row.status === "failed"),
    };

    const workbook = new excelJS.Workbook();

    // Create worksheets for each status
    Object.entries(groupedData).forEach(([status, data]) => {
      if (data.length > 0) {
        const worksheet = workbook.addWorksheet(status.charAt(0).toUpperCase() + status.slice(1));

        worksheet.columns = [
          { header: "Nomor Resi", key: "resi_id", width: 20 },
          { header: "Status", key: "status", width: 15 },
          { header: "Keterangan", key: "reason", width: 40 },
          { header: "Tanggal Import", key: "created_at", width: 25 },
        ];

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };

        // Add data
        data.forEach((row) => {
          worksheet.addRow({
            ...row,
            created_at: moment(row.created_at).format("YYYY-MM-DD HH:mm:ss"),
          });
        });

        // Auto-fit columns
        worksheet.columns.forEach((column) => {
          column.alignment = { vertical: "middle", horizontal: "left" };
        });
      }
    });

    // Add summary worksheet
    const summarySheet = workbook.addWorksheet("Summary", { properties: { tabColor: { argb: "FFC0C0C0" } } });
    summarySheet.columns = [
      { header: "Status", key: "status", width: 20 },
      { header: "Total", key: "total", width: 15 },
    ];

    summarySheet.addRows([
      { status: "Success", total: groupedData.success.length },
      { status: "Duplicate", total: groupedData.duplicate.length },
      { status: "Failed", total: groupedData.failed.length },
      { status: "Total", total: rows.length },
    ]);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=import_log_${moment().format("YYYY-MM-DD_HH-mm")}.xlsx`);

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
  createExcelTemplate,
  deleteResi,
  getCalendarData,
  getImportLog,
  exportLogImportToExcel,
};
