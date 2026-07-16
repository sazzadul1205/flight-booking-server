const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");

// Test connection
const { testConnection } = require("./config/db");

// Routes
const authRoutes = require("./routes/authRoutes");
const flightRoutes = require("./routes/flightRoutes");
const configRoutes = require("./routes/markupCommissionRoutes");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Status check
app.get("/api/status", async (req, res) => {
  const dbConnected = await testConnection();
  res.json({
    server: "running",
    database: dbConnected ? "connected" : "disconnected",
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/config", configRoutes);
app.use("/api", flightRoutes);

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  await testConnection();
});
