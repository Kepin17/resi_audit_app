const mysqlPool = require("../config/db");
const audioPlayer = require("../utils/AudioPlayer");

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
    const { id_pekerja, thisPage } = req.body;
    const { resi_id } = req.params;

    // Validate required fields
    if (!resi_id || !id_pekerja) {
      if (req.file) {
        const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }
      audioPlayer.playError();
      return res.status(400).send({
        success: false,
        message: "resi_id and id_pekerja are required",
      });
    }

    // Get worker data with all roles
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
      audioPlayer.playError();
      return res.status(404).send({
        success: false,
        message: "Worker not found or has no roles",
      });
    }

    const workerRoleTypes = workerRoles.map((role) => role.jenis_pekerja);
    const nama_pekerja = workerRoles[0].nama_pekerja;
    const username = workerRoles[0].username;

    // Check if resi exists and its status
    const [checkBarangRow] = await mysqlPool.query("SELECT * FROM barang WHERE resi_id = ?", [resi_id]);

    if (checkBarangRow.length === 0) {
      if (req.file) {
        const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }
      audioPlayer.playError();
      return res.status(404).send({
        success: false,
        message: "Resi not found in system",
      });
    }

    if (checkBarangRow[0].status_barang === "cancelled") {
      if (req.file) {
        const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }
      audioPlayer.playError();
      return res.status(400).send({
        success: false,
        message: "Resi has been cancelled",
      });
    }

    // Get current process status
    const [currentProcess] = await mysqlPool.query(
      `SELECT p.*, pk.nama_pekerja as processor_name, pk.username
       FROM proses p
       LEFT JOIN pekerja pk ON pk.id_pekerja = p.id_pekerja
       WHERE p.resi_id = ? 
       ORDER BY p.created_at DESC 
       LIMIT 1`,
      [resi_id]
    );

    // Check for cancelled status after getting current process
    const [cancelledCheck] = await mysqlPool.query(
      `SELECT p.*, pk.nama_pekerja, lp.created_at as cancelled_at
       FROM proses p
       JOIN log_proses lp ON p.resi_id = lp.resi_id
       JOIN pekerja pk ON lp.id_pekerja = pk.id_pekerja
       WHERE p.resi_id = ? 
       AND p.status_proses = 'cancelled'
       ORDER BY lp.created_at DESC
       LIMIT 1`,
      [resi_id]
    );

    if (cancelledCheck && cancelledCheck.length > 0) {
      if (req.file) {
        const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }
      audioPlayer.playError();
      return res.status(400).send({
        success: false,
        message: `Resi ini telah di cancel oleh ${cancelledCheck[0].nama_pekerja} pada ${new Date(cancelledCheck[0].cancelled_at).toLocaleString("id-ID")}`,
      });
    }

    const workflow = ["picker", "packing", "pickout"];
    let allowedRole;
    let nextRole;

    // Determine next allowed role and validate
    if (!currentProcess || currentProcess.length === 0) {
      if (thisPage !== "picker") {
        if (req.file) {
          const fs = require("fs");
          fs.unlinkSync(req.file.path);
        }
        audioPlayer.playError();
        return res.status(400).send({
          success: false,
          message: "Resi harus di scan oleh picker terlebih dahulu",
        });
      }

      if (!workerRoleTypes.includes("picker")) {
        if (req.file) {
          const fs = require("fs");
          fs.unlinkSync(req.file.path);
        }
        audioPlayer.playError();
        return res.status(400).send({
          success: false,
          message: "Kamu bukan bagian dari picker",
        });
      }
      allowedRole = "picker";
    } else {
      const currentIndex = workflow.indexOf(currentProcess[0].status_proses);
      nextRole = workflow[currentIndex + 1];

      // Check if worker has already scanned this resi in the current process
      const [workerPreviousScan] = await mysqlPool.query(
        `SELECT lp.*, p.username 
         FROM log_proses lp
         JOIN pekerja p ON lp.id_pekerja = p.id_pekerja
         WHERE lp.resi_id = ? AND lp.status_proses = ? AND lp.id_pekerja = ?
         ORDER BY lp.created_at DESC
         LIMIT 1`,
        [resi_id, thisPage, id_pekerja]
      );

      if (workerPreviousScan && workerPreviousScan.length > 0) {
        if (req.file) {
          const fs = require("fs");
          fs.unlinkSync(req.file.path);
        }
        audioPlayer.playError();
        return res.status(400).send({
          success: false,
          message: `Kamu sudah melakukan scan, resi akan ke proses selanjutnya ${nextRole}`,
        });
      }

      // Check if all processes are completed
      if (currentIndex === workflow.length - 1) {
        if (req.file) {
          const fs = require("fs");
          fs.unlinkSync(req.file.path);
        }
        audioPlayer.playError();
        return res.status(400).send({
          success: false,
          message: "Resi telah selesai diproses",
        });
      }

      // Check for duplicate scan in log_proses
      const [existingScan] = await mysqlPool.query(
        `SELECT proses.*, pekerja.username, pekerja.nama_pekerja
         FROM proses 
         JOIN pekerja ON proses.id_pekerja = pekerja.id_pekerja
         JOIN role_pekerja rp ON pekerja.id_pekerja = rp.id_pekerja
         JOIN bagian b ON rp.id_bagian = b.id_bagian
         WHERE proses.resi_id = ? 
         AND b.jenis_pekerja = ?
         ORDER BY proses.created_at DESC
         LIMIT 1`,
        [resi_id, thisPage]
      );

      // Validate if the current page matches the required next role
      if (thisPage !== nextRole) {
        if (req.file) {
          const fs = require("fs");
          fs.unlinkSync(req.file.path);
        }

        // If someone with same role has already scanned
        if (existingScan && existingScan.length > 0) {
          audioPlayer.playError();
          return res.status(400).send({
            success: false,
            message: `Resi ini sudah di scan oleh ${existingScan[0].nama_pekerja} pada ${new Date(existingScan[0].created_at).toLocaleString("id-ID")}`,
          });
        }

        // If wrong sequence
        audioPlayer.playError();
        return res.status(400).send({
          success: false,
          message: `Resi harus di scan ${nextRole} terlebih dahulu`,
        });
      }

      allowedRole = nextRole;
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

      if (!currentProcess || currentProcess.length === 0) {
        // If no previous process exists, INSERT new record
        [result] = await mysqlPool.query(
          `INSERT INTO proses (resi_id, id_pekerja, status_proses, gambar_resi) 
           VALUES (?, ?, ?, ?)`,
          [resi_id, id_pekerja, allowedRole, photoPath]
        );
      } else {
        // If process exists, UPDATE the existing record
        [result] = await mysqlPool.query(
          `UPDATE proses 
           SET status_proses = ?, 
               id_pekerja = ?, 
               gambar_resi = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE resi_id = ?`,
          [allowedRole, id_pekerja, photoPath, resi_id]
        );
      }

      await connection.commit();

      audioPlayer.playSuccess();
      return res.status(200).send({
        success: true,
        message: "Resi berhasil di scan",
        page: allowedRole,
        data: {
          nama_pekerja,
          username,
          proses_scan: allowedRole,
          ...(photoPath && { gambar_resi: photoPath }),
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
    audioPlayer.playError();
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
    const { thisPage, username } = req.params;
    const { date, search } = req.query;

    let query = `
      SELECT pekerja.nama_pekerja, 
             log_proses.resi_id as resi, 
             log_proses.status_proses as status, 
             log_proses.created_at as proses_scan
      FROM log_proses 
      JOIN proses ON log_proses.resi_id = proses.resi_id 
      JOIN pekerja ON log_proses.id_pekerja = pekerja.id_pekerja
      WHERE pekerja.username = ? 
      AND log_proses.status_proses = ?`;

    const queryParams = [username, thisPage];

    if (date) {
      query += ` AND DATE(log_proses.created_at) = ?`;
      queryParams.push(date);
    }

    if (search) {
      query += ` AND log_proses.resi_id LIKE ?`;
      queryParams.push(`%${search}%`);
    }

    query += ` ORDER BY log_proses.created_at DESC`;

    const [rows] = await mysqlPool.query(query, queryParams);

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

module.exports = {
  showAllData,
  scaneHandler,
  showAllActiviy,
  getActivityByName,
  showDataByResi,
  uploadPhoto,
};
