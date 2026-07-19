// routes/authRoutes.js
const express = require("express");

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

// POST register
router.post("/register", catchAsync(register));

// POST login
router.post("/login", catchAsync(login));

// GET profile (authenticated)
router.get("/profile", authenticate, catchAsync(getProfile));

module.exports = router;