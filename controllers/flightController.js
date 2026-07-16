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
      Flex = 0,
      ChildrenAges = "",
    } = req.body;

    // Get user_id from authenticated user
    const userId = req.user.id;

    // Call external flight API
    const response = await axios.post(
      "https://uthaotrip.com/api/air/UnauthorizeSearchAir",
      {
        JourneyType,
        Origin,
        Destination,
        DepartureDate,
        ReturnDate: ReturnDate || "",
        ClassType,
        NoofAdult,
        NoofChildren: NoofChildren || 0,
        NoofInfant: NoofInfant || 0,
        IsSpecialTexRedumption,
        IsFlexSearch,
        Flex,
        ChildrenAges,
      },
      {
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!response.data.Success) {
      return res.status(400).json({
        success: false,
        message: response.data.Message || "Flight search failed",
      });
    }

    // Get active markup/commission rules for this user
    const rules = await MarkupCommissionRule.getActiveRules(userId);

    // Apply markup and commission to each flight
    const flights = response.data.Payload.map((flight) => {
      // Find applicable rule with priority:
      // 1. User-specific airline rule
      // 2. User-specific global rule
      // 3. Global airline-specific rule
      // 4. Global rule
      let rule = null;

      // Try user-specific airline rule
      rule = rules.find(
        (r) => r.user_id === userId && r.airline_code === flight.PlatingCarrier,
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
          (r) => r.user_id === null && r.airline_code === flight.PlatingCarrier,
        );
      }

      // Try global rule
      if (!rule) {
        rule = rules.find((r) => r.user_id === null && r.airline_code === null);
      }

      // If no rule found, return flight without modifications
      if (!rule) {
        return {
          ...flight,
          NewBaseFare: flight.BasePrice || 0,
          NewDiscount: 0,
          NewTotalFare: flight.TotalPrice || 0,
          AppliedRule: null,
        };
      }

      // Calculate NewBaseFare: BaseFare + TotalTax + Markup
      const baseFare = flight.BasePrice || 0;
      const totalTax = flight.TotalTax || 0;
      let newBaseFare = baseFare + totalTax;

      // Apply markup
      if (rule.markup_type === "percentage") {
        newBaseFare = newBaseFare + (newBaseFare * rule.markup_value) / 100;
      } else if (rule.markup_type === "flat") {
        newBaseFare = newBaseFare + rule.markup_value;
      }

      // Calculate commission on BaseFare only
      let commission = 0;
      if (rule.commission_type === "percentage") {
        commission = (baseFare * rule.commission_value) / 100;
      } else if (rule.commission_type === "flat") {
        commission = rule.commission_value;
      }

      // NewDiscount = Commission
      const newDiscount = commission;

      return {
        ...flight,
        NewBaseFare: Math.round(newBaseFare),
        NewDiscount: Math.round(newDiscount),
        NewTotalFare: Math.round(newBaseFare + totalTax - newDiscount),
        AppliedRule: {
          user_id: rule.user_id,
          airline_code: rule.airline_code,
          markup_type: rule.markup_type,
          markup_value: rule.markup_value,
          commission_type: rule.commission_type,
          commission_value: rule.commission_value,
        },
      };
    });

    res.json({
      success: true,
      data: flights,
    });
  } catch (error) {
    console.error("Flight search error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = { searchFlights };
