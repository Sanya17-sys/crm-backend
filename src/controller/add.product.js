const pool = require("../config/pool");
const logActivity = require("../utils/activityLogger")
const addProduct = async (req, res) => {
  try {
    const { name, price, description, stock, review } = req.body;

    const image = req.file ? req.file.filename : null;

    await pool.query(
      `INSERT INTO products
      (user_id, name, image, price, description, stock, review)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        name,
        image,
        price,
        description,
        stock,
        review,
      ]
    );
    await logActivity(
      req.user.id,
      "PRODUCT_ADDED",
      req.body.name
    );

    res.status(201).json({
      success: true,
      message: "Product added successfully",
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = addProduct;