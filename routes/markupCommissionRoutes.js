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
const catchAsync = require("../utils/catchAsync");

const router = express.Router();

router.use(authenticate);

// GET- Get all rules (user-specific + global)
router.get("/lists", catchAsync(getAllRules));

// GET - Get user-specific rules only
router.get("/user", catchAsync(getUserRules));

// GET - Get global rules only
router.get("/global", catchAsync(getGlobalRules));

// GET - Get single rule by ID
router.get("/:id", catchAsync(getRuleById));

// POST /api/config - Create new rule (user-specific)
router.post("/", catchAsync(createRule));

// PUT - Update rule
router.put("/:id", catchAsync(updateRule));

// DELETE - Delete rule
router.delete("/:id", catchAsync(deleteRule));

// PATCH - Toggle rule status
router.patch("/:id/toggle", catchAsync(toggleRuleStatus));

module.exports = router;
