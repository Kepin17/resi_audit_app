const mysqlPool = require("../config/db");

const showAll = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query("SELECT * FROM bagian");
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

module.exports = showAll;
