// routes/cacheRoutes.js
const express = require("express");
const router = express.Router();
const {
  deleteCache,
  getCacheStats,
  clearAllCache,
  listCacheFiles,
  performCleanup,
} = require("../utils/cacheManager");

// Get cache statistics
router.get("/stats", (req, res) => {
  try {
    const stats = getCacheStats();
    res.json({
      success: true,
      stats: stats,
      ttl_minutes: 10,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// List all cache files
router.get("/list", (req, res) => {
  try {
    const files = listCacheFiles();
    const totalSizeKB = files.reduce((sum, f) => sum + parseFloat(f.sizeKB), 0);

    res.json({
      success: true,
      files: files,
      count: files.length,
      totalSizeKB: totalSizeKB.toFixed(2),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Clear ALL cache files - MAIN TESTING ROUTE
router.get("/clear", (req, res) => {
  try {
    const result = clearAllCache();
    res.json({
      success: true,
      message: `Cleared ${result.count} cache files`,
      files: result.files,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Clear a specific cache file by IGXKey
router.get("/clear/:igxKey", (req, res) => {
  try {
    const { igxKey } = req.params;
    const deleted = deleteCache(igxKey);

    if (deleted) {
      res.json({
        success: true,
        message: `Cache file for ${igxKey} deleted successfully`,
        igxKey: igxKey,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Cache file for ${igxKey} not found`,
        igxKey: igxKey,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Manually trigger cleanup (removes expired files only)
router.get("/cleanup", (req, res) => {
  try {
    const deleted = performCleanup();
    res.json({
      success: true,
      message: `Cleanup completed: ${deleted} expired files deleted`,
      deleted: deleted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
