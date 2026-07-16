// controllers/markupCommissionController.js
const MarkupCommissionRule = require("../models/MarkupCommissionRule");

// Create rule for authenticated user
const createRule = async (req, res) => {
  try {
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
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
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
  } catch (error) {
    console.error("Create rule error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all rules for authenticated user (user-specific + global)
const getAllRules = async (req, res) => {
  try {
    const userId = req.user.id;
    const rules = await MarkupCommissionRule.getAllRules(userId);
    res.json({ success: true, data: rules });
  } catch (error) {
    console.error("Get all rules error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get user-specific rules only
const getUserRules = async (req, res) => {
  try {
    const userId = req.user.id;
    const rules = await MarkupCommissionRule.getUserRules(userId);
    res.json({ success: true, data: rules });
  } catch (error) {
    console.error("Get user rules error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get global rules only
const getGlobalRules = async (req, res) => {
  try {
    const rules = await MarkupCommissionRule.getGlobalRules();
    res.json({ success: true, data: rules });
  } catch (error) {
    console.error("Get global rules error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get rule by ID with ownership verification
const getRuleById = async (req, res) => {
  try {
    const userId = req.user.id;
    const rule = await MarkupCommissionRule.getRuleById(req.params.id, userId);

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Rule not found or unauthorized",
      });
    }

    res.json({ success: true, data: rule });
  } catch (error) {
    console.error("Get rule by ID error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update rule with ownership verification
const updateRule = async (req, res) => {
  try {
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
      return res.status(404).json({
        success: false,
        message: "Rule not found or unauthorized",
      });
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
  } catch (error) {
    console.error("Update rule error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete rule with ownership verification
const deleteRule = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if rule exists and belongs to user
    const existing = await MarkupCommissionRule.getRuleById(
      req.params.id,
      userId,
    );
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Rule not found or unauthorized",
      });
    }

    await MarkupCommissionRule.deleteRule(req.params.id, userId);
    res.json({
      success: true,
      message: "Rule deleted successfully",
    });
  } catch (error) {
    console.error("Delete rule error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Toggle rule status with ownership verification
const toggleRuleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { is_active } = req.body;

    if (is_active === undefined) {
      return res.status(400).json({
        success: false,
        message: "is_active is required",
      });
    }

    // Check if rule exists and belongs to user
    const existing = await MarkupCommissionRule.getRuleById(id, userId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Rule not found or unauthorized",
      });
    }

    await MarkupCommissionRule.toggleRuleStatus(id, userId, is_active);
    res.json({
      success: true,
      message: `Rule ${is_active ? "activated" : "deactivated"} successfully`,
    });
  } catch (error) {
    console.error("Toggle rule status error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
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
