const multer = require("multer");
const upload = require("../config/multer");
const createError = require("../utils/createError");

// Single file upload
const uploadSingle = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "FILE_TOO_LARGE") {
          return next(createError("File too large. Max 5MB.", 400));
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return next(createError("Unexpected file field.", 400));
        }
        return next(createError(err.message, 400));
      }
      return next(createError(err.message, 400));
    }

    if (!req.file) {
      return next(createError("No file uploaded.", 400));
    }

    res.json({
      success: true,
      message: "File uploaded successfully",
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: req.file.path,
      },
    });
  });
};

module.exports = { uploadSingle };
