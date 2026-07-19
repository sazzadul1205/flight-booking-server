const axios = require("axios");

// Get cities by search query
const getCities = async (req, res, next) => {
  try {
    const { input } = req.query;

    if (!input) {
      const error = new Error("Input query parameter is required");
      error.statusCode = 400;
      return next(error);
    }

    // Call external city API
    const response = await axios.get(
      `https://uthaotrip.com/api/Auto/GetCities/?input=${input}`,
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCities };
