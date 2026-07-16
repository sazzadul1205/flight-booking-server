const jwt = require("jsonwebtoken");

// Middleware to authenticate requests
const authenticate = (req, res, next) => {
  try {
    // Extract token from header
    const token = req.headers.authorization?.split(" ")[1];

    // Check if token exists
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user object to request
    req.user = decoded;

    // Pass control to next PART
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authenticate;
