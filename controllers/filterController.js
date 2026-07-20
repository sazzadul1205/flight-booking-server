// controllers/filterController.js

// Filter flights
const filterFlights = async (req, res, next) => {
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

  // 1. PRICE FILTER - Using NewBaseFare
  if (filter.min_price || filter.max_price) {
    filtered = filtered.filter((flight) => {
      const price = flight.NewBaseFare || flight.TotalPrice || 0;
      if (filter.min_price && price < filter.min_price) return false;
      if (filter.max_price && price > filter.max_price) return false;
      return true;
    });
  }

  // 2. AIRLINE FILTERS
  if (filter.airlines && filter.airlines.length) {
    filtered = filtered.filter((flight) => {
      const name = flight.PlatingCarrierName || flight.CarrierName || "";
      return filter.airlines.some((airline) =>
        name.toLowerCase().includes(airline.toLowerCase()),
      );
    });
  }

  // 2.1. AIRLINE CODE FILTER
  if (filter.airline_code && filter.airline_code.length) {
    filtered = filtered.filter((flight) => {
      const code = flight.PlatingCarrier || flight.Carrier || "";
      return filter.airline_code.some(
        (filterCode) => code.toUpperCase() === filterCode.toUpperCase(),
      );
    });
  }

  // 3. FARE TYPE FILTER
  if (filter.fare_type && filter.fare_type.length) {
    filtered = filtered.filter((flight) => {
      const isRefundable = flight.IsRefundable === true;
      const type = isRefundable ? "Refundable" : "Non-Refundable";
      return filter.fare_type.includes(type);
    });
  }

  // 4. AIRCRAFT & BAGGAGE
  if (filter.aircraft && filter.aircraft.length) {
    filtered = filtered.filter((flight) => {
      const segments = flight.Onwards || [];
      if (!segments.length) return false;
      return segments.some((segment) => {
        const aircraft = segment.Equipment || "";
        return filter.aircraft.some((type) =>
          aircraft.toLowerCase().includes(type.toLowerCase()),
        );
      });
    });
  }

  // 4.1. BAGGAGE
  if (filter.baggage && filter.baggage.length) {
    filtered = filtered.filter((flight) => {
      const segments = flight.Onwards || [];
      if (!segments.length) return false;
      return segments.some((segment) => {
        const baggage = segment.AirBaggageAllowance || "";
        return filter.baggage.some((b) =>
          baggage.toLowerCase().includes(b.toLowerCase()),
        );
      });
    });
  }

  // 5. ONWARD FLIGHT FILTERS
  if (filter.onward_flight_stops && filter.onward_flight_stops.length) {
    filtered = filtered.filter((flight) => {
      const stops = flight.TotalTravelTimes?.[0]?.NoOfStop ?? 0;
      return filter.onward_flight_stops.some(
        (stop) => Number(stop) === Number(stops),
      );
    });
  }

  // 5.1. ONWARD DEPARTURE & ARRIVAL TIME
  if (filter.onward_depart_time && filter.onward_depart_time.length) {
    filtered = filtered.filter((flight) => {
      const depTime = flight.Onwards?.[0]?.DepartureTime;
      if (!depTime) return false;
      const hour = new Date(depTime).getHours();
      return filter.onward_depart_time.some((range) => {
        const rangeStr =
          typeof range === "object" ? range.name || range : range;
        const [start, end] = parseTimeRange(rangeStr);
        return hour >= start && hour <= end;
      });
    });
  }

  // 5.2. ONWARD DEPARTURE & ARRIVAL TIME
  if (filter.onward_arrival_time && filter.onward_arrival_time.length) {
    filtered = filtered.filter((flight) => {
      const segments = flight.Onwards || [];
      if (!segments.length) return false;
      const arrTime = segments[segments.length - 1]?.ArrivalTime;
      if (!arrTime) return false;
      const hour = new Date(arrTime).getHours();
      return filter.onward_arrival_time.some((range) => {
        const rangeStr =
          typeof range === "object" ? range.name || range : range;
        const [start, end] = parseTimeRange(rangeStr);
        return hour >= start && hour <= end;
      });
    });
  }

  // Flying time - Convert minutes to hours for comparison
  if (filter.onward_flying_time && filter.onward_flying_time.length) {
    filtered = filtered.filter((flight) => {
      const durationStr =
        flight.TotalTravelTimes?.[0]?.TotalTravelDuration || "";
      const minutes = parseDurationToMinutes(durationStr);
      const hours = minutes / 60;
      return filter.onward_flying_time.some((range) => {
        const rangeStr =
          typeof range === "object" ? range.name || range : range;
        const [min, max] = parseHourRange(rangeStr);
        return hours >= min && (max === null || hours <= max);
      });
    });
  }

  // Transit time - Convert minutes to hours for comparison
  if (filter.onward_transit_hour && filter.onward_transit_hour.length) {
    filtered = filtered.filter((flight) => {
      const segments = flight.Onwards || [];
      if (segments.length < 2) return false;

      let totalLayoverMs = 0;
      for (let i = 0; i < segments.length - 1; i++) {
        const arrival = new Date(segments[i].ArrivalTime);
        const departure = new Date(segments[i + 1].DepartureTime);
        totalLayoverMs += departure - arrival;
      }
      const totalLayoverHours = totalLayoverMs / (1000 * 60 * 60);

      return filter.onward_transit_hour.some((range) => {
        const rangeStr =
          typeof range === "object" ? range.name || range : range;
        const [min, max] = parseHourRange(rangeStr);
        return (
          totalLayoverHours >= min && (max === null || totalLayoverHours <= max)
        );
      });
    });
  }

  // Layover airports
  if (filter.onward_layover_airport && filter.onward_layover_airport.length) {
    filtered = filtered.filter((flight) => {
      const segments = flight.Onwards || [];
      if (segments.length < 2) return false;
      const layoverAirports = segments
        .slice(0, -1)
        .map((seg) => seg.Destination || "");
      return filter.onward_layover_airport.some((airport) =>
        layoverAirports.some(
          (dest) => dest.toUpperCase() === airport.toUpperCase(),
        ),
      );
    });
  }

  // Destination airport
  if (
    filter.onward_destination_airport &&
    filter.onward_destination_airport.length
  ) {
    filtered = filtered.filter((flight) => {
      const segments = flight.Onwards || [];
      if (!segments.length) return false;
      const lastSegment = segments[segments.length - 1];
      const dest = lastSegment?.Destination || "";
      return filter.onward_destination_airport.some(
        (airport) => dest.toUpperCase() === airport.toUpperCase(),
      );
    });
  }

  // 6. RETURN FLIGHT FILTERS
  const hasReturn = filtered.some((f) => f.Returns && f.Returns.length > 0);

  // 6.1. RETURN DEPARTURE & ARRIVAL TIME
  if (hasReturn) {
    if (filter.return_flight_stops && filter.return_flight_stops.length) {
      filtered = filtered.filter((flight) => {
        const stops = flight.TotalTravelTimes?.[1]?.NoOfStop ?? 0;
        return filter.return_flight_stops.some(
          (stop) => Number(stop) === Number(stops),
        );
      });
    }

    if (filter.return_depart_time && filter.return_depart_time.length) {
      filtered = filtered.filter((flight) => {
        const depTime = flight.Returns?.[0]?.DepartureTime;
        if (!depTime) return false;
        const hour = new Date(depTime).getHours();
        return filter.return_depart_time.some((range) => {
          const rangeStr =
            typeof range === "object" ? range.name || range : range;
          const [start, end] = parseTimeRange(rangeStr);
          return hour >= start && hour <= end;
        });
      });
    }

    if (filter.return_arrival_time && filter.return_arrival_time.length) {
      filtered = filtered.filter((flight) => {
        const segments = flight.Returns || [];
        if (!segments.length) return false;
        const arrTime = segments[segments.length - 1]?.ArrivalTime;
        if (!arrTime) return false;
        const hour = new Date(arrTime).getHours();
        return filter.return_arrival_time.some((range) => {
          const rangeStr =
            typeof range === "object" ? range.name || range : range;
          const [start, end] = parseTimeRange(rangeStr);
          return hour >= start && hour <= end;
        });
      });
    }

    // Return flying time - Convert minutes to hours
    if (filter.return_flying_time && filter.return_flying_time.length) {
      filtered = filtered.filter((flight) => {
        const durationStr =
          flight.TotalTravelTimes?.[1]?.TotalTravelDuration || "";
        const minutes = parseDurationToMinutes(durationStr);
        const hours = minutes / 60;
        return filter.return_flying_time.some((range) => {
          const rangeStr =
            typeof range === "object" ? range.name || range : range;
          const [min, max] = parseHourRange(rangeStr);
          return hours >= min && (max === null || hours <= max);
        });
      });
    }

    // Return transit time - Convert to hours
    if (filter.return_transit_hour && filter.return_transit_hour.length) {
      filtered = filtered.filter((flight) => {
        const segments = flight.Returns || [];
        if (segments.length < 2) return false;

        let totalLayoverMs = 0;
        for (let i = 0; i < segments.length - 1; i++) {
          const arrival = new Date(segments[i].ArrivalTime);
          const departure = new Date(segments[i + 1].DepartureTime);
          totalLayoverMs += departure - arrival;
        }
        const totalLayoverHours = totalLayoverMs / (1000 * 60 * 60);

        return filter.return_transit_hour.some((range) => {
          const rangeStr =
            typeof range === "object" ? range.name || range : range;
          const [min, max] = parseHourRange(rangeStr);
          return (
            totalLayoverHours >= min &&
            (max === null || totalLayoverHours <= max)
          );
        });
      });
    }

    if (filter.return_layover_airport && filter.return_layover_airport.length) {
      filtered = filtered.filter((flight) => {
        const segments = flight.Returns || [];
        if (segments.length < 2) return false;
        const layoverAirports = segments
          .slice(0, -1)
          .map((seg) => seg.Destination || "");
        return filter.return_layover_airport.some((airport) =>
          layoverAirports.some(
            (dest) => dest.toUpperCase() === airport.toUpperCase(),
          ),
        );
      });
    }

    if (
      filter.return_destination_airport &&
      filter.return_destination_airport.length
    ) {
      filtered = filtered.filter((flight) => {
        const segments = flight.Returns || [];
        if (!segments.length) return false;
        const lastSegment = segments[segments.length - 1];
        const dest = lastSegment?.Destination || "";
        return filter.return_destination_airport.some(
          (airport) => dest.toUpperCase() === airport.toUpperCase(),
        );
      });
    }
  }

  // Return results
  res.json({
    success: true,
    data: filtered,
    original_count: flights.length,
    filtered_count: filtered.length,
    applied_filters: Object.keys(filter).filter((key) => {
      const val = filter[key];
      return val && (Array.isArray(val) ? val.length > 0 : true);
    }),
    message:
      filtered.length > 0
        ? `${filtered.length} flights found matching your criteria`
        : "No flights match your filter criteria",
  });
};

// HELPER FUNCTIONS

// Parse duration
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

// Parse hour range
function parseHourRange(rangeStr) {
  if (!rangeStr) return [0, null];

  if (!isNaN(rangeStr) && typeof rangeStr === "number") {
    return [rangeStr, null];
  }

  const str = String(rangeStr);

  if (str.includes("+")) {
    const min = parseInt(str.replace(" Hour +", "").trim());
    return [min || 0, null];
  }

  const parts = str
    .replace(/Hour|Hours/g, "")
    .trim()
    .split(" To ");
  if (parts.length === 2) {
    const min = parseInt(parts[0].trim());
    const max = parseInt(parts[1].trim());
    if (!isNaN(min) && !isNaN(max)) {
      return [min, max];
    }
  }

  return [0, null];
}

// Parse time range
function parseTimeRange(rangeStr) {
  if (!rangeStr) return [0, 23];

  const str =
    typeof rangeStr === "object" ? rangeStr.name || "" : String(rangeStr);

  const parts = str.split(" To ");
  if (parts.length === 2) {
    const start = parseInt(parts[0].split(":")[0]);
    const end = parseInt(parts[1].split(":")[0]);
    if (!isNaN(start) && !isNaN(end)) {
      return [start, end];
    }
  }

  const parts2 = str.split(" - ");
  if (parts2.length === 2) {
    const start = parseInt(parts2[0].split(":")[0]);
    const end = parseInt(parts2[1].split(":")[0]);
    if (!isNaN(start) && !isNaN(end)) {
      return [start, end];
    }
  }

  return [0, 23];
}

module.exports = { filterFlights };
