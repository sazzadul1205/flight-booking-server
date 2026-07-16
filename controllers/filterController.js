// Filter flights based on user criteria
const filterFlights = async (req, res) => {
  try {
    const flights = req.body.flights || [];
    const filter = req.body.filter || {};

    // If no flights or filter, return empty
    if (!flights.length || !Object.keys(filter).length) {
      return res.json({
        success: true,
        data: flights,
      });
    }

    let filtered = flights;

    // Filter by price range
    if (filter.min_price || filter.max_price) {
      filtered = filtered.filter((flight) => {
        const price = flight.NewTotalFare || flight.TotalPrice || 0;
        if (filter.min_price && price < filter.min_price) return false;
        if (filter.max_price && price > filter.max_price) return false;
        return true;
      });
    }

    // Filter by airlines
    if (filter.airlines && filter.airlines.length) {
      filtered = filtered.filter((flight) =>
        filter.airlines.includes(flight.PlatingCarrier),
      );
    }

    // Filter by fare type (Refundable/Non-Refundable)
    if (filter.fare_type && filter.fare_type.length) {
      filtered = filtered.filter((flight) => {
        const isRefundable = flight.IsRefundable || false;
        const type = isRefundable ? "Refundable" : "Non-Refundable";
        return filter.fare_type.includes(type);
      });
    }

    // Filter by stops
    if (filter.onward_flight_stops && filter.onward_flight_stops.length) {
      filtered = filtered.filter((flight) => {
        const stops = flight.TotalTravelTimes?.[0]?.NoOfStop || 0;
        return filter.onward_flight_stops.includes(stops);
      });
    }

    // Filter by departure time
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

    res.json({
      success: true,
      data: filtered,
      original_count: flights.length,
      filtered_count: filtered.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = { filterFlights };
