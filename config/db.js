const mysql = require("mysql2");
require("dotenv").config();

// Create a connection pool
const pool = mysql
  .createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  })
  .promise();

// Test connection
const testConnection = async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✅ MySQL connected successfully");
    return true;
  } catch (error) {
    console.error("❌ MySQL connection failed:", error.message);
    return false;
  }
};

module.exports = { pool, testConnection };
