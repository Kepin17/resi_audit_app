const mysqlPool = require("../config/db");
const excelJS = require("exceljs");

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
      whereConditions.push("(resi_id LIKE ? OR resi_id LIKE ?)");
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (status && status !== "Semua") {
      whereConditions.push("status_barang = ?");
      queryParams.push(status);
    }

    if (startDate && endDate) {
      whereConditions.push("DATE(created_at) BETWEEN ? AND ?");
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

const exportBarang = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query("SELECT * FROM barang");

    if (rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Barang not found",
      });
    }

    // Create a new Excel workbook
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Barang");

    // Define the columns
    worksheet.columns = [
      { header: "Resi ID", key: "resi_id", width: 20 },
      { header: "Status", key: "status_barang", width: 20 },
      { header: "Created At", key: "created_at", width: 20 },
    ];

    // Populate the Excel worksheet with data
    rows.forEach((row) => {
      worksheet.addRow(row);
    });

    // Set the HTTP response headers
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=barang.xlsx");

    // Write the Excel workbook to the response
    return workbook.xlsx.write(res).then(() => {
      res.status(200).end();
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error when trying to export barang",
      error: error.message,
    });
  }
};

module.exports = {
  addNewBarang,
  showAllBarang,
  cancelBarang,
  exportBarang,
  showDetailByResi,
};
