const express = require("express");

// Controllers
const {
  register,
  login,
  getProfile,
} = require("../controllers/authController");

// Middleware
const authenticate = require("../middleware/auth");

// Create a router
const router = express.Router();

// POST register
router.post("/register", register);

// POST login
router.post("/login", login);

// GET profile
router.get("/profile", authenticate, getProfile);

module.exports = router;
