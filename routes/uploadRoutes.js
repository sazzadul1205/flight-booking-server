const express = require("express");
const router = express.Router();
const { uploadSingle } = require("../controllers/uploadController");
// const authenticate = require("../middleware/auth");
const catchAsync = require("../utils/catchAsync");

// router.use(authenticate);

router.post("/", uploadSingle);

module.exports = router;
