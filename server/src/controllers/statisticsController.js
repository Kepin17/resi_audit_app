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

const getStatistics = async (req, res) => {
  try {
    const { period = "daily" } = req.query;
    let dateFormat = "";
    let timeInterval = "";

    // Set date format and time interval based on requested period
    switch (period) {
      case "daily":
        dateFormat = "%Y-%m-%d %H:00:00";
        timeInterval = "INTERVAL 1 DAY";
        break;
      case "weekly":
        dateFormat = "%Y-%m-%d";
        timeInterval = "INTERVAL 1 WEEK";
        break;
      case "monthly":
        dateFormat = "%Y-%m-%d";
        timeInterval = "INTERVAL 1 MONTH";
        break;
      case "yearly":
        dateFormat = "%Y-%m";
        timeInterval = "INTERVAL 1 YEAR";
        break;
      default:
        dateFormat = "%Y-%m-%d %H:00:00";
        timeInterval = "INTERVAL 1 DAY";
    }

    // Build queries for each process type
    const processTypes = ["picker", "packing", "pickout", "cancelled"];
    const queries = [];

    for (const processType of processTypes) {
      const logTable = logTableMap[processType];
      const resiColumn = resiColumnMap[processType];

      // Skip if table mapping isn't defined
      if (!logTable || !resiColumn) continue;

      const query = `
        SELECT 
          DATE_FORMAT(created_at, ?) as date,
          '${processType}' as process_type,
          COUNT(DISTINCT ${resiColumn}) as count
        FROM ${logTable}
        WHERE created_at >= DATE_SUB(NOW(), ${timeInterval})
        GROUP BY DATE_FORMAT(created_at, ?)
      `;

      queries.push(mysqlPool.query(query, [dateFormat, dateFormat]));
    }

    // Execute all queries in parallel
    const results = await Promise.all(queries);

    // Combine results and reorganize by date
    const dateData = {};

    processTypes.forEach((type, index) => {
      if (results[index] && results[index][0]) {
        const rows = results[index][0];

        rows.forEach((row) => {
          if (!dateData[row.date]) {
            dateData[row.date] = {
              date: row.date,
              picker: 0,
              packing: 0,
              pickout: 0,
              cancelled: 0,
              total_resi: 0,
            };
          }

          dateData[row.date][row.process_type] = parseInt(row.count);
          dateData[row.date].total_resi += parseInt(row.count);
        });
      }
    });

    // Get active workers count
    const workersQuery = `
      SELECT 
        DATE_FORMAT(lp.created_at, ?) as date,
        COUNT(DISTINCT lp.id_pekerja) as active_workers
      FROM (
        SELECT id_pekerja, created_at FROM log_proses_picker
        UNION ALL
        SELECT id_pekerja, created_at FROM log_proses_packing
        UNION ALL
        SELECT id_pekerja, created_at FROM log_proses_pickout
      ) lp
      WHERE lp.created_at >= DATE_SUB(NOW(), ${timeInterval})
      GROUP BY DATE_FORMAT(lp.created_at, ?)
    `;

    const [workersResults] = await mysqlPool.query(workersQuery, [dateFormat, dateFormat]);

    // Add worker count to date data
    workersResults.forEach((row) => {
      if (dateData[row.date]) {
        dateData[row.date].active_workers = parseInt(row.active_workers);
      }
    });

    // Convert to array and calculate efficiency
    const processedData = Object.values(dateData).map((row) => ({
      ...row,
      active_workers: row.active_workers || 0,
      efficiency: calculateEfficiency(row),
    }));

    // Sort by date
    const sortedData = processedData.sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf());

    // Calculate overall statistics
    const overallStats = calculateOverallStats(processedData);

    res.json({
      success: true,
      data: sortedData,
      summary: {
        total_picked: processedData.reduce((sum, item) => sum + item.picker, 0),
        total_packed: processedData.reduce((sum, item) => sum + item.packing, 0),
        total_pickout: processedData.reduce((sum, item) => sum + item.pickout, 0),
        total_resi_processed: processedData.reduce((sum, item) => sum + item.total_resi, 0),
        average_workers_per_period: Math.round(processedData.reduce((sum, item) => sum + item.active_workers, 0) / processedData.length || 1),
        overall_efficiency: overallStats.efficiency,
        peak_period: overallStats.peakPeriod,
      },
    });
  } catch (error) {
    console.error("Statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message,
    });
  }
};

// Helper functions for statistics calculations
const calculateEfficiency = (row) => {
  const totalProcessed = row.picker + row.packing + row.pickout;
  const workersInvolved = row.active_workers || 1;
  return parseFloat((totalProcessed / workersInvolved).toFixed(2));
};

const calculateOverallStats = (data) => {
  let maxEfficiency = 0;
  let peakPeriod = null;
  let totalEfficiency = 0;
  let validPeriods = 0;

  data.forEach((item) => {
    if (item.efficiency > 0) {
      totalEfficiency += item.efficiency;
      validPeriods++;

      if (item.efficiency > maxEfficiency) {
        maxEfficiency = item.efficiency;
        peakPeriod = item.date;
      }
    }
  });

  return {
    efficiency: validPeriods ? (totalEfficiency / validPeriods).toFixed(2) : 0,
    peakPeriod,
  };
};

const getWorkerStatistics = async (req, res) => {
  try {
    const { period = "daily" } = req.query;
    let dateFilter;

    switch (period) {
      case "daily":
        dateFilter = "DATE(l.created_at) = CURDATE()";
        break;
      case "weekly":
        dateFilter = "l.created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)";
        break;
      case "monthly":
        dateFilter = "l.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
        break;
      case "yearly":
        dateFilter = "l.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
        break;
      default:
        dateFilter = "DATE(l.created_at) = CURDATE()";
    }

    // Get data for each process type separately
    const processTypes = ["picker", "packing", "pickout"];
    const workerData = {};

    for (const processType of processTypes) {
      const logTable = logTableMap[processType];
      const resiColumn = resiColumnMap[processType];

      if (!logTable || !resiColumn) continue;

      const query = `
        SELECT 
          p.id_pekerja,
          p.nama_pekerja,
          COUNT(DISTINCT l.${resiColumn}) as count,
          MIN(l.created_at) as first_scan,
          MAX(l.created_at) as last_scan,
          COUNT(DISTINCT DATE_FORMAT(l.created_at, '%Y-%m-%d %H:00:00')) as active_hours
        FROM ${logTable} l
        JOIN pekerja p ON l.id_pekerja = p.id_pekerja
        WHERE ${dateFilter}
        GROUP BY p.id_pekerja, p.nama_pekerja
      `;

      const [results] = await mysqlPool.query(query);

      results.forEach((row) => {
        if (!workerData[row.id_pekerja]) {
          workerData[row.id_pekerja] = {
            id_pekerja: row.id_pekerja,
            nama_pekerja: row.nama_pekerja,
            picker_count: 0,
            packing_count: 0,
            pickout_count: 0,
            total_scans: 0,
            unique_resis: 0,
            first_scan: row.first_scan,
            last_scan: row.last_scan,
            active_hours: row.active_hours || 0,
          };
        }

        // Update data for this worker
        workerData[row.id_pekerja][`${processType}_count`] = parseInt(row.count);
        workerData[row.id_pekerja].total_scans += parseInt(row.count);
        workerData[row.id_pekerja].unique_resis += parseInt(row.count);

        // Update first & last scan times if needed
        if (row.first_scan && (!workerData[row.id_pekerja].first_scan || new Date(row.first_scan) < new Date(workerData[row.id_pekerja].first_scan))) {
          workerData[row.id_pekerja].first_scan = row.first_scan;
        }

        if (row.last_scan && (!workerData[row.id_pekerja].last_scan || new Date(row.last_scan) > new Date(workerData[row.id_pekerja].last_scan))) {
          workerData[row.id_pekerja].last_scan = row.last_scan;
        }

        workerData[row.id_pekerja].active_hours = Math.max(workerData[row.id_pekerja].active_hours, row.active_hours || 0);
      });
    }

    // Convert to array and calculate additional metrics
    const processedData = Object.values(workerData)
      .filter((worker) => worker.total_scans > 0)
      .map((worker) => {
        const hoursWorked = worker.first_scan && worker.last_scan ? Math.max(0.01, moment(worker.last_scan).diff(moment(worker.first_scan), "hours", true)) : 0.01;

        const scansPerHour = worker.total_scans / hoursWorked;

        // Calculate completion rate and process efficiency
        const completionRate = ((worker.picker_count + worker.packing_count + worker.pickout_count) / (worker.total_scans * 3)) * 100;
        const fullCycles = Math.min(worker.picker_count, worker.packing_count, worker.pickout_count);

        // Calculate weighted performance score
        const weightedScore = ((worker.picker_count * 1.0 + worker.packing_count * 1.2 + worker.pickout_count * 1.5 + fullCycles * 2.0) / (worker.total_scans || 1)) * 100;

        return {
          ...worker,
          hours_worked: worker.active_hours,
          scans_per_hour: scansPerHour.toFixed(2),
          performance_score: Math.min(100, weightedScore).toFixed(2),
          efficiency_stats: {
            completion_rate: completionRate.toFixed(1),
            picker_ratio: ((worker.picker_count / worker.total_scans) * 100).toFixed(1),
            packing_ratio: ((worker.packing_count / worker.total_scans) * 100).toFixed(1),
            pickout_ratio: ((worker.pickout_count / worker.total_scans) * 100).toFixed(1),
            full_cycles: fullCycles,
            resis_per_hour: (worker.unique_resis / hoursWorked).toFixed(2),
          },
        };
      })
      .sort((a, b) => b.total_scans - a.total_scans);

    // Calculate team statistics
    const teamStats = processedData.reduce(
      (acc, worker) => {
        acc.totalScans += worker.total_scans;
        acc.totalResis += worker.unique_resis;
        acc.totalPicked += worker.picker_count;
        acc.totalPacked += worker.packing_count;
        acc.totalPickout += worker.pickout_count;
        return acc;
      },
      {
        totalScans: 0,
        totalResis: 0,
        totalPicked: 0,
        totalPacked: 0,
        totalPickout: 0,
      }
    );

    res.json({
      success: true,
      data: processedData,
      period: period,
      totalWorkers: processedData.length,
      teamStats,
      overview: {
        totalScans: teamStats.totalScans,
        totalUniqueResis: teamStats.totalResis,
        averagePerformance: (processedData.reduce((sum, worker) => sum + parseFloat(worker.performance_score), 0) / (processedData.length || 1)).toFixed(2),
        topPerformer: processedData.length
          ? {
              name: processedData[0].nama_pekerja,
              score: processedData[0].performance_score,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Worker statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching worker statistics",
      error: error.message,
    });
  }
};

module.exports = {
  getStatistics,
  getWorkerStatistics,
};
