const MarkupCommissionRule = require("../models/MarkupCommissionRule");

// Create rule
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

    if (
      !markup_type ||
      !commission_type ||
      markup_value === undefined ||
      commission_value === undefined
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const result = await MarkupCommissionRule.create({
      airline_code: airline_code || null,
      markup_type,
      markup_value,
      commission_type,
      commission_value,
      is_active: is_active !== undefined ? is_active : true,
    });

    res
      .status(201)
      .json({ success: true, message: "Rule created", id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all rules
const getAllRules = async (req, res) => {
  try {
    const rules = await MarkupCommissionRule.getAll();
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get rule by ID
const getRuleById = async (req, res) => {
  try {
    const rule = await MarkupCommissionRule.getById(req.params.id);
    if (!rule)
      return res
        .status(404)
        .json({ success: false, message: "Rule not found" });
    res.json({ success: true, data: rule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update rule
const updateRule = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      airline_code,
      markup_type,
      markup_value,
      commission_type,
      commission_value,
      is_active,
    } = req.body;

    const existing = await MarkupCommissionRule.getById(id);
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Rule not found" });

    await MarkupCommissionRule.update(id, {
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

    res.json({ success: true, message: "Rule updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete rule
const deleteRule = async (req, res) => {
  try {
    const existing = await MarkupCommissionRule.getById(req.params.id);
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Rule not found" });

    await MarkupCommissionRule.delete(req.params.id);
    res.json({ success: true, message: "Rule deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle rule status
const toggleRuleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (is_active === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "is_active is required" });
    }

    const existing = await MarkupCommissionRule.getById(id);
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Rule not found" });

    await MarkupCommissionRule.toggleStatus(id, is_active);
    res.json({
      success: true,
      message: `Rule ${is_active ? "activated" : "deactivated"}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createRule,
  getAllRules,
  getRuleById,
  updateRule,
  deleteRule,
  toggleRuleStatus,
};
