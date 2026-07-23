const fs = require("fs");
const path = require("path");

const CACHE_DIR = path.join(__dirname, "..", "cache");

if (fs.existsSync(CACHE_DIR)) {
  const files = fs.readdirSync(CACHE_DIR);
  let count = 0;

  for (const file of files) {
    const filePath = path.join(CACHE_DIR, file);
    fs.unlinkSync(filePath);
    count++;
  }

  console.log(`✅ Cleared ${count} cache files`);
} else {
  console.log("ℹ️ Cache directory does not exist");
}
