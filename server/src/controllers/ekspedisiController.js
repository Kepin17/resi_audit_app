const mysqlPool = require("../config/db");
const extractCharacters = require("../utils/extrackEkspedisi");

const getAllEkspedisi = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query("SELECT id_ekspedisi, nama_ekspedisi FROM ekpedisi");
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

const getEkspedisiByGroup = async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const page = req.query.page || 1;
    const offset = (page - 1) * limit;

    let whereClause = "";
    let queryParams = [];

    const [count] = await mysqlPool.query(
      `
      SELECT COUNT(*) AS total
      FROM kode_resi kr ${whereClause}`,
      queryParams
    );

    const [rows] = await mysqlPool.query(
      `
      SELECT kr.id_ekspedisi, e.nama_ekspedisi, kr.id_resi 
      FROM kode_resi kr
      ${whereClause}
      LEFT JOIN ekpedisi e ON kr.id_ekspedisi = e.id_ekspedisi 
      ORDER BY kr.id_ekspedisi ASC
      LIMIT ? OFFSET ?
    `,
      [...queryParams, limit, offset]
    );

    const totalItems = count[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    const ekspedisiMap = {};

    rows.forEach((row) => {
      const { id_ekspedisi, nama_ekspedisi, id_resi } = row;

      if (!ekspedisiMap[id_ekspedisi]) {
        ekspedisiMap[id_ekspedisi] = {
          id_ekspedisi,
          nama_ekspedisi,
          kode_resi: [],
        };
      }

      ekspedisiMap[id_ekspedisi].kode_resi.push({ id_resi });
    });

    const result = Object.values(ekspedisiMap);

    res.status(200).send({
      success: true,
      message: "Data found",
      data: result,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error when trying to show all groups",
      error: "internal_server_error",
    });
  }
};

const addEkspedisi = async (req, res) => {
  try {
    const { nama_ekspedisi } = req.body;

    if (!nama_ekspedisi) {
      return res.status(400).send({
        success: false,
        message: "Nama ekspedisi is required",
        error: "bad_request",
      });
    }

    const id_ekspedisi = extractCharacters(nama_ekspedisi);

    const [rows] = await mysqlPool.query("INSERT INTO ekpedisi (id_ekspedisi, nama_ekspedisi) VALUES (?, ?)", [id_ekspedisi, nama_ekspedisi]);

    res.status(201).send({
      success: true,
      message: "Ekspedisi added",
      data: {
        id_ekspedisi: rows.insertId,
        nama_ekspedisi,
      },
    });
  } catch (error) {
    console.error("Error when trying to add ekspedisi:", error);

    res.status(500).send({
      success: false,
      message: "Error when trying to add ekspedisi",
      error: "internal_server_error",
    });
  }
};

const assignCodeEkspedisi = async (req, res) => {
  try {
    const { id_ekspedisi, id_resi } = req.body;

    if (!id_ekspedisi || !id_resi) {
      return res.status(400).send({
        success: false,
        message: "id_ekspedisi and id_resi is required",
        error: "bad_request",
      });
    }

    await mysqlPool.query("INSERT INTO kode_resi (id_ekspedisi, id_resi) VALUES (?, ?)", [id_ekspedisi, id_resi]);

    res.status(201).send({
      success: true,
      message: "Ekspedisi code assigned",
      data: {
        id_ekspedisi,
        id_resi,
      },
    });
  } catch (error) {
    console.error("Error when trying to assign ekspedisi code:", error);

    res.status(500).send({
      success: false,
      message: "Error when trying to assign ekspedisi code",
      error: "internal_server_error",
    });
  }
};

const updateEkspedisi = async (req, res) => {
  try {
    const { id_ekspedisi, nama_ekspedisi } = req.body;

    if (!id_ekspedisi || !nama_ekspedisi) {
      return res.status(400).send({
        success: false,
        message: "id_ekspedisi and nama_ekspedisi is required",
        error: "bad_request",
      });
    }

    await mysqlPool.query("UPDATE ekpedisi SET nama_ekspedisi = ? WHERE id_ekspedisi = ?", [nama_ekspedisi, id_ekspedisi]);

    res.status(200).send({
      success: true,
      message: "Ekspedisi updated",
      data: {
        id_ekspedisi,
        nama_ekspedisi,
      },
    });
  } catch (error) {
    console.error("Error when trying to update ekspedisi:", error);

    res.status(500).send({
      success: false,
      message: "Error when trying to update ekspedisi",
      error: "internal_server_error",
    });
  }
};



module.exports = {
  getAllEkspedisi,
  getEkspedisiByGroup,
  addEkspedisi,
  assignCodeEkspedisi,
  updateEkspedisi,
};
