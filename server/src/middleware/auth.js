const jwt = require("jsonwebtoken");
require("dotenv").config();

const secretKey = process.env.SECRET_KEY;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null)
    return res.sendStatus(401).send({
      success: false,
      message: "Unauthorized access, please login first!",
    });

  jwt.verify(token, secretKey, (err, user) => {
    if (err)
      return res.sendStatus(403).send({
        success: false,
        message: "Token has been expired, please login again!",
      });
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
