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
    const { search, status, startDate, endDate } = req.query;

    // Build the WHERE clause dynamically
    let whereConditions = [];
    let queryParams = [];

    // Updated search condition
    if (search) {
      whereConditions.push("(barang.resi_id LIKE ? OR barang.resi_id LIKE ?)");
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (status && status !== "Semua") {
      whereConditions.push("status_barang = ?");
      queryParams.push(status);
    }

    if (startDate && endDate) {
      whereConditions.push("DATE(barang.created_at) BETWEEN ? AND ?");
      queryParams.push(startDate, endDate);
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    // Get total count with filters
    const [countResult] = await mysqlPool.query(
      `SELECT COUNT(*) as count 
       FROM barang 
       ${whereClause}`,
      queryParams
    );

    const totalItems = countResult[0].count;
    const totalPages = Math.ceil(totalItems / limit);

    // Get filtered and paginated data
    const [rows] = await mysqlPool.query(
      `SELECT 
        barang.*,
        pekerja.nama_pekerja,
        proses.updated_at as last_scan,
        COALESCE(barang.status_barang, 'Pending') as status,
        CASE 
          WHEN barang.status_barang = 'Cancelled' THEN 'Dibatalkan'
          WHEN barang.status_barang = 'Pending' THEN 'Menunggu pickup'
          WHEN barang.status_barang = 'Picked' THEN 'Sudah dipickup'
          WHEN barang.status_barang = 'Packed' THEN 'Sudah dipacking'
          WHEN barang.status_barang = 'Shipped' THEN 'Dalam pengiriman'
          ELSE 'Status tidak diketahui'
        END as status_description
       FROM barang
        LEFT JOIN proses ON barang.resi_id = proses.resi_id
        LEFT JOIN pekerja ON proses.id_pekerja = pekerja.id_pekerja
       ${whereClause}
       ORDER BY barang.created_at DESC
       LIMIT ?, ?`,
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
    console.error("Database error:", error);
    return res.status(500).json({
      success: false,
      message: "Error when trying to fetch barang",
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
      SELECT 
        log_proses.resi_id,
        log_proses.created_at,
        pekerja.nama_pekerja,
        bagian.jenis_pekerja
      FROM log_proses
      LEFT JOIN pekerja ON log_proses.id_pekerja = pekerja.id_pekerja
      LEFT JOIN bagian ON pekerja.id_bagian = bagian.id_bagian
      WHERE log_proses.resi_id = ?
      `,
      [resi_id]
    );
    res.status(200).send({
      success: true,
      message: "Barang found",
      data: rows,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error when trying to fetch barang",
      error: error.message,
    });
  }
};

const cancelBarang = async (req, res) => {
  try {
    const { resi_id } = req.params;

    const [rows] = await mysqlPool.query("SELECT * FROM barang WHERE resi_id = ?", [resi_id]);

    if (rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Barang not found",
      });
    }

    const status_barang = "Cancelled";
    await mysqlPool.query("UPDATE barang SET status_barang = ? WHERE resi_id = ?", [status_barang, resi_id]);

    res.status(200).send({
      success: true,
      message: "Barang successfully updated",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error when trying to delete barang",
      error: error.message,
    });
  }
};

const importResiFromExcel = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).send({
        success: false,
        message: "No file uploaded",
      });
    }

    const file = req.files.file;
    const fileExt = file.name.split(".").pop().toLowerCase();

    if (!["xlsx", "xls"].includes(fileExt)) {
      return res.status(400).send({
        success: false,
        message: "Format file tidak didukung. Gunakan file Excel (.xlsx atau .xls)",
      });
    }

    const workbook = new excelJS.Workbook();
    const filePath = `./server/uploads/${file.name}`;

    file.mv(filePath, async (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send({
          success: false,
          message: "Error when trying to upload file",
          error: err.message,
        });
      }

      try {
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet(1);

        const rows = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber !== 1) {
            // Skip header row
            const resi_id = row.getCell(1).value; // Column A
            const status = row.getCell(2).value; // Column B
            const created_at = row.getCell(3).value; // Column C
            const updated_at = row.getCell(4).value; // Column D
            const id_proses = row.getCell(5).value; // Column E

            rows.push([
              resi_id,
              status || "Pending", // Default status if not provided
              created_at ? new Date(created_at) : new Date(),
              updated_at ? new Date(updated_at) : new Date(),
              id_proses || null,
            ]);
          }
        });

        // Handle each row with multiple columns
        for (const row of rows) {
          await mysqlPool.query(
            `INSERT INTO barang (resi_id, status_barang, created_at, updated_at, id_proses) 
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
             status_barang = VALUES(status_barang),
             updated_at = VALUES(updated_at),
             id_proses = VALUES(id_proses)`,
            row
          );
        }

        return res.status(200).send({
          success: true,
          message: "Data berhasil diimport dan diupdate",
        });
      } catch (error) {
        console.error("Error processing Excel file:", error);
        return res.status(500).send({
          success: false,
          message: "Error processing Excel file",
          error: error.message,
        });
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error when trying to import resi",
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
      whereConditions.push("(b.resi_id LIKE ? OR b.resi_id LIKE ?)");
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (status && status !== "Semua") {
      whereConditions.push("b.status_barang = ?");
      queryParams.push(status);
    }

    if (startDate && endDate) {
      whereConditions.push("DATE(b.created_at) BETWEEN ? AND ?");
      queryParams.push(startDate, endDate);
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    // Get filtered data from database
    const [rows] = await mysqlPool.query(
      `
      SELECT 
        b.resi_id,
        COALESCE(b.status_barang, 'Pending') as status_barang,
        DATE_FORMAT(b.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(b.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at,
        COALESCE(pek.nama_pekerja, '-') as nama_pekerja,
        CASE 
          WHEN b.status_barang = 'Cancelled' THEN 'Dibatalkan'
          WHEN b.status_barang = 'Pending' THEN 'Menunggu pickup'
          WHEN b.status_barang = 'Picked' THEN 'Sudah dipickup'
          WHEN b.status_barang = 'Packed' THEN 'Sudah dipacking'
          WHEN b.status_barang = 'Shipped' THEN 'Dalam pengiriman'
          ELSE 'Status tidak diketahui'
        END as status_description
      FROM barang b
      LEFT JOIN proses p ON b.resi_id = p.resi_id
      LEFT JOIN pekerja pek ON p.id_pekerja = pek.id_pekerja
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
    worksheet.mergeCells(`A1:E1`);

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
    const { search, status, startDate, endDate } = req.query;

    // Build the WHERE clause dynamically
    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push("(barang.resi_id LIKE ? OR barang.resi_id LIKE ?)");
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (status && status !== "Semua") {
      whereConditions.push("status_barang = ?");
      queryParams.push(status);
    }

    if (startDate && endDate) {
      whereConditions.push("DATE(barang.created_at) BETWEEN ? AND ?");
      queryParams.push(startDate, endDate);
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    // Get data from database
    const [rows] = await mysqlPool.query(
      `
      SELECT * FROM barang
      ${whereClause}
      ORDER BY created_at DESC
    `,
      [...queryParams]
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
