const axios = require("axios");
const MarkupCommissionRule = require("../models/MarkupCommissionRule");

// Search flights with markup & commission applied
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
      IsSpecialTexRedumption,
      IsFlexSearch,
      Flex,
      ChildrenAges,
    } = req.body;

    // Call external flight API
    const response = await axios.post(
      "https://uthaotrip.com/api/air/UnauthorizeSearchAir",
      {
        JourneyType,
        Origin,
        Destination,
        DepartureDate,
        ReturnDate,
        ClassType,
        NoofAdult,
        NoofChildren,
        NoofInfant,
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
        message: response.data.Message,
      });
    }

    // Get active markup/commission rules
    const rules = await MarkupCommissionRule.getActiveRules();

    // Apply markup and commission to each flight
    const flights = response.data.Payload.map((flight) => {
      // Find applicable rule (specific airline or global)
      const rule =
        rules.find(
          (r) =>
            r.airline_code === flight.PlatingCarrier || r.airline_code === null,
        ) || rules.find((r) => r.airline_code === null);

      if (!rule) return flight;

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
      original_response: response.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = { searchFlights };
