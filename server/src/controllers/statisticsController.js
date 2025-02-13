const mysqlPool = require("../config/db");
const moment = require("moment");

const getStatistics = async (req, res) => {
  try {
    const { period = "daily" } = req.query;
    let query = "";
    let dateFormat = "";

    switch (period) {
      case "daily":
        dateFormat = "%Y-%m-%d %H:00:00";
        query = `
          WITH log_counts AS (
            SELECT 
              DATE_FORMAT(l.created_at, ?) as date,
              l.resi_id,
              MAX(CASE WHEN l.status_proses = 'picker' THEN 1 END) as is_picked,
              MAX(CASE WHEN l.status_proses = 'packing' THEN 1 END) as is_packed,
              MAX(CASE WHEN l.status_proses = 'pickout' THEN 1 END) as is_pickout,
              COUNT(DISTINCT l.id_pekerja) as workers_involved
            FROM log_proses l
            WHERE l.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
            GROUP BY DATE_FORMAT(l.created_at, ?), l.resi_id
          )
          SELECT 
            date,
            SUM(is_picked) as picker,
            SUM(is_packed) as packing,
            SUM(is_pickout) as pickout,
            MAX(workers_involved) as active_workers,
            COUNT(DISTINCT resi_id) as total_resi
          FROM log_counts
          GROUP BY date
          ORDER BY date ASC`;
        break;

      case "weekly":
        dateFormat = "%Y-%m-%d";
        query = `
          WITH log_counts AS (
            SELECT 
              DATE_FORMAT(l.created_at, ?) as date,
              l.resi_id,
              MAX(CASE WHEN l.status_proses = 'picker' THEN 1 END) as is_picked,
              MAX(CASE WHEN l.status_proses = 'packing' THEN 1 END) as is_packed,
              MAX(CASE WHEN l.status_proses = 'pickout' THEN 1 END) as is_pickout,
              COUNT(DISTINCT l.id_pekerja) as workers_involved
            FROM log_proses l
            WHERE l.created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)
            GROUP BY DATE_FORMAT(l.created_at, ?), l.resi_id
          )
          SELECT 
            date,
            SUM(is_picked) as picker,
            SUM(is_packed) as packing,
            SUM(is_pickout) as pickout,
            MAX(workers_involved) as active_workers,
            COUNT(DISTINCT resi_id) as total_resi
          FROM log_counts
          GROUP BY date
          ORDER BY date ASC`;
        break;

      case "monthly":
        dateFormat = "%Y-%m-%d";
        query = `
          WITH log_counts AS (
            SELECT 
              DATE_FORMAT(l.created_at, ?) as date,
              l.resi_id,
              MAX(CASE WHEN l.status_proses = 'picker' THEN 1 END) as is_picked,
              MAX(CASE WHEN l.status_proses = 'packing' THEN 1 END) as is_packed,
              MAX(CASE WHEN l.status_proses = 'pickout' THEN 1 END) as is_pickout,
              COUNT(DISTINCT l.id_pekerja) as workers_involved
            FROM log_proses l
            WHERE l.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
            GROUP BY DATE_FORMAT(l.created_at, ?), l.resi_id
          )
          SELECT 
            date,
            SUM(is_picked) as picker,
            SUM(is_packed) as packing,
            SUM(is_pickout) as pickout,
            MAX(workers_involved) as active_workers,
            COUNT(DISTINCT resi_id) as total_resi
          FROM log_counts
          GROUP BY date
          ORDER BY date ASC`;
        break;

      case "yearly":
        dateFormat = "%Y-%m";
        query = `
          WITH log_counts AS (
            SELECT 
              DATE_FORMAT(l.created_at, ?) as date,
              l.resi_id,
              MAX(CASE WHEN l.status_proses = 'picker' THEN 1 END) as is_picked,
              MAX(CASE WHEN l.status_proses = 'packing' THEN 1 END) as is_packed,
              MAX(CASE WHEN l.status_proses = 'pickout' THEN 1 END) as is_pickout,
              COUNT(DISTINCT l.id_pekerja) as workers_involved
            FROM log_proses l
            WHERE l.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
            GROUP BY DATE_FORMAT(l.created_at, ?), l.resi_id
          )
          SELECT 
            date,
            SUM(is_picked) as picker,
            SUM(is_packed) as packing,
            SUM(is_pickout) as pickout,
            MAX(workers_involved) as active_workers,
            COUNT(DISTINCT resi_id) as total_resi
          FROM log_counts
          GROUP BY date
          ORDER BY date ASC`;
        break;
    }

    const [rows] = await mysqlPool.query(query, [dateFormat, dateFormat]);

    // Process data and add additional metrics
    const processedData = rows.map((row) => ({
      date: row.date,
      picker: parseInt(row.picker) || 0,
      packing: parseInt(row.packing) || 0,
      pickout: parseInt(row.pickout) || 0,
      active_workers: parseInt(row.active_workers) || 0,
      total_resi: parseInt(row.total_resi) || 0,
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
        average_workers_per_period: Math.round(processedData.reduce((sum, item) => sum + item.active_workers, 0) / processedData.length),
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

    const query = `
      WITH worker_stats AS (
        SELECT 
          pek.id_pekerja,
          pek.nama_pekerja,
          COUNT(DISTINCT l.resi_id) as unique_resis,
          COUNT(CASE WHEN l.status_proses = 'picker' THEN 1 END) as picker_count,
          COUNT(CASE WHEN l.status_proses = 'packing' THEN 1 END) as packing_count,
          COUNT(CASE WHEN l.status_proses = 'pickout' THEN 1 END) as pickout_count,
          COUNT(*) as total_scans,
          MIN(l.created_at) as first_scan,
          MAX(l.created_at) as last_scan,
          GROUP_CONCAT(DISTINCT l.status_proses ORDER BY l.created_at) as process_flow,
          COUNT(DISTINCT DATE_FORMAT(l.created_at, '%Y-%m-%d %H:00:00')) as active_hours
        FROM log_proses l
        JOIN pekerja pek ON l.id_pekerja = pek.id_pekerja
        WHERE ${dateFilter}
        GROUP BY pek.id_pekerja, pek.nama_pekerja
      )
      SELECT 
        ws.*,
        TIMESTAMPDIFF(MINUTE, ws.first_scan, ws.last_scan) / 60.0 as hours_active,
        CASE 
          WHEN TIMESTAMPDIFF(MINUTE, ws.first_scan, ws.last_scan) = 0 THEN ws.total_scans
          ELSE ws.total_scans / (TIMESTAMPDIFF(MINUTE, ws.first_scan, ws.last_scan) / 60.0)
        END as scans_per_hour
      FROM worker_stats ws
      WHERE ws.total_scans > 0
      ORDER BY ws.total_scans DESC
    `;

    const [rows] = await mysqlPool.query(query);

    // Calculate efficiency metrics with improved logic
    const processedData = rows.map((worker) => {
      const hoursWorked = parseFloat(worker.hours_active) || 0.01;
      const scansPerHour = parseFloat(worker.scans_per_hour) || 0;

      // Calculate completion rate (successful processes vs total attempts)
      const completionRate = ((worker.picker_count + worker.packing_count + worker.pickout_count) / (worker.total_scans * 3)) * 100;

      // Calculate process efficiency (completed full cycles)
      const fullCycles = Math.min(worker.picker_count, worker.packing_count, worker.pickout_count);

      // Calculate weighted performance score with updated weights
      const weightedScore = ((worker.picker_count * 1.0 + worker.packing_count * 1.2 + worker.pickout_count * 1.5 + fullCycles * 2.0) / (worker.total_scans || 1)) * 100;

      return {
        ...worker,
        unique_resis: parseInt(worker.unique_resis),
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
    });

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
