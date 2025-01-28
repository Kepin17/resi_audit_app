const mysqlPool = require("../config/db");

const handleError = (error, res, operation) => {
  console.error(`Error in ${operation}:`, error);

  if (error.code === "ER_NO_SUCH_TABLE") {
    return res.status(500).send({
      success: false,
      message: "Database table not found",
      error: error.message,
    });
  }

  if (error.code === "ER_BAD_FIELD_ERROR") {
    return res.status(500).send({
      success: false,
      message: "Invalid database field",
      error: error.message,
    });
  }

  if (error.code === "ECONNREFUSED") {
    return res.status(503).send({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }

  return res.status(500).send({
    success: false,
    message: `Error when ${operation}`,
    error: error.message,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
  });
};

const showAllData = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query("SELECT * FROM proses");
    if (rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Data not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Data found",
      data: rows,
    });
  } catch (error) {
    handleError(error, res, "fetching all data");
  }
};

const scaneHandler = async (req, res) => {
  try {
    const { resi_id, id_pekerja } = req.body;

    // Validate required fields
    if (!resi_id || !id_pekerja) {
      return res.status(400).send({
        success: false,
        message: "resi_id and id_pekerja are required",
      });
    }

    const [workerData] = await mysqlPool.query(
      `SELECT pekerja.id_bagian, pekerja.nama_pekerja, bagian.jenis_pekerja
       FROM pekerja 
       JOIN bagian ON pekerja.id_bagian = bagian.id_bagian
       WHERE pekerja.id_pekerja = ?`,
      [id_pekerja]
    );

    // Add worker validation
    if (!workerData || workerData.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Worker not found",
      });
    }

    const workerRole = workerData[0].jenis_pekerja;

    const [checkBarangRow] = await mysqlPool.query("SELECT * FROM barang WHERE resi_id = ?", [resi_id]);

    if (checkBarangRow.length !== 0) {
      const [prosesRows] = await mysqlPool.query("SELECT * FROM proses WHERE resi_id = ?", [resi_id]);

      if (prosesRows.length === 0) {
        // For new entry, only picker role is allowed
        if (workerRole !== "picker") {
          return res.status(400).send({
            success: false,
            message: "New resi must start with picker process",
          });
        }

        if (checkBarangRow[0].status_pengiriman === "cancelled") {
          return res.status(400).send({
            success: false,
            message: "Resi has been cancelled",
          });
        }

        await mysqlPool.query("INSERT INTO proses (resi_id, id_pekerja, status_proses) VALUES (?, ?,?)", [resi_id, id_pekerja, workerRole]);
      } else {
        // Check if trying to scan with same role
        if (prosesRows[0].status_proses === workerRole) {
          return res.status(400).send({
            success: false,
            message: `This resi is already processed for ${workerRole}`,
          });
        }

        // Define valid workflow sequence
        const workflow = ["picker", "packing", "pickout"];
        const currentIndex = workflow.indexOf(prosesRows[0].status_proses);
        const nextIndex = workflow.indexOf(workerRole);

        // Check if the update follows linear workflow
        if (nextIndex !== currentIndex + 1) {
          return res.status(400).send({
            success: false,
            message: `Invalid workflow sequence. Current: ${prosesRows[0].status_proses}, Expected next: ${workflow[currentIndex + 1]}`,
          });
        }

        await mysqlPool.query("UPDATE proses SET id_pekerja = ?, status_proses = ? WHERE resi_id = ?", [id_pekerja, workerRole, resi_id]);
      }

      await mysqlPool.query("INSERT INTO log_proses (id_pekerja, resi_id, status_proses) VALUES (?, ?, ?)", [id_pekerja, resi_id, workerRole]);
      return res.status(200).send({
        success: true,
        message: "Scan success and data updated",
        data: {
          nama_pekerja: workerData[0].nama_pekerja,
          proses_scan: workerRole,
        },
      });
    }

    res.status(404).send({
      success: false,
      message: "Resi not valid or not found",
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).send({
        success: false,
        message: "Duplicate scan entry detected",
        error: error.message,
      });
    }
    handleError(error, res, "processing scan");
  }
};

const showAllActiviy = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(`
      SELECT pekerja.nama_pekerja, log_proses.resi_id as resi, log_proses.status_proses as status, log_proses.created_at as proses_scan
      FROM log_proses 
      JOIN proses ON log_proses.resi_id = proses.resi_id 
      JOIN pekerja ON log_proses.id_pekerja = pekerja.id_pekerja
    `);
    if (rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Data not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Data found",
      data: rows,
    });
  } catch (error) {
    handleError(error, res, "fetching all activities");
  }
};

const getActivityByName = async (req, res) => {
  try {
    const { username } = req.params;
    const [rows] = await mysqlPool.query(
      `
      SELECT pekerja.nama_pekerja, log_proses.resi_id as resi, log_proses.status_proses as status, log_proses.created_at as proses_scan
      FROM log_proses 
      JOIN proses ON log_proses.resi_id = proses.resi_id 
      JOIN pekerja ON log_proses.id_pekerja = pekerja.id_pekerja
      WHERE pekerja.username = ?
    `,
      [username]
    );
    if (rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Data not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Data found",
      data: rows,
    });
  } catch (error) {
    handleError(error, res, "fetching activities by name");
  }
};

const showDataByResi = async (req, res) => {
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
        pekerja.nama_pekerja,
        log_proses.resi_id as resi,
        log_proses.status_proses as status,
        log_proses.created_at as proses_scan
      FROM log_proses 
      JOIN proses ON log_proses.resi_id = proses.resi_id 
      JOIN pekerja ON log_proses.id_pekerja = pekerja.id_pekerja
      WHERE log_proses.resi_id = ?
      ORDER BY log_proses.created_at ASC
    `,
      [resi_id]
    );

    if (rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: `No data found for resi ID: ${resi_id}`,
      });
    }

    res.status(200).send({
      success: true,
      message: "Data found",
      data: rows,
    });
  } catch (error) {
    handleError(error, res, "fetching data by resi ID");
  }
};

module.exports = { showAllData, scaneHandler, showAllActiviy, getActivityByName, showDataByResi };
