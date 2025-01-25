const mysqlPool = require("../config/db");

const addNewCategory = async (req, res) => {
  try {
    const { nama_category } = req.body;
    if (!nama_category) {
      return res.status(400).send({
        success: false,
        message: "Category name is required",
      });
    }

    if (nama_category.length > 50) {
      return res.status(400).send({
        success: false,
        message: "Category name is too long",
      });
    } else if (nama_category.length < 3) {
      return res.status(400).send({
        success: false,
        message: "Category name is too short",
      });
    }

    const [rows] = await mysqlPool.query("SELECT * FROM category WHERE nama_category = ?", [nama_category]);
    if (rows.length > 0) {
      return res.status(400).send({
        success: false,
        message: "Category already exist",
      });
    } else {
      await mysqlPool.query("INSERT INTO category (nama_category) VALUES (?)", [nama_category]);
      res.status(200).send({
        success: true,
        message: "New category added",
      });
    }
  } catch (error) {
    console.error("Error in addNewCategory:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    let statusCode = 500;
    let errorMessage = "Error when trying to add new category";

    if (error.code === "ER_DUP_ENTRY") {
      statusCode = 400;
      errorMessage = "Category already exists";
    } else if (error.code === "ER_NO_SUCH_TABLE") {
      statusCode = 500;
      errorMessage = "Database table not found";
    } else if (error.code === "ECONNREFUSED") {
      statusCode = 503;
      errorMessage = "Database connection failed";
    }

    res.status(statusCode).send({
      success: false,
      message: errorMessage,
      error: error.message,
      code: error.code || "UNKNOWN_ERROR",
    });
  }
};

const showAllCategory = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query("SELECT * FROM category");

    res.status(200).send({
      success: true,
      message: "Category found",
      data: rows,
    });
  } catch (error) {
    console.error("Error in showAllCategory:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    res.status(500).send({
      success: false,
      message: "Error when trying to show all category",
      error: error.message,
    });
  }
};

const updateCategoryBarang = async (req, res) => {
  try {
    const { id_category } = req.params;
    const { nama_category } = req.body;

    if (!nama_category) {
      return res.status(400).send({
        success: false,
        message: "Category name is required",
      });
    }

    if (nama_category.length > 50) {
      return res.status(400).send({
        success: false,
        message: "Category name is too long",
      });
    } else if (nama_category.length < 3) {
      return res.status(400).send({
        success: false,
        message: "Category name is too short",
      });
    }

    // Check if category exists
    const [existingCategory] = await mysqlPool.query("SELECT * FROM category WHERE id_category = ?", [id_category]);

    if (existingCategory.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Category not found",
      });
    }

    // Check if new name already exists for different category
    const [duplicateCheck] = await mysqlPool.query("SELECT * FROM category WHERE nama_category = ? AND id_category != ?", [nama_category, id_category]);

    if (duplicateCheck.length > 0) {
      return res.status(400).send({
        success: false,
        message: "Category name already exists",
      });
    }

    await mysqlPool.query("UPDATE category SET nama_category = ? WHERE id_category = ?", [nama_category, id_category]);

    res.status(200).send({
      success: true,
      message: "Category updated successfully",
    });
  } catch (error) {
    console.error("Error in updateCategoryBarang:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    let statusCode = 500;
    let errorMessage = "Error when trying to update category";

    if (error.code === "ER_NO_SUCH_TABLE") {
      statusCode = 500;
      errorMessage = "Database table not found";
    } else if (error.code === "ECONNREFUSED") {
      statusCode = 503;
      errorMessage = "Database connection failed";
    }

    res.status(statusCode).send({
      success: false,
      message: errorMessage,
      error: error.message,
      code: error.code || "UNKNOWN_ERROR",
    });
  }
};

const deleteCategoryBarang = async (req, res) => {
  try {
    const { id_category } = req.params;

    const [existingCategory] = await mysqlPool.query("SELECT * FROM category WHERE id_category = ?", [id_category]);

    if (existingCategory.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Category not found",
      });
    }

    await mysqlPool.query("DELETE FROM category WHERE id_category = ?", [id_category]);

    res.status(200).send({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteCategoryBarang:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    let statusCode = 500;
    let errorMessage = "Error when trying to delete category";

    if (error.code === "ER_NO_SUCH_TABLE") {
      statusCode = 500;
      errorMessage = "Database table not found";
    } else if (error.code === "ECONNREFUSED") {
      statusCode = 503;
      errorMessage = "Database connection failed";
    }

    res.status(statusCode).send({
      success: false,
      message: errorMessage,
      error: error.message,
      code: error.code || "UNKNOWN_ERROR",
    });
  }
};

module.exports = {
  addNewCategory,
  showAllCategory,
  updateCategoryBarang,
  deleteCategoryBarang,
};
