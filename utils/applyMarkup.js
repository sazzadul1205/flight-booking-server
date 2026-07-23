const MarkupCommissionRule = require("../models/MarkupCommissionRule");

/**
 * Apply markup and commission rules to flight payload
 */
async function applyMarkupToFlights(payload, userId, userRules = null) {
  // If no payload, return empty array
  if (!payload || !Array.isArray(payload)) {
    return [];
  }

  // Get rules if not provided
  let rules = userRules;
  if (userId && !rules) {
    rules = await MarkupCommissionRule.getActiveRules(userId);
  }

  // Process each flight
  return payload.map((flight, index) => {
    // Extract pricing data
    const baseFare = flight.BasePrice || flight.BaseFare || 0;
    const totalTax = flight.TotalTax || flight.Tax || 0;
    const totalPrice = flight.TotalPrice || flight.TotalFare || 0;
    const airlineCode = flight.PlatingCarrier || flight.Carrier || "";

    // Find applicable rule
    let rule = null;
    if (userId && rules && rules.length > 0) {
      // 1. User-specific airline rule
      rule = rules.find((r) => r.airline_code === airlineCode);

      // 2. User-specific global rule
      if (!rule) {
        rule = rules.find((r) => r.airline_code === null);
      }
    }

    // If no rule found, return flight with basic info
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

    // Apply markup
    const baseForMarkup = baseFare + totalTax;
    let markupAmount = 0;

    if (rule.markup_type === "percentage") {
      markupAmount = (baseForMarkup * rule.markup_value) / 100;
    } else if (rule.markup_type === "fixed" || rule.markup_type === "flat") {
      markupAmount = rule.markup_value;
    }

    const newBaseFare = baseFare + markupAmount;

    // Apply commission
    let commission = 0;
    if (rule.commission_type === "percentage") {
      commission = (newBaseFare * rule.commission_value) / 100;
    } else if (
      rule.commission_type === "fixed" ||
      rule.commission_type === "flat"
    ) {
      commission = rule.commission_value;
    }

    // Return processed flight
    return {
      ...flight,
      OriginalBaseFare: Math.round(baseFare),
      OriginalTotalFare: Math.round(totalPrice),
      NewBaseFare: Math.round(newBaseFare),
      NewDiscount: Math.round(commission),
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
        newDiscount: Math.round(commission),
      },
    };
  });
}

module.exports = applyMarkupToFlights;
