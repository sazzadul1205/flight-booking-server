// server.js
const app = require("./app");
const { testConnection } = require("./config/db");

const PORT = process.env.PORT || 5000;

// Uncaught Exception Handler
process.on("uncaughtException", (err) => {
  console.error(" Uncaught Exception:", {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });
  console.log(" Server shutting down due to uncaught exception...");
  process.exit(1);
});

// Unhandled Rejection Handler
process.on("unhandledRejection", (reason, promise) => {
  console.error(" Unhandled Rejection:", {
    reason: reason,
    promise: promise,
    timestamp: new Date().toISOString(),
  });
  console.log(" Server shutting down due to unhandled rejection...");
  process.exit(1);
});

// Start the server
const server = app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📍 Boilerplate: http://localhost:${PORT}/boilerplate`);

  try {
    await testConnection();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
  }
});

// SERVER ERROR HANDLER
server.on("error", (err) => {
  console.error(" Server error:", {
    message: err.message,
    code: err.code,
    timestamp: new Date().toISOString(),
  });

  process.exit(1);
});
