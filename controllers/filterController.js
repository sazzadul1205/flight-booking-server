// controllers/filterController.js

/**
 * Filter flights based on user criteria
 * Fully fixed to match the actual flight data structure
 */

const filterFlights = async (req, res) => {
  try {
    const flights = req.body.flights || [];
    const filter = req.body.filter || {};

    if (!flights.length) {
      return res.json({
        success: true,
        data: [],
        original_count: 0,
        filtered_count: 0,
        message: "No flights to filter",
      });
    }

    if (!Object.keys(filter).length) {
      return res.json({
        success: true,
        data: flights,
        original_count: flights.length,
        filtered_count: flights.length,
        message: "No filter applied",
      });
    }

    let filtered = [...flights];

    // ============================================================
    // 1. PRICE FILTER
    // ============================================================
    if (filter.min_price || filter.max_price) {
      filtered = filtered.filter((flight) => {
        const price =
          flight.NewTotalFare || flight.TotalPrice || flight.TotalFare || 0;
        if (filter.min_price && price < filter.min_price) return false;
        if (filter.max_price && price > filter.max_price) return false;
        return true;
      });
    }

    // ============================================================
    // 2. AIRLINE FILTERS – FIXED FIELD NAMES
    // ============================================================

    // Filter by airline name
    if (filter.airlines && filter.airlines.length) {
      filtered = filtered.filter((flight) => {
        // Try root-level names, then first onward segment
        const name =
          flight.PlatingCarrierName ||
          flight.CarrierName ||
          flight.Onwards?.[0]?.CarrierName ||
          flight.Onwards?.[0]?.OperatingCarrierName ||
          "";
        return filter.airlines.some((airline) =>
          name.toLowerCase().includes(airline.toLowerCase()),
        );
      });
    }

    // Filter by airline code (IATA)
    if (filter.airline_code && filter.airline_code.length) {
      filtered = filtered.filter((flight) => {
        const code =
          flight.PlatingCarrier ||
          flight.Carrier ||
          flight.Onwards?.[0]?.Carrier ||
          flight.Onwards?.[0]?.OperatingCarrier ||
          "";
        return filter.airline_code.some(
          (filterCode) => code.toUpperCase() === filterCode.toUpperCase(),
        );
      });
    }

    // ============================================================
    // 3. FARE TYPE FILTER
    // ============================================================
    if (filter.fare_type && filter.fare_type.length) {
      filtered = filtered.filter((flight) => {
        const isRefundable = flight.IsRefundable === true;
        const type = isRefundable ? "Refundable" : "Non-Refundable";
        return filter.fare_type.includes(type);
      });
    }

    // ============================================================
    // 4. AIRCRAFT & BAGGAGE – FIXED FIELD NAMES
    // ============================================================
    if (filter.aircraft && filter.aircraft.length) {
      filtered = filtered.filter((flight) => {
        const aircraft =
          flight.Onwards?.[0]?.Equipment || flight.Equipment || "";
        return filter.aircraft.some((type) =>
          aircraft.toLowerCase().includes(type.toLowerCase()),
        );
      });
    }

    if (filter.baggage && filter.baggage.length) {
      filtered = filtered.filter((flight) => {
        const baggage =
          flight.Onwards?.[0]?.AirBaggageAllowance || flight.Baggage || "";
        return filter.baggage.some((b) =>
          baggage.toLowerCase().includes(b.toLowerCase()),
        );
      });
    }

    // ============================================================
    // 5. ONWARD FLIGHT FILTERS (Departure)
    // ============================================================

    // Stops
    if (filter.onward_flight_stops && filter.onward_flight_stops.length) {
      filtered = filtered.filter((flight) => {
        const stops = flight.TotalTravelTimes?.[0]?.NoOfStop ?? 0;
        return filter.onward_flight_stops.includes(stops);
      });
    }

    // Departure time
    if (filter.onward_depart_time && filter.onward_depart_time.length) {
      filtered = filtered.filter((flight) => {
        const depTime = flight.Onwards?.[0]?.DepartureTime;
        if (!depTime) return true;
        const hour = new Date(depTime).getHours();
        return filter.onward_depart_time.some((range) => {
          const [start, end] = range.name
            .split(" To ")
            .map((t) => parseInt(t.split(":")[0]));
          return hour >= start && hour <= end;
        });
      });
    }

    // Arrival time
    if (filter.onward_arrival_time && filter.onward_arrival_time.length) {
      filtered = filtered.filter((flight) => {
        const arrTime = flight.Onwards?.[0]?.ArrivalTime;
        if (!arrTime) return true;
        const hour = new Date(arrTime).getHours();
        return filter.onward_arrival_time.some((range) => {
          const [start, end] = range.name
            .split(" To ")
            .map((t) => parseInt(t.split(":")[0]));
          return hour >= start && hour <= end;
        });
      });
    }

    // Flying time (duration in minutes)
    if (filter.onward_flying_time && filter.onward_flying_time.length) {
      filtered = filtered.filter((flight) => {
        const durationStr = flight.Onwards?.[0]?.TravelDuration || "";
        const minutes = parseDurationToMinutes(durationStr);
        return filter.onward_flying_time.some((range) => {
          const [min, max] = parseHourRange(range.name);
          return minutes >= min && (max === null || minutes <= max);
        });
      });
    }

    // Transit (layover) time in minutes
    if (filter.onward_transit_hour && filter.onward_transit_hour.length) {
      filtered = filtered.filter((flight) => {
        const segments = flight.Onwards || [];
        if (segments.length < 2) return true; // no layover

        let totalLayoverMs = 0;
        for (let i = 0; i < segments.length - 1; i++) {
          const arrival = new Date(segments[i].ArrivalTime);
          const departure = new Date(segments[i + 1].DepartureTime);
          totalLayoverMs += departure - arrival;
        }
        const totalLayoverMinutes = totalLayoverMs / (1000 * 60);

        return filter.onward_transit_hour.some((range) => {
          const [min, max] = parseHourRange(range.name);
          return (
            totalLayoverMinutes >= min &&
            (max === null || totalLayoverMinutes <= max)
          );
        });
      });
    }

    // Layover airports
    if (filter.onward_layover_airport && filter.onward_layover_airport.length) {
      filtered = filtered.filter((flight) => {
        const segments = flight.Onwards || [];
        if (segments.length < 2) return true;

        // Get all intermediate airports (Destinations of all but last)
        const layoverAirports = segments
          .slice(0, -1)
          .map((seg) => seg.Destination || "");
        return filter.onward_layover_airport.some((airport) =>
          layoverAirports.some((dest) =>
            dest.toUpperCase().includes(airport.toUpperCase()),
          ),
        );
      });
    }

    // Destination airport (final)
    if (
      filter.onward_destination_airport &&
      filter.onward_destination_airport.length
    ) {
      filtered = filtered.filter((flight) => {
        const lastSegment = flight.Onwards?.[flight.Onwards.length - 1];
        const dest = lastSegment?.Destination || flight.Destination || "";
        return filter.onward_destination_airport.some((airport) =>
          dest.toUpperCase().includes(airport.toUpperCase()),
        );
      });
    }

    // ============================================================
    // 6. RETURN FLIGHT FILTERS (if applicable)
    // ============================================================
    const hasReturn = filtered.some((f) => f.Returns && f.Returns.length > 0);

    if (hasReturn) {
      // Return stops
      if (filter.return_flight_stops && filter.return_flight_stops.length) {
        filtered = filtered.filter((flight) => {
          const stops = flight.TotalTravelTimes?.[1]?.NoOfStop ?? 0;
          return filter.return_flight_stops.includes(stops);
        });
      }

      // Return departure time
      if (filter.return_depart_time && filter.return_depart_time.length) {
        filtered = filtered.filter((flight) => {
          const depTime = flight.Returns?.[0]?.DepartureTime;
          if (!depTime) return true;
          const hour = new Date(depTime).getHours();
          return filter.return_depart_time.some((range) => {
            const [start, end] = range.name
              .split(" To ")
              .map((t) => parseInt(t.split(":")[0]));
            return hour >= start && hour <= end;
          });
        });
      }

      // Return arrival time
      if (filter.return_arrival_time && filter.return_arrival_time.length) {
        filtered = filtered.filter((flight) => {
          const arrTime = flight.Returns?.[0]?.ArrivalTime;
          if (!arrTime) return true;
          const hour = new Date(arrTime).getHours();
          return filter.return_arrival_time.some((range) => {
            const [start, end] = range.name
              .split(" To ")
              .map((t) => parseInt(t.split(":")[0]));
            return hour >= start && hour <= end;
          });
        });
      }

      // Return flying time
      if (filter.return_flying_time && filter.return_flying_time.length) {
        filtered = filtered.filter((flight) => {
          const durationStr = flight.Returns?.[0]?.TravelDuration || "";
          const minutes = parseDurationToMinutes(durationStr);
          return filter.return_flying_time.some((range) => {
            const [min, max] = parseHourRange(range.name);
            return minutes >= min && (max === null || minutes <= max);
          });
        });
      }

      // Return transit (layover)
      if (filter.return_transit_hour && filter.return_transit_hour.length) {
        filtered = filtered.filter((flight) => {
          const segments = flight.Returns || [];
          if (segments.length < 2) return true;

          let totalLayoverMs = 0;
          for (let i = 0; i < segments.length - 1; i++) {
            const arrival = new Date(segments[i].ArrivalTime);
            const departure = new Date(segments[i + 1].DepartureTime);
            totalLayoverMs += departure - arrival;
          }
          const totalLayoverMinutes = totalLayoverMs / (1000 * 60);

          return filter.return_transit_hour.some((range) => {
            const [min, max] = parseHourRange(range.name);
            return (
              totalLayoverMinutes >= min &&
              (max === null || totalLayoverMinutes <= max)
            );
          });
        });
      }

      // Return layover airports
      if (
        filter.return_layover_airport &&
        filter.return_layover_airport.length
      ) {
        filtered = filtered.filter((flight) => {
          const segments = flight.Returns || [];
          if (segments.length < 2) return true;
          const layoverAirports = segments
            .slice(0, -1)
            .map((seg) => seg.Destination || "");
          return filter.return_layover_airport.some((airport) =>
            layoverAirports.some((dest) =>
              dest.toUpperCase().includes(airport.toUpperCase()),
            ),
          );
        });
      }

      // Return destination airport
      if (
        filter.return_destination_airport &&
        filter.return_destination_airport.length
      ) {
        filtered = filtered.filter((flight) => {
          const lastSegment = flight.Returns?.[flight.Returns.length - 1];
          const dest = lastSegment?.Destination || "";
          return filter.return_destination_airport.some((airport) =>
            dest.toUpperCase().includes(airport.toUpperCase()),
          );
        });
      }
    }

    // ============================================================
    // Return results
    // ============================================================
    res.json({
      success: true,
      data: filtered,
      original_count: flights.length,
      filtered_count: filtered.length,
      applied_filters: Object.keys(filter),
      message:
        filtered.length > 0
          ? `${filtered.length} flights found matching your criteria`
          : "No flights match your filter criteria",
    });
  } catch (error) {
    console.error("Filter error:", error);
    res.status(500).json({
      success: false,
      message: "Server error occurred during filtering",
      error: error.message,
    });
  }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Parse a duration string like "4h 45m" into total minutes.
 */
function parseDurationToMinutes(durationStr) {
  if (!durationStr) return 0;
  const parts = durationStr.match(/(\d+)h\s*(\d+)m/);
  if (parts) {
    const hours = parseInt(parts[1]) || 0;
    const minutes = parseInt(parts[2]) || 0;
    return hours * 60 + minutes;
  }
  // Try "Xh Ym" format
  const alt = durationStr.match(/(\d+)h\s*(\d+)?/);
  if (alt) {
    const hours = parseInt(alt[1]) || 0;
    const minutes = parseInt(alt[2]) || 0;
    return hours * 60 + minutes;
  }
  return 0;
}

/**
 * Parse hour range string like "0 To 6 Hour" or "18 Hour +"
 * Returns [min, max] where max is null for "X Hour +".
 */
function parseHourRange(rangeStr) {
  if (rangeStr.includes("+")) {
    const min = parseInt(rangeStr.replace(" Hour +", "").trim());
    return [min, null];
  }
  const parts = rangeStr.replace(" Hour", "").split(" To ");
  if (parts.length === 2) {
    return [parseInt(parts[0]), parseInt(parts[1])];
  }
  return [0, null];
}

module.exports = { filterFlights };
