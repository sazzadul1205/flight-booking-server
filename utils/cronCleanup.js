const cron = require("node-cron");
const { performCleanup, getCleanupStats } = require("./cacheManager");

// Schedule cleanup to run every 5 minutes
// Cron pattern: */5 * * * * = At every 5th minute
const cleanupJob = cron.schedule("*/5 * * * *", () => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] 🔄 Running cache cleanup...`);

  const deleted = performCleanup();

  const duration = Date.now() - startTime;
  const stats = getCleanupStats();

  if (deleted > 0) {
    console.log(
      `[${new Date().toISOString()}] ✅ Cleanup complete: deleted ${deleted} expired files (Total: ${stats.totalDeleted}, Runs: ${stats.totalRuns}) - ${duration}ms`,
    );
  } else {
    console.log(
      `[${new Date().toISOString()}] ⏳ No expired files to delete (Total: ${stats.totalDeleted}, Runs: ${stats.totalRuns}) - ${duration}ms`,
    );
  }
});

// Run initial cleanup immediately on startup
console.log("[Cache] Running initial cleanup...");
const initialDeleted = performCleanup();
const stats = getCleanupStats();
if (initialDeleted > 0) {
  console.log(
    `[Cache] ✅ Initial cleanup: deleted ${initialDeleted} expired files`,
  );
} else {
  console.log("[Cache] ✅ No expired files found on startup");
}

console.log(
  `[Cache] 📊 Total stats: ${stats.totalDeleted} files deleted across ${stats.totalRuns} runs`,
);

// Export the job so it can be stopped if needed
module.exports = {
  cleanupJob,
  stopCleanup: () => cleanupJob.stop(),
  startCleanup: () => cleanupJob.start(),
};
