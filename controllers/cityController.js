const axios = require("axios");

// Get cities by search query
const getCities = async (req, res) => {
  try {
    const { input } = req.query;

    if (!input) {
      return res.status(400).json({
        success: false,
        message: "Input query parameter is required",
      });
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
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = { getCities };
