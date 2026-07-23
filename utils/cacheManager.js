const fs = require("fs");
const path = require("path");

const CACHE_DIR = path.join(__dirname, "..", "cache");
const TTL_MS = 10 * 60 * 1000; // 10 minutes

// Track cleanup stats globally
global.cacheCleanupStats = {
  lastCleanup: null,
  totalDeleted: 0,
  totalRuns: 0,
};

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function writeCache(igxKey, payload, metadata = {}) {
  if (!igxKey) return false;

  const filePath = path.join(CACHE_DIR, `${igxKey}.json`);
  const tempPath = filePath + ".tmp";

  try {
    const data = JSON.stringify({
      payload,
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        cachedAt: new Date().toISOString(),
      },
    });
    fs.writeFileSync(tempPath, data, "utf8");
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (error) {
    console.error("Cache write error:", error);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    return false;
  }
}

function readCache(igxKey) {
  if (!igxKey) return null;

  const filePath = path.join(CACHE_DIR, `${igxKey}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const cached = JSON.parse(raw);

    // Check expiry
    if (Date.now() - cached.timestamp > TTL_MS) {
      fs.unlinkSync(filePath);
      return null;
    }

    return {
      payload: cached.payload,
      metadata: cached.metadata || {},
      timestamp: cached.timestamp,
    };
  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error("Cache read error:", error);
    return null;
  }
}

function hasValidCache(igxKey) {
  if (!igxKey) return false;

  const filePath = path.join(CACHE_DIR, `${igxKey}.json`);
  if (!fs.existsSync(filePath)) return false;

  try {
    const stats = fs.statSync(filePath);
    return Date.now() - stats.mtimeMs <= TTL_MS;
  } catch {
    return false;
  }
}

function deleteCache(igxKey) {
  if (!igxKey) return false;

  const filePath = path.join(CACHE_DIR, `${igxKey}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

function clearAllCache() {
  if (!fs.existsSync(CACHE_DIR)) {
    return { count: 0, files: [] };
  }

  const files = fs.readdirSync(CACHE_DIR);
  const deletedFiles = [];

  for (const file of files) {
    const filePath = path.join(CACHE_DIR, file);
    try {
      fs.unlinkSync(filePath);
      deletedFiles.push(file);
    } catch (error) {
      console.error(`Failed to delete ${file}:`, error);
    }
  }

  // Update global stats
  global.cacheCleanupStats.totalDeleted += deletedFiles.length;
  global.cacheCleanupStats.totalRuns++;

  return {
    count: deletedFiles.length,
    files: deletedFiles,
  };
}

function getCacheStats() {
  if (!fs.existsSync(CACHE_DIR)) {
    return {
      totalFiles: 0,
      totalSize: 0,
      oldest: null,
      newest: null,
    };
  }

  const files = fs.readdirSync(CACHE_DIR);
  const stats = {
    totalFiles: files.length,
    totalSize: 0,
    oldest: null,
    newest: null,
  };

  for (const file of files) {
    const filePath = path.join(CACHE_DIR, file);
    const stat = fs.statSync(filePath);
    stats.totalSize += stat.size;

    if (!stats.oldest || stat.mtimeMs < stats.oldest.mtimeMs) {
      stats.oldest = { file, mtime: stat.mtime };
    }
    if (!stats.newest || stat.mtimeMs > stats.newest.mtimeMs) {
      stats.newest = { file, mtime: stat.mtime };
    }
  }

  return stats;
}

function listCacheFiles() {
  if (!fs.existsSync(CACHE_DIR)) {
    return [];
  }

  const files = fs.readdirSync(CACHE_DIR);
  return files.map((file) => {
    const filePath = path.join(CACHE_DIR, file);
    const stats = fs.statSync(filePath);
    return {
      name: file,
      size: stats.size,
      sizeKB: (stats.size / 1024).toFixed(2),
      created: stats.birthtime,
      modified: stats.mtime,
    };
  });
}

function performCleanup() {
  if (!fs.existsSync(CACHE_DIR)) return 0;

  const files = fs.readdirSync(CACHE_DIR);
  const now = Date.now();
  let deleted = 0;

  for (const file of files) {
    const filePath = path.join(CACHE_DIR, file);
    try {
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > TTL_MS) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    } catch (error) {
      console.error(`Failed to delete ${file}:`, error);
    }
  }

  // Update global stats
  if (deleted > 0) {
    global.cacheCleanupStats.lastCleanup = now;
    global.cacheCleanupStats.totalDeleted += deleted;
  }
  global.cacheCleanupStats.totalRuns++;

  return deleted;
}

function getCleanupStats() {
  return global.cacheCleanupStats;
}

module.exports = {
  writeCache,
  readCache,
  hasValidCache,
  deleteCache,
  clearAllCache,
  getCacheStats,
  listCacheFiles,
  performCleanup,
  getCleanupStats,
};