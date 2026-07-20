// controllers/cityController.js
const axios = require("axios");
const createError = require("../utils/createError");

// Get cities by search query
const getCities = async (req, res, next) => {
  const { input } = req.query;

  if (!input) {
    const error = createError("Input query parameter is required", 400);
    return next(error);
  }

  const response = await axios.get(
    `https://uthaotrip.com/api/Auto/GetCities/?input=${input}`,
  );

  res.json({
    success: true,
    data: response.data,
  });
};

module.exports = { getCities };
