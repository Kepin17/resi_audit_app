const mysqlPool = require("../config/db");
const excelJS = require("exceljs");
const moment = require("moment");

const addRetur = async (req, res) => {
  try {
    const { resi_id, note } = req.body;

    // Validate required fields
    if (!resi_id) {
      return res.status(400).send({
        success: false,
        message: "all field are required",
      });
    }

    const [rows] = await mysqlPool.query("SELECT * FROM barang_retur WHERE resi_id = ?", [resi_id]);

    const [allowedResiCodes] = await mysqlPool.query("SELECT id_resi FROM kode_resi");
    const validResiList = allowedResiCodes.map((row) => row.id_resi);

    const resiCode = resi_id.substring(0, 2);
    const numberOnly = /^\d+$/;

    const isValidExpedition = validResiList.includes(resiCode);
    const isValidNumber = numberOnly.test(resi_id);

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

    let ekspedisiId = null;
    const [resiData] = await mysqlPool.query("SELECT id_ekspedisi FROM kode_resi WHERE id_resi = ? OR id_resi = ?", [resiCode, resi_id]);

    if (resiData.length === 0) {
      ekspedisiId = "JCG";
    } else {
      ekspedisiId = resiData[0].id_ekspedisi;
    }

    if (rows.length === 0) {
      await mysqlPool.query("INSERT INTO barang_retur (resi_id, id_ekspedisi, note) VALUES (?, ?, ?)", [resi_id, ekspedisiId, note]);
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
    console.error("Error in addRetur:", error);

    // Handle specific database errors
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).send({
        success: false,
        message: "Duplicate resi ID detected",
        error: error.message,
      });
    }

    // Handle connection errors
    if (error.code === "ECONNREFUSED") {
      return res.status(503).send({
        success: false,
        message: "Database connection failed",
        error: error.message,
      });
    }

    // Handle query errors
    if (error.code === "ER_BAD_FIELD_ERROR") {
      return res.status(400).send({
        success: false,
        message: "Invalid database query",
        error: error.message,
      });
    }

    // Default error response
    res.status(500).send({
      success: false,
      message: "Internal server error while adding new retur",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

const showAllBarangRetur = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    const { search, status, startDate, endDate, ekspedisi } = req.query;

    let whereConditions = [];
    let queryParams = [];
    let baseQuery = `
      FROM barang_retur b
      LEFT JOIN ekpedisi e ON b.id_ekspedisi = e.id_ekspedisi
      LEFT JOIN (
        SELECT p1.resi_id, 
               p1.status_retur,
               p1.gambar_retur,
               p1.updated_at as last_scan,
               pek.nama_pekerja
        FROM proses_barang_retur p1
        LEFT JOIN pekerja pek ON p1.id_pekerja = pek.id_pekerja
        WHERE p1.id_proses = (
          SELECT p2.id_proses 
          FROM proses_barang_retur p2 
          WHERE p2.resi_id = p1.resi_id 
          ORDER BY p2.updated_at DESC 
          LIMIT 1
        )
      ) latest_process ON b.resi_id = latest_process.resi_id
    `;

    // Search filter
    if (search) {
      whereConditions.push("b.resi_id LIKE ?");
      queryParams.push(`%${search}%`);
    }

    // Add ekspedisi filter
    if (ekspedisi && ekspedisi !== "all") {
      whereConditions.push("b.id_ekspedisi = ?");
      queryParams.push(ekspedisi);
    }

    // Status filter
    if (status && status !== "all") {
      if (status === "diproses") {
        whereConditions.push("(latest_process.status_retur IS NULL OR latest_process.status_retur = 'diproses')");
      } else if (status === "diterima") {
        whereConditions.push("latest_process.status_retur = 'diterima'");
      } else if (status === "hilang") {
        whereConditions.push("latest_process.status_retur = 'hilang'");
      }
    }

    // Date range filter
    if (startDate && endDate) {
      whereConditions.push("DATE(b.created_at) BETWEEN ? AND ?");
      queryParams.push(startDate, endDate);
    }

    // Combine WHERE conditions
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // Get total count for pagination
    const [countResult] = await mysqlPool.query(`SELECT COUNT(DISTINCT b.resi_id) as total ${baseQuery} ${whereClause}`, queryParams);

    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    // Get filtered data
    const [rows] = await mysqlPool.query(
      `
     SELECT
    b.resi_id,
    b.id_ekspedisi,
    e.nama_ekspedisi,
    b.note,
    b.created_at,
    b.updated_at,
    COALESCE(latest_process.status_retur, 'diproses') as status_retur,
    latest_process.nama_pekerja,
    latest_process.last_scan,
    latest_process.gambar_retur
    ${baseQuery}
    ${whereClause}
    ORDER BY b.created_at DESC
    LIMIT ?, ?


        `,
      [...queryParams, offset, limit]
    );

    const [total] = await mysqlPool.query(
      `
     SELECT
    b.resi_id,
    b.id_ekspedisi,
    e.nama_ekspedisi,
    b.note,
    b.created_at,
    b.updated_at,
    COALESCE(latest_process.status_retur, 'diproses') as status_retur,
    latest_process.nama_pekerja,
    latest_process.last_scan,
    latest_process.gambar_retur
    ${baseQuery}
    ${whereClause}
    ORDER BY b.created_at DESC
      `,
      queryParams
    );

    return res.status(200).json({
      success: true,
      message: "Data found",
      data: rows,
      totalData: total.length,
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

const importRetur = async (req, res) => {
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
    if (titleCell !== "TEMPLATE IMPORT DATA RETUR RESI") {
      return res.status(400).send({
        success: false,
        message: "Invalid template format. Please use the provided template.",
      });
    }

    const validRecords = [];
    const problemRecords = [];
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
    for (let rowNumber = 4; rowNumber <= worksheet.rowCount; rowNumber++) {
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
      const ekspedisi = isValidExpedition && getEkspedisi.length > 0 ? getEkspedisi[0].id_ekspedisi : "JCG";
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
          results.invalidFormat++; // Increment invalid format count
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

    await connection.beginTransaction();

    const allResiIds = validRecords.map((record) => record.resi_id);
    const [allExistingResis] = await connection.query("SELECT resi_id FROM barang_retur WHERE resi_id IN (?)", [allResiIds]);
    const existingResiSet = new Set(allExistingResis.map((row) => row.resi_id));

    for (const record of validRecords) {
      try {
        if (existingResiSet.has(record.resi_id)) {
          problemRecords.push({
            resi_id: record.resi_id,
            status: "duplikat",
            reason: "Resi already exists in database",
            source: "database",
          });
          results.duplicates++;
        } else {
          await connection.query("INSERT INTO barang_retur (resi_id, created_at, id_ekspedisi) VALUES (?, ?, ?)", [record.resi_id, record.created_at, record.ekspedisi]);

          // Track successful imports
          problemRecords.push({
            resi_id: record.resi_id,
            status: "success",
            reason: "Successfully imported",
          });
          results.success++;
        }
      } catch (insertError) {
        if (insertError.code === "ER_DUP_ENTRY") {
          problemRecords.push({
            resi_id: record.resi_id,
            status: "duplikat",
            reason: "Duplicate key error: " + insertError.message,
            source: "database",
          });
          results.duplicates++;
        } else {
          problemRecords.push({
            resi_id: record.resi_id,
            status: "failed",
            reason: insertError.message,
          });
          results.failed++;
          results.errors.add(insertError.message);
        }
      }
    }

    // Make sure all records are logged to log_import_retur, including successful ones
    if (problemRecords.length > 0) {
      const importLogValues = problemRecords.map((record) => [record.resi_id, record.reason, record.status, moment().format("YYYY-MM-DD HH:mm:ss")]);

      const BATCH_SIZE = 500;
      for (let i = 0; i < importLogValues.length; i += BATCH_SIZE) {
        const batch = importLogValues.slice(i, i + BATCH_SIZE);
        await connection.query("INSERT INTO log_import_retur (resi_id, reason, status, created_at) VALUES ?", [batch]);
      }
    }

    await connection.commit();

    results.problemRows = problemRecords.map((record) => ({
      resi: record.resi_id,
      status: record.status,
      reason: record.reason,
    }));

    const response = {
      success: results.success > 0,
      message: `Import completed with ${results.success} successful imports${results.duplicates > 0 ? `, ${results.duplicates} duplicates skipped` : ""}${
        results.invalidFormat > 0 ? `, ${results.invalidFormat} invalid format entries` : ""
      }${results.failed > 0 ? `, ${results.failed} failed entries` : ""}`,
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

const exportRetur = async (req, res) => {
  try {
    const { search, status, startDate, endDate, ekspedisi } = req.query;

    let whereConditions = [];
    let queryParams = [];
    let baseQuery = `
      FROM barang_retur b
      LEFT JOIN ekpedisi e ON b.id_ekspedisi = e.id_ekspedisi
      LEFT JOIN (
        SELECT p1.resi_id, 
               p1.status_retur,
               p1.gambar_retur,
               p1.updated_at as last_scan,
               pek.nama_pekerja
        FROM proses_barang_retur p1
        LEFT JOIN pekerja pek ON p1.id_pekerja = pek.id_pekerja
        WHERE p1.id_proses = (
          SELECT p2.id_proses 
          FROM proses_barang_retur p2 
          WHERE p2.resi_id = p1.resi_id 
          ORDER BY p2.updated_at DESC 
          LIMIT 1
        )
      ) latest_process ON b.resi_id = latest_process.resi_id
    `;

    // Search filter
    if (search) {
      whereConditions.push("b.resi_id LIKE ?");
      queryParams.push(`%${search}%`);
    }

    // Add ekspedisi filter
    if (ekspedisi && ekspedisi !== "all") {
      whereConditions.push("b.id_ekspedisi = ?");
      queryParams.push(ekspedisi);
    }

    // Status filter
    if (status && status !== "all") {
      if (status === "diproses") {
        whereConditions.push("(latest_process.status_retur IS NULL OR latest_process.status_retur = 'diproses')");
      } else if (status === "diterima") {
        whereConditions.push("latest_process.status_retur = 'diterima'");
      } else if (status === "hilang") {
        whereConditions.push("latest_process.status_retur = 'hilang'");
      }
    }

    // Date range filter
    if (startDate && endDate) {
      whereConditions.push("DATE(b.created_at) BETWEEN ? AND ?");
      queryParams.push(startDate, endDate);
    }

    // Combine WHERE conditions
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // Get data for export
    const [rows] = await mysqlPool.query(
      `
      SELECT 
        b.resi_id,
        b.id_ekspedisi,
        e.nama_ekspedisi,
        b.note,
        b.created_at,
        b.updated_at,
        COALESCE(latest_process.status_retur, 'diproses') as status_retur,
        latest_process.nama_pekerja as diterima_oleh
      ${baseQuery}
      ${whereClause}
      ORDER BY b.created_at DESC
    `,
      queryParams
    );

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Retur Data");

    // Add headers
    worksheet.columns = [
      { header: "Resi ID", key: "resi_id", width: 15 },
      { header: "Ekspedisi", key: "nama_ekspedisi", width: 15 },
      { header: "Note", key: "note", width: 30 },
      { header: "Created At", key: "created_at", width: 20 },
      { header: "Updated At", key: "updated_at", width: 20 },
      { header: "Status", key: "status_retur", width: 15 },
      { header: "Diterima Oleh", key: "diterima_oleh", width: 20 },
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    // Add data
    rows.forEach((row) => {
      worksheet.addRow({
        ...row,
        created_at: moment(row.created_at).format("YYYY-MM-DD HH:mm:ss"),
        updated_at: moment(row.updated_at).format("YYYY-MM-DD HH:mm:ss"),
        diterima_oleh: row.diterima_oleh || "-",
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=retur_data_${moment().format("YYYY-MM-DD")}.xlsx`);

    await workbook.xlsx.write(res);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting data",
      error: error.message,
    });
  }
};

const downloadReturTemplate = async (req, res) => {
  try {
    const workbook = new excelJS.Workbook();

    // Create main template worksheet
    const worksheet = workbook.addWorksheet("Template Retur");

    worksheet.getCell("A1").value = "TEMPLATE IMPORT DATA RETUR RESI";
    worksheet.getCell("A1").font = { bold: true, size: 16 };

    worksheet.getRow(3).values = ["Resi ID *", "Created At"];
    worksheet.getColumn("A").width = 25;
    worksheet.getColumn("B").width = 30;
    // Style header row
    const headerRow = worksheet.getRow(3);
    headerRow.font = { bold: true, size: 12 };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2F0D9" },
    };

    // Add instructions sheet
    const instructionSheet = workbook.addWorksheet("Instruksi");
    instructionSheet.columns = [
      { header: "Kolom", key: "column", width: 15 },
      { header: "Keterangan", key: "description", width: 70 },
      { header: "Contoh", key: "example", width: 20 },
    ];

    // Style instruction header
    const instructionHeader = instructionSheet.getRow(1);
    instructionHeader.font = { bold: true, size: 12 };
    instructionHeader.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2F0D9" },
    };

    // Add instructions content
    const instructions = [
      {
        column: "Resi ID *",
        description:
          "Nomor resi wajib diisi dengan ketentuan:\n" +
          "1. Format ekspedisi: 2 huruf kapital + minimal 6 angka (total min. 8 karakter)\n" +
          "2. Format angka: minimal 8 digit\n\n" +
          "Kode ekspedisi yang valid:\n" +
          "• JX, JP = JNT Express\n" +
          "• TG, CM = JNE\n" +
          "• JT = J&T\n" +
          "• GK = Gosend",
        example: "CM1234567\natau\n12345678",
      },

      {
        column: "Created At",
        description: "Tanggal pembuatan retur (opsional)\nFormat: YYYY-MM-DD HH:mm:ss\nJika dikosongkan akan menggunakan waktu saat ini",
        example: "2024-01-20 14:30:00",
      },
    ];

    instructions.forEach((instruction) => {
      const row = instructionSheet.addRow(instruction);
      row.alignment = { wrapText: true, vertical: "top" };
    });

    instructionSheet.getRows(2, instructions.length + 1).forEach((row) => {
      row.height = 100;
    });

    // Add example rows in template
    const examples = [
      {
        resi_id: "CM1234567",
        created_at: moment().format("YYYY-MM-DD HH:mm:ss"),
      },
      {
        resi_id: "JX1234567",
        created_at: moment().subtract(1, "days").format("YYYY-MM-DD HH:mm:ss"),
      },
      {
        resi_id: "12345678",
        created_at: moment().format("YYYY-MM-DD HH:mm:ss"),
      },
    ];

    examples.forEach((example) => {
      const row = worksheet.addRow(example);
      row.font = { italic: true, color: { argb: "FF666666" } };
    });

    // Add warning note
    worksheet.addRow([]); // Empty row
    const noteRow = worksheet.addRow(["Hapus baris contoh di atas sebelum mengisi data"]);
    noteRow.font = { bold: true, color: { argb: "FFFF0000" } };
    noteRow.getCell(1).alignment = { horizontal: "left" };

    // Auto-fit columns in instruction sheet
    instructionSheet.columns.forEach((column) => {
      column.width = column.width || 20;
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=template_retur.xlsx");

    await workbook.xlsx.write(res);
  } catch (error) {
    console.error("Template generation error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating template",
      error: error.message,
    });
  }
};

const scanResiRetur = async (req, res) => {
  try {
    const { id_pekerja } = req.body;
    const { resi_id } = req.params;

    // Validate required fields
    if (!resi_id || !id_pekerja) {
      if (req.file) {
        const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).send({
        success: false,
        message: "resi_id and id_pekerja are required",
      });
    }

    // Get worker data with roles
    const [workerRoles] = await mysqlPool.query(
      `SELECT p.*, b.jenis_pekerja, b.id_bagian
       FROM pekerja p 
       JOIN role_pekerja rp ON p.id_pekerja = rp.id_pekerja
       JOIN bagian b ON rp.id_bagian = b.id_bagian
       WHERE p.id_pekerja = ?`,
      [id_pekerja]
    );

    if (!workerRoles || workerRoles.length === 0) {
      if (req.file) {
        const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).send({
        success: false,
        message: "Worker not found or has no roles",
      });
    }

    // Check if worker has retur_barang role
    const hasReturRole = workerRoles.some((role) => role.jenis_pekerja === "retur_barang");
    if (!hasReturRole) {
      if (req.file) {
        const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).send({
        success: false,
        message: "You don't have permission to scan retur items",
      });
    }

    // Check if resi exists in barang_retur
    const [checkBarangRow] = await mysqlPool.query("SELECT * FROM barang_retur WHERE resi_id = ?", [resi_id]);

    if (checkBarangRow.length === 0) {
      if (req.file) {
        const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).send({
        success: false,
        message: "Resi not found in system",
      });
    }

    // Handle photo upload
    let photoPath = null;
    if (req.file) {
      // Store only the filename, not the full path
      photoPath = req.file.filename;
    }

    // Process the scan with transaction
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      // First check if a record exists
      const [existingRecord] = await connection.query(
        `SELECT * FROM proses_barang_retur 
         WHERE resi_id = ?`,
        [resi_id]
      );

      if (existingRecord.length === 0) {
        // If no record exists, create a new one
        await connection.query(
          `INSERT INTO proses_barang_retur 
           (resi_id, id_pekerja, status_retur, gambar_retur)
           VALUES (?, ?, 'diproses', ?)`,
          [resi_id, id_pekerja, photoPath]
        );
      } else {
        if (existingRecord[0].status_retur === "diterima") {
          if (req.file) {
            const fs = require("fs");
            fs.unlinkSync(req.file.path);
          }
          await connection.rollback();
          return res.status(400).send({
            success: false,
            message: "Resi already marked as 'diterima'",
          });
        }
        await connection.query(
          `UPDATE proses_barang_retur 
           SET id_pekerja = ?, 
               status_retur = 'diterima',
               gambar_retur = ?,
               updated_at = NOW()
           WHERE resi_id = ?`,
          [id_pekerja, photoPath, resi_id]
        );
      }

      await connection.commit();

      return res.status(200).send({
        success: true,
        message: "Resi berhasil di scan",
        data: {
          nama_pekerja: workerRoles[0].nama_pekerja,
          username: workerRoles[0].username,
          status: existingRecord.length === 0 ? "diproses" : "diterima",
          ...(photoPath && { gambar_retur: photoPath }),
        },
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    if (req.file) {
      const fs = require("fs");
      fs.unlinkSync(req.file.path);
    }
    console.error("Error in scanResiRetur:", error);
    res.status(500).send({
      success: false,
      message: "Internal server error while processing scan",
      error: error.message,
    });
  }
};

const showAllReturActiviy = async (req, res) => {
  const { id_pekerja } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || "";
  const date = req.query.date;

  try {
    let queryConditions = ["lr.id_pekerja = ?"];
    let queryParams = [id_pekerja];

    if (search) {
      queryConditions.push("lr.resi_id LIKE ?");
      queryParams.push(`%${search}%`);
    }

    if (date) {
      queryConditions.push("DATE(lr.created_at) = ?");
      queryParams.push(date);
    }

    const whereClause = queryConditions.join(" AND ");

    // Get total count for pagination
    const [countResult] = await mysqlPool.query(
      `SELECT COUNT(*) as total 
       FROM log_retur lr
       WHERE ${whereClause}`,
      queryParams
    );

    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    // Get paginated data
    const [rows] = await mysqlPool.query(
      `SELECT 
        lr.resi_id,
        pek.nama_pekerja,
        lr.status_retur as status,
        lr.created_at as proses_scan
      FROM log_retur lr
      LEFT JOIN pekerja pek ON lr.id_pekerja = pek.id_pekerja
      WHERE ${whereClause}
      ORDER BY lr.created_at DESC
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
        limit,
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

const toggleStatusRetur = async (req, res) => {
  const { status, resi_id, id_pekerja } = req.body;

  try {
    const [rows] = await mysqlPool.query("SELECT * FROM barang_retur WHERE resi_id = ?", [resi_id]);

    if (rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Resi not found",
      });
    }

    let setStatus = null;
    if (status === "diproses") {
      setStatus = "hilang";
    } else if (status === "hilang") {
      setStatus = "diproses";
    } else if (status === "selesai") {
      return res.status(400).send({
        success: false,
        message: "Resi status cannot be set to 'selesai'",
      });
    }

    // Fixed the parameter order here
    await mysqlPool.query("UPDATE proses_barang_retur SET status_retur = ?, id_pekerja = ? WHERE resi_id = ?", [setStatus, id_pekerja, resi_id]);

    return res.status(200).send({
      success: true,
      message: `Status updated to ${setStatus}`,
    });
  } catch (error) {
    console.error("Error in toggleStatusRetur:", error);
    return res.status(500).send({
      success: false,
      message: "Internal server error while updating status",
      error: error.message,
    });
  }
};

const editNote = async (req, res) => {
  const { resi_id, note } = req.body;
  try {
    const [rows] = await mysqlPool.query("SELECT * FROM barang_retur WHERE resi_id = ?", [resi_id]);

    if (rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Resi not found",
      });
    }

    await mysqlPool.query("UPDATE barang_retur SET note = ? WHERE resi_id = ?", [note, resi_id]);

    return res.status(200).send({
      success: true,
      message: "Note updated",
    });
  } catch (error) {
    console.error("Error in editNote:", error);
    return res.status(500).send({
      success: false,
      message: "Internal server error while updating note",
      error: error.message,
    });
  }
};

const getImportReturLog = async (req, res) => {
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
      FROM log_import_retur
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

const exportLogImportReturToExcel = async (req, res) => {
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
       FROM log_import_retur 
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
  addRetur,
  showAllBarangRetur,
  importRetur,
  exportRetur,
  downloadReturTemplate,
  scanResiRetur,
  showAllReturActiviy,
  toggleStatusRetur,
  editNote,
  getImportReturLog,
  exportLogImportReturToExcel,
};
