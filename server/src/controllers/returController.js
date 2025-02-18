const mysqlPool = require("../config/db");
const Excel = require("exceljs");
const moment = require("moment");

const addRetur = async (req, res) => {
  try {
    const { resi_id, note } = req.body;
    let ekspedisi = "";

    // Validate required fields
    if (!resi_id) {
      return res.status(400).send({
        success: false,
        message: "all field are required",
      });
    }

    const [rows] = await mysqlPool.query("SELECT * FROM barang WHERE resi_id = ?", [resi_id]);

    const allowResiCode = ["JX", "JP", "TG", "CM", "JT", "GK"];
    const resiCode = resi_id.substring(0, 2);
    const numberOnly = /^\d+$/;

    const isValidExpedition = allowResiCode.includes(resiCode);
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

    if (resiCode === "JX" || resiCode === "JP") {
      ekspedisi = "JNT";
    } else if (resiCode === "TG" || resiCode === "CM") {
      ekspedisi = "JNE";
    } else if (resiCode === "JT") {
      ekspedisi = "JTR";
    } else if (resiCode === "GK") {
      ekspedisi = "GJK";
    } else {
      ekspedisi = "JCG";
    }

    if (rows.length === 0) {
      await mysqlPool.query("INSERT INTO barang_retur (resi_id, id_ekspedisi, note) VALUES (?, ?, ?)", [resi_id, ekspedisi, note]);
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
      } else if (status === "selesai") {
        whereConditions.push("latest_process.status_retur = 'selesai'");
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
      `SELECT 
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
        GROUP BY b.resi_id
        ORDER BY b.created_at DESC
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

const importRetur = async (req, res) => {
  const connection = await mysqlPool.getConnection();
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const workbook = new Excel.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];

    let successful = 0;
    let failed = 0;
    let duplicates = 0;
    const errors = [];
    const problemRows = [];

    const allowResiCode = ["JX", "JP", "TG", "CM", "JT", "GK"];
    const numberOnly = /^\d+$/;

    await connection.beginTransaction();

    const rows = worksheet.getRows(2, worksheet.rowCount - 1);

    for (let row of rows) {
      try {
        const resi_id = row.getCell(1).value?.toString();
        const note = row.getCell(2).value;
        const dateTime = row.getCell(3).value;
        let ekspedisi = "";

        // Basic validation
        if (!resi_id) {
          errors.push(`Row ${row.number}: Missing resi_id`);
          failed++;
          continue;
        }

        // Resi format validation
        const resiCode = resi_id.substring(0, 2);
        const isValidExpedition = allowResiCode.includes(resiCode);
        const isValidNumber = numberOnly.test(resi_id);

        if (!isValidExpedition && !isValidNumber) {
          errors.push(`Row ${row.number}: Format resi tidak valid. Gunakan format ekspedisi (Cth: CM1234567) atau nomor saja`);
          failed++;
          continue;
        }

        if (resi_id.length < 8) {
          errors.push(`Row ${row.number}: Resi ID must be at least 8 characters long`);
          failed++;
          continue;
        }

        // Determine ekspedisi based on resi code
        if (resiCode === "JX" || resiCode === "JP") {
          ekspedisi = "JNT";
        } else if (resiCode === "TG" || resiCode === "CM") {
          ekspedisi = "JNE";
        } else if (resiCode === "JT") {
          ekspedisi = "JTR";
        } else if (resiCode === "GK") {
          ekspedisi = "GJK";
        } else {
          ekspedisi = "JCG";
        }

        // Date validation and formatting
        let created_at = moment().format("YYYY-MM-DD HH:mm:ss");
        if (dateTime) {
          // Handle Excel date number format
          if (typeof dateTime === "number") {
            const excelDate = moment(new Date((dateTime - 25569) * 86400 * 1000));
            if (excelDate.isValid()) {
              created_at = excelDate.format("YYYY-MM-DD HH:mm:ss");
            } else {
              errors.push(`Row ${row.number}: Invalid Excel date format`);
              problemRows.push({
                row: row.number,
                resi: resi_id,
                reason: "Invalid Excel date format",
              });
              failed++;
              continue;
            }
          } else {
            // Handle text date formats
            const parsedDate = moment(dateTime, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY-MM-DD", "DD-MM-YYYY HH:mm:ss", "DD/MM/YYYY HH:mm:ss"], true);

            if (!parsedDate.isValid()) {
              errors.push(`Row ${row.number}: Invalid date format. Use YYYY-MM-DD HH:mm:ss or DD/MM/YYYY HH:mm:ss`);
              problemRows.push({
                row: row.number,
                resi: resi_id,
                reason: "Invalid date format",
              });
              failed++;
              continue;
            }
            created_at = parsedDate.format("YYYY-MM-DD HH:mm:ss");
          }
        }

        // Check for existing resi
        const [existing] = await connection.query("SELECT resi_id FROM barang_retur WHERE resi_id = ?", [resi_id]);

        if (existing.length > 0) {
          duplicates++;
          problemRows.push({
            row: row.number,
            resi: resi_id,
            reason: "Duplicate resi",
          });
          continue;
        }

        // Insert with validated data
        await connection.query("INSERT INTO barang_retur (resi_id, id_ekspedisi, note, created_at) VALUES (?, ?, ?, ?)", [resi_id, ekspedisi, note || null, created_at]);
        successful++;
      } catch (error) {
        errors.push(`Row ${row.number}: ${error.message}`);
        problemRows.push({
          row: row.number,
          resi: row.getCell(1).value?.toString() || "unknown",
          reason: error.message,
        });
        failed++;
      }
    }

    await connection.commit();

    res.status(200).json({
      success: true,
      message: "Import completed",
      results: {
        successful,
        failed,
        duplicates,
        errors,
        problemRows,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Import error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing import",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const exportRetur = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(`
      SELECT 
        r.resi_id,
        ek.nama_ekspedisi as id_ekspedisi,
        r.note,
        r.created_at,
        r.updated_at,
        COALESCE(p.status_retur, 'diproses') as status
      FROM barang_retur r
      LEFT JOIN ekpedisi ek ON r.id_ekspedisi = ek.id_ekspedisi
      LEFT JOIN (
        SELECT resi_id, status_retur
        FROM proses_barang_retur
        WHERE id_proses IN (
          SELECT MAX(id_proses)
          FROM proses_barang_retur
          GROUP BY resi_id
        )
      ) p ON r.resi_id = p.resi_id
      ORDER BY r.created_at DESC
    `);

    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet("Retur Data");

    // Add headers
    worksheet.columns = [
      { header: "Resi ID", key: "resi_id", width: 15 },
      { header: "ID Ekspedisi", key: "id_ekspedisi", width: 15 },
      { header: "Note", key: "note", width: 30 },
      { header: "Created At", key: "created_at", width: 20 },
      { header: "Updated At", key: "updated_at", width: 20 },
      { header: "Status", key: "status", width: 15 },
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
    const workbook = new Excel.Workbook();

    // Create main template worksheet
    const worksheet = workbook.addWorksheet("Template Retur");
    worksheet.columns = [
      { header: "Resi ID *", key: "resi_id", width: 20 },
      { header: "Note", key: "note", width: 40 },
      { header: "Created At", key: "created_at", width: 20 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
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
        column: "Note",
        description: "Catatan tambahan untuk resi (opsional)",
        example: "Barang rusak",
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

    // Style instruction rows
    instructionSheet.getRows(2, instructions.length + 1).forEach((row) => {
      row.height = 100; // Adjust height for wrapped text
    });

    // Add example rows in template
    const examples = [
      {
        resi_id: "CM1234567",
        note: "Contoh resi JNE",
        created_at: moment().format("YYYY-MM-DD HH:mm:ss"),
      },
      {
        resi_id: "JX1234567",
        note: "Contoh resi JNT",
        created_at: moment().subtract(1, "days").format("YYYY-MM-DD HH:mm:ss"),
      },
      {
        resi_id: "12345678",
        note: "Contoh resi angka",
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
      photoPath = req.file.path;
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
           (resi_id, id_pekerja, status, gambar)
           VALUES (?, ?, 'diproses', ?)`,
          [resi_id, id_pekerja, photoPath]
        );
      } else {
        // If record exists, update it
        await connection.query(
          `UPDATE proses_barang_retur 
           SET id_pekerja = ?, 
               gambar_retur = ?,
               status_retur = 'selesai',
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
          status: existingRecord.length === 0 ? "diproses" : "selesai",
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

module.exports = {
  addRetur,
  showAllBarangRetur,
  importRetur,
  exportRetur,
  downloadReturTemplate,
  scanResiRetur,
  showAllReturActiviy,
};
