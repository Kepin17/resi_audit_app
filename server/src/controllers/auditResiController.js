const mysqlPool = require("../config/db");
const moment = require("moment");

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
      return res.status(404).send({
        success: false,
        message: "Worker not found or has no roles",
      });
    }

    const workerRoleTypes = workerRoles.map((role) => role.jenis_pekerja);
    const nama_pekerja = workerRoles[0].nama_pekerja;
    const username = workerRoles[0].username;

    // Check if worker has the role they're trying to use
    if (!workerRoleTypes.includes(thisPage)) {
      if (req.file) {
        const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).send({
        success: false,
        message: `Kamu bukan bagian dari ${thisPage}`,
      });
    }

    // Check if resi exists and its status
    const [checkBarangRow] = await mysqlPool.query("SELECT * FROM barang WHERE resi_id = ?", [resi_id]);

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

    if (checkBarangRow[0].status_barang === "cancelled") {
      if (req.file) {
        const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }
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
      const formattedDate = moment(cancelledCheck[0].cancelled_at).format("DD MMM YYYY HH:mm:ss");
      return res.status(400).send({
        success: false,
        message: `Resi ini telah di cancel oleh ${cancelledCheck[0].nama_pekerja} pada ${formattedDate}`,
      });
    }

    const workflow = ["picker", "packing", "pickout"];
    
    // Handle the case where no process exists (first scan)
    if (!currentProcess || currentProcess.length === 0) {
      if (thisPage !== "picker") {
        if (req.file) {
          const fs = require("fs");
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).send({
          success: false,
          message: "Resi harus discan oleh picker terlebih dahulu",
        });
      }
      
      // This is a valid first scan by a picker
      const allowedRole = "picker";
      
      // Process the scan with transaction
      return await processScan(req, res, allowedRole, id_pekerja, resi_id, nama_pekerja, username);
    }
    
    // For existing processes, determine where we are in the workflow
    const currentStatus = currentProcess[0].status_proses;
    const currentIndex = workflow.indexOf(currentStatus);
    
    // Check if all processes are completed
    if (currentIndex === workflow.length - 1) {
      if (req.file) {
        const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).send({
        success: false,
        message: "Resi telah selesai diproses",
      });
    }
    
    // Determine what the next expected role should be
    const expectedNextRole = workflow[currentIndex + 1];
    
    // Check if worker is trying to scan with the wrong role
    if (thisPage !== expectedNextRole) {
      if (req.file) {
        const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }


          
    // Check if this specific worker has already scanned this resi in the current role
    const [workerPreviousScan] = await mysqlPool.query(
      `SELECT lp.*, p.username, p.nama_pekerja
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
      const formattedDate = moment(workerPreviousScan[0].created_at).format("DD MMM YYYY HH:mm:ss");
      return res.status(400).send({
        success: false,
        message: `Kamu sudah melakukan scan pada ${formattedDate}`,
      });
    }
    
      
      // Check if this role has already scanned this resi
      const [roleScanCheck] = await mysqlPool.query(
        `SELECT proses.*, pekerja.username, pekerja.nama_pekerja
         FROM proses 
         JOIN pekerja ON proses.id_pekerja = pekerja.id_pekerja
         WHERE proses.resi_id = ? 
         AND proses.status_proses = ?
         ORDER BY proses.created_at DESC
         LIMIT 1`,
        [resi_id, thisPage]
      );
      
      if (roleScanCheck && roleScanCheck.length > 0) {
        // This role has already scanned this resi
        const formattedDate = moment(roleScanCheck[0].created_at).format("DD MMM YYYY HH:mm:ss");
        return res.status(400).send({
          success: false,
          message: `Resi ini sudah di scan oleh ${thisPage} (${roleScanCheck[0].nama_pekerja}) pada ${formattedDate}`,
        });
      } else {
        // The sequence is wrong - this role is not the next in line
          return res.status(400).send({
            success: false,
            message: `Resi harus di scan ke ${expectedNextRole}. proses terakhir : ${currentStatus} `,
          });
      }
    }

    // This is a valid scan - process it
    return await processScan(req, res, expectedNextRole, id_pekerja, resi_id, nama_pekerja, username);
    
  } catch (error) {
    if (req.file) {
      const fs = require("fs");
      fs.unlinkSync(req.file.path);
    }
    handleError(error, res, "processing scan and photo");
  }
};

// Helper function to process valid scans
const processScan = async (req, res, role, id_pekerja, resi_id, nama_pekerja, username) => {
  // Handle photo upload
  let photoPath = null;
  if (req.file) {
    // Store only the filename, not the full path
    photoPath = req.file.filename;
  }

  // Process the scan with transaction
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();

    // Update the existing record
    [result] = await connection.query(
      `UPDATE proses 
       SET status_proses = ?, 
           id_pekerja = ?, 
           gambar_resi = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE resi_id = ?`,
      [role, id_pekerja, photoPath, resi_id]
    );
    
   
    await connection.commit();

    return res.status(200).send({
      success: true,
      message: "Resi berhasil di scan",
      page: role,
      data: {
        nama_pekerja,
        username,
        proses_scan: role,
        ...(photoPath && { gambar_resi: photoPath }),
      },
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
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
    const { date, search, page = 1, limit = 5 } = req.query;
    const offset = (page - 1) * limit;

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

    // Get total count for pagination
    const [totalRows] = await mysqlPool.query(`SELECT COUNT(*) as total FROM (${query}) as count_table`, queryParams);

    query += ` ORDER BY log_proses.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), offset);

    const [rows] = await mysqlPool.query(query, queryParams);

    res.status(200).send({
      success: true,
      message: "Data found",
      data: rows || [],
      pagination: {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        totalItems: totalRows[0].total,
        totalPages: Math.ceil(totalRows[0].total / parseInt(limit)),
      },
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
    const uploadPath = path.join("/var/www/html/uploads", fileName);

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
        // Update the database with only the filename, not the full path
        const query = `
          UPDATE proses 
          SET gambar_resi = ?
          WHERE resi_id = ? 
          ORDER BY updated_at DESC 
          LIMIT 1`;

        await mysqlPool.query(query, [fileName, resi_id]);

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

const getActivityNotComplited = async (req, res) => {
  try {
    const { thisPage } = req.params;
    const { date, search, page = 1, limit = 5 } = req.query;
    const offset = (page - 1) * limit;

    let statusToCheck;
    if (thisPage === "picker") {
      statusToCheck = "pending";
    } else if (thisPage === "packing") {
      statusToCheck = "picker";
    } else {
      statusToCheck = "packing";
    }

    let query = `
      SELECT 
        proses.resi_id as resi, 
        proses.status_proses as status, 
        proses.created_at as proses_scan,
        pekerja.nama_pekerja
      FROM proses 
      LEFT JOIN pekerja ON proses.id_pekerja = pekerja.id_pekerja
      WHERE proses.status_proses = ?`;

    const queryParams = [statusToCheck];

    if (date) {
      query += ` AND DATE(proses.created_at) = ?`;
      queryParams.push(date);
    }

    if (search) {
      query += ` AND proses.resi_id LIKE ?`;
      queryParams.push(`%${search}%`);
    }

    // Get total count for pagination
    const [totalRows] = await mysqlPool.query(`SELECT COUNT(*) as total FROM (${query}) as count_table`, queryParams);

    query += ` ORDER BY proses.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), offset);

    const [rows] = await mysqlPool.query(query, queryParams);

    const [totalCountNoLimit] = await mysqlPool.query(`SELECT COUNT(*) as total FROM (${query.replace("LIMIT ? OFFSET ?", "")}) as count_table`, queryParams.slice(0, -2)); 

    res.status(200).send({
      success: true,
      message: "Data found",
      data: rows || [],
      totalData: totalCountNoLimit[0].total,
      pagination: {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        totalItems: totalRows[0].total,
        totalPages: Math.ceil(totalRows[0].total / parseInt(limit)),
      },
    });
  } catch (error) {
    handleError(error, res, "fetching activities not completed");
  }
};

const getExpeditionCounts = async (req, res) => {
  try {
    const { startDate, endDate, selectedDate } = req.query;

    let query = `
      SELECT 
        ekpedisi.nama_ekspedisi,
        COUNT(barang.resi_id) as total_resi
      FROM barang
      JOIN ekpedisi ON barang.id_ekspedisi = ekpedisi.id_ekspedisi
      JOIN proses ON barang.resi_id = proses.resi_id
      WHERE proses.status_proses != 'cancelled' AND proses.status_proses = "pickout"
    `;

    const queryParams = [];

    if (startDate && endDate) {
      query += ` WHERE barang.created_at BETWEEN ? AND ?`;
      queryParams.push(startDate + " 00:00:00", endDate + " 23:59:59");
    }
    if (selectedDate) {
      query += ` WHERE DATE(barang.created_at) = ?`;
      queryParams.push(selectedDate);
    }

    query += ` GROUP BY ekpedisi.nama_ekspedisi`;

    const [rows] = await mysqlPool.query(query, queryParams);

    res.status(200).send({
      success: true,
      message: "Data found",
      data: rows,
    });
  } catch (error) {
    handleError(error, res, "fetching expedition counts");
  }
};

module.exports = {
  showAllData,
  scaneHandler,
  showAllActiviy,
  getActivityByName,
  showDataByResi,
  uploadPhoto,
  getActivityNotComplited,
  getExpeditionCounts,
};
