const mysqlPool = require("../config/db");
const excelJS = require("exceljs");
const moment = require("moment");

const getSalary = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(`
      SELECT *
      FROM gaji
    `);

    return res.status(200).send({
      success: true,
      message: "gaji found",
      data: rows,
    });
  } catch (error) {
    console.log(error);
    if (!res.headersSent) {
      return res.status(500).send({
        success: false,
        message: "Error when trying to show all barang",
        error: error.message,
      });
    }
  }
};

const editGaji = async (req, res) => {
  try {
    const { id_gaji } = req.params;
    const { total_gaji_per_scan } = req.body;

    const [gaji] = await mysqlPool.query("SELECT * FROM gaji WHERE id_gaji = ?", [id_gaji]);

    if (gaji.length === 0) {
      return res.status(400).send({
        success: false,
        message: "data gaji not found",
      });
    }

    if (!total_gaji_per_scan) {
      return res.status(400).send({
        success: false,
        message: "total gaji per scan is required",
      });
    }

    await mysqlPool.query(`UPDATE gaji SET total_gaji_per_scan = ? WHERE id_gaji = ?`, [total_gaji_per_scan, id_gaji]);

    return res.status(200).send({
      success: true,
      message: "gaji updated",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error when trying to update gaji",
      error: error.message,
    });
  }
};

const getGajiPacking = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { search, status, startDate, endDate } = req.query;

    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push("(pekerja.nama_pekerja LIKE ?)");
      queryParams.push(`%${search}%`);
    }

    if (status && status !== "Semua") {
      whereConditions.push("gaji_pegawai.is_dibayar = ?");
      queryParams.push(status === "Sudah Dibayar" ? 1 : 0);
    }

    if (startDate && endDate) {
      whereConditions.push("gaji_pegawai.updated_at BETWEEN ? AND ?");
      queryParams.push(startDate, endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const [constResult] = await mysqlPool.query(
      `
      SELECT COUNT(*) as count
      FROM gaji_pegawai
      JOIN pekerja ON gaji_pegawai.id_pekerja = pekerja.id_pekerja
      JOIN gaji ON gaji_pegawai.id_gaji = gaji.id_gaji
      ${whereClause}
      ORDER BY gaji_pegawai.updated_at DESC

    `,
      queryParams
    );

    const totalItems = constResult[0].count;
    const totalPages = Math.ceil(totalItems / limit);

    const [rows] = await mysqlPool.query(
      `
      SELECT gaji_pegawai.*, nama_pekerja , total_gaji_per_scan
      FROM gaji_pegawai
      JOIN pekerja ON gaji_pegawai.id_pekerja = pekerja.id_pekerja
      JOIN gaji ON gaji_pegawai.id_gaji = gaji.id_gaji
      ${whereClause}
      ORDER BY gaji_pegawai.updated_at DESC
      LIMIT ?, ?`,
      [...queryParams, offset, limit]
    );

    return res.status(200).send({
      success: true,
      message: "gaji packing found",
      data: rows,
      pagination: {
        totalPages,
        currentPage: page,
        totalItems,
      },
    });
  } catch (error) {
    console.log(error);
    if (!res.headersSent) {
      return res.status(500).send({
        success: false,
        message: "Error when trying to show all barang",
        error: error.message,
      });
    }
  }
};

const payPackingStaff = async (req, res) => {
  const connection = await mysqlPool.getConnection();

  try {
    await connection.beginTransaction();

    const { id_gaji_pegawai } = req.params;

    if (!id_gaji_pegawai) {
      await connection.rollback();
      return res.status(400).send({
        success: false,
        message: "ID gaji pegawai tidak ditemukan",
      });
    }

    // Check if id_gaji_pegawai exists and not already paid
    const [gajiPegawai] = await connection.query("SELECT gp.*, p.nama_pekerja FROM gaji_pegawai gp " + "LEFT JOIN pekerja p ON gp.id_pekerja = p.id_pekerja " + "WHERE gp.id_gaji_pegawai = ?", [id_gaji_pegawai]);

    if (!gajiPegawai || gajiPegawai.length === 0) {
      await connection.rollback();
      return res.status(404).send({
        success: false,
        message: `Data gaji pegawai dengan ID ${id_gaji_pegawai} tidak ditemukan`,
      });
    }

    if (gajiPegawai[0].is_dibayar === 1) {
      await connection.rollback();
      return res.status(400).send({
        success: false,
        message: `Gaji untuk ${gajiPegawai[0].nama_pekerja} sudah dibayarkan sebelumnya`,
      });
    }

    const result = await connection.query(`UPDATE gaji_pegawai SET is_dibayar = 1, updated_at = NOW() WHERE id_gaji_pegawai = ?`, [id_gaji_pegawai]);

    if (result[0].affectedRows === 0) {
      await connection.rollback();
      return res.status(400).send({
        success: false,
        message: "Gagal memperbarui status pembayaran",
      });
    }

    await connection.commit();

    return res.status(200).send({
      success: true,
      message: `Pembayaran gaji untuk ${gajiPegawai[0].nama_pekerja} berhasil dilakukan`,
      data: {
        id_gaji_pegawai,
        nama_pekerja: gajiPegawai[0].nama_pekerja,
        status: "Sudah Dibayar",
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error in payPackingStaff:", error);
    return res.status(500).send({
      success: false,
      message: "Terjadi kesalahan saat melakukan pembayaran",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const importGajiFromExcel = async (req, res) => {
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
            const id_gaji_pegawai = row.getCell(1).value;
            const id_gaji = row.getCell(2).value;
            const id_pekerja = row.getCell(3).value;
            const jumlah_scan = row.getCell(4).value;
            const gaji_total = row.getCell(5).value;
            const created_at = row.getCell(6).value;
            const updated_at = row.getCell(7).value;
            const is_dibayar = row.getCell(8).value;

            rows.push([id_gaji_pegawai, id_gaji, id_pekerja, jumlah_scan, gaji_total, created_at, updated_at, is_dibayar]);
          }
        });

        // Handle each row with multiple columns
        for (const row of rows) {
          await mysqlPool.query(
            `INSERT INTO gaji_pegawai (id_gaji_pegawai, id_gaji, id_pekerja, jumlah_scan, gaji_total,created_at, updated_at ,is_dibayar) 
             VALUES (?, ?, ?, ?, ?, ?,?,?)
             ON DUPLICATE KEY UPDATE 
             id_gaji = VALUES(id_gaji),
             id_pekerja = VALUES(id_pekerja),
             jumlah_scan = VALUES(jumlah_scan),
             gaji_total = VALUES(gaji_total),
             created_at = VALUES(created_at),
             updated_at = VALUES(updated_at),
             is_dibayar = VALUES(is_dibayar)`,
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

const exportGaji = async (req, res) => {
  try {
    const { search, startDate, endDate } = req.query;

    // Build the WHERE clause dynamically
    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push("(pekerja.nama_pekerja LIKE ? )");
      queryParams.push(`%${search}%`);
    }

    if (startDate && endDate) {
      whereConditions.push("DATE(gaji_pegawai.updated_at) BETWEEN ? AND ?");
      queryParams.push(startDate, endDate);
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    // Get filtered data from database
    const [rows] = await mysqlPool.query(
      `
      SELECT 
       gaji_pegawai.jumlah_scan, gaji_pegawai.gaji_total, gaji_pegawai.updated_at,gaji_pegawai.is_dibayar, pekerja.nama_pekerja, 
       gaji.total_gaji_per_scan
      FROM gaji_pegawai
      LEFT JOIN pekerja ON gaji_pegawai.id_pekerja = pekerja.id_pekerja
      LEFT JOIN gaji ON gaji_pegawai.id_gaji = gaji.id_gaji
      ${whereClause}
      ORDER BY gaji_pegawai.updated_at DESC
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
    const worksheet = workbook.addWorksheet("Data Gaji Packing");

    worksheet.columns = [
      {
        header: "Nama Pekerja",
        key: "nama_pekerja",
        width: 25,
      },
      {
        header: "Jumlah Scan",
        key: "jumlah_scan",
        width: 25,
      },
      {
        header: "Gaji Total",
        key: "gaji_total",
        width: 25,
      },
      {
        header: "Tanggal Update",
        key: "updated_at",
        width: 25,
      },
      {
        header: "is dibayar",
        key: "is_dibayar",
        width: 25,
      },
    ];

    // Add metadata row for filter information
    const filterInfo = [`Search: ${search || "None"}`, `Date Range: ${startDate || "None"} to ${endDate || "None"}`].join(" | ");
    worksheet.addRow([filterInfo]);

    // Style header rows
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    worksheet.getRow(2).font = { bold: true };
    worksheet.getRow(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Add data rows starting from row 3
    rows.forEach((row) => {
      worksheet.addRow({
        nama_pekerja: row.nama_pekerja,
        jumlah_scan: `${row.jumlah_scan} scan`,
        gaji_total: row.gaji_total,
        updated_at: row.updated_at,
        is_dibayar: `${row.is_dibayar === 1 ? "Sudah Dibayar" : "Belum Dibayar"}`,
      });
    });

    worksheet.columns.forEach((column) => {
      column.alignment = { vertical: "middle", horizontal: "left" };
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=data_gaji_${moment().format("YYYY-MM-DD_HH-mm")}.xlsx`);

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

const backupGajiPacking = async (req, res) => {
  try {
    // Get data from database
    const [rows] = await mysqlPool.query(
      `
      SELECT * FROM gaji_pegawai
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
      {
        header: "ID Gaji Pegawai",
        key: "id_gaji_pegawai",
        width: 25,
      },
      {
        header: "ID Gaji",
        key: "id_gaji",
        width: 25,
      },
      {
        header: "ID Pekerja",
        key: "id_pekerja",
        width: 25,
      },
      {
        header: "Jumlah Scan",
        key: "jumlah_scan",
        width: 25,
      },
      {
        header: "Gaji Total",
        key: "gaji_total",
        width: 25,
      },

      {
        header: "Created At",
        key: "created_at",
        width: 25,
      },
      {
        header: "Last Scan",
        key: "updated_at",
        width: 25,
      },
      {
        header: "is dibayar",
        key: "is_dibayar",
        width: 25,
      },
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
        id_gaji_pegawai: row.id_gaji_pegawai,
        id_gaji: row.id_gaji,
        id_pekerja: row.id_pekerja,
        jumlah_scan: `${row.jumlah_scan}`,
        gaji_total: row.gaji_total,
        created_at: row.created_at,
        updated_at: row.updated_at,
        is_dibayar: row.is_dibayar,
      });
    });

    // Auto fit columns
    worksheet.columns.forEach((column) => {
      column.alignment = { vertical: "middle", horizontal: "left" };
    });

    // Set response headers
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=data_gaji_${moment().format("YYYY-MM-DD_HH-mm")}_backup.xlsx`);

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
  getSalary,
  editGaji,
  getGajiPacking,
  payPackingStaff,
  exportGaji,
  backupGajiPacking,
  importGajiFromExcel,
};
