// routes/authRoutes.js
const express = require("express");
const { body } = require("express-validator");

// Controllers
const {
  register,
  login,
  getProfile,
} = require("../controllers/authController");

// Middleware
const authenticate = require("../middleware/auth");
const catchAsync = require("../utils/catchAsync");

// Create a router
const router = express.Router();

// ============================================================
// VALIDATION RULES
// ============================================================

// Register validation
const registerValidation = [
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be 2-50 characters")
    .trim()
    .escape(),

  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number"),
];

// Login validation
const loginValidation = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),
];

// ============================================================
// ROUTES
// ============================================================

// POST register (with validation)
router.post("/register", registerValidation, catchAsync(register));

// POST login (with validation)
router.post("/login", loginValidation, catchAsync(login));

// GET profile (authenticated)
router.get("/profile", authenticate, catchAsync(getProfile));

module.exports = router;
