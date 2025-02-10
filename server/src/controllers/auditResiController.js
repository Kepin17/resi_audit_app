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

const checkStatusResi = async (req, res) => {
  try {
    const { resi_id } = req.params;
    const { id_pekerja } = req.body;

    if (!resi_id) {
      return res.status(400).send({
        success: false,
        message: "Resi ID is required",
      });
    }

    if (!id_pekerja) {
      return res.status(400).send({
        success: false,
        message: "Worker ID is required",
      });
    }

    // Get worker data
    const [workerData] = await mysqlPool.query(
      `SELECT pekerja.*, bagian.jenis_pekerja
       FROM pekerja 
       JOIN bagian ON pekerja.id_bagian = bagian.id_bagian
       WHERE pekerja.id_pekerja = ?`,
      [id_pekerja]
    );

    if (!workerData || workerData.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Worker not found",
      });
    }

    const workerRole = workerData[0].jenis_pekerja;
    const nama_pekerja = workerData[0].nama_pekerja;

    // Check if resi exists in barang
    const [checkBarangRow] = await mysqlPool.query("SELECT * FROM barang WHERE resi_id = ?", [resi_id]);

    if (checkBarangRow.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Resi not found",
      });
    }

    if (checkBarangRow[0].status_barang === "cancelled") {
      return res.status(400).send({
        success: false,
        status: "cancelled",
        message: "Resi has been cancelled",
      });
    }

    const [prosesRows] = await mysqlPool.query(
      `SELECT proses.status_proses, proses.created_at, pekerja.nama_pekerja 
       FROM proses 
       LEFT JOIN pekerja pekerja ON pekerja.id_pekerja = proses.id_pekerja
       WHERE proses.resi_id = ?`,
      [resi_id]
    );

    // Check if this is a new resi
    if (!prosesRows || prosesRows.length === 0) {
      if (workerRole !== "picker") {
        return res.status(400).send({
          success: false,
          message: "This resi must be processed by picker first",
        });
      }
      return res.status(200).send({
        success: true,
        status: "new",
        message: "Resi is ready for picker process",
      });
    }

    const currentStatus = prosesRows[0]?.status_proses;
    const workflow = ["picker", "packing", "pickout"];

    // Check if worker tries to process their own role again
    if (workerRole === currentStatus) {
      return res.status(400).send({
        success: false,
        message: `Resi ini sudah diproses ${workerRole} oleh ${nama_pekerja} pada ${new Date(prosesRows[0].created_at).toLocaleString("id-ID")}`,
      });
    }

    // Validate if status_proses exists
    if (!currentStatus) {
      return res.status(400).send({
        success: false,
        message: "Invalid process status",
      });
    }

    const currentIndex = workflow.indexOf(currentStatus);
    const expectedRole = workflow[currentIndex + 1];

    // Check if all processes are completed
    if (currentIndex === workflow.length - 1) {
      return res.status(400).send({
        success: true,
        status: "completed",
        message: "Resi has completed all processes",
        lastProcess: {
          status: currentStatus,
          worker: prosesRows[0].nama_pekerja,
          timestamp: prosesRows[0].created_at,
        },
      });
    }

    // Check if the worker role matches the expected next process
    if (workerRole !== expectedRole) {
      return res.status(400).send({
        success: false,
        message: `This resi must be processed by ${expectedRole} first`,
      });
    }

    const processTime = new Date(prosesRows[0].created_at).toLocaleString("id-ID");

    return res.status(200).send({
      success: true,
      status: expectedRole,
      message: `Resi is ready for ${expectedRole} process`,
      lastProcess: {
        status: currentStatus,
        worker: prosesRows[0].nama_pekerja,
        timestamp: processTime,
      },
    });
  } catch (error) {
    handleError(error, res, "checking resi status");
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

    // First, check the status
    const statusCheck = await checkStatusResi(
      {
        params: { resi_id },
        body: { id_pekerja },
      },
      {
        status: () => ({ send: () => null }),
        send: () => null,
      }
    );

    // If status check returns error, don't proceed
    if (statusCheck?.success === false) {
      if (req.file) {
        const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).send(statusCheck);
    }

    // Get worker data
    const [workerData] = await mysqlPool.query(
      `SELECT pekerja.id_bagian, pekerja.nama_pekerja, bagian.jenis_pekerja
       FROM pekerja 
       JOIN bagian ON pekerja.id_bagian = bagian.id_bagian
       WHERE pekerja.id_pekerja = ?`,
      [id_pekerja]
    );

    const workerRole = workerData[0].jenis_pekerja;

    let photoPath = null;
    if (req.file && workerRole !== "operator") {
      photoPath = req.file.path;
    } else if (req.file) {
      const fs = require("fs");
      fs.unlinkSync(req.file.path);
    }

    const [checkBarangRow] = await mysqlPool.query("SELECT * FROM barang WHERE resi_id = ?", [resi_id]);

    if (checkBarangRow.length !== 0) {
      const [prosesRows] = await mysqlPool.query("SELECT * FROM proses WHERE resi_id = ?", [resi_id]);

      if (prosesRows.length === 0) {
        const processQuery = photoPath ? "INSERT INTO proses (resi_id, id_pekerja, status_proses, gambar_resi) VALUES (?, ?, ?, ?)" : "INSERT INTO proses (resi_id, id_pekerja, status_proses) VALUES (?, ?, ?)";
        const processValues = photoPath ? [resi_id, id_pekerja, workerRole, photoPath] : [resi_id, id_pekerja, workerRole];

        await mysqlPool.query(processQuery, processValues);
      } else {
        const processQuery = photoPath ? "UPDATE proses SET status_proses = ?, gambar_resi = ? WHERE resi_id = ? ORDER BY updated_at DESC LIMIT 1" : "UPDATE proses SET status_proses = ? WHERE resi_id = ? ORDER BY updated_at DESC LIMIT 1";
        const processValues = photoPath ? [workerRole, photoPath, resi_id] : [workerRole, resi_id];
        await mysqlPool.query(processQuery, processValues);
      }

      return res.status(200).send({
        success: true,
        message: "Resi berhasil di scan",
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

module.exports = { showAllData, scaneHandler, showAllActiviy, getActivityByName, showDataByResi, uploadPhoto, checkStatusResi };
