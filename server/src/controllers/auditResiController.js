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
      if (req.file) {
        const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).send({
        success: false,
        message: "resi_id and id_pekerja are required",
      });
    }

    // Get worker data
    const [workerData] = await mysqlPool.query(
      `SELECT pekerja.id_bagian, pekerja.nama_pekerja, bagian.jenis_pekerja
       FROM pekerja 
       JOIN bagian ON pekerja.id_bagian = bagian.id_bagian
       WHERE pekerja.id_pekerja = ?`,
      [id_pekerja]
    );

    // Worker validation
    if (!workerData || workerData.length === 0) {
      if (req.file) {
        const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).send({
        success: false,
        message: "Worker not found",
      });
    }

    const workerRole = workerData[0].jenis_pekerja;

    // Validate photo requirement for picker role
    if (workerRole === "picker" && !req.file) {
      return res.status(400).send({
        success: false,
        message: "Photo is required for picker role",
      });
    }

    // Only process photo if worker is picker
    let photoPath = null;
    if (req.file && workerRole === "picker") {
      photoPath = req.file.path;
    } else if (req.file) {
      const fs = require("fs");
      fs.unlinkSync(req.file.path);
    }

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

        // Add photo information to the process only for picker
        const processQuery = photoPath ? "INSERT INTO proses (resi_id, id_pekerja, status_proses, gambar_resi) VALUES (?, ?, ?, ?)" : "INSERT INTO proses (resi_id, id_pekerja, status_proses) VALUES (?, ?, ?)";

        const processValues = photoPath ? [resi_id, id_pekerja, workerRole, photoPath] : [resi_id, id_pekerja, workerRole];

        await mysqlPool.query(processQuery, processValues);
      } else {
        // Rest of the workflow checks...
        if (prosesRows[0].status_proses === workerRole) {
          return res.status(400).send({
            success: false,
            message: `This resi is already processed for ${workerRole}`,
          });
        }

        const workflow = ["picker", "packing", "pickout"];
        const currentIndex = workflow.indexOf(prosesRows[0].status_proses);
        const nextIndex = workflow.indexOf(workerRole);

        if (nextIndex !== currentIndex + 1) {
          return res.status(400).send({
            success: false,
            message: `Invalid workflow sequence. Current: ${prosesRows[0].status_proses}, Expected next: ${workflow[currentIndex + 1]}`,
          });
        }

        await mysqlPool.query("UPDATE proses SET id_pekerja = ?, status_proses = ? WHERE resi_id = ?", [id_pekerja, workerRole, resi_id]);
      }

      return res.status(200).send({
        success: true,
        message: "Scan " + (photoPath ? "and photo upload " : "") + "success",
        data: {
          nama_pekerja: workerData[0].nama_pekerja,
          proses_scan: workerRole,
          ...(photoPath && { gambar_resi: photoPath }),
        },
      });
    }

    res.status(404).send({
      success: false,
      message: "Resi not valid or not found",
    });
  } catch (error) {
    if (req.file) {
      const fs = require("fs");
      fs.unlinkSync(req.file.path);
    }
    handleError(error, res, "processing scan and photo");
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
      WHERE pekerja.username = ?`,
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
      ORDER BY log_proses.created_at ASC`,
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

const uploadPhoto = async (req, res) => {
  try {
    const { resi_id, notes } = req.body;

    if (!req.files || !req.files.photo) {
      return res.status(400).json({
        status: "error",
        message: "No photo uploaded",
      });
    }

    const photo = req.files.photo;
    const fileExtension = photo.name.split(".").pop();
    const fileName = `${resi_id}_${Date.now()}.${fileExtension}`;
    const uploadPath = `uploads/${fileName}`;

    // Move the photo to uploads directory
    photo.mv(uploadPath, async (err) => {
      if (err) {
        return res.status(500).json({
          status: "error",
          message: "Error uploading file",
          error: err,
        });
      }

      try {
        // Update the database with photo information
        const query = `
          UPDATE proses 
          SET gambar_resi = ?
          WHERE resi_id = ? 
          ORDER BY updated_at DESC 
          LIMIT 1`;

        await pool.query(query, [fileName, notes, resi_id]);

        res.status(200).json({
          status: "success",
          message: "Photo uploaded successfully",
          data: {
            gambar_resi: fileName,
            resi_id,
          },
        });
      } catch (dbError) {
        // If database update fails, remove the uploaded file
        const fs = require("fs");
        fs.unlinkSync(uploadPath);

        throw dbError;
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = { showAllData, scaneHandler, showAllActiviy, getActivityByName, showDataByResi, uploadPhoto };
