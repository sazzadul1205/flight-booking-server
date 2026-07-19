// utils/generateFilterObject.js

const generateFilterObject = (flights) => {
  // Initialize filter object with empty arrays (NO DEFAULTS)
  const filter = {
    min_price: 0,
    max_price: 0,
    fare_type: [],
    airlines: [],
    airline_code: [],
    aircraft: [],
    baggage: [],
    onward_flight_stops: [],
    return_flight_stops: [],
    onward_depart_time: [],
    return_depart_time: [],
    onward_arrival_time: [],
    return_arrival_time: [],
    onward_transit_hour: [],
    return_transit_hour: [],
    onward_flying_time: [],
    return_flying_time: [],
    onward_layover_airport: [],
    return_layover_airport: [],
    onward_destination_airport: [],
    return_destination_airport: [],
  };

  // Early return if no flights
  if (!flights || flights.length === 0) {
    return filter;
  }

  // Arrays for unique values (using basic arrays)
  const airlinesList = [];
  const airlineCodesList = [];
  const aircraftList = [];
  const baggageList = [];
  const fareTypesList = [];
  const onwardLayoverAirportsList = [];
  const returnLayoverAirportsList = [];
  const onwardDestinationAirportsList = [];
  const returnDestinationAirportsList = [];
  const onwardStopsList = [];
  const returnStopsList = [];
  const onwardDepartureHoursList = [];
  const returnDepartureHoursList = [];
  const onwardArrivalHoursList = [];
  const returnArrivalHoursList = [];
  const onwardFlyingMinutesList = [];
  const returnFlyingMinutesList = [];
  const onwardTransitMinutesList = [];
  const returnTransitMinutesList = [];

  let minPrice = Infinity;
  let maxPrice = 0;

  // Helper to add unique values to array
  const addUnique = (arr, value) => {
    if (value !== undefined && value !== null && value !== "") {
      if (!arr.includes(value)) {
        arr.push(value);
      }
    }
  };

  flights.forEach((flight, flightIndex) => {
    console.log(`[DEBUG] Processing flight ${flightIndex + 1}`);

    // Extract price (using NewBaseFare or TotalPrice)
    const price = flight.NewBaseFare || flight.TotalPrice || 0;
    if (price > 0) {
      minPrice = Math.min(minPrice, price);
      maxPrice = Math.max(maxPrice, price);
    }

    // Fare Type
    if (flight.IsRefundable !== undefined) {
      const type = flight.IsRefundable ? "Refundable" : "Non-Refundable";
      addUnique(fareTypesList, type);
    }

    // Airlines
    if (flight.PlatingCarrierName) {
      addUnique(airlinesList, flight.PlatingCarrierName);
    }
    if (flight.CarrierName) {
      addUnique(airlinesList, flight.CarrierName);
    }

    // Airline Codes
    if (flight.PlatingCarrier) {
      addUnique(airlineCodesList, flight.PlatingCarrier);
    }
    if (flight.Carrier) {
      addUnique(airlineCodesList, flight.Carrier);
    }

    // Onward Stops - Get from TotalTravelTimes
    if (flight.TotalTravelTimes && flight.TotalTravelTimes.length > 0) {
      const onwardStops = flight.TotalTravelTimes[0]?.NoOfStop;
      if (onwardStops !== undefined && onwardStops !== null) {
        addUnique(onwardStopsList, Number(onwardStops));
      }

      // Onward Flying Time Only add if duration exists and is valid
      const onwardDuration = flight.TotalTravelTimes[0]?.TotalTravelDuration;
      if (onwardDuration && onwardDuration.trim() !== "") {
        const minutes = parseDurationToMinutes(onwardDuration);
        if (minutes > 0) {
          addUnique(onwardFlyingMinutesList, minutes);
          console.log(
            `[DEBUG] Flight ${flightIndex + 1} Onward flying time: ${onwardDuration} = ${minutes} minutes (${minutes / 60} hours)`,
          );
        } else {
          console.log(
            `[DEBUG] Flight ${flightIndex + 1} Onward flying time: "${onwardDuration}" parsed to 0 minutes - SKIPPING`,
          );
        }
      } else {
        console.log(
          `[DEBUG] Flight ${flightIndex + 1} Onward flying time: NO DURATION FOUND - SKIPPING`,
        );
      }

      // Onward Transit Time (layover)
      const onwardLayover = flight.TotalTravelTimes[0]?.TotalLayoverTime;
      if (onwardLayover && onwardLayover !== "") {
        const minutes = parseLayoverToMinutes(onwardLayover);
        if (minutes > 0) {
          addUnique(onwardTransitMinutesList, minutes);
          console.log(
            `[DEBUG] Flight ${flightIndex + 1} Onward transit time: ${onwardLayover} = ${minutes} minutes (${minutes / 60} hours)`,
          );
        }
      }
    } else {
      console.log(
        `[DEBUG] Flight ${flightIndex + 1} No TotalTravelTimes found`,
      );
    }

    // Return Stops - Get from TotalTravelTimes (second element for return)
    if (flight.TotalTravelTimes && flight.TotalTravelTimes.length > 1) {
      const returnStops = flight.TotalTravelTimes[1]?.NoOfStop;
      if (returnStops !== undefined && returnStops !== null) {
        addUnique(returnStopsList, Number(returnStops));
      }

      // Return Flying Time
      const returnDuration = flight.TotalTravelTimes[1]?.TotalTravelDuration;
      if (returnDuration && returnDuration.trim() !== "") {
        const minutes = parseDurationToMinutes(returnDuration);
        if (minutes > 0) {
          addUnique(returnFlyingMinutesList, minutes);
          console.log(
            `[DEBUG] Flight ${flightIndex + 1} Return flying time: ${returnDuration} = ${minutes} minutes`,
          );
        }
      }

      // Return Transit Time (layover)
      const returnLayover = flight.TotalTravelTimes[1]?.TotalLayoverTime;
      if (returnLayover && returnLayover !== "") {
        const minutes = parseLayoverToMinutes(returnLayover);
        if (minutes > 0) {
          addUnique(returnTransitMinutesList, minutes);
        }
      }
    }

    // Onward Segments
    if (flight.Onwards && flight.Onwards.length > 0) {
      flight.Onwards.forEach((segment, index) => {
        // Aircraft
        if (segment.Equipment) {
          addUnique(aircraftList, segment.Equipment);
        }

        // Baggage
        if (segment.AirBaggageAllowance) {
          addUnique(baggageList, segment.AirBaggageAllowance);
        }

        // Departure Time (first segment only)
        if (index === 0 && segment.DepartureTime) {
          const hour = new Date(segment.DepartureTime).getHours();
          addUnique(onwardDepartureHoursList, hour);
        }

        // Arrival Time (last segment only)
        if (index === flight.Onwards.length - 1 && segment.ArrivalTime) {
          const hour = new Date(segment.ArrivalTime).getHours();
          addUnique(onwardArrivalHoursList, hour);
        }

        // Destination airports (for layover - all except last segment)
        if (index < flight.Onwards.length - 1 && segment.Destination) {
          addUnique(onwardLayoverAirportsList, segment.Destination);
        }

        // Final destination (last segment)
        if (index === flight.Onwards.length - 1 && segment.Destination) {
          addUnique(onwardDestinationAirportsList, segment.Destination);
        }
      });
    }

    // Return Segments
    if (flight.Returns && flight.Returns.length > 0) {
      flight.Returns.forEach((segment, index) => {
        // Departure Time (first segment only)
        if (index === 0 && segment.DepartureTime) {
          const hour = new Date(segment.DepartureTime).getHours();
          addUnique(returnDepartureHoursList, hour);
        }

        // Arrival Time (last segment only)
        if (index === flight.Returns.length - 1 && segment.ArrivalTime) {
          const hour = new Date(segment.ArrivalTime).getHours();
          addUnique(returnArrivalHoursList, hour);
        }

        // Destination airports (for layover - all except last segment)
        if (index < flight.Returns.length - 1 && segment.Destination) {
          addUnique(returnLayoverAirportsList, segment.Destination);
        }

        // Final destination (last segment)
        if (index === flight.Returns.length - 1 && segment.Destination) {
          addUnique(returnDestinationAirportsList, segment.Destination);
        }
      });
    }
  });

  // Helper to sort arrays
  const sortArray = (arr) => {
    return arr.sort((a, b) => {
      if (typeof a === "string") return a.localeCompare(b);
      return a - b;
    });
  };

  // Generate time ranges with exactly 6-hour gaps starting from 00:00
  const generateTimeRanges = (hoursList) => {
    if (hoursList.length === 0) {
      return []; // Return empty if no data
    }

    // Get unique hours from the list
    const uniqueHours = [...new Set(hoursList)].sort((a, b) => a - b);

    // Define the 6-hour time slots
    const timeSlots = [
      { start: 0, end: 5, label: "00:00 To 05:59" },
      { start: 6, end: 11, label: "06:00 To 11:59" },
      { start: 12, end: 17, label: "12:00 To 17:59" },
      { start: 18, end: 23, label: "18:00 To 23:59" },
    ];

    // Find which slots have data
    const availableSlots = timeSlots.filter((slot) => {
      return uniqueHours.some((hour) => hour >= slot.start && hour <= slot.end);
    });

    // Return only the slots that have data
    return availableSlots.map((slot) => ({
      name: slot.label,
    }));
  };

  // Generate hour ranges for flying time and transit time with 6-hour gaps
  const generateHourRanges = (minutesList, label) => {
    if (minutesList.length === 0) {
      console.log(`[DEBUG] ${label}: No minutes data - returning empty`);
      return []; // Return empty if no data
    }

    const sortedMinutes = sortArray([...minutesList]);
    // Use actual hours (not floored) for range checking
    const hours = sortedMinutes.map((m) => m / 60);

    console.log(`[DEBUG] ${label}: minutes =`, sortedMinutes);
    console.log(
      `[DEBUG] ${label}: hours =`,
      hours.map((h) => h.toFixed(2)),
    );

    // Define the 6-hour time slots for durations
    const timeSlots = [
      { min: 0, max: 6, label: "0 To 6 Hour" },
      { min: 6, max: 12, label: "6 To 12 Hour" },
      { min: 12, max: 18, label: "12 To 18 Hour" },
      { min: 18, max: Infinity, label: "18 Hour +" },
    ];

    // Find which slots have data
    const availableSlots = timeSlots.filter((slot) => {
      return hours.some((hour) => {
        // Check if hour is within the slot range
        const maxCheck = slot.max === Infinity ? true : hour <= slot.max;
        return (
          hour >= slot.min && (slot.max === Infinity ? true : hour <= slot.max)
        );
      });
    });

    console.log(
      `[DEBUG] ${label}: availableSlots =`,
      availableSlots.map((s) => s.label),
    );

    // Return only the slots that have data
    return availableSlots.map((slot) => ({
      name: slot.label,
    }));
  };

  // Assign values to filter object (only if they exist)
  filter.min_price = minPrice === Infinity ? 0 : Math.floor(minPrice);
  filter.max_price = maxPrice === 0 ? 0 : Math.ceil(maxPrice);

  if (fareTypesList.length > 0) filter.fare_type = sortArray(fareTypesList);
  if (airlinesList.length > 0) filter.airlines = sortArray(airlinesList);
  if (airlineCodesList.length > 0)
    filter.airline_code = sortArray(airlineCodesList);
  if (aircraftList.length > 0) filter.aircraft = sortArray(aircraftList);
  if (baggageList.length > 0) filter.baggage = sortArray(baggageList);

  // Stops - Only if data exists
  if (onwardStopsList.length > 0) {
    filter.onward_flight_stops = sortArray(onwardStopsList);
  }
  if (returnStopsList.length > 0) {
    filter.return_flight_stops = sortArray(returnStopsList);
  }

  // Time ranges - Only if data exists (using 6-hour slots)
  if (onwardDepartureHoursList.length > 0) {
    filter.onward_depart_time = generateTimeRanges(onwardDepartureHoursList);
  }
  if (returnDepartureHoursList.length > 0) {
    filter.return_depart_time = generateTimeRanges(returnDepartureHoursList);
  }
  if (onwardArrivalHoursList.length > 0) {
    filter.onward_arrival_time = generateTimeRanges(onwardArrivalHoursList);
  }
  if (returnArrivalHoursList.length > 0) {
    filter.return_arrival_time = generateTimeRanges(returnArrivalHoursList);
  }

  // Duration ranges - Only if data exists (using 6-hour slots)
  if (onwardFlyingMinutesList.length > 0) {
    filter.onward_flying_time = generateHourRanges(
      onwardFlyingMinutesList,
      "onward_flying_time",
    );
    console.log(`[DEBUG] FINAL onward_flying_time:`, filter.onward_flying_time);
  }
  if (returnFlyingMinutesList.length > 0) {
    filter.return_flying_time = generateHourRanges(
      returnFlyingMinutesList,
      "return_flying_time",
    );
    console.log(`[DEBUG] FINAL return_flying_time:`, filter.return_flying_time);
  }
  if (onwardTransitMinutesList.length > 0) {
    filter.onward_transit_hour = generateHourRanges(
      onwardTransitMinutesList,
      "onward_transit_hour",
    );
  }
  if (returnTransitMinutesList.length > 0) {
    filter.return_transit_hour = generateHourRanges(
      returnTransitMinutesList,
      "return_transit_hour",
    );
  }

  // Airport lists - Only if data exists
  if (onwardLayoverAirportsList.length > 0) {
    filter.onward_layover_airport = sortArray(onwardLayoverAirportsList);
  }
  if (returnLayoverAirportsList.length > 0) {
    filter.return_layover_airport = sortArray(returnLayoverAirportsList);
  }
  if (onwardDestinationAirportsList.length > 0) {
    filter.onward_destination_airport = sortArray(
      onwardDestinationAirportsList,
    );
  }
  if (returnDestinationAirportsList.length > 0) {
    filter.return_destination_airport = sortArray(
      returnDestinationAirportsList,
    );
  }

  console.log(
    `[DEBUG] FINAL filter object:`,
    JSON.stringify(
      {
        min_price: filter.min_price,
        max_price: filter.max_price,
        onward_flying_time: filter.onward_flying_time,
        onward_transit_hour: filter.onward_transit_hour,
        onward_flight_stops: filter.onward_flight_stops,
        onward_depart_time: filter.onward_depart_time,
        onward_arrival_time: filter.onward_arrival_time,
        onward_layover_airport: filter.onward_layover_airport,
        onward_destination_airport: filter.onward_destination_airport,
      },
      null,
      2,
    ),
  );

  return filter;
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Parse a duration string like "9h 10m" into total minutes.
 */
function parseDurationToMinutes(durationStr) {
  if (!durationStr) return 0;

  const parts = durationStr.match(/(\d+)h\s*(\d+)m/);
  if (parts) {
    const hours = parseInt(parts[1]) || 0;
    const minutes = parseInt(parts[2]) || 0;
    return hours * 60 + minutes;
  }

  return 0;
}

/**
 * Parse layover time string
 */
function parseLayoverToMinutes(layoverStr) {
  if (!layoverStr) return 0;

  const ms = parseInt(layoverStr);
  if (!isNaN(ms) && ms > 0) {
    return ms / (1000 * 60);
  }

  return parseDurationToMinutes(layoverStr);
}

module.exports = generateFilterObject;
