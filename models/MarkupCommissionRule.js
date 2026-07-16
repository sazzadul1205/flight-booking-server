// models/MarkupCommissionRule.js
const { pool } = require("../config/db");

// Create markup commission rule with user_id
const createRule = async (ruleData) => {
  const {
    user_id,
    airline_code,
    markup_type,
    markup_value,
    commission_type,
    commission_value,
    is_active = true,
  } = ruleData;

  const [result] = await pool.query(
    `INSERT INTO markup_commission_rules 
     (user_id, airline_code, markup_type, markup_value, commission_type, commission_value, is_active) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      user_id || null,
      airline_code || null,
      markup_type,
      markup_value,
      commission_type,
      commission_value,
      is_active,
    ],
  );
  return result;
};

// Get all rules for a specific user (user-specific + global)
const getAllRules = async (userId) => {
  const [rows] = await pool.query(
    `SELECT * FROM markup_commission_rules 
     WHERE user_id = ? OR user_id IS NULL
     ORDER BY user_id ASC, created_at DESC`,
    [userId],
  );
  return rows;
};

// Get active rules for a specific user
const getActiveRules = async (userId) => {
  const [rows] = await pool.query(
    `SELECT * FROM markup_commission_rules 
     WHERE is_active = true AND (user_id = ? OR user_id IS NULL)
     ORDER BY CASE 
       WHEN user_id = ? THEN 0 
       ELSE 1 
     END, created_at DESC`,
    [userId, userId],
  );
  return rows;
};

// Get rule by ID with ownership verification
const getRuleById = async (id, userId) => {
  const [rows] = await pool.query(
    `SELECT * FROM markup_commission_rules 
     WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
    [id, userId],
  );
  return rows[0];
};

// Get rule by airline code with priority (user-specific first)
const getRuleByAirline = async (airlineCode, userId) => {
  const [rows] = await pool.query(
    `SELECT * FROM markup_commission_rules 
     WHERE is_active = true 
       AND (user_id = ? OR user_id IS NULL)
       AND (airline_code = ? OR airline_code IS NULL)
     ORDER BY CASE 
       WHEN user_id = ? THEN 0 
       ELSE 1 
     END,
     CASE 
       WHEN airline_code = ? THEN 0 
       ELSE 1 
     END
     LIMIT 1`,
    [userId, airlineCode, userId, airlineCode],
  );
  return rows[0];
};

// Update rule with ownership verification
const updateRule = async (id, userId, ruleData) => {
  const {
    airline_code,
    markup_type,
    markup_value,
    commission_type,
    commission_value,
    is_active,
  } = ruleData;

  const [result] = await pool.query(
    `UPDATE markup_commission_rules 
     SET airline_code = ?, markup_type = ?, markup_value = ?, 
         commission_type = ?, commission_value = ?, is_active = ?,
         updated_at = NOW()
     WHERE id = ? AND user_id = ?`,
    [
      airline_code || null,
      markup_type,
      markup_value,
      commission_type,
      commission_value,
      is_active,
      id,
      userId,
    ],
  );
  return result;
};

// Delete rule with ownership verification
const deleteRule = async (id, userId) => {
  const [result] = await pool.query(
    "DELETE FROM markup_commission_rules WHERE id = ? AND user_id = ?",
    [id, userId],
  );
  return result;
};

// Toggle rule status with ownership verification
const toggleRuleStatus = async (id, userId, is_active) => {
  const [result] = await pool.query(
    "UPDATE markup_commission_rules SET is_active = ?, updated_at = NOW() WHERE id = ? AND user_id = ?",
    [is_active, id, userId],
  );
  return result;
};

// Get user-specific rules only
const getUserRules = async (userId) => {
  const [rows] = await pool.query(
    `SELECT * FROM markup_commission_rules 
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId],
  );
  return rows;
};

// Get global rules only
const getGlobalRules = async () => {
  const [rows] = await pool.query(
    `SELECT * FROM markup_commission_rules 
     WHERE user_id IS NULL
     ORDER BY created_at DESC`,
  );
  return rows;
};

module.exports = {
  createRule,
  getAllRules,
  getRuleById,
  updateRule,
  deleteRule,
  toggleRuleStatus,
  getActiveRules,
  getRuleByAirline,
  getUserRules,
  getGlobalRules,
};
