// app.js
const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");

// Test connection
const { testConnection } = require("./config/db");

// Routes
const authRoutes = require("./routes/authRoutes");
const flightRoutes = require("./routes/flightRoutes");
const configRoutes = require("./routes/markupCommissionRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

dotenv.config();

const app = express();

app.use(helmet());
app.use(express.json({ limit: "30mb" }));
app.use(express.static(path.join(__dirname, "uploads")));

// Rate limit
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res, next) => {
      res.status(429).json({
        success: false,
        status: 429,
        error: "Too Many Requests",
        timestamp: new Date().toISOString(),
        message: "Too many requests, please try again later",
      });
    },
  }),
);

// Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Status check
app.get("/api/status", async (req, res, next) => {
  try {
    const dbConnected = await testConnection();
    res.json({
      server: "running",
      database: dbConnected ? "connected" : "disconnected",
      port: process.env.PORT || 5000,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Boilerplate
app.get("/boilerplate", (req, res, next) => {
  res.sendFile("boiler.html", { root: "." }, (err) => {
    if (err) {
      next(err);
    }
  });
});

// API Routes
app.use("/api/upload", uploadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/config", configRoutes);
app.use("/api", flightRoutes);

// Not found
app.use((req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  next(error);
});

// Global error handler
app.use((err, req, res, next) => {
  // Log the error
  console.error("❌ Error:", {
    message: err.message,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Send response
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message: message,
  });
});

module.exports = app;
