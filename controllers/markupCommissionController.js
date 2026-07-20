// controllers/markupCommissionController.js
const MarkupCommissionRule = require("../models/MarkupCommissionRule");
const createError = require("../utils/createError");

// Create rule for authenticated user
const createRule = async (req, res, next) => {
  const {
    airline_code,
    markup_type,
    markup_value,
    commission_type,
    commission_value,
    is_active,
  } = req.body;

  const userId = req.user.id;

  // Validate required fields
  if (
    !markup_type ||
    !commission_type ||
    markup_value === undefined ||
    commission_value === undefined
  ) {
    const error = createError("All fields are required", 400);
    return next(error);
  }

  const result = await MarkupCommissionRule.createRule({
    user_id: userId,
    airline_code: airline_code || null,
    markup_type,
    markup_value,
    commission_type,
    commission_value,
    is_active: is_active !== undefined ? is_active : true,
  });

  res.status(201).json({
    success: true,
    message: "Rule created successfully",
    id: result.insertId,
  });
};

// Get all rules for authenticated user (user-specific + global)
const getAllRules = async (req, res, next) => {
  const userId = req.user.id;
  const rules = await MarkupCommissionRule.getAllRules(userId);
  res.json({ success: true, data: rules });
};

// Get user-specific rules only
const getUserRules = async (req, res, next) => {
  const userId = req.user.id;
  const rules = await MarkupCommissionRule.getUserRules(userId);
  res.json({ success: true, data: rules });
};

// Get global rules only
const getGlobalRules = async (req, res, next) => {
  const rules = await MarkupCommissionRule.getGlobalRules();
  res.json({ success: true, data: rules });
};

// Get rule by ID with ownership verification
const getRuleById = async (req, res, next) => {
  const userId = req.user.id;
  const rule = await MarkupCommissionRule.getRuleById(req.params.id, userId);

  if (!rule) {
    const error = createError("Rule not found or unauthorized", 404);
    return next(error);
  }

  res.json({ success: true, data: rule });
};

// Update rule with ownership verification
const updateRule = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const {
    airline_code,
    markup_type,
    markup_value,
    commission_type,
    commission_value,
    is_active,
  } = req.body;

  // Check if rule exists and belongs to user
  const existing = await MarkupCommissionRule.getRuleById(id, userId);
  if (!existing) {
    const error = createError("Rule not found or unauthorized", 404);
    return next(error);
  }

  // Update rule
  await MarkupCommissionRule.updateRule(id, userId, {
    airline_code:
      airline_code !== undefined ? airline_code : existing.airline_code,
    markup_type: markup_type || existing.markup_type,
    markup_value:
      markup_value !== undefined ? markup_value : existing.markup_value,
    commission_type: commission_type || existing.commission_type,
    commission_value:
      commission_value !== undefined
        ? commission_value
        : existing.commission_value,
    is_active: is_active !== undefined ? is_active : existing.is_active,
  });

  res.json({
    success: true,
    message: "Rule updated successfully",
  });
};

// Delete rule with ownership verification
const deleteRule = async (req, res, next) => {
  const userId = req.user.id;

  // Check if rule exists and belongs to user
  const existing = await MarkupCommissionRule.getRuleById(
    req.params.id,
    userId,
  );
  if (!existing) {
    const error = createError("Rule not found or unauthorized", 404);
    return next(error);
  }

  await MarkupCommissionRule.deleteRule(req.params.id, userId);
  res.json({
    success: true,
    message: "Rule deleted successfully",
  });
};

// Toggle rule status with ownership verification
const toggleRuleStatus = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { is_active } = req.body;

  if (is_active === undefined) {
    const error = createError("is_active is required", 400);
    return next(error);
  }

  // Check if rule exists and belongs to user
  const existing = await MarkupCommissionRule.getRuleById(id, userId);
  if (!existing) {
    const error = createError("Rule not found or unauthorized", 404);
    return next(error);
  }

  await MarkupCommissionRule.toggleRuleStatus(id, userId, is_active);
  res.json({
    success: true,
    message: `Rule ${is_active ? "activated" : "deactivated"} successfully`,
  });
};

module.exports = {
  createRule,
  getAllRules,
  getRuleById,
  updateRule,
  deleteRule,
  toggleRuleStatus,
  getUserRules,
  getGlobalRules,
};
