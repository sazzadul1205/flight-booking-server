// controllers/filterController.js

/**
 * Filter flights based on user criteria
 * Complete implementation matching PDF requirements
 */
const filterFlights = async (req, res) => {
  try {
    const flights = req.body.flights || [];
    const filter = req.body.filter || {};

    // If no flights or filter, return empty
    if (!flights.length) {
      return res.json({
        success: true,
        data: [],
        original_count: 0,
        filtered_count: 0,
        message: "No flights to filter",
      });
    }

    // If no filter criteria, return all flights
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
    // 1. PRICE FILTERS
    // ============================================================

    // Filter by price range (using NewTotalFare after markup/commission)
    if (filter.min_price || filter.max_price) {
      filtered = filtered.filter((flight) => {
        const price = flight.NewTotalFare || flight.TotalPrice || 0;
        if (filter.min_price && price < filter.min_price) return false;
        if (filter.max_price && price > filter.max_price) return false;
        return true;
      });
    }

    // ============================================================
    // 2. AIRLINE FILTERS
    // ============================================================

    // Filter by airlines (by name)
    if (filter.airlines && filter.airlines.length) {
      filtered = filtered.filter((flight) => {
        const airlineName = flight.AirlineName || flight.CarrierName || "";
        return filter.airlines.some((name) =>
          airlineName.toLowerCase().includes(name.toLowerCase()),
        );
      });
    }

    // Filter by airline code (IATA code)
    if (filter.airline_code && filter.airline_code.length) {
      filtered = filtered.filter((flight) => {
        const airlineCode = flight.PlatingCarrier || flight.Carrier || "";
        return filter.airline_code.includes(airlineCode);
      });
    }

    // ============================================================
    // 3. FARE TYPE FILTERS
    // ============================================================

    // Filter by fare type (Refundable/Non-Refundable)
    if (filter.fare_type && filter.fare_type.length) {
      filtered = filtered.filter((flight) => {
        const isRefundable = flight.IsRefundable || flight.Refundable || false;
        const type = isRefundable ? "Refundable" : "Non-Refundable";
        return filter.fare_type.includes(type);
      });
    }

    // ============================================================
    // 4. AIRCRAFT & BAGGAGE FILTERS
    // ============================================================

    // Filter by aircraft type
    if (filter.aircraft && filter.aircraft.length) {
      filtered = filtered.filter((flight) => {
        const aircraft = flight.Aircraft || flight.Equipment || "";
        return filter.aircraft.some((type) =>
          aircraft.toLowerCase().includes(type.toLowerCase()),
        );
      });
    }

    // Filter by baggage allowance
    if (filter.baggage && filter.baggage.length) {
      filtered = filtered.filter((flight) => {
        const baggage = flight.Baggage || flight.Allowance || "";
        return filter.baggage.some((b) =>
          baggage.toLowerCase().includes(b.toLowerCase()),
        );
      });
    }

    // ============================================================
    // 5. ONWARD FLIGHT FILTERS (Departure)
    // ============================================================

    // Filter by onward flight stops
    if (filter.onward_flight_stops && filter.onward_flight_stops.length) {
      filtered = filtered.filter((flight) => {
        const stops =
          flight.Onwards?.[0]?.NoOfStop ||
          flight.TotalTravelTimes?.[0]?.NoOfStop ||
          0;
        return filter.onward_flight_stops.includes(stops);
      });
    }

    // Filter by onward departure time
    if (filter.onward_depart_time && filter.onward_depart_time.length) {
      filtered = filtered.filter((flight) => {
        const depTime = flight.Onwards?.[0]?.DepartureTime;
        if (!depTime) return true;
        const hour = new Date(depTime).getHours();
        return filter.onward_depart_time.some((timeRange) => {
          const [start, end] = timeRange.name
            .split(" To ")
            .map((t) => parseInt(t.split(":")[0]));
          return hour >= start && hour <= end;
        });
      });
    }

    // Filter by onward arrival time
    if (filter.onward_arrival_time && filter.onward_arrival_time.length) {
      filtered = filtered.filter((flight) => {
        const arrTime = flight.Onwards?.[0]?.ArrivalTime;
        if (!arrTime) return true;
        const hour = new Date(arrTime).getHours();
        return filter.onward_arrival_time.some((timeRange) => {
          const [start, end] = timeRange.name
            .split(" To ")
            .map((t) => parseInt(t.split(":")[0]));
          return hour >= start && hour <= end;
        });
      });
    }

    // Filter by onward flying time (duration)
    if (filter.onward_flying_time && filter.onward_flying_time.length) {
      filtered = filtered.filter((flight) => {
        const travelTime =
          flight.Onwards?.[0]?.TravelTime ||
          flight.TotalTravelTimes?.[0]?.TravelTime ||
          0;
        const hours = travelTime / 60; // Convert minutes to hours

        return filter.onward_flying_time.some((timeRange) => {
          const [min, max] = parseTimeRange(timeRange.name);
          return hours >= min && (max === null || hours <= max);
        });
      });
    }

    // Filter by onward transit hour (layover duration)
    if (filter.onward_transit_hour && filter.onward_transit_hour.length) {
      filtered = filtered.filter((flight) => {
        const segments = flight.Onwards || [];
        if (segments.length < 2) return true; // No layover

        // Calculate total layover time
        let totalLayover = 0;
        for (let i = 0; i < segments.length - 1; i++) {
          const arrival = new Date(segments[i].ArrivalTime);
          const departure = new Date(segments[i + 1].DepartureTime);
          const layover = (departure - arrival) / (1000 * 60 * 60); // Hours
          totalLayover += layover;
        }

        return filter.onward_transit_hour.some((timeRange) => {
          const [min, max] = parseTimeRange(timeRange.name);
          return totalLayover >= min && (max === null || totalLayover <= max);
        });
      });
    }

    // Filter by onward layover airport
    if (filter.onward_layover_airport && filter.onward_layover_airport.length) {
      filtered = filtered.filter((flight) => {
        const segments = flight.Onwards || [];
        if (segments.length < 2) return true;

        // Get layover airports (all intermediate airports)
        const layoverAirports = segments
          .slice(1, -1)
          .map((seg) => seg.Destination || seg.ArrivalAirport || "");

        return filter.onward_layover_airport.some((airport) =>
          layoverAirports.some((a) =>
            a.toLowerCase().includes(airport.toLowerCase()),
          ),
        );
      });
    }

    // Filter by onward destination airport
    if (
      filter.onward_destination_airport &&
      filter.onward_destination_airport.length
    ) {
      filtered = filtered.filter((flight) => {
        const lastSegment = flight.Onwards?.[flight.Onwards.length - 1];
        const destination =
          lastSegment?.Destination || lastSegment?.ArrivalAirport || "";
        return filter.onward_destination_airport.some((airport) =>
          destination.toLowerCase().includes(airport.toLowerCase()),
        );
      });
    }

    // ============================================================
    // 6. RETURN FLIGHT FILTERS (Return)
    // ============================================================

    // Only apply return filters if return flights exist
    const hasReturnFlights = filtered.some(
      (f) => f.Returns && f.Returns.length > 0,
    );

    if (hasReturnFlights) {
      // Filter by return flight stops
      if (filter.return_flight_stops && filter.return_flight_stops.length) {
        filtered = filtered.filter((flight) => {
          const stops = flight.Returns?.[0]?.NoOfStop || 0;
          return filter.return_flight_stops.includes(stops);
        });
      }

      // Filter by return departure time
      if (filter.return_depart_time && filter.return_depart_time.length) {
        filtered = filtered.filter((flight) => {
          const depTime = flight.Returns?.[0]?.DepartureTime;
          if (!depTime) return true;
          const hour = new Date(depTime).getHours();
          return filter.return_depart_time.some((timeRange) => {
            const [start, end] = timeRange.name
              .split(" To ")
              .map((t) => parseInt(t.split(":")[0]));
            return hour >= start && hour <= end;
          });
        });
      }

      // Filter by return arrival time
      if (filter.return_arrival_time && filter.return_arrival_time.length) {
        filtered = filtered.filter((flight) => {
          const arrTime = flight.Returns?.[0]?.ArrivalTime;
          if (!arrTime) return true;
          const hour = new Date(arrTime).getHours();
          return filter.return_arrival_time.some((timeRange) => {
            const [start, end] = timeRange.name
              .split(" To ")
              .map((t) => parseInt(t.split(":")[0]));
            return hour >= start && hour <= end;
          });
        });
      }

      // Filter by return flying time
      if (filter.return_flying_time && filter.return_flying_time.length) {
        filtered = filtered.filter((flight) => {
          const travelTime = flight.Returns?.[0]?.TravelTime || 0;
          const hours = travelTime / 60;
          return filter.return_flying_time.some((timeRange) => {
            const [min, max] = parseTimeRange(timeRange.name);
            return hours >= min && (max === null || hours <= max);
          });
        });
      }

      // Filter by return transit hour
      if (filter.return_transit_hour && filter.return_transit_hour.length) {
        filtered = filtered.filter((flight) => {
          const segments = flight.Returns || [];
          if (segments.length < 2) return true;

          let totalLayover = 0;
          for (let i = 0; i < segments.length - 1; i++) {
            const arrival = new Date(segments[i].ArrivalTime);
            const departure = new Date(segments[i + 1].DepartureTime);
            const layover = (departure - arrival) / (1000 * 60 * 60);
            totalLayover += layover;
          }

          return filter.return_transit_hour.some((timeRange) => {
            const [min, max] = parseTimeRange(timeRange.name);
            return totalLayover >= min && (max === null || totalLayover <= max);
          });
        });
      }

      // Filter by return layover airport
      if (
        filter.return_layover_airport &&
        filter.return_layover_airport.length
      ) {
        filtered = filtered.filter((flight) => {
          const segments = flight.Returns || [];
          if (segments.length < 2) return true;

          const layoverAirports = segments
            .slice(1, -1)
            .map((seg) => seg.Destination || seg.ArrivalAirport || "");

          return filter.return_layover_airport.some((airport) =>
            layoverAirports.some((a) =>
              a.toLowerCase().includes(airport.toLowerCase()),
            ),
          );
        });
      }

      // Filter by return destination airport
      if (
        filter.return_destination_airport &&
        filter.return_destination_airport.length
      ) {
        filtered = filtered.filter((flight) => {
          const lastSegment = flight.Returns?.[flight.Returns.length - 1];
          const destination =
            lastSegment?.Destination || lastSegment?.ArrivalAirport || "";
          return filter.return_destination_airport.some((airport) =>
            destination.toLowerCase().includes(airport.toLowerCase()),
          );
        });
      }
    }

    // ============================================================
    // Return filtered results
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
 * Parse time range string like "0 To 6 Hour" or "18 Hour +"
 * Returns [min, max] where max is null for "X Hour +"
 */
const parseTimeRange = (timeStr) => {
  // Handle "X Hour +" format
  if (timeStr.includes("+")) {
    const min = parseInt(timeStr.replace(" Hour +", "").trim());
    return [min, null];
  }

  // Handle "X To Y Hour" format
  const parts = timeStr.replace(" Hour", "").split(" To ");
  if (parts.length === 2) {
    return [parseInt(parts[0]), parseInt(parts[1])];
  }

  // Default fallback
  return [0, null];
};

module.exports = { filterFlights };
