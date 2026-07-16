// routes/markupCommissionRoutes.js
const express = require("express");
const {
  createRule,
  getAllRules,
  getRuleById,
  updateRule,
  deleteRule,
  toggleRuleStatus,
  getUserRules,
  getGlobalRules,
} = require("../controllers/markupCommissionController");
const authenticate = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/config/lists - Get all rules (user-specific + global)
router.get("/lists", getAllRules);

// GET /api/config/user - Get user-specific rules only
router.get("/user", getUserRules);

// GET /api/config/global - Get global rules only
router.get("/global", getGlobalRules);

// GET /api/config/:id - Get single rule by ID
router.get("/:id", getRuleById);

// POST /api/config - Create new rule (user-specific)
router.post("/", createRule);

// PUT /api/config/:id - Update rule
router.put("/:id", updateRule);

// DELETE /api/config/:id - Delete rule
router.delete("/:id", deleteRule);

// PATCH /api/config/:id/toggle - Toggle rule status
router.patch("/:id/toggle", toggleRuleStatus);

module.exports = router;
