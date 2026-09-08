const pool = require("../config/pool");

const logActivity = async (userId, action, productName) => {
  try {
    await pool.query(
      `INSERT INTO activity_logs
      (user_id, action, product_name)
      VALUES (?, ?, ?)`,
      [userId, action, productName]
    );
  } catch (error) {
    console.error("Activity Log Error:", error);
  }
};

module.exports = logActivity;