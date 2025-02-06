const mysqlPool = require("../config/db");

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

module.exports = {
  getSalary,
  editGaji,
  getGajiPacking,
  payPackingStaff,
};
