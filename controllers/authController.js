// controllers/authController.js
const { createUser, findUserByEmail, findUserById } = require("../models/User");

// Dependencies
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const createError = require("../utils/createError");
const { validationResult } = require("express-validator");

// Register a new user
const register = async (req, res, next) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = createError(errors.array()[0].msg, 400);
    return next(error);
  }

  const { name, email, password } = req.body;

  // Check if user exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    const error = createError("Email already exists", 409);
    return next(error);
  }

  // Create user
  await createUser({ name, email, password });

  // Send response
  res.status(201).json({
    success: true,
    message: "User registered successfully",
  });
};

// Login a user
const login = async (req, res, next) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = createError(errors.array()[0].msg, 400);
    return next(error);
  }

  const { email, password } = req.body;

  // Find user
  const user = await findUserByEmail(email);
  if (!user) {
    const error = createError("Invalid credentials", 401);
    return next(error);
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    const error = createError("Invalid credentials", 401);
    return next(error);
  }

  // Generate JWT
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "10m" },
  );

  res.json({
    success: true,
    message: "Login successful",
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
};

// Get user profile
const getProfile = async (req, res, next) => {
  const user = await findUserById(req.user.id);

  if (!user) {
    const error = createError("User not found", 404);
    return next(error);
  }

  res.json({
    success: true,
    data: user,
  });
};

// Export
module.exports = {
  register,
  login,
  getProfile,
};
