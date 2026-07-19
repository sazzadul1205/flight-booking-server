const axios = require("axios");

// Get all airlines
const getAirlines = async (req, res, next) => {
  try {
    // Call external airline API
    const response = await axios.get(
      "https://uthaotrip.com/api/api/GetAirLines",
    );

    res.json({
      success: true,
      data: response.data.Payload || [],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAirlines };
