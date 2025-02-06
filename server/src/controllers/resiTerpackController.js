const mysqlPool = require("../config/db");
const excelJS = require("exceljs");

const showResiTerpack = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { search, startDate, endDate } = req.query;

    let whereConditions = ["log_proses.status_proses = 'packing'"]; // Base condition
    let queryParams = [];

    if (search) {
      whereConditions.push("(log_proses.resi_id LIKE ? OR pekerja.nama_pekerja LIKE ?)");
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (startDate && endDate) {
      whereConditions.push("DATE(log_proses.created_at) BETWEEN ? AND ?");
      queryParams.push(startDate, endDate);
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    // Get total count for pagination
    const [countResult] = await mysqlPool.query(
      `SELECT COUNT(DISTINCT log_proses.id_log) as total 
       FROM log_proses 
       LEFT JOIN pekerja ON log_proses.id_pekerja = pekerja.id_pekerja 
       ${whereClause}`,
      queryParams
    );

    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    // Main query with pagination
    const [rows] = await mysqlPool.query(
      `SELECT DISTINCT
        log_proses.id_log,
        log_proses.resi_id,
        log_proses.id_pekerja,
        log_proses.status_proses,
        log_proses.created_at,
        pekerja.nama_pekerja
       FROM log_proses
       LEFT JOIN pekerja ON log_proses.id_pekerja = pekerja.id_pekerja
       ${whereClause}
       ORDER BY log_proses.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Data berhasil ditemukan!",
      data: rows,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalItems,
        limit: limit,
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

module.exports = {
  showResiTerpack,
};
