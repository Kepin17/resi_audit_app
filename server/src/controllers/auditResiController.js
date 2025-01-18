const mysqlPool = require("../config/db");

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
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error when trying to show all data",
      error: error.message,
    });
  }
};

const scaneHandler = async (req, res) => {
  try {
    const { resi_number, id_pekerja } = req.body;

    // Get worker data
    const [pekerja_data] = await mysqlPool.query("SELECT id_bagian, nama_pekerja FROM pekerja WHERE id_pekerja = ?", [id_pekerja]);
    if (pekerja_data.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Worker not found",
      });
    }

    // Get bagian data
    const [bagian_data] = await mysqlPool.query("SELECT jenis_pekerja FROM bagian WHERE id_bagian = ?", [pekerja_data[0].id_bagian]);
    if (bagian_data.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Bagian not found",
      });
    }

    const workerRole = bagian_data[0].jenis_pekerja;
    const [prosesRows] = await mysqlPool.query("SELECT * FROM proses WHERE resi_number = ?", [resi_number]);
    await mysqlPool.query("INSERT INTO log_proses (resi_number) VALUES (?) ", [resi_number]);
    if (prosesRows.length === 0) {
      await mysqlPool.query("INSERT INTO proses (resi_number, id_pekerja, status_proses) VALUES (?, ?,?)", [resi_number, id_pekerja, workerRole]);
      return res.status(200).send({
        success: true,
        message: "Scan success",
        data: {
          nama_pekerja: pekerja_data[0].nama_pekerja,
          proses_scan: workerRole,
        },
      });
    } else {
      await mysqlPool.query("UPDATE proses SET id_pekerja = ?, status_proses = ? WHERE resi_number = ?", [id_pekerja, workerRole, resi_number]);
      return res.status(200).send({
        success: true,
        message: "Scane success",
        data: {
          nama_pekerja: pekerja_data[0].nama_pekerja,
          proses_scan: workerRole,
        },
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error when trying to show last scan",
      error: error.message,
    });
  }
};

module.exports = { showAllData, scaneHandler };
