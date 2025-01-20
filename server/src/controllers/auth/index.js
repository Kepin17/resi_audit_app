const mysqlPool = require("../../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

require("dotenv").config();
const secretKey = process.env.SECRET_KEY;

// regisrasi pekerja
const RegisterHandler = async (req, res) => {
  try {
    const { id_pekerja, username, nama_pekerja, id_bagian, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const [rows] = await mysqlPool.query("INSERT INTO pekerja (id_pekerja , username ,nama_pekerja , id_bagian ,password, role) VALUES (?, ?, ?, ?, ?, ?)", [id_pekerja, username, nama_pekerja, id_bagian, hashedPassword, role]);

    if (rows.affectedRows === 0) {
      return res.status(400).send({
        success: false,
        message: "Failed to register username already exist",
      });
    }

    res.status(200).send({
      success: true,
      message: "Successfully registered",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error when trying to register",
      error: "Internal server error",
    });
  }
};

// login_pekerja

const loginHandler = async (req, res) => {
  try {
    const { username, password } = req.body;

    const [rows] = await mysqlPool.query("SELECT * FROM pekerja WHERE username = ?", [username]);

    if (rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Username not found",
      });
    }

    const pekerja = rows[0];
    const passcordValidation = await bcrypt.compare(password, pekerja.password);
    const [bagianData] = await mysqlPool.query("SELECT * FROM bagian WHERE id_bagian = ?", [pekerja.id_bagian]);

    const divisi = bagianData[0] ? bagianData[0].nama_bagian : "admin";

    if (!passcordValidation) {
      return res.status(400).send({
        success: false,
        message: "Password is incorrect",
      });
    }

    const token = jwt.sign(
      {
        id_pekerja: pekerja.id_pekerja,
        username: pekerja.username,
        pekerja: pekerja.nama_pekerja,
        bagian: divisi || null,
        role: pekerja.role,
      },
      secretKey,
      {
        expiresIn: "1d",
      }
    );

    res.status(200).send({
      success: true,
      message: "Login success",
      data: {
        username: pekerja.username,
        nama_pekerja: pekerja.nama_pekerja,
        bagian: divisi,
      },
      yourToken: token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error when trying to login",
      error: "Internal server error",
    });
  }
};

const logOutHandler = (req, res) => {
  res.status(200).send({
    success: true,
    message: "Logout success",
  });
};

module.exports = { RegisterHandler, loginHandler, logOutHandler };
