const mysqlPool = require("../config/db");
const moment = require("moment");

// Add mapping constants for log tables and columns
const logTableMap = {
  picker: "log_proses_picker",
  packing: "log_proses_packing",
  pickout: "log_proses_pickout",
  cancelled: "log_proses_cancelled",
  konfirmasi: "log_proses_validated",
};

const resiColumnMap = {
  picker: "resi_id_picker",
  packing: "resi_id_packing",
  pickout: "resi_id_pickout",
  cancelled: "resi_id_cancelled",
  konfirmasi: "resi_id_validated",
};

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
  // Get a connection from the pool for transaction
  const connection = await mysqlPool.getConnection();

  try {
    await connection.beginTransaction();

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
    const [workerRoles] = await connection.query(
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
      await connection.rollback();
      connection.release();
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
      await connection.rollback();
      connection.release();
      return res.status(403).send({
        success: false,
        message: `Kamu bukan bagian dari ${thisPage}`,
      });
    }

    // Check if resi exists and its status
    const [checkBarangRow] = await connection.query("SELECT * FROM barang WHERE resi_id = ?", [resi_id]);

    if (checkBarangRow.length === 0) {
      if (req.file) {
        const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }
      await connection.rollback();
      connection.release();
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
      await connection.rollback();
      connection.release();
      return res.status(400).send({
        success: false,
        message: "Resi has been cancelled",
      });
    }

    // Get the appropriate log table and column based on the process type
    const specificLogTable = logTableMap[thisPage];
    const resiColumn = resiColumnMap[thisPage];

    if (!specificLogTable || !resiColumn) {
      if (req.file) {
        const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }
      await connection.rollback();
      connection.release();
      return res.status(400).send({
        success: false,
        message: "Invalid process type",
      });
    }

    // Add check for duplicate scan in the current status
    const [existingScans] = await connection.query(`SELECT * FROM ${specificLogTable} WHERE ${resiColumn} = ?`, [resi_id]);

    // Check for cancelled status
    const [cancelledCheck] = await connection.query(`SELECT * FROM log_proses_cancelled WHERE resi_id_cancelled = ?`, [resi_id]);

    if (cancelledCheck && cancelledCheck.length > 0) {
      if (req.file) {
        const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }

      // Get worker name who cancelled it
      const [cancelWorker] = await connection.query(`SELECT nama_pekerja FROM pekerja WHERE id_pekerja = ?`, [cancelledCheck[0].id_pekerja]);

      const cancellerName = cancelWorker.length > 0 ? cancelWorker[0].nama_pekerja : "Unknown";
      const formattedDate = moment(cancelledCheck[0].created_at).format("DD MMM YYYY HH:mm:ss");

      await connection.rollback();
      connection.release();
      return res.status(400).send({
        success: false,
        message: `Resi ini telah di cancel oleh ${cancellerName} pada ${formattedDate}`,
      });
    }

    if (existingScans && existingScans.length > 0) {
      if (req.file) {
        const fs = require("fs");
        fs.unlinkSync(req.file.path);
      }

      // Get worker name who did the scan
      const [scanWorker] = await connection.query(`SELECT nama_pekerja FROM pekerja WHERE id_pekerja = ?`, [existingScans[0].id_pekerja]);

      const scannerName = scanWorker.length > 0 ? scanWorker[0].nama_pekerja : "Unknown";
      const formattedDate = moment(existingScans[0].created_at).format("DD MMM YYYY HH:mm:ss");

      await connection.rollback();
      connection.release();
      return res.status(400).send({
        success: false,
        message: `Resi ini sudah di scan dengan status ${thisPage} oleh ${scannerName} pada ${formattedDate}`,
      });
    }

    // Get current process status
    const [currentProcess] = await connection.query(
      `SELECT p.*, pk.nama_pekerja as processor_name, pk.username
       FROM proses p
       LEFT JOIN pekerja pk ON pk.id_pekerja = p.id_pekerja
       WHERE p.resi_id = ? 
       ORDER BY p.created_at DESC 
       LIMIT 1`,
      [resi_id]
    );

    const workflow = ["picker", "packing", "pickout"];

    // Handle the case where no process exists (first scan)
    if (!currentProcess || currentProcess.length === 0) {
      if (thisPage !== "picker") {
        if (req.file) {
          const fs = require("fs");
          fs.unlinkSync(req.file.path);
        }
        await connection.rollback();
        connection.release();
        return res.status(400).send({
          success: false,
          message: "Resi harus discan oleh picker terlebih dahulu",
        });
      }

      // This is a valid first scan by a picker
      return await processScan(req, res, connection);
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
      await connection.rollback();
      connection.release();
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
      const specificTable = logTableMap[thisPage];
      const specificColumn = resiColumnMap[thisPage];

      const [workerPreviousScan] = await connection.query(
        `SELECT * FROM ${specificTable} 
         WHERE ${specificColumn} = ? AND id_pekerja = ?`,
        [resi_id, id_pekerja]
      );

      if (workerPreviousScan && workerPreviousScan.length > 0) {
        moment.locale("id");
        const formattedDate = moment(workerPreviousScan[0].created_at).format("DD MMM YYYY - HH:mm:ss");

        await connection.rollback();
        connection.release();
        return res.status(400).send({
          success: false,
          message: `Kamu sudah melakukan scan pada ${formattedDate}`,
        });
      }

      // The sequence is wrong - this role is not the next in line
      await connection.rollback();
      connection.release();
      return res.status(400).send({
        success: false,
        message: `Resi harus di scan ke ${expectedNextRole}. proses terakhir : ${currentStatus}`,
      });
    }

    // This is a valid scan - process it
    return await processScan(req, res, connection);
  } catch (error) {
    if (req.file) {
      const fs = require("fs");
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        /* ignore */
      }
    }

    await connection.rollback();
    connection.release();
    handleError(error, res, "processing scan and photo");
  }
};

// Helper function to process valid scans
const processScan = async (req, res, connection) => {
  try {
    const { id_pekerja, thisPage } = req.body;
    const { resi_id } = req.params;

    let photoPath = null;
    if (req.file) {
      photoPath = req.file.filename;
    }

    // Use the existing table maps from parent scope
    const specificLogTable = logTableMap[thisPage];
    const resiColumn = resiColumnMap[thisPage];

    if (!specificLogTable) {
      throw new Error("Invalid process type");
    }

    // Generate unique log ID
    const logId = `LOG${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Insert into specific log table and main log table in transaction
    await connection.query(
      `INSERT INTO ${specificLogTable} (${resiColumn}, id_pekerja, status_proses, gambar_resi) 
       VALUES (?, ?, ?, ?)`,
      [resi_id, id_pekerja, thisPage, photoPath]
    );

    await connection.query(
      `INSERT INTO log_proses (id_log, ${resiColumn}) 
       VALUES (?, ?)`,
      [logId, resi_id]
    );

    // Update proses table
    await connection.query(
      `UPDATE proses 
       SET status_proses = ?, 
           id_pekerja = ?, 
           gambar_resi = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE resi_id = ?`,
      [thisPage, id_pekerja, photoPath, resi_id]
    );

    await connection.commit();

    return res.status(200).send({
      success: true,
      message: "Resi berhasil di scan",
      page: thisPage,
      data: {
        resi_id,
        status: thisPage,
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
    const query = `
      SELECT 
        p.nama_pekerja,
        COALESCE(lpp.resi_id_picker, lpk.resi_id_packing, lpo.resi_id_pickout, 
                 lpc.resi_id_cancelled, lpv.resi_id_validated) as resi,
        COALESCE(lpp.status_proses, lpk.status_proses, lpo.status_proses,
                 lpc.status_proses, lpv.status_proses) as status,
        COALESCE(lpp.created_at, lpk.created_at, lpo.created_at,
                 lpc.created_at, lpv.created_at) as proses_scan
      FROM log_proses l
      LEFT JOIN log_proses_picker lpp ON l.resi_id_picker = lpp.resi_id_picker
      LEFT JOIN log_proses_packing lpk ON l.resi_id_packing = lpk.resi_id_packing
      LEFT JOIN log_proses_pickout lpo ON l.resi_id_pickout = lpo.resi_id_pickout
      LEFT JOIN log_proses_cancelled lpc ON l.resi_id_cancelled = lpc.resi_id_cancelled
      LEFT JOIN log_proses_validated lpv ON l.resi_id_validated = lpv.resi_id_validated
      JOIN pekerja p ON p.id_pekerja IN (
        lpp.id_pekerja, lpk.id_pekerja, lpo.id_pekerja,
        lpc.id_pekerja, lpv.id_pekerja
      )
      ORDER BY proses_scan DESC`;

    const [rows] = await mysqlPool.query(query);

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

    // Get the appropriate log table and column name for this page type
    const specificLogTable = logTableMap[thisPage];
    const resiColumn = resiColumnMap[thisPage];

    if (!specificLogTable || !resiColumn) {
      return res.status(400).send({
        success: false,
        message: "Invalid page type",
      });
    }

    // Base query using the specific log table
    let query = `
      SELECT 
        pekerja.nama_pekerja, 
        ${specificLogTable}.${resiColumn} as resi, 
        ${specificLogTable}.status_proses as status, 
        ${specificLogTable}.created_at as proses_scan
      FROM ${specificLogTable}  
      JOIN pekerja ON ${specificLogTable}.id_pekerja = pekerja.id_pekerja
      WHERE pekerja.username = ?`;

    const queryParams = [username];

    // Add date filter if provided
    if (date) {
      query += ` AND DATE(${specificLogTable}.created_at) = ?`;
      queryParams.push(date);
    }

    // Add search filter if provided
    if (search) {
      query += ` AND ${specificLogTable}.${resiColumn} LIKE ?`;
      queryParams.push(`%${search}%`);
    }

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as count_table`;
    const [totalRows] = await mysqlPool.query(countQuery, queryParams);

    // Add pagination
    query += ` ORDER BY ${specificLogTable}.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), offset);

    const [rows] = await mysqlPool.query(query, queryParams);

    // Get total scans for today for this worker and page type
    const todayQuery = `
      SELECT COUNT(*) as todayTotal
      FROM ${specificLogTable}
      JOIN pekerja ON ${specificLogTable}.id_pekerja = pekerja.id_pekerja
      WHERE pekerja.username = ?
      AND DATE(${specificLogTable}.created_at) = CURDATE()`;

    const [todayTotal] = await mysqlPool.query(todayQuery, [username]);

    res.status(200).send({
      success: true,
      message: "Data found",
      data: rows || [],
      todayScans: todayTotal[0].todayTotal,
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

    // Query each log table for this resi
    const queries = [];
    const allResults = [];

    // For each log table type, check if this resi exists
    for (const [processType, logTable] of Object.entries(logTableMap)) {
      const resiColumn = resiColumnMap[processType];

      const query = `
        SELECT 
          pekerja.nama_pekerja,
          ${logTable}.${resiColumn} as resi,
          ${logTable}.status_proses as status,
          ${logTable}.created_at as proses_scan
          ${logTable}.gambar_resi as gambar_resi
        FROM ${logTable}
        JOIN pekerja ON ${logTable}.id_pekerja = pekerja.id_pekerja
        WHERE ${logTable}.${resiColumn} = ?`;

      queries.push(mysqlPool.query(query, [resi_id]));
    }

    // Execute all queries in parallel
    const results = await Promise.all(queries);

    // Combine results from all tables
    for (const result of results) {
      if (result[0] && result[0].length > 0) {
        allResults.push(...result[0]);
      }
    }

    if (allResults.length === 0) {
      return res.status(404).send({
        success: false,
        message: `No data found for resi ID: ${resi_id}`,
      });
    }

    // Sort by timestamp
    allResults.sort((a, b) => new Date(a.proses_scan) - new Date(b.proses_scan));

    res.status(200).send({
      success: true,
      message: "Data found",
      data: allResults,
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

    const baseCountQuery = `
    SELECT COUNT(*) as total 
    FROM proses 
    WHERE status_proses = ?`;

    const [totalCountNoLimit] = await mysqlPool.query(baseCountQuery, [statusToCheck]);
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
    const { selectedDate } = req.query;

    // Set date range for today by default or selected date
    const targetDate = selectedDate ? moment(selectedDate) : moment();

    // Set start and end of the day
    const startDateTime = targetDate.format("YYYY-MM-DD 00:00:00");
    const endDateTime = targetDate.format("YYYY-MM-DD 23:59:59");

    // Modified query to include all expeditions and their pickout counts
    const query = `
      SELECT 
        e.nama_ekspedisi,
        e.id_ekspedisi,
        COUNT(DISTINCT CASE 
          WHEN p.status_proses = 'pickout' 
          AND p.updated_at BETWEEN ? AND ? 
          THEN b.resi_id 
          ELSE NULL 
        END) as total_resi
      FROM ekpedisi e
      LEFT JOIN barang b ON e.id_ekspedisi = b.id_ekspedisi
      LEFT JOIN proses p ON b.resi_id = p.resi_id
      GROUP BY e.id_ekspedisi, e.nama_ekspedisi
      HAVING total_resi > 0
      ORDER BY total_resi DESC`;

    const [rows] = await mysqlPool.query(query, [startDateTime, endDateTime]);

    // Get total pickout counts for the date range
    const totalQuery = `
      SELECT COUNT(DISTINCT p.resi_id) as total_all_resi
      FROM proses p
      WHERE p.status_proses = 'pickout'
      AND p.updated_at BETWEEN ? AND ?`;

    const [totalCounts] = await mysqlPool.query(totalQuery, [startDateTime, endDateTime]);

    // Format the response data
    const expeditionData = rows.map((row) => ({
      expedition_id: row.id_ekspedisi,
      name: row.nama_ekspedisi,
      total_resi: parseInt(row.total_resi) || 0,
    }));

    res.status(200).send({
      success: true,
      message: "Data found",
      date: targetDate.format("YYYY-MM-DD"),
      total_overall: totalCounts[0].total_all_resi || 0,
      data: expeditionData,
    });
  } catch (error) {
    console.error("Expedition count error:", error);
    handleError(error, res, "fetching expedition counts");
  }
};

const getStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Format dates or use defaults (current day)
    const start = startDate ? moment(startDate).format("YYYY-MM-DD 00:00:00") : moment().format("YYYY-MM-DD 00:00:00");
    const end = endDate ? moment(endDate).format("YYYY-MM-DD 23:59:59") : moment().format("YYYY-MM-DD 23:59:59");

    // Query to get counts from each specific log table based on dates
    const pickerQuery = `
      SELECT COUNT(*) as count 
      FROM log_proses_picker 
      WHERE created_at BETWEEN ? AND ?`;

    const packingQuery = `
      SELECT COUNT(*) as count 
      FROM log_proses_packing 
      WHERE created_at BETWEEN ? AND ?`;

    const pickoutQuery = `
      SELECT COUNT(*) as count 
      FROM log_proses_pickout 
      WHERE created_at BETWEEN ? AND ?`;

    const cancelledQuery = `
      SELECT COUNT(*) as count 
      FROM log_proses_cancelled 
      WHERE created_at BETWEEN ? AND ?`;

    // Execute all queries in parallel
    const [pickerCount, packingCount, pickoutCount, cancelledCount] = await Promise.all([
      mysqlPool.query(pickerQuery, [start, end]),
      mysqlPool.query(packingQuery, [start, end]),
      mysqlPool.query(pickoutQuery, [start, end]),
      mysqlPool.query(cancelledQuery, [start, end]),
    ]);

    // Count by date query for each process type
    const countsByDateQueries = [];
    for (const [processType, logTable] of Object.entries(logTableMap)) {
      if (processType === "konfirmasi") continue; // Skip if not needed

      const query = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM ${logTable}
        WHERE created_at BETWEEN ? AND ?
        GROUP BY DATE(created_at)
        ORDER BY date ASC`;

      countsByDateQueries.push({
        type: processType,
        promise: mysqlPool.query(query, [start, end]),
      });
    }

    // Execute all date-based queries
    const countsByDateResults = await Promise.all(countsByDateQueries.map((item) => item.promise));

    // Format counts by date
    const countsByDate = {};
    countsByDateQueries.forEach((item, index) => {
      countsByDate[item.type] = countsByDateResults[index][0].reduce((acc, row) => {
        const dateStr = moment(row.date).format("YYYY-MM-DD");
        acc[dateStr] = row.count;
        return acc;
      }, {});
    });

    // Generate all dates in range
    const allDates = [];
    const startMoment = moment(start);
    const endMoment = moment(end);

    for (let m = startMoment; m.isSameOrBefore(endMoment); m.add(1, "days")) {
      allDates.push(m.format("YYYY-MM-DD"));
    }

    // Format final response
    const dailyStats = allDates.map((date) => {
      const result = { date };

      for (const type of Object.keys(countsByDate)) {
        result[type] = countsByDate[type][date] || 0;
      }

      return result;
    });

    res.status(200).send({
      success: true,
      message: "Statistics retrieved successfully",
      period: {
        start: moment(start).format("YYYY-MM-DD"),
        end: moment(end).format("YYYY-MM-DD"),
      },
      totals: {
        picker: pickerCount[0][0].count,
        packing: packingCount[0][0].count,
        pickout: pickoutCount[0][0].count,
        cancelled: cancelledCount[0][0].count,
      },
      dailyStats,
    });
  } catch (error) {
    handleError(error, res, "fetching statistics");
  }
};

const getWorkerStatistics = async (req, res) => {
  try {
    const { startDate, endDate, processType = "all" } = req.query;

    // Format dates or use defaults (current day)
    const start = startDate ? moment(startDate).format("YYYY-MM-DD 00:00:00") : moment().format("YYYY-MM-DD 00:00:00");
    const end = endDate ? moment(endDate).format("YYYY-MM-DD 23:59:59") : moment().format("YYYY-MM-DD 23:59:59");

    const workerStatsQueries = [];

    if (processType === "all") {
      // Query all process types
      for (const [type, logTable] of Object.entries(logTableMap)) {
        // Skip konfirmasi if not needed
        if (type === "konfirmasi") continue;

        const query = `
          SELECT 
            p.id_pekerja,
            p.nama_pekerja,
            '${type}' as process_type,
            COUNT(*) as count
          FROM ${logTable} l
          JOIN pekerja p ON l.id_pekerja = p.id_pekerja
          WHERE l.created_at BETWEEN ? AND ?
          GROUP BY p.id_pekerja, p.nama_pekerja
          ORDER BY count DESC`;

        workerStatsQueries.push({
          type,
          promise: mysqlPool.query(query, [start, end]),
        });
      }
    } else {
      // Query specific process type
      const logTable = logTableMap[processType];
      if (!logTable) {
        return res.status(400).send({
          success: false,
          message: `Invalid process type: ${processType}`,
        });
      }

      const query = `
        SELECT 
          p.id_pekerja,
          p.nama_pekerja,
          '${processType}' as process_type,
          COUNT(*) as count
        FROM ${logTable} l
        JOIN pekerja p ON l.id_pekerja = p.id_pekerja
        WHERE l.created_at BETWEEN ? AND ?
        GROUP BY p.id_pekerja, p.nama_pekerja
        ORDER BY count DESC`;

      workerStatsQueries.push({
        type: processType,
        promise: mysqlPool.query(query, [start, end]),
      });
    }

    // Execute all queries
    const workerStatsResults = await Promise.all(workerStatsQueries.map((item) => item.promise));

    // Format worker stats
    const workerStatsByType = {};
    workerStatsQueries.forEach((item, index) => {
      workerStatsByType[item.type] = workerStatsResults[index][0];
    });

    // Calculate overall rankings
    let allWorkerStats = [];
    for (const type in workerStatsByType) {
      for (const stat of workerStatsByType[type]) {
        // Enrich data with process type
        allWorkerStats.push({
          ...stat,
          processType: type,
        });
      }
    }

    // Get overall workers stats
    const overallWorkerStats = Object.values(
      allWorkerStats.reduce((acc, stat) => {
        const { id_pekerja, nama_pekerja } = stat;

        if (!acc[id_pekerja]) {
          acc[id_pekerja] = {
            id_pekerja,
            nama_pekerja,
            total_count: 0,
            process_counts: {},
          };
        }

        acc[id_pekerja].total_count += stat.count;
        acc[id_pekerja].process_counts[stat.processType] = stat.count;

        return acc;
      }, {})
    ).sort((a, b) => b.total_count - a.total_count);

    res.status(200).send({
      success: true,
      message: "Worker statistics retrieved successfully",
      period: {
        start: moment(start).format("YYYY-MM-DD"),
        end: moment(end).format("YYYY-MM-DD"),
      },
      processTypeStats: workerStatsByType,
      overallStats: overallWorkerStats,
    });
  } catch (error) {
    handleError(error, res, "fetching worker statistics");
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
  getStatistics, // Added new function
  getWorkerStatistics, // Added new function
};
