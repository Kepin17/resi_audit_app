const mysqlPool = require("../config/db");

const addNewBarang = async (req, res) => {
  try {
    const { resi_id } = req.body;

    // Validate required fields
    if (!resi_id) {
      return res.status(400).send({
        success: false,
        message: "all field are required",
      });
    }

    const [rows] = await mysqlPool.query("SELECT * FROM barang WHERE resi_id = ?", [resi_id]);

    if (rows.length === 0) {
      await mysqlPool.query("INSERT INTO barang (resi_id) VALUES (?)", [resi_id]);
    } else {
      return res.status(400).send({
        success: false,
        message: "resi already exist",
      });
    }

    res.status(200).send({
      success: true,
      message: "New barang added",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error when trying to add new barang",
      error: error.message,
    });
  }
};

const showAllBarang = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(`
      SELECT *
      FROM barang
      ORDER BY barang.created_at DESC
    `);

    return res.status(200).send({
      success: true,
      message: "Barang found",
      data: rows,
    });
  } catch (error) {
    console.log(error);
    if (!res.headersSent) {
      return res.status(500).send({
        success: false,
        message: "Error when trying to show all barang",
        error: error.message,
      });
    }
  }
};

const cancelBarang = async (req, res) => {};

module.exports = {
  addNewBarang,
  showAllBarang,
};
