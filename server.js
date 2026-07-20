// server.js
const app = require("./app");
const { testConnection } = require("./config/db");
const { createServer } = require("http");

const PORT = process.env.PORT || 5000;
let server = null;

// Uncaught Exceptions
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });

  console.log("Attempting graceful shutdown...");

  if (server) {
    server.close(() => {
      console.log("Server closed gracefully");
      process.exit(1);
    });

    // Force exit after 5 seconds
    setTimeout(() => {
      console.error("Force exit after timeout");
      process.exit(1);
    }, 5000);
  } else {
    process.exit(1);
  }
});

// Unhandled Promise Rejections
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", {
    reason: reason,
    stack: reason.stack,
    timestamp: new Date().toISOString(),
  });

  console.log("Attempting graceful shutdown...");

  if (server) {
    server.close(() => {
      process.exit(1);
      console.log("Server closed gracefully");
    });

    // Force exit after 5 seconds
    setTimeout(() => {
      console.error("Force exit after timeout");
      process.exit(1);
    }, 5000);
  } else {
    process.exit(1);
  }
});

// CREATE HTTP SERVER
server = createServer(app);

// START SERVER
server.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📍 Boilerplate: http://localhost:${PORT}/boilerplate`);

  try {
    const dbConnected = await testConnection();

    if (dbConnected) {
      console.log("Database connected successfully");
    } else {
      console.log("Database is NOT connected - some features may not work");
    }
  } catch (error) {
    console.error("Database connection error:", error.message);
  }
});

// SERVER ERROR HANDLER
server.on("error", (err) => {
  console.error("Server error:", {
    message: err.message,
    code: err.code,
    timestamp: new Date().toISOString(),
  });

  process.exit(1);
});

// GRACEFUL SHUTDOWN
const gracefulShutdown = (signal) => {
  console.log(` ${signal} received - shutting down gracefully...`);

  // Close the server
  server.close(() => {
    console.log(" Server closed");
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error(" Force shutdown after timeout");
    process.exit(1);
  }, 10000);
};
