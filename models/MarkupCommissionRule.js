const { pool } = require("../config/db");

// Create markup commission rule
const createRule = async (ruleData) => {
  const {
    airline_code,
    markup_type,
    markup_value,
    commission_type,
    commission_value,
    is_active = true,
  } = ruleData;

  const [result] = await pool.query(
    `INSERT INTO markup_commission_rules 
     (airline_code, markup_type, markup_value, commission_type, commission_value, is_active) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      airline_code,
      markup_type,
      markup_value,
      commission_type,
      commission_value,
      is_active,
    ],
  );
  return result;
};

// Get all rules
const getAllRules = async () => {
  const [rows] = await pool.query(
    "SELECT * FROM markup_commission_rules ORDER BY created_at DESC",
  );
  return rows;
};

// Get active rules
const getActiveRules = async () => {
  const [rows] = await pool.query(
    "SELECT * FROM markup_commission_rules WHERE is_active = true ORDER BY created_at DESC",
  );
  return rows;
};

// Get rule by ID
const getRuleById = async (id) => {
  const [rows] = await pool.query(
    "SELECT * FROM markup_commission_rules WHERE id = ?",
    [id],
  );
  return rows[0];
};

// Get rule by airline code (specific or global)
const getRuleByAirline = async (airlineCode) => {
  const [rows] = await pool.query(
    `SELECT * FROM markup_commission_rules 
     WHERE is_active = true AND (airline_code = ? OR airline_code IS NULL)
     ORDER BY CASE WHEN airline_code = ? THEN 0 ELSE 1 END
     LIMIT 1`,
    [airlineCode, airlineCode],
  );
  return rows[0];
};

// Update rule
const updateRule = async (id, ruleData) => {
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
     WHERE id = ?`,
    [
      airline_code,
      markup_type,
      markup_value,
      commission_type,
      commission_value,
      is_active,
      id,
    ],
  );
  return result;
};

// Delete rule
const deleteRule = async (id) => {
  const [result] = await pool.query(
    "DELETE FROM markup_commission_rules WHERE id = ?",
    [id],
  );
  return result;
};

// Toggle rule active status
const toggleRuleStatus = async (id, is_active) => {
  const [result] = await pool.query(
    "UPDATE markup_commission_rules SET is_active = ?, updated_at = NOW() WHERE id = ?",
    [is_active, id],
  );
  return result;
};

module.exports = {
  // Main methods
  createRule,
  getAllRules,
  getRuleById,
  updateRule,
  deleteRule,
  toggleRuleStatus,

  create: createRule,
  getAll: getAllRules,
  getById: getRuleById,
  update: updateRule,
  delete: deleteRule,
  toggleStatus: toggleRuleStatus,

  getActiveRules,
  getRuleByAirline,
};
