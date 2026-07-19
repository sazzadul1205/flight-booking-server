// controllers/flightController.js
const axios = require("axios");
const MarkupCommissionRule = require("../models/MarkupCommissionRule");
const generateFilterObject = require("../utils/generateFilterObject");

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

    const userId = req.user.id;

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

    if (!response.data || !response.data.Success) {
      if (response.data && response.data.Message) {
        return res.status(400).json({
          success: false,
          message: response.data.Message,
        });
      }
      return res.status(400).json({
        success: false,
        message: "Flight search failed. Please check your search criteria.",
        apiResponse: response.data,
      });
    }

    const payload = response.data.Payload || [];
    if (!Array.isArray(payload)) {
      return res.status(400).json({
        success: false,
        message: "Invalid response format from flight API",
      });
    }

    if (payload.length === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: "No flights found for the selected criteria",
      });
    }

    const rules = await MarkupCommissionRule.getActiveRules(userId);

    const flights = payload.map((flight) => {
      const baseFare = flight.BasePrice || flight.BaseFare || 0;
      const totalTax = flight.TotalTax || flight.Tax || 0;
      const totalPrice = flight.TotalPrice || flight.TotalFare || 0;
      const airlineCode = flight.PlatingCarrier || flight.Carrier || "";

      let rule = null;

      // 1. User-specific airline rule
      rule = rules.find(
        (r) => r.user_id === userId && r.airline_code === airlineCode,
      );

      // 2. User-specific global rule
      if (!rule) {
        rule = rules.find(
          (r) => r.user_id === userId && r.airline_code === null,
        );
      }

      // If no rule found, return flight without modifications
      if (!rule) {
        return {
          ...flight,
          OriginalBaseFare: Math.round(baseFare),
          OriginalTotalFare: Math.round(totalPrice),
          NewBaseFare: Math.round(baseFare + totalTax),
          NewDiscount: 0,
          AppliedRule: null,
          CalculationBreakdown: null,
        };
      }

      // STEP 1: Markup Calculation (on BaseFare + TotalTax)
      const baseForMarkup = baseFare + totalTax;
      let markupAmount = 0;

      if (rule.markup_type === "percentage") {
        markupAmount = (baseForMarkup * rule.markup_value) / 100;
      } else if (rule.markup_type === "fixed" || rule.markup_type === "flat") {
        markupAmount = rule.markup_value;
      }

      const newBaseFare = baseFare + markupAmount;

      // STEP 2: Commission Calculation (on NewBaseFare) - FIXED!
      let commission = 0;

      if (rule.commission_type === "percentage") {
        commission = (newBaseFare * rule.commission_value) / 100;
      } else if (
        rule.commission_type === "fixed" ||
        rule.commission_type === "flat"
      ) {
        commission = rule.commission_value;
      }

      const newDiscount = commission;

      return {
        ...flight,
        OriginalBaseFare: Math.round(baseFare),
        OriginalTotalFare: Math.round(totalPrice),
        NewBaseFare: Math.round(newBaseFare),
        NewDiscount: Math.round(newDiscount),
        CalculationBreakdown: {
          baseFare: Math.round(baseFare),
          totalTax: Math.round(totalTax),
          baseForMarkup: Math.round(baseForMarkup),
          markupType: rule.markup_type,
          markupValue: rule.markup_value,
          markupAmount: Math.round(markupAmount),
          newBaseFare: Math.round(newBaseFare),
          commissionType: rule.commission_type,
          commissionValue: rule.commission_value,
          commissionAmount: Math.round(commission),
          newDiscount: Math.round(newDiscount),
        },
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

    const filterObject = generateFilterObject(flights);

    res.json({
      success: true,
      data: flights,
      total: flights.length,
      filter: filterObject,
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
      return res.status(503).json({
        success: false,
        message:
          "No response from flight search service. Please try again later.",
        error: "Service unavailable",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error occurred during flight search",
      error: error.message,
    });
  }
};

module.exports = { searchFlights };
