// routes/flightRoutes.js
const express = require("express");
const { searchFlights } = require("../controllers/flightController");
const { getCities } = require("../controllers/cityController");
const { getAirlines } = require("../controllers/airlineController");
const { filterFlights } = require("../controllers/filterController");
const authenticate = require("../middleware/auth");
const catchAsync = require("../utils/catchAsync");

const router = express.Router();

// ROUTES (All require authentication)
// router.use(authenticate);

// Flight search
router.post("/flights/search", catchAsync(searchFlights));

// City search
router.get("/cities", catchAsync(getCities));

// Airlines list
router.get("/airlines", catchAsync(getAirlines));

// Filter flights
router.post("/filter", catchAsync(filterFlights));

module.exports = router;
