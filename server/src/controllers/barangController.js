const mysqlPool = require("../config/db");

const addNewBarang = async (req, res) => {
  try {
    const { resi_id, nama_barang, jumlah_barang, id_category } = req.body;

    // Validate required fields
    if (!resi_id || !nama_barang || !jumlah_barang || !id_category) {
      return res.status(400).send({
        success: false,
        message: "all field are required",
      });
    }

    await mysqlPool.query("INSERT INTO barang (resi_id, nama_barang, jumlah_barang, id_category) VALUES (?, ?, ?, ?)", [resi_id, nama_barang, jumlah_barang, id_category]);

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

const editBarang = async (req, res) => {
  try {
    const { resi_id, nama_barang, jumlah_barang, id_category } = req.body;

    await mysqlPool.query("UPDATE barang SET nama_barang = ?, jumlah_barang = ?, id_category = ? WHERE resi_id = ?", [nama_barang, jumlah_barang, id_category, resi_id]);

    res.status(200).send({
      success: true,
      message: "Barang updated",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error when trying to update barang",
      error: error.message,
    });
  }
};

const showAllBarang = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(`
      SELECT resi_id, nama_barang ,nama_category, jumlah_barang FROM barang
      JOIN category ON barang.id_category = category.id_category
      `);
    if (rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Barang not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Barang found",
      data: rows,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error when trying to show all barang",
      error: error.message,
    });
  }
};

const deleteBarang = async (req, res) => {
  try {
    const { resi_id } = req.body;

    await mysqlPool.query("DELETE FROM barang WHERE resi_id = ?", [resi_id]);

    res.status(200).send({
      success: true,
      message: "Barang deleted",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error when trying to delete barang",
      error: error.message,
    });
  }
};

module.exports = {
  addNewBarang,
  editBarang,
  showAllBarang,
  deleteBarang,
};
