// controllers/flightController.js
const axios = require("axios");
const MarkupCommissionRule = require("../models/MarkupCommissionRule");

// Search flights with markup & commission applied (user-specific)
const searchFlights = async (req, res) => {
  try {
    const {
      JourneyType,
      Origin,
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

    // console.log("Request body:", req.body);

    // Validate required fields
    if (
      !JourneyType ||
      !Origin ||
      !Destination ||
      !DepartureDate ||
      !NoofAdult
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: JourneyType, Origin, Destination, DepartureDate, NoofAdult",
      });
    }

    // Get user_id from authenticated user
    const userId = req.user.id;

    // Prepare request data with correct field names for the external API
    const requestData = {
      JourneyType: parseInt(JourneyType),
      Origin: Origin.toUpperCase().trim(),
      Destination: Destination.toUpperCase().trim(),
      DepartureDate: DepartureDate,
      ReturnDate: ReturnDate || "",
      ClassType: ClassType || "Economy",
      NoOfAdult: parseInt(NoofAdult), 
      NoOfChildren: parseInt(NoofChildren || 0),
      NoOfInfant: parseInt(NoofInfant || 0),
      IsSpecialTexRedumtion: IsSpecialTexRedumption, 
      IsFlexSearch: IsFlexSearch,
      Flex: Flex === null || Flex === undefined ? null : Flex, 
      ChildrenAges: Array.isArray(ChildrenAges) ? ChildrenAges : [], 
    };

    console.log(
      "Sending to external API:",
      JSON.stringify(requestData, null, 2),
    );

    // Call external flight API with timeout
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

    console.log("External API response:", response.data);

    // Check if API call was successful
    if (!response.data || !response.data.Success) {
      // If the API returns false but has a message, return it
      if (response.data && response.data.Message) {
        return res.status(400).json({
          success: false,
          message: response.data.Message,
        });
      }

      // If no specific message, provide a generic one
      return res.status(400).json({
        success: false,
        message: "Flight search failed. Please check your search criteria.",
        apiResponse: response.data, 
      });
    }

    // Check if payload exists and is an array
    const payload = response.data.Payload || [];
    if (!Array.isArray(payload)) {
      return res.status(400).json({
        success: false,
        message: "Invalid response format from flight API",
      });
    }

    // If no flights found
    if (payload.length === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: "No flights found for the selected criteria",
      });
    }

    // Get active markup/commission rules for this user
    const rules = await MarkupCommissionRule.getActiveRules(userId);

    // Apply markup and commission to each flight
    const flights = payload.map((flight) => {
      // Safely extract flight values with fallbacks
      const baseFare = flight.BasePrice || flight.BaseFare || 0;
      const totalTax = flight.TotalTax || flight.Tax || 0;
      const totalPrice = flight.TotalPrice || flight.TotalFare || 0;
      const airlineCode = flight.PlatingCarrier || flight.Carrier || "";

      // Find markup/commission rule
      let rule = null;

      // Try user-specific airline rule
      rule = rules.find(
        (r) => r.user_id === userId && r.airline_code === airlineCode,
      );

      // Try user-specific global rule
      if (!rule) {
        rule = rules.find(
          (r) => r.user_id === userId && r.airline_code === null,
        );
      }

      // Try global airline-specific rule
      if (!rule) {
        rule = rules.find(
          (r) => r.user_id === null && r.airline_code === airlineCode,
        );
      }

      // Try global rule (fallback)
      if (!rule) {
        rule = rules.find((r) => r.user_id === null && r.airline_code === null);
      }

      // If no rule found, return flight without modifications
      if (!rule) {
        return {
          ...flight,
          OriginalBaseFare: Math.round(baseFare),
          OriginalTotalFare: Math.round(totalPrice),
          NewBaseFare: Math.round(baseFare + totalTax),
          NewDiscount: 0,
          NewTotalFare: Math.round(totalPrice),
          AppliedRule: null,
        };
      }

      // Calculate NewBaseFare: BaseFare + TotalTax + Markup
      let newBaseFare = baseFare + totalTax;

      // Apply markup
      if (rule.markup_type === "percentage") {
        newBaseFare = newBaseFare + (newBaseFare * rule.markup_value) / 100;
      } else if (rule.markup_type === "fixed" || rule.markup_type === "flat") {
        newBaseFare = newBaseFare + rule.markup_value;
      }

      // Calculate commission on BaseFare only (not including tax)
      let commission = 0;
      if (rule.commission_type === "percentage") {
        commission = (baseFare * rule.commission_value) / 100;
      } else if (
        rule.commission_type === "fixed" ||
        rule.commission_type === "flat"
      ) {
        commission = rule.commission_value;
      }

      // NewDiscount = Commission
      const newDiscount = commission;

      // NewTotalFare = NewBaseFare + Tax - Commission
      const newTotalFare = newBaseFare - newDiscount;

      // Return flight with new pricing
      return {
        ...flight,
        OriginalBaseFare: Math.round(baseFare),
        OriginalTotalFare: Math.round(totalPrice),
        NewBaseFare: Math.round(newBaseFare),
        NewDiscount: Math.round(newDiscount),
        NewTotalFare: Math.round(newTotalFare),
        AppliedRule: {
          id: rule.id,
          user_id: rule.user_id,
          airline_code: rule.airline_code,
          markup_type: rule.markup_type,
          markup_value: rule.markup_value,
          commission_type: rule.commission_type,
          commission_value: rule.commission_value,
          is_active: rule.is_active,
        },
      };
    });

    // Return success response with flights
    res.json({
      success: true,
      data: flights,
      total: flights.length,
      message: "Flights retrieved successfully",
    });
  } catch (error) {
    console.error("Flight search error:", error);

    if (error.response) {
      console.error("Error response data:", error.response.data);
      return res.status(error.response.status || 500).json({
        success: false,
        message: error.response.data?.Message || "External API error",
        error: error.response.data,
      });
    }

    if (error.request) {
      // The request was made but no response was received
      return res.status(503).json({
        success: false,
        message:
          "No response from flight search service. Please try again later.",
        error: "Service unavailable",
      });
    }

    // Something happened in setting up the request that triggered an Error
    res.status(500).json({
      success: false,
      message: "Server error occurred during flight search",
      error: error.message,
    });
  }
};

module.exports = { searchFlights };
