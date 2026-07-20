// controllers/airlineController.js
const axios = require("axios");

// Get all airlines
const getAirlines = async (req, res, next) => {
  const response = await axios.get("https://uthaotrip.com/api/api/GetAirLines");

  res.json({
    success: true,
    data: response.data.Payload || [],
  });
};

module.exports = { getAirlines };
