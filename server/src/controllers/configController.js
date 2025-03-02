const mysqlPool = require("../config/db");


const getConfig = async (req, res) => {
  try {
    const [config] = await mysqlPool.query("SELECT * FROM configtable where config_name = 'autoscan'");
    res.status(200).send({
      message: "Success",
      auto_scan: config,
    })
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

const updateConfig = async (req, res) => {
  try {
    const { auto_scan } = req.body;
    
    // Validate input
    if (auto_scan !== "nyala" && auto_scan !== "mati") {
      return res.status(400).json({ message: "Invalid value for auto_scan. Use 'nyala' or 'mati'." });
    }
    
    
    // Update with proper WHERE clause
    await mysqlPool.query(
      "UPDATE configtable SET config_value = ? WHERE config_name = 'autoscan'", 
      [auto_scan]
    );
    
    res.status(200).json({ 
      message: "Success",
      updated_status: auto_scan 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}


module.exports = {
  getConfig,
  updateConfig
}