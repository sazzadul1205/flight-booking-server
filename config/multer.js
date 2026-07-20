const multer = require("multer");
const path = require("path");
const fs = require("fs");
const e = require("express");

const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "uploads/";

    if (file.mimetype.startsWith === "image/") {
      folder = "uploads/images/";
    } else if (file.mimetype.startsWith === "application/pdf") {
      folder = "uploads/pdf/";
    } else {
      folder = "uploads/others/";
    }

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    cb(null, folder);
  },

  filename: (req, file, cb) => {
    const name = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, name + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/msword",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

const limit = {
  fileSize: 1024 * 1024 * 5,
  files: 1,
  parts: 20,
};

const upload = multer({ storage, fileFilter, limits: limit });

module.exports = upload;
