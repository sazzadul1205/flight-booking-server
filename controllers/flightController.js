const axios = require("axios");
const MarkupCommissionRule = require("../models/MarkupCommissionRule");
const generateFilterObject = require("../utils/generateFilterObject");
const createError = require("../utils/createError");
const applyMarkupToFlights = require("../utils/applyMarkup");
const { writeCache } = require("../utils/cacheManager");

const searchFlights = async (req, res, next) => {
  const {
    JourneyType,
    Origin = "DAC",
    Destination,
    DepartureDate,
    ReturnDate,
    ClassType,
    NoofAdult,
    NoofChildren,
    NoofInfant,
    IsSpecialTexRedumption = false,
    IsFlexSearch = false,
    Flex = null,
    ChildrenAges = [],
  } = req.body;

  // Validate required fields
  if (!JourneyType || !Origin || !Destination || !DepartureDate || !NoofAdult) {
    const error = createError(
      "Missing required fields: JourneyType, Origin, Destination, DepartureDate, NoofAdult",
      400,
    );
    return next(error);
  }

  // Get user ID
  const userId = req.user?.id || null;

  // Build request data
  const requestData = {
    JourneyType: parseInt(JourneyType),
    Origin: Origin.toUpperCase().trim(),
    Destination: Destination.toUpperCase().trim(),
    DepartureDate: DepartureDate,
    ReturnDate: ReturnDate || "",
    ClassType: ClassType || "Economy",
    NoofAdult: parseInt(NoofAdult),
    NoofChildren: parseInt(NoofChildren || 0),
    NoofInfant: parseInt(NoofInfant || 0),
    IsSpecialTexRedumption: IsSpecialTexRedumption,
    IsFlexSearch: IsFlexSearch,
    Flex: Flex === null || Flex === undefined ? null : Flex,
    ChildrenAges: Array.isArray(ChildrenAges) ? ChildrenAges : [],
  };

  try {
    // Make API call
    const response = await axios.post(
      "https://uthaotrip.com/api/air/UnauthorizeSearchAir",
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 1200000,
      },
    );

    // Check API response
    if (!response.data || !response.data.Success) {
      const message =
        response.data?.Message ||
        "Flight search failed. Please check your search criteria.";
      const error = createError(message, 400);
      return next(error);
    }

    // Get payload
    const payload = response.data.Payload || [];

    // Validate payload
    if (!Array.isArray(payload)) {
      const error = createError("Invalid response format from flight API", 400);
      return next(error);
    }

    // No flights found
    if (payload.length === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        igxKey: null,
        filter: {},
        message: "No flights found for the selected criteria",
      });
    }

    // Extract IGXKey
    const igxKey = payload[0]?.IGXKey || null;

    // Cache the raw payload (before markup)
    if (igxKey) {
      const cacheMetadata = {
        origin: Origin,
        destination: Destination,
        departureDate: DepartureDate,
        returnDate: ReturnDate,
        journeyType: JourneyType,
        classType: ClassType,
        adults: NoofAdult,
        children: NoofChildren,
        infants: NoofInfant,
      };
      writeCache(igxKey, payload, cacheMetadata);
    }

    // Get user rules
    let rules = [];
    if (userId) {
      rules = await MarkupCommissionRule.getActiveRules(userId);
    }

    // Apply markup and commission
    const flights = await applyMarkupToFlights(payload, userId, rules);

    // Generate filter object
    const filterObject = generateFilterObject(flights);

    // Send response
    res.json({
      success: true,
      data: flights,
      total: flights.length,
      igxKey: igxKey,
      filter: filterObject,
      message: "Flights retrieved successfully",
    });
  } catch (error) {
    console.error("Flight search error:", error);
    const err = createError(error.message || "Flight search failed", 500);
    return next(err);
  }
};

module.exports = { searchFlights };
