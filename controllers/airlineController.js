const axios = require("axios");

// Get all airlines
const getAirlines = async (req, res) => {
  try {
    // Call external airline API
    const response = await axios.get("https://uthaotrip.com/api/api/GetAirLines");

    res.json({
      success: true,
      data: response.data.Payload || [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = { getAirlines };
