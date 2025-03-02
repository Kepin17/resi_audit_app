const mysqlPool = require("../config/db");

const getBagian = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query("SELECT id_bagian, jenis_pekerja FROM bagian");
    res.status(200).send({
      success: true,
      message: "Data found",
      data: rows,
    });
  } catch (error) {
    console.error("Error when trying to show all groups:", error);

    res.status(500).send({
      success: false,
      message: "Error when trying to show all groups",
      error: "internal_server_error",
    });
  }
};

module.exports = {
  getBagian,
};
