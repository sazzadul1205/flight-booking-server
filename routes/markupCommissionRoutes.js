const express = require("express");
const {
  createRule,
  getAllRules,
  getRuleById,
  updateRule,
  deleteRule,
  toggleRuleStatus,
} = require("../controllers/markupCommissionController");
const authenticate = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/config/lists - Get all markup and commission rules
router.get("/lists", getAllRules);

// GET /api/config/:id - Get single rule by ID
router.get("/:id", getRuleById);

// POST /api/config - Create new rule
router.post("/", createRule);

// PUT /api/config/:id - Update rule
router.put("/:id", updateRule);

// DELETE /api/config/:id - Delete rule
router.delete("/:id", deleteRule);

// PATCH /api/config/:id/toggle - Toggle rule status
router.patch("/:id/toggle", toggleRuleStatus);

module.exports = router;
