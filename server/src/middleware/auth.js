const jwt = require("jsonwebtoken");
require("dotenv").config();

const authToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "No token provided",
      });
    }

    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          status: "error",
          message: "Invalid or expired token",
        });
      }

      // Store the full decoded token in req.user
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error in authentication",
    });
  }
};

module.exports = authToken;
