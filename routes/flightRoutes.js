const express = require("express");
const { searchFlights } = require("../controllers/flightController");
const { getCities } = require("../controllers/cityController");
const { getAirlines } = require("../controllers/airlineController");
const { filterFlights } = require("../controllers/filterController");
const authenticate = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Flight search
router.post("/flights/search", searchFlights);

// City search
router.get("/cities", getCities);

// Airlines list
router.get("/airlines", getAirlines);

// Filter flights
router.post("/filter", filterFlights);

module.exports = router;
