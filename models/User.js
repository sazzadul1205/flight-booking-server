const { pool } = require("../config/db");
const bcrypt = require("bcrypt");

// Create a new user
const createUser = async (userData) => {
  const { name, email, password } = userData;
  const hashedPassword = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
    [name, email, hashedPassword],
  );
  return result;
};

// Find user by email
const findUserByEmail = async (email) => {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
    email,
  ]);
  return rows[0];
};

// Find user by ID
const findUserById = async (id) => {
  const [rows] = await pool.query(
    "SELECT id, name, email, created_at FROM users WHERE id = ?",
    [id],
  );
  return rows[0];
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
};
